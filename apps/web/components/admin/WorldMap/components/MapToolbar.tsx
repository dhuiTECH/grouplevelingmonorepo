import React from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { WinluPalette } from '../WinluPalette';
import { CoordinateDisplay } from './CoordinateDisplay';
import {
  Plus,
  Minus,
  Maximize,
  Grid,
  Zap,
  MousePointer2,
  Eraser,
  Wand2,
  Copy,
  Square,
  Pipette,
  XCircle,
  Paintbrush,
  Bug,
  RotateCw,
  FlipHorizontal,
  Lock,
  Unlock,
  Box,
  ShieldOff,
  Eye,
  EyeOff,
  Move,
} from 'lucide-react';

interface MapToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  isSpacePressed: boolean;
}

export const MapToolbar = React.memo(
  ({ onZoomIn, onZoomOut, onZoomFit, isSpacePressed }: MapToolbarProps) => {
    // Atomic selectors scoped to toolbar concerns
    const selectedTool = useMapStore(state => state.selectedTool);
    const setTool = useMapStore(state => state.setTool);
    const brushMode = useMapStore(state => state.brushMode);
    const setBrushMode = useMapStore(state => state.setBrushMode);
    const brushSize = useMapStore(state => state.brushSize);
    const setBrushSize = useMapStore(state => state.setBrushSize);
    const snapMode = useMapStore(state => state.snapMode);
    const setSnapMode = useMapStore(state => state.setSnapMode);
    const selectedSmartType = useMapStore(state => state.selectedSmartType);
    const setSelectedSmartType = useMapStore(state => state.setSelectedSmartType);
    const smartBrushLayer = useMapStore(state => state.smartBrushLayer);
    const setSmartBrushLayer = useMapStore(state => state.setSmartBrushLayer);
    const smartBrushLock = useMapStore(state => state.smartBrushLock);
    const setSmartBrushLock = useMapStore(state => state.setSmartBrushLock);
    const isRaiseMode = useMapStore(state => state.isRaiseMode);
    const setRaiseMode = useMapStore(state => state.setRaiseMode);
    const showWalkabilityOverlay = useMapStore(state => state.showWalkabilityOverlay);
    const setShowWalkabilityOverlay = useMapStore(state => state.setShowWalkabilityOverlay);
    const showDebugNumbers = useMapStore(state => state.showDebugNumbers);
    const setShowDebugNumbers = useMapStore(state => state.setShowDebugNumbers);
    const setShowDebugModal = useMapStore(state => state.setShowDebugModal);
    const currentStamp = useMapStore(state => state.currentStamp);
    const setCurrentStamp = useMapStore(state => state.setCurrentStamp);
    const selection = useMapStore(state => state.selection);
    const setSelection = useMapStore(state => state.setSelection);
    const collisionMode = useMapStore(state => state.collisionMode);
    const setCollisionMode = useMapStore(state => state.setCollisionMode);
    const edgeDirection = useMapStore(state => state.edgeDirection);
    const setEdgeDirection = useMapStore(state => state.setEdgeDirection);
    return (
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex gap-1.5 items-center pointer-events-auto max-w-[calc(100%-40px)] flex-wrap">
          {/* Zoom Controls */}
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 flex gap-0.5 shadow-2xl">
            <button
              onClick={onZoomIn}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onZoomOut}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={onZoomFit}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"
              title="Fit entire map in view (F or 0)"
            >
              <Maximize size={16} />
            </button>
          </div>

          {/* Primary Tools + Brush + Snap + Palette + Smart Brush + Overlays + Secondary Tools */}
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 flex gap-0.5 shadow-2xl items-center">
            {/* Primary Tools */}
            <button
              onClick={() => setTool('select')}
              className={`p-1.5 rounded-lg transition-all ${
                selectedTool === 'select'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Select Tool (V)"
            >
              <MousePointer2 size={18} />
            </button>
            <button
              onClick={() => setTool('paint')}
              className={`p-1.5 rounded-lg transition-all ${
                selectedTool === 'paint'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Paint Tool (B)"
            >
              <Paintbrush size={18} />
            </button>

            {(selectedTool === 'paint' ||
              selectedTool === 'erase' ||
              selectedTool === 'collision') && (
              <div className="flex items-center gap-1.5 px-1.5 border-l border-slate-700/50">
                <button
                  onClick={() => setBrushMode(!brushMode)}
                  className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${
                    brushMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                  }`}
                  title="Toggle Brush Mode (Shift)"
                >
                  <Square size={10} />
                  BRUSH
                </button>
                {brushMode && (
                  <div className="flex gap-0.5">
                    {[1, 3, 5, 10].map(size => (
                      <button
                        key={size}
                        onClick={() => setBrushSize(size)}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all ${
                          brushSize === size
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {size === 10 ? '10' : size}
                      </button>
                    ))}
                  </div>
                )}
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex gap-0.5" title="Snap Mode">
                  <button
                    onClick={() => setSnapMode('full')}
                    className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${
                      snapMode === 'full'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <Grid size={10} />
                    SNAP
                  </button>
                  <button
                    onClick={() => setSnapMode('half')}
                    className={`px-1.5 py-1 rounded text-[9px] font-black transition-all ${
                      snapMode === 'half'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    ½
                  </button>
                  <button
                    onClick={() => setSnapMode('free')}
                    className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${
                      snapMode === 'free'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <Move size={10} />
                    FREE
                  </button>
                </div>
              </div>
            )}

            <div className="h-6 w-px bg-slate-700 mx-0.5" />

            <WinluPalette compact />

            <div className="h-6 w-px bg-slate-700 mx-0.5" />

            {/* Smart Brush & Overlays */}
            <div className="flex gap-0.5 px-0.5">
              <button
                onClick={() =>
                  setSelectedSmartType(
                    selectedSmartType === 'off' ? 'grass' : 'off',
                  )
                }
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  selectedSmartType !== 'off'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Toggle Smart Brush (Z)"
              >
                <Zap
                  size={16}
                  className={selectedSmartType !== 'off' ? 'fill-white' : ''}
                />
              </button>
              {selectedSmartType !== 'off' && (
                <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-0.5 border border-slate-700/50">
                  <button
                    onClick={() => setSmartBrushLayer(smartBrushLayer - 1)}
                    className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Lower Layer"
                  >
                    <Minus size={10} />
                  </button>
                  <span
                    className="text-[10px] font-bold w-6 text-center text-cyan-400"
                    title={`Current Layer: ${smartBrushLayer}`}
                  >
                    L{smartBrushLayer}
                  </span>
                  <button
                    onClick={() => setSmartBrushLayer(smartBrushLayer + 1)}
                    className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Raise Layer"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              )}
              <button
                onClick={() => setSmartBrushLock(!smartBrushLock)}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  smartBrushLock
                    ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Lock Smart Tiles"
              >
                {smartBrushLock ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
              <button
                onClick={() => setRaiseMode(!isRaiseMode)}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  isRaiseMode
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Toggle Raise Mode (R)"
              >
                <Box size={16} />
              </button>
              <button
                onClick={() =>
                  setShowWalkabilityOverlay(!showWalkabilityOverlay)
                }
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showWalkabilityOverlay
                    ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Show Walkability Overlay"
              >
                {showWalkabilityOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                onClick={() => setShowDebugNumbers(!showDebugNumbers)}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  showDebugNumbers
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Debug Numbers"
              >
                <span className="text-[10px] font-black">#</span>
              </button>
              <button
                onClick={() => setShowDebugModal(true)}
                className="p-1.5 rounded-lg transition-all text-slate-400 hover:bg-slate-800"
                title="Open Debugger (D)"
              >
                <Bug size={16} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-0.5" />

            {/* Secondary Tools */}
            <div className="flex gap-0.5 px-0.5">
              <button
                onClick={() => setTool('erase')}
                className={`p-1.5 rounded-lg transition-all ${
                  selectedTool === 'erase'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Eraser Tool (E)"
              >
                <Eraser size={18} />
              </button>
              <button
                onClick={() => setTool('eyedropper')}
                className={`p-1.5 rounded-lg transition-all ${
                  selectedTool === 'eyedropper'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Eyedropper Tool (Alt + Click)"
              >
                <Pipette size={18} />
              </button>
              <button
                onClick={() => setTool('stamp')}
                className={`p-1.5 rounded-lg transition-all ${
                  selectedTool === 'stamp'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Stamp Tool (S)"
              >
                <Copy size={18} />
              </button>
              {(currentStamp || selection) && (
                <button
                  onClick={() => {
                    setCurrentStamp(null);
                    setSelection(null);
                    if (selectedTool === 'stamp') setTool('select');
                  }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-all border border-red-900/30"
                  title="Clear Selection/Stamp (Esc)"
                >
                  <XCircle size={18} />
                </button>
              )}
              <button
                onClick={() => setTool('rotate')}
                className={`p-1.5 rounded-lg transition-all ${
                  selectedTool === 'rotate'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Rotate Tool (R)"
              >
                <RotateCw size={18} />
              </button>
              <button
                onClick={() => setTool('flip')}
                className={`p-1.5 rounded-lg transition-all ${
                  selectedTool === 'flip'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Flip horizontal — click a tile (H)"
              >
                <FlipHorizontal size={18} />
              </button>
              <button
                onClick={() => {
                  setTool('collision');
                  setShowWalkabilityOverlay(true);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  selectedTool === 'collision'
                    ? 'bg-red-700 text-white shadow-lg shadow-red-900/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Collision Brush — paint non-walkable zones"
              >
                <ShieldOff size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Edge Collision Mode & Status Bar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {selectedTool === 'collision' && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1 pointer-events-auto shadow-2xl">
              <button
                onClick={() => setCollisionMode('full')}
                className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${
                  collisionMode === 'full'
                    ? 'bg-red-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                ■ Full
              </button>
              {[
                { label: '▲', dir: 1 },
                { label: '▶', dir: 2 },
                { label: '▼', dir: 4 },
                { label: '◀', dir: 8 },
              ].map(({ label, dir }) => (
                <button
                  key={dir}
                  onClick={() => {
                    setCollisionMode('edge');
                    setEdgeDirection(dir);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                    collisionMode === 'edge' && edgeDirection === dir
                      ? 'bg-orange-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div
            className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase flex items-center gap-3 transition-all ${
              isSpacePressed
                ? 'bg-green-900/30 border-green-500 text-green-400'
                : 'bg-slate-900/90 border-slate-800 text-slate-500 shadow-2xl'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isSpacePressed ? 'bg-green-500 animate-pulse' : 'bg-slate-700'
                }`}
              />
              {isSpacePressed ? 'Pan' : 'Space: Pan'}
            </div>

            {selectedSmartType !== 'off' && (
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3 text-purple-400">
                <Wand2 size={10} className="animate-pulse" />
                <span>{selectedSmartType.toUpperCase()}</span>
                <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded border border-slate-600">
                  L{smartBrushLayer}
                </span>
                {isRaiseMode && (
                  <span className="bg-purple-900/50 px-1 rounded text-[7px] border border-purple-500/50">
                    RAISE
                  </span>
                )}
              </div>
            )}

            {selectedTool === 'collision' && (
              <div
                className={`flex items-center gap-1.5 border-l border-slate-700 pl-3 ${
                  collisionMode === 'edge' ? 'text-orange-400' : 'text-red-400'
                }`}
              >
                <ShieldOff size={10} className="animate-pulse" />
                <span>
                  {collisionMode === 'full'
                    ? 'Full Block'
                    : 'Edge'}
                </span>
              </div>
            )}

            <CoordinateDisplay />
          </div>
        </div>
      </div>
    );
  },
);

MapToolbar.displayName = 'MapToolbar';

