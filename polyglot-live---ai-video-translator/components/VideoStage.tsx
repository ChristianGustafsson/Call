import React, { useEffect, useRef } from 'react';
import { User, MicOff, VideoOff, Sparkles } from 'lucide-react';
import { Visualizer } from './Visualizer';
import { VideoState } from '../types';

interface VideoStageProps {
  videoState: VideoState;
  aiVolume: number;
  userVolume: number;
  connectionStatus: string;
}

export const VideoStage: React.FC<VideoStageProps> = ({ 
  videoState, 
  aiVolume, 
  userVolume,
  connectionStatus
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoState.isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Camera access denied:", err));
    } else {
       if (localVideoRef.current && localVideoRef.current.srcObject) {
         const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(t => t.stop());
         localVideoRef.current.srcObject = null;
       }
    }
  }, [videoState.isCameraOn]);

  return (
    <div className="w-full h-full p-4 flex gap-4 items-center justify-center relative z-10">
      
      {/* Remote Participant (AI Agent) */}
      <div className="flex-1 h-full max-h-[800px] bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl relative flex flex-col items-center justify-center group transition-all hover:border-indigo-500/30">
        
        {/* Status Tag */}
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-sm font-medium text-slate-200">AI Interpreter</span>
        </div>

        {/* Connection Status Overlay */}
        {connectionStatus !== 'CONNECTED' && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 z-20">
                <span className="text-slate-500 font-mono text-sm tracking-widest uppercase">
                    {connectionStatus === 'CONNECTING' ? 'Connecting to Agent...' : 'Waiting for call...'}
                </span>
             </div>
        )}

        {/* AI Visualizer / Avatar */}
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 opacity-20">
                {/* Background visualizer (large) */}
                <Visualizer volume={aiVolume} active={connectionStatus === 'CONNECTED'} color="#6366f1" />
            </div>
            
            {/* Center Avatar */}
            <div className="relative z-10">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${connectionStatus === 'CONNECTED' ? 'bg-indigo-600 shadow-[0_0_50px_rgba(79,70,229,0.4)]' : 'bg-slate-700'}`}>
                    <Sparkles size={48} className="text-white" />
                </div>
                {/* Ring Visualizer */}
                <div className="absolute inset-0 -m-8 pointer-events-none">
                     <Visualizer volume={aiVolume} active={connectionStatus === 'CONNECTED'} color="#a5b4fc" />
                </div>
            </div>
        </div>
      </div>

      {/* Local Participant (You) */}
      <div className="flex-1 h-full max-h-[800px] bg-slate-800 rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl relative group">
        <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
          <User size={14} className="text-emerald-400" />
          <span className="text-sm font-medium text-slate-200">You</span>
        </div>

        {videoState.isCameraOn ? (
            <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover transform scale-x-[-1]" 
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <div className="bg-slate-700 p-8 rounded-full">
                    <User size={64} className="text-slate-400" />
                </div>
            </div>
        )}

        {/* Local Audio Visualizer (Subtle indicator) */}
        <div className="absolute bottom-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full overflow-hidden border border-white/10">
            <Visualizer volume={userVolume} active={videoState.isMicOn} color="#34d399" />
        </div>

        {/* Mute Indicators */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-4 pointer-events-none">
            {!videoState.isMicOn && (
                <div className="bg-black/60 backdrop-blur p-4 rounded-2xl border border-white/10">
                    <MicOff size={32} className="text-red-500" />
                </div>
            )}
            {!videoState.isCameraOn && (
                <div className="bg-black/60 backdrop-blur p-4 rounded-2xl border border-white/10">
                    <VideoOff size={32} className="text-red-500" />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};