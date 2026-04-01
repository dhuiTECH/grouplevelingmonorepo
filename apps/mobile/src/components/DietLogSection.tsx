import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import RecoveryTimerSection from './RecoveryTimerSection';
import {
  BeefIcon,
  DropletsIcon,
  FlameIcon,
  WheatIcon,
} from '@/components/icons/MacroNutrientIcons';

interface DietLogSectionProps {
  nutritionTotals?: {
    cals: number;
    prot: number;
    carbs: number;
    fats: number;
  };
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFats?: number;
  entryCount?: number;
  onLogNewEntry?: () => void;
  children?: React.ReactNode;
  /** Passed to recovery timer in full-screen modals (safe area). */
  recoveryTimerBottomInset?: number;
}

export default function DietLogSection({
  nutritionTotals = { cals: 1600, prot: 125, carbs: 180, fats: 65 },
  targetCalories = 2000,
  targetProtein = 150,
  targetCarbs = 200,
  targetFats = 65,
  entryCount = 0,
  onLogNewEntry,
  children,
  recoveryTimerBottomInset = 0,
}: DietLogSectionProps) {
  // --- Timer State ---
  const [timeLeft, setTimeLeft] = useState(0); 
  const [timerActive, setTimerActive] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setActivePreset(seconds);
    setTimerActive(true);
  };

  // --- Animation Setup for Calorie Ring ---
  const calCircumference = 2 * Math.PI * 42;
  const progress = Math.min(nutritionTotals.cals / targetCalories, 1);
  const calOffset = calCircumference - (calCircumference * progress);

  return (
    <View style={styles.container}>
      
      {/* --- STATS GRID --- */}
      <View style={styles.statsGrid}>
        
        {/* Calorie Ring */}
        <View style={styles.circleContainer}>
          <Svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Defs>
              <SvgLinearGradient id="flame" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#ff4500" />
                <Stop offset="50%" stopColor="#ff8c00" />
                <Stop offset="100%" stopColor="#ffce54" />
              </SvgLinearGradient>
            </Defs>
            {/* Background Track */}
            <Circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            {/* Active Progress */}
            <Circle 
              cx="50" cy="50" r="42" 
              fill="none" 
              stroke="url(#flame)" 
              strokeWidth="6" 
              strokeLinecap="round"
              strokeDasharray={calCircumference}
              strokeDashoffset={calOffset}
            />
          </Svg>
          <View style={styles.circleTextContainer}>
            <FlameIcon size={16} color="#ff8c00" style={{ marginBottom: 2 }} />
            <Text style={styles.calNumber}>{nutritionTotals.cals}</Text>
            <Text style={styles.calMax}>/ {targetCalories}</Text>
          </View>
        </View>

        {/* Macro Bars */}
        <View style={styles.macrosContainer}>
          <MacroBar 
            label="PROT" 
            value={`${nutritionTotals.prot}g`} 
            progress={Math.min(nutritionTotals.prot / targetProtein, 1)} 
            colorStart="#d4a040" colorEnd="#ffce54" 
            icon="protein"
          />
          <MacroBar 
            label="CARBS" 
            value={`${nutritionTotals.carbs}g`} 
            progress={Math.min(nutritionTotals.carbs / targetCarbs, 1)} 
            colorStart="#d4a040" colorEnd="#ffce54" 
            icon="carbs"
          />
          <MacroBar 
            label="FATS" 
            value={`${nutritionTotals.fats}g`} 
            progress={Math.min(nutritionTotals.fats / targetFats, 1)} 
            colorStart="#385b88" colorEnd="#6b9ac4" isBlue 
            icon="fats"
          />
        </View>
      </View>

      {/* --- INTAKE LOG HEADER --- */}
      <View style={styles.intakeHeader}>
        <View style={styles.intakeTitleWrap}>
          <View style={styles.intakeAccentBar} />
          <Text style={styles.intakeTitle}>INTAKE LOG</Text>
        </View>
        <Text style={styles.entryCount}>{entryCount} ENTRIES</Text>
      </View>

      {/* Children entries list — grows when parent is full-screen (e.g. training log modal) */}
      <View style={styles.childrenSlot}>
        {children}
      </View>

      {/* --- MAIN ACTION BUTTON --- */}
      <TouchableOpacity style={styles.mainBtnContainer} activeOpacity={0.8} onPress={onLogNewEntry}>
        <LinearGradient
          colors={['#e6a83a', '#c4831f']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.mainBtn}
        >
          <Text style={styles.mainBtnText}>+ LOG NEW ENTRY</Text>
        </LinearGradient>
      </TouchableOpacity>

      <RecoveryTimerSection
        timeLeft={timeLeft}
        initialSeconds={activePreset || 300}
        onPresetPress={startTimer}
        isActive={timerActive}
        bottomInset={recoveryTimerBottomInset}
      />
    </View>
  );
}

// --- SUB COMPONENTS ---

const MACRO_ICON_STYLE = { marginRight: 6 };

const MacroBar = ({ label, value, progress, colorStart, colorEnd, isBlue = false, icon = 'protein' }: { label: string; value: string; progress: number; colorStart: string; colorEnd: string; isBlue?: boolean; icon?: 'protein' | 'carbs' | 'fats' }) => {
  const macroIcon =
    icon === 'protein' ? (
      <BeefIcon size={14} color="#d4a040" style={MACRO_ICON_STYLE} />
    ) : icon === 'carbs' ? (
      <WheatIcon size={14} color="#d4a040" style={MACRO_ICON_STYLE} />
    ) : (
      <DropletsIcon size={14} color="#385b88" style={MACRO_ICON_STYLE} />
    );
  return (
    <View style={[styles.macroPill, isBlue ? styles.macroPillBlue : styles.macroPillGold]}>
      {macroIcon}
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fillContainer, { width: `${progress * 100}%` }]}>
          <LinearGradient
            colors={[colorStart, colorEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
      <Text style={styles.macroValue}>{value}</Text>
    </View>
  );
};

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 20,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  circleContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNumber: {
    color: 'white',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  calMax: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },
  macrosContainer: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'space-between',
    gap: 12,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 23, 31, 0.8)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 38,
  },
  macroPillGold: { borderColor: 'rgba(212, 160, 64, 0.5)' },
  macroPillBlue: { borderColor: 'rgba(56, 91, 136, 0.5)' },
  macroLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '800',
    width: 45,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  fillContainer: {
    height: '100%',
    borderRadius: 2,
  },
  macroValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    width: 35,
    textAlign: 'right',
  },

  // Intake Log Header
  intakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  intakeTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intakeAccentBar: {
    width: 4,
    height: 14,
    backgroundColor: '#ffce54',
    marginRight: 8,
    borderRadius: 2,
    shadowColor: '#ffce54', // Creates a slight glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  intakeTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  entryCount: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
  },
  childrenSlot: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  // Main Action Button
  mainBtnContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainBtn: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#ffd57a',
    borderWidth: 1,
    shadowColor: '#d4a040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  mainBtnText: {
    color: '#1a1c24',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
