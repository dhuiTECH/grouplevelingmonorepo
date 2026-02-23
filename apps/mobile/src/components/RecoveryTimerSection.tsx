import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface RecoveryTimerSectionProps {
  timeLeft: number;
  initialSeconds: number; // max for ring progress (e.g. 60 when user picked 60s)
  onPresetPress: (seconds: number) => void;
  onStop?: () => void;
  isActive?: boolean;
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
}: RecoveryTimerSectionProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerCircumference = 2 * Math.PI * 30;
  const timerMax = initialSeconds || 300;
  const timerOffset = timerCircumference - (timerCircumference * (timeLeft / timerMax));

  return (
    <View style={styles.timerPanel}>
      <View style={styles.timerTitleRow}>
        <Text style={styles.timerTitle}>RECOVERY TIMER</Text>
        {isActive && onStop && (
          <TouchableOpacity onPress={onStop} hitSlop={8}>
            <Text style={styles.timerStop}>STOP</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.timerRow}>
        <View style={styles.timerCircleWrap}>
          <Svg width={70} height={70} viewBox="0 0 70 70" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <Circle
              cx="35"
              cy="35"
              r="30"
              fill="none"
              stroke="#6b9ac4"
              strokeWidth="4"
              strokeDasharray={timerCircumference}
              strokeDashoffset={timerOffset}
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.timerDisplayText}>{formatTime(timeLeft)}</Text>
        </View>

        <View style={styles.presetsRow}>
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
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  timerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 80,
  },
  timerTitle: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
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
    justifyContent: 'space-between',
  },
  timerCircleWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a1c24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a2d35',
  },
  timerDisplayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  presetsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
  },
  presetBtn: {
    width: 44,
    height: 38,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '800',
  },
});
