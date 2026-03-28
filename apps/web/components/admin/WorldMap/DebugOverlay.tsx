import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Zap, Droplets } from 'lucide-react';
import { GODOT_MASK_TO_ATLAS_CELL } from './mapUtils';

interface DebugOverlayProps {
  winluSheetUrl: string | null;
  waterSheetUrl: string | null;
  onClose: () => void;
  initialType?: 'standard' | 'water';
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ 
  winluSheetUrl, 
  waterSheetUrl, 
  onClose,
  initialType = 'standard'
}) => {
  const [type, setType] = useState<'standard' | 'water'>(initialType);
  const [blockCol, setBlockCol] = useState(0);
  const [blockRow, setBlockRow] = useState(0);

  const TILE_SIZE = 48;
  const BLOCK_WIDTH = 576; // 12 * 48
  const BLOCK_HEIGHT = 192; // 4 * 48
  const GAP = 48;

  // Standard (Winlu) uses gaps both ways
  // Water uses ONLY vertical gaps
  const strideX = type === 'standard' ? BLOCK_WIDTH + GAP : BLOCK_WIDTH;
  const strideY = BLOCK_HEIGHT + GAP;

  const currentSheetUrl = type === 'standard' 
    ? (winluSheetUrl || '/A2 - Terrain and Misc.jpg')
    : (waterSheetUrl || '/A1 - Tileset.jpg');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {type === 'standard' ? (
                  <>Standard Autotile Debugger</>
                ) : (
                  <><span className="text-cyan-400">Water</span> Autotile Debugger</>
                )}
              </h2>
              <p className="text-sm text-slate-400">
                {type === 'standard' 
                  ? 'Winlu style with 48px horizontal & vertical gaps' 
                  : 'Liquid style with NO horizontal gaps'}
              </p>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => { setType('standard'); setBlockCol(0); setBlockRow(0); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${type === 'standard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Zap size={14} />
                STANDARD
              </button>
              <button
                onClick={() => { setType('water'); setBlockCol(0); setBlockRow(0); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${type === 'water' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Droplets size={14} />
                WATER
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-auto flex-1 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Block Col:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setBlockCol(Math.max(0, blockCol - 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft size={16}/></button>
                <span className={`w-8 text-center font-bold ${type === 'standard' ? 'text-blue-400' : 'text-cyan-400'}`}>{blockCol}</span>
                <button onClick={() => setBlockCol(Math.min(3, blockCol + 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Block Row:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setBlockRow(Math.max(0, blockRow - 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft size={16}/></button>
                <span className={`w-8 text-center font-bold ${type === 'standard' ? 'text-blue-400' : 'text-cyan-400'}`}>{blockRow}</span>
                <button onClick={() => setBlockRow(Math.min(7, blockRow + 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="ml-4 text-xs text-slate-500">
              Showing {type === 'standard' ? 'Standard' : 'Water'} Block {blockCol},{blockRow}
            </div>
          </div>

          <div 
            className={`relative border-4 shadow-2xl overflow-hidden bg-slate-950 ${type === 'standard' ? 'border-blue-600' : 'border-cyan-600'}`}
            style={{
              width: `${BLOCK_WIDTH}px`,
              height: `${BLOCK_HEIGHT}px`, 
              backgroundImage: `url('${currentSheetUrl}')`,
              backgroundPosition: `-${blockCol * strideX}px -${blockRow * strideY}px`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'auto',
              imageRendering: 'pixelated'
            }}
          >
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-[repeat(12,48px)] grid-rows-[repeat(4,48px)]">
              {Array.from({ length: 12 * 4 }).map((_, i) => (
                <div key={i} className={`border-[0.5px] ${type === 'standard' ? 'border-white/10' : 'border-cyan-400/20'}`} />
              ))}
            </div>

            {/* Blob Index Overlay — bitmask → atlas cell from Godot winlu.tres */}
            {Object.entries(GODOT_MASK_TO_ATLAS_CELL).map(([maskStr, [col, row]]) => {
              const mask = parseInt(maskStr, 10);
              return (
                <div
                  key={maskStr}
                  className="absolute flex items-center justify-center pointer-events-none"
                  style={{
                    left: `${col * TILE_SIZE}px`,
                    top: `${row * TILE_SIZE}px`,
                    width: `${TILE_SIZE}px`,
                    height: `${TILE_SIZE}px`,
                    backgroundColor: type === 'standard' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(6, 182, 212, 0.3)',
                    border: `1px solid ${type === 'standard' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(6, 182, 212, 0.6)'}`,
                  }}
                >
                  <div className={`${type === 'standard' ? 'bg-blue-600/90' : 'bg-cyan-600/90'} text-white text-[12px] font-bold px-1.5 py-0.5 rounded flex flex-col items-center justify-center`}>
                    <span>{mask}</span>
                    <span className="text-[8px] font-normal opacity-80">
                      {col},{row}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className={`mt-4 p-4 rounded border max-w-2xl ${type === 'standard' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-cyan-900/20 border-cyan-800/50'}`}>
             <h3 className={`text-sm font-bold mb-2 uppercase tracking-wider ${type === 'standard' ? 'text-blue-300' : 'text-cyan-300'}`}>
                {type === 'standard' ? 'Standard (Winlu) Layout' : 'Water (Liquid) Layout'}
             </h3>
             <p className="text-xs text-slate-400">
                {type === 'standard' 
                  ? 'Standard sheets use a 48px gap between biomes both horizontally and vertically. Each biome is 12x4 tiles.'
                  : 'Water sheets use NO horizontal gap between blocks. Only a 48px vertical gap separates rows.'}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
