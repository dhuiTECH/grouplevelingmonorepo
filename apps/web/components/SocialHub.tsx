'use client';

import React, { useState } from 'react';
import { Trophy, RefreshCw, Loader2, X } from 'lucide-react';
import LayeredAvatar from '@/components/LayeredAvatar';
import { User, RANK_COLORS } from '@/lib/types';

interface SocialHubProps {
  user: User;
  leaderboard: any[];
  friends: any[];
  friendRequests: any[];
  outgoingRequests: any[];
  pendingCount: number;
  applicantCount: number;
  showcaseHunters: any[];
  availableAssociations: any[];
  pendingApplicants: any[];
  appliedAssociationIds: Set<string>;
  daysUntilReset: number;
  userHasVoted: boolean;
  suggestions?: any[];
  searchResults: any[];
  isSocialLoading: boolean;
  loadLeaderboard: () => void;
  handleFriendSearch: (query: string) => void;
  handleAddFriend: (userId: string) => void;
  handleAcceptFriendRequest: (requestId: string) => void;
  handleRejectFriendRequest: (requestId: string) => void;
  handleCancelOutgoingRequest: (friendshipId: string) => void;
  loadShowcaseHunters: () => void;
  handleShowcaseVote: (targetId: string, voteType: 'resonate' | 'interfere') => void;
  handleApplyToAssociation: (associationId: string) => void;
  loadPendingApplicants: () => void;
  handleApplicantDecision: (applicantId: string, action: 'accept' | 'reject') => void;
  handleCreateAssociation: () => void;
  associationName: string;
  setAssociationName: (name: string) => void;
  selectedEmblem: string;
  setSelectedEmblem: (emblem: string) => void;
  isCreatingAssociation: boolean;
  emblemOptions: string[];
  showNotification: (message: string, type: 'success' | 'error') => void;
  setSelectedAvatar: (user: User | null) => void;
}

export default function SocialHub({
  user,
  leaderboard,
  friends,
  friendRequests,
  outgoingRequests,
  pendingCount,
  applicantCount,
  showcaseHunters,
  availableAssociations,
  pendingApplicants,
  appliedAssociationIds,
  daysUntilReset,
  userHasVoted,
  suggestions = [],
  searchResults,
  isSocialLoading,
  loadLeaderboard,
  handleFriendSearch,
  handleAddFriend,
  handleAcceptFriendRequest,
  handleRejectFriendRequest,
  handleCancelOutgoingRequest,
  loadShowcaseHunters,
  handleShowcaseVote,
  handleApplyToAssociation,
  loadPendingApplicants,
  handleApplicantDecision,
  handleCreateAssociation,
  associationName,
  setAssociationName,
  selectedEmblem,
  setSelectedEmblem,
  isCreatingAssociation,
  emblemOptions,
  showNotification,
  setSelectedAvatar
}: SocialHubProps) {
  const [socialSubTab, setSocialSubTab] = useState('rankings');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFoundingForm, setShowFoundingForm] = useState(false);

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {user?.is_private && (
        <div className="system-glass p-4 mb-4 border border-red-500/50">
          <div className="flex items-center gap-3">
            <div className="text-red-400 text-xl">⚠️</div>
            <div>
              <div className="text-sm font-bold text-red-400">SYSTEM ALERT: INCOGNITO MODE ACTIVE</div>
              <div className="text-xs text-red-300">You are hidden from rankings and cannot be found by other hunters.</div>
            </div>
          </div>
        </div>
      )}

      {/* Social Hub Sub-Navigation */}
      <div className="flex gap-1 mb-4">
        {[
          { id: 'rankings', label: 'RANKINGS' },
          { id: 'friends', label: 'FRIENDS' },
          { id: 'association', label: 'HUNTER ASSOCIA.' },
          { id: 'showcase', label: 'SHOWCASE' },
          { id: 'arena', label: 'ARENA' }
        ].map(subTab => {
          const isFriendsTab = subTab.id === 'friends';
          const isAssociationTab = subTab.id === 'association';
          const displayLabel = isFriendsTab && pendingCount > 0
            ? `FRIENDS (${pendingCount})`
            : subTab.label;

          const handleSubTabClick = () => {
            setSocialSubTab(subTab.id);
          };

          return (
            <button
              key={subTab.id}
              onClick={handleSubTabClick}
              className={`px-3 py-2.5 text-[10px] font-header font-black uppercase transition-all clip-tech-button flex-1 relative border-b-2 border-black/20 ${
                socialSubTab === subTab.id
                  ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/60 text-gray-400 hover:bg-slate-800/80 border-white/5 hover:text-cyan-400/60'
              }`}
            >
              {displayLabel}
              {isFriendsTab && pendingCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-pulse">
                  {pendingCount}
                </div>
              )}
              {isAssociationTab && applicantCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-pulse">
                  {applicantCount}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rankings Panel */}
      {socialSubTab === 'rankings' && (
        <div className="animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-header font-black uppercase tracking-widest text-cyan-400">Elite Hunter Rankings</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadLeaderboard}
                className="p-2 rounded-lg bg-yellow-900/30 hover:bg-yellow-800/50 transition-all clip-tech-button"
                title="Refresh Rankings"
              >
                <RefreshCw size={14} className="text-yellow-400" />
              </button>
            </div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="text-center text-cyan-400 py-8">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50 text-cyan-400" />
              <p className="text-sm font-ui font-bold">No rankings yet</p>
              <p className="text-xs font-ui font-medium opacity-70">Be the first to join the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((player, idx) => {
                const playerUser: User = {
                  id: player.id,
                  name: player.users?.name || 'Unknown',
                  avatar_url: player.users?.avatar_url,
                  exp: player.exp,
                  coins: 0, skill_points: 0,
                  gems: 0,
                  level: player.level,
                  rank: player.rank,
                  slotsUsed: 0,
                  inventory: [],
                  cosmetics: player.users?.cosmetics || [],
                  referral_code: player.users?.referral_code,
                  active_skin: player.users?.active_skin,
                  equipped: {},
                  submittedIds: [],
                  completedDungeons: [],
                  stravaConnected: false
                };

                const getRankingClass = (index: number) => {
                  if (index === 0) return 'ranking-gold';
                  if (index === 1) return 'ranking-silver';
                  if (index === 2) return 'ranking-bronze';
                  return '';
                };

                return (
                  <div key={player.id} className={`tech-panel clip-tech-slot p-4 flex items-center justify-between ${getRankingClass(idx)}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-6 text-xs font-black italic rank-number ${
                        idx === 0 ? 'text-yellow-400' :
                        idx === 1 ? 'text-cyan-400' :
                        idx === 2 ? 'text-blue-400' :
                        'text-gray-500'
                      }`}>0{idx + 1}</div>
                      <div className="w-16 h-16">
                        <LayeredAvatar 
                          user={playerUser} 
                          size={64} 
                          onAvatarClick={() => setSelectedAvatar(playerUser)} 
                        />
                      </div>
                      <div>
                        <div className="text-sm font-ui font-bold text-cyan-300">{player.users?.name || 'Unknown Hunter'}</div>
                        <div className="text-[8px] text-cyan-400 font-ui font-medium uppercase tracking-widest">{player.users?.current_title || 'Hunter'} • Lv. {player.level}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-ui font-bold text-cyan-400 uppercase tracking-widest">Combat Power</div>
                      <div className="text-xs font-header font-black text-blue-400">{player.combatPower || 0}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Friends Panel */}
      {socialSubTab === 'friends' && (
        <div className="animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[10px] font-header font-black uppercase tracking-widest text-cyan-400">Hunter Network</h2>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFriendSearch(e.target.value);
              }}
              placeholder="Find Hunters by Name..."
              className="w-full px-4 py-3 text-[10px] bg-slate-900/80 backdrop-blur-xl border border-white/10 clip-tech-button focus:border-cyan-500/50 focus:outline-none transition-all placeholder:text-gray-600 font-bold tracking-wider"
            />
          </div>

          {/* Suggested Hunters - Automatically visible */}
          {!searchQuery && suggestions.length > 0 && (
            <div className="mb-6 animate-in slide-in-from-top duration-500">
              <h4 className="text-[9px] font-black text-cyan-400 mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"></div>
                Detected High-Resonance Signals
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {suggestions.map((hunter) => (
                  <div key={hunter.id} className="aura-card-gradient p-3 clip-tech-card border border-cyan-500/20 flex flex-col items-center gap-2">
                    <LayeredAvatar user={hunter} size={50} onAvatarClick={() => setSelectedAvatar(hunter)} />
                    <div className="text-center">
                      <div className="text-[10px] font-black text-white">{hunter.name}</div>
                      <div className="text-[8px] text-cyan-400 font-bold">LV.{hunter.level} • {hunter.current_class || 'Hunter'}</div>
                    </div>
                    <button 
                      onClick={() => handleAddFriend(hunter.id)}
                      className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-[8px] font-black uppercase clip-tech-button transition-all border border-cyan-500/30"
                    >
                      INITIATE SYNC
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incoming Sync Signals */}
          {friendRequests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-yellow-400 mb-2 uppercase flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                [SYSTEM] INCOMING SYNC SIGNALS
              </h4>
              <div className="space-y-2">
                {friendRequests.map((request) => (
                  <div key={request.id} className="aura-card-gradient p-4 clip-tech-card border border-yellow-500/20 flex items-center justify-between shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-yellow-400/50 overflow-hidden bg-slate-900">
                        <img src={request.requester.avatar_url || '/huntericon.png'} alt={request.requester.name || 'Unknown'} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-sm font-header font-black text-white tracking-wide">{request.requester.name || 'Unknown'}</div>
                        <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Lv.{request.requester.level} • {request.requester.current_title || 'Hunter'}</div>
                        <div className="text-[8px] text-yellow-300/60 font-medium uppercase mt-0.5">Sync Requested {new Date(request.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptFriendRequest(request.id)}
                        className="px-4 py-2 clip-tech-button bg-green-600/80 hover:bg-green-600 text-white text-[10px] font-black uppercase transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] border-b-2 border-black/40 shimmer-effect"
                      >
                        ACCEPT SYNC
                      </button>
                      <button
                        onClick={() => handleRejectFriendRequest(request.id)}
                        className="px-4 py-2 clip-tech-button bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-black uppercase border border-red-500/30 transition-all border-b-2 border-black/40"
                      >
                        TERMINATE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Requests */}
          {outgoingRequests.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-blue-400 mb-2 uppercase flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Outgoing Sync Signals ({outgoingRequests.length})
              </h4>
              <div className="space-y-2">
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="aura-card-gradient p-4 clip-tech-card border border-cyan-500/20 flex items-center justify-between shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-cyan-400/50 overflow-hidden bg-slate-900">
                        <img src={request.recipient.avatar_url || '/huntericon.png'} alt={request.recipient.name || 'Unknown'} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-sm font-header font-black text-white tracking-wide">{request.recipient.name || 'Unknown'}</div>
                        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Lv.{request.recipient.level} • {request.recipient.current_title || 'Hunter'}</div>
                        <div className="text-[8px] text-cyan-300/60 font-medium uppercase mt-0.5">Signal Transmitted {new Date(request.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancelOutgoingRequest(request.id)}
                        className="px-4 py-2 clip-tech-button bg-slate-800/60 hover:bg-slate-700 text-gray-400 text-[10px] font-black uppercase border border-white/10 transition-all border-b-2 border-black/40"
                      >
                        CANCEL SYNC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-green-400 mb-2 uppercase">Search Results</h4>
              <div className="grid grid-cols-2 gap-2">
                {searchResults.map((hunter) => {
                  const hunterUser = {
                    id: hunter.id,
                    name: hunter.hunter_name || hunter.name || 'Unknown Hunter',
                    avatar_url: hunter.avatar || hunter.avatar_url,
                    exp: hunter.exp || 0,
                    coins: 0, skill_points: 0,
                    gems: 0,
                    level: hunter.level || 1,
                    rank: 'E',
                    slotsUsed: 0,
                    inventory: [],
                    cosmetics: [],
                    equipped: {},
                    submittedIds: [],
                    completedDungeons: [],
                    current_class: hunter.current_class,
                    base_body_url: hunter.avatar_url || '/NoobMan.png',
                    current_title: hunter.current_title,
                    referral_code: hunter.referral_code,
                    active_skin: hunter.active_skin
                  };

                  return (
                    <div key={hunter.id} className="aura-card-gradient p-3 clip-tech-card border border-white/10 flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-2">
                        <div className="drop-shadow-[0_0_8px_rgba(0,238,255,0.4)] cursor-pointer">
                          <LayeredAvatar user={hunterUser} size={24} onAvatarClick={() => setSelectedAvatar(hunterUser)} />
                        </div>
                        <div>
                          <div className="text-[10px] font-header font-black text-white tracking-tight">{hunter.hunter_name || hunter.name || 'Unknown Hunter'}</div>
                          <div className="text-[8px] text-green-400 font-bold uppercase">Lv.{hunter.level} • {hunter.current_title || 'Hunter'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(hunter.id)}
                        className="px-3 py-1.5 clip-tech-button bg-green-600/80 hover:bg-green-600 text-white text-[9px] font-black uppercase border-b-2 border-black/40 transition-all shimmer-effect"
                      >
                        ADD SYNC
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Friends Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {friends.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <div className="text-cyan-400 text-sm font-bold mb-2">No Friends Yet</div>
                <div className="text-xs text-gray-400">Use the search bar above to find hunters to connect with!</div>
              </div>
            ) : (
              friends.map((friend, idx) => {
                const friendName = friend.name || 'Unknown';
                const friendUserForCard = { ...friend, name: friendName };
                return (
                <div key={friend.id || idx} onClick={() => setSelectedAvatar(friendUserForCard)} className="aspect-square aura-card-gradient clip-tech-slot p-3 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition-all relative group shadow-lg hover:shadow-cyan-500/20 overflow-hidden">
                  <div className="w-14 h-14 mb-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)] relative group">
                  <LayeredAvatar 
                    user={friendUserForCard} 
                    size={56} 
                    onAvatarClick={() => setSelectedAvatar(friendUserForCard)} 
                  />
                  {/* Optional: Add the level badge for extra detail */}
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-green-500/50 rounded px-1 text-[7px] font-black text-green-400">
                    LV.{friend.level}
                  </div>
                </div>
                  <div className="text-[9px] font-header font-black uppercase text-center leading-tight mb-1 text-white tracking-tight">
                    {friendName.length > 8 ? friendName.substring(0, 8) + '..' : friendName}
                  </div>
                  <div className="text-[7px] text-green-400 font-black uppercase tracking-widest animate-pulse">
                    Online
                  </div>
                  <button className="absolute bottom-0 w-full py-1.5 clip-tech-button text-[8px] font-header font-black uppercase transition-all bg-cyan-600/80 hover:bg-cyan-500 text-white border-t border-cyan-400/30 shimmer-effect opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300">
                    SEND MANA
                  </button>
                </div>
              );
            })
            )}
          </div>
        </div>
      )}

      {/* Showcase Panel */}
      {socialSubTab === 'showcase' && (
        <div className="animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[10px] font-header font-black uppercase tracking-widest text-cyan-400">
              Style Monarch Showcase
            </h2>
            <div className="flex items-center gap-2">
              <div className="text-xs text-cyan-300">
                SYSTEM REBOOT: {daysUntilReset} days
              </div>
              <button
                onClick={loadShowcaseHunters}
                className="p-1 rounded bg-cyan-900/30 hover:bg-cyan-800/50 transition-all clip-tech-button"
                title="Refresh Showcase"
                disabled={isSocialLoading}
              >
                <RefreshCw size={12} className={`text-cyan-400 ${isSocialLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {isSocialLoading && showcaseHunters.length === 0 ? (
            <div className="text-center py-20">
              <Loader2 className="animate-spin mx-auto text-cyan-400 mb-2" size={32} />
              <p className="text-xs text-cyan-400 uppercase tracking-widest">Scanning Hunter Style Data...</p>
            </div>
          ) : !isSocialLoading && showcaseHunters.length === 0 ? (
            <div className="text-center py-20 system-glass border border-dashed border-gray-700">
              <p className="text-sm text-gray-500 uppercase">No Approved Hunters Found in Showcase</p>
            </div>
          ) : (
            <div className="space-y-3 relative pt-4">
              {/* Subtle background refresh indicator - absolutely positioned to prevent jumping */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 h-4 flex items-center justify-center pointer-events-none">
                {isSocialLoading && (
                  <div className="text-[8px] text-cyan-400 animate-pulse tracking-widest uppercase bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/30 backdrop-blur-sm">
                    Syncing Hunter Data...
                  </div>
                )}
              </div>
              {showcaseHunters.map((hunter, idx) => {
                const showcaseUser: User = {
                  id: hunter.id,
                  name: hunter.name || 'Unknown Hunter',
                  avatar_url: hunter.avatar_url,
                  exp: hunter.exp || 0,
                  coins: 0, skill_points: 0,
                  gems: 0,
                  level: hunter.level || 1,
                  rank: 'E',
                  slotsUsed: 0,
                  inventory: [],
                  cosmetics: hunter.cosmetics || [],
                  equipped: {},
                  submittedIds: [],
                  completedDungeons: [],
                  current_class: hunter.current_class,
                  base_body_url: hunter.avatar_url || '/NoobMan.png',
                  current_title: hunter.current_title,
                  gender: hunter.gender,
                  referral_code: hunter.referral_code,
                  active_skin: hunter.active_skin
                };

                const isMonarch = idx === 0;
                const isOwnCard = hunter.id === user.id;

                return (
                  <div
                    key={hunter.id}
                    className={`relative overflow-hidden clip-tech-card aura-card-gradient border p-5 transition-all duration-500 shadow-xl ${
                      isMonarch
                        ? 'border-yellow-400/60 shadow-[0_0_40px_rgba(234,179,8,0.3)]'
                        : 'border-white/10 hover:border-cyan-400/40'
                    }`}
                  >
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-pulse"></div>
                    </div>

                    {isMonarch && (
                      <div className="absolute top-0 left-0 z-30 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[6px] font-header font-black px-1.5 py-0.5 rounded-br border-r border-b border-yellow-300 uppercase leading-none tracking-tighter shadow-md">
                        👑 Style Monarch
                      </div>
                    )}

                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`text-2xl font-header font-black italic ${
                        idx === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-orange-500' :
                        'text-cyan-400/60'
                      }`}>
                        #{idx + 1}
                      </div>

                      <div className="flex-shrink-0">
                        <div className={`relative w-[110px] h-[110px] transition-all duration-700 ${isMonarch ? 'scale-[1.05]' : ''}`}>
                          {isMonarch && (
                            <>
                              {/* Intense core glow */}
                              <div className="absolute -inset-1 bg-white/40 rounded-xl blur-[2px] animate-pulse z-0"></div>
                              <div className="absolute -inset-2 bg-yellow-400/80 rounded-xl blur-md animate-pulse delay-75 z-0"></div>
                              <div className="absolute -inset-4 bg-yellow-500/40 rounded-full blur-xl animate-pulse delay-150 z-0"></div>
                            </>
                          )}
                          <div className={`relative w-full h-full bg-slate-950/80 rounded-xl overflow-hidden border-2 shadow-inner transition-all z-10 ${isMonarch ? 'border-yellow-400 shadow-[0_0_35px_rgba(255,215,0,0.8)]' : 'border-white/5'}`}>
                            <LayeredAvatar
                              user={showcaseUser}
                              size={110}
                              onAvatarClick={() => setSelectedAvatar(showcaseUser)}
                              className="cursor-pointer"
                            />
                            {isMonarch && (
                              <div className="absolute inset-0 bg-yellow-400/5 pointer-events-none"></div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3">
                          <div>
                            <div className="text-xl font-header font-black text-white mb-1 tracking-tight">{hunter.name || 'Unknown Hunter'}</div>
                            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em]">
                              {hunter.current_title || 'Hunter'} • Level {hunter.level}
                            </div>
                          </div>

                          {isOwnCard ? (
                            <div className="px-3 py-1 bg-gray-700 text-gray-400 text-xs font-bold uppercase rounded clip-tech-button">
                              YOUR CARD
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleShowcaseVote(hunter.id, 'resonate')}
                                disabled={userHasVoted}
                                className={`px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-bold uppercase rounded-lg border transition-all whitespace-nowrap ${
                                  hunter.userVote === 'resonate'
                                    ? 'bg-green-600 text-white border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                                    : userHasVoted
                                      ? 'bg-slate-800/40 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'
                                      : 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-500/30 hover:scale-105 shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                                }`}
                              >
                                YAY {hunter.resonance_count || 0}
                              </button>
                              <button
                                onClick={() => handleShowcaseVote(hunter.id, 'interfere')}
                                disabled={userHasVoted}
                                className={`px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm font-bold uppercase rounded-lg border transition-all whitespace-nowrap ${
                                  hunter.userVote === 'interfere'
                                    ? 'bg-red-600 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                                    : userHasVoted
                                      ? 'bg-slate-800/40 text-slate-500 border-slate-700 cursor-not-allowed opacity-50'
                                      : 'bg-red-600/20 hover:bg-red-600/40 text-red-400 border-red-500/30 hover:scale-105 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                                }`}
                              >
                                NAY {hunter.interference_count || 0}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full bg-gradient-to-r transition-all duration-1000 ${isMonarch ? 'from-yellow-600 to-yellow-400' : 'from-cyan-600 to-blue-600'}`}
                              style={{ width: `${Math.min(100, (hunter.showcase_score || 0) / 10)}%` }}
                            />
                          </div>
                          <div className="text-[9px] font-header font-black text-white/50 uppercase tracking-widest whitespace-nowrap">
                            Score: {hunter.showcase_score || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Arena Panel */}
      {socialSubTab === 'arena' && (
        <div className="animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[10px] font-header font-black uppercase tracking-widest text-cyan-400">
              Hunter Arena
            </h2>
          </div>

          <div className="relative">
            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-4xl">🏟️</div>
                <h3 className="text-xl font-black text-cyan-400 uppercase tracking-wide">Arena Coming Soon</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Epic battles and tournaments await! The arena will feature competitive PvP combat, ranked matches, and tournament events.
                </p>
                <div className="text-xs text-cyan-300/60 uppercase tracking-widest">
                  Stay Tuned for Updates
                </div>
              </div>
            </div>

            {/* Placeholder Content */}
            <div className="system-glass p-6 rounded-xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">⚔️</div>
                  <div className="text-sm font-bold text-cyan-400">PvP Battles</div>
                  <div className="text-xs text-gray-400">1v1 Combat</div>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-sm font-bold text-cyan-400">Tournaments</div>
                  <div className="text-xs text-gray-400">Competitive Events</div>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-bold text-cyan-400">Rankings</div>
                  <div className="text-xs text-gray-400">Climb the Ladder</div>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🎁</div>
                  <div className="text-sm font-bold text-cyan-400">Rewards</div>
                  <div className="text-xs text-gray-400">Exclusive Loot</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Association Panel */}
      {socialSubTab === 'association' && (
        <div className="animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[10px] font-header font-black uppercase tracking-widest text-cyan-400">
              Hunter Association
            </h2>
          </div>

          {user?.association_id ? (
            <>
              {/* Energy Well */}
              <div className="aura-card-gradient aura-glow-border p-6 mb-4 text-center rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-mesh opacity-10"></div>
                <h3 className="text-[10px] font-header font-black text-cyan-300 mb-6 uppercase tracking-[0.3em] relative z-10">
                  Energy Well Synchronization
                </h3>

                <div className="flex flex-col items-center relative z-10">
                  <div className="relative w-12 h-40 bg-slate-950 rounded-full border-2 border-cyan-500/30 overflow-hidden mb-4 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-cyan-300 transition-all duration-1000 shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                      style={{ height: '68%' }}
                    >
                      <div className="absolute inset-0 bg-grid-mesh opacity-20"></div>
                    </div>
                    <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-pulse"></div>
                  </div>

                  <div className="text-sm font-header font-black text-cyan-400 mb-1 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
                    8,450 / 12,500 EXP
                  </div>
                  <div className="text-[9px] text-cyan-300 font-bold uppercase tracking-widest opacity-60">
                    Association Goal Progress
                  </div>
                </div>
              </div>

              {/* System Buff Status */}
              <div className="aura-card-gradient p-5 mb-4 rounded-xl border border-white/10 shadow-lg">
                <div className="flex items-center justify-center">
                  <div className="px-5 py-2 clip-tech-button font-header font-black uppercase text-[10px] tracking-[0.2em] transition-all bg-green-600 text-black border-b-2 border-black/40 shadow-[0_0_20px_rgba(34,197,94,0.4)] shimmer-effect">
                    STATUS: SYNC ACTIVE
                  </div>
                </div>

                <div className="text-center mt-4">
                  <div className="text-xs font-header font-black text-green-400 uppercase tracking-widest mb-1">
                    +10% Vitality Buff
                  </div>
                  <div className="text-[9px] text-green-300/60 font-medium uppercase tracking-wider">
                    All Association members receive enhanced stamina regeneration
                  </div>
                </div>
              </div>

              {/* Recruitment Center */}
              {applicantCount > 0 && (
                <div className="aura-card-gradient p-5 mb-4 rounded-xl border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-header font-black text-red-400 uppercase tracking-[0.3em]">
                      Recruitment Command
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadPendingApplicants}
                        className="p-2 rounded bg-red-950/40 hover:bg-red-900/60 transition-all clip-tech-button border border-red-500/20"
                        title="Refresh Applicants"
                      >
                        <RefreshCw size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pendingApplicants.map((applicant) => {
                      const applicantUser = {
                        id: applicant.id,
                        name: applicant.name || 'Unknown',
                        avatar_url: applicant.avatar_url,
                        exp: applicant.exp || 0,
                        coins: 0, skill_points: 0,
                        gems: 0,
                        level: applicant.level || 1,
                        rank: 'E',
                        slotsUsed: 0,
                        inventory: [],
                        cosmetics: [],
                        equipped: {},
                        submittedIds: [],
                        completedDungeons: [],
                        current_class: applicant.current_class,
                        base_body_url: applicant.avatar_url || '/NoobMan.png',
                        current_title: applicant.current_title
                      };

                      return (
                        <div key={applicant.id} className="bg-slate-950/60 p-4 clip-tech-card border border-red-500/20 flex items-center justify-between shadow-lg">
                          <div className="flex items-center gap-3">
                            <div className="drop-shadow-[0_0_10px_rgba(0,238,255,0.4)] w-10 h-10 border border-white/5 rounded-full overflow-hidden bg-slate-900">
                              <LayeredAvatar user={applicantUser} size={40} />
                            </div>
                            <div>
                              <div className="text-sm font-header font-black text-white">{applicant.name || 'Unknown'}</div>
                              <div className="text-[9px] text-red-400 font-bold uppercase">Lv.{applicant.level} • {applicant.current_title || 'Hunter'}</div>
                              <div className="text-[8px] text-red-300/50 uppercase font-medium mt-0.5">Applied {new Date(applicant.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplicantDecision(applicant.id, 'accept')}
                              className="px-4 py-2 clip-tech-button bg-green-600/80 hover:bg-green-600 text-white text-[10px] font-black uppercase border-b-2 border-black/40 shimmer-effect"
                            >
                              ACCEPT
                            </button>
                            <button
                              onClick={() => handleApplicantDecision(applicant.id, 'reject')}
                              className="px-4 py-2 clip-tech-button bg-red-950/60 hover:bg-red-900 text-red-400 text-[10px] font-black uppercase border border-red-500/30 border-b-2 border-black/40"
                            >
                              REJECT
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Member Roster */}
              <div className="aura-card-gradient p-5 rounded-xl border border-white/10 shadow-lg">
                <h3 className="text-[10px] font-header font-black text-cyan-300 mb-4 uppercase tracking-[0.3em]">
                  Association Member Roster
                </h3>

                <div className="space-y-2">
                  {[
                    { name: 'VoidMaster', weekly_exp: 2450, rank: 'A', level: 67 },
                    { name: 'ShadowHunter', weekly_exp: 2230, rank: 'A', level: 64 },
                    { name: 'CyberNinja', weekly_exp: 1980, rank: 'B', level: 59 },
                    { name: 'RuneMaster', weekly_exp: 1750, rank: 'B', level: 55 },
                    { name: 'FrostMage', weekly_exp: 1620, rank: 'B', level: 52 },
                    { name: 'ManaStorm', weekly_exp: 1480, rank: 'C', level: 48 }
                  ].map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between tech-panel clip-tech-slot p-3 border border-white/5 bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-header font-black text-cyan-500/60 italic">#{idx + 1}</div>
                        <div>
                          <div className="text-sm font-header font-black text-white tracking-wide">{member.name}</div>
                          <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Rank {member.rank} • Lv. {member.level}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-header font-black text-green-400 tracking-tight">{member.weekly_exp} EXP</div>
                        <div className="text-[8px] text-green-300/60 font-black uppercase">Weekly Yield</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Browse Available Associations */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-cyan-400 mb-3 uppercase">Available Hunter Associations</h4>

                {availableAssociations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-sm mb-2">No associations available</div>
                    <div className="text-xs text-gray-500">Be the first to establish an association!</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableAssociations.map((association) => {
                      const hasApplied = appliedAssociationIds.has(association.id);

                      return (
                        <div key={association.id} className="aura-card-gradient p-5 clip-tech-card border border-white/10 shadow-lg flex flex-col">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 rounded-full border-2 border-cyan-400/50 overflow-hidden bg-slate-950 p-1">
                              <img
                                src={association.emblem_url || '/huntericon.png'}
                                alt={association.name}
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  e.currentTarget.src = '/huntericon.png';
                                }}
                              />
                            </div>
                            <div>
                              <div className="text-base font-header font-black text-white tracking-tight">{association.name}</div>
                              <div className="text-[10px] text-cyan-400 font-bold uppercase">
                                Led by {association.leader?.name || 'Unknown'}
                              </div>
                              <div className="text-[9px] text-green-400 font-black uppercase tracking-widest mt-0.5">
                                {association.member_count || 1} members • Lv. {association.level || 1}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleApplyToAssociation(association.id)}
                            disabled={hasApplied}
                            className={`w-full py-2.5 clip-tech-button text-[10px] font-header font-black uppercase transition-all border-b-2 border-black/40 shadow-lg ${
                              hasApplied
                                ? 'bg-slate-800 text-gray-500 cursor-not-allowed border-none'
                                : 'bg-blue-600/80 hover:bg-blue-600 text-white shadow-blue-500/20 shimmer-effect'
                            }`}
                          >
                            {hasApplied ? 'SIGNAL TRANSMITTED' : 'REQUEST SYNC'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Founding Option */}
              {showFoundingForm ? (
                <div className="system-glass p-5 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-header font-black text-yellow-400 uppercase tracking-wide">
                      Establish Hunter Association
                    </h4>
                    <button 
                      onClick={() => setShowFoundingForm(false)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-cyan-400 uppercase mb-1 tracking-widest">
                        Association Name
                      </label>
                      <input
                        type="text"
                        value={associationName}
                        onChange={(e) => setAssociationName(e.target.value)}
                        placeholder="Enter prestigious name..."
                        className="w-full px-4 py-3 text-xs bg-slate-950 border border-white/10 clip-tech-button focus:border-yellow-500/50 focus:outline-none transition-all placeholder:text-gray-700 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-cyan-400 uppercase mb-2 tracking-widest">
                        Select Emblem
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {emblemOptions.map((emblem) => (
                          <button
                            key={emblem}
                            onClick={() => setSelectedEmblem(emblem)}
                            className={`aspect-square rounded-lg border-2 transition-all p-1 bg-slate-900 flex items-center justify-center hover:scale-110 ${
                              selectedEmblem === emblem 
                                ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                                : 'border-white/5 grayscale hover:grayscale-0'
                            }`}
                          >
                            <img src={emblem} alt="Emblem" className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-[10px] text-yellow-200/80 leading-relaxed font-medium">
                      <span className="text-yellow-400 font-black">PRE-REQUISITE:</span> Establish a new Hunter Association requires a deposit of <span className="text-yellow-400 font-black italic">100,000 GOLD</span>. This rank title grants you administrative command and unique buffs for your members.
                    </div>

                    <button
                      onClick={handleCreateAssociation}
                      disabled={isCreatingAssociation || !associationName.trim() || !selectedEmblem || (user.coins || 0) < 100000}
                      className={`w-full py-4 clip-tech-button text-xs font-header font-black uppercase transition-all border-b-2 border-black/40 shadow-xl ${
                        isCreatingAssociation || !associationName.trim() || !selectedEmblem || (user.coins || 0) < 100000
                          ? 'bg-slate-800 text-gray-500 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-yellow-500/20 animate-pulse'
                      }`}
                    >
                      {isCreatingAssociation ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          ESTABLISHING...
                        </div>
                      ) : (user.coins || 0) < 100000 ? (
                        `INSUFFICIENT FUNDS (${(user.coins || 0).toLocaleString()} / 100,000)`
                      ) : (
                        'FOUND ASSOCIATION (100,000 GOLD)'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="system-glass p-4 text-center">
                  <h4 className="text-sm font-header font-black text-yellow-400 uppercase tracking-wide mb-2">
                    Establish Your Own Hunter Association
                  </h4>
                  <div className="text-xs text-yellow-200/80 mb-3">
                    Become a President and lead your own guild
                  </div>
                  <button
                    onClick={() => setShowFoundingForm(true)}
                    className="px-8 py-3 bg-yellow-600/80 hover:bg-yellow-600 text-black text-xs font-header font-black uppercase clip-tech-button transition-all border-b-2 border-black/40 shadow-[0_0_20px_rgba(234,179,8,0.3)] shimmer-effect"
                  >
                    FOUND ASSOCIATION
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
