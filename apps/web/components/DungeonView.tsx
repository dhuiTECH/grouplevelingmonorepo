'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Clock, Skull } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import LayeredAvatar from './LayeredAvatar';

interface DungeonViewProps {
  user: User;
  dungeons: any[];
  activeTab: string;
  onNavigate: (tab: string) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  level: number;
  rank: string;
  onAvatarClick: (user: User) => void;
  selectedDungeon: any;
  setSelectedDungeon: React.Dispatch<React.SetStateAction<any>>;
}

export default function DungeonView({
  user,
  dungeons,
  activeTab,
  onNavigate,
  showNotification,
  setUser,
  level,
  rank,
  onAvatarClick,
  selectedDungeon,
  setSelectedDungeon
}: DungeonViewProps) {
  const [dungeonSignUps, setDungeonSignUps] = useState<{[dungeonId: string]: any[]}>({});

  useEffect(() => {
    if (dungeons.length > 0) {
      fetch('/api/dungeon-signups')
        .then(res => res.json())
        .then(data => {
          if (data.signUps) {
            setDungeonSignUps(data.signUps);
          }
        })
        .catch(err => console.error('Failed to fetch dungeon signups:', err));
    }
  }, [dungeons]);

  const handleSignUpForDungeon = async (dungeon: any) => {
    try {
      const hunterId = (typeof window !== 'undefined'
        ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
        : null) || user.id;
      
      if (!hunterId) {
        console.log('Please log in to register for dungeons');
        return;
      }

      const response = await fetch('/api/dungeon-signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dungeonId: dungeon.id,
          hunterId: hunterId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDungeonSignUps(prev => ({
          ...prev,
          [dungeon.id]: data.signUps || []
        }));
        console.log('Successfully registered for dungeon!');
        showNotification(`You have joined the "${dungeon.name}" party!`, 'success');
      } else {
        console.error('Failed to register for dungeon:', data.error || 'Unknown error');
        showNotification(`Failed to join party: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Failed to sign up for dungeon:', error);
    }

    setSelectedDungeon(dungeon);
    onNavigate('dungeon-signup');
  };

  const handleDropOutOfDungeon = async (dungeon: any) => {
    try {
      const hunterId = (typeof window !== 'undefined'
        ? localStorage.getItem('current_hunter_id') || localStorage.getItem('hunter_id')
        : null) || user.id;
      
      if (!hunterId) {
        showNotification('Please log in to drop out of dungeons', 'error');
        return;
      }

      const response = await fetch('/api/dungeon-signups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dungeonId: dungeon.id,
          hunterId: hunterId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDungeonSignUps(prev => ({
          ...prev,
          [dungeon.id]: data.signUps || []
        }));
        showNotification('YOU HAVE LEFT THE PARTY', 'success');
      } else {
        showNotification(data.error || 'Failed to drop out', 'error');
      }
    } catch (error) {
      console.error('Failed to drop out of dungeon:', error);
      showNotification('Failed to drop out', 'error');
    }
  };

  const handleCompleteDungeon = async (dungeon: any) => {
    if (user.completedDungeons?.includes(dungeon.id)) return;

    console.log(`Dungeon completion requires admin approval. Your participation in "${dungeon.name}" has been submitted for review.`);

    setUser(prev => ({
      ...prev,
      completedDungeons: [...(prev.completedDungeons || []), dungeon.id],
    }));
  };

  if (activeTab === 'dungeon-signup' && selectedDungeon) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="system-glass p-6 clip-tech-card border-2 border-cyan-500/20 shadow-2xl">
          {selectedDungeon.image_url && (
            <div className="relative mb-3 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 animate-pulse"></div>
              <div className="absolute inset-0 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20"></div>
              <Image
                src={selectedDungeon.image_url}
                alt="Gate Energy Portal"
                width={500}
                height={200}
                className="w-full h-32 object-cover brightness-125 contrast-110 saturate-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          )}

          <h1 className="text-center text-xl font-black italic tracking-tight text-white mb-3" style={{ textShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}>
            {selectedDungeon.name?.toUpperCase() || 'DUNGEON RAID'}
          </h1>
          <div className="h-px w-full bg-blue-900 mb-3" />

          <div className="space-y-6">
            <div className="text-center">
              <span className={`text-sm font-black px-2 py-1 clip-tech-button border uppercase mb-3 inline-block ${selectedDungeon.difficulty?.includes('A') ? 'text-orange-400 border-orange-400' : 'text-cyan-400 border-cyan-400'}`}>
                {selectedDungeon.difficulty}
              </span>
              <h3 className="text-base font-black uppercase italic tracking-tight text-blue-400">{selectedDungeon.name}</h3>
              {selectedDungeon.scheduled_start && (
                <div className="text-sm text-cyan-400 font-semibold mt-2">
                  {new Date(selectedDungeon.scheduled_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'America/Los_Angeles'
                  })} {new Date(selectedDungeon.scheduled_start).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'America/Los_Angeles'
                  })} PST
                </div>
              )}
              <div className="flex justify-center gap-4 mt-4 opacity-80">
                <span className="text-sm flex items-center gap-2"><img src="/expcrystal.png" alt="XP" className="w-6 h-6"/> {selectedDungeon.xp_reward} XP</span>
                <span className="text-sm flex items-center gap-2 text-yellow-500"><img src="/coinicon.png" alt="Coins" className="w-7 h-7"/> {selectedDungeon.coin_reward}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md p-4 clip-tech-card border border-white/10">
              <h4 className="text-sm font-black uppercase text-blue-400 mb-3">Party Members ({dungeonSignUps[selectedDungeon.id]?.length || 1})</h4>

              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 border-2 border-green-500/50 rounded-full overflow-hidden">
                  <LayeredAvatar user={user} size={48} onAvatarClick={() => onAvatarClick(user)} />
                </div>
                <div>
                  <div className="text-base font-black text-white">{user.name || 'Adventurer'} <span className="text-green-400 text-sm">(You)</span></div>
                  <div className="text-xs text-blue-400">Level {level} • Rank {rank}</div>
                </div>
              </div>

              {dungeonSignUps[selectedDungeon.id] && dungeonSignUps[selectedDungeon.id].filter((member: any) => member.id !== user.id).length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-2">Other Party Members:</div>
                  <div className="space-y-2">
                    {dungeonSignUps[selectedDungeon.id]
                      .filter((member: any) => member.id !== user.id)
                      .map((member: any) => {
                        const memberUser: User = {
                          id: member.id,
                          name: member.name || 'Unknown',
                          avatar_url: member.avatar_url,
                          exp: 0,
                          coins: 0,
                          gems: 0,
                          skill_points: 0,
                          level: member.level || 1,
                          rank: member.rank || 'E',
                          slotsUsed: 0,
                          inventory: [],
                          cosmetics: member.cosmetics || [],
                          equipped: {},
                          submittedIds: [],
                          completedDungeons: [],
                          stravaConnected: false
                        };

                        return (
                          <div key={member.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 border border-cyan-500/50 rounded-full overflow-hidden">
                              <LayeredAvatar user={memberUser} size={32} onAvatarClick={() => onAvatarClick(memberUser)} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{member.name}</div>
                              <div className="text-xs text-gray-400">Joined party</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-300">
                You have successfully signed up for this dungeon party! Other hunters will join soon.
                Check back later for party updates and when the dungeon becomes available.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-6 py-3 relative px-4 font-black uppercase tracking-widest text-white bg-blue-600 border-b-4 border-blue-900 shadow-lg shadow-blue-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] text-sm"
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={() => {
                    onNavigate('dashboard');
                    setSelectedDungeon(null);
                  }}
                  className="px-6 py-3 relative px-4 font-black uppercase tracking-widest text-white bg-gray-600 border-b-4 border-gray-900 shadow-lg shadow-gray-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] text-sm"
                >
                  Browse More Dungeons
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab !== 'dashboard') return null;

  return (
    <section>
      <h2 className="system-glass text-[10px] font-header font-black uppercase tracking-[0.3em] mb-3 text-red-500 flex items-center gap-2">
        <img src="/special instances.png" alt="Special Instances" className="w-6 h-6" /> Special Instances
      </h2>
      <div className="space-y-4">
        {dungeons.length === 0 ? (
          <div className="p-5 tech-panel clip-tech-card text-center">
            <Skull className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No dungeons available</p>
          </div>
        ) : (
          dungeons.map(dungeon => {
            const isDone = user.completedDungeons?.includes(dungeon.id) || false;
            const isSignedUp = dungeonSignUps[dungeon.id]?.some((signup: any) => signup.id === user.id) || false;
            const startTime = dungeon.scheduled_start ? new Date(dungeon.scheduled_start) : null;
            const timeDisplay = startTime ? `${startTime.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'America/Los_Angeles'
            })} ${startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Los_Angeles'
            })} PST` : 'TBD';

            return (
              <div key={dungeon.id} className={`transition-all relative overflow-hidden rounded-2xl p-6 mb-4 ${isDone ? 'bg-green-950/20 border border-green-500/30' : 'aura-card-gradient aura-glow-border'}`}>
                {dungeon.image_url && (
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={dungeon.image_url}
                      alt={`${dungeon.name} background`}
                      fill
                      className="object-cover opacity-40 brightness-110 contrast-125"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20 z-10"></div>
                  </div>
                )}

                <div className="flex justify-between items-start relative z-20">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 clip-tech-button border uppercase ${dungeon.difficulty?.includes('A') ? 'text-orange-400 border-orange-400' : 'text-cyan-400 border-cyan-400'}`}>
                        {dungeon.difficulty}
                      </span>
                      <span className="text-[7px] text-gray-500 uppercase font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {timeDisplay}
                      </span>
                    </div>
                    <h3 className="text-sm font-black mt-1 uppercase italic tracking-tight">{dungeon.name}</h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex gap-3 opacity-60">
                        <span className="text-[9px] flex items-center gap-1"><img src="/expcrystal.png" alt="XP" className="w-5 h-5"/> {dungeon.xp_reward} XP</span>
                        <span className="text-[9px] flex items-center gap-1 text-yellow-500"><img src="/coinicon.png" alt="Coins" className="w-5 h-5"/> {dungeon.coin_reward}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {dungeon.requirement && (
                          <div className="text-[8px] text-red-400 uppercase font-bold flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                            Req: {dungeon.requirement}
                          </div>
                        )}
                        {dungeon.boss && (
                          <div className="text-[8px] text-orange-400 uppercase font-bold flex items-center gap-1">
                            <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
                            Boss: {dungeon.boss}
                          </div>
                        )}
                      </div>
                    </div>

                    {dungeonSignUps[dungeon.id] && dungeonSignUps[dungeon.id].length > 0 && (
                      <div className="mt-2 relative z-30">
                        <div className="text-[7px] text-cyan-400 uppercase font-bold mb-1">Party ({dungeonSignUps[dungeon.id].length})</div>
                        <div className="flex -space-x-1 flex-wrap gap-1 relative">
                          {dungeonSignUps[dungeon.id].slice(0, 10).map((member: any, index: number) => {
                            const memberUser: User = {
                              id: member.id,
                              name: member.name || 'Unknown',
                              avatar_url: member.avatar_url,
                              exp: 0,
                              coins: 0,
                              gems: 0,
                              skill_points: 0,
                              level: member.level || 1,
                              rank: member.rank || 'E',
                              slotsUsed: 0,
                              inventory: [],
                              cosmetics: member.cosmetics || [],
                              equipped: {},
                              submittedIds: [],
                              completedDungeons: [],
                              stravaConnected: false
                            };

                            return (
                              <div
                                key={member.id}
                                className="relative z-10 cursor-pointer"
                                onClick={() => onAvatarClick(memberUser)}
                              >
                                <div className="w-5 h-5 border border-cyan-500/50 rounded-full overflow-hidden">
                                  <LayeredAvatar 
                                    user={memberUser} 
                                    size={20} 
                                    onAvatarClick={() => {}}
                                  />
                                </div>
                                {index === 9 && dungeonSignUps[dungeon.id].length > 10 && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-600 flex items-center justify-center text-[6px] font-black z-20">
                                    +{dungeonSignUps[dungeon.id].length - 10}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {dungeonSignUps[dungeon.id].length > 0 && (
                            <button
                              onClick={() => {
                                onNavigate('dungeon-signup');
                                setSelectedDungeon(dungeon);
                              }}
                              className="text-[7px] text-cyan-400 hover:text-cyan-300 underline font-bold uppercase ml-1"
                            >
                              View All
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {isSignedUp && dungeon.status !== 'active' ? (
                    <button
                      onClick={() => handleDropOutOfDungeon(dungeon)}
                      className="px-4 py-2 clip-tech-button text-[9px] font-black uppercase transition-all shimmer-effect bg-red-600 hover:bg-red-500 text-white"
                    >
                      DROP OUT
                    </button>
                  ) : (
                    <button
                      onClick={() => dungeon.status === 'forming' || dungeon.status === 'open' || dungeon.status === 'upcoming' ? handleSignUpForDungeon(dungeon) : handleCompleteDungeon(dungeon)}
                      disabled={isDone}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all shimmer-effect clip-tech-button ${isDone ? 'text-green-400 bg-green-500/20 border-green-500/30' : dungeon.status === 'forming' || dungeon.status === 'open' ? 'text-white bg-blue-600 hover:bg-blue-500' : dungeon.status === 'active' ? 'text-black bg-yellow-600 hover:bg-yellow-500 neon-border' : 'text-white bg-purple-600 hover:bg-purple-500'}`}
                    >
                      {isDone ? 'COMPLETED' : isSignedUp ? 'IN PARTY' : dungeon.status === 'forming' ? 'JOIN PARTY' : dungeon.status === 'active' ? 'REQUEST APPROVAL' : dungeon.status === 'open' ? 'PARTY SIGN-UP' : 'PARTY SIGN-UP'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
