export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
}

export interface TranscriptionMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface GeminiConfig {
  model: string;
  voiceName: string;
  systemInstruction: string;
}

export interface VideoState {
  isCameraOn: boolean;
  isMicOn: boolean;
}