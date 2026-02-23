import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { PendingUser } from './types';

interface ApprovalsTabProps {
  pendingUsers: PendingUser[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ApprovalsTab({ pendingUsers, onApprove, onReject }: ApprovalsTabProps) {
  return (
    <section>
      <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-red-400 flex items-center gap-2">
        <Clock size={22} /> Pending Approvals
      </h2>

      {pendingUsers.length === 0 ? (
        <div className="bg-gray-900/40 border border-gray-800 p-8 rounded-2xl text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {pendingUsers.map((user) => (
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
                    <div className="text-xs text-gray-600">
                      Applied: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onApprove(user.id)}
                    className="px-3 py-2 md:px-4 md:py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} className="md:w-[18px] md:h-[18px]" /> Approve
                  </button>
                  <button
                    onClick={() => onReject(user.id)}
                    className="px-3 py-2 md:px-4 md:py-2 clip-tech-button bg-red-700 hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                  >
                    <XCircle size={16} className="md:w-[18px] md:h-[18px]" /> Reject
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
