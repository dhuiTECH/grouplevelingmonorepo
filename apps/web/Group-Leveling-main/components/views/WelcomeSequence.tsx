"use client";

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LayeredAvatar from '@/components/LayeredAvatar';

interface WelcomeProps {
  user: any;
  onComplete: () => void;
}

export default function WelcomeSequence({ user, onComplete }: WelcomeProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Check Fast Boot immediately
    const isFastBoot = localStorage.getItem('system_fast_boot') === 'true';
    if (isFastBoot) {
      onComplete(); // Skip animation
      return;
    }

    // Start Animation Sequence
    setStage(1);
    const timers = [
      setTimeout(() => setStage(2), 1000),
      setTimeout(() => setStage(3), 2200),
      setTimeout(() => setStage(4), 3400),
      setTimeout(() => onComplete(), 5000)
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  if (stage === 0) return null; // Don't render if skipping

  return (
    <div className="h-screen bg-black text-blue-400 flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 z-0">
        <source src="/hologram.webm" type="video/webm" />
      </video>
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900 via-transparent to-transparent animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-4">
        {stage >= 1 && (
          <p className="animate-in fade-in slide-in-from-left duration-500 flex items-center gap-3 text-xs uppercase tracking-widest text-green-400">
            <Loader2 className="animate-spin" size={16} /> Reactivating Hunter System... [OK]
          </p>
        )}
        {stage >= 2 && (
          <p className="animate-in fade-in slide-in-from-left duration-500 flex items-center gap-3 text-xs uppercase tracking-widest text-blue-400">
            <Loader2 className="animate-spin" size={16} /> Synchronizing Hunter Data... [98%]
          </p>
        )}
        {stage >= 3 && (
          <p className="animate-in fade-in slide-in-from-left duration-500 flex items-center gap-3 text-xs uppercase tracking-widest text-cyan-400">
            <Loader2 className="animate-spin" size={16} /> Validating Hunter Credentials... [VERIFIED]
          </p>
        )}
        {stage >= 4 && (
          <div className="mt-12 animate-in zoom-in fade-in duration-700 text-center">
            <div className="tech-panel clip-tech-card tech-border-container p-10">
              <h2 className="text-xl font-black italic tracking-tighter text-white mb-2 uppercase">System Reinitialization Complete</h2>
              <div className="h-px w-full bg-green-900 mb-3" />
              <div className="flex justify-center mb-3">
                <LayeredAvatar user={user} size={128} className="rounded-full border-4 border-green-500/50 overflow-hidden" />
              </div>
              <p className="text-sm font-bold text-green-100 uppercase leading-relaxed mb-3">
                Welcome Back, <br/>
                <span className="text-green-400 text-xl tracking-tight font-black italic">Hunter {user.name}</span>
              </p>
              <p className="text-[10px] text-green-300/80 uppercase tracking-[0.2em] font-bold">
                Your session has been restored.<br/>
                Ready to continue your hunt.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
