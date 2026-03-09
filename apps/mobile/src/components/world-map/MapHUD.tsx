import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { FootprintsIcon } from './MapIcons';

const PANEL_WIDTH = 180;
const PANEL_HEIGHT = 58;

function TechPanelBackground() {
  return (
    <Svg
      width={PANEL_WIDTH}
      height={PANEL_HEIGHT}
      viewBox="0 0 340 110"
      style={StyleSheet.absoluteFill}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Full-panel glow (soft cyan halo) */}
      <Path
        d="M 0 28 L 28 0 L 340 0 L 340 82 L 312 110 L 0 110 Z"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={16}
        strokeOpacity={0.12}
        strokeLinejoin="miter"
      />
      {/* Outer metallic silver border + translucent liquid glass fill */}
      <Path
        d="M 0 28 L 28 0 L 340 0 L 340 82 L 312 110 L 0 110 Z"
        fill="rgba(0,10,20,0.25)"
        stroke="#b0b8c0"
        strokeWidth={2}
        strokeLinejoin="miter"
      />
      {/* Top-left glow: thick low-opacity stroke */}
      <Path
        d="M 0 45 L 0 28 L 28 0 L 45 0"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={12}
        strokeOpacity={0.25}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Top-left glow: standard stroke */}
      <Path
        d="M 0 45 L 0 28 L 28 0 L 45 0"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Bottom-right glow: thick low-opacity stroke */}
      <Path
        d="M 340 65 L 340 82 L 312 110 L 295 110"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={12}
        strokeOpacity={0.25}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Bottom-right glow: standard stroke */}
      <Path
        d="M 340 65 L 340 82 L 312 110 L 295 110"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Inner cyan frame */}
      <Path
        d="M 10 34 L 34 10 L 330 10 L 330 76 L 306 100 L 10 100 Z"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={1.5}
        strokeLinejoin="miter"
      />
    </Svg>
  );
}

interface MapHUDProps {
  onPressTemple: () => void;
  onPressWorld: () => void;
  onPressBattle: () => void;
  floatAnim: Animated.Value;
}

const GlowingStepCounter = ({ steps }: { steps: number }) => {
  const text = steps.toLocaleString();

  return (
    <View style={styles.topPillTextWrapper}>
      <Text style={styles.topPillText}>{text}</Text>
    </View>
  );
};

export const MapHUD: React.FC<MapHUDProps> = ({
  onPressTemple,
  onPressWorld,
  onPressBattle,
  floatAnim,
}) => {
  const { user } = useAuth();
  const steps = user?.steps_banked || 0;
  const currentTier = user?.rank_tier ?? 0;
  const nextMilestone = (currentTier + 1) * 30;
  const isAdvancementLocked = Boolean(
    user?.next_advancement_attempt && new Date(user.next_advancement_attempt).getTime() > Date.now()
  );
  const canAttemptAdvancement = (user?.level || 0) >= nextMilestone && !isAdvancementLocked;

  return (
    <>
      <Animated.View style={[styles.hudTop, { transform: [{ translateY: floatAnim }] }]}>
        <View style={styles.topPill}>
          <TechPanelBackground />
          <View style={styles.topPillContent}>
            <FootprintsIcon />
            <GlowingStepCounter steps={steps} />
          </View>
        </View>
        {canAttemptAdvancement && (
          <TouchableOpacity
            style={styles.advancementBanner}
            onPress={onPressTemple}
            activeOpacity={0.9}
          >
            <Ionicons name="flame" size={18} color="#eab308" />
            <Text style={styles.advancementBannerText}>
              Advancement trial available — Tap to enter Temple
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* WORLD button */}
      <TouchableOpacity style={styles.floatingMapBtn} onPress={onPressWorld}>
        <Ionicons name="compass" size={24} color="#22d3ee" />
        <Text style={styles.mapBtnText}>WORLD</Text>
      </TouchableOpacity>

      {/* BATTLE button */}
      <TouchableOpacity
        style={[styles.floatingMapBtn, { top: 120, borderColor: '#ef4444' }]}
        onPress={onPressBattle}
      >
        <Ionicons name="skull" size={24} color="#ef4444" />
        <Text style={[styles.mapBtnText, { color: '#ef4444' }]}>BATTLE</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  hudTop: {
    position: 'absolute',
    top: 60,
    width: '100%',
    alignItems: 'center',
    zIndex: 20,
  },
  topPill: {
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  topPillContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topPillTextWrapper: {
    marginLeft: -6,
    marginRight: -16,
    marginVertical: -12,
  },
  topPillText: {
    color: '#00E5FF',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textShadowColor: 'rgba(0, 229, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  advancementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eab308',
    maxWidth: '90%',
  },
  advancementBannerText: {
    color: '#eab308',
    fontWeight: 'bold',
    fontSize: 12,
  },
  floatingMapBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22d3ee',
    zIndex: 40,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  mapBtnText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },
});

