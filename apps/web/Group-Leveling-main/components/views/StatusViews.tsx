"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

// --- Loading Screen ---
export function LoadingView() {
  return (
    <div className="h-screen bg-black text-blue-400 flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 z-0">
        <source src="/hologram.webm" type="video/webm" />
      </video>
      <div className="relative z-10 text-center space-y-4">
        <Loader2 className="animate-spin w-12 h-12 mx-auto text-blue-400" />
        <h1 className="text-xl tracking-tighter text-blue-500">SYSTEM INITIALIZING</h1>
        <p className="text-xs uppercase tracking-widest text-blue-300">Loading Hunter Data...</p>
      </div>
    </div>
  );
}

// --- Pending Approval Screen ---
export function PendingView({ userName }: { userName: string }) {
  return (
    <div className="h-screen bg-black text-blue-400 flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 z-0">
        <source src="/hologram.webm" type="video/webm" />
      </video>
      <div className="relative z-10 text-center space-y-4">
        <div className="tech-panel clip-tech-card tech-border-container p-10">
            <h2 className="text-xl font-black italic tracking-tighter text-white mb-2 uppercase">Access Pending</h2>
            <div className="h-px w-full bg-blue-900 mb-3" />
            <p className="text-sm font-bold text-blue-100 uppercase leading-relaxed mb-3">
              Welcome, Hunter {userName}
            </p>
            <p className="text-[10px] text-blue-300/80 uppercase tracking-[0.2em] font-bold mb-3">
              Your hunter application has been submitted.<br/>
              An admin will review and approve your account.
            </p>
            <div className="flex items-center justify-center space-x-2 text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-[8px] uppercase tracking-wider">Processing...</span>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- Rejected Screen ---
export function RejectedView() {
  return (
    <div className="h-screen bg-red-900 text-red-400 flex flex-col items-center justify-center p-6 font-mono">
      <div className="text-center space-y-4">
        <div className="inline-block p-1 bg-gradient-to-r from-red-600 to-red-400 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.6)]">
          <div className="bg-black px-8 py-6 rounded-md border border-red-500/50">
            <h2 className="text-xl font-black italic tracking-tighter text-white mb-2 uppercase">Access Denied</h2>
            <div className="h-px w-full bg-red-900 mb-3" />
            <p className="text-sm font-bold text-red-100 uppercase leading-relaxed">
              Sorry, your application was not approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
