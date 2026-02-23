'use client';

import React from 'react';
import { Settings, X, Loader2, Skull, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LayeredAvatar from './LayeredAvatar';
import { GlobalTerminal } from '@/components/GlobalTerminal'; // ✅ Chat is back
import { User } from '@/lib/types';

interface HunterHeaderProps {
  user: User | null;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  onAvatarClick: () => void;
  setShowStatusWindow: (show: boolean) => void;
  fastBoot: boolean;
  setFastBoot: (fast: boolean) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
  toggleIncognito: () => void;
  setIsAuthenticated: (auth: boolean) => void;
  setIsOnboarded: (onboard: boolean) => void;
  setUser: (user: any) => void;
}

export const HunterHeader: React.FC<HunterHeaderProps> = ({
  user,
  showSettings,
  setShowSettings,
  onAvatarClick,
  setShowStatusWindow,
  fastBoot,
  setFastBoot,
  showNotification,
  toggleIncognito,
  setIsAuthenticated,
  setIsOnboarded,
  setUser,
}) => {
  const router = useRouter();

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 h-20 px-4 sm:px-8 z-50 flex items-center justify-between gap-4 !overflow-visible">
      {/* LEFT SIDE - Identity */}
      <div className="flex items-center gap-3" onClick={onAvatarClick}>
        <div className="relative w-10 h-10 rounded-full border-2 border-cyan-500/50 overflow-hidden cursor-pointer hover:border-cyan-400 transition-colors">
          <LayeredAvatar user={user} size={40} onAvatarClick={onAvatarClick} />
        </div>
        <div className="flex flex-col leading-tight cursor-pointer">
          <span className="font-bold text-white text-sm sm:text-base leading-none">{user.name || 'Hunter'}</span>
          <span className="text-cyan-400 text-[10px] sm:text-xs font-bold leading-none mt-0.5">Lv.{user.level}</span>
        </div>
      </div>

      {/* RIGHT SIDE - Utility */}
      <div className="flex items-center gap-2 sm:gap-4 relative z-[100]">

        {/* Status Window Button */}
        <button
          onClick={() => setShowStatusWindow(true)}
          className="border border-cyan-500/50 p-1.5 sm:p-2 rounded-lg hover:bg-cyan-500/10 transition-colors group"
          title="View Character Stats"
        >
          <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center overflow-hidden rounded-md">
            <img src="/stats.png" alt="Stats" className="w-full h-full object-contain" />
          </div>
        </button>

        {/* Gems */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-full px-3 py-1 flex items-center gap-2">
          <img src="/gemicon.png" alt="Gems" className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-purple-400 text-xs sm:text-sm font-bold">{(user.gems || 0).toLocaleString()}</span>
        </div>

        {/* Gold */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-full px-3 py-1 flex items-center gap-2">
          <img src="/coinicon.png" alt="Coins" className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-yellow-400 text-xs sm:text-sm font-bold">{(user.coins || 0).toLocaleString()}</span>
        </div>

        {/* Settings Toggle Button */}
        <motion.button
          onClick={() => setShowSettings(true)} // Open Modal
          className="p-1 transition-all relative z-[120] settings-icon"
          title="Settings Menu"
          whileHover={{ scale: 1.1, filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))" }}
          whileTap={{ scale: 0.9 }}
        >
          <SettingsIcon
            size={20}
            className={`text-cyan-400 drop-shadow-md transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`}
          />
        </motion.button>

        {/* --- THE POP-UP MODAL (Centered with Backdrop) --- */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">

              {/* 1. Dark Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)} // Click outside to close
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />

              {/* 2. Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()} // Don't close if clicking inside
                className="relative w-full max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar system-glass border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 settings-menu"
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                      <Settings size={20} className="text-cyan-400 animate-spin-slow" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-widest">System Config</h2>
                      <p className="text-[10px] text-cyan-400/60 font-mono">HUNTER_NET_TERMINAL_V2.0</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                  >
                    <X size={18} />
                  </button>
                </div>

                  {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Skip Intro */}
                  <button
                    onClick={() => {
                      const nextState = !fastBoot;
                      setFastBoot(nextState);
                      localStorage.setItem('system_fast_boot', String(nextState));
                      showNotification(nextState ? "INTRO ANIMATION: SKIPPED" : "INTRO ANIMATION: ENABLED", "success");
                    }}
                    className={`flex-1 py-2 px-3 rounded-full border transition-all flex items-center justify-center gap-2 ${
                      fastBoot
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                        : 'bg-slate-900/40 border-white/5 text-gray-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <Settings size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Skip Intro</span>
                  </button>

                  {/* Incognito */}
                  <button
                    onClick={toggleIncognito}
                    className={`flex-1 py-2 px-3 rounded-full border transition-all flex items-center justify-center gap-2 ${
                      user.is_private
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                        : 'bg-slate-900/40 border-white/5 text-gray-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <Settings size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Incognito Mode</span>
                  </button>

                  {/* Admin & Logout - Compact Pills */}
                  <div className="col-span-2 flex gap-2 pt-1">
                    {user.is_admin && (
                      <button
                        onClick={() => window.location.href = '/admin'}
                        className="flex-1 py-2 px-3 rounded-full border border-yellow-500/30 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 transition-all flex items-center justify-center gap-2"
                      >
                        <SettingsIcon size={12} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Admin Panel</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          if (user.id) localStorage.removeItem(`onboarding_${user.id}`);
                          localStorage.removeItem('current_hunter_id');
                          localStorage.removeItem('hunter_id');
                        }
                        setIsAuthenticated(false);
                        setIsOnboarded(false);
                        setUser({ name: "Hunter", xp: 0, coins: 0, gems: 0, level: 1, rank: 'E', cosmetics: [], equipped: {}, submittedIds: [], completedDungeons: [] });
                        router.push('/login');
                      }}
                      className="flex-1 py-2 px-3 rounded-full border border-red-500/30 bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Skull size={12} />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Terminate Session</span>
                    </button>
                  </div>
                </div>

                {/* --- CHAT TERMINAL (At the bottom of the modal) --- */}
                <div className="mt-1 border-t border-cyan-500/20 pt-3 flex-1 flex flex-col overflow-hidden">
                  <GlobalTerminal userProfile={user} />
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};