'use client';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useMapStore, useTickStore, Tile, CustomTile } from '@/lib/store/mapStore';
import { useCursorStore } from '@/lib/store/cursorStore';
import { getPixiTextureCoords, getLiquidTextureCoords, getTileIdFromMask } from './mapUtils';

// Register PixiJS components for use in JSX
extend({
  Container: PIXI.Container,
  Sprite: PIXI.Sprite,
  Graphics: PIXI.Graphics,
  Text: PIXI.Text,
});

const PixiContainer = 'pixiContainer' as any;
const PixiSprite = 'pixiSprite' as any;
const PixiGraphics = 'pixiGraphics' as any;
const PixiText = 'pixiText' as any;

interface PixiMapCanvasProps {
  width: number; 
  height: number; 
  worldSize: number; 
  transformRef: React.MutableRefObject<{ x: number; y: number; scale: number }>;
  onPropMouseDown?: (tileId: string, e: any) => void;
  onNodeMouseDown?: (nodeId: string, e: any) => void;
  waterBaseTile?: CustomTile;
  foamStripTile?: CustomTile;
  showDebugNumbers?: boolean;
  showWalkabilityOverlay?: boolean;
  
  // Data passed down for rendering
  nodes: any[];
  selectedTool: string;
  isSpacePressed: boolean;
  brushMode: boolean;
  brushSize: number;
  selectedTileId: string | null;
  customTiles: CustomTile[];
}

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;

// --- Texture Cache for AutoTiling ---
const textureCache: Record<string, PIXI.Texture> = {};

// --- Helper to normalize URLs for comparison (ignoring query params) ---
const normalizeUrl = (url: string | undefined | null) => {
  if (!url) return '';
  return url.split('?')[0];
};

// --- Hook for Async Texture Loading ---
const useTexture = (url: string | undefined | null) => {
  // ⚡️ Check Pixi's memory cache synchronously first!
  const cachedTexture = useMemo(() => {
    if (!url) return null;
    return PIXI.Assets.get(url) || null;
  }, [url]);

  const [texture, setTexture] = useState<PIXI.Texture | null>(cachedTexture);

  useEffect(() => {
    // If it's already in memory, skip the async load entirely!
    if (!url || cachedTexture) return; 
    
    let isMounted = true;

    const load = async () => {
      try {
        const tex = await PIXI.Assets.load({
          src: url,
          data: { crossorigin: 'anonymous' }
        });
        
        if (isMounted) {
          if (tex.source) tex.source.scaleMode = 'nearest';
          setTexture(tex);
        }
      } catch (e) {
        if (isMounted) setTexture(null);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [url, cachedTexture]);

  return texture;
};

// --- Sub-component for individual Tile Rendering ---
const PixiTile = React.memo(React.forwardRef<PIXI.Sprite, any>(({ 
  texture, x, y, width, height, rotation, onMouseDown, isInteractive, 
  foamTexture, quarterTextures, foamQuarterTextures, debugInfo, zIndex 
}, ref) => {
  const drawPinkSquare = React.useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.rect(0, 0, width || 48, height || 48).fill({ color: 0xFF00FF, alpha: 0.8 });
  }, [width, height]);

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const debugStyle = useMemo(() => new PIXI.TextStyle({
    fontSize: 10, fill: '#ffffff', fontWeight: 'bold', stroke: { color: '#000000', width: 2 }, align: 'center'
  }), []);

  return (
    // Let Pixi sort children by zIndex on the GPU
    <PixiContainer zIndex={zIndex} x={centerX} y={centerY} rotation={rotation * (Math.PI / 180)} pivot={{ x: width / 2, y: height / 2 }}>
      {foamQuarterTextures ? (
        <PixiContainer alpha={0.8}>
          {foamQuarterTextures[0] && <PixiSprite texture={foamQuarterTextures[0]} x={0} y={0} width={width} height={height} />}
        </PixiContainer>
      ) : foamTexture && (
        <PixiSprite texture={foamTexture} x={0} y={0} width={48} height={48} alpha={0.8} />
      )}
      
      {quarterTextures ? (
        <PixiContainer eventMode={isInteractive ? 'static' : 'none'} onpointerdown={onMouseDown} cursor={isInteractive ? 'move' : 'default'}>
          {quarterTextures[0] && <PixiSprite texture={quarterTextures[0]} x={0} y={0} width={width} height={height} />}
        </PixiContainer>
      ) : texture ? (
        // Attach the ref so SmartPixiTile can mutate the texture directly
        <PixiSprite 
          ref={ref}
          texture={texture}
          width={width}
          height={height}
          eventMode={isInteractive ? 'static' : 'none'}
          onpointerdown={onMouseDown}
          cursor={isInteractive ? 'move' : 'default'}
        />
      ) : (
        <PixiGraphics draw={drawPinkSquare} />
      )}

      {debugInfo && (
        <PixiContainer x={width / 2} y={height / 2} alpha={0.9} pointerEvents="none">
          <PixiText 
            text={`${debugInfo.id}\n(m:${debugInfo.mask})`} 
            anchor={0.5} 
            style={debugStyle}
          />
        </PixiContainer>
      )}
    </PixiContainer>
  );
}));

PixiTile.displayName = 'PixiTile';

// --- Smart Tile Component ---
const SmartPixiTile = React.memo(({
  tile, customTileLookup, autoTileSheetUrl, dirtSheetUrl, waterSheetUrl, dirtv2SheetUrl, waterv2SheetUrl, isFoamEnabled, foamStripTile, worldSize, showDebugNumbers
}: {
  tile: Tile; customTileLookup: Map<string, CustomTile>; autoTileSheetUrl?: string | null; dirtSheetUrl?: string | null; waterSheetUrl?: string | null;
  dirtv2SheetUrl?: string | null; waterv2SheetUrl?: string | null;
  isFoamEnabled: boolean; foamStripTile?: CustomTile; worldSize: number; onPropMouseDown?: (tileId: string, e: any) => void;
  showDebugNumbers?: boolean; selectedTool?: string;
}) => {
  const normalizedTileUrl = normalizeUrl(tile.imageUrl);
  const liveCustomTile = customTileLookup.get(normalizedTileUrl);
  const tileLayer = tile.layer || 0;

  let mainUrl = tile.imageUrl;
  let effectiveSmartType = tile.smartType || 'grass';

  const isFrozenSmartTile = !tile.isAutoTile && !!tile.smartType && tile.bitmask !== undefined;
  if (tile.isAutoTile || isFrozenSmartTile) {
    if (effectiveSmartType === 'water' && waterSheetUrl) mainUrl = waterSheetUrl;
    else if (effectiveSmartType === 'dirt' && dirtSheetUrl) mainUrl = dirtSheetUrl;
    else if (effectiveSmartType === 'dirtv2' && dirtv2SheetUrl) mainUrl = dirtv2SheetUrl;
    else if (effectiveSmartType === 'waterv2' && waterv2SheetUrl) mainUrl = waterv2SheetUrl;
    else if (autoTileSheetUrl) mainUrl = autoTileSheetUrl;
  }

  const mainTextureBase = useTexture(mainUrl);
  const foamUrl = (isFoamEnabled && foamStripTile?.url && (tile.foamBitmask || 0) > 0) ? foamStripTile.url : null;
  const foamTextureBase = useTexture(foamUrl);

    const isSmartRendered = tile.isAutoTile || isFrozenSmartTile;
    const displayHeight = isSmartRendered ? TILE_SIZE : (liveCustomTile?.frameHeight || tile.frameHeight || TILE_SIZE);
    const displayWidth = isSmartRendered ? TILE_SIZE : (liveCustomTile?.frameWidth || tile.frameWidth || displayHeight);
    
    // Compute Z-Index so WebGL can do depth sorting natively
    const zIndex = (tileLayer * 100000) + (tile.y + (tile.offsetY || 0) / TILE_SIZE);

  const frameCount = liveCustomTile?.frameCount || tile.frameCount || 1;
  const isAnimated = (liveCustomTile?.isSpritesheet || tile.isSpritesheet) && frameCount > 1;
  const speed = Number(liveCustomTile?.animationSpeed || tile.animationSpeed || 1);

  const spriteRef = useRef<PIXI.Sprite | null>(null);
  const prevFrameRef = useRef(-1);

  const quarterTextures = useMemo(() => {
    if (!mainTextureBase || !mainTextureBase.source || !isSmartRendered) return null;

    const cacheKeyBase = `${mainUrl}-${tile.bitmask}-${tile.blockCol}-${tile.blockRow}`;

    try {
      const source = mainTextureBase.source;
      const coords = effectiveSmartType === 'water'
        ? getLiquidTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0)
        : getPixiTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0);

      return coords.map((q, i) => {
        const cacheKey = `${cacheKeyBase}-q${i}`;
        if (!textureCache[cacheKey]) {
          textureCache[cacheKey] = new PIXI.Texture({
            source,
            frame: new PIXI.Rectangle(q.sourceX, q.sourceY, q.sourceWidth, q.sourceHeight)
          });
        }
        return textureCache[cacheKey];
      });
    } catch (e) { return null; }
  }, [mainTextureBase, isSmartRendered, tile.bitmask, tile.blockCol, tile.blockRow, mainUrl, effectiveSmartType]);

  const foamQuarterTextures = useMemo(() => {
    if (!foamTextureBase || !foamTextureBase.source || (tile.foamBitmask || 0) === 0) return null;
    
    const cacheKeyBase = `foam-${foamUrl}-${tile.foamBitmask}`;

    try {
      const source = foamTextureBase.source;
      const coords = getPixiTextureCoords(tile.foamBitmask || 0, 0, 0); 
      
      return coords.map((q, i) => {
        const cacheKey = `${cacheKeyBase}-q${i}`;
        if (!textureCache[cacheKey]) {
          textureCache[cacheKey] = new PIXI.Texture({
            source,
            frame: new PIXI.Rectangle(q.sourceX, q.sourceY, q.sourceWidth, q.sourceHeight)
          });
        }
        return textureCache[cacheKey];
      });
    } catch (e) { return null; }
  }, [foamTextureBase, tile.foamBitmask, foamUrl]);

  // Base texture selection with caching for both static and animated tiles
  const texture = useMemo(() => {
    if (quarterTextures || !mainTextureBase || !mainTextureBase.source) return null;

    // Animated or spritesheet-based tiles default to frame 0; ticker will mutate
    if (isAnimated || ((liveCustomTile?.isSpritesheet || tile.isSpritesheet) && frameCount > 1)) {
      const cacheKey = `${mainUrl}-frame-0-${displayWidth}x${displayHeight}`;
      if (!textureCache[cacheKey]) {
        try {
          textureCache[cacheKey] = new PIXI.Texture({
            source: mainTextureBase.source,
            frame: new PIXI.Rectangle(0, 0, displayWidth, displayHeight)
          });
        } catch (e) { return null; }
      }
      return textureCache[cacheKey];
    }

    // Static tiles: cache by url and size to avoid leaks
    const cacheKey = `${mainUrl}-static-${displayWidth}x${displayHeight}`;
    if (!textureCache[cacheKey]) {
      try {
        textureCache[cacheKey] = new PIXI.Texture({
          source: mainTextureBase.source,
          frame: new PIXI.Rectangle(0, 0, displayWidth, displayHeight)
        });
      } catch (e) { return null; }
    }
    return textureCache[cacheKey];
  }, [mainTextureBase, quarterTextures, isAnimated, displayWidth, displayHeight, liveCustomTile, tile.isSpritesheet, frameCount, mainUrl]);

  const foamTexture = useMemo(() => {
    if (foamQuarterTextures || !foamTextureBase || !foamTextureBase.source) return null;
    const col = (tile.foamBitmask || 0) % 4;
    const row = Math.floor((tile.foamBitmask || 0) / 4);
    const cacheKey = `foam-${foamUrl}-${col}-${row}`;
    if (!textureCache[cacheKey]) {
      try {
        textureCache[cacheKey] = new PIXI.Texture({
          source: foamTextureBase.source,
          frame: new PIXI.Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        });
      } catch (e) { return null; }
    }
    return textureCache[cacheKey];
  }, [foamTextureBase, foamQuarterTextures, tile.foamBitmask, foamUrl]);

  // Silent ticker that mutates the GPU texture directly without React re-renders
  useTick(() => {
    const isWaterv2 = effectiveSmartType === 'waterv2';
    if ((!isAnimated && !isWaterv2) || !spriteRef.current || !mainTextureBase?.source) return;

    const globalTick = useTickStore.getState().globalTick;

    if (isWaterv2) {
      const NUM_FRAMES = 3;
      const durationTicks = 60; // 1 second at 60fps
      const currentFrame = Math.floor((globalTick % durationTicks) / (durationTicks / NUM_FRAMES)) % NUM_FRAMES;

      if (currentFrame !== prevFrameRef.current) {
        prevFrameRef.current = currentFrame;
        const coords = getLiquidTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0);
        const q = coords[0];
        const frameX = q.sourceX + (currentFrame * 576);
        const cacheKey = `waterv2-${mainUrl}-${tile.bitmask}-${tile.blockCol}-${tile.blockRow}-${currentFrame}`;

        if (!textureCache[cacheKey]) {
          try {
            textureCache[cacheKey] = new PIXI.Texture({
              source: mainTextureBase.source,
              frame: new PIXI.Rectangle(frameX, q.sourceY, q.sourceWidth, q.sourceHeight)
            });
          } catch (e) { return; }
        }
        spriteRef.current.texture = textureCache[cacheKey];
      }
      return;
    }

    const currentFrame = Math.floor(globalTick * speed) % frameCount;

    if (currentFrame !== prevFrameRef.current) {
      prevFrameRef.current = currentFrame;
      const cacheKey = `${mainUrl}-frame-${currentFrame}-${displayWidth}x${displayHeight}`;

      if (!textureCache[cacheKey]) {
        const frameX = currentFrame * displayWidth;
        try {
          textureCache[cacheKey] = new PIXI.Texture({
            source: mainTextureBase.source,
            frame: new PIXI.Rectangle(
              mainTextureBase.source.width >= frameX + displayWidth ? frameX : 0,
              0,
              displayWidth,
              displayHeight
            )
          });
        } catch (e) { return; }
      }

      spriteRef.current.texture = textureCache[cacheKey];
    }
  });

  const x = tile.x * TILE_SIZE + worldSize / 2 + (tile.offsetX || 0) - (displayWidth - TILE_SIZE) / 2;
  const y = tile.y * TILE_SIZE + worldSize / 2 + (tile.offsetY || 0) - (displayHeight - TILE_SIZE);

  const debugInfo = (showDebugNumbers && tile.isAutoTile) ? {
    id: getTileIdFromMask(tile.bitmask || 0),
    mask: tile.bitmask || 0
  } : null;

  return (
    <PixiTile
      ref={spriteRef}
      zIndex={zIndex}
      texture={texture}
      x={x}
      y={y}
      width={displayWidth}
      height={displayHeight}
      rotation={tile.rotation || 0}
      isInteractive={false}
      onMouseDown={undefined}
      foamTexture={foamTexture}
      quarterTextures={quarterTextures || undefined}
      foamQuarterTextures={foamQuarterTextures || undefined}
      debugInfo={debugInfo}
    />
  );
});

SmartPixiTile.displayName = 'SmartPixiTile';

// --- Inner scene: lives inside <Application> so useTick is available ---
interface PixiSceneProps {
  transformRef: React.MutableRefObject<{ x: number; y: number; scale: number }>;
  width: number;
  height: number;
  worldSize: number;
  tileElements: React.ReactNode;
  tiles: Tile[];
  selection: any;
  showWalkabilityOverlay: boolean;
  cullBox: { minX: number; minY: number; maxX: number; maxY: number };
  setCullBox: (box: { minX: number; minY: number; maxX: number; maxY: number }) => void;
}

const PixiScene: React.FC<PixiSceneProps> = ({
  transformRef, width, height, worldSize, tileElements, tiles, selection,
  showWalkabilityOverlay, cullBox, setCullBox
}) => {
  const containerRef = useRef<PIXI.Container>(null);
  const walkabilityOverlayRef = useRef<PIXI.Graphics>(null);
  const selectionRef = useRef<PIXI.Graphics>(null);

  // Each Pixi tick: sync transform ref → container (no React state, no re-render)
  useTick(() => {
    const c = containerRef.current;
    if (!c) return;
    const t = transformRef.current;
    c.x = t.x;
    c.y = t.y;
    c.scale.set(t.scale);

    // Cull box lazy update: only recalculate when viewport approaches the safe-zone edge
    if (width && height && t.scale) {
      const vw = width / t.scale;
      const vh = height / t.scale;
      const viewportLeft = -t.x / t.scale;
      const viewportTop = -t.y / t.scale;
      const viewportRight = viewportLeft + vw;
      const viewportBottom = viewportTop + vh;
      
      // Update when we're within 20% of the edge of our current cullBox buffer
      const triggerBufferX = vw * 0.2;
      const triggerBufferY = vh * 0.2;

      if (
        viewportLeft < cullBox.minX + triggerBufferX ||
        viewportTop < cullBox.minY + triggerBufferY ||
        viewportRight > cullBox.maxX - triggerBufferX ||
        viewportBottom > cullBox.maxY - triggerBufferY
      ) {
        setCullBox({
          minX: viewportLeft - vw,
          minY: viewportTop - vh,
          maxX: viewportRight + vw,
          maxY: viewportBottom + vh
        });
      }
    }
  });

  // Walkability overlay: redraw when tiles/visibility/cullBox change
  useEffect(() => {
    const g = walkabilityOverlayRef.current;
    if (!g) return;
    g.clear();
    if (!showWalkabilityOverlay) return;
    const { minX, minY, maxX, maxY } = cullBox;
    const BAR = 5;
    
    // 🔥 UNIFICATION: Use a Set to track cells we've already tinted red
    const tintedCells = new Set<string>();

    tiles.forEach(tile => {
      if (typeof tile.x !== 'number' || typeof tile.y !== 'number') return;
      const wx = tile.x * TILE_SIZE + worldSize / 2;
      const wy = tile.y * TILE_SIZE + worldSize / 2;
      
      if (wx + TILE_SIZE < minX || wx > maxX || wy + TILE_SIZE < minY || wy > maxY) return;

      const cellKey = `${tile.x},${tile.y}`;

      if (tile.isWalkable === false && !tintedCells.has(cellKey)) {
        // Full block — red fill (only draw once per cell)
        g.rect(wx, wy, TILE_SIZE, TILE_SIZE).fill({ color: 0xDC2626, alpha: 0.35 });
        tintedCells.add(cellKey);
      } else if (tile.layer === -3 && tile.edgeBlocks) {
        // Edge block — orange bars on blocked edges
        const bits = tile.edgeBlocks;
        if (bits & 1) g.rect(wx, wy, TILE_SIZE, BAR).fill({ color: 0xF97316, alpha: 0.85 });           // N
        if (bits & 2) g.rect(wx + TILE_SIZE - BAR, wy, BAR, TILE_SIZE).fill({ color: 0xF97316, alpha: 0.85 }); // E
        if (bits & 4) g.rect(wx, wy + TILE_SIZE - BAR, TILE_SIZE, BAR).fill({ color: 0xF97316, alpha: 0.85 }); // S
        if (bits & 8) g.rect(wx, wy, BAR, TILE_SIZE).fill({ color: 0xF97316, alpha: 0.85 });           // W
      }
    });
  }, [showWalkabilityOverlay, tiles, cullBox, worldSize]);

  // Selection overlay
  useEffect(() => {
    const g = selectionRef.current;
    if (!g) return;
    g.clear();
    if (!selection) return;

    const startX = Math.min(selection.start.x, selection.end.x);
    const endX = Math.max(selection.start.x, selection.end.x);
    const startY = Math.min(selection.start.y, selection.end.y);
    const endY = Math.max(selection.start.y, selection.end.y);

    const selWidth = (endX - startX + 1) * TILE_SIZE;
    const selHeight = (endY - startY + 1) * TILE_SIZE;
    const sx = startX * TILE_SIZE + worldSize / 2;
    const sy = startY * TILE_SIZE + worldSize / 2;
    const strokeWidth = 2 / (transformRef.current.scale || 1);

    g.rect(sx, sy, selWidth, selHeight)
      .fill({ color: 0x22d3ee, alpha: 0.2 })
      .stroke({ width: strokeWidth, color: 0x22d3ee });
  }, [selection, worldSize, transformRef]);

  return (
    <PixiContainer ref={containerRef}>
      {tileElements}
      {/* Ensure overlays always render above tiles */}
      <PixiGraphics ref={walkabilityOverlayRef} zIndex={999998} />
      <PixiGraphics ref={selectionRef} zIndex={999999} />
    </PixiContainer>
  );
};

export const PixiMapCanvas = React.memo<PixiMapCanvasProps>(({ 
  width, height, worldSize, transformRef, onPropMouseDown, waterBaseTile, foamStripTile, showDebugNumbers,
  showWalkabilityOverlay,
  nodes, selectedTool, isSpacePressed, brushMode, brushSize, selectedTileId
}) => {
  const customTiles = useMapStore(state => state.customTiles);
  const tiles = useMapStore(state => state.tiles);
  const isFoamEnabled = useMapStore(state => state.isFoamEnabled);
  const autoTileSheetUrl = useMapStore(state => state.autoTileSheetUrl);
  const dirtSheetUrl = useMapStore(state => state.dirtSheetUrl);
  const waterSheetUrl = useMapStore(state => state.waterSheetUrl);
  const dirtv2SheetUrl = useMapStore(state => state.dirtv2SheetUrl);
  const waterv2SheetUrl = useMapStore(state => state.waterv2SheetUrl);
  const selection = useMapStore(state => state.selection);

  // Pre-calculate custom tile lookup map for O(1) access during culling and rendering
  const customTileLookup = useMemo(() => {
    const map = new Map<string, CustomTile>();
    customTiles.forEach(ct => {
      map.set(normalizeUrl(ct.url), ct);
    });
    return map;
  }, [customTiles]);

  // Stable callback for tile interactions to prevent breaking React.memo
  const onPropMouseDownRef = useRef(onPropMouseDown);
  useEffect(() => {
    onPropMouseDownRef.current = onPropMouseDown;
  }, [onPropMouseDown]);

  const stableOnPropMouseDown = useCallback((tileId: string, e: any) => {
    if (onPropMouseDownRef.current) {
      onPropMouseDownRef.current(tileId, e);
    }
  }, []);

  // Culling box — updated lazily by PixiScene's useTick, not on every transform change
  const [cullBox, setCullBox] = useState({ minX: -999999, minY: -999999, maxX: 999999, maxY: 999999 });

  // Camera frustum culling + JS depth sort
  const visibleTiles = useMemo(() => {
    const { minX, minY, maxX, maxY } = cullBox;

    const visible = tiles.filter(tile => {
      const normalizedTileUrl = normalizeUrl(tile.imageUrl);
      const customTile = customTileLookup.get(normalizedTileUrl);
      
      const isFrozenSmart = !tile.isAutoTile && !!tile.smartType && tile.bitmask !== undefined;
      const isSmartSize = (tile.isAutoTile || isFrozenSmart) && (tile.layer || 0) === 0;
      const displayWidth = isSmartSize ? TILE_SIZE : (customTile?.frameWidth || tile.frameWidth || TILE_SIZE);
      const displayHeight = isSmartSize ? TILE_SIZE : (customTile?.frameHeight || tile.frameHeight || TILE_SIZE);

      if (typeof tile.x !== 'number' || typeof tile.y !== 'number' || isNaN(tile.x) || isNaN(tile.y)) {
        return false;
      }

      const tileWorldX = tile.x * TILE_SIZE + worldSize / 2 + (tile.offsetX || 0) - (displayWidth - TILE_SIZE) / 2;
      const tileWorldY = tile.y * TILE_SIZE + worldSize / 2 + (tile.offsetY || 0) - (displayHeight - TILE_SIZE);

      return (
        tileWorldX + displayWidth >= minX &&
        tileWorldX <= maxX &&
        tileWorldY + displayHeight >= minY &&
        tileWorldY <= maxY
      );
    });

    // Deterministic draw order without Pixi sortableChildren:
    return visible.sort((a, b) => {
      const layerA = a.layer || 0;
      const layerB = b.layer || 0;
      if (layerA !== layerB) return layerA - layerB;
      if (layerA > 0) return (a.y + (a.offsetY || 0) / TILE_SIZE) - (b.y + (b.offsetY || 0) / TILE_SIZE);
      return 0;
    });
  }, [tiles, customTileLookup, cullBox, worldSize]);

  const tileElements = useMemo(() => {
    return visibleTiles.map(tile => (
      <SmartPixiTile
        key={`${tile.id}-${tile.bitmask}-${tile.foamBitmask}`} tile={tile} customTileLookup={customTileLookup}
        autoTileSheetUrl={autoTileSheetUrl} dirtSheetUrl={dirtSheetUrl} waterSheetUrl={waterSheetUrl}
        dirtv2SheetUrl={dirtv2SheetUrl} waterv2SheetUrl={waterv2SheetUrl}
        isFoamEnabled={isFoamEnabled} foamStripTile={foamStripTile} worldSize={worldSize}
        showDebugNumbers={showDebugNumbers}
      />
    ));
  }, [
    visibleTiles, customTileLookup, autoTileSheetUrl, dirtSheetUrl, waterSheetUrl,
    dirtv2SheetUrl, waterv2SheetUrl,
    isFoamEnabled, foamStripTile, worldSize, showDebugNumbers
  ]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      <Application 
        width={width || 800} height={height || 600} backgroundColor={0x000000} backgroundAlpha={0}      
        antialias={false} resolution={window.devicePixelRatio || 1} autoDensity={true}
        roundPixels={true}
      >
        <PixiScene
          transformRef={transformRef}
          width={width}
          height={height}
          worldSize={worldSize}
          tileElements={tileElements}
          tiles={tiles}
          selection={selection}
          showWalkabilityOverlay={showWalkabilityOverlay ?? false}
          cullBox={cullBox}
          setCullBox={setCullBox}
        />
      </Application>
    </div>
  );
});

PixiMapCanvas.displayName = 'PixiMapCanvas';
