import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { HolographicGlass } from './HolographicGlass';
import { FootprintsIcon } from './MapIcons';

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
        <HolographicGlass style={styles.topPill} contentStyle={styles.topPillContent} hideGlow>
          <FootprintsIcon />
          <GlowingStepCounter steps={steps} />
        </HolographicGlass>
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
    borderRadius: 30,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  topPillContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 80,
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

