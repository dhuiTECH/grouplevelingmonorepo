import React, { useState } from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { Grid, Bug, ChevronDown } from 'lucide-react';

export const WinluPalette = ({ compact = false }: { compact?: boolean }) => {
  const { setSelectedBlock, setTool, selectedBlockCol, selectedBlockRow, autoTileSheetUrl, dirtSheetUrl, waterSheetUrl, selectedSmartType, setSelectedSmartType, setShowDebugModal } = useMapStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const SHEETS = {
    grass: { url: autoTileSheetUrl, name: 'Grass' },
    dirt: { url: dirtSheetUrl, name: 'Dirt' },
    water: { url: waterSheetUrl, name: 'Water' },
  };

  const [selectedSheet, setSelectedSheet] = useState('grass');

  const currentSheetData = SHEETS[selectedSheet as keyof typeof SHEETS];
  const SHEET_URL = currentSheetData?.url || '';

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
              setSelectedSmartType(selectedSheet); // Enable smart mode with current sheet type
              setTool('paint');
              setShowDropdown(false);
            }}
            className={`
              relative overflow-hidden border rounded-sm transition-all aspect-square
              ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-500 shadow-md scale-105 z-10' : 'border-slate-700 hover:border-slate-500 hover:scale-105 opacity-80 hover:opacity-100'}
            `}
            style={{
              width: '100%',
              backgroundImage: SHEET_URL ? `url('${SHEET_URL}')` : 'none',
              backgroundPosition: `${bgPosX}% ${bgPosY}%`,
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

  if (compact) {
    return (
      <div className="relative">
        <div className="flex items-center gap-1.5 bg-slate-950/50 p-1 rounded-lg border border-slate-700/50">
           {/* Current Selection Preview */}
           <div 
             className="w-8 h-8 rounded border border-slate-700 relative overflow-hidden cursor-pointer hover:border-cyan-400 transition-colors"
             onClick={() => setShowDropdown(!showDropdown)}
             style={{
               backgroundImage: SHEET_URL ? `url('${SHEET_URL}')` : 'none',
               backgroundPosition: `${selectedBlockCol * (100 / (COLS - 1 || 1))}% ${selectedBlockRow * (100 / (ROWS - 1 || 1))}%`,
               backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
               imageRendering: 'pixelated'
             }}
           >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-0">
                <ChevronDown size={8} className="text-white" />
              </div>
           </div>
        </div>

        {/* Floating Dropdown Grid */}
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setShowDropdown(false)} />
            <div className="absolute top-full left-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-3 z-[101] animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Grid size={12} className="text-cyan-500" /> Choose Biome
                </label>
                <div className="text-[9px] text-slate-500 font-mono">4x8 GRID</div>
              </div>
              
              <div className="flex items-center gap-2 mb-3 px-1">
                {Object.keys(SHEETS)
                  .filter(sheetKey => SHEETS[sheetKey as keyof typeof SHEETS]?.url)
                  .map((sheetKey) => (
                  <button
                    key={sheetKey}
                    onClick={() => {
                      setSelectedSheet(sheetKey);
                      setSelectedSmartType(sheetKey); // Set smart type to match sheet (grass/dirt/water)
                    }}
                    className={`
                      text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded
                      ${selectedSheet === sheetKey ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                    `}
                  >
                    {SHEETS[sheetKey as keyof typeof SHEETS].name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 w-[220px]">
                {renderButtons()}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

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
