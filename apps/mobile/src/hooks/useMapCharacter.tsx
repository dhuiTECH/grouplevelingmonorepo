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
  hair_tint_hex?: string;
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

  // --- 2D PET TRAILING PHYSICS (WORLD SPACE APPROACH) ---
  const petOffsetX = useSharedValue(0);
  const petOffsetY = useSharedValue(0);
  const petScaleX = useSharedValue(1);
  const petZIndex = useSharedValue(101);

  // We track the pet's absolute position in the world, not its offset from the player
  const petWorldX = useSharedValue(0);
  const petWorldY = useSharedValue(0);
  const hasInitPet = useSharedValue(false);

  useFrameCallback((frameInfo) => {
    'worklet';
    const rawDt = frameInfo.timeSincePreviousFrame;
    if (rawDt === null) return;
    const dt = Math.min(rawDt, 33);

    // 1. Calculate Player's World Position from Map Camera
    const playerWorldX = -mapLeft.value;
    const playerWorldY = -mapTop.value;

    // ✨ THE FIX: Shift the leash anchor to match the avatar's NEW centered position!
    // Since the avatar is centered on the tile, we want the pet to trail near the tile center.
    const VISUAL_ANCHOR_X = playerWorldX + 0;
    const VISUAL_ANCHOR_Y = playerWorldY + 5; // Anchor adjusted to match visual offset
    if (!hasInitPet.value) {
      // Spawn pet safely behind player on load
      petWorldX.value = VISUAL_ANCHOR_X - 70;
      petWorldY.value = VISUAL_ANCHOR_Y;
      hasInitPet.value = true;
      return;
    }

    // 2. Calculate Distance to the VISUAL ANCHOR (Not raw center)
    const dx = VISUAL_ANCHOR_X - petWorldX.value;
    const dy = VISUAL_ANCHOR_Y - petWorldY.value;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Moving it closer (was 70)
    const MIN_DIST = 55; 

    // 3. Organic Follow Physics
    if (dist > MIN_DIST) {
      const targetWorldX = VISUAL_ANCHOR_X - (dx / dist) * MIN_DIST;
      const targetWorldY = VISUAL_ANCHOR_Y - (dy / dist) * MIN_DIST;

      const alpha = 1 - Math.pow(0.85, dt / 16.6);
      petWorldX.value += (targetWorldX - petWorldX.value) * alpha;
      petWorldY.value += (targetWorldY - petWorldY.value) * alpha;
    }

    // 4. Update Facing Direction
    if (Math.abs(dx) > 1 && dist > MIN_DIST) {
      petScaleX.value = dx > 0 ? -1 : 1;
    }

    // 5. Convert World Coords back to Screen Offsets for Skia
    // (We subtract the RAW playerWorldX because Skia still draws relative to the original 0,0)
    petOffsetX.value = petWorldX.value - playerWorldX;
    petOffsetY.value = petWorldY.value - playerWorldY;

    // 6. Depth Sorting
    petZIndex.value = petOffsetY.value < -10 ? 99 : 101;
  });

  const playerBaseX = useDerivedValue(() => {
    const AVATAR_RADIUS = 36;
    return Math.floor(width / 2) - AVATAR_RADIUS;
  });

  const playerBaseY = useDerivedValue(() => {
    const AVATAR_RADIUS = 36;
    return Math.floor(height / 2) - AVATAR_RADIUS;
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
      hair_tint_hex: user.hair_tint_hex,
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
