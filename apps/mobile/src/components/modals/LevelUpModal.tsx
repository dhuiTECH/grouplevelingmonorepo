import React, { useEffect, useRef } from 'react';
import { Modal, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import { LevelUp, maxExpForLevel, THEME } from '@/components/LevelUp';
import type { User } from '@/types/user';

export interface LevelUpModalProps {
  visible: boolean;
  user: User | null;
  fromLevel: number;
  toLevel: number;
  onClose: () => void;
  /** When true, use demo XP (256/383) instead of the real level cap formula */
  preview?: boolean;
  /**
   * When true with `preview`, runs the same auto-play + auto-dismiss as a real level-up
   * (no COMPLETE QUEST tap). Default false keeps manual preview for edge cases.
   */
  autoPlay?: boolean;
}

export function LevelUpModal({
  visible,
  user,
  fromLevel,
  toLevel,
  onClose,
  preview = false,
  autoPlay = false,
}: LevelUpModalProps) {
  const { width, height } = useWindowDimensions();
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/sounds/level-up.mp3'),
        );
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        // ignore missing / failed sound
      }
    })();

    return () => {
      cancelled = true;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        s.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      }
    };
  }, [visible]);

  const cap = Math.max(1, maxExpForLevel(fromLevel));
  const startXp = preview ? 256 : Math.floor(cap * 0.66);
  const targetXp = preview ? 383 : cap;

  const useGameFlow = !preview || autoPlay;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { width, height, backgroundColor: THEME.bgScrim }]}>
        {visible && (
          <LevelUp
            active={visible}
            mode={useGameFlow ? 'game' : 'preview'}
            fromLevel={fromLevel}
            toLevel={toLevel}
            startXp={startXp}
            targetXp={targetXp}
            onPreviewReset={() => {}}
            onGameContinue={onClose}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
});
