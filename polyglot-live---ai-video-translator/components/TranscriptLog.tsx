import React, { useEffect, useState } from 'react';
import { TranscriptionMessage } from '../types';

interface TranscriptLogProps {
  messages: TranscriptionMessage[];
}

export const TranscriptLog: React.FC<TranscriptLogProps> = ({ messages }) => {
  const [activeMessage, setActiveMessage] = useState<TranscriptionMessage | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setActiveMessage(messages[messages.length - 1]);
      
      // Auto-hide after 5 seconds if no new message comes in
      const timer = setTimeout(() => {
        setActiveMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  if (!activeMessage) return null;

  return (
    <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-30 px-6">
      <div 
        key={activeMessage.id}
        className={`
          max-w-3xl text-center px-6 py-4 rounded-xl backdrop-blur-md shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4
          ${activeMessage.sender === 'user' 
            ? 'bg-slate-900/80 text-emerald-100 border-l-4 border-emerald-500' 
            : 'bg-indigo-900/80 text-white border-l-4 border-indigo-400'
          }
        `}
      >
        <div className="flex items-center justify-center gap-2 mb-1 opacity-70 text-xs font-bold uppercase tracking-widest">
           {activeMessage.sender === 'user' ? (
             <><span>Original Audio</span></>
           ) : (
             <><span>AI Interpreter</span></>
           )}
        </div>
        <p className="text-xl md:text-2xl font-medium leading-relaxed drop-shadow-md">
          "{activeMessage.text}"
        </p>
      </div>
    </div>
  );
};