"use client";

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Loader2, Upload, Crown, AlertCircle } from 'lucide-react';
import TrainingWidget from '@/components/TrainingWidget';
import DungeonView from '@/components/DungeonView';
import LayeredAvatar from '@/components/LayeredAvatar';
import { calculateDerivedStats, getExpProgress } from '@/lib/stats';

// --- PROPS INTERFACE ---
// This tells the component exactly what data it needs from the main file
interface DashboardProps {
  user: any;
  setUser: (u: any) => void;
  level: number;
  rank: string;
  // Navigation & UI
  setActiveTab: (tab: string) => void;
  setSelectedAvatar: (u: any) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  // Data
  trainingProtocol: any;
  fetchProtocol: () => void;
  nutritionLogs: any[];
  fetchNutrition: () => void;
  setShowTrainingModal: (initialTab?: "training" | "nutrition") => void;
  dungeons: any[];
  selectedDungeon: any;
  setSelectedDungeon: (d: any) => void;
  activities: any[];
  // Handlers
  handleScreenshotUpload: (file: File) => void;
  handleLevelUp: (activity: any) => void;
    handleClaimReward: (source: 'daily' | 'weekly' | 'streak' | 'special' | 'manual_daily' | 'manual_weekly', type?: 'small' | 'silver' | 'medium' | 'large') => Promise<void>;
  // Loading States
  isUploading: boolean;
  uploadError: string | null;
  isOpeningDailyChest: boolean;
  isOpeningGrandChest: boolean;
}

// --- OPTIMIZED SUB-COMPONENTS ---

// 1. Vitality Section (Memoized to prevent lag during HP regen)
const VitalitySection = memo(({ user, level, setSelectedAvatar }: { user: any, level: number, setSelectedAvatar: (u: any) => void }) => {
  const stats = calculateDerivedStats(user);
  const maxHP = user.max_hp || stats.maxHP;
  const maxMP = user.max_mp || stats.maxMP;
  const hpPercent = ((user.current_hp || 0) / maxHP) * 100;
  const mpPercent = ((user.current_mp || 0) / maxMP) * 100;
  
  // XP Calculation using the new standardized formula
  const expProgress = getExpProgress(user.exp || 0, level);

  return (
    <section className="aura-card-gradient aura-glow-border rounded-2xl p-6 mb-4">
      <div className="flex gap-4 items-center">
        {/* Bars Container */}
        <div className="flex-1 space-y-3">
          
          {/* HP Bar */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-sm shadow-[0_0_5px_#dc2626]"></span> HP
              </span>
              <span className="text-[9px] font-bold text-gray-300">{Math.floor(user.current_hp || 0)} / {maxHP}</span>
            </div>
            <div className="h-2 w-full bg-gray-800 clip-tech-button overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              <div className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-1000 shadow-[0_0_15px_#dc2626] relative" style={{ width: `${hpPercent}%` }}>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 blur-[1px]" />
              </div>
            </div>
          </div>

          {/* MP Bar */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm shadow-[0_0_5px_#2563eb]"></span> MP
              </span>
              <span className="text-[9px] font-bold text-gray-300">{Math.floor(user.current_mp || 0)} / {maxMP}</span>
            </div>
            <div className="h-2 w-full bg-gray-800 clip-tech-button overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              <div className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 transition-all duration-1000 shadow-[0_0_15px_#2563eb] relative" style={{ width: `${mpPercent}%` }}>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 blur-[1px]" />
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                <img src="/expcrystal.png" alt="XP" className="w-4 h-4"/> EXP
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-blue-400 uppercase">Lv. {level}</span>
                <span className="text-[9px] font-bold text-gray-500 italic">{Math.floor(expProgress.current)} / {Math.floor(expProgress.total)}</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-gray-800 clip-tech-button overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
              <div className="h-full bg-gradient-to-r from-cyan-700 via-cyan-400 to-cyan-300 transition-all duration-1000 shadow-[0_0_15px_#06b6d4] relative" style={{ width: `${expProgress.percent}%` }}>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/40 blur-[2px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Container */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center">
          <div className="relative p-1 border-2 border-cyan-500/30 rounded-lg bg-slate-900/50 backdrop-blur-sm shadow-lg shadow-cyan-500/10 overflow-hidden">
            <LayeredAvatar user={user} size={100} className="rounded-md" onAvatarClick={() => setSelectedAvatar(user)} />
          </div>
        </div>
      </div>
    </section>
  );
});

// --- MAIN DASHBOARD VIEW ---

export default function DashboardView(props: DashboardProps) {
  const { 
    user, level, rank, dungeons, activities, 
    handleClaimReward, handleLevelUp, handleScreenshotUpload, 
    isUploading, uploadError, isOpeningDailyChest, isOpeningGrandChest 
  } = props;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-6">
      
      {/* 1. Vitality Bars */}
      <VitalitySection user={user} level={level} setSelectedAvatar={props.setSelectedAvatar} />

      {/* 2. Training Widget (Consolidated) */}
       <TrainingWidget
         user={user}
         trainingProtocol={props.trainingProtocol}
         nutritionLogs={props.nutritionLogs}
         onOpenModal={() => props.setShowTrainingModal("training")}
         onClaimChest={() => props.handleClaimReward('weekly')}
         onClaimStepsReward={() => props.handleClaimReward('special', 'silver')}
       />

      {/* 3. Dungeon View (Dashboard Mode) */}
      <DungeonView
        user={user}
        dungeons={dungeons}
        activeTab="dashboard"
        onNavigate={props.setActiveTab}
        showNotification={props.showNotification}
        setUser={props.setUser}
        level={level}
        rank={rank}
        onAvatarClick={props.setSelectedAvatar}
        selectedDungeon={props.selectedDungeon}
        setSelectedDungeon={props.setSelectedDungeon}
      />

      {/* 4. Standard Gates Section */}
      <section>
        <h2 className="system-glass text-[10px] font-header font-black uppercase tracking-[0.3em] mb-3 text-blue-500 flex items-center gap-2">
          <img src="/gates.png" alt="Gates" className="w-6 h-6" /> Standard Gates
        </h2>
        
        <div className="space-y-3">
          
          {/* Manual Submission Card */}
          <div className="aura-card-gradient aura-glow-border rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 clip-tech-button bg-blue-600/20 flex items-center justify-center">
                  <ImageIcon size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-blue-400">Manual Submission <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent font-black">2x EXP/GOLD</span></div>
                  <div className="text-[8px] text-gray-500">Upload physical activities/strava screenshot/healthy eating</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[8px] text-gray-500">AI Analysis</div>
                <div className="text-[10px] font-bold text-green-400">Instant</div>
              </div>
            </div>

            {/* Quest Status / Chests */}
            <div className="flex items-center justify-between gap-4 mb-3 p-2 bg-slate-900/60 backdrop-blur-md rounded clip-tech-button border border-white/10">
               
               {/* Daily Quest */}
               <div className="flex items-center gap-2 flex-1">
                 <div className="text-[9px] font-bold uppercase text-purple-400 tracking-wider">Daily</div>
                 <div className="flex gap-1">
                   <motion.div 
                     className={`w-3 h-3 border transition-all duration-500 ${(user.manual_daily_completions || 0) >= 1 ? 'border-cyan-400 bg-cyan-500/30 shadow-[0_0_8px_#06b6d4]' : 'border-white/10 bg-slate-900/60'}`} 
                     style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}
                   />
                 </div>
                 <div className="flex items-center">
                   {(user.manual_daily_completions || 0) >= 1 ? (
                     isOpeningDailyChest ? (
                       <div className="px-3 py-2 bg-slate-900/60 border border-cyan-500/30 rounded clip-tech-button"><div className="text-[8px] font-bold text-cyan-400 animate-pulse">Analyzing...</div></div>
                     ) : (
                       <motion.button onClick={() => handleClaimReward('manual_daily')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold text-[9px] uppercase border-2 border-[#fbbf24] shadow-lg clip-tech-button relative overflow-hidden">
                         <div className="flex items-center gap-1"><img src="/icons/smallchest.png" alt="Small Chest" className="w-4 h-4 animate-pulse" /> Claim Chest</div>
                       </motion.button>
                     )
                   ) : (
                     <div className="w-6 h-6 bg-slate-700/50 border border-gray-600 rounded flex items-center justify-center"><img src="/icons/smallchest.png" alt="Small Chest" className="w-4 h-4 opacity-50 grayscale" /></div>
                   )}
                 </div>
               </div>

               {/* Weekly Streak */}
               <div className="flex items-center gap-2 flex-1 justify-end">
                 <div className="text-[9px] font-bold uppercase text-blue-400 tracking-wider">Weekly</div>
                 <div className="flex gap-0.5">
                   {[1, 2, 3, 4, 5, 6, 7].map(bar => (
                     <div key={bar} className={`bg-gradient-to-t transition-all duration-500 ${(user.manual_weekly_streak || 0) >= bar ? 'from-cyan-500 to-blue-400 shadow-[0_0_4px_#06b6d4]' : 'from-gray-700 to-gray-600'}`} style={{ width: '2px', height: `${(bar * 1.5) + 4}px`, borderRadius: '1px' }} />
                   ))}
                 </div>
                 <div className="flex items-center">
                   {(user.manual_weekly_streak || 0) >= 7 ? (
                     isOpeningGrandChest ? (
                       <div className="px-3 py-2 bg-slate-900/60 border border-cyan-500/30 rounded clip-tech-button"><div className="text-[8px] font-bold text-cyan-400 animate-pulse">Analyzing...</div></div>
                     ) : (
                       <motion.button onClick={() => handleClaimReward('manual_weekly')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-[9px] uppercase border-2 border-[#fbbf24] shadow-lg clip-tech-button relative overflow-hidden">
                         <div className="flex items-center gap-1"><Crown size={10} className="animate-pulse" /> Claim Chest</div>
                       </motion.button>
                     )
                   ) : (
                     <div className="w-7 h-6 bg-slate-700/50 border border-gray-600 rounded flex items-center justify-center opacity-60"><img src="/icons/largechest.png" alt="Large Chest" className="w-5 h-5" /></div>
                   )}
                 </div>
               </div>
            </div>

            {/* Upload Error Display */}
            {uploadError && (
              <div className="bg-red-900/20 border border-red-500/30 p-2 clip-tech-button mb-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-[9px] text-red-400">{uploadError}</span>
              </div>
            )}

            {/* Upload Button */}
            <div className="relative">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleScreenshotUpload(e.target.files[0])} disabled={isUploading || user.slotsUsed >= 3} className="hidden" id="screenshot-upload" />
              <label htmlFor="screenshot-upload" className={`block w-full py-3 px-4 sm:py-2 sm:px-3 clip-tech-button text-[9px] font-black uppercase text-center transition-all cursor-pointer shimmer-effect ${isUploading || user.slotsUsed >= 3 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                {isUploading ? <div className="flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin" /> Analyzing...</div> : user.slotsUsed >= 3 ? 'Weekly Limit Reached' : <div className="flex items-center justify-center gap-1"><Upload size={12} /> Upload Screenshot</div>}
              </label>
            </div>
          </div>

          {/* Activity Feed */}
          {activities.slice(0, 5).map(activity => {
            const isSubmitted = user.submittedIds.includes(activity.id) || activity.claimed;
            return (
              <div key={activity.id} className="aura-card-gradient aura-glow-border rounded-2xl p-6 mb-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 clip-tech-button bg-gray-800 flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">🏃</div>
                  <div>
                    <div className="text-xs font-bold uppercase">{activity.distance.toFixed(1)}km</div>
                    <div className="flex gap-2 text-[8px] font-bold text-gray-500 uppercase">
                      <span className="text-blue-400">+{activity.exp} EXP</span>
                      <span className="text-yellow-500">+{activity.coins} C</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleLevelUp(activity)} disabled={isSubmitted || user.slotsUsed >= 3} className={`px-3 py-1.5 text-[9px] transition-all shimmer-effect ${isSubmitted ? 'relative px-4 font-black uppercase tracking-widest text-white bg-gray-600 border-b-4 border-gray-900 shadow-lg shadow-gray-500/40 text-green-400 border-green-400/30' : 'relative px-4 font-black uppercase tracking-widest text-white bg-blue-600 border-b-4 border-blue-900 shadow-lg shadow-blue-500/40 hover:brightness-110 active:border-b-0 active:translate-y-[4px]'}`}>
                  {isSubmitted ? 'CLAIMED' : 'CLAIM'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
