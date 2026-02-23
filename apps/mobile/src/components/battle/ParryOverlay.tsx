import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import { QTEButton } from './QTEButton';

interface ParryOverlayProps {
  visible: boolean;
  focusMode: boolean;
  comboMultiplier: number;
  qteTargets: any[];
  parryTimerAnim: Animated.Value;
  onQteTap: (targetId: string) => void;
  onQteSwipe: (targetId: string, dir: string) => void;
}

export function ParryOverlay({
  visible,
  focusMode,
  comboMultiplier,
  qteTargets,
  parryTimerAnim,
  onQteTap,
  onQteSwipe,
}: ParryOverlayProps) {
  if (!visible) return null;

  return (
    <View style={[styles.parryOverlay, focusMode && { backgroundColor: 'rgba(0,0,0,0.4)' }]} pointerEvents="box-none">
      {comboMultiplier > 1.0 && (
        <View style={styles.comboDisplay}>
          <Text style={styles.comboText}>{comboMultiplier.toFixed(1)}x COMBO</Text>
          {focusMode && <Text style={styles.focusText}>FOCUS ACTIVE</Text>}
        </View>
      )}
      <View style={styles.parryContainer} pointerEvents="box-none">
        <View style={{ width: '100%', height: '100%', position: 'absolute' }}>
          {qteTargets.map((target: any) => (
            <QTEButton
              key={target.id}
              target={target}
              timerAnim={parryTimerAnim}
              onTap={() => onQteTap(target.id)}
              onSwipe={(dir) => onQteSwipe(target.id, dir)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  parryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  comboDisplay: {
    position: 'absolute',
    top: 100,
    right: 20,
    alignItems: 'flex-end',
  },
  comboText: {
    color: '#facc15',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'black',
    textShadowRadius: 4,
  },
  focusText: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 4,
  },
  parryContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
