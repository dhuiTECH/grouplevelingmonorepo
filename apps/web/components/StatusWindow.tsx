"use client";

import { User } from '@/lib/types';
import { calculateDerivedStats } from '@/lib/stats';
import { useState } from 'react';
import SkillTreeTab from './SkillTreeTab';

interface StatusWindowProps {
  user: User;
  onClose: () => void;
  setUser: (user: User) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

export default function StatusWindow({ user, onClose, setUser, showNotification }: StatusWindowProps) {
  const derivedStats = calculateDerivedStats(user);
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 sm:p-4 max-w-[95vw] sm:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto clip-tech-card relative shadow-2xl">

        <div className="system-glass tech-corner-accents p-3 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-3 border-b border-cyan-500/20">
          <div className="flex-1">
            <h2 className="text-base sm:text-xl font-header font-black uppercase tracking-wider sm:tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline text-cyan-300 text-lg">⚡</span>
              <span className="text-sm sm:text-xl">STATUS WINDOW</span>
              <span className="hidden sm:inline text-cyan-300 text-lg">⚡</span>
            </h2>
            <p className="text-xs sm:text-sm text-cyan-300/70 mt-1 sm:mt-2 font-ui font-bold uppercase tracking-wide">
              {user.current_title} • Lv.{user.level} • {user.current_class}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 sm:px-4 sm:py-2 clip-tech-button bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 text-xs sm:text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] self-end sm:self-auto"
          >
            <span className="hidden sm:inline">✕ </span>CLOSE
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'stats' ? 'text-white bg-cyan-600' : 'text-gray-400 bg-slate-800'} border border-gray-700 rounded-l-lg hover:bg-cyan-700`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'skills' ? 'text-white bg-cyan-600' : 'text-gray-400 bg-slate-800'} border border-gray-700 rounded-r-lg hover:bg-cyan-700`}
              onClick={() => setActiveTab('skills')}
            >
              Skills
            </button>
          </div>
        </div>
        
        {activeTab === 'stats' ? (
          <div className="space-y-3 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

              <div className="tech-panel clip-tech-slot tech-border-container p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-header font-black uppercase tracking-wider sm:tracking-widest mb-2 sm:mb-3 text-cyan-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full"></span>
                  <span className="text-sm sm:text-base">Base Attributes</span>
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full"></span>
                </h3>

                <div className="space-y-2 sm:space-y-3">
                  {[
                    { name: 'STR', value: user.str_stat || 10, label: 'Strength', desc: '+2 Physical Attack (ATK) per point', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' },
                    { name: 'SPD', value: user.spd_stat || 10, label: 'Speed', desc: '+0.5% Crit Chance per point (Combat Stat)', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
                    { name: 'CON', value: user.end_stat || 10, label: 'Constitution', desc: '+5 Max HP per point', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
                    { name: 'INT', value: user.int_stat || 10, label: 'Intelligence', desc: '+10 Max MP & Increases Magic Attack (MATK)', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
                    { name: 'VIT', value: user.wil_stat || 10, label: 'Vitality', desc: '+1 HP & faster HP/MP regen (Healer focus)', color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-500/30' },
                    { name: 'LCK', value: user.lck_stat || 10, label: 'Luck', desc: 'Increases Drop Rate & Gold', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
                    { name: 'PER', value: user.per_stat || 10, label: 'Perception', desc: '+0.2% Crit Chance & +0.5% Crit Damage per point (Ranger)', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' }
                  ].map((stat) => (
                    <div key={stat.name} className={`p-2 sm:p-3 clip-tech-slot ${stat.bg} ${stat.border} flex items-center justify-between transition-all hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 clip-tech-button ${stat.color.replace('text-', 'bg-')} flex items-center justify-center text-[10px] sm:text-xs font-black text-white shadow-lg`}>
                          {stat.name}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-ui font-bold text-white uppercase tracking-wide truncate">{stat.label}</div>
                          <div className="text-[9px] sm:text-xs text-gray-400 font-ui hidden sm:block">{stat.desc}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <span className={`text-sm sm:text-lg font-header font-black ${stat.color}`}>{stat.value}</span>
                        {user.unassigned_stat_points && user.unassigned_stat_points > 0 && (
                          <button
                            onClick={async () => {
                              if (!user.unassigned_stat_points || user.unassigned_stat_points <= 0) return;

                              const statKey = stat.name === 'STR' ? 'str_stat' :
                                             stat.name === 'SPD' ? 'spd_stat' :
                                             stat.name === 'CON' ? 'end_stat' :
                                             stat.name === 'INT' ? 'int_stat' :
                                             stat.name === 'LCK' ? 'lck_stat' :
                                             stat.name === 'PER' ? 'per_stat' :
                                             stat.name === 'VIT' ? 'wil_stat' : '';

                              if (!statKey) return;

                              const currentValue = user[statKey as keyof User] as number || 10;
                              
                              // Optimistic Update
                              const updatedUser = {
                                ...user,
                                [statKey]: currentValue + 1,
                                unassigned_stat_points: (user.unassigned_stat_points || 0) - 1
                              };

                              const newDerivedStats = calculateDerivedStats(updatedUser);
                              updatedUser.max_hp = newDerivedStats.maxHP;
                              updatedUser.max_mp = newDerivedStats.maxMP;

                              // Update UI immediately
                              setUser(updatedUser);

                              try {
                                const response = await fetch('/api/user', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    id: user.id,
                                    [statKey]: currentValue + 1,
                                    unassigned_stat_points: (user.unassigned_stat_points || 0) - 1,
                                    max_hp: newDerivedStats.maxHP,
                                    max_mp: newDerivedStats.maxMP
                                  }),
                                });

                                if (!response.ok) {
                                  throw new Error('Failed to save stats');
                                }

                                const data = await response.json();
                                if (data.user) {
                                  // Sync with server response to be sure
                                  setUser({ ...user, ...data.user });
                                  showNotification('Stat Increased!', 'success');
                                }
                              } catch (error) {
                                console.error('Failed to update stat:', error);
                                // Revert on failure
                                setUser(user);
                                showNotification('Failed to save stat change', 'error');
                              }
                            }}
                            className="w-6 h-6 sm:w-7 sm:h-7 clip-tech-button bg-green-600 hover:bg-green-500 text-white font-black text-xs sm:text-sm shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.7)] hover:scale-110 touch-manipulation"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {user.unassigned_stat_points && user.unassigned_stat_points > 0 && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-900/30 border border-yellow-500/50 clip-tech-button text-center">
                    <div className="text-yellow-400 font-header font-black text-sm sm:text-base uppercase tracking-wider sm:tracking-widest">
                      <span className="hidden sm:inline">⚡</span> {user.unassigned_stat_points} Unassigned Points <span className="hidden sm:inline">⚡</span>
                    </div>
                    <div className="text-yellow-300/70 text-xs sm:text-sm font-ui mt-1">
                      Tap + to allocate stats
                    </div>
                  </div>
                )}
              </div>

              <div className="tech-panel clip-tech-slot tech-border-container p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-header font-black uppercase tracking-wider sm:tracking-widest mb-2 sm:mb-3 text-cyan-400 flex items-center gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 overflow-hidden rounded-md flex items-center justify-center">
                    <img src="/stats.png" alt="Stats" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-sm sm:text-base">Derived Stats</span>
                </h3>

                <div className="space-y-2 sm:space-y-3">

                  <div className="p-2.5 sm:p-3 bg-gray-900/50 border border-red-500/30 clip-tech-slot">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="text-red-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-600 rounded-sm shadow-[0_0_8px_#dc2626]"></span>
                        <span className="text-xs sm:text-sm">Health</span>
                      </span>
                      <span className="text-white font-ui font-bold text-xs sm:text-sm">{user.current_hp || 0} / {user.max_hp || derivedStats.maxHP}</span>
                    </div>
                    <div className="h-2 sm:h-2.5 w-full bg-gray-800 clip-tech-button overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
                      <div
                        className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-1000 shadow-[0_0_8px_#dc2626] relative"
                        style={{ width: `${((user.current_hp || 0) / (user.max_hp || derivedStats.maxHP)) * 100}%` }}
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-0.5 sm:w-1 bg-white/30 blur-[1px]" />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-slate-900/60 backdrop-blur-md border border-blue-500/30 clip-tech-slot">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="text-blue-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-sm shadow-[0_0_5px_#2563eb]"></span>
                        <span className="text-xs sm:text-sm">Mana</span>
                      </span>
                      <span className="text-white font-ui font-bold text-xs sm:text-sm">{user.current_mp || 0} / {user.max_mp || derivedStats.maxMP}</span>
                    </div>
                    <div className="h-2 sm:h-2.5 w-full bg-gray-800 clip-tech-button overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]">
                      <div
                        className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 transition-all duration-1000 shadow-[0_0_8px_#2563eb] relative"
                        style={{ width: `${((user.current_mp || 0) / (user.max_mp || derivedStats.maxMP)) * 100}%` }}
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-0.5 sm:w-1 bg-white/30 blur-[1px]" />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-gray-900/50 border border-orange-500/30 clip-tech-slot flex justify-between items-center">
                    <span className="text-orange-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-600 rounded-sm"></span>
                      <span className="text-xs sm:text-sm">ATK / MATK</span>
                    </span>
                    <span className="text-white font-header font-black text-lg sm:text-xl text-orange-400">{Math.floor(derivedStats.attackDamage)} / {Math.floor(derivedStats.magicPower)}</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-slate-900/60 backdrop-blur-md border border-yellow-500/30 clip-tech-slot flex justify-between items-center">
                    <span className="text-yellow-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-600 rounded-sm"></span>
                      <span className="text-xs sm:text-sm">Crit Chance</span>
                    </span>
                    <span className="text-white font-header font-black text-lg sm:text-xl text-yellow-400">{derivedStats.critPercent.toFixed(1)}%</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-slate-900/60 backdrop-blur-md border border-red-500/30 clip-tech-slot flex justify-between items-center">
                    <span className="text-red-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-600 rounded-sm"></span>
                      <span className="text-xs sm:text-sm">Crit Damage</span>
                    </span>
                    <span className="text-white font-header font-black text-lg sm:text-xl text-red-400">{(derivedStats.critDamageMultiplier * 100).toFixed(1)}%</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-gray-900/50 border border-green-500/30 clip-tech-slot flex justify-between items-center">
                    <span className="text-green-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-600 rounded-sm"></span>
                      <span className="text-xs sm:text-sm">HP Regen</span>
                    </span>
                    <span className="text-white font-header font-black text-lg sm:text-xl text-green-400">{derivedStats.hpRegenRate?.toFixed(1) || '1.0'}/min</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-slate-900/60 backdrop-blur-md border border-blue-500/30 clip-tech-slot flex justify-between items-center">
                    <span className="text-blue-400 font-header font-black text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-sm"></span>
                      <span className="text-xs sm:text-sm">MP Regen</span>
                    </span>
                    <span className="text-white font-header font-black text-lg sm:text-xl text-blue-400">{derivedStats.mpRegenRate?.toFixed(1) || '0.5'}/min</span>
                  </div>

                </div>
              </div>

            </div>

            <div className="tech-panel clip-tech-card p-3 sm:p-4 text-center border-t border-cyan-500/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="p-2 sm:p-3 bg-cyan-900/20 border border-cyan-500/30 clip-tech-button">
                  <div className="text-cyan-400 font-header font-black uppercase tracking-widest text-[9px] sm:text-xs mb-0.5 sm:mb-1">Level</div>
                  <div className="text-white font-header font-black text-sm sm:text-lg">{user.level}</div>
                </div>
                <div className="p-2 sm:p-3 bg-green-900/20 border border-green-500/30 clip-tech-button">
                  <div className="text-green-400 font-header font-black uppercase tracking-widest text-[9px] sm:text-xs mb-0.5 sm:mb-1">Class</div>
                  <div className="text-white font-ui font-bold text-[10px] sm:text-xs uppercase truncate">{user.current_class}</div>
                </div>
                <div className="p-2 sm:p-3 bg-purple-900/20 border border-purple-500/30 clip-tech-button">
                  <div className="text-purple-400 font-header font-black uppercase tracking-widest text-[9px] sm:text-xs mb-0.5 sm:mb-1">Rank</div>
                  <div className="text-white font-header font-black text-sm sm:text-lg">{user.rank_tier}</div>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-900/20 border border-yellow-500/30 clip-tech-button">
                  <div className="text-yellow-400 font-header font-black uppercase tracking-widest text-[9px] sm:text-xs mb-0.5 sm:mb-1">Title</div>
                  <div className="text-white font-ui font-bold text-[9px] sm:text-xs uppercase truncate">{user.current_title}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SkillTreeTab user={user} setUser={setUser} showNotification={showNotification} />
        )}
      </div>
    </div>
  );
}
