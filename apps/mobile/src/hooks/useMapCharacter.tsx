import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import Reanimated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useFrameCallback,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import LayeredAvatar from '@/components/LayeredAvatar';
import { PetSprite } from '@/components/PetSprite';

const { width, height } = Dimensions.get('window');
const TILE_SIZE = 48;

interface UserAvatarData {
  id: string;
  cosmetics?: any[];
  gender?: string;
  base_body_url?: string;
  base_body_silhouette_url?: string;
  base_body_tint_hex?: string;
  avatar_url?: string;
}

interface PetDetails {
  metadata?: {
    visuals?: {
      walking_spritesheet?: {
        url: string;
        idle_frame?: number;
        frame_count?: number;
        duration_ms?: number;
        frame_width?: number;
        frame_height?: number;
      };
    };
  };
}

export function useMapCharacter(
  pendingDir: SharedValue<number>,
  isMoving: SharedValue<boolean>,
  user: UserAvatarData | null,
  activePet: { pet_details?: PetDetails } | null,
  mapLeft: SharedValue<number>,
  mapTop: SharedValue<number>
): { overlayChildren: React.ReactNode; petOverlay: React.ReactNode } {
  const lastFacingDirection = useSharedValue(1);
  const facingScaleX = useDerivedValue(() => {
    const dir = pendingDir.value;
    if (dir === 4) {
      lastFacingDirection.value = -1;
      return -1;
    }
    if (dir === 3) {
      lastFacingDirection.value = 1;
      return 1;
    }
    return lastFacingDirection.value;
  });
  const avatarFlipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: facingScaleX.value }],
  }));

  // --- 2D PET TRAILING PHYSICS ---
  const petOffsetX = useSharedValue(36);
  const petOffsetY = useSharedValue(16);
  const petScaleX = useSharedValue(1);
  const petZIndex = useSharedValue(101);

  // Sync isMoving to JS for LayeredAvatar (standard React component)
  const [isMovingJS, setIsMovingJS] = useState(false);
  useAnimatedReaction(
    () => isMoving.value,
    (moving, prev) => {
      if (moving !== prev) runOnJS(setIsMovingJS)(moving);
    }
  );

  useFrameCallback((frameInfo) => {
    'worklet';
    const moving = isMoving.value;
    const dir = pendingDir.value;
    const rawDt = frameInfo.timeSincePreviousFrame;
    if (rawDt === null) return;
    const dt = Math.min(rawDt, 33); // Cap to 30fps to prevent teleporting on long lags

    let targetX = 0;
    let targetY = 0;

    if (moving) {
      if (dir === 1) {
        targetX = 0;
        targetY = 48;
      } else if (dir === 2) {
        targetX = 0;
        targetY = -48;
      } else if (dir === 3) {
        targetX = 48;
        targetY = 0;
        petScaleX.value = 1;
      } else if (dir === 4) {
        targetX = -48;
        targetY = 0;
        petScaleX.value = -1;
      }
    } else {
      const isFacingRight = lastFacingDirection.value === -1;
      targetX = isFacingRight ? -32 : 32;
      targetY = 16;
    }

    // Frame-rate independent Lerp: 
    // Instead of fixed 0.1, we calculate decay based on dt.
    // at 60fps (16.6ms), (1 - 0.1) = 0.9. 
    // target_alpha = 1 - pow(0.9, dt / 16.6)
    const alpha = 1 - Math.pow(0.9, dt / 16.6);
    petOffsetX.value += (targetX - petOffsetX.value) * alpha;
    petOffsetY.value += (targetY - petOffsetY.value) * alpha;

    petZIndex.value = petOffsetY.value < -10 ? 99 : 101;
  });

  // NEW: Calculate the "True Center" based on where the map actually is
  // This ensures the player is ALWAYS perfectly aligned with the tile grid
  const playerBaseX = useDerivedValue(() => {
    // Correct formula: Start at screen center and apply the map's rounding error.
    // mapLeft is the camera position (-(playerPos)). 
    // Screen position S = (Math.round(mapLeft) + centerX) + playerPos
    // Since playerPos = -mapLeft.value, S = Math.round(mapLeft) + centerX - mapLeft
    return Math.round(mapLeft.value) + Math.floor(width / 2) - mapLeft.value;
  });

  const playerBaseY = useDerivedValue(() => {
    return Math.round(mapTop.value) + Math.floor(height / 2) - mapTop.value;
  });

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    // We use the derived values so the avatar "sticks" to the map
    // even if the frame rate dips.
    left: playerBaseX.value - TILE_SIZE / 2,
    top: playerBaseY.value - TILE_SIZE / 2,
    width: TILE_SIZE,
    height: TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 100,
  }));

  const petAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    // The pet is now relative to the Player's REAL-TIME position
    left: playerBaseX.value - TILE_SIZE / 2,
    top: playerBaseY.value - TILE_SIZE / 2 - 10,
    width: 100, // Match the View container in petOverlay
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      { translateX: Math.round(petOffsetX.value) },
      { translateY: Math.round(petOffsetY.value) },
      { scaleX: petScaleX.value },
    ],
    zIndex: petZIndex.value,
  }));

  const [avatarKey, setAvatarKey] = useState(0);
  const prevEquippedRef = useRef<string>('');

  useEffect(() => {
    const equippedIds = user?.cosmetics?.filter((c: any) => c.equipped).map((c: any) => c.id).sort() || [];
    const equippedSignature = equippedIds.join(',');
    if (equippedSignature !== prevEquippedRef.current) {
      prevEquippedRef.current = equippedSignature;
      setAvatarKey((k) => k + 1);
    }
  }, [user?.cosmetics]);

  const avatarData = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      cosmetics: user.cosmetics,
      gender: user.gender,
      base_body_url: user.base_body_url,
      base_body_silhouette_url: user.base_body_silhouette_url,
      base_body_tint_hex: user.base_body_tint_hex,
      avatar_url: user.avatar_url,
    };
  }, [avatarKey, user]);

  const overlayChildren = useMemo(() => {
    if (!user || !avatarData) return null;
    return (
      <Reanimated.View
        style={avatarAnimatedStyle}
        pointerEvents="box-none"
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#0f172a',
            borderWidth: 2,
            borderColor: '#3b82f6',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <Reanimated.View style={avatarFlipStyle}>
            <LayeredAvatar key={avatarKey} user={avatarData as any} size={72} isMoving={isMovingJS} />
          </Reanimated.View>
        </View>
      </Reanimated.View>
    );
  }, [user, avatarData, avatarFlipStyle, avatarKey, avatarAnimatedStyle]);

  const spritesheet = activePet?.pet_details?.metadata?.visuals?.walking_spritesheet;
  const petOverlay = useMemo(() => {
    if (!spritesheet) return null;
    const ws = spritesheet;
    return (
      <Reanimated.View
        style={petAnimatedStyle}
        pointerEvents="box-none"
      >
        <PetSprite
          imageUrl={ws.url}
          isMoving={isMoving}
          idleIndex={ws.idle_frame ?? 0}
          totalFrames={ws.frame_count ?? 1}
          totalTimeMs={ws.duration_ms ?? 1000}
          frameWidth={ws.frame_width ?? 64}
          frameHeight={ws.frame_height ?? 64}
          scale={0.15 * (TILE_SIZE / 48)}
          flipX={false}
        />
      </Reanimated.View>
    );
  }, [activePet, spritesheet, petAnimatedStyle]);

  return { overlayChildren, petOverlay };
}
