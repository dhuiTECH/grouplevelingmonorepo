import React, { useMemo, useEffect, useRef, useCallback } from "react";
import { useWindowDimensions, View, StyleSheet } from "react-native";
import {
  Canvas,
  Group,
  Fill,
  Rect as SkiaRect,
  LinearGradient,
  RadialGradient,
  useClock,
  Skia,
  FilterMode,
  Circle,
  Image as SkiaImage,
  vec,
} from "@shopify/react-native-skia";
import Reanimated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  Easing,
  useAnimatedStyle,
  runOnJS,
  SharedValue,
  cancelAnimation,
  useAnimatedReaction,
} from "react-native-reanimated";
import { useSkiaAssets } from "./useSkiaAssets";
import { SkiaTile } from "./SkiaTile";
import { useTileLibrary } from "../../contexts/TileContext";
import { SkiaLayeredAvatar } from "./SkiaLayeredAvatar";
import { SkiaPetSprite } from "./SkiaPetSprite";
import { getPixiTextureCoords, getLiquidTextureCoords } from "./mapUtils";
import { CloudLayer } from "../environment/CloudLayer";
import { STEPS_PER_TILE } from "@/hooks/useLocalMovementBudget";

interface SkiaWorldMapProps {
  visionGrid: any[];
  nodesInVision?: any[];
  mapSettings: any;
  spawnX: number;
  spawnY: number;
  activePet?: any;
  tileSize: number;
  showWalkabilityOverlay?: boolean;
  children?: React.ReactNode;
  pendingDir: SharedValue<number>;
  activeDirection: SharedValue<"UP" | "DOWN" | "LEFT" | "RIGHT" | null>;
  isRunning: SharedValue<boolean>;
  isMoving: SharedValue<boolean>;
  /** Mirrors profile `steps_banked` for UI-thread gate; each tile spends STEPS_PER_TILE */
  movementBudget: SharedValue<number>;
  /** Deducts cost from bank (React + SharedValue); called when a tile move completes. */
  spendMovementBudget: (cost: number) => boolean;
  mapLeft: SharedValue<number>;
  mapTop: SharedValue<number>;
  onTileEnter?: (x: number, y: number) => void;
  playerBaseX: SharedValue<number>;
  playerBaseY: SharedValue<number>;
  facingScaleX: SharedValue<number>;
  petOffsetX: SharedValue<number>;
  petOffsetY: SharedValue<number>;
  petScaleX: SharedValue<number>;
  petZIndex: SharedValue<number>;
  avatarData: any;
  allShopItems?: any[];
  /** When false, skip the screen-space vignette (multiply + radial gradient). Default true. */
  enableAtmosphere?: boolean;
  /** If set, replaces the vignette edge color (second RadialGradient stop). */
  atmosphereOverride?: string | null;
  /** When false, cloud drop shadows are not drawn. Default true. */
  enableCloudShadows?: boolean;
  /** Fired from the movement worklet when a tile step actually starts (sync with isMoving). */
  onTileMoveStart?: (running: boolean) => void;
  /** Fired when a move was requested but blocked (stamina or collision). */
  onTileMoveBlocked?: (reason: "stamina" | "collision") => void;
  /** Ref forwarded to the Skia Canvas for snapshot capture. */
  canvasRef?: React.RefObject<any>;
}

// Frame-based movement: fixed px per frame (3 = walk, 6 = run). Durations in ms for reference only.
// At 60fps, 48px / 3px per frame = 16 frames. 16 * 16.67ms = 266.7ms
const WALK_DURATION = 220;
// At 60fps, 48px / 6px per frame = 8 frames. 8 * 16.67ms = 133.3ms
const RUN_DURATION = 134;

/** Matches `PixiMapCanvas` SmartPixiTile / `TILE_SIZE` in the world map editor (depth in grid units). */
const EDITOR_TILE_SIZE_PX = 48;

const SkiaWorldMapInternal: React.FC<SkiaWorldMapProps> = ({
  visionGrid,
  nodesInVision,
  mapSettings,
  spawnX,
  spawnY,
  activePet,
  tileSize,
  showWalkabilityOverlay,
  children,
  pendingDir,
  activeDirection,
  isRunning,
  isMoving,
  movementBudget,
  spendMovementBudget,
  mapLeft,
  mapTop,
  onTileEnter,
  playerBaseX,
  playerBaseY,
  facingScaleX,
  petOffsetX,
  petOffsetY,
  petScaleX,
  petZIndex,
  avatarData,
  allShopItems,
  enableAtmosphere = true,
  atmosphereOverride = null,
  enableCloudShadows = true,
  onTileMoveStart,
  onTileMoveBlocked,
  canvasRef,
}) => {
  const { width, height } = useWindowDimensions();

  /** Softer edge than 0.4 so vignette does not cancel the warm sun side */
  const vignetteEdgeColor = atmosphereOverride ?? "rgba(26, 24, 44, 0.28)";

  const { tileLibrary } = useTileLibrary();
  const petBehindOpacity = useDerivedValue(() =>
    petZIndex.value < 100 ? 1 : 0,
  );
  const petInFrontOpacity = useDerivedValue(() =>
    petZIndex.value >= 100 ? 1 : 0,
  );

  const visibleGrid = useMemo(() => {
    if (!visionGrid || visionGrid.length === 0) return [];

    // Viewport culling — must stay in sync with the *camera*, not only gridCenter.
    // useExploration refreshes gridCenter every GRID_REFRESH_DISTANCE (5) steps while
    // mapLeft/mapTop follow the player every tile, so the viewport can drift by up to
    // ~4 tiles. Culling around the vision-grid center only caused tiles/NPCs to pop
    // in and out at the edges (read as “jitter” / assets not staying loaded).
    const BUFFER_X = 8;
    const BUFFER_Y_TOP = 8;
    const BUFFER_Y_BOTTOM = 15;
    const CAMERA_DRIFT_BUFFER = 10;

    const screenTilesX = Math.ceil(width / tileSize);
    const screenTilesY = Math.ceil(height / tileSize);
    const halfScreenX = Math.ceil(screenTilesX / 2);
    const halfScreenY = Math.ceil(screenTilesY / 2);

    // Calculate grid center to proxy player viewport
    let minG = Infinity,
      maxG = -Infinity,
      minGY = Infinity,
      maxGY = -Infinity;
    for (let i = 0; i < visionGrid.length; i++) {
      const c = visionGrid[i];
      if (c.x < minG) minG = c.x;
      if (c.x > maxG) maxG = c.x;
      if (c.y < minGY) minGY = c.y;
      if (c.y > maxGY) maxGY = c.y;
    }
    const centerX = (minG + maxG) / 2;
    const centerY = (minGY + maxGY) / 2;

    const minX = centerX - halfScreenX - BUFFER_X - CAMERA_DRIFT_BUFFER;
    const maxX = centerX + halfScreenX + BUFFER_X + CAMERA_DRIFT_BUFFER;
    const minY = centerY - halfScreenY - BUFFER_Y_TOP - CAMERA_DRIFT_BUFFER;
    const maxY = centerY + halfScreenY + BUFFER_Y_BOTTOM + CAMERA_DRIFT_BUFFER;

    return visionGrid.filter(
      (cell) =>
        cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY,
    );
  }, [visionGrid, tileSize]);

  // Extract URLs to load - optimized to avoid unnecessary Set operations
  const urlsToLoad = useMemo(() => {
    const urls = new Set<string>();
    if (mapSettings?.cleanAutotileSheetUrl)
      urls.add(mapSettings.cleanAutotileSheetUrl);
    if (mapSettings?.cleanDirtSheetUrl) urls.add(mapSettings.cleanDirtSheetUrl);
    if (mapSettings?.cleanWaterSheetUrl)
      urls.add(mapSettings.cleanWaterSheetUrl);
    if (mapSettings?.cleanDirtv2SheetUrl)
      urls.add(mapSettings.cleanDirtv2SheetUrl);
    if (mapSettings?.cleanWaterv2SheetUrl)
      urls.add(mapSettings.cleanWaterv2SheetUrl);
    if (mapSettings?.cleanFoamSheetUrl) urls.add(mapSettings.cleanFoamSheetUrl);

    const walkSheet =
      activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;
    if (walkSheet?.url) urls.add(walkSheet.url.split("?")[0]);

    // Decode textures for the full vision grid so assets are ready before culled tiles
    // enter the draw window (avoids flash when gridCenter lags the camera).
    if (visionGrid) {
      for (let i = 0; i < visionGrid.length; i++) {
        const cell = visionGrid[i];
        if (cell?.tiles) {
          for (let j = 0; j < cell.tiles.length; j++) {
            const t = cell.tiles[j];
            if (t.cleanUrl) urls.add(t.cleanUrl);
          }
        }
      }
    }

    if (nodesInVision) {
      for (let i = 0; i < nodesInVision.length; i++) {
        const url = nodesInVision[i].icon_url;
        if (url) urls.add(url.split("?")[0]);
      }
    }

    if (avatarData) {
      const equipped = avatarData.cosmetics?.filter((c: any) => c.equipped) || [];
      const baseSkin = equipped.find((c: any) => {
        const s = c.shop_items?.slot?.trim().toLowerCase();
        return s === 'avatar' || s === 'base_body';
      });
      const baseUrl = baseSkin?.shop_items?.image_url || avatarData.base_body_url || avatarData.avatar_url;
      if (baseUrl) urls.add(baseUrl.split("?")[0]);
      if (avatarData.base_body_silhouette_url) urls.add(avatarData.base_body_silhouette_url.split("?")[0]);

      for (const c of equipped) {
        const item = c.shop_items;
        if (!item) continue;
        if (item.image_url) urls.add(item.image_url.split("?")[0]);
        if (item.image_url_female) urls.add(item.image_url_female.split("?")[0]);
        if (item.image_base_url) urls.add(item.image_base_url.split("?")[0]);
        if (item.silhouette_url) urls.add(item.silhouette_url.split("?")[0]);
        if (item.eraser_mask_url) urls.add(item.eraser_mask_url.split("?")[0]);
        if (item.eraser_mask_url_female) urls.add(item.eraser_mask_url_female.split("?")[0]);
      }

      const weapon = equipped.find((c: any) => c.shop_items?.slot?.trim().toLowerCase() === 'weapon');
      const gripType = weapon?.shop_items?.grip_type;
      if (gripType && allShopItems) {
        const ownedGrip = avatarData.cosmetics?.find((c: any) =>
          c.shop_items?.slot?.trim().toLowerCase() === 'hand_grip' &&
          c.shop_items?.grip_type?.toLowerCase() === gripType.toLowerCase()
        );
        const gripItem = ownedGrip?.shop_items || allShopItems.find((item: any) =>
          item.slot?.trim().toLowerCase() === 'hand_grip' &&
          item.grip_type?.toLowerCase() === gripType.toLowerCase()
        );
        if (gripItem) {
          if (gripItem.image_url) urls.add(gripItem.image_url.split("?")[0]);
          if (gripItem.image_url_female) urls.add(gripItem.image_url_female.split("?")[0]);
        }
      }
    }

    return Array.from(urls);
  }, [visionGrid, mapSettings, activePet, nodesInVision, avatarData, allShopItems]);

  const images = useSkiaAssets(urlsToLoad);

  // Animation values
  const clockMs = useClock();
  const animationFrame = useDerivedValue(() => clockMs.value / 1000);

  const foamOpacity = useSharedValue(0.6);
  useEffect(() => {
    foamOpacity.value = withRepeat(
      withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  // --- GRID-LOCKED MOVEMENT ENGINE ---
  const currentTileX = useSharedValue(spawnX);
  const currentTileY = useSharedValue(spawnY);
  const targetX = useSharedValue(spawnX);
  const targetY = useSharedValue(spawnY);
  const hasInitialized = useRef(false);

  const lastEnteredTileX = useSharedValue(-999);
  const lastEnteredTileY = useSharedValue(-999);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    mapLeft.value = -spawnX * tileSize - tileSize / 2;
    mapTop.value = -spawnY * tileSize - tileSize / 2;
    currentTileX.value = spawnX;
    currentTileY.value = spawnY;
    targetX.value = spawnX;
    targetY.value = spawnY;
    lastEnteredTileX.value = spawnX;
    lastEnteredTileY.value = spawnY;
  }, [spawnX, spawnY]);

  // Collision data
  const collisionDataRef = useSharedValue<{
    [key: string]: { isWalkable: boolean; edgeBlocks: number };
  }>({});

  /** Ref keeps latest callback without churning `handleTileEnter`; parent may use React.memo that ignores this prop. */
  const onTileEnterRef = useRef(onTileEnter);
  onTileEnterRef.current = onTileEnter;
  const handleTileEnter = React.useCallback((tx: number, ty: number) => {
    onTileEnterRef.current?.(tx, ty);
  }, []);

  /** Ref + stable JS fn so the moveNext worklet never captures a stale optional prop (Reanimated). */
  const onTileMoveStartRef = useRef(onTileMoveStart);
  onTileMoveStartRef.current = onTileMoveStart;
  const invokeTileMoveStart = useCallback((running: boolean) => {
    onTileMoveStartRef.current?.(running);
  }, []);

  const onTileMoveBlockedRef = useRef(onTileMoveBlocked);
  onTileMoveBlockedRef.current = onTileMoveBlocked;
  const invokeTileMoveBlocked = useCallback((reason: "stamina" | "collision") => {
    onTileMoveBlockedRef.current?.(reason);
  }, []);

  const checkTileEnter = (tx: number, ty: number) => {
    'worklet';
    const isNewTile = tx !== lastEnteredTileX.value || ty !== lastEnteredTileY.value;
    if (isNewTile) {

      lastEnteredTileX.value = tx;
      lastEnteredTileY.value = ty;
    }
    // Fire-and-forget JS side effects (encounters/discovery). Movement handoff stays on UI thread.
    runOnJS(handleTileEnter)(tx, ty);
  };

  const moveNext = () => {
    "worklet";
    const dirStr = activeDirection.value;
    if (!dirStr) {
      return;
    }

    if (movementBudget.value < STEPS_PER_TILE) {
      runOnJS(invokeTileMoveBlocked)("stamina");
      return;
    }

    let nx = currentTileX.value;
    let ny = currentTileY.value;

    if (dirStr === "UP") ny -= 1;
    else if (dirStr === "DOWN") ny += 1;
    else if (dirStr === "LEFT") nx -= 1;
    else if (dirStr === "RIGHT") nx += 1;

    const collisionData = collisionDataRef.value;
    const targetCol = collisionData[`${nx},${ny}`];

    // 1. Check Full Block
    if (targetCol && !targetCol.isWalkable) {
      runOnJS(invokeTileMoveBlocked)("collision");
      return;
    }

    // 2. Check Edge Block
    const curCol = collisionData[`${currentTileX.value},${currentTileY.value}`];
    const currentEdgeBlocks = curCol?.edgeBlocks ?? 0;
    const destEdgeBlocks = targetCol?.edgeBlocks ?? 0;

    const blockedByEdge =
      (dirStr === "UP" && (currentEdgeBlocks & 1 || destEdgeBlocks & 4)) ||
      (dirStr === "DOWN" && (currentEdgeBlocks & 4 || destEdgeBlocks & 1)) ||
      (dirStr === "RIGHT" && (currentEdgeBlocks & 2 || destEdgeBlocks & 8)) ||
      (dirStr === "LEFT" && (currentEdgeBlocks & 8 || destEdgeBlocks & 2));

    if (blockedByEdge) {
      runOnJS(invokeTileMoveBlocked)("collision");
      return;
    }

    const needsXAnim = nx !== currentTileX.value;
    const needsYAnim = ny !== currentTileY.value;
    if (!needsXAnim && !needsYAnim) {
      return;
    }

    targetX.value = nx;
    targetY.value = ny;
    runOnJS(invokeTileMoveStart)(isRunning.value);
    isMoving.value = true;

    const targetPixelX = -nx * tileSize - tileSize / 2;
    const targetPixelY = -ny * tileSize - tileSize / 2;
    const duration = isRunning.value ? RUN_DURATION : WALK_DURATION;

    if (needsXAnim) {
      cancelAnimation(mapLeft);
      mapLeft.value = withTiming(targetPixelX, { duration, easing: Easing.linear }, (finished) => {
        if (finished) {
          currentTileX.value = nx;
          runOnJS(spendMovementBudget)(STEPS_PER_TILE);
          isMoving.value = false;
          checkTileEnter(nx, ny);
        } else {
          isMoving.value = false;
        }
      });
    } else {
      cancelAnimation(mapTop);
      mapTop.value = withTiming(targetPixelY, { duration, easing: Easing.linear }, (finished) => {
        if (finished) {
          currentTileY.value = ny;
          runOnJS(spendMovementBudget)(STEPS_PER_TILE);
          isMoving.value = false;
          checkTileEnter(nx, ny);
        } else {
          isMoving.value = false;
        }
      });
    }
  };

  useAnimatedReaction(
    () => ({
      dir: activeDirection.value,
      moving: isMoving.value,
    }),
    (state, prevState) => {
      if (state.moving) return; // hard gate — never interrupt in-flight animation
      if (state.dir === null) return;
      if (prevState?.moving === true || prevState?.dir !== state.dir) {
        moveNext();
      }
    },
  );

  // Pre-calculate centered offsets to prevent half-pixel blurring on odd-resolution screens (e.g., iPhone 15 width is 393)
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // You can increase MAP_SCALE (e.g., to 1.25 or 1.5) to zoom in the map
  const MAP_SCALE = 1.25;

  // Camera pan in screen space (after scale factor): continuous values — device-pixel snapping
  // was causing subtle flicker; chunk/tile sync fixes address the remaining “shimmer” more directly.
  const skiaTransform = useDerivedValue(() => [
    { translateX: centerX },
    { translateY: centerY },
    { translateX: mapLeft.value * MAP_SCALE },
    { translateY: mapTop.value * MAP_SCALE },
    { scale: MAP_SCALE },
  ]);

  const uiTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mapLeft.value * MAP_SCALE + centerX },
      { translateY: mapTop.value * MAP_SCALE + centerY },
      { scale: MAP_SCALE },
    ],
  }));

  useMemo(() => {
    const obj: {
      [key: string]: { isWalkable: boolean; edgeBlocks: number };
    } = {};
    (visibleGrid || []).forEach((cell) => {
      if (!cell) return;
      const hasBlockedTile = cell.tiles?.some(
        (t: any) =>
          t.isWalkable === false ||
          t.is_walk_able === false ||
          t.is_walkable === false,
      );
      const edgeBlocks =
        cell.tiles?.reduce((acc: number, t: any) => {
          return (
            acc |
            Number(t.edgeBlocks ?? t.edge_blocks ?? t.edge_mask ?? t.edgeMask ?? 0)
          );
        }, 0) || 0;
      obj[`${cell.x},${cell.y}`] = { isWalkable: !hasBlockedTile, edgeBlocks };
    });
    collisionDataRef.value = obj;
  }, [visibleGrid, collisionDataRef]);

  // Extract layers and sort ALL tiles by zIndex (single pass)
  const sortedTiles = useMemo(() => {
    const all: any[] = [];

    if (visibleGrid) {
      for (let i = 0; i < visibleGrid.length; i++) {
        const cell = visibleGrid[i];
        if (!cell?.tiles) continue;

        for (let j = 0; j < cell.tiles.length; j++) {
          const t = cell.tiles[j];
          if (!t) continue;

          const cleanUrl = t.cleanUrl;
          const dictData = cleanUrl ? tileLibrary.get(cleanUrl) : null;

          // Same formula as web `PixiMapCanvas` SmartPixiTile zIndex
          const tileLayer = t.layer || 0;
          const gridY =
            typeof t.y === "number" && !Number.isNaN(t.y) ? t.y : cell.y;
          const offsetY = Number(t.offsetY ?? t.offset_y) || 0;
          const depthY = gridY + offsetY / EDITOR_TILE_SIZE_PX;
          const zIndex = tileLayer * 100000 + depthY;

          all.push([
            t,
            cell.x,
            cell.y,
            j,
            cleanUrl,
            dictData,
            zIndex,
            tileLayer,
          ]);
        }
      }
    }

    all.sort((a, b) => {
      const dz = a[6] - b[6];
      if (dz !== 0) return dz;
      return String(a[0]?.id ?? "").localeCompare(String(b[0]?.id ?? ""));
    });

    return all;
  }, [visibleGrid, tileLibrary]);

  const allVisibleTiles = sortedTiles;

  const spritesheet =
    activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;

  const playerAvatar = avatarData ? (
    <SkiaLayeredAvatar
      user={avatarData}
      size={72}
      isMoving={isMoving}
      activeDirection={activeDirection}
      x={playerBaseX}
      y={playerBaseY}
      allShopItems={allShopItems}
    />
  ) : null;

  const petSprite = spritesheet ? (
    <SkiaPetSprite
      imageUrl={spritesheet.url}
      isMoving={isMoving}
      activeDirection={activeDirection}
      flipX={false}
      scale={0.15 * (tileSize / 48)}
      totalFrames={spritesheet.frame_count ?? 1}
      totalTimeMs={spritesheet.duration_ms ?? 1000}
      frameWidth={spritesheet.frame_width ?? 64}
      frameHeight={spritesheet.frame_height ?? 64}
      idleIndex={spritesheet.idle_frame ?? 0}
      x={width / 2} // RAW CENTER POINT
      y={height / 2 + 5} // Adjusted slightly down from -15 to be more natural
      trailX={petOffsetX}
      trailY={petOffsetY}
    />
  ) : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Canvas
        ref={canvasRef}
        style={{ position: "absolute", width, height, zIndex: 1 }}
        pointerEvents="none"
      >
        <Fill color="#1a1c0e" />
        <Group transform={skiaTransform}>
          {allVisibleTiles.map((e) => (
            <SkiaTile
              key={`tile-${e[0].id || e[1] + "," + e[2] + "," + e[7] + "," + e[3]}`}
              tile={e[0]}
              gridX={e[1]}
              gridY={e[2]}
              tileSize={tileSize}
              images={images}
              mapSettings={mapSettings}
              animationFrame={animationFrame}
              foamOpacity={foamOpacity}
              isProp={e[7] > 0}
              dictionaryData={e[5]}
            />
          ))}
          {/* Pet moved to overlay layer to prevent clipping by player avatar */}
          {showWalkabilityOverlay &&
            (visibleGrid || []).map((cell) => {
              if (!cell) return null;
              const blockedTiles = cell.tiles?.filter(
                (t: any) =>
                  t.isWalkable === false ||
                  t.is_walk_able === false ||
                  t.is_walkable === false,
              );
              const edgeTiles = cell.tiles?.filter((t: any) => {
                const bits = Number(
                  t.edgeBlocks ??
                    t.edge_blocks ??
                    t.edge_mask ??
                    t.edgeMask ??
                    0,
                );
                return bits > 0;
              });

              const cellX = cell.x * tileSize;
              const cellY = cell.y * tileSize;
              const BAR = 5 * (tileSize / 48);

              return (
                <Group key={`walk-overlay-${cell.x}-${cell.y}`}>
                  {blockedTiles?.length > 0 && (
                    <SkiaRect
                      x={cellX}
                      y={cellY}
                      width={tileSize}
                      height={tileSize}
                      color="rgba(220, 38, 38, 0.35)"
                    />
                  )}
                  {edgeTiles?.map((t: any, i: number) => {
                    const bits = Number(
                      t.edgeBlocks ??
                        t.edge_blocks ??
                        t.edge_mask ??
                        t.edgeMask ??
                        0,
                    );
                    return (
                      <Group key={`edge-bits-${cell.x}-${cell.y}-${i}`}>
                        {bits & 1 && (
                          <SkiaRect
                            x={cellX}
                            y={cellY}
                            width={tileSize}
                            height={BAR}
                            color="rgba(249, 115, 22, 0.85)"
                          />
                        )}
                        {bits & 2 && (
                          <SkiaRect
                            x={cellX + tileSize - BAR}
                            y={cellY}
                            width={BAR}
                            height={tileSize}
                            color="rgba(249, 115, 22, 0.85)"
                          />
                        )}
                        {bits & 4 && (
                          <SkiaRect
                            x={cellX}
                            y={cellY + tileSize - BAR}
                            width={tileSize}
                            height={BAR}
                            color="rgba(249, 115, 22, 0.85)"
                          />
                        )}
                        {bits & 8 && (
                          <SkiaRect
                            x={cellX}
                            y={cellY}
                            width={BAR}
                            height={tileSize}
                            color="rgba(249, 115, 22, 0.85)"
                          />
                        )}
                      </Group>
                    );
                  })}
                </Group>
              );
            })}

          {/* NATIVE SKIA NODE RENDERING (Zero Shaking!) */}
          {nodesInVision?.map((node) => {
            // 1. Get the pre-loaded image from Supabase
            const cleanUrl = node.icon_url?.split("?")[0];
            const img = cleanUrl ? images.get(cleanUrl) : null;

            // 2. Calculate exact pixel-perfect positions
            const nodeX = Math.round(node.x * tileSize);
            const nodeY = Math.round(node.y * tileSize);
            const centerX = Math.round(nodeX + tileSize / 2);
            const centerY = Math.round(nodeY + tileSize / 2);
            const radius = Math.round(tileSize * 0.45);
            const tokenSize = radius * 2;

            return (
              <Group
                key={`skia-node-${node.id}`}
                clip={Skia.RRectXY(
                  Skia.XYWHRect(
                    centerX - radius,
                    centerY - radius,
                    tokenSize,
                    tokenSize,
                  ),
                  radius,
                  radius,
                )}
                opacity={0.6}
              >
                {/* The Opaque Pedestal/Background */}
                <Circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  color="rgba(15, 23, 42, 0.8)"
                />

                {/* The NPC Sprite - Fills the token area, clipped by the circle */}
                {img && (
                  <SkiaImage
                    image={img}
                    x={centerX - radius}
                    y={centerY - radius}
                    width={tokenSize}
                    height={tokenSize}
                    fit="contain"
                    sampling={{ filter: FilterMode.Nearest }}
                  />
                )}

                {/* The Bright Blue Token Border */}
                <Circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  color="rgba(59, 130, 246, 1.0)"
                  style="stroke"
                  strokeWidth={2}
                />
              </Group>
            );
          })}
        </Group>

        {/* Screen-fixed sky band above map tiles so clouds stay visible */}
        <CloudLayer
          screenWidth={width}
          screenHeight={height}
          enableShadows={enableCloudShadows}
        />

        {/* NATIVE SKIA PLAYER & PET RENDERING - Depth Sorted without JS Bridge */}
        <Group opacity={petBehindOpacity}>{petSprite}</Group>

        {playerAvatar}

        <Group opacity={petInFrontOpacity}>{petSprite}</Group>

        {enableAtmosphere ? (
          <Group>
            {/* Directional sun from west (screen left): warm lift, cooler fill toward the right */}
            <SkiaRect
              x={0}
              y={0}
              width={width}
              height={height}
              blendMode="softLight"
            >
              <LinearGradient
                start={vec(-width * 0.2, height * 0.16)}
                end={vec(width * 1.08, height * 0.84)}
                colors={[
                  "rgba(255, 234, 198, 0.36)",
                  "rgba(255, 244, 224, 0.2)",
                  "rgba(255, 248, 238, 0.08)",
                  "rgba(75, 88, 118, 0.09)",
                ]}
                positions={[0, 0.28, 0.58, 1]}
              />
            </SkiaRect>
            <SkiaRect
              x={0}
              y={0}
              width={width}
              height={height}
              blendMode="multiply"
            >
              <RadialGradient
                c={vec(width / 2, height / 2)}
                r={width / 1.08}
                colors={["rgba(0, 0, 0, 0)", vignetteEdgeColor]}
              />
            </SkiaRect>
          </Group>
        ) : null}
      </Canvas>

      <Reanimated.View
        style={[
          StyleSheet.absoluteFill,
          {
            zIndex: 100,
            // Match Skia Group (top-left scale origin). Default RN is center — mismatched
            // pivot made overlays (and perceived map alignment) fight the camera while moving.
            transformOrigin: "0% 0%",
          },
          uiTransformStyle,
        ]}
        pointerEvents="box-none"
      >
        {children}
      </Reanimated.View>
    </View>
  );
};

export const SkiaWorldMap = React.memo(SkiaWorldMapInternal, (prev, next) => {
  if (prev.visionGrid !== next.visionGrid) return false;
  // NPCs / overlays must update when node data arrives without a visionGrid ref change.
  if (prev.nodesInVision !== next.nodesInVision) return false;
  return true; // ignore other props (e.g. spawnX/Y) so React state cannot re-skin mid-movement
});
