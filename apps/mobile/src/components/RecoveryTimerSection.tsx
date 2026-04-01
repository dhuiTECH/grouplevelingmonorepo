import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface RecoveryTimerSectionProps {
  timeLeft: number;
  initialSeconds: number; // max for ring progress (e.g. 60 when user picked 60s)
  onPresetPress: (seconds: number) => void;
  onStop?: () => void;
  isActive?: boolean;
  /** Optional extra bottom padding (e.g. when parent has no safe-area padding). Training log modal usually leaves this 0. */
  bottomInset?: number;
}

const PRESETS = [
  { label: '30s', seconds: 30, isBlue: false },
  { label: '60s', seconds: 60, isBlue: false },
  { label: '90s', seconds: 90, isBlue: true },
  { label: '180s', seconds: 180, isBlue: true },
  { label: '300s', seconds: 300, isBlue: true },
];

export default function RecoveryTimerSection({
  timeLeft,
  initialSeconds,
  onPresetPress,
  onStop,
  isActive = false,
  bottomInset = 0,
}: RecoveryTimerSectionProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const ringR = 22;
  const timerCircumference = 2 * Math.PI * ringR;
  const timerMax = initialSeconds || 300;
  const timerOffset = timerCircumference - (timerCircumference * (timeLeft / timerMax));

  // Visible padding under the presets (outer modal already handles home indicator — don’t add full insets again).
  const bottomPad = 14 + bottomInset;

  return (
    <View style={[styles.timerPanel, { paddingBottom: bottomPad }]}>
      <View style={styles.timerInner}>
        <View style={styles.timerTitleRow}>
          <Text style={styles.timerTitle}>RECOVERY</Text>
          {isActive && onStop && (
            <TouchableOpacity onPress={onStop} hitSlop={8}>
              <Text style={styles.timerStop}>STOP</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.timerRow}>
        <View style={styles.timerCircleWrap}>
          <Svg width={56} height={56} viewBox="0 0 56 56" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx="28" cy="28" r={ringR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <Circle
              cx="28"
              cy="28"
              r={ringR}
              fill="none"
              stroke="#6b9ac4"
              strokeWidth="3"
              strokeDasharray={timerCircumference}
              strokeDashoffset={timerOffset}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.timerDisplayText}>{formatTime(timeLeft)}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsScroll}
          contentContainerStyle={styles.presetsScrollContent}
          bounces={false}
        >
          {PRESETS.map(({ label, seconds, isBlue }) => (
            <TouchableOpacity
              key={seconds}
              onPress={() => onPresetPress(seconds)}
              style={[
                styles.presetBtn,
                isBlue ? styles.presetBtnBlue : styles.presetBtnGold,
                initialSeconds === seconds && (isBlue ? styles.presetBtnBlueActive : styles.presetBtnGoldActive),
              ]}
            >
              <Text style={[styles.presetBtnText, isBlue ? { color: '#6b9ac4' } : { color: '#ffd57a' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerPanel: {
    backgroundColor: 'rgba(20, 23, 31, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  timerInner: {
    gap: 8,
  },
  timerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  timerTitle: {
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerStop: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  presetsScroll: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    alignSelf: 'center',
  },
  presetsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  timerCircleWrap: {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: 28,
    backgroundColor: '#1a1c24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a2d35',
  },
  timerDisplayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  presetBtn: {
    minWidth: 40,
    paddingHorizontal: 8,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(20, 23, 31, 0.6)',
  },
  presetBtnGold: { borderColor: 'rgba(212, 160, 64, 0.4)' },
  presetBtnBlue: { borderColor: 'rgba(56, 91, 136, 0.4)' },
  presetBtnGoldActive: { borderColor: '#d4a040', backgroundColor: 'rgba(212, 160, 64, 0.2)' },
  presetBtnBlueActive: { borderColor: '#6b9ac4', backgroundColor: 'rgba(56, 91, 136, 0.2)' },
  presetBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
