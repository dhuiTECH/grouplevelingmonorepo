"use client";
import React from "react";

interface SystemWindowProps {
  children: React.ReactNode;
  className?: string;
}

export default function SystemWindow({ children, className = "" }: SystemWindowProps) {
  const windowShape = "polygon(0 24px, 24px 0, 169px 0, 181px 12px, 100% 12px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)";

  return (
    <div className={`relative w-full drop-shadow-[0_0_20px_rgba(6,182,212,0.15)] ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#060b13]/95 to-[#020617]/90 backdrop-blur-xl" style={{ clipPath: windowShape }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-screen" style={{ clipPath: windowShape }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="systemGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0891b2" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#systemGrid)" />
        </svg>
      </div>
      <div className="absolute inset-0 pointer-events-none drop-shadow-[0_0_8px_rgba(8,145,178,0.4)]">
        <svg className="absolute top-0 left-0 w-[200px] h-[50px]">
           <path d="M 1 50 L 1 25 L 25 1 L 169 1 L 181 13 L 200 13" fill="none" stroke="#0e7490" strokeWidth="2" />
           <path d="M 6 50 L 6 27 L 27 6 L 167 6 L 177 18 L 200 18" fill="none" stroke="#0891b2" strokeWidth="1" opacity="0.5" />
           <line x1="8" y1="21" x2="21" y2="8" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
           <line x1="13" y1="26" x2="26" y2="13" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
        </svg>
        <svg className="absolute top-[12px] right-0 w-[50px] h-[50px]">
           <path d="M 0 1 L 49 1 L 49 50" fill="none" stroke="#0e7490" strokeWidth="2" />
           <path d="M 0 6 L 44 6 L 44 50" fill="none" stroke="#0891b2" strokeWidth="1" opacity="0.5" />
           <rect x="40" y="12" width="4" height="12" fill="#06b6d4" opacity="0.6" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-[50px] h-[50px]">
           <path d="M 1 0 L 1 49 L 50 49" fill="none" stroke="#0e7490" strokeWidth="2" />
           <path d="M 6 0 L 6 44 L 50 44" fill="none" stroke="#0891b2" strokeWidth="1" opacity="0.5" />
           <rect x="6" y="26" width="4" height="12" fill="#06b6d4" opacity="0.6" />
        </svg>
        <svg className="absolute bottom-0 right-0 w-[50px] h-[50px]">
           <path d="M 0 49 L 25 49 L 49 25 L 49 0" fill="none" stroke="#0e7490" strokeWidth="2" />
           <path d="M 0 44 L 23 44 L 44 23 L 44 0" fill="none" stroke="#0891b2" strokeWidth="1" opacity="0.5" />
           <line x1="32" y1="46" x2="46" y2="32" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
           <line x1="28" y1="42" x2="42" y2="28" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
        </svg>
        <div className="absolute top-[12px] left-[200px] right-[49px] h-[2px] bg-[#0e7490]" />
        <div className="absolute top-[17px] left-[200px] right-[43px] h-[1px] bg-[#0891b2]/50" />
        <div className="absolute top-[61px] bottom-[49px] right-[0px] w-[2px] bg-[#0e7490]" />
        <div className="absolute top-[61px] bottom-[43px] right-[5px] w-[1px] bg-[#0891b2]/50" />
        <div className="absolute bottom-[0px] left-[49px] right-[49px] h-[2px] bg-[#0e7490]" />
        <div className="absolute bottom-[5px] left-[49px] right-[43px] h-[1px] bg-[#0891b2]/50" />
        <div className="absolute top-[49px] bottom-[49px] left-[0px] w-[2px] bg-[#0e7490]" />
        <div className="absolute top-[49px] bottom-[43px] left-[5px] w-[1px] bg-[#0891b2]/50" />
      </div>
      <div className="absolute top-[16px] left-[32px] w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
      <span className="absolute top-[13px] left-[44px] text-[10px] md:text-xs font-mono text-slate-300 tracking-[0.2em] font-bold">SYSTEM WINDOW</span>
      <div className="relative z-10 w-full p-3 md:p-10 pt-10 md:pt-14">{children}</div>
    </div>
  );
}