import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import { HUD } from './battleTheme';
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
          <View style={styles.comboPanel}>
            <Text style={styles.comboSystem}>SYSTEM // CHAIN</Text>
            <Text style={styles.comboValue}>{comboMultiplier.toFixed(1)}×</Text>
            <Text style={styles.comboSub}>DMG MODIFIER ACTIVE</Text>
            {focusMode && <Text style={styles.focusText}>FOCUS // LOCKED</Text>}
          </View>
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
    right: 16,
    alignItems: 'flex-end',
  },
  comboPanel: {
    alignItems: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: HUD.panelBg,
    borderWidth: 1,
    borderColor: HUD.panelBorder,
    borderRadius: 4,
    shadowColor: HUD.comboGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  comboSystem: {
    color: HUD.systemLabel,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
    marginBottom: 4,
  },
  comboValue: {
    color: HUD.comboInner,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
    textShadowColor: HUD.comboGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  comboSub: {
    color: HUD.hunterCyanDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
    fontFamily: 'Exo2-Regular',
  },
  focusText: {
    color: HUD.hunterCyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
    fontFamily: 'Exo2-Regular',
  },
  parryContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
