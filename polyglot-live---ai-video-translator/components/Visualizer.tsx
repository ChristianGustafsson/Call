import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number; // 0 to 1
  active: boolean;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, active, color = '#60a5fa' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeRef = useRef(0);

  // Smooth out volume changes
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let smoothVol = 0;

    const draw = () => {
      if (!active) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Linear interpolation for smoothness
      smoothVol += (volumeRef.current - smoothVol) * 0.2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Base radius + dynamic radius based on volume
      const maxRadius = Math.min(canvas.width, canvas.height) / 2;
      const radius = 20 + (smoothVol * 200); 

      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(radius, maxRadius), 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 + (smoothVol * 0.7); // Opacity pulsing
      ctx.fill();

      // Inner circle (solid)
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(radius * 0.5, maxRadius * 0.5), 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [active, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={200} 
      className="w-full h-full absolute inset-0 pointer-events-none"
    />
  );
};