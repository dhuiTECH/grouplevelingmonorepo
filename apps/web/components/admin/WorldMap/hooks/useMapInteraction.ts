import { useRef, useState } from 'react';
import { useMapStore, NodeType } from '@/lib/store/mapStore';
import { useCursorStore } from '@/lib/store/cursorStore';
import { usePaintTool } from './tools/usePaintTool';
import { useCollisionTool } from './tools/useCollisionTool';
import { normalizeUrl } from '@/components/admin/WorldMap/mapUtils';

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;

export const useMapInteraction = (
  pixiTransformRef: React.MutableRefObject<any>,
  transformComponentRef: React.MutableRefObject<any>,
  dropTargetRef: React.MutableRefObject<HTMLDivElement | null>,
  isSpacePressed: boolean
) => {
  const {
    nodes, tiles, customTiles, selectedTool, selectedTileId, selectedSmartType,
    setUndoStack, removeNode, updateNode,
    selectNode, setDraggingNode, setDragGrabOffset, setDraggingTile,
    rotateTile, removeTileById, setSelection, setCurrentStamp, selectTile,
    moveTile, setTool, nodeSnapToGrid, activeNodeType, addNode, smartBrushLock,
    layerSettings,
  } = useMapStore();

  const { setCursorCoords, setSmoothCursorCoords, setIsDrawing } = useCursorStore.getState();

  const { executePaint, executeErase } = usePaintTool();
  const { executeCollision } = useCollisionTool();

  const dragRafRef = useRef<number | null>(null);
  const pendingDragUpdateRef = useRef<{x: number, y: number} | null>(null);
  const brushRafRef = useRef<number | null>(null);
  const pendingBrushRef = useRef<{clientX: number, clientY: number, isShift: boolean, isAlt: boolean, buttons: number} | null>(null);
  const lastInteractionRef = useRef<{gx: number, gy: number, tool: string} | null>(null);
  const drawingModeRef = useRef<'adding' | 'removing' | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const getTopMostTileId = (gx: number, gy: number, worldX?: number, worldY?: number) => {
    if (worldX !== undefined && worldY !== undefined) {
      const wx = worldX - WORLD_SIZE / 2;
      const wy = worldY - WORLD_SIZE / 2;

      const containingTiles = tiles.filter(tile => {
        const normalizedTileUrl = normalizeUrl(tile.imageUrl);
        const customTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizedTileUrl);
        
        const isFrozenSmart = !tile.isAutoTile && !!tile.smartType && tile.bitmask !== undefined;
        const isSmartSize = (tile.isAutoTile || isFrozenSmart) && (tile.layer || 0) === 0;
        const displayWidth = isSmartSize ? TILE_SIZE : (customTile?.frameWidth || tile.frameWidth || TILE_SIZE);
        const displayHeight = isSmartSize ? TILE_SIZE : (customTile?.frameHeight || tile.frameHeight || TILE_SIZE);

        const tileWorldX = tile.x * TILE_SIZE + (tile.offsetX || 0) - (displayWidth - TILE_SIZE) / 2;
        const tileWorldY = tile.y * TILE_SIZE + (tile.offsetY || 0) - (displayHeight - TILE_SIZE);

        return (wx >= tileWorldX && wx <= tileWorldX + displayWidth && wy >= tileWorldY && wy <= tileWorldY + displayHeight);
      });

      if (containingTiles.length > 0) {
        return containingTiles.sort((a, b) => {
          if ((b.layer || 0) !== (a.layer || 0)) return (b.layer || 0) - (a.layer || 0);
          return (b.y + (b.offsetY || 0) / TILE_SIZE) - (a.y + (a.offsetY || 0) / TILE_SIZE);
        })[0].id;
      }
    }

    const tilesAtPos = tiles.filter(t => t.x === gx && t.y === gy);
    if (tilesAtPos.length === 0) return null;
    return tilesAtPos.sort((a, b) => (b.layer || 0) - (a.layer || 0))[0].id;
  };

  const getNodeAtWorldPos = (worldX: number, worldY: number) => {
    const wx = worldX - WORLD_SIZE / 2;
    const wy = worldY - WORLD_SIZE / 2;
    return nodes.find(node => {
      const nodeX = node.x * TILE_SIZE;
      const nodeY = node.y * TILE_SIZE;
      return (wx >= nodeX && wx <= nodeX + TILE_SIZE && wy >= nodeY && wy <= nodeY + TILE_SIZE);
    });
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

    const tool = (selectedTool === 'collision') ? 'collision' : (forceErase ? 'erase' : (isAlt ? 'eyedropper' : selectedTool));

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
              useMapStore.setState(s => ({ nodes: s.nodes.map(n => n.id === node.id ? { ...n, x: pending.x, y: pending.y } : n) }));
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
      const isBrushMode = (tool === 'paint' || tool === 'erase' || tool === 'collision') && currentBrushMode && (currentBrushSize > 1 || tool === 'erase' || tool === 'collision');
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

    // Build the Brush Area Matrix
    let brushArea = [{dx: 0, dy: 0}];
    const { brushMode: currentBrushMode, brushSize: currentBrushSize } = state;
    if ((tool === 'paint' || tool === 'erase' || tool === 'collision') && currentBrushMode && currentBrushSize > 1) {
      const half = Math.floor(currentBrushSize / 2);
      const isEven = currentBrushSize % 2 === 0;
      brushArea = [];
      for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
        for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
          brushArea.push({dx, dy});
        }
      }
    }

    if (tool === 'paint') {
      await executePaint(gx, gy, worldX, worldY, isMove, isShift, brushArea);
    } else if (tool === 'erase') {
      await executeErase(gx, gy, isMove, brushArea);
    } else if (tool === 'collision') {
      await executeCollision(gx, gy, isMove, forceErase, drawingModeRef, brushArea);
    } else if (tool === 'stamp') {
      if (state.currentStamp) await handlePasteStamp(gx, gy);
      else {
        if (!isMove) {
          setIsSelecting(true);
          setSelection({ start: { x: gx, y: gy }, end: { x: gx, y: gy } });
        } else if (isSelecting && state.selection) {
          setSelection({ ...state.selection, end: { x: gx, y: gy } });
        }
      }
    } else if (tool === 'eyedropper') {
      const topTile = tiles.filter(t => t.x === gx && t.y === gy).sort((a, b) => (b.layer || 0) - (a.layer || 0))[0];
      if (topTile) {
        state.setCurrentStamp([{ ...topTile, id: '', x: 0, y: 0, isAutoTile: false }]);
        setTool('stamp');
        setIsDrawing(false);
        const foundCustomTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizeUrl(topTile.imageUrl));
        if (foundCustomTile) selectTile(foundCustomTile.id);
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

    // Only capture the topmost tile per grid cell (highest layer)
    const tilesInRect = state.tiles.filter(t => 
      t.x >= startX && t.x <= endX && t.y >= startY && t.y <= endY
    );

    const topByCell = new Map<string, typeof tilesInRect[number]>();
    tilesInRect.forEach(t => {
      const key = `${t.x},${t.y}`;
      const current = topByCell.get(key);
      const layer = t.layer || 0;
      if (!current || (current.layer || 0) < layer) {
        topByCell.set(key, t);
      }
    });

    const capturedTiles = Array.from(topByCell.values()).map(t => ({
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
      return { ...rest, x: gx + t.x, y: gy + t.y, isAutoTile: false };
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
        const layerKey = tile.layer ?? 0;
        // If this layer is locked in the sidebar, do not allow right-click erase
        if (layerSettings[layerKey]?.locked) {
          return;
        }
        setUndoStack((prev: any[]) => [
          ...prev,
          { action: 'erase_tile', x: tile.x, y: tile.y, layer: tile.layer || 0, previousTile: tile },
        ]);
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
        
        setDragGrabOffset({ x: exactX - logicalX, y: exactY - logicalY });
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
    const tool = (selectedTool === 'collision') ? 'collision' : (forceErase ? 'erase' : selectedTool);

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

      const node = getNodeAtWorldPos(worldX, worldY);
      if (node) {
        if (tool === 'erase') {
          setUndoStack(prev => [...prev, { action: 'erase_node', nodeData: node }]);
          removeNode(node.id);
          return;
        }
        handleNodeMouseDown(node.id, e);
        return;
      }

      const topTileId = getTopMostTileId(gx, gy, worldX, worldY);
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
    const { isDrawing } = useCursorStore.getState();
    const isPaintEraseOrCollision = selectedTool === 'paint' || selectedTool === 'erase' || selectedTool === 'collision';

    if (isDrawing && (e.buttons > 0 || e.button === 2) && (!isPaintEraseOrCollision || currentBrushMode)) {
      e.stopPropagation();
      pendingBrushRef.current = { 
        clientX: e.clientX, clientY: e.clientY, 
        isShift: e.shiftKey, isAlt: e.altKey, buttons: e.buttons
      };

      if (!brushRafRef.current) {
        brushRafRef.current = requestAnimationFrame(() => {
          if (pendingBrushRef.current) {
            const isRightClick = pendingBrushRef.current.buttons === 2 || pendingBrushRef.current.buttons === 3;
            handleMapInteraction(
              pendingBrushRef.current.clientX, pendingBrushRef.current.clientY, true,
              pendingBrushRef.current.isShift, isRightClick, pendingBrushRef.current.isAlt, pendingBrushRef.current.buttons
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
    drawingModeRef.current = null;

    if (selectedTool === 'stamp' && isSelecting) {
      setIsSelecting(false);
      handleCopySelection(); 
      return;
    }

    if (state.isDraggingTile && state.draggingTileId) {
      const tile = state.tiles.find(t => t.id === state.draggingTileId);
      if (tile) await moveTile(tile.id, tile.x, tile.y, tile.offsetX || 0, tile.offsetY || 0);
      setDraggingTile(null);
      setDragGrabOffset(null);
    }

    if (state.isDraggingNode && state.draggingNodeId) {
      const node = state.nodes.find(n => n.id === state.draggingNodeId);
      if (node) await updateNode(node.id, { x: node.x, y: node.y });
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
  if (!nodeType) return;

    const rect = dropTargetRef.current!.getBoundingClientRect();
    const { x: dropX, y: dropY, scale: dropScale } = pixiTransformRef.current;
    const worldX = (e.clientX - rect.left - dropX) / dropScale;
    const worldY = (e.clientY - rect.top - dropY) / dropScale;

    const nodeX = nodeSnapToGrid ? Math.round(((worldX - WORLD_SIZE / 2) / TILE_SIZE) * 2) / 2 : (worldX - WORLD_SIZE / 2) / TILE_SIZE;
    const nodeY = nodeSnapToGrid ? Math.round(((worldY - WORLD_SIZE / 2) / TILE_SIZE) * 2) / 2 : (worldY - WORLD_SIZE / 2) / TILE_SIZE;

    const tolerance = 0.1; 
    const exists = nodes.find(n => Math.abs(n.x - nodeX) < tolerance && Math.abs(n.y - nodeY) < tolerance);

    if (!exists) {
      setUndoStack((prev: any[]) => [...prev, { action: 'node_add', x: nodeX, y: nodeY }]);
      await addNode({ x: nodeX, y: nodeY, type: nodeType, name: `New ${nodeType}`, iconUrl: '' });
    }
  };

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleDrop, handleNodeMouseDown, handlePropMouseDown, isSelecting };
};
