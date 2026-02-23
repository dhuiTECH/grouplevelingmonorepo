import React from 'react';
import { Trophy, CheckCircle, XCircle } from 'lucide-react';
import { PendingReward } from './types';

interface RewardsTabProps {
  pendingRewards: PendingReward[];
  onApprove: (id: string, hunterId: string, xp: number, coins: number) => void;
  onReject: (id: string) => void;
}

export default function RewardsTab({ pendingRewards, onApprove, onReject }: RewardsTabProps) {
  return (
    <section>
      <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-red-400 flex items-center gap-2">
        <img src="/coinicon.png" alt="Coins" className="w-8 h-8" /> Pending Reward Approvals
      </h2>

      {pendingRewards.length === 0 ? (
        <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl text-center">
          <Trophy className="w-12 h-12 text-cyan-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No pending reward approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRewards.map((reward) => {
            const profile = Array.isArray(reward.profiles) ? reward.profiles[0] : reward.profiles;
            const dungeon = Array.isArray(reward.dungeons) ? reward.dungeons[0] : reward.dungeons;
            
            // Handle potentially missing data gracefully
            if (!profile) return null;

            return (
              <div key={reward.id} className="bg-gray-900/40 border border-red-900/30 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.hunter_name || 'User'}
                        className="w-10 h-10 rounded-full border-2 border-red-500/50"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-10 h-10 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center text-red-400 font-black text-sm">${(profile.hunter_name || 'U')[0].toUpperCase()}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center">
                        <span className="text-red-400 font-black text-sm">
                          {(profile.hunter_name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-black italic text-white">{profile.hunter_name}</div>
                      <div className="text-xs text-gray-400">Registered: {dungeon?.name || 'Unknown Dungeon'}</div>
                      <div className="flex gap-4 mt-1 text-xs">
                        <span className="text-green-400">+{dungeon?.xp_reward || 0} XP</span>
                        <span className="text-yellow-400">+{dungeon?.coin_reward || 0} Coins</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(
                        reward.id,
                        reward.hunter_id,
                        dungeon?.xp_reward || 0,
                        dungeon?.coin_reward || 0
                      )}
                      className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      onClick={() => onReject(reward.id)}
                      className="px-3 py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
