"use client";

import { useEffect, useState } from 'react';

interface ChestOpeningModalProps {
  isOpen: boolean;
  chestType: 'small' | 'silver' | 'medium' | 'large';
  onAnimationComplete: () => void;
}

export default function ChestOpeningModal({ isOpen, chestType, onAnimationComplete }: ChestOpeningModalProps) {
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'exploding'>('idle');

  // Map your specific file names to the types
  const chestImage = {
    small: '/icons/smallchestmodal.png',
    silver: '/icons/silverchestmodal.png',
    medium: '/icons/mediumchestmodal.png',
    large: '/icons/largechestmodal.png'
  }[chestType];

  useEffect(() => {
    if (isOpen) {
      setPhase('shaking');
    } else {
      setPhase('idle');
    }
  }, [isOpen]);

  const handleChestClick = () => {
    if (phase !== 'shaking') return;
    
    // Phase 2: Explode on click
    setPhase('exploding');

    // Phase 3: Finish and notify parent after short delay (syncs with flash)
    setTimeout(() => {
      onAnimationComplete();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer"
      onClick={handleChestClick}
    >
      
      {/* INSTRUCTION TEXT */}
      <div className={`mb-8 text-cyan-400 font-black uppercase tracking-[0.3em] text-sm animate-pulse transition-opacity duration-300 ${phase === 'exploding' ? 'opacity-0' : 'opacity-100'}`}>
        TAP TO OPEN
      </div>

      {/* 1. LIGHT BURST (Behind Chest) */}
      <div className={`absolute transition-all duration-1000 ${
        phase === 'shaking' ? 'opacity-50 scale-100' : 'opacity-100 scale-150'
      }`}>
        <div className="w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-[80px] animate-spin-slow" />
      </div>

      {/* 2. THE CHEST IMAGE */}
      <div className="relative z-10">
        <img 
          src={chestImage} 
          alt="Chest" 
          className={`
            w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]
            transition-all duration-300
            ${phase === 'shaking' ? 'animate-rumble' : ''}
            ${phase === 'exploding' ? 'scale-150 opacity-0 brightness-200' : 'scale-100 opacity-100'}
          `}
        />
      </div>

      {/* 3. WHITE FLASH OVERLAY */}
      <div 
        className={`fixed inset-0 bg-white pointer-events-none transition-opacity duration-300 ${
          phase === 'exploding' ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* 4. KEYFRAMES FOR RUMBLE */}
      <style jsx>{`
        @keyframes rumble {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-2px, 2px) rotate(-2deg); }
          50% { transform: translate(2px, -2px) rotate(2deg); }
          75% { transform: translate(-2px, -2px) rotate(-2deg); }
          100% { transform: translate(2px, 2px) rotate(2deg); }
        }
        .animate-rumble {
          animation: rumble 0.1s infinite linear;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
