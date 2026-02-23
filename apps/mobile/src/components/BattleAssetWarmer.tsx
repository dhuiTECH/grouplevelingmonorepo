import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

/**
 * Renders every skill sprite at 1px size in a hidden container to force the GPU
 * to decode and hold textures in VRAM when the battle starts, so VFX is instant on attack.
 */
interface BattleAssetWarmerProps {
  /** Sprite URLs from skill_animations (preloaded by useBattleLogic). */
  spriteUrls?: string[];
  /** Optional: party for ability.vfx_url if present. */
  party?: any[];
  /** Optional: enemy for enemy.skills[].vfx_url if present. */
  enemy?: any;
}

export function BattleAssetWarmer({ spriteUrls = [], party = [], enemy }: BattleAssetWarmerProps) {
  const vfxSet = new Set<string>();

  spriteUrls.forEach((url) => {
    if (url && String(url).trim()) vfxSet.add(url);
  });

  party.forEach((char) => {
    char.abilities?.forEach((ability: any) => {
      if (ability.vfx_url) vfxSet.add(ability.vfx_url);
    });
  });

  if (enemy?.skills) {
    enemy.skills.forEach((skill: any) => {
      if (skill.vfx_url) vfxSet.add(skill.vfx_url);
    });
  }

  const urls = Array.from(vfxSet);
  if (urls.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -10,
        left: -10,
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {urls.map((url) => (
        <Image
          key={url}
          source={{ uri: url }}
          style={{ width: 1, height: 1 }}
          cachePolicy="memory-disk"
        />
      ))}
    </View>
  );
}

export default BattleAssetWarmer;
