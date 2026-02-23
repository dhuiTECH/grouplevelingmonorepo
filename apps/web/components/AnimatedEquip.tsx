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

  // Calculate position based on responsive mode
  let bgPos = '0px 0px';
  let bgSize = 'auto';

  if (isResponsive) {
    // For responsive (percentage-based), we need to shift by frame index.
    // If totalFrames > 1, the range of motion is (100% * (totalFrames - 1)).
    // Position percentage P = (currentFrame / (totalFrames - 1)) * 100
    // This maps frame 0 -> 0%, last frame -> 100%
    const p = totalFrames > 1 ? (currentFrame / (totalFrames - 1)) * 100 : 0;
    bgPos = `${p}% 0%`;
    bgSize = `${totalFrames * 100}% 100%`;
  } else {
    // For fixed pixel size, we just shift by frame width
    bgPos = `-${currentFrame * frameWidth}px 0px`;
    bgSize = `${totalFrames * frameWidth}px ${frameHeight}px`;
  }

  return (
    <div 
      className={className}
      style={{
        width: isResponsive ? '100%' : frameWidth,
        height: isResponsive ? '100%' : frameHeight,
        backgroundImage: `url(${src})`,
        backgroundPosition: bgPos,
        backgroundSize: bgSize,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transition: 'none',
      }} 
    />
  );
}