'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMapStore, useTickStore } from '@/lib/store/mapStore';
import { useCursorStore } from '@/lib/store/cursorStore';
import { PixiMapCanvas } from './PixiMapCanvas';
import { MapSidebar } from './MapSidebar';
import { MapDataSidebar } from './MapDataSidebar';
import {
  Plus,
  Minus,
  Target,
  Map as MapIcon,
  User,
  Sword,
  Box,
  Search,
} from 'lucide-react';
import { DebugOverlay } from './DebugOverlay';
import { normalizeUrl, snapPosition, getPixiTextureCoords, getLiquidTextureCoords } from './mapUtils';
import NodeEditModal from '../NodeEditModal';

// Hooks
import { useMapData } from './hooks/useMapData';
import { useMapClipboard } from './hooks/useMapClipboard';
import { useMapInteraction } from './hooks/useMapInteraction';

// Components
import { BrushPreview } from './components/BrushPreview';
import { GridHighlight } from './components/GridHighlight';
import { StampPreview } from './components/StampPreview';
import { MapToolbar } from './components/MapToolbar';
import { MapHotbar } from './components/MapHotbar';

const WORLD_SIZE = 100000; 
const TILE_SIZE = 48;

export const WorldMapEngine = React.memo<{ shopItems?: any[] }>(({ shopItems = [] }) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  
  // ⚡️ ATOMIC SELECTORS - No 'tiles' array here! 
  // The Engine will not re-render when painting tiles, but it DOES subscribe to nodes 
  // to ensure they show up on the map and in the sidebar correctly!
  const nodes = useMapStore(state => state.nodes);
  const addNode = useMapStore(state => state.addNode);
  const removeNode = useMapStore(state => state.removeNode);
  const selectNode = useMapStore(state => state.selectNode);
  const selectedNodeId = useMapStore(state => state.selectedNodeId);
  const selectedTileId = useMapStore(state => state.selectedTileId);
  const selectedTool = useMapStore(state => state.selectedTool);
  const setTool = useMapStore(state => state.setTool);
  const isDraggingTile = useMapStore(state => state.isDraggingTile);
  const draggingTileId = useMapStore(state => state.draggingTileId);
  const setDraggingTile = useMapStore(state => state.setDraggingTile);
  const isDraggingNode = useMapStore(state => state.isDraggingNode);
  const draggingNodeId = useMapStore(state => state.draggingNodeId);
  const setDraggingNode = useMapStore(state => state.setDraggingNode);
  const setDragGrabOffset = useMapStore(state => state.setDragGrabOffset);
  const removeTileById = useMapStore(state => state.removeTileById);
  const selectTile = useMapStore(state => state.selectTile);
  const favorites = useMapStore(state => state.favorites);
  const sidebarWidth = useMapStore(state => state.sidebarWidth);
  const setSidebarWidth = useMapStore(state => state.setSidebarWidth);
  const setRightSidebarWidth = useMapStore(state => state.setRightSidebarWidth);
  const rightSidebarWidth = useMapStore(state => state.rightSidebarWidth);
  const loadTilesFromSupabase = useMapStore(state => state.loadTilesFromSupabase);
  const isLoadingTiles = useMapStore(state => state.isLoadingTiles);
  const showDebugModal = useMapStore(state => state.showDebugModal);
  const setShowDebugModal = useMapStore(state => state.setShowDebugModal);
  const setUndoStack = useMapStore(state => state.setUndoStack);
  const setSelection = useMapStore(state => state.setSelection);
  const waterBaseTile = useMapStore(state => state.waterBaseTile);
  const foamStripTile = useMapStore(state => state.foamStripTile);
  const showDebugNumbers = useMapStore(state => state.showDebugNumbers);
  const showWalkabilityOverlay = useMapStore(state => state.showWalkabilityOverlay);
  const setShowWalkabilityOverlay = useMapStore(state => state.setShowWalkabilityOverlay);
  const brushMode = useMapStore(state => state.brushMode);
  const brushSize = useMapStore(state => state.brushSize);
  const customTiles = useMapStore(state => state.customTiles); // Only needed for passing down to sub-components if they don't select it themselves

  // Local State
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  // Viewport & Transform State
  const pixiTransformRef = useRef({ x: 0, y: 0, scale: 0.5 });
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // ⚡️ AAA FIX: Connect to the micro-store!
  // We use direct state selectors to grab the setter functions WITHOUT subscribing the Engine to the coordinate changes!
  const setCursorCoords = useCursorStore(state => state.setCursorCoords);
  const setSmoothCursorCoords = useCursorStore(state => state.setSmoothCursorCoords);
  const setIsDrawing = useCursorStore(state => state.setIsDrawing);
  
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
    showNodeModal, setShowNodeModal,
    nodeFormData, setNodeFormData,
    encounters, maps, musicTracks, stockedItems, savingNode,
    uploadingIcon, uploadingSceneBg, uploadingNpcSprite, uploadingNodeMusic,
    uploadingDialogueImageLine, uploadingVoiceLineLine, iconGalleryUrls,
    nodeIconInputRef, sceneBgInputRef, npcSpriteInputRef, nodeMusicInputRef,
    dialogueExpressionInputRef, dialogueVoiceLineInputRef, currentUploadIdx,
    fetchSupportData, fetchIconGallery,
    handleEditNodeProperties, handleSaveNodeDetails, handleUploadAsset,
    handleUploadIcon, handleDeleteIcon, onAddStockItem, onRemoveStockItem,
    handleUploadNodeMusic, handleUploadDialogueExpression, handleUploadDialogueVoiceLine,
    setUploadingSceneBg, setUploadingNpcSprite
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
    isSpacePressed
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

    // Fetch state directly to avoid re-rendering on every change
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
    const targetScale = Math.max(0.0001, Math.min(scaleX, scaleY, 0.8));

    const centerX = ((minX + maxX + 1) / 2) * TILE_SIZE + WORLD_SIZE / 2;
    const centerY = ((minY + maxY + 1) / 2) * TILE_SIZE + WORLD_SIZE / 2;

    const targetPosX = containerW / 2 - centerX * targetScale;
    const targetPosY = containerH / 2 - centerY * targetScale;

    transformComponentRef.current.setTransform(targetPosX, targetPosY, targetScale, animate ? 400 : 0, 'easeOut');
  }, [viewport.width, viewport.height]);

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
              setUndoStack((prev: any[]) => [...prev, { action: 'erase_node', nodeData: node }]);
              removeNode(node.id);
            }
          } else if (state.selectedTileId) {
            const tile = state.tiles.find(t => t.id === state.selectedTileId);
            if (tile) {
              setUndoStack((prev: any[]) => [...prev, {
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
        useMapStore.setState({ currentStamp: null });
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
          useMapStore.getState().setTool('select');
          return;
        }
        if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
          useMapStore.getState().setTool('paint');
          return;
        }
        if (e.key.toLowerCase() === 'e') {
          useMapStore.getState().setTool('erase');
          return;
        }
        if (e.key.toLowerCase() === 'o') {
          useMapStore.getState().setTool('eyedropper');
          return;
        }
        if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
          useMapStore.getState().setTool('stamp');
          return;
        }
        if (e.key.toLowerCase() === 'r') {
          useMapStore.getState().setTool('rotate');
          return;
        }
        if (e.key.toLowerCase() === 'h') {
          useMapStore.getState().setTool('flip');
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
        const { cursorCoords } = useCursorStore.getState();
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
  }, [zoomToFit, favorites, selectTile, handleUndo, handleCopySelection, handlePasteStamp, setSelection, setShowDebugModal, setUndoStack, removeNode, removeTileById]);

  const hasInitialZoomed = useRef(false);

  useEffect(() => {
    // Check lengths via getState to avoid subscription
    const state = useMapStore.getState();
    if (!isLoadingTiles && !hasInitialZoomed.current && (state.tiles.length > 0 || state.nodes.length > 0)) {
      const timer = setTimeout(() => {
        zoomToFit(false);
        hasInitialZoomed.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingTiles, zoomToFit]);

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
  }, [loadTilesFromSupabase]);

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
  
    const node = useMapStore.getState().nodes.find(n => n.id === nodeId);
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
  }, [selectNode]);

  return (
    <div className="flex w-full h-full bg-[#0a0a0a] overflow-hidden font-mono text-slate-300">
      <MapSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />
      
      {/* Resizer Left */}
      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingLeft(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingLeft ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <div className="flex-1 relative flex flex-col min-w-0">
        <MapToolbar
          onZoomIn={() => transformComponentRef.current?.zoomIn()}
          onZoomOut={() => transformComponentRef.current?.zoomOut()}
          onZoomFit={zoomToFit}
          isSpacePressed={isSpacePressed}
        />

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
            minScale={0.0001} 
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
                const gridOpacity = p.state.scale < 0.08 ? Math.max(0, (p.state.scale - 0.03) / 0.05) : 1;
                dropTargetRef.current.style.setProperty('--grid-opacity', gridOpacity.toString());
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
                {/* GridHighlight needs current info but is cheap to render */}
                {!isSpacePressed && (selectedTool === 'paint' || selectedTool === 'erase' || selectedTool === 'collision') && (
                  <GridHighlight 
                    selectedTool={selectedTool}
                    selectedTileId={selectedTileId}
                    customTiles={customTiles}
                    snapMode={useMapStore.getState().snapMode}
                  />
                )}

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
                  TILE_SIZE={TILE_SIZE}
                  WORLD_SIZE={WORLD_SIZE}
                  brushSize={brushSize}
                  brushMode={brushMode}
                  selectedSmartType={useMapStore.getState().selectedSmartType}
                  snapMode={useMapStore.getState().snapMode}
                />
                
                {/* Stamp Tool Preview */}
                {selectedTool === 'stamp' &&
                  useMapStore.getState().currentStamp &&
                  !isSpacePressed && (
                    <StampPreview
                      currentStamp={useMapStore.getState().currentStamp!}
                      snapMode={useMapStore.getState().snapMode}
                      waterSheetUrl={useMapStore.getState().waterSheetUrl}
                      dirtSheetUrl={useMapStore.getState().dirtSheetUrl}
                      autoTileSheetUrl={useMapStore.getState().autoTileSheetUrl}
                      customTiles={customTiles}
                    />
                  )}


                {/* High-Visibility Black Grid Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 50,
                    opacity: 'var(--grid-opacity, 1)',
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

        <MapHotbar />
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
          winluSheetUrl={useMapStore.getState().autoTileSheetUrl}
          waterSheetUrl={useMapStore.getState().waterSheetUrl}
          onClose={() => setShowDebugModal(false)}
        />
      )}

      {/* Hidden Upload Inputs */}
      <input type="file" ref={dialogueExpressionInputRef} className="hidden" accept="image/*" onChange={handleUploadDialogueExpression} />
      <input type="file" ref={dialogueVoiceLineInputRef} className="hidden" accept="audio/*" onChange={handleUploadDialogueVoiceLine} />
    </div>
  );
});

export default WorldMapEngine;
