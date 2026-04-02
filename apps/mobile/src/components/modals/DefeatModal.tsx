import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Rect,
  G,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Text as SvgText,
  Line,
  Polyline,
} from 'react-native-svg';
import { MotiView, AnimatePresence } from 'moti';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import LayeredAvatar from '@/components/LayeredAvatar';
import {
  SYSTEM_WINDOW_FROM,
  SYSTEM_WINDOW_TO,
  SYSTEM_WINDOW_TRANSITION,
} from '@/utils/systemWindowMotion';

// --- Constants ---
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 1100;

export interface PlayerDefeatStats {
  name: string;
  level: number;
  rank: string;
  currentExp: number;
  maxExp: number;
  expLost: number;
}

export interface PartyMember {
  id: string;
  name: string;
  isPet: boolean;
  imageUri: string;
  avatar?: any;
  petDetails?: any;
  type?: 'pet' | 'hunter';
}

export interface PenaltyItem {
  id: string;
  amount: number;
  imageUri: string;
}

export interface DefeatModalProps {
  visible: boolean;
  onClose: () => void;
  player: PlayerDefeatStats;
  party: PartyMember[];
  penalties: PenaltyItem[];
  partyForOverlay?: any[]; // Kept for compatibility, but we use 'party' prop directly
}

export const DefeatModal: React.FC<DefeatModalProps> = ({
  visible,
  onClose,
  player,
  party = [],
  penalties = [],
  partyForOverlay = [],
}) => {
  // Use raw party from battle (partyForOverlay) for avatars so LayeredAvatar/PetLayeredAvatar get avatar/petDetails
  const partyForGrid = partyForOverlay.length > 0 ? partyForOverlay : party;
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  // Scale to fit; use uniform scale so text isn't stretched
  const baseScale = Math.min(SCREEN_WIDTH / VIEWBOX_WIDTH, SCREEN_HEIGHT / VIEWBOX_HEIGHT) * 1.2;
  const scaleX = baseScale;
  const scaleY = baseScale;

  if (!player) return null;

  const expPercent = Math.max((player.currentExp - player.expLost) / player.maxExp, 0);
  const expBarWidth = 380 * expPercent;

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0, translateY: 52 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 36 }}
          transition={{ type: 'timing', duration: 320 }}
          style={styles.overlay}
        >
          <SafeAreaView style={styles.safeFill} edges={['top', 'bottom']}>
          <View style={styles.container}>
            {/* Main Scaled Canvas — thin strip → full panel (matches web SystemWindow) */}
            <MotiView
              from={{
                scaleX,
                scaleY: scaleY * SYSTEM_WINDOW_FROM.scaleY,
                opacity: SYSTEM_WINDOW_FROM.opacity,
                translateY: 0,
              }}
              animate={{ scaleX, scaleY, opacity: SYSTEM_WINDOW_TO.opacity, translateY: 0 }}
              transition={SYSTEM_WINDOW_TRANSITION}
              style={{
                width: VIEWBOX_WIDTH,
                height: VIEWBOX_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
                transformOrigin: 'center',
              }}
            >
              
              {/* --- BACKGROUND SVG --- */}
              <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="def-panel-bg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#1a0206" stopOpacity="0.9" />
                    <Stop offset="0.5" stopColor="#0d0002" stopOpacity="0.95" />
                    <Stop offset="1" stopColor="#140104" stopOpacity="0.9" />
                  </LinearGradient>
                  <LinearGradient id="def-exp-grad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#660018" />
                    <Stop offset="0.7" stopColor="#cc0030" />
                    <Stop offset="1" stopColor="#ffb3c6" />
                  </LinearGradient>
                  <LinearGradient id="def-flare" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#660018" stopOpacity="0" />
                    <Stop offset="0.5" stopColor="#ff003c" />
                    <Stop offset="1" stopColor="#660018" stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="rank-grad-red" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#ffffff" />
                    <Stop offset="0.4" stopColor="#ff4d6d" />
                    <Stop offset="1" stopColor="#660018" />
                  </LinearGradient>
                  {/* Title fill only — stroke+fill on SvgText breaks counters (e.g. “A”) in react-native-svg */}
                  <LinearGradient id="defeat-title-fill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#ffc4cf" />
                    <Stop offset="0.45" stopColor="#ff4d6d" />
                    <Stop offset="1" stopColor="#8e0000" />
                  </LinearGradient>
                  <ClipPath id="def-exp-clip">
                    <Path d="M320,335 L680,335 L675,350 L315,350 Z" />
                  </ClipPath>
                </Defs>

                <Rect x="130" y="102" width="740" height="850" fill="url(#def-panel-bg)" stroke="#8e0000" strokeWidth="1" />
                <Rect x="80" y="100" width="840" height="4" fill="url(#def-flare)" />
                <Rect x="80" y="952" width="840" height="4" fill="url(#def-flare)" />

                <Polyline points="160,122 145,122 145,137" stroke="#ff4d6d" strokeWidth="2.5" fill="none" opacity="0.9" />
                <Polyline points="840,122 855,122 855,137" stroke="#ff4d6d" strokeWidth="2.5" fill="none" opacity="0.9" />
                <Polyline points="160,934 145,934 145,919" stroke="#ff4d6d" strokeWidth="2.5" fill="none" opacity="0.9" />
                <Polyline points="840,934 855,934 855,919" stroke="#ff4d6d" strokeWidth="2.5" fill="none" opacity="0.9" />

            {/* Main Title */}
            <SvgText x="500" y="70" fontSize={72} textAnchor="middle" fill="url(#defeat-title-fill)" fontWeight="700" letterSpacing="6">
              DEFEAT
            </SvgText>

            {/* Header Text Area */}
            {/* Top Line (Simple) - widened */}
            <Rect x="80" y="130" width="840" height="2" fill="url(#def-flare)" />

            <SvgText x="500" y="175" fontSize={38} textAnchor="middle" fill="#ffffff" fontWeight="bold" letterSpacing="4">
              PLAYER DEFEATED
            </SvgText>
            
            {/* Bottom Line - widened */}
            <Rect x="80" y="190" width="840" height="2" fill="url(#def-flare)" />
            
            {/* Rank with Diamond Border */}
            <Path d="M500,205 L545,250 L500,295 L455,250 Z" fill="none" stroke="url(#rank-grad-red)" strokeWidth="2" opacity="0.8" />
            <Path d="M500,210 L540,250 L500,290 L460,250 Z" fill="rgba(255, 77, 109, 0.2)" stroke="none" />

            <SvgText x="500" y="270" fontSize={38} textAnchor="middle" fill="url(#rank-grad-red)" fontWeight="bold" fontStyle="italic" letterSpacing="2">
              FAIL
            </SvgText>
            <SvgText x="500" y="315" fontSize={18} textAnchor="middle" fill="#ffb3c6" fontWeight="bold" letterSpacing="4">
              DUNGEON FAILED
            </SvgText>

            <SvgText x="500" y="365" fontSize={26} textAnchor="middle" fill="#ff4d6d" fontWeight="bold" letterSpacing="2">
              {player.name.toUpperCase()}
            </SvgText>
            <SvgText x="500" y="390" fontSize={18} textAnchor="middle" fill="#ffb3c6" fontWeight="bold" letterSpacing="2">
              LEVEL {player.level}
            </SvgText>

            <G transform="translate(0, 95)">
              <Path d="M320,335 L680,335 L675,350 L315,350 Z" fill="#050001" stroke="#cc0030" />
              <G clipPath="url(#def-exp-clip)">
                <Rect x="310" y="330" width={expBarWidth} height="25" fill="url(#def-exp-grad)" />
              </G>
              <SvgText x="500" y="346" fontSize={14} textAnchor="middle" fill="#ffffff" fontWeight="bold">
                {`${player.currentExp.toLocaleString()} / ${player.maxExp.toLocaleString()} EXP (-${player.expLost.toLocaleString()})`}
              </SvgText>
            </G>

            {/* Party Header Line - widened */}
            <G transform="translate(0, 115)">
              <Line x1="180" y1="375" x2="820" y2="375" stroke="#8e0000" strokeWidth="1" strokeDasharray="4,6" opacity="0.7" />
              <SvgText x="500" y="395" fontSize={16} textAnchor="middle" fill="#ffb3c6" fontWeight="bold" letterSpacing="2">
                PARTY STATUS
              </SvgText>
            </G>

            {/* Penalties Header Line - widened */}
            <G transform="translate(0, 240)">
              <Line x1="180" y1="380" x2="820" y2="380" stroke="#8e0000" strokeWidth="1" strokeDasharray="4,6" />
              <SvgText x="500" y="375" fontSize={16} textAnchor="middle" fill="#ffb3c6" fontWeight="bold" letterSpacing="2">
                PENALTIES APPLIED
              </SvgText>
            </G>
              </Svg>

              {/* --- NATIVE CONTENT LAYER — above SVG --- */}
              
              {/* Party Grid */}
              <View style={{ position: 'absolute', top: 520, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 20, zIndex: 10, elevation: 10 }}>
                {partyForGrid.slice(0, 3).map((member: any, index: number) => {
                  return (
                    <MotiView 
                      key={member.id} 
                      from={{ opacity: 0, translateY: 20 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ delay: 300 + (index * 100) }}
                      style={{ width: 140, height: 60, flexDirection: 'row', alignItems: 'center' }}
                    >
                      {/* Avatar Box — LayeredAvatar / PetLayeredAvatar physically inside grid */}
                      <View style={{ 
                        width: 40, height: 40, 
                        borderRadius: 4, 
                        borderWidth: 1.5, 
                        borderColor: '#8e0000',
                        backgroundColor: '#050001',
                        overflow: 'hidden',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: 0.9,
                      }}>
                        {member.type === 'pet' && member.petDetails ? (
                          <OptimizedPetAvatar petDetails={member.petDetails} size={40} square hideBackground forceLegacy={true} />
                        ) : member.avatar ? (
                          <LayeredAvatar user={member.avatar} size={40} square hideBackground />
                        ) : null}
                      </View>

                      {/* Info */}
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ 
                          color: '#8e0000', 
                          fontSize: 12, 
                          fontWeight: 'bold', 
                          textDecorationLine: 'line-through',
                          fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif' 
                        }}>
                          {member.name.toUpperCase()}
                        </Text>
                        <View style={{ height: 4, backgroundColor: '#1a0206', borderRadius: 2, marginTop: 4, width: '100%' }}>
                          <View style={{ height: '100%', width: 0, backgroundColor: '#ff1744' }} />
                        </View>
                        <Text style={{ color: '#ff1744', fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>
                          0% HP (DEAD)
                        </Text>
                      </View>
                    </MotiView>
                  );
                })}
              </View>

              {/* Penalties Grid */}
              <View style={{ position: 'absolute', top: 720, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 15, zIndex: 10, elevation: 10 }}>
                {penalties.map((penalty, index) => (
                  <MotiView
                    key={penalty.id}
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 800 + (index * 100) }}
                    style={{ alignItems: 'center' }}
                  >
                    <View style={{ 
                      width: 60, height: 60, 
                      borderRadius: 12, 
                      backgroundColor: 'rgba(2, 6, 23, 0.8)', 
                      borderWidth: 1.5, 
                      borderColor: '#ff1744',
                      justifyContent: 'center', alignItems: 'center'
                    }}>
                       <Image source={{ uri: penalty.imageUri }} style={{ width: 40, height: 40 }} resizeMode="contain" />
                    </View>
                    <Text style={{ color: '#ffb3c6', fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                      -{penalty.amount}
                    </Text>
                  </MotiView>
                ))}
              </View>

              {/* Accept Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={onClose}
                style={{ 
                  position: 'absolute', 
                  top: 1050, 
                  left: 410, 
                  width: 180, 
                  height: 42,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Rect width="100%" height="100%" rx="2" fill="url(#def-flare)" stroke="#ff4d6d" strokeWidth="1.5" />
                </Svg>
                <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: 'bold', letterSpacing: 4 }}>ACCEPT</Text>
              </TouchableOpacity>

            </MotiView>
          </View>
          </SafeAreaView>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  safeFill: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
