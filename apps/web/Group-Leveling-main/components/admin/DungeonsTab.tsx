import React from 'react';
import { Sword, Plus, Users, Edit, Trash2 } from 'lucide-react';
import { Dungeon } from './types';
import AddDungeonForm from './AddDungeonForm';

interface DungeonsTabProps {
  dungeons: Dungeon[];
  showAddDungeon: boolean;
  setShowAddDungeon: (show: boolean) => void;
  editingDungeonId: string | null;
  setEditingDungeonId: (id: string | null) => void;
  onAddDungeon: (dungeon: any) => void;
  onUpdateDungeon: (id: string, dungeon: any) => void;
  onDeleteDungeon: (id: string) => void;
  
  // Registration handling
  selectedDungeonForRegistrations: string | null;
  setSelectedDungeonForRegistrations: (id: string | null) => void;
  loadDungeonRegistrations: (id: string) => void;
  dungeonRegistrations: {[dungeonId: string]: any[]};
  onUpdateRegistration: (regId: string, action: string, dungeonId: string) => void;
}

export default function DungeonsTab({
  dungeons,
  showAddDungeon,
  setShowAddDungeon,
  editingDungeonId,
  setEditingDungeonId,
  onAddDungeon,
  onUpdateDungeon,
  onDeleteDungeon,
  selectedDungeonForRegistrations,
  setSelectedDungeonForRegistrations,
  loadDungeonRegistrations,
  dungeonRegistrations,
  onUpdateRegistration
}: DungeonsTabProps) {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
          <Sword size={22} /> Dungeon Management
        </h2>
        <button
          onClick={() => {
            setShowAddDungeon(!showAddDungeon);
            setEditingDungeonId(null);
          }}
          className="px-4 py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
        >
          <Plus size={18} /> Add Dungeon
        </button>
      </div>

      {showAddDungeon && !editingDungeonId && (
        <div className="bg-gray-900/40 border border-purple-900/30 p-6 rounded-2xl mb-4 relative z-20">
          <AddDungeonForm onAdd={onAddDungeon} onCancel={() => setShowAddDungeon(false)} />
        </div>
      )}

      <div className="space-y-4">
        {dungeons.map((dungeon) => (
          <div key={dungeon.id}>
            {editingDungeonId === dungeon.id ? (
              <div className="bg-gray-900/40 border border-purple-900/30 p-6 rounded-2xl mb-4 relative z-20">
                <AddDungeonForm 
                  dungeon={dungeon}
                  onAdd={(dungeonData) => onUpdateDungeon(dungeon.id, dungeonData)}
                  onCancel={() => setEditingDungeonId(null)} 
                />
              </div>
            ) : (
              <div className="bg-gray-900/40 border border-red-900/30 p-3 md:p-4 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black italic text-white">{dungeon.name}</div>
                      {dungeon.auto_start && (
                        <span className="text-[8px] bg-cyan-600/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          AUTO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {dungeon.type} • {dungeon.tier && <span className="text-gray-300 font-bold mr-1">{dungeon.tier}</span>}
                      {dungeon.requirement}
                      {dungeon.target_distance_meters && dungeon.target_distance_meters > 0 && (
                        <span className="ml-1 text-gray-500">({(dungeon.target_distance_meters / 1000).toFixed(1)}km)</span>
                      )}
                    </div>
                    {dungeon.description && (
                      <div className="text-xs text-gray-500 italic mt-1 line-clamp-2">{dungeon.description}</div>
                    )}
                    <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs">
                      <span className="text-green-400">XP: {dungeon.xp_reward}</span>
                      <span className="text-yellow-400">Coins: {dungeon.coin_reward}</span>
                      <span className="text-blue-400">Difficulty: {dungeon.difficulty}</span>
                      <span className="text-purple-400">Status: {dungeon.status}</span>
                      <span className="text-orange-400 truncate">Boss: {dungeon.boss}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      {dungeon.scheduled_start && (
                        <div className="text-cyan-400 font-semibold">
                          Scheduled: {new Date(dungeon.scheduled_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'America/Los_Angeles'
                          })} {new Date(dungeon.scheduled_start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'America/Los_Angeles'
                          })} PST
                        </div>
                      )}
                      <div>Created: {new Date(dungeon.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:ml-4">
                    <button
                      onClick={() => {
                        setSelectedDungeonForRegistrations(
                          selectedDungeonForRegistrations === dungeon.id ? null : dungeon.id
                        );
                        if (selectedDungeonForRegistrations !== dungeon.id) {
                          loadDungeonRegistrations(dungeon.id);
                        }
                      }}
                      className="px-2 py-1 md:px-3 md:py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Users size={14} className="md:w-4 md:h-4" /> {selectedDungeonForRegistrations === dungeon.id ? 'Hide' : 'View'} Party
                    </button>
                    <button
                      onClick={() => {
                        setEditingDungeonId(dungeon.id);
                        setShowAddDungeon(false);
                      }}
                      className="px-2 py-1 md:px-3 md:py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Edit size={14} className="md:w-4 md:h-4" /> Edit
                    </button>
                    <button
                      onClick={() => onDeleteDungeon(dungeon.id)}
                      className="px-2 py-1 md:px-3 md:py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 size={14} className="md:w-4 md:h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show registrations for this dungeon */}
            {selectedDungeonForRegistrations === dungeon.id && (
              <div className="mt-4 bg-gray-800/40 border border-purple-900/20 p-4 rounded-xl">
                <div className="text-sm font-black text-purple-400 mb-3">Party Members ({dungeonRegistrations[dungeon.id]?.length || 0})</div>
                {dungeonRegistrations[dungeon.id] && dungeonRegistrations[dungeon.id].length > 0 ? (
                  <div className="space-y-2">
                    {dungeonRegistrations[dungeon.id].map((registration: any) => {
                      const profile = registration.profiles || {};
                      return (
                        <div key={registration.id} className="flex items-center justify-between bg-gray-900/40 p-3 rounded-lg border border-gray-700/50">
                          <div className="flex items-center gap-3">
                            {profile.avatar ? (
                              <img src={profile.avatar} alt={profile.hunter_name} className="w-10 h-10 rounded-full border border-purple-500/50" />
                            ) : (
                              <div className="w-10 h-10 rounded-full border border-purple-500/50 bg-gray-800 flex items-center justify-center">
                                👤
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-bold text-white">{profile.hunter_name || 'Unknown'}</div>
                              <div className="text-xs text-gray-400">
                                Level {profile.level || 1} • Rank {profile.hunter_rank || 'E'}
                                {profile.email && ` • ${profile.email}`}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Status: <span className={`font-bold ${
                                  registration.status === 'approved' ? 'text-green-400' :
                                  registration.status === 'banned' ? 'text-red-400' :
                                  registration.status === 'rejected' ? 'text-orange-400' :
                                  'text-yellow-400'
                                }`}>{registration.status.toUpperCase()}</span>
                                {' • '}Registered: {new Date(registration.registered_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {registration.status !== 'approved' && (
                              <button
                                onClick={() => onUpdateRegistration(registration.id, 'approve', dungeon.id)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold"
                              >
                                Approve
                              </button>
                            )}
                            {registration.status !== 'banned' && (
                              <button
                                onClick={() => onUpdateRegistration(registration.id, 'ban', dungeon.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                              >
                                Ban
                              </button>
                            )}
                            <button
                              onClick={() => onUpdateRegistration(registration.id, 'remove', dungeon.id)}
                              className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No registrations yet</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
