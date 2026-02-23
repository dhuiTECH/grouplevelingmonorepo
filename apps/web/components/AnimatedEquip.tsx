'use client';
import { useState, useEffect } from 'react';

interface AnimatedEquipProps {
  src: string;
  frameWidth: number;   // Width of ONE frame
  frameHeight: number;  // Height of ONE frame
  totalFrames: number;
  fps?: number;
  className?: string;
}

export default function AnimatedEquip({ 
  src, 
  frameWidth, 
  frameHeight, 
  totalFrames, 
  fps = 10,
  className = ""
}: AnimatedEquipProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (totalFrames <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [fps, totalFrames]);

  // If className includes responsive-style classes, we use percentage-based scaling
  const isResponsive = className.includes('w-full') || className.includes('h-full');

  return (
    <div 
      className={className}
      style={{
        width: isResponsive ? '100%' : frameWidth,
        height: isResponsive ? '100%' : frameHeight,
        backgroundImage: `url(${src})`,
        // Use pixel-based positioning for crisp frame-by-frame jumps
        backgroundPosition: `-${currentFrame * 100}% 0%`,
        // Scale the background-size so one frame fills 100% of the div
        backgroundSize: `${totalFrames * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transition: 'none',
      }} 
    />
  );
}