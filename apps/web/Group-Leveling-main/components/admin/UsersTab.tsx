import React from 'react';
import { User, Trophy } from 'lucide-react';

interface UsersTabProps {
  approvedUsers: any[];
  onToggleAdmin: (id: string, isAdmin: boolean) => void;
}

export default function UsersTab({ approvedUsers, onToggleAdmin }: UsersTabProps) {
  return (
    <section>
      <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-red-400 flex items-center gap-2">
        <User size={22} /> Approved Hunters
      </h2>

      {approvedUsers.length === 0 ? (
        <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No approved users yet</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {approvedUsers.map((user) => (
            <div key={user.id} className="bg-gray-900/40 border border-red-900/30 p-3 md:p-4 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.hunter_name || user.name || 'User'}
                      className="w-12 h-12 rounded-full border-2 border-red-500/50"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const displayName = user.hunter_name || user.name || 'U';
                          parent.innerHTML = `<div class="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center text-red-400 font-black text-lg">${displayName[0].toUpperCase()}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-red-500/50 bg-red-900/30 flex items-center justify-center">
                      <span className="text-red-400 font-black text-lg">
                        {(user.hunter_name || user.name || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-black italic">{user.hunter_name || user.name}</div>
                    {user.email && (
                      <div className="text-xs text-gray-500">Email: {user.email}</div>
                    )}
                    <div className="text-xs text-red-400 flex items-center gap-1">
                      <Trophy size={14} />
                      Approved: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    user.is_admin
                      ? 'bg-yellow-600 text-yellow-100'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {user.is_admin ? 'ADMIN' : 'HUNTER'}
                  </span>
                  <button
                    onClick={() => onToggleAdmin(user.id, user.is_admin)}
                    className={`px-3 py-1 rounded text-xs font-bold w-full sm:w-auto ${
                      user.is_admin
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                    }`}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
