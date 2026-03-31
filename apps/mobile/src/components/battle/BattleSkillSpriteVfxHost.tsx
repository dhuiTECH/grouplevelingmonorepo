import React from 'react';
import { Dimensions } from 'react-native';
import SkillSpriteVfx from '@/components/SkillSpriteVfx';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BattleSkillSpriteVfxHostProps {
  lastSkillAnimationConfig: any;
  lastDamageEvent: any;
  enemyFigureCenter: { x: number; y: number } | null;
  party: any[];
  clearLastSkillAnimation: () => void;
}

export function BattleSkillSpriteVfxHost({
  lastSkillAnimationConfig,
  lastDamageEvent,
  enemyFigureCenter,
  party,
  clearLastSkillAnimation,
}: BattleSkillSpriteVfxHostProps) {
  if (!lastSkillAnimationConfig || !lastDamageEvent) return null;

  const isProjectile = lastSkillAnimationConfig.vfx_type === 'projectile';
  const isBeam = lastSkillAnimationConfig.vfx_type === 'beam';

  let targetX = SCREEN_WIDTH / 2;
  let targetY = 220;

  if (lastDamageEvent.targetId === 'ENEMY') {
    if (enemyFigureCenter) {
      targetX = enemyFigureCenter.x;
      targetY = enemyFigureCenter.y;
    }
  } else if (lastDamageEvent.targetId === 'ALL_ENEMIES') {
    targetX = SCREEN_WIDTH / 2;
    targetY = 200;
  } else if (lastDamageEvent.targetId === 'ALL_FRIENDS') {
    targetX = SCREEN_WIDTH / 2;
    targetY = SCREEN_HEIGHT / 2 + 100;
  } else {
    const idx = party.findIndex((p) => p.id === lastDamageEvent.targetId);
    if (idx >= 0) {
      const totalWidth = party.length * 100 + (party.length - 1) * 20;
      const layoutStartX = (SCREEN_WIDTH - totalWidth) / 2;
      targetX = layoutStartX + idx * 120 + 50;
      targetY = SCREEN_HEIGHT / 2 + 100;
    }
  }

  let startX: number | undefined;
  let startY: number | undefined;

  if (lastDamageEvent.casterCharId === 'ENEMY') {
    if (enemyFigureCenter) {
      startX = enemyFigureCenter.x;
      startY = enemyFigureCenter.y;
    }
  } else if (lastDamageEvent.casterCharId) {
    const casterIdx = party.findIndex((p) => p.id === lastDamageEvent.casterCharId);
    if (casterIdx >= 0) {
      const totalWidth = party.length * 100 + (party.length - 1) * 20;
      const layoutStartX = (SCREEN_WIDTH - totalWidth) / 2;
      startX = layoutStartX + casterIdx * 120 + 50;
      startY = SCREEN_HEIGHT / 2 + 100;
    }
  }

  const needsStartCoords = isProjectile || isBeam;

  return (
    <SkillSpriteVfx
      key={lastDamageEvent.timestamp}
      config={lastSkillAnimationConfig}
      targetX={targetX}
      targetY={targetY}
      startX={needsStartCoords ? startX : undefined}
      startY={needsStartCoords ? startY : undefined}
      playCount={lastDamageEvent.skillUseCount ?? 1}
      onEnd={() => {
        clearLastSkillAnimation();
      }}
    />
  );
}
