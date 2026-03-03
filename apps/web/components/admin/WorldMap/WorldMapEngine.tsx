'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMapStore, useTickStore } from '@/lib/store/mapStore';
import { PixiMapCanvas } from './PixiMapCanvas';
import { MapSidebar } from './MapSidebar';
import { MapDataSidebar } from './MapDataSidebar';
import {
  Plus, Minus, Maximize, Grid, Zap, Loader2, Target, Map as MapIcon,
  User, Sword, Box, Globe, Search, MousePointer2, Eraser, Wand2,
  GripVertical, Copy, Square, CheckSquare, Pipette, X, XCircle, Paintbrush, Bug,
  RotateCw, Lock, Unlock, Droplets, Move, ShieldOff, Eye, EyeOff
} from 'lucide-react';
import { WinluPalette } from './WinluPalette';
import { DebugOverlay } from './DebugOverlay';
import { normalizeUrl, snapPosition, getPixiTextureCoords, getLiquidTextureCoords } from './mapUtils';
import NodeEditModal from '../NodeEditModal';

// Hooks
import { useMapData } from './hooks/useMapData';
import { useMapGeneration } from './hooks/useMapGeneration';
import { useMapClipboard } from './hooks/useMapClipboard';
import { useMapInteraction } from './hooks/useMapInteraction';

// Components
import { CoordinateDisplay } from './components/CoordinateDisplay';
import { BrushPreview } from './components/BrushPreview';

const WORLD_SIZE = 100000; 
const TILE_SIZE = 48;

export const WorldMapEngine: React.FC<{ shopItems?: any[] }> = ({ shopItems = [] }) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  
  // Store
  const {
    addNode, updateNode, selectNode, selectedNodeId,
    addTileSimple, selectedTileId, customTiles, selectedTool,
    activeNodeType, removeTileAt, removeNode, batchAddTiles,
    loadTilesFromSupabase, isDraggingTile, draggingTileId,
    setDraggingTile, isDraggingNode, draggingNodeId, setDraggingNode,
    moveTile, removeTileById, rotateTile,
    isSmartMode, isRaiseMode, smartBrushLock, setSmartBrushLock, isFoamEnabled, autoTileSheetUrl, dirtSheetUrl, waterSheetUrl,
    selectedSmartType, setSelectedSmartType, setSelectedBlock, smartBrushLayer, setSmartBrushLayer, setRaiseMode, waterBaseTile, foamStripTile, setTool,
    sidebarWidth, setSidebarWidth, rightSidebarWidth, setRightSidebarWidth,
    favorites, setFavorite, selectTile,
    brushSize, setBrushSize, brushMode, setBrushMode,
    snapMode, setSnapMode,
    nodeSnapToGrid, setNodeSnapToGrid,
    isLoadingTiles, tiles, nodes, showDebugModal, setShowDebugModal, showDebugNumbers, setShowDebugNumbers, currentStamp, setCurrentStamp,
    dragGrabOffset, setDragGrabOffset, selection, setSelection,
    showWalkabilityOverlay, setShowWalkabilityOverlay
  } = useMapStore();

  // Local State
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [collisionMode, setCollisionMode] = useState<'full' | 'edge'>('full');
  const [edgeDirection, setEdgeDirection] = useState<number>(4); // default S=4
  
  // Viewport & Transform State
  const pixiTransformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [smoothCursorCoords, setSmoothCursorCoords] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Go To Coords State
  const [goToX, setGoToX] = useState('');
  const [goToY, setGoToY] = useState('');

  // Custom Hooks
  const { 
    handleUndo, 
    handleCopySelection, 
    handlePasteStamp 
  } = useMapClipboard();

  const { 
    handleAutoFill, 
    isGenerating, 
    seed, 
    setSeed 
  } = useMapGeneration();

  const {
    showNodeModal, setShowNodeModal,
    nodeFormData, setNodeFormData,
    encounters, maps, musicTracks, stockedItems, savingNode,
    uploadingIcon, uploadingSceneBg, uploadingNpcSprite, uploadingNodeMusic,
    uploadingDialogueImageLine, uploadingVoiceLineLine, iconGalleryUrls,
    nodeIconInputRef, sceneBgInputRef, npcSpriteInputRef, nodeMusicInputRef,
    dialogueExpressionInputRef, dialogueVoiceLineInputRef, currentUploadIdx,
    fetchSupportData, fetchIconGallery, loadStockedItems,
    handleEditNodeProperties, handleSaveNodeDetails, handleUploadAsset,
    handleUploadIcon, handleDeleteIcon, onAddStockItem, onRemoveStockItem,
    handleUploadNodeMusic, handleUploadDialogueExpression, handleUploadDialogueVoiceLine,
    loadTilesFromSupabase: loadTiles // Aliased to avoid conflict if needed
  } = useMapData();

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDrop,
    handleNodeMouseDown,
    handlePropMouseDown,
    isSelecting
  } = useMapInteraction(
    pixiTransformRef,
    transformComponentRef,
    dropTargetRef,
    isSpacePressed,
    setCursorCoords,
    setSmoothCursorCoords,
    setIsDrawing,
    isDrawing
  );

  // Resize Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, setSidebarWidth, setRightSidebarWidth]);

  // Zoom to Fit Logic
  const zoomToFit = useCallback((animate = true) => {
    if (!transformComponentRef.current) return;

    const allTiles = useMapStore.getState().tiles;
    const allNodes = useMapStore.getState().nodes;

    if (allTiles.length === 0 && allNodes.length === 0) {
      transformComponentRef.current.centerView(animate ? 400 : 0);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    allTiles.forEach(t => {
      if (typeof t.x === 'number' && typeof t.y === 'number' && !isNaN(t.x) && !isNaN(t.y)) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x);
        maxY = Math.max(maxY, t.y);
      }
    });

    allNodes.forEach(n => {
      if (typeof n.x === 'number' && typeof n.y === 'number' && !isNaN(n.x) && !isNaN(n.y)) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
    });

    if (minX === Infinity || minY === Infinity) {
      transformComponentRef.current.centerView(animate ? 400 : 0);
      return;
    }

    // Padding
    minX -= 5; minY -= 5; maxX += 5; maxY += 5;

    const contentWidth = (maxX - minX + 1) * TILE_SIZE;
    const contentHeight = (maxY - minY + 1) * TILE_SIZE;

    const containerW = dropTargetRef.current?.clientWidth || viewport.width;
    const containerH = dropTargetRef.current?.clientHeight || viewport.height;

    if (containerW <= 0 || containerH <= 0) return;

    const scaleX = containerW / contentWidth;
    const scaleY = containerH / contentHeight;
    const targetScale = Math.max(0.005, Math.min(scaleX, scaleY, 0.8));

    const centerX = ((minX + maxX + 1) / 2) * TILE_SIZE + WORLD_SIZE / 2;
    const centerY = ((minY + maxY + 1) / 2) * TILE_SIZE + WORLD_SIZE / 2;

    const targetPosX = containerW / 2 - centerX * targetScale;
    const targetPosY = containerH / 2 - centerY * targetScale;

    transformComponentRef.current.setTransform(targetPosX, targetPosY, targetScale, animate ? 400 : 0, 'easeOut');
  }, [tiles.length, nodes.length, viewport.width, viewport.height]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Deletion (Delete or Backspace)
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const state = useMapStore.getState();
          if (state.selectedNodeId) {
            const node = state.nodes.find(n => n.id === state.selectedNodeId);
            if (node) {
              setUndoStack(prev => [...prev, { action: 'erase_node', nodeData: node }]);
              removeNode(node.id);
            }
          } else if (state.selectedTileId) {
            const tile = state.tiles.find(t => t.id === state.selectedTileId);
            if (tile) {
              setUndoStack(prev => [...prev, {
                action: 'erase_tile',
                x: tile.x,
                y: tile.y,
                layer: tile.layer || 0,
                previousTile: tile
              }]);
              removeTileById(state.selectedTileId);
            }
          }
          return;
        }
      }

      // Escape to clear selection and stamp
      if (e.key === 'Escape') {
        setSelection(null);
        setCurrentStamp(null);
        if (selectedTool === 'stamp') setTool('select');
        return;
      }
      
      // Zoom to Fit (F or 0)
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (e.key.toLowerCase() === 'f' || e.key === '0') {
          zoomToFit();
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          setTool('select');
          return;
        }
        if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
          setTool('paint');
          return;
        }
        if (e.key.toLowerCase() === 'e') {
          setTool('erase');
          return;
        }
        if (e.key.toLowerCase() === 'o') {
          setTool('eyedropper');
          return;
        }
        if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
          setTool('stamp');
          return;
        }
        if (e.key.toLowerCase() === 'r') {
          setTool('rotate');
          return;
        }
        if (e.key.toLowerCase() === 'd') {
          setShowDebugModal(true);
          return;
        }
      }
      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopySelection();
        return;
      }
      // Paste (Ctrl+V) - using current cursor coords
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePasteStamp(cursorCoords.x, cursorCoords.y);
        return;
      }

      // Favorites Hotbar (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        const tileId = favorites[index];
        if (tileId) selectTile(tileId);
        return;
      }

      // Undo logic (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.code === 'Space') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setIsSpacePressed(true);
          e.preventDefault();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [zoomToFit, favorites, selectTile, cursorCoords.x, cursorCoords.y, setTool, handleUndo, handleCopySelection, handlePasteStamp, selectedTool, setSelection, setCurrentStamp, setShowDebugModal]);

  const hasInitialZoomed = useRef(false);

  useEffect(() => {
    if (!isLoadingTiles && !hasInitialZoomed.current && (tiles.length > 0 || nodes.length > 0)) {
      const timer = setTimeout(() => {
        zoomToFit(false);
        hasInitialZoomed.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingTiles, zoomToFit, tiles.length, nodes.length]);

  useEffect(() => {
    if (dropTargetRef.current) {
      dropTargetRef.current.style.setProperty('--zoom-scale', '1');
    }
    const init = async () => {
      await loadTilesFromSupabase();
      fetchSupportData();
      fetchIconGallery();
      
      const updateViewportSize = () => {
        if (dropTargetRef.current) {
          setViewport({
            width: dropTargetRef.current.clientWidth,
            height: dropTargetRef.current.clientHeight
          });
        }
      };

      updateViewportSize();
      window.addEventListener('resize', updateViewportSize);

      return () => window.removeEventListener('resize', updateViewportSize);
    };
    init();
  }, [loadTilesFromSupabase, sidebarWidth, rightSidebarWidth]);

  useEffect(() => {
    // Initialize zoom scale for CSS and seed the pixiTransformRef with the initial position
    if (dropTargetRef.current) {
      dropTargetRef.current.style.setProperty('--zoom-scale', '0.5');
    }
    const initX = -(WORLD_SIZE / 2 * 0.5) + (viewport.width / 2);
    const initY = -(WORLD_SIZE / 2 * 0.5) + (viewport.height / 2);
    pixiTransformRef.current = { x: initX, y: initY, scale: 0.5 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sync viewport-dependent initial transform when viewport size is first known
    if (viewport.width > 0 && viewport.height > 0) {
      const initX = -(WORLD_SIZE / 2 * 0.5) + (viewport.width / 2);
      const initY = -(WORLD_SIZE / 2 * 0.5) + (viewport.height / 2);
      // Only seed if TransformWrapper hasn't moved yet (ref still at 0,0)
      if (pixiTransformRef.current.x === 0 && pixiTransformRef.current.y === 0) {
        pixiTransformRef.current = { x: initX, y: initY, scale: 0.5 };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    if (selectedTool === 'collision') {
      setShowWalkabilityOverlay(true);
    }
  }, [selectedTool, setShowWalkabilityOverlay]);

  useEffect(() => {
    const incrementTick = useTickStore.getState().incrementTick;
    const interval = setInterval(() => {
      incrementTick();
    }, 100); // 10 ticks per second
    return () => clearInterval(interval);
  }, []);

  const goToNode = useCallback((nodeId: string) => {
    selectNode(nodeId);
  
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !transformComponentRef.current) {
      console.error(`[GoTo ERROR] Node ${nodeId} not found`);
      return;
    }
  
    const gridX = Number(node.x) || 0;
    const gridY = Number(node.y) || 0;
  
    const worldX = gridX * TILE_SIZE + WORLD_SIZE / 2 + TILE_SIZE / 2;
    const worldY = gridY * TILE_SIZE + WORLD_SIZE / 2 + TILE_SIZE / 2;
  
    const targetScale = 0.4;
  
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let viewportW = window.innerWidth - 440;
        let viewportH = window.innerHeight - 160;
  
        const container = dropTargetRef.current;
        if (container) {
          if (container.clientWidth > 500 && container.clientWidth < 3000) viewportW = container.clientWidth;
          if (container.clientHeight > 400 && container.clientHeight < 3000) viewportH = container.clientHeight;
        }
  
        const targetPosX = viewportW / 2 - worldX * targetScale;
        const targetPosY = viewportH / 2 - worldY * targetScale;
  
        transformComponentRef.current!.setTransform(
          targetPosX,
          targetPosY,
          targetScale,
          320,
          'easeOut'
        );
      });
    });
  }, [nodes, selectNode]);

  return (
    <div className="flex w-full h-full bg-[#0a0a0a] overflow-hidden font-mono text-slate-300">
      <MapSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />
      
      {/* Resizer Left */}
      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingLeft(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingLeft ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          <div className="flex gap-1.5 items-center pointer-events-auto max-w-[calc(100%-40px)] flex-wrap">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 flex gap-0.5 shadow-2xl">
              <button onClick={() => transformComponentRef.current?.zoomIn()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Plus size={16} /></button>
              <button onClick={() => transformComponentRef.current?.zoomOut()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Minus size={16} /></button>
              <button onClick={() => zoomToFit()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all" title="Zoom to Fit (F)"><Maximize size={16} /></button>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 shadow-2xl">
              <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-16 bg-black/50 border border-slate-700 rounded px-1.5 py-1 text-[9px] text-cyan-400 outline-none font-bold text-center" />
              <button onClick={handleAutoFill} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tighter shadow-lg shadow-cyan-900/20">
                {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Globe size={12} />} Fill
              </button>
              {useMapStore.getState().undoStack.length > 0 && useMapStore.getState().undoStack[useMapStore.getState().undoStack.length - 1].action === 'autofill' && (
                <button 
                  onClick={handleUndo} 
                  className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-lg"
                >
                  Undo
                </button>
              )}
            </div>

            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 flex gap-0.5 shadow-2xl items-center">
              <button onClick={() => setTool('select')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'select' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Select Tool (V)">
                <MousePointer2 size={18} />
              </button>
              <button onClick={() => setTool('paint')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'paint' ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Paint Tool (B)">
                <Paintbrush size={18} />
              </button>
              
              {(selectedTool === 'paint' || selectedTool === 'erase') && (
                <div className="flex items-center gap-1.5 px-1.5 border-l border-slate-700/50">
                    <button
                      onClick={() => setBrushMode(!brushMode)}
                      className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${brushMode ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
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
                            className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all ${brushSize === size ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
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
                        className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${snapMode === 'full' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        title="Full Snap — lock to tile grid"
                      >
                        <Grid size={10} />
                        SNAP
                      </button>
                      <button
                        onClick={() => setSnapMode('half')}
                        className={`px-1.5 py-1 rounded text-[9px] font-black transition-all ${snapMode === 'half' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        title="Half Snap — for bridges, fences, doors"
                      >
                        ½
                      </button>
                      <button
                        onClick={() => setSnapMode('free')}
                        className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${snapMode === 'free' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        title="Free Placement — no snapping"
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

              <div className="flex gap-0.5 px-0.5">
                <button
                  onClick={() => setSelectedSmartType(selectedSmartType === 'off' ? 'grass' : 'off')}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${selectedSmartType !== 'off' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Toggle Smart Brush (Z)"
                >
                  <Zap size={16} className={selectedSmartType !== 'off' ? "fill-white" : ""} />
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
                      <span className="text-[10px] font-bold w-6 text-center text-cyan-400" title={`Current Layer: ${smartBrushLayer}`}>
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
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${smartBrushLock ? 'bg-red-600/20 text-red-400 border border-red-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Lock Smart Tiles"
                >
                  {smartBrushLock ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                <button
                  onClick={() => setRaiseMode(!isRaiseMode)}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${isRaiseMode ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Toggle Raise Mode (R)"
                >
                  <Box size={16} />
                </button>
                <button
                  onClick={() => setShowWalkabilityOverlay(!showWalkabilityOverlay)}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${showWalkabilityOverlay ? 'bg-red-600/20 text-red-400 border border-red-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Show Walkability Overlay"
                >
                  {showWalkabilityOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => setShowDebugNumbers(!showDebugNumbers)}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${showDebugNumbers ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
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

              <div className="flex gap-0.5 px-0.5">
                <button onClick={() => setTool('erase')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'erase' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Eraser Tool (E)">
                  <Eraser size={18} />
                </button>
                <button onClick={() => setTool('eyedropper')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'eyedropper' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Eyedropper Tool (Alt + Click)">
                  <Pipette size={18} />
                </button>
                <button onClick={() => setTool('stamp')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'stamp' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Stamp Tool (S)">
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
                <button onClick={() => setTool('rotate')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'rotate' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Rotate Tool (R)">
                  <RotateCw size={18} />
                </button>
                <button
                  onClick={() => { setTool('collision'); setShowWalkabilityOverlay(true); }}
                  className={`p-1.5 rounded-lg transition-all ${selectedTool === 'collision' ? 'bg-red-700 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Collision Brush — paint non-walkable zones"
                >
                  <ShieldOff size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* EDGE COLLISION SUB-MODE — shown when collision tool is active */}
          {selectedTool === 'collision' && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1 pointer-events-auto shadow-2xl">
              <button
                onClick={() => setCollisionMode('full')}
                className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${collisionMode === 'full' ? 'bg-red-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                title="Full Block — entire tile is non-walkable"
              >
                ■ Full
              </button>
              {([
                { label: '▲', dir: 1, title: 'Block North edge' },
                { label: '▶', dir: 2, title: 'Block East edge' },
                { label: '▼', dir: 4, title: 'Block South edge (cliff top)' },
                { label: '◀', dir: 8, title: 'Block West edge' },
              ] as const).map(({ label, dir, title }) => (
                <button
                  key={dir}
                  onClick={() => { setCollisionMode('edge'); setEdgeDirection(dir); }}
                  className={`px-2 py-1 rounded text-[10px] font-black transition-all ${collisionMode === 'edge' && edgeDirection === dir ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                  title={title}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase flex items-center gap-3 transition-all pointer-events-auto ${isSpacePressed ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-slate-900/90 border-slate-800 text-slate-500 shadow-2xl'}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isSpacePressed ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
              {isSpacePressed ? 'Pan' : 'Space: Pan'}
            </div>
            
            {/* SMART BRUSH INDICATOR */}
            {selectedSmartType !== 'off' && (
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3 text-purple-400">
                <Wand2 size={10} className="animate-pulse" />
                <span>{selectedSmartType.toUpperCase()}</span>
                <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded border border-slate-600">L{smartBrushLayer}</span>
                {isRaiseMode && <span className="bg-purple-900/50 px-1 rounded text-[7px] border border-purple-500/50">RAISE</span>}
              </div>
            )}

            {/* COLLISION BRUSH INDICATOR */}
            {selectedTool === 'collision' && (
              <div className={`flex items-center gap-1.5 border-l border-slate-700 pl-3 ${collisionMode === 'edge' ? 'text-orange-400' : 'text-red-400'}`}>
                <ShieldOff size={10} className="animate-pulse" />
                <span>{collisionMode === 'full' ? 'Full Block' : `Edge ${edgeDirection === 1 ? '▲N' : edgeDirection === 2 ? '▶E' : edgeDirection === 4 ? '▼S' : '◀W'}`}</span>
                <span className="text-[8px] text-slate-500">click to toggle</span>
              </div>
            )}

            <CoordinateDisplay 
              x={cursorCoords.x} 
              y={cursorCoords.y} 
              smoothX={smoothCursorCoords.x} 
              smoothY={smoothCursorCoords.y} 
            />
          </div>
        </div>

        {/* Viewport */}
        <div className={`flex-1 bg-[#6b705c] relative overflow-hidden ${isSpacePressed || isDraggingTile || isDraggingNode ? 'cursor-grabbing' : 'cursor-crosshair'}`} ref={dropTargetRef}>
          
          {/* Layer 1: The stationary Pixi Canvas (Internal container handles the panning) */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <PixiMapCanvas 
              width={viewport.width} 
              height={viewport.height} 
              worldSize={WORLD_SIZE}
              transformRef={pixiTransformRef}
              onPropMouseDown={handlePropMouseDown}
              onNodeMouseDown={handleNodeMouseDown}
              waterBaseTile={waterBaseTile()}
              foamStripTile={foamStripTile()}
              showDebugNumbers={showDebugNumbers}
              showWalkabilityOverlay={showWalkabilityOverlay}
              nodes={nodes}
              cursorCoords={cursorCoords}
              selectedTool={selectedTool}
              isSpacePressed={isSpacePressed}
              brushMode={brushMode}
              brushSize={brushSize}
              selectedTileId={selectedTileId}
              customTiles={customTiles}
            />
          </div>

          <TransformWrapper 
            ref={transformComponentRef} 
            initialScale={0.5} 
            minScale={0.001} 
            maxScale={10} 
            centerOnInit={false}
            initialPositionX={-(WORLD_SIZE / 2 * 0.5) + (viewport.width / 2)}
            initialPositionY={-(WORLD_SIZE / 2 * 0.5) + (viewport.height / 2)}
            onTransformed={(p) => {
              // Write directly to the ref — no React setState, no re-render cascade
              pixiTransformRef.current = {
                x: p.state.positionX,
                y: p.state.positionY,
                scale: p.state.scale
              };
              if (dropTargetRef.current) {
                dropTargetRef.current.style.setProperty('--zoom-scale', p.state.scale.toString());
              }
            }}
            limitToBounds={false} 
            wheel={{ step: 0.08 }} 
            doubleClick={{ disabled: true }}
            panning={{ 
              disabled: !isSpacePressed && (selectedTool !== 'select' || isDraggingTile),
              velocityDisabled: true // Prevent "flinging" feel
            }}
          >
            <TransformComponent wrapperClass="w-full h-full">
              <div
                className="map-canvas-container"
                style={{
                  width: WORLD_SIZE,
                  height: WORLD_SIZE,
                  position: 'relative',
                  backgroundColor: 'transparent', // IMPORTANT: Transparent so Pixi shows through
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
              >
                
                {/* Layer 2: Grid Highlight */}
                {!isSpacePressed && (selectedTool === 'paint' || selectedTool === 'erase') && (
                  (() => {
                    const selTile = customTiles.find(t => t.id === selectedTileId);
                    const h = selTile?.frameHeight || TILE_SIZE;
                    const w = selTile?.frameWidth || h;
                    
                    return (
                      <div 
                        className="absolute pointer-events-none" 
                        style={{
                          left: snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE) - (snapMode === 'full' ? 0 : w/2) + (snapMode === 'full' ? 0 : TILE_SIZE/2),
                          top: snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE) - (snapMode === 'full' ? 0 : h) + (snapMode === 'full' ? 0 : TILE_SIZE),
                          width: w,
                          height: h,
                          backgroundColor: 'rgba(56, 189, 248, 0.2)', 
                          border: '1px solid rgba(56, 189, 248, 0.7)',
                          zIndex: 60,
                          opacity: 0.5 + Math.sin(Date.now() / 150) * 0.3
                        }}
                      />
                    );
                  })()
                )}

      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingRight(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingRight ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <MapDataSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />
                {nodes.map(node => (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                    onDoubleClick={() => handleEditNodeProperties(node.id)}
                    className={`absolute z-50 flex items-center justify-center rounded-full transition-transform transform-gpu ${selectedNodeId === node.id ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-2xl' : 'shadow-lg'}`}
                    style={{
                      left: node.x * TILE_SIZE + WORLD_SIZE / 2,
                      top: node.y * TILE_SIZE + WORLD_SIZE / 2,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      cursor: isSpacePressed ? 'grabbing' : (selectedTool === 'select' || selectedTool === 'node' ? 'pointer' : 'crosshair'),
                    }}
                  >
                    <div className="absolute inset-0 bg-slate-800/80 rounded-full border-2 border-slate-600" />
                    {node.iconUrl ? (
                      <img src={node.iconUrl} alt={node.name} className="w-3/5 h-3/5 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <div className="text-white">
                        {node.type === 'spawn' && <Target size={20} />}
                        {node.type === 'enemy' && <Sword size={20} />}
                        {node.type === 'npc' && <User size={20} />}
                        {node.type === 'loot' && <Box size={20} />}
                        {node.type === 'poi' && <MapIcon size={20} />}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Layer 4: Brush and Selection Previews */}
                <BrushPreview 
                  isSpacePressed={isSpacePressed} 
                  selectedTool={selectedTool} 
                  selectedTileId={selectedTileId} 
                  customTiles={customTiles}
                  cursorCoords={cursorCoords}
                  smoothCursorCoords={smoothCursorCoords}
                  TILE_SIZE={TILE_SIZE}
                  WORLD_SIZE={WORLD_SIZE}
                  brushSize={brushSize}
                  brushMode={brushMode}
                  selectedSmartType={selectedSmartType}
                  snapMode={snapMode}
                />
                
                {/* Stamp Tool Preview */}
                {selectedTool === 'stamp' && currentStamp && !isSpacePressed && (
                   <div 
                      className="absolute pointer-events-none z-[70] opacity-60"
                      style={{
                        left: snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE),
                        top: snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE),
                      }}
                   >
                     {currentStamp.map((tile, stampIdx) => {
                       // --- Frozen smart tile: render using bitmask + sheet url ---
                       const isFrozenSmart = !!tile.smartType && tile.bitmask !== undefined;
                       if (isFrozenSmart) {
                         const smartType = tile.smartType!;
                         let sheetUrl: string | null = null;
                         if (smartType === 'water' && waterSheetUrl) sheetUrl = waterSheetUrl;
                         else if (smartType === 'dirt' && dirtSheetUrl) sheetUrl = dirtSheetUrl;
                         else if (autoTileSheetUrl) sheetUrl = autoTileSheetUrl;

                         if (!sheetUrl) {
                           return (
                             <div key={`stamp-${stampIdx}-${tile.x}-${tile.y}-${tile.layer || 0}`}
                               className="absolute bg-green-500/30 border border-green-500/50"
                               style={{ left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, imageRendering: 'pixelated' }}
                             />
                           );
                         }

                         const coords = smartType === 'water'
                           ? getLiquidTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0)
                           : getPixiTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0);
                         const { sourceX, sourceY } = coords[0];

                         return (
                           <div key={`stamp-${stampIdx}-${tile.x}-${tile.y}-${tile.layer || 0}`}
                             className="absolute"
                             style={{
                               left: tile.x * TILE_SIZE,
                               top: tile.y * TILE_SIZE,
                               width: TILE_SIZE,
                               height: TILE_SIZE,
                               backgroundImage: `url(${sheetUrl})`,
                               backgroundPosition: `-${sourceX}px -${sourceY}px`,
                               backgroundRepeat: 'no-repeat',
                               imageRendering: 'pixelated',
                             }}
                           />
                         );
                       }

                       // --- Regular palette tile ---
                       const customTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizeUrl(tile.imageUrl));
                       if (!customTile) return null;
                       
                       const displayWidth = customTile.frameWidth || TILE_SIZE;
                       const displayHeight = customTile.frameHeight || TILE_SIZE;
                       
                       return (
                         <div key={`stamp-${stampIdx}-${tile.x}-${tile.y}-${tile.layer || 0}`}
                           className="absolute"
                           style={{
                             left: tile.x * TILE_SIZE,
                             top: tile.y * TILE_SIZE,
                             width: displayWidth,
                             height: displayHeight,
                             backgroundImage: `url(${customTile.url})`,
                             backgroundSize: 'cover',
                             imageRendering: 'pixelated'
                           }}
                         />
                       );
                     })}
                   </div>
                )}


                {/* High-Visibility Black Grid Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 50,
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.1) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to bottom, rgba(0,0,0,0.1) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to right, rgba(0,0,0,0.25) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to bottom, rgba(0,0,0,0.25) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1)))
                    `,
                    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px, ${TILE_SIZE}px ${TILE_SIZE}px, ${TILE_SIZE * 10}px ${TILE_SIZE * 10}px, ${TILE_SIZE * 10}px ${TILE_SIZE * 10}px`,
                  backgroundPosition: `${WORLD_SIZE / 2}px ${WORLD_SIZE / 2}px`
                }}
              />
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        {/* Hotbar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl">
          {favorites.map((tileId, idx) => {
            const tile = customTiles.find(t => t.id === tileId);
            return (
              <button 
                key={idx}
                onClick={() => tileId && selectTile(tileId)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (selectedTileId) setFavorite(idx, selectedTileId);
                }}
                className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all group ${tileId ? 'bg-slate-800 border-slate-600 hover:border-cyan-400' : 'bg-slate-950 border-slate-800 border-dashed hover:border-slate-600'}`}
              >
                {tile ? (
                  <div 
                    className="w-8 h-8"
                    style={{
                      backgroundImage: `url(${tile.url})`,
                      backgroundSize: tile.isSpritesheet && tile.frameCount ? `${tile.frameCount * 100}% 100%` : 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated'
                    }}
                  />
                ) : (
                  <span className="text-[10px] text-slate-700 font-bold">{idx + 1}</span>
                )}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-400">
                  {idx + 1}
                </div>
                {!tileId && <Plus size={10} className="absolute inset-0 m-auto text-slate-800 opacity-0 group-hover:opacity-100" />}
              </button>
            );
          })}
        </div>
      </div>

      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingRight(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingRight ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <MapDataSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />

      {showNodeModal && nodeFormData && (
        <NodeEditModal
          open={showNodeModal}
          onClose={() => setShowNodeModal(false)}
          mode="edit"
          coords={{ x: nodes.find(n => n.id === selectedNodeId)?.x || 0, y: nodes.find(n => n.id === selectedNodeId)?.y || 0 }}
          nodeData={nodeFormData}
          onChange={setNodeFormData}
          onSave={handleSaveNodeDetails}
          saving={savingNode}
          shopItems={shopItems}
          encounters={encounters}
          maps={maps}
          stockedItems={stockedItems}
          onAddStockItem={onAddStockItem}
          onRemoveStockItem={onRemoveStockItem}
          musicTracks={musicTracks}
          iconGalleryUrls={iconGalleryUrls}
          onIconSelect={(url) => setNodeFormData({ ...nodeFormData, icon_url: url })}
          onDeleteIcon={handleDeleteIcon}
          uploadingIcon={uploadingIcon}
          onUploadIcon={handleUploadIcon}
          iconInputRef={nodeIconInputRef}
          uploadingSceneBg={uploadingSceneBg}
          onUploadSceneBg={(f) => handleUploadAsset(f, 'nodes/scene-backgrounds', setUploadingSceneBg).then(p => p && setNodeFormData({...nodeFormData, scene_background_url: p}))}
          sceneBgInputRef={sceneBgInputRef}
          uploadingNpcSprite={uploadingNpcSprite}
          onUploadNpcSprite={(f) => handleUploadAsset(f, 'nodes/npc-sprites', setUploadingNpcSprite).then(p => p && setNodeFormData({...nodeFormData, scene_npc_sprite_url: p}))}
          npcSpriteInputRef={npcSpriteInputRef}
          onUploadNodeMusic={handleUploadNodeMusic}
          uploadingNodeMusic={uploadingNodeMusic}
          nodeMusicInputRef={nodeMusicInputRef}
          onRequestUploadDialogueImage={(idx) => { currentUploadIdx.current = idx; dialogueExpressionInputRef.current?.click(); }}
          uploadingDialogueImageLine={uploadingDialogueImageLine}
          onRequestUploadVoiceLine={(idx) => { currentUploadIdx.current = idx; dialogueVoiceLineInputRef.current?.click(); }}
          uploadingVoiceLineLine={uploadingVoiceLineLine}
        />
      )}

      {showDebugModal && (
        <DebugOverlay
          winluSheetUrl={autoTileSheetUrl}
          waterSheetUrl={waterSheetUrl}
          onClose={() => setShowDebugModal(false)}
        />
      )}

      {/* Hidden Upload Inputs */}
      <input type="file" ref={dialogueExpressionInputRef} className="hidden" accept="image/*" onChange={handleUploadDialogueExpression} />
      <input type="file" ref={dialogueVoiceLineInputRef} className="hidden" accept="audio/*" onChange={handleUploadDialogueVoiceLine} />
    </div>
  );
};

export default WorldMapEngine;
