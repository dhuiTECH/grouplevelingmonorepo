'use client';

import { Check, Flame, Utensils, Footprints } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@/lib/types';

interface TrainingWidgetProps {
  user: User | null;
  trainingProtocol: any[];
  nutritionLogs: any[];
  onOpenModal: (tab: 'training' | 'nutrition') => void;
  onClaimChest: () => Promise<void>;
  onClaimStepsReward?: () => Promise<void>;
}

export default function TrainingWidget({
  user,
  trainingProtocol,
  nutritionLogs,
  onOpenModal,
  onClaimChest,
  onClaimStepsReward
}: TrainingWidgetProps) {
  const [activeTab, setActiveTab] = useState<'training' | 'nutrition'>('training');
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];

  const nutritionTotalsToday = useMemo(() => {
    return (nutritionLogs || [])
      .filter(log => log.day_of_week === todayName)
      .reduce((acc, curr) => ({
        cals: acc.cals + (curr.calories || 0),
        prot: acc.prot + (curr.protein || 0),
        carbs: acc.carbs + (curr.carbs || 0),
        fats: acc.fats + (curr.fats || 0)
      }), { cals: 0, prot: 0, carbs: 0, fats: 0 });
  }, [nutritionLogs, todayName]);

  const getDayCompletionStatus = useCallback((dayName: string) => {
    if (activeTab === 'training') {
      const dayExercises = trainingProtocol.filter(ex => ex.day_of_week === dayName);
      if (dayExercises.length === 0) return { isCompleted: false };
      
      const anyCompleted = dayExercises.some(ex => ex.is_completed);
      return { isCompleted: anyCompleted };
    } else {
      // Nutrition completion: Check if at least 3 logs exist for that day
      const logsCount = nutritionLogs.filter(log => log.day_of_week === dayName).length;
      return { isCompleted: logsCount >= 3 };
    }
  }, [trainingProtocol, nutritionLogs, activeTab]);

  const getWeeklyStreak = useMemo(() => {
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let completedDays = 0;
    
    for (const day of weekDays) {
      // 1. Check Training Completion for this day (ALL assigned exercises must be completed)
      const dayExercises = trainingProtocol.filter(ex => ex.day_of_week === day);
      const trainingDone = dayExercises.length > 0 && dayExercises.some(ex => ex.is_completed);

      // 2. Check Dietary Completion for this day (at least 3 meals)
      const dayLogs = (nutritionLogs || []).filter(log => log.day_of_week === day);
      const dietaryDone = dayLogs.length >= 3;

      if (trainingDone && dietaryDone) {
        completedDays++;
      }
    }
    return completedDays;
  }, [trainingProtocol, nutritionLogs]);

  const isStreakComplete = getWeeklyStreak >= 7;
  const canClaim = isStreakComplete && user?.grand_chest_available;

  // Sync streak completion to database to enable claiming
  useEffect(() => {
    if (isStreakComplete && user && !user.grand_chest_available) {
      console.log('Weekly streak reached 7/7! Enabling grand chest...');
      fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: user.id, 
          weekly_streak_count: 7,
          grand_chest_available: true 
        })
      });
    }
  }, [isStreakComplete, user?.id, user?.grand_chest_available]);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-2">
      <div className={`aura-card-gradient aura-glow-border rounded-2xl p-0 overflow-hidden transition-all duration-500 ${canClaim ? 'ready-to-claim-aura' : ''}`}>
        
        {/* TABS HEADER */}
        <div className="flex border-b border-white/5 relative font-header">
            <button 
                onClick={() => setActiveTab('training')} 
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === 'training' ? 'text-cyan-400 bg-cyan-950/20' : 'text-gray-600 hover:text-gray-400'}`}
            >
                [ TRAINING ]
                {activeTab === 'training' && <motion.div layoutId="widget-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
            </button>
            <button 
                onClick={() => setActiveTab('nutrition')} 
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === 'nutrition' ? 'text-amber-500 bg-amber-950/20' : 'text-gray-600 hover:text-gray-400'}`}
            >
                [ DIETARY ]
                {activeTab === 'nutrition' && <motion.div layoutId="widget-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_#f59e0b]" />}
            </button>
        </div>

        <div className="p-3">
            {/* MON-SUN Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => {
                const fullDayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx];
                const isToday = todayName === fullDayName;
                const status = getDayCompletionStatus(fullDayName);
                
                return (
                  <div key={day} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[7px] font-black uppercase ${isToday ? (activeTab === 'training' ? 'text-cyan-400' : 'text-amber-400') : 'text-gray-500'}`}>{day}</span>
                    <button
                      onClick={() => onOpenModal(activeTab)}
                      className={`w-full aspect-square clip-tech-button border flex items-center justify-center transition-all relative ${
                        isToday 
                          ? (activeTab === 'training' ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-amber-900/40 border-amber-500 shadow-[0_0_8px_#f59e0b]') 
                          : 'bg-slate-900/60 border-slate-700/50 hover:border-white/20'
                      }`}
                    >
                      {status.isCompleted ? (
                        <Check size={12} className={activeTab === 'training' ? 'text-green-400' : 'text-amber-400'} />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'training' ? 'bg-cyan-400/20' : 'bg-amber-400/20'}`} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* INTEGRATED FOOTER */}
            <div className="space-y-3 border-t border-white/5 pt-3">
                {/* Protocol Rewards + Macros + Streak */}
                <div className="flex justify-between items-center gap-2">
                    {/* Macros Summary */}
                    <div className="flex items-center gap-2.5 px-2 py-1 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                        <div className="flex flex-col items-center">
                            <span className="text-[6px] font-bold text-blue-400 uppercase">P</span>
                            <span className="text-[9px] font-mono font-black text-white">{nutritionTotalsToday.prot}g</span>
                        </div>
                        <div className="w-[1px] h-4 bg-white/5" />
                        <div className="flex flex-col items-center">
                            <span className="text-[6px] font-bold text-green-400 uppercase">C</span>
                            <span className="text-[9px] font-mono font-black text-white">{nutritionTotalsToday.carbs}g</span>
                        </div>
                        <div className="w-[1px] h-4 bg-white/5" />
                        <div className="flex flex-col items-center">
                            <span className="text-[6px] font-bold text-yellow-400 uppercase">F</span>
                            <span className="text-[9px] font-mono font-black text-white">{nutritionTotalsToday.fats}g</span>
                        </div>
                        <div className="w-[1px] h-4 bg-white/5" />
                        <div className="flex flex-col items-center ml-1">
                            <Flame size={8} className="text-amber-500 mb-0.5" />
                            <span className="text-[9px] font-mono font-black text-amber-400">{nutritionTotalsToday.cals}</span>
                        </div>
                    </div>

                    {/* Streak & Access */}
                    <button
                      onClick={canClaim ? onClaimChest : () => onOpenModal(activeTab)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-500 ${
                        canClaim 
                          ? 'bg-orange-500 border-orange-400 text-black shadow-[0_0_15px_#f97316] scale-105' 
                          : 'bg-black/40 border-white/10 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {canClaim ? 'CLAIM GRAND CHEST' : `WEEKLY STREAK: ${getWeeklyStreak}/7`}
                      </span>
                      <img 
                        src="/icons/largechest.png" 
                        alt="Chest" 
                        className={`w-4 h-4 ${canClaim ? 'animate-bounce' : 'grayscale opacity-50'}`} 
                      />
                    </button>
                </div>

                {/* STEP TARGET (Bottom Compact Row) */}
                <div className="bg-black/20 rounded-xl py-2 px-3 flex items-center gap-3 group">
                    <div className="flex items-center gap-2">
                        <Footprints size={12} className="text-cyan-500" />
                        <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider hidden sm:inline">Daily Steps</span>
                    </div>
                    <div className="flex-1 relative">
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 transition-all duration-1000 shadow-[0_0_8px_#06b6d4]" style={{ width: `${Math.min((user?.daily_steps || 0) / 100, 100)}%` }} />
                        </div>
                        <div className="absolute -top-3 right-0 text-[7px] font-mono text-gray-600">{(user?.daily_steps || 0).toLocaleString()} / 10,000</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                if ((user?.daily_steps || 0) >= 10000) {
                                    onClaimStepsReward?.();
                                }
                            }}
                            disabled={(user?.daily_steps || 0) < 10000}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all group/chest ${
                                (user?.daily_steps || 0) >= 10000 
                                    ? 'bg-slate-900/90 border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_10px_#06b6d4]' 
                                    : 'bg-slate-900/40 border-slate-800 grayscale opacity-40 cursor-not-allowed'
                            }`}
                        >
                            <img src="/icons/silverchest.png" alt="Reward" className={`w-5 h-5 object-contain transition-transform ${(user?.daily_steps || 0) >= 10000 ? 'group-hover/chest:scale-110' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
}