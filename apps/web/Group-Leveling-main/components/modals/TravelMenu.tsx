'use client';

import React from 'react';
import { X, MapPin } from 'lucide-react';
import type { WorldMapNode } from '@/hooks/useExploration';
import type { User } from '@/lib/types';

interface TravelMenuProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  nodes: WorldMapNode[];
  onTravelSuccess: (newX: number, newY: number, cost: number) => void;
}

function manhattanCost(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

export default function TravelMenu({
  visible,
  onClose,
  user,
  nodes,
  onTravelSuccess,
}: TravelMenuProps) {
  if (!visible) return null;

  const wx = user?.world_x ?? 0;
  const wy = user?.world_y ?? 0;
  const stepsBanked = user?.steps_banked ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-cyan-800/50 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-800/50 bg-cyan-950/30">
          <h2 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <MapPin size={18} /> Travel
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-cyan-800/50 text-cyan-300 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-[10px] text-gray-400 mb-3">
            Steps banked: <span className="font-bold text-cyan-400">{stepsBanked}</span>
          </p>
          {nodes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No locations on this map.</p>
          ) : (
            nodes.map((node) => {
              const cost = manhattanCost(wx, wy, node.x, node.y);
              const canAfford = stepsBanked >= cost;
              const isCurrent = node.x === wx && node.y === wy;
              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'border-green-500/50 bg-green-950/20'
                      : 'border-gray-700 bg-slate-800/50 hover:border-cyan-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {node.icon_url ? (
                      <img
                        src={node.icon_url}
                        alt=""
                        className="w-10 h-10 object-contain rounded-lg bg-slate-900/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-cyan-900/30 flex items-center justify-center">
                        <MapPin size={20} className="text-cyan-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white text-sm">{node.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        ({node.x}, {node.y})
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold uppercase text-green-400">Here</span>
                    ) : (
                      <>
                        <span className="text-[10px] text-gray-400">{cost} steps</span>
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            onTravelSuccess(node.x, node.y, cost);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Travel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
