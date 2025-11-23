import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Settings2 } from 'lucide-react';
import { ConnectionState, VideoState } from '../types';

interface ControlsProps {
  connectionState: ConnectionState;
  videoState: VideoState;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  connectionState,
  videoState,
  onToggleMic,
  onToggleCam,
  onConnect,
  onDisconnect,
}) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 px-4 shadow-lg">
      <button
        onClick={onToggleMic}
        className={`p-4 rounded-full transition-all ${
          videoState.isMicOn 
            ? 'bg-slate-800 hover:bg-slate-700 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {videoState.isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
      </button>

      <button
        onClick={onToggleCam}
        className={`p-4 rounded-full transition-all ${
          videoState.isCameraOn 
            ? 'bg-slate-800 hover:bg-slate-700 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {videoState.isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
      </button>

      {isConnected || isConnecting ? (
        <button
          onClick={onDisconnect}
          disabled={isConnecting}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-900/20"
        >
          <PhoneOff size={24} />
          <span className="hidden sm:inline">Avsluta Samtal</span>
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 animate-pulse"
        >
          <Phone size={24} />
          <span className="hidden sm:inline">Starta Översättning</span>
        </button>
      )}
      
      <button className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition-all ml-2">
         <Settings2 size={24} />
      </button>
    </div>
  );
};