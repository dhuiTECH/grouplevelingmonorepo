import React from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { Grid } from 'lucide-react';

export const WinluPalette = () => {
  const { setSelectedBlock, setTool, selectedBlockCol, selectedBlockRow, autoTileSheetUrl } = useMapStore();

  const SHEET_URL = autoTileSheetUrl || '/A2 - Terrain and Misc.jpg';

  // 4x8 grid as requested
  const COLS = 4;
  const ROWS = 8;

  const renderButtons = () => {
    const buttons = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // We use percentages to scale the background sprite sheet relative to the button size
        const bgPosX = c * (100 / (COLS - 1 || 1));
        const bgPosY = r * (100 / (ROWS - 1 || 1));

        const isSelected = selectedBlockCol === c && selectedBlockRow === r;

        buttons.push(
          <button
            key={`${c}-${r}`}
            onClick={() => {
              setSelectedBlock(c, r);
              setTool('paint');
            }}
            className={`
              relative overflow-hidden border rounded-sm transition-all
              ${isSelected ? 'border-green-500 ring-1 ring-green-500 shadow-md scale-105 z-10' : 'border-slate-700 hover:border-slate-500 hover:scale-105 opacity-80 hover:opacity-100'}
            `}
            style={{
              width: '100%',
              height: '32px', // Slightly larger for better visibility
              backgroundImage: `url('${SHEET_URL}')`,
              backgroundPosition: `${bgPosX}% ${bgPosY}%`,
              // The image consists of COLS columns and ROWS rows, so we scale it by COLS*100% and ROWS*100%
              // e.g. 4 columns -> 400% width, 8 rows -> 800% height
              backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
              imageRendering: 'pixelated'
            }}
            title={`Biome Block ${c},${r}`}
          />
        );
      }
    }
    return buttons;
  };

  if (!autoTileSheetUrl) {
    return (
      <div className="bg-slate-950/30 p-2 rounded border border-slate-800 mb-4 text-center">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1 mb-2">
          <Grid size={10} /> Winlu Biomes (A2)
        </label>
        <p className="text-[10px] text-slate-400">Please upload a Grass Sheet below to use Biomes.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/30 p-2 rounded border border-slate-800 mb-4">
       <div className="flex items-center justify-between mb-2">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Grid size={10} /> Winlu Biomes (A2)
          </label>
       </div>
       <div className="grid grid-cols-4 gap-1.5 bg-slate-900/50 p-1.5 rounded border border-slate-800/50">
         {renderButtons()}
       </div>
    </div>
  );
};
