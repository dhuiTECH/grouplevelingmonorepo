import { useRef, useState } from 'react';
import { useMapStore, NodeType } from '@/lib/store/mapStore';
import { useAutoTiling } from './useAutoTiling';
import { normalizeUrl } from '@/components/admin/WorldMap/mapUtils';

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;
const COLLISION_LAYER = -2;
const EDGE_BLOCK_LAYER = -3;

export const useMapInteraction = (
  pixiTransformRef: React.MutableRefObject<any>,
  transformComponentRef: React.MutableRefObject<any>,
  dropTargetRef: React.MutableRefObject<HTMLDivElement | null>,
  isSpacePressed: boolean,
  setCursorCoords: (coords: { x: number; y: number }) => void,
  setSmoothCursorCoords: (coords: { x: number; y: number }) => void,
  setIsDrawing: (drawing: boolean) => void,
  isDrawing: boolean
) => {
  const {
    nodes, tiles, customTiles, selectedTool, selectedTileId, selectedSmartType,
    smartBrushLayer, isRaiseMode, isFoamEnabled, smartBrushLock,
    setUndoStack, addTileSimple, removeTileAt, removeNode, updateNode,
    selectNode, setDraggingNode, setDragGrabOffset, setDraggingTile,
    rotateTile, removeTileById, setSelection, setCurrentStamp, selectTile,
    moveTile, batchAddTiles, setTool, setCollisionMode, setEdgeDirection,
    collisionMode, edgeDirection, activeNodeType, addNode, nodeSnapToGrid
  } = useMapStore();

  const { calculateAndUpdateTile, updateTileAndNeighbors } = useAutoTiling();

  const dragRafRef = useRef<number | null>(null);
  const pendingDragUpdateRef = useRef<{x: number, y: number} | null>(null);
  const brushRafRef = useRef<number | null>(null);
  const pendingBrushRef = useRef<{clientX: number, clientY: number, isShift: boolean, isAlt: boolean, buttons: number} | null>(null);
  const lastInteractionRef = useRef<{gx: number, gy: number, tool: string} | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const getTopMostTileId = (gx: number, gy: number) => {
    const tilesAtPos = tiles.filter(t => t.x === gx && t.y === gy);
    if (tilesAtPos.length === 0) return null;
    return tilesAtPos.sort((a, b) => (b.layer || 0) - (a.layer || 0))[0].id;
  };

  const handleMapInteraction = async (clientX: number, clientY: number, isMove = false, isShift = false, forceErase = false, isAlt = false, buttons = 0) => {
    if (!transformComponentRef.current || !dropTargetRef.current || (isSpacePressed && !isMove)) return;
    const state = useMapStore.getState();
    const { positionX, positionY, scale } = transformComponentRef.current.instance.transformState;
    const rect = dropTargetRef.current.getBoundingClientRect();
    const worldX = (clientX - rect.left - positionX) / scale;
    const worldY = (clientY - rect.top - positionY) / scale;
    const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
    const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

    const tool = forceErase ? 'erase' : (isAlt ? 'eyedropper' : selectedTool);

    // Node dragging logic
    if (state.isDraggingNode && state.draggingNodeId) {
      const node = state.nodes.find(n => n.id === state.draggingNodeId);
      if (node && state.dragGrabOffset) {
        const exactX = worldX - WORLD_SIZE / 2;
        const exactY = worldY - WORLD_SIZE / 2;

        let newX = (exactX - state.dragGrabOffset.x) / TILE_SIZE;
        let newY = (exactY - state.dragGrabOffset.y) / TILE_SIZE;

        if (state.nodeSnapToGrid) {
          newX = Math.round(newX * 2) / 2;
          newY = Math.round(newY * 2) / 2;
        }

        pendingDragUpdateRef.current = { x: newX, y: newY };

        if (!dragRafRef.current) {
          dragRafRef.current = requestAnimationFrame(() => {
            const pending = pendingDragUpdateRef.current;
            if (pending && (node.x !== pending.x || node.y !== pending.y)) {
              useMapStore.setState(s => ({
                nodes: s.nodes.map(n => n.id === node.id ? { ...n, x: pending.x, y: pending.y } : n)
              }));
            }
            dragRafRef.current = null;
          });
        }
      }
      return;
    }

    if (!state.isDraggingTile && !state.isDraggingNode) {
      setSmoothCursorCoords({ x: worldX - WORLD_SIZE / 2, y: worldY - WORLD_SIZE / 2 });
      setCursorCoords({ x: gx, y: gy });
    }

    if (isMove && !state.isDraggingTile) {
      const { brushMode: currentBrushMode, brushSize: currentBrushSize, snapMode: currentSnapMode } = state;
      const isBrushMode = (tool === 'paint' || tool === 'erase') && currentBrushMode && (currentBrushSize > 1 || tool === 'erase');
      const isSubGridSnap = currentSnapMode !== 'full';

      if (!isBrushMode && !isSubGridSnap && lastInteractionRef.current?.gx === gx && lastInteractionRef.current?.gy === gy && lastInteractionRef.current?.tool === tool) {
        return;
      }
    }
    
    if (!isMove || lastInteractionRef.current?.gx !== gx || lastInteractionRef.current?.gy !== gy || lastInteractionRef.current?.tool !== tool) {
       lastInteractionRef.current = { gx, gy, tool };
    }

    if (isMove && buttons === 0) return;

    if (tool === 'select') return;

    if (tool === 'paint') {
      const tile = customTiles.find(t => t.id === selectedTileId);
      if (tile || selectedSmartType !== 'off') {
        const activeTileLayer = tile ? tile.layer : state.layer;
        const { brushMode: currentBrushMode, brushSize: currentBrushSize } = state;

        let brushArea = [{dx: 0, dy: 0}];

        if (currentBrushMode && currentBrushSize > 1) {
          const half = Math.floor(currentBrushSize / 2);
          const isEven = currentBrushSize % 2 === 0;
          brushArea = [];
          for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
            for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
              brushArea.push({dx, dy});
            }
          }
        }

        const tasks = [];

        for (const {dx, dy} of brushArea) {
          const tx = gx + dx;
          const ty = gy + dy;
          let offsetX = 0;
          let offsetY = 0;

          const currentSnapMode = state.snapMode;
          if (currentSnapMode === 'free') {
            const exactX = worldX - WORLD_SIZE / 2 + (dx * TILE_SIZE);
            const exactY = worldY - WORLD_SIZE / 2 + (dy * TILE_SIZE);
            offsetX = Math.round(exactX - (tx * TILE_SIZE + TILE_SIZE / 2));
            offsetY = Math.round(exactY - (ty * TILE_SIZE + TILE_SIZE));
          } else if (currentSnapMode === 'half') {
            const HALF = TILE_SIZE / 2;
            const worldRelX = worldX - WORLD_SIZE / 2 + (dx * TILE_SIZE);
            const worldRelY = worldY - WORLD_SIZE / 2 + (dy * TILE_SIZE);
            const snappedX = Math.round(worldRelX / HALF) * HALF;
            const snappedY = Math.round(worldRelY / HALF) * HALF;
            offsetX = Math.round(snappedX - (tx * TILE_SIZE + TILE_SIZE / 2));
            offsetY = Math.round(snappedY - (ty * TILE_SIZE + TILE_SIZE));
          }

          let isAutoTile = tile?.isAutoTile ?? false;
          let elevation = 0;
          let bitmask = 0;
          let hasFoam = isFoamEnabled;
          let foamBitmask = 0;
          let smartType = tile?.smartType;

          if (selectedSmartType !== 'off' && activeTileLayer === smartBrushLayer) {
             isAutoTile = true;
             smartType = selectedSmartType;
             if (isRaiseMode) elevation = 1;
             if (isShift) elevation = 0;
          }

          tasks.push((async () => {
            const prevTile = useMapStore.getState().tiles.find(t => t.x === tx && t.y === ty && (t.layer || 0) === (activeTileLayer || 0));

            if (state.smartBrushLock && prevTile?.isAutoTile) return;

            if (!isMove || (dx === 0 && dy === 0)) {
              setUndoStack(prev => [...prev, {
                action: 'paint',
                x: tx,
                y: ty,
                layer: activeTileLayer || 0,
                previousTile: prevTile || null
              }]);
            }

            await addTileSimple(
              tx, ty, tile?.type || 'custom', tile?.url || '', tile?.isSpritesheet || false, tile?.frameCount || 0,
              tile?.frameWidth || 48, tile?.frameHeight || 48, tile?.animationSpeed || 0.1, activeTileLayer,
              offsetX, offsetY, tile?.isWalkable ?? true, currentSnapMode === 'full', tile?.isAutoFill ?? false,
              isAutoTile, bitmask, elevation, hasFoam, foamBitmask, smartType, tile?.rotation || 0,
              state.selectedBlockCol, state.selectedBlockRow
            );

            if (isAutoTile && !state.smartBrushLock) {
               await updateTileAndNeighbors(tx, ty, activeTileLayer || 0, false, smartType, state.selectedBlockCol, state.selectedBlockRow);
            }
          })());
        }
        await Promise.all(tasks);
      }
    } else if (tool === 'erase') {
      const { brushMode: currentBrushMode, brushSize: currentBrushSize, smartBrushLock } = useMapStore.getState();
      let brushArea = [{dx: 0, dy: 0}];
      if (currentBrushMode && currentBrushSize > 1) {
        const half = Math.floor(currentBrushSize / 2);
        const isEven = currentBrushSize % 2 === 0;
        brushArea = [];
        for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
          for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
            brushArea.push({dx, dy});
          }
        }
      }

      const tasks = [];
      for (const {dx, dy} of brushArea) {
        const tx = gx + dx;
        const ty = gy + dy;
        tasks.push((async () => {
          const removedTile = await removeTileAt(tx, ty, smartBrushLock);
          if (removedTile) {
            if (!isMove || (dx === 0 && dy === 0)) {
              setUndoStack(prev => [...prev, {
                action: 'erase_tile',
                x: tx,
                y: ty,
                layer: removedTile.layer || 0,
                previousTile: removedTile
              }]);
            }
            if (removedTile.isAutoTile) {
              await updateTileAndNeighbors(tx, ty, removedTile.layer || 0, true, removedTile.smartType, removedTile.blockCol, removedTile.blockRow);
            }
          }
          const n = nodes.find(node => node.x === tx && node.y === ty);
          if (n && !isMove) {
            setUndoStack(prev => [...prev, { action: 'erase_node', nodeData: n }]);
            removeNode(n.id);
          }
        })());
      }
      await Promise.all(tasks);
    } else if (tool === 'stamp') {
      if (state.currentStamp) {
        await handlePasteStamp(gx, gy);
      } else {
        if (!isMove) {
          setIsSelecting(true);
          setSelection({ start: { x: gx, y: gy }, end: { x: gx, y: gy } });
        } else if (isSelecting && state.selection) {
          setSelection({ ...state.selection, end: { x: gx, y: gy } });
        }
      }
    } else if (tool === 'eyedropper') {
      const topTile = tiles.filter(t => t.x === gx && t.y === gy)
        .sort((a, b) => (b.layer || 0) - (a.layer || 0))[0];

      if (topTile) {
        state.setCurrentStamp([{ 
          ...topTile, 
          id: undefined,
          x: 0, 
          y: 0, 
          isAutoTile: false 
        }]);
        setTool('stamp');
        setIsDrawing(false);
        
        const foundCustomTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizeUrl(topTile.imageUrl));
        if (foundCustomTile) {
          selectTile(foundCustomTile.id);
        }
      }
    } else if (tool === 'collision') {
      if (collisionMode === 'full') {
        const collisionTile = useMapStore.getState().tiles.find(
          t => t.x === gx && t.y === gy && (t.layer || 0) === COLLISION_LAYER
        );
        if (forceErase || (collisionTile && !isMove)) {
          if (collisionTile) removeTileById(collisionTile.id);
        } else if (!collisionTile) {
          await addTileSimple(
            gx, gy, 'collision', '',
            false, 0, TILE_SIZE, TILE_SIZE, 0,
            COLLISION_LAYER, 0, 0,
            false, true, false, false, 0, 0, false, 0,
            undefined, 0, 0, 0
          );
        }
      } else {
        const edgeTile = useMapStore.getState().tiles.find(
          t => t.x === gx && t.y === gy && (t.layer || 0) === EDGE_BLOCK_LAYER
        );
        const currentBits = edgeTile?.edgeBlocks ?? 0;

        if (forceErase) {
          const newBits = currentBits & ~edgeDirection;
          if (edgeTile) {
            if (newBits === 0) {
              removeTileById(edgeTile.id);
            } else {
              await addTileSimple(
                gx, gy, 'edge_block', '',
                false, 0, TILE_SIZE, TILE_SIZE, 0,
                EDGE_BLOCK_LAYER, 0, 0,
                true, true, false, false, 0, 0, false, 0,
                undefined, 0, 0, 0, newBits
              );
            }
          }
        } else if (!isMove) {
          const newBits = currentBits ^ edgeDirection;
          if (newBits === 0 && edgeTile) {
            removeTileById(edgeTile.id);
          } else {
            await addTileSimple(
              gx, gy, 'edge_block', '',
              false, 0, TILE_SIZE, TILE_SIZE, 0,
              EDGE_BLOCK_LAYER, 0, 0,
              true, true, false, false, 0, 0, false, 0,
              undefined, 0, 0, 0, newBits
            );
          }
        } else {
          const newBits = currentBits | edgeDirection;
          if (newBits !== currentBits) {
            await addTileSimple(
              gx, gy, 'edge_block', '',
              false, 0, TILE_SIZE, TILE_SIZE, 0,
              EDGE_BLOCK_LAYER, 0, 0,
              true, true, false, false, 0, 0, false, 0,
              undefined, 0, 0, 0, newBits
            );
          }
        }
      }
    }
  };

  const handleCopySelection = () => {
    const state = useMapStore.getState();
    if (!state.selection) return;

    const startX = Math.min(state.selection.start.x, state.selection.end.x);
    const endX = Math.max(state.selection.start.x, state.selection.end.x);
    const startY = Math.min(state.selection.start.y, state.selection.end.y);
    const endY = Math.max(state.selection.start.y, state.selection.end.y);

    const capturedTiles = state.tiles.filter(t => 
      t.x >= startX && t.x <= endX && t.y >= startY && t.y <= endY
    ).map(t => ({ 
       ...t, 
       x: t.x - startX, 
       y: t.y - startY,
       isAutoTile: false
    })); 

    state.setCurrentStamp(capturedTiles);
    state.setSelection(null);
  };

  const handlePasteStamp = async (gx: number, gy: number) => {
    const state = useMapStore.getState();
    if (!state.currentStamp) return;

    const newTiles = state.currentStamp.map(t => {
      const { id, ...rest } = t;
      return {
        ...rest,
        x: gx + t.x,
        y: gy + t.y,
        isAutoTile: false
      };
    });

    await state.batchAddTiles(newTiles);
  };

  const handlePropMouseDown = (tileId: string, e: React.MouseEvent) => {
    if (isSpacePressed) return;

    if (e.button === 1) {
      e.stopPropagation();
      rotateTile(tileId, 90);
      return;
    }

    if (e.button === 2) {
      e.stopPropagation();
      const tile = tiles.find(t => t.id === tileId);
      if (tile) {
        setUndoStack(prev => [...prev, {
          action: 'erase_tile',
          x: tile.x,
          y: tile.y,
          layer: tile.layer || 0,
          previousTile: tile
        }]);
        removeTileById(tileId, smartBrushLock);
      }
      return;
    }

    if (selectedTool === 'erase') {
        return;
    } else if (selectedTool === 'select') {
      e.stopPropagation();
      const tile = tiles.find(t => t.id === tileId);
      if (tile) {
        const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
        const rect = dropTargetRef.current!.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - positionX) / scale;
        const worldY = (e.clientY - rect.top - positionY) / scale;

        const exactX = worldX - WORLD_SIZE / 2;
        const exactY = worldY - WORLD_SIZE / 2;

        const logicalX = tile.x * TILE_SIZE + TILE_SIZE / 2;
        const logicalY = tile.y * TILE_SIZE + TILE_SIZE;

        setDragGrabOffset({
          x: exactX - (logicalX + (tile.offsetX || 0)),
          y: exactY - (logicalY + (tile.offsetY || 0))
        });

        setDraggingTile(tileId);
      }
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (isSpacePressed) return;
    
    if (selectedTool === 'select' || selectedTool === 'node') {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        selectNode(nodeId);
        
        const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
        const rect = dropTargetRef.current!.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - positionX) / scale;
        const worldY = (e.clientY - rect.top - positionY) / scale;
        
        const exactX = worldX - WORLD_SIZE / 2;
        const exactY = worldY - WORLD_SIZE / 2;
        
        const logicalX = node.x * TILE_SIZE + TILE_SIZE / 2;
        const logicalY = node.y * TILE_SIZE + TILE_SIZE / 2;
        
        setDragGrabOffset({
          x: exactX - logicalX,
          y: exactY - logicalY
        });
        
        setDraggingNode(nodeId);
      }
    } else if (selectedTool === 'erase') {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setUndoStack(prev => [...prev, { action: 'erase_node', nodeData: node }]);
        removeNode(nodeId);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed) return;
    if (e.button === 1) return;

    setIsDrawing(true);
    const isRightClick = e.button === 2;
    
    const forceErase = isRightClick; 
    const tool = forceErase ? 'erase' : selectedTool;

    if (isRightClick) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (tool === 'rotate') {
      const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
      const rect = dropTargetRef.current!.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - positionX) / scale;
      const worldY = (e.clientY - rect.top - positionY) / scale;
      const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
      const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

      const topTileId = getTopMostTileId(gx, gy);
      if (topTileId) {
        e.stopPropagation();
        rotateTile(topTileId, e.shiftKey ? -90 : 90);
      }
      return;
    }

    if (tool === 'select' || tool === 'erase') {
      const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
      const rect = dropTargetRef.current!.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - positionX) / scale;
      const worldY = (e.clientY - rect.top - positionY) / scale;
      const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
      const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

      const topTileId = getTopMostTileId(gx, gy);
      if (topTileId) {
        handlePropMouseDown(topTileId, e);
        if (tool === 'erase') return;
      }
    }

    if (tool !== 'select') {
      handleMapInteraction(e.clientX, e.clientY, false, e.shiftKey, forceErase, e.altKey, e.buttons || (isRightClick ? 2 : 1));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSpacePressed) return;
    
    const { brushMode: currentBrushMode } = useMapStore.getState();
    const isPaintOrErase = selectedTool === 'paint' || selectedTool === 'erase';

    if (isDrawing && (e.buttons > 0 || e.button === 2) && (!isPaintOrErase || currentBrushMode)) {
      e.stopPropagation();
      pendingBrushRef.current = { 
        clientX: e.clientX, 
        clientY: e.clientY, 
        isShift: e.shiftKey,
        isAlt: e.altKey,
        buttons: e.buttons
      };

      if (!brushRafRef.current) {
        brushRafRef.current = requestAnimationFrame(() => {
          if (pendingBrushRef.current) {
            const isRightClick = pendingBrushRef.current.buttons === 2 || pendingBrushRef.current.buttons === 3;
            handleMapInteraction(
              pendingBrushRef.current.clientX,
              pendingBrushRef.current.clientY,
              true,
              pendingBrushRef.current.isShift,
              isRightClick,
              pendingBrushRef.current.isAlt,
              pendingBrushRef.current.buttons
            );
          }
          brushRafRef.current = null;
        });
      }
    } else {
      handleMapInteraction(e.clientX, e.clientY, true, e.shiftKey, false, e.altKey, e.buttons);
    }
  };

  const handleMouseUp = async () => {
    const state = useMapStore.getState();
    setIsDrawing(false);

    if (selectedTool === 'stamp' && isSelecting) {
      setIsSelecting(false);
      handleCopySelection(); 
      return;
    }

    if (state.isDraggingTile && state.draggingTileId) {
      const tile = state.tiles.find(t => t.id === state.draggingTileId);
      if (tile) {
        await moveTile(tile.id, tile.x, tile.y, tile.offsetX || 0, tile.offsetY || 0);
      }
      setDraggingTile(null);
      setDragGrabOffset(null);
    }

    if (state.isDraggingNode && state.draggingNodeId) {
      const node = state.nodes.find(n => n.id === state.draggingNodeId);
      if (node) {
        await updateNode(node.id, { x: node.x, y: node.y });
      }
      setDraggingNode(null);
      setDragGrabOffset(null);
    }

    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    pendingDragUpdateRef.current = null;

    if (brushRafRef.current) {
      cancelAnimationFrame(brushRafRef.current);
      brushRafRef.current = null;
    }
    pendingBrushRef.current = null;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType') as NodeType;

    if (!nodeType || !activeNodeType) return;

    const rect = dropTargetRef.current!.getBoundingClientRect();
    const { x: dropX, y: dropY, scale: dropScale } = pixiTransformRef.current;
    const worldX = (e.clientX - rect.left - dropX) / dropScale;
    const worldY = (e.clientY - rect.top - dropY) / dropScale;

    const nodeX = nodeSnapToGrid ? Math.round(((worldX - WORLD_SIZE / 2) / TILE_SIZE) * 2) / 2 : (worldX - WORLD_SIZE / 2) / TILE_SIZE;
    const nodeY = nodeSnapToGrid ? Math.round(((worldY - WORLD_SIZE / 2) / TILE_SIZE) * 2) / 2 : (worldY - WORLD_SIZE / 2) / TILE_SIZE;

    const tolerance = 0.1; 
    const exists = nodes.find(n =>
      Math.abs(n.x - nodeX) < tolerance && Math.abs(n.y - nodeY) < tolerance
    );

    if (!exists) {
      setUndoStack(prev => [...prev, { action: 'node_add', x: nodeX, y: nodeY }]);
      addNode({ x: nodeX, y: nodeY, type: nodeType, name: `New ${nodeType}`, iconUrl: '' });
    }
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDrop,
    handleNodeMouseDown,
    handlePropMouseDown,
    isSelecting
  };
};
