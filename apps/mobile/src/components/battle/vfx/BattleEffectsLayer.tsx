import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useBattleStore } from '@/store/useBattleStore';
import { Particle } from './Particle';
import { Shockwave } from './Shockwave';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParticleData {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface ShockwaveData {
  id: string;
  x: number;
  y: number;
  color: string;
}

export function BattleEffectsLayer() {
  const qteTargets = useBattleStore(state => state.qteTargets);
  const prevQteTargetsRef = useRef<any[]>([]);

  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [shockwaves, setShockwaves] = useState<ShockwaveData[]>([]);

  useEffect(() => {
    qteTargets.forEach(target => {
      const prev = prevQteTargetsRef.current.find(t => t.id === target.id);
      if (!prev) return;
      
      // Detect Status Change
      if (prev.status !== 'hit' && target.status === 'hit') {
        spawnParticles(target.x, target.y, '#22d3ee');
        spawnShockwave(target.x, target.y, '#22d3ee');
      } else if (prev.status !== 'perfect' && target.status === 'perfect') {
        spawnParticles(target.x, target.y, '#fbbf24'); // Gold for Perfect
        spawnShockwave(target.x, target.y, '#fbbf24');
      } else if (prev.status !== 'miss' && target.status === 'miss') {
        spawnParticles(target.x, target.y, '#ef4444');
        spawnShockwave(target.x, target.y, '#ef4444');
      }
    });
    prevQteTargetsRef.current = qteTargets;
  }, [qteTargets]);

  const spawnParticles = (xPct: number, yPct: number, color: string) => {
    const x = (xPct / 100) * SCREEN_WIDTH;
    const y = (yPct / 100) * SCREEN_HEIGHT;
    const count = color === '#fbbf24' ? 12 : 8;

    const newParts: ParticleData[] = Array.from({ length: count }).map((_, i) => ({
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      color,
    }));
    
    setParticles(prev => [...prev, ...newParts]);
  };

  const spawnShockwave = (xPct: number, yPct: number, color: string) => {
    const x = (xPct / 100) * SCREEN_WIDTH;
    const y = (yPct / 100) * SCREEN_HEIGHT;
    setShockwaves(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      color
    }]);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {shockwaves.map(s => (
        <Shockwave 
          key={s.id} 
          x={s.x} 
          y={s.y} 
          color={s.color} 
          onComplete={() => setShockwaves(prev => prev.filter(w => w.id !== s.id))}
        />
      ))}
      {particles.map(p => (
        <Particle 
          key={p.id} 
          x={p.x} 
          y={p.y} 
          color={p.color} 
          onComplete={() => setParticles(prev => prev.filter(p2 => p2.id !== p.id))}
        />
      ))}
    </View>
  );
}
