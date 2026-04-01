import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { FootprintsIcon } from './MapIcons';

const PANEL_WIDTH = 180;
const PANEL_HEIGHT = 58;

interface TechPanelBackgroundProps {
  width: number;
  height: number;
  color?: string;
  fillOpacity?: number;
}

function TechPanelBackground({ 
  width, 
  height, 
  color = '#00E5FF',
  fillOpacity = 0.25
}: TechPanelBackgroundProps) {
  // Calculate corner cut size based on height to maintain proportion
  const corner = Math.min(28, height * 0.4); 
  
  // Create paths dynamically based on width and height
  const mainPath = `M 0 ${corner} L ${corner} 0 L ${width} 0 L ${width} ${height - corner} L ${width - corner} ${height} L 0 ${height} Z`;
  const topLeftGlow = `M 0 ${corner + 17} L 0 ${corner} L ${corner} 0 L ${corner + 17} 0`;
  const bottomRightGlow = `M ${width} ${height - corner - 17} L ${width} ${height - corner} L ${width - corner} ${height} L ${width - corner - 17} ${height}`;
  
  // Inner frame needs a bit of padding
  const p = 10; // padding
  const innerCorner = Math.max(0, corner - p + 4); // adjusted corner for inner frame
  const innerPath = `M ${p} ${p + innerCorner} L ${p + innerCorner} ${p} L ${width - p} ${p} L ${width - p} ${height - p - innerCorner} L ${width - p - innerCorner} ${height - p} L ${p} ${height - p} Z`;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={StyleSheet.absoluteFill}
      preserveAspectRatio="none"
    >
      {/* Full-panel glow (soft halo) */}
      <Path
        d={mainPath}
        fill="none"
        stroke={color}
        strokeWidth={16}
        strokeOpacity={0.12}
        strokeLinejoin="miter"
      />
      {/* Outer metallic silver border + translucent liquid glass fill */}
      <Path
        d={mainPath}
        fill={`rgba(0,10,20,${fillOpacity})`}
        stroke="#b0b8c0"
        strokeWidth={2}
        strokeLinejoin="miter"
      />
      {/* Top-left glow: thick low-opacity stroke */}
      <Path
        d={topLeftGlow}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeOpacity={0.25}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Top-left glow: standard stroke */}
      <Path
        d={topLeftGlow}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Bottom-right glow: thick low-opacity stroke */}
      <Path
        d={bottomRightGlow}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeOpacity={0.25}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Bottom-right glow: standard stroke */}
      <Path
        d={bottomRightGlow}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Inner frame */}
      <Path
        d={innerPath}
        fill="none"
        stroke={color}
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
  /** Client-side movement budget (pedometer). Falls back to profile when omitted. */
  localSteps?: number;
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
  localSteps,
}) => {
  const { user } = useAuth();
  const steps =
    localSteps !== undefined ? localSteps : user?.steps_banked || 0;
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
          <TechPanelBackground width={PANEL_WIDTH} height={PANEL_HEIGHT} color="#00E5FF" />
          <View style={styles.topPillContent}>
            <View style={{ transform: [{ translateX: 6 }] }}>
              <FootprintsIcon />
            </View>
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
      <TouchableOpacity style={[styles.floatingMapBtn, styles.worldBtn]} onPress={onPressWorld}>
        <View style={StyleSheet.absoluteFill}>
          <TechPanelBackground width={60} height={60} color="#22d3ee" fillOpacity={0.6} />
        </View>
        <Ionicons 
          name="compass" 
          size={16} 
          color="#22d3ee" 
          style={{ transform: [{ translateX: 2 }] }} 
        />
        <View style={{ transform: [{ translateX: -5 }] }}>
          <Text style={styles.mapBtnText}>WORLD</Text>
        </View>
      </TouchableOpacity>

      {/* BATTLE button */}
      <TouchableOpacity
        style={[styles.floatingMapBtn, styles.battleBtn]}
        onPress={onPressBattle}
      >
        <View style={StyleSheet.absoluteFill}>
          <TechPanelBackground width={60} height={60} color="#ef4444" fillOpacity={0.6} />
        </View>
        <Ionicons name="skull" size={16} color="#ef4444" />
        <View style={{ transform: [{ translateX: -3 }] }}>
          <Text style={[styles.mapBtnText, { color: '#ef4444' }]}>BATTLE</Text>
        </View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  hudTop: {
    position: 'absolute',
    top: 62,
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
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  worldBtn: {
    right: 20,
    shadowColor: '#22d3ee',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  battleBtn: {
    right: 20,
    top: 130,
    shadowColor: '#ef4444',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  mapBtnText: {
    color: '#22d3ee',
    fontSize: 6,
    fontWeight: '900',
    marginTop: 0,
    letterSpacing: 0.5,
    zIndex: 2,
  },
});

