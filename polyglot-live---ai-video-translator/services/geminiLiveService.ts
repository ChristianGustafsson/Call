import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { base64ToBytes, createPcmBlob, decodeAudioData } from './audioUtils';
import { ConnectionState, TranscriptionMessage } from '../types';

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  
  // Callbacks
  public onConnectionChange: (state: ConnectionState) => void = () => {};
  public onTranscription: (msg: TranscriptionMessage) => void = () => {};
  public onVolumeLevel: (level: number, source: 'user' | 'ai') => void = () => {};

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(systemInstruction: string) {
    this.onConnectionChange(ConnectionState.CONNECTING);

    try {
      // Input context (Microphone)
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Output context (Speaker)
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // Request stream with "Golden Stack" quality settings (Echo Cancellation is critical)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: this.handleOpen.bind(this, stream),
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: this.handleError.bind(this),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: { model: "gemini-2.5-flash" },
          outputAudioTranscription: { model: "gemini-2.5-flash" },
        },
      });
      
    } catch (error) {
      console.error("Connection failed", error);
      this.onConnectionChange(ConnectionState.ERROR);
    }
  }

  private handleOpen(stream: MediaStream) {
    this.onConnectionChange(ConnectionState.CONNECTED);
    
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    // Buffer size 4096 gives good balance between latency and performance
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeLevel(rms, 'user');

      // Send to Gemini
      const pcmBlob = createPcmBlob(inputData);
      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
           session.sendRealtimeInput({ media: pcmBlob });
        });
      }
    };

    this.inputSource.connect(this.scriptProcessor);
    
    // IMPORTANT: Connect to a muted gain node instead of destination directly
    // to keep the processor alive WITHOUT causing local audio feedback (echo)
    const silence = this.inputAudioContext.createGain();
    silence.gain.value = 0;
    this.scriptProcessor.connect(silence);
    silence.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Audio Output (The "Voice" of the Agent)
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      try {
        const audioBuffer = await decodeAudioData(
            base64ToBytes(base64Audio), 
            this.outputAudioContext
        );
        
        // Volume visualization for AI
        const rawData = audioBuffer.getChannelData(0);
        let sum = 0;
        // Sample a portion for volume to save CPU
        for(let i=0; i<rawData.length; i+=10) {
            sum += rawData[i] * rawData[i];
        }
        const rms = Math.sqrt(sum / (rawData.length / 10));
        this.onVolumeLevel(rms, 'ai');

        // Play audio (Gapless playback logic)
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);

      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // 2. Handle Transcription (Simulating the "Data Packet" for subtitles)
    const turnComplete = message.serverContent?.turnComplete;
    
    // Check input transcription (User)
    const inputTranscript = message.serverContent?.inputTranscription?.text;
    if (inputTranscript) {
       this.onTranscription({
           id: Date.now().toString() + '-user',
           sender: 'user',
           text: inputTranscript,
           timestamp: Date.now(),
           isFinal: !!turnComplete
       });
    }

    // Check output transcription (AI)
    const outputTranscript = message.serverContent?.outputTranscription?.text;
    if (outputTranscript) {
        this.onTranscription({
            id: Date.now().toString() + '-ai',
            sender: 'ai',
            text: outputTranscript,
            timestamp: Date.now(),
            isFinal: !!turnComplete
        });
    }

    // 3. Handle Interruptions
    if (message.serverContent?.interrupted) {
      this.stopAllAudio();
      this.nextStartTime = 0;
    }
  }

  private stopAllAudio() {
    this.sources.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
  }

  private handleClose(e: CloseEvent) {
    console.log("Session closed", e);
    this.onConnectionChange(ConnectionState.DISCONNECTED);
  }

  private handleError(e: ErrorEvent) {
    console.error("Session error", e);
    this.onConnectionChange(ConnectionState.ERROR);
  }

  public async disconnect() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        await this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    this.stopAllAudio();
    this.onConnectionChange(ConnectionState.DISCONNECTED);
  }
}