"use client";

import React, { memo } from 'react';
import { ThumbsUp, Loader2 } from 'lucide-react';
import TrainingWidget from '@/components/TrainingWidget';
import DungeonView from '@/components/DungeonView';
import LayeredAvatar from '@/components/LayeredAvatar';
import { calculateDerivedStats, getExpProgress } from '@/lib/stats';

function formatRunDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function formatPaceMinPerKm(durationSeconds: number, distanceMeters: number): string {
  const km = distanceMeters / 1000;
  if (km <= 0) return '—';
  const paceSec = durationSeconds / km;
  const pm = Math.floor(paceSec / 60);
  const ps = Math.floor(paceSec % 60);
  return `${pm}:${ps.toString().padStart(2, '0')} /km`;
}

function formatSpeedKmh(distanceMeters: number, durationSeconds: number): string {
  if (durationSeconds <= 0) return '—';
  const kmh = (distanceMeters / 1000) / (durationSeconds / 3600);
  return `${kmh.toFixed(1)} km/h`;
}

// --- PROPS INTERFACE ---
interface DashboardProps {
  user: any;
  setUser: (u: any) => void;
  level: number;
  rank: string;
  setActiveTab: (tab: string) => void;
  setSelectedAvatar: (u: any) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  trainingProtocol: any;
  fetchProtocol: () => void;
  nutritionLogs: any[];
  fetchNutrition: () => void;
  setShowTrainingModal: (initialTab?: "training" | "nutrition") => void;
  dungeons: any[];
  selectedDungeon: any;
  setSelectedDungeon: (d: any) => void;
  clearedRuns: any[];
  clearedRunsLoading: boolean;
  toggleDungeonRunKudos: (runId: string, runnerUserId: string, currentlyGiven: boolean) => Promise<void>;
  handleClaimReward: (source: 'daily' | 'weekly' | 'streak' | 'special' | 'manual_daily' | 'manual_weekly', type?: 'small' | 'silver' | 'medium' | 'large') => Promise<void>;
}

// --- OPTIMIZED SUB-COMPONENTS ---

const VitalitySection = memo(({ user, level, setSelectedAvatar }: { user: any, level: number, setSelectedAvatar: (u: any) => void }) => {
  const stats = calculateDerivedStats(user);
  const maxHP = user.max_hp || stats.maxHP;
  const maxMP = user.max_mp || stats.maxMP;
  const hpPercent = ((user.current_hp || 0) / maxHP) * 100;
  const mpPercent = ((user.current_mp || 0) / maxMP) * 100;
  const expProgress = getExpProgress(user.exp || 0, level);

  return (
    <section className="aura-card-gradient aura-glow-border rounded-2xl p-6 mb-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1 space-y-3">
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

        <div className="flex-shrink-0 flex flex-col items-center justify-center">
          <div className="relative w-[100px] h-[100px] min-w-[100px] min-h-[100px] overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-slate-900/90 shadow-lg shadow-cyan-500/10">
            <LayeredAvatar user={user} size={100} className="rounded-2xl" onAvatarClick={() => setSelectedAvatar(user)} />
          </div>
        </div>
      </div>
    </section>
  );
});

export default function DashboardView(props: DashboardProps) {
  const {
    user,
    level,
    rank,
    dungeons,
    clearedRuns,
    clearedRunsLoading,
    toggleDungeonRunKudos,
  } = props;

  const isOwnRun = (runnerId: string) => runnerId === user?.id;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-6">
      <VitalitySection user={user} level={level} setSelectedAvatar={props.setSelectedAvatar} />

      <TrainingWidget
        user={user}
        trainingProtocol={props.trainingProtocol}
        nutritionLogs={props.nutritionLogs}
        onOpenModal={() => props.setShowTrainingModal("training")}
        onClaimChest={() => props.handleClaimReward('weekly')}
        onClaimStepsReward={() => props.handleClaimReward('special', 'silver')}
      />

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

      <section>
        <h2 className="system-glass text-[10px] font-header font-black uppercase tracking-[0.3em] mb-1 text-blue-500 flex items-center gap-2">
          <img src="/gates.png" alt="Gates" className="w-6 h-6" /> Cleared Gates
        </h2>
        <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-3">
          You &amp; friends — latest special instance clears · time · pace · kudos
        </p>

        <div className="space-y-3">
          {clearedRunsLoading && (
            <div className="flex items-center justify-center py-8 text-cyan-500/80">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Loading clears…</span>
            </div>
          )}

          {!clearedRunsLoading && clearedRuns.length === 0 && (
            <div className="aura-card-gradient aura-glow-border rounded-2xl p-6 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">No clears yet</p>
              <p className="text-[8px] text-gray-600 mt-2">Finish a run or add friends to see activity here.</p>
            </div>
          )}

          {!clearedRunsLoading &&
            clearedRuns.map((row: any) => {
              const runner = row.runner;
              if (!runner) return null;
              const dungeonName = row.dungeon?.name || 'Special Instance';
              const duration = row.duration_seconds ?? 0;
              const dist = row.distance_meters ?? 0;

              return (
                <div
                  key={row.id}
                  className="aura-card-gradient aura-glow-border rounded-2xl p-4 flex gap-3 items-center"
                >
                  <div className="flex-shrink-0 w-[52px] h-[52px] min-w-[52px] min-h-[52px] overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-900/90 shadow-inner">
                    <LayeredAvatar
                      user={runner}
                      size={52}
                      className="rounded-xl"
                      onAvatarClick={() => props.setSelectedAvatar(runner)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-white truncate">
                        {runner.hunter_name || runner.name || 'Hunter'}
                      </span>
                      {isOwnRun(row.user_id) && (
                        <span className="text-[7px] font-bold uppercase text-cyan-400/90 shrink-0">You</span>
                      )}
                    </div>
                    <div className="text-[8px] font-bold uppercase text-blue-400/90 truncate mt-0.5">{dungeonName}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[8px] font-bold text-gray-500 uppercase">
                      <span className="text-gray-300">Time {formatRunDuration(duration)}</span>
                      <span>Pace {formatPaceMinPerKm(duration, dist)}</span>
                      <span>{formatSpeedKmh(dist, duration)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {!isOwnRun(row.user_id) ? (
                      <button
                        type="button"
                        onClick={() =>
                          toggleDungeonRunKudos(row.id, row.user_id, row.kudosGivenByMe)
                        }
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded clip-tech-button border transition-colors ${
                          row.kudosGivenByMe
                            ? 'bg-cyan-600/30 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-800/80 border-white/10 text-gray-400 hover:border-cyan-500/40'
                        }`}
                      >
                        <ThumbsUp size={14} className={row.kudosGivenByMe ? 'text-cyan-300' : ''} />
                        <span className="text-[8px] font-black">{row.kudosCount ?? 0}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 text-gray-600">
                        <ThumbsUp size={14} />
                        <span className="text-[8px] font-black text-gray-500">{row.kudosCount ?? 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
