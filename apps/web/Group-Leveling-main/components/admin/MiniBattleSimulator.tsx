"use client";

import React, { useState } from 'react';
import { Sword, Battery, Wifi, Signal } from 'lucide-react';

interface MiniBattleSimulatorProps {
  monsterUrl: string;
  backgroundUrl: string;
  testSkillId: string;
  monsterIsSpritesheet: boolean;
  monsterFrameCount: number;
  monsterFrameWidth: number;
  monsterFrameHeight: number;
  monsterAnimationSpeed: number;
  monsterStartFrame?: number;
  monsterEndFrame?: number;
  monsterIdleLoopRange?: [number, number];
  previewScale?: number;
  eventType: string;
  baseHP: number;
  metadata: any;
}

export default function MiniBattleSimulator({
  monsterUrl,
  backgroundUrl,
  testSkillId,
  monsterIsSpritesheet,
  monsterFrameCount,
  monsterFrameWidth,
  monsterFrameHeight,
  monsterAnimationSpeed,
  monsterStartFrame = 0,
  monsterEndFrame = 0,
  monsterIdleLoopRange,
  previewScale = 1,
  eventType,
  baseHP,
  metadata
}: MiniBattleSimulatorProps) {
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [spawnReplayKey, setSpawnReplayKey] = useState(0);

  // Logic Breakdown:
  // 1. INTRO (Spawn): Plays StartFrame -> EndFrame once.
  // 2. IDLE LOOP: Plays LoopStart -> LoopEnd infinite.
  // 3. ATTACK: Plays LoopStart -> LoopEnd once (or distinct range if we added that, but for now reuse loop).

  const hasIdleLoop = monsterIdleLoopRange && (monsterIdleLoopRange[0] > 0 || monsterIdleLoopRange[1] > 0);

  // Determine effective range based on state
  let currentStart = 0;
  let currentEnd = 0;
  let loopMode = 'infinite';

  if (isPlayingIntro) {
    // Show Full Intro (0 -> 16)
    currentStart = monsterStartFrame || 0;
    currentEnd = monsterEndFrame || monsterFrameCount - 1;
    loopMode = '1 forwards';
  } else if (hasIdleLoop) {
    // Show Loop (10 -> 16)
    currentStart = monsterIdleLoopRange![0];
    currentEnd = monsterIdleLoopRange![1];
    loopMode = 'infinite';
  } else {
    // Default: Loop everything if no specific ranges are set
    currentStart = monsterStartFrame || 0;
    currentEnd = monsterEndFrame || monsterFrameCount - 1;
    loopMode = 'infinite';
  }

  const currentFrameCount = Math.max(1, (currentEnd - currentStart) + 1);

  const runTest = () => {
    if (!testSkillId) {
      setBattleLogs(prev => [...prev, "Select a skill first!"]);
      return;
    }
    
    setIsAttacking(true);
    setBattleLogs(prev => [...prev, `[SIM] Using skill ID: ${testSkillId} against ${eventType}...`]);
    
    setTimeout(() => {
        setIsAttacking(false);
        setBattleLogs(prev => [...prev, `[SIM] Target HP: ${baseHP} -> ${Math.max(0, baseHP - 20)}`]);
    }, 500);
  };

  const replaySpawn = () => {
    if (!monsterUrl) return;
    setSpawnReplayKey((k) => k + 1);
    setIsPlayingIntro(true);
  };

  // Initial load: Play intro if loop is defined, otherwise just sit there
  React.useEffect(() => {
    if (hasIdleLoop && !isPlayingIntro) {
       // Force initial spawn play
       setIsPlayingIntro(true);
    }
  }, [hasIdleLoop]); // Re-run if loop configuration changes

  return (
    <div className="mt-4 p-4 bg-black/60 rounded-2xl border border-gray-800 shadow-2xl">
      <h3 className="text-[10px] font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
        <Sword size={12} className="text-red-500" /> Mobile Battle Preview (SIDE_VIEW)
      </h3>
      
      {/* Mobile Device Frame */}
      <div className="relative mx-auto w-full max-w-[300px] aspect-[1/2] rounded-[3rem] border-[8px] border-gray-800 bg-black overflow-hidden shadow-2xl ring-1 ring-gray-700">
        
        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-6 px-6 flex justify-between items-center z-20 bg-black/20 backdrop-blur-sm">
            <span className="text-[8px] font-bold text-white">9:41</span>
            <div className="flex items-center gap-1">
                <Signal size={8} className="text-white" />
                <Wifi size={8} className="text-white" />
                <Battery size={8} className="text-white" />
            </div>
        </div>

        {/* Dynamic Island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-30 ring-1 ring-white/10" />

        {/* Game Arena */}
        <div 
          className="relative w-full h-full flex flex-col"
          style={{
            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'linear-gradient(to bottom, #1a1a1a, #000)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
            <div className="absolute inset-0 bg-black/20" />

            {/* Combat Area */}
            <div className="flex-1 relative flex items-center justify-between px-4">
                
                {/* Player Side (Left) */}
                <div className="relative flex flex-col items-center gap-2 mt-32 z-10">
                    <div className="w-16 h-24 bg-gradient-to-b from-blue-500/20 to-blue-600/10 rounded-xl border-2 border-blue-400/30 flex items-center justify-center backdrop-blur-md group shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                        <span className="text-[10px] font-black text-blue-400 opacity-50 uppercase tracking-tighter group-hover:opacity-100 transition-opacity">Player</span>
                        <div className={`absolute -bottom-2 w-12 h-2 bg-blue-500/40 blur-md rounded-full transition-transform duration-500 ${isAttacking ? 'scale-[2.5] opacity-100' : 'scale-100 opacity-50'}`} />
                    </div>
                    {/* Player UI */}
                    <div className="w-20 space-y-1">
                        <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                            <div className="h-full bg-blue-500 w-[80%]" />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[6px] font-black text-blue-300">HERO</span>
                            <span className="text-[6px] font-black text-white">LV.25</span>
                        </div>
                    </div>
                </div>

                {/* Monster Side (Right) */}
                <div className="relative flex flex-col items-center gap-2 mb-32 z-10 max-w-[50%]">
                     {monsterUrl ? (
                        <div
                            key={`monster-${spawnReplayKey}-${currentStart}-${currentEnd}-${monsterIsSpritesheet}`}
                            className={`transition-transform duration-300 ${isAttacking ? 'translate-x-2' : ''}`}
                            style={{
                                width: monsterIsSpritesheet ? (monsterFrameWidth || 64) : '100%',
                                height: monsterIsSpritesheet ? (monsterFrameHeight || 64) : '150px',
                                minWidth: monsterIsSpritesheet ? 'none' : '100px',
                                transform: `scale(${previewScale || 1}) ${isAttacking ? 'translateX(10px)' : ''}`,
                                transformOrigin: 'center bottom',
                                backgroundImage: `url(${monsterUrl})`,
                                backgroundSize: monsterIsSpritesheet
                                    ? `${(monsterFrameCount || 1) * 100}% 100%`
                                    : 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: monsterIsSpritesheet 
                                    ? `-${currentStart * (monsterFrameWidth || 64)}px 0px` 
                                    : 'center bottom',
                                imageRendering: 'pixelated',
                                animation: monsterIsSpritesheet && monsterFrameCount > 1
                                    ? `mini-battle-sprite ${monsterAnimationSpeed || 800}ms steps(${currentFrameCount}) ${loopMode}`
                                    : 'none'
                            }}
                            onAnimationEnd={() => {
                                if (isPlayingIntro) {
                                    setIsPlayingIntro(false);
                                }
                            }}
                        />
                    ) : (
                        <div className="w-16 h-16 bg-red-500/20 rounded-full border-2 border-red-500/30 flex items-center justify-center">
                             <span className="text-[8px] font-black text-red-500 opacity-50 uppercase">No Sprite</span>
                        </div>
                    )}

                    {/* Monster UI */}
                    <div className="w-24 space-y-1">
                        <div className="h-2 w-full bg-gray-900/80 rounded-full overflow-hidden border border-gray-700 backdrop-blur-md">
                            <div className="h-full bg-red-600 w-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[7px] font-black text-white uppercase tracking-tight truncate max-w-[50px]">{eventType}</span>
                            <span className="text-[7px] font-black text-red-400">HP: {baseHP}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Battle Overlay Buttons (Simulated) */}
            <div className="h-32 bg-gradient-to-t from-black to-transparent p-4 flex flex-col justify-end gap-2">
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-gray-800/80 rounded-lg border border-gray-700 flex items-center justify-center">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Attack</span>
                    </div>
                    <div className="h-8 bg-gray-800/80 rounded-lg border border-gray-700 flex items-center justify-center">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Skill</span>
                    </div>
                    <div className="h-8 bg-gray-800/80 rounded-lg border border-gray-700 flex items-center justify-center">
                        <span className="text-[8px] font-black text-gray-400 uppercase">Items</span>
                    </div>
                    <div className="h-8 bg-red-900/40 rounded-lg border border-red-800/50 flex items-center justify-center">
                        <span className="text-[8px] font-black text-red-400 uppercase">Run</span>
                    </div>
                </div>
            </div>

            {/* Home Indicator */}
            <div className="h-8 flex items-center justify-center bg-black">
                <div className="w-32 h-1 bg-gray-700 rounded-full" />
            </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
            <button
                type="button"
                onClick={runTest}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1 shadow-lg shadow-red-900/40"
            >
                {isPlaying ? 'Stop Animation' : 'Test Attack Sequence'}
            </button>
            {hasIdleLoop && (
                <button
                    type="button"
                    onClick={replaySpawn}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-[10px] font-black uppercase transition-all border-b-4 border-gray-900 active:border-b-0 active:translate-y-1"
                    title="Replay Spawn Animation"
                >
                    Spawn
                </button>
            )}
        </div>

        {battleLogs.length > 0 && (
            <div className="p-3 bg-black/40 rounded-xl border border-gray-800 max-h-32 overflow-y-auto custom-scrollbar">
            {battleLogs.slice(-5).map((log, i) => (
                <div key={i} className="text-[9px] text-gray-500 font-mono mb-1 flex items-start gap-2">
                    <span className="text-red-900/50">▶</span>
                    {log}
                </div>
            ))}
            </div>
        )}
      </div>

      <style>{`
        @keyframes mini-battle-sprite {
          from { background-position: -${currentStart * (monsterFrameWidth || 64)}px 0px; }
          to { background-position: -${(currentEnd + 1) * (monsterFrameWidth || 64)}px 0px; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
