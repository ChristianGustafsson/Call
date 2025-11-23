import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VideoStage } from './components/VideoStage';
import { Controls } from './components/Controls';
import { TranscriptLog } from './components/TranscriptLog';
import { GeminiLiveService } from './services/geminiLiveService';
import { ConnectionState, TranscriptionMessage, VideoState } from './types';
import { AlertCircle, Globe2, ArrowRightLeft, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  'Polish', 'Swedish', 'English', 'Spanish', 'French', 
  'German', 'Japanese', 'Mandarin', 'Hindi', 
  'Portuguese', 'Russian', 'Italian', 'Arabic', 'Turkish'
];

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({ isCameraOn: true, isMicOn: true });
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Language State - Set defaults to Polish <-> Swedish
  const [languageA, setLanguageA] = useState('Polish');
  const [languageB, setLanguageB] = useState('Swedish');

  const geminiService = useRef<GeminiLiveService | null>(null);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("Missing API Key. Please providing a valid Google GenAI API Key in process.env.API_KEY");
    }
  }, []);

  const getSystemInstruction = (langA: string, langB: string) => `
You are a professional simultaneous interpreter for a high-stakes video call. 
Your sole task is to translate spoken language in real-time.

Rules:
1. If you hear ${langA}, translate it immediately to ${langB}.
2. If you hear ${langB}, translate it immediately to ${langA}.
3. BE CONCISE. Do not explain anything. Just speak the translation.
4. Maintain the tone and emotion of the speaker.
5. Do not answer questions addressed to you. Only translate them.
`;

  const handleConnect = useCallback(async () => {
    if (!process.env.API_KEY) return;
    
    // Initialize service if not exists
    if (!geminiService.current) {
        geminiService.current = new GeminiLiveService(process.env.API_KEY);
        
        // Setup listeners
        geminiService.current.onConnectionChange = (state) => setConnectionState(state);
        
        geminiService.current.onTranscription = (msg) => {
            setMessages(prev => {
                // If the last message was from the same sender and was partial, replace it to avoid log spam
                // and create a smooth "streaming subtitle" effect
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.sender === msg.sender && !lastMsg.isFinal) {
                    const newArr = [...prev];
                    newArr[newArr.length - 1] = msg;
                    return newArr;
                }
                return [...prev, msg]; 
            });
        };

        geminiService.current.onVolumeLevel = (level, source) => {
            if (source === 'user') setUserVolume(level);
            if (source === 'ai') setAiVolume(level);
        };
    }

    const instruction = getSystemInstruction(languageA, languageB);
    await geminiService.current.connect(instruction);
  }, [languageA, languageB]);

  const handleDisconnect = useCallback(async () => {
    if (geminiService.current) {
      await geminiService.current.disconnect();
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setAiVolume(0);
    setUserVolume(0);
  }, []);

  const toggleMic = () => setVideoState(prev => ({ ...prev, isMicOn: !prev.isMicOn }));
  const toggleCam = () => setVideoState(prev => ({ ...prev, isCameraOn: !prev.isCameraOn }));

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Globe2 size={20} className="text-white" />
            </div>
            <div className="hidden md:block">
                <h1 className="font-bold text-lg tracking-tight leading-none text-white">Polyglot<span className="text-indigo-400 font-light">Connect</span></h1>
                <span className="text-xs text-slate-400 font-medium tracking-wide">REAL-TIME TRANSLATOR</span>
            </div>
        </div>

        {/* Language Selector */}
        <div className={`flex items-center gap-2 bg-slate-800/50 rounded-full p-1 pl-4 border border-slate-700/50 backdrop-blur-sm transition-opacity duration-300 ${connectionState === ConnectionState.CONNECTED ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
            <div className="relative group">
                <select 
                    value={languageA}
                    onChange={(e) => setLanguageA(e.target.value)}
                    className="appearance-none bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer pr-6 py-1"
                >
                    {LANGUAGES.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                </select>
                 <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            
            <div className="p-1.5 rounded-full bg-slate-700/50 text-slate-400">
                <ArrowRightLeft size={12} />
            </div>

            <div className="relative group pr-2">
                 <select 
                    value={languageB}
                    onChange={(e) => setLanguageB(e.target.value)}
                    className="appearance-none bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer pr-6 py-1"
                >
                     {LANGUAGES.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                connectionState === ConnectionState.CONNECTED 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
                <div className={`w-2 h-2 rounded-full ${
                    connectionState === ConnectionState.CONNECTED ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`} />
                <span className="hidden sm:inline">{connectionState === ConnectionState.CONNECTED ? 'Live Agent Active' : 'Offline'}</span>
            </div>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2929&auto=format&fit=crop')] bg-cover bg-center">
        {/* Dark overlay for video contrast */}
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-[2px]"></div>
        
        {error && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-red-500/50 p-6 rounded-2xl max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Configuration Error</h2>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        )}
        
        {/* The video grid */}
        <VideoStage 
            videoState={videoState}
            aiVolume={aiVolume}
            userVolume={userVolume}
            connectionStatus={connectionState}
        />

        {/* Floating Subtitles (Simulating Data Channel) */}
        <TranscriptLog messages={messages} />
        
        {/* Info Overlay */}
        {!connectionState && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-60">
                <h3 className="text-3xl font-bold text-white mb-3">{languageA} ↔ {languageB}</h3>
                <p className="text-lg text-slate-300">Start the call to activate the AI Interpreter.</p>
            </div>
        )}
      </main>

      {/* Controls */}
      <Controls 
        connectionState={connectionState}
        videoState={videoState}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
};

export default App;