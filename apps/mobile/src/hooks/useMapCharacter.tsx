import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  SharedValue,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

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
): {
  playerBaseX: SharedValue<number>;
  playerBaseY: SharedValue<number>;
  facingScaleX: SharedValue<number>;
  petOffsetX: SharedValue<number>;
  petOffsetY: SharedValue<number>;
  petScaleX: SharedValue<number>;
  petZIndex: SharedValue<number>;
  avatarData: any;
} {
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

  // --- 2D PET TRAILING PHYSICS ---
  // Initialize to the default idle offsets so Frame 0 renders in the correct place.
  const petOffsetX = useSharedValue(-32);
  const petOffsetY = useSharedValue(26);
  const petScaleX = useSharedValue(1);
  const petZIndex = useSharedValue(101);
  const hasSnapped = useSharedValue(false);

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
        targetY = 58; // Lowered from 48
      } else if (dir === 2) {
        targetX = 0;
        targetY = -38; // Lowered from -48 (brings it closer to player center but lower relative to floor)
      } else if (dir === 3) {
        targetX = 108;  // Farther right when facing left
        targetY = 26;   // Same plane as idle (was 10, pet was walking "in the middle")
        petScaleX.value = 1;
      } else if (dir === 4) {
        targetX = -32; // A little to the right when facing right (pet was too far left)
        targetY = 26;   // Same plane as idle (was 10, pet was walking "in the middle")
        petScaleX.value = -1;
      }
    } else {
      // Use same X as moving so pet doesn't hop toward middle when you release D-pad
      const isFacingRight = lastFacingDirection.value === -1;
      targetX = isFacingRight ? -32 : 108;  // Match moving-right (-32) and moving-left (108)
      targetY = 26;
    }

    // First-frame snap: teleport pet to the correct offset, then enable smooth lerp.
    if (!hasSnapped.value) {
      petOffsetX.value = targetX;
      petOffsetY.value = targetY;
      hasSnapped.value = true;
      return;
    }

    // If we are changing horizontal side (left/right of the player),
    // avoid dragging the pet through the player's body by snapping across.
    if (moving && (dir === 3 || dir === 4)) {
      const side = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
      const currentSide = side(petOffsetX.value);
      const targetSide = side(targetX);
      if (currentSide !== 0 && targetSide !== 0 && currentSide !== targetSide) {
        petOffsetX.value = targetX;
        petOffsetY.value = targetY;
        petZIndex.value = petOffsetY.value < -10 ? 99 : 101;
        return;
      }
    }

    // Frame-rate independent Lerp
    const alpha = 1 - Math.pow(0.9, dt / 16.6);
    petOffsetX.value += (targetX - petOffsetX.value) * alpha;
    petOffsetY.value += (targetY - petOffsetY.value) * alpha;

    petZIndex.value = petOffsetY.value < -10 ? 99 : 101;
  });

  // NEW: Calculate the "True Center" based on where the map actually is
  // This ensures the player is ALWAYS perfectly aligned with the tile grid
  const playerBaseX = useDerivedValue(() => {
    return Math.round(mapLeft.value) + Math.floor(width / 2) - mapLeft.value;
  });

  const playerBaseY = useDerivedValue(() => {
    return Math.round(mapTop.value) + Math.floor(height / 2) - mapTop.value;
  });

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

  return {
    playerBaseX,
    playerBaseY,
    facingScaleX,
    petOffsetX,
    petOffsetY,
    petScaleX,
    petZIndex,
    avatarData,
  };
}
