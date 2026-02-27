import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface WinluDebugOverlayProps {
  sheetUrl: string;
  onClose: () => void;
}

export const WinluDebugOverlay: React.FC<WinluDebugOverlayProps> = ({ sheetUrl, onClose }) => {
  const [blockCol, setBlockCol] = useState(0);
  const [blockRow, setBlockRow] = useState(0);

  const TILE_SIZE = 48;
  const BLOCK_WIDTH = 576; // 12 * 48
  const BLOCK_HEIGHT = 192; // 4 * 48
  const GAP = 48;
  const strideX = BLOCK_WIDTH + GAP; // 624
  const strideY = BLOCK_HEIGHT + GAP; // 240

  const BLOB_Y_OFFSET = 0; // Matching mapUtils.ts

  // Standard WinLu/RPG Maker A2 12x4 layout
  const fullBlob47Map = [
    // Rows 0-3, Cols 0-3: The 16 basic tiles
    { mask: 0, col: 0, row: 0 }, { mask: 4, col: 1, row: 0 }, { mask: 64, col: 2, row: 0 }, { mask: 68, col: 3, row: 0 },
    { mask: 1, col: 0, row: 1 }, { mask: 5, col: 1, row: 1 }, { mask: 65, col: 2, row: 1 }, { mask: 69, col: 3, row: 1 },
    { mask: 16, col: 0, row: 2 }, { mask: 20, col: 1, row: 2 }, { mask: 80, col: 2, row: 2 }, { mask: 84, col: 3, row: 2 },
    { mask: 17, col: 0, row: 3 }, { mask: 21, col: 1, row: 3 }, { mask: 81, col: 2, row: 3 }, { mask: 85, col: 3, row: 3 },

    // Rows 0-3, Cols 4-11: The 31 diagonal variations
    { mask: 3, col: 4, row: 0 }, { mask: 9, col: 4, row: 1 }, { mask: 33, col: 4, row: 2 }, { mask: 129, col: 4, row: 3 },
    { mask: 12, col: 5, row: 0 }, { mask: 36, col: 5, row: 1 }, { mask: 132, col: 5, row: 2 }, { mask: 48, col: 5, row: 3 },
    { mask: 144, col: 6, row: 0 }, { mask: 192, col: 6, row: 1 }, { mask: 7, col: 6, row: 2 }, { mask: 11, col: 6, row: 3 },
    { mask: 19, col: 7, row: 0 }, { mask: 35, col: 7, row: 1 }, { mask: 131, col: 7, row: 2 }, { mask: 25, col: 7, row: 3 },
    { mask: 41, col: 8, row: 0 }, { mask: 137, col: 8, row: 1 }, { mask: 67, col: 8, row: 2 }, { mask: 28, col: 8, row: 3 },
    { mask: 44, col: 9, row: 0 }, { mask: 148, col: 9, row: 1 }, { mask: 52, col: 9, row: 2 }, { mask: 176, col: 9, row: 3 },
    { mask: 196, col: 10, row: 0 }, { mask: 29, col: 10, row: 1 }, { mask: 45, col: 10, row: 2 }, { mask: 149, col: 10, row: 3 },
    { mask: 53, col: 11, row: 0 }, { mask: 177, col: 11, row: 1 }, { mask: 197, col: 11, row: 2 }, { mask: 61, col: 11, row: 3 }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              WinLu Autotile Debugger
            </h2>
            <p className="text-sm text-slate-400">Mapping bitmask numbers (0-47) to the 12x4 Biome block</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-auto flex-1 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Block Col:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setBlockCol(Math.max(0, blockCol - 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft size={16}/></button>
                <span className="w-8 text-center font-bold text-blue-400">{blockCol}</span>
                <button onClick={() => setBlockCol(Math.min(3, blockCol + 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Block Row:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setBlockRow(Math.max(0, blockRow - 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft size={16}/></button>
                <span className="w-8 text-center font-bold text-blue-400">{blockRow}</span>
                <button onClick={() => setBlockRow(Math.min(7, blockRow + 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="ml-4 text-xs text-slate-500">
              Showing Biome {blockCol},{blockRow} (576x192)
            </div>
          </div>

          <div 
            className="relative border-4 border-slate-600 shadow-2xl overflow-hidden bg-slate-950"
            style={{
              width: `${BLOCK_WIDTH}px`,
              height: `${BLOCK_HEIGHT}px`, 
              backgroundImage: `url('${sheetUrl}')`,
              backgroundPosition: `-${blockCol * strideX}px -${blockRow * strideY}px`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'auto',
              imageRendering: 'pixelated'
            }}
          >
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-[repeat(12,48px)] grid-rows-[repeat(4,48px)]">
              {Array.from({ length: 12 * 4 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-white/10" />
              ))}
            </div>

            {/* Blob Index Overlay */}
            {fullBlob47Map.map((entry, index) => (
              <div
                key={index}
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: `${entry.col * TILE_SIZE}px`,
                  top: `${BLOB_Y_OFFSET + entry.row * TILE_SIZE}px`,
                  width: `${TILE_SIZE}px`,
                  height: `${TILE_SIZE}px`,
                  backgroundColor: 'rgba(59, 130, 246, 0.3)',
                  border: '1px solid rgba(59, 130, 246, 0.6)',
                }}
              >
                <div className="bg-blue-600/90 text-white text-[9px] font-bold px-1 rounded flex flex-col items-center">
                  <span>idx: {index}</span>
                  <span className="text-[7px] opacity-80">mask: {entry.mask}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 bg-blue-900/20 p-4 rounded border border-blue-800/50 max-w-2xl">
             <h3 className="text-sm font-bold text-blue-300 mb-2 uppercase tracking-wider">Corrected Biome Mapping</h3>
             <p className="text-xs text-slate-400">
               Each biome is now strictly 12x4 tiles (576x192). The 48px gap between biomes is handled by the stride (624px horizontal, 240px vertical). All autotile indices are now contained within the 4-row limit.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
