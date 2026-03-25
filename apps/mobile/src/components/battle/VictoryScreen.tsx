import React, { useMemo } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Platform, useWindowDimensions, Text, Image, Pressable } from 'react-native';
import Svg, {
  Path,
  Rect,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  ClipPath,
  Text as SvgText,
  Line,
  Polyline,
  Pattern,
} from 'react-native-svg';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { BattleAssetWarmer } from '@/components/BattleAssetWarmer';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import LayeredAvatar from '@/components/LayeredAvatar';

// --- Types ---
interface VictoryPlayerStats {
  name: string;
  level: number;
  rank: string;
  currentExp: number;
  maxExp: number;
  expGained: number;
}

interface VictoryPartyMember {
  id: string;
  name: string;
  level?: number;
  currentHp: number;
  maxHp: number;
  isPet: boolean;
  imageUri: string;
  avatar?: any;
  petDetails?: any;
  type?: 'pet' | 'hunter';
}

interface VictoryReward {
  id: string;
  quantity: number;
  imageUri: string;
  rarityColor: string;
}

interface VictoryScreenProps {
  enemy: any;
  party: any[];
  spriteUrls: string[];
  petCaptureState: 'idle' | 'prompt' | 'saving' | 'done' | 'skipped';
  petNickname: string;
  setPetNickname: (v: string) => void;
  petCaptureError: string | null;
  hasCaptureItem: boolean;
  onConfirmCapture: () => void;
  onSkipCapture: () => void;
  onReturnToMap: () => void;
  player?: VictoryPlayerStats;
  victoryParty?: VictoryPartyMember[];
  rewards?: VictoryReward[];
}

// --- Components ---

const Scanlines = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(250)].map((_, i) => (
        <View
          key={i}
          style={{
            height: 1,
            backgroundColor: 'rgba(0, 210, 255, 0.1)',
            marginTop: 2,
          }}
        />
      ))}
    </View>
  );
};

const MechanicalBorder = ({ position }: { position: 'top' | 'bottom' }) => (
  <View style={[styles.mechBorder, position === 'top' ? { top: 0 } : { bottom: 0 }]}>
    <LinearGradient
      colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.mechInnerLine} />
  </View>
);

const CornerBracket = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const cornerStyle = {
    tl: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
    tr: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
    bl: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
    br: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },
  }[position];

  return <View style={[styles.cornerBracket, cornerStyle]} />;
};

export function VictoryScreen({
  enemy,
  party,
  spriteUrls,
  petCaptureState,
  petNickname,
  setPetNickname,
  petCaptureError,
  hasCaptureItem,
  onConfirmCapture,
  onSkipCapture,
  onReturnToMap,
  player,
  victoryParty,
  rewards,
}: VictoryScreenProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const isCatchable = !!enemy?.metadata?.catchable;
  const shouldShowCapture =
    isCatchable && petCaptureState !== 'done' && petCaptureState !== 'skipped';

  // --- Pet Capture View ---
  if (shouldShowCapture) {
    return (
      <View style={[styles.container, { justifyContent: 'center', paddingHorizontal: 24 }]}>
        <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={spriteUrls} />
        <View style={styles.petCaptureCard}>
          <Text style={styles.cinematicText}>VICTORY</Text>
          <Text style={styles.petCaptureTitle}>New Companion Detected</Text>
          <Text style={styles.petCaptureSubtitle}>
            You have subdued a rare entity. Use 1 Basic Capture Net to add it to your party.
          </Text>
          <View style={styles.petCaptureAvatarWrapper}>
            {enemy?.metadata ? (
              <OptimizedPetAvatar petDetails={enemy} size={120} square hideBackground forceLegacy={true} />
            ) : (
              <Text style={{ fontSize: 56 }}>🐾</Text>
            )}
          </View>
          <Text style={styles.petCaptureLabel}>PET NAME</Text>
          <TextInput
            value={petNickname}
            onChangeText={setPetNickname}
            placeholder="Enter codename"
            placeholderTextColor="#6b7280"
            style={styles.petCaptureInput}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={20}
          />
          {petCaptureError ? (
            <Text style={styles.petCaptureError}>{petCaptureError}</Text>
          ) : null}
          <View style={styles.petCaptureActions}>
            <TouchableOpacity
              onPress={onSkipCapture}
              style={[styles.exitBtn, styles.petCaptureSecondaryBtn]}
              disabled={petCaptureState === 'saving'}
            >
              <Text style={styles.petCaptureSecondaryText}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirmCapture}
              style={[styles.exitBtn, styles.petCapturePrimaryBtn]}
              disabled={petCaptureState === 'saving'}
            >
              <Text style={styles.exitBtnText}>
                {petCaptureState === 'saving' ? 'SAVING...' : 'CAPTURE PET'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- Data Prep ---
  const playerStats = player || {
    name: 'Hunter',
    level: 1,
    rank: 'E',
    currentExp: 0,
    maxExp: 100,
    expGained: 0,
  };

  const partyList = victoryParty || [];
  const rewardsList = rewards || [];
  
  const totalExp = playerStats.currentExp + playerStats.expGained;
  const expPercent = Math.min(1, totalExp / (playerStats.maxExp || 100));

  return (
    <View style={styles.container}>
      <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={spriteUrls} />
      <View style={styles.ambientGlow} />
      
      <View style={styles.centeredContent}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 450 }}
          style={styles.slWindow}
        >
          <Scanlines />
          <MechanicalBorder position="top" />
          <MechanicalBorder position="bottom" />
          
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />

          <View style={styles.contentPadding}>
            {/* Header Block */}
            <View style={styles.headerBlock}>
              <View style={styles.headerRow}>
                <View style={styles.iconSquareFrame}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.exclamationText}>!</Text>
                  </View>
                </View>
                <View style={styles.titleTextFrame}>
                  <Text style={styles.victoryTitle}>VICTORY</Text>
                </View>
              </View>
              <View style={styles.headerBottomLine}>
                <LinearGradient
                  colors={['transparent', '#00d2ff', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              
              <View style={styles.credentialsBlock}>
                <Text style={styles.credentialsText}>CREDENTIALS VERIFIED</Text>
                
                <View style={styles.rankContainer}>
                  <View style={styles.rankDiamond} />
                  <Text style={styles.rankLabel}>{playerStats.rank}</Text>
                </View>
                <Text style={styles.rankAchieved}>RANK ACHIEVED</Text>

                <Text style={styles.playerName}>{playerStats.name.toUpperCase()}</Text>
                <Text style={styles.playerLevel}>LEVEL {playerStats.level}</Text>
              </View>
            </View>

            {/* EXP Gauge */}
            <View style={styles.expSection}>
              <View style={styles.expInfo}>
                <Text style={styles.expLabel}>EXPERIENCE</Text>
                <Text style={styles.expGain}>+{playerStats.expGained}</Text>
              </View>
              <View style={styles.expTrack}>
                <View style={[styles.expFill, { width: `${expPercent * 100}%` }]}>
                  <LinearGradient
                    colors={['#0033aa', '#00d2ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <View style={styles.expTextContainer}>
                  <Text style={styles.expValueText}>
                    {totalExp.toLocaleString()} / {(playerStats.maxExp || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Party Status */}
            <View style={styles.partySection}>
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionTitle}>PARTY STATUS</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.partyGrid}>
                {partyList.slice(0, 4).map((stats: any, index: number) => {
                  const member = party[index] || {};
                  const borderColor = member.type === 'pet' ? '#b388ff' : '#00d2ff';
                  const maxHp = stats?.maxHp ?? member.maxHP ?? 100;
                  const currentHp = stats?.currentHp ?? member.hp ?? 0;
                  const hpPercent = maxHp > 0 ? currentHp / maxHp : 0;
                  const displayName = stats?.name ?? member.name ?? '—';
                  const level = stats?.level ?? member.level ?? 1;

                  return (
                    <View key={member.id || index} style={styles.partyCard}>
                      <View style={[styles.avatarBox, { borderColor }]}>
                        {member.type === 'pet' && member.petDetails ? (
                          <OptimizedPetAvatar petDetails={member.petDetails} size={50} square hideBackground forceLegacy={true} />
                        ) : member.avatar ? (
                          <LayeredAvatar user={member.avatar} size={50} square hideBackground />
                        ) : (
                          <Text style={{ fontSize: 12 }}>{member.type === 'pet' ? '🐕' : '👤'}</Text>
                        )}
                      </View>
                      <View style={styles.partyInfo}>
                        <Text numberOfLines={1} style={styles.partyName}>{displayName.toUpperCase()}</Text>
                        <View style={styles.hpTrack}>
                          <View style={[styles.hpFill, { width: `${hpPercent * 100}%` }]} />
                        </View>
                        <View style={styles.partySubInfo}>
                          <Text style={styles.partyLevel}>LV.{level}</Text>
                          <Text style={styles.partyHpText}>{Math.round(hpPercent * 100)}%</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Rewards */}
            <View style={styles.rewardsSection}>
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionTitle}>SYSTEM REWARDS</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <View style={styles.rewardsRow}>
                {rewardsList.slice(0, 4).map((reward) => (
                  <View key={reward.id} style={styles.rewardContainer}>
                    <View style={[styles.rewardBox, { borderColor: reward.rarityColor || '#00d2ff' }]}>
                      <Image source={{ uri: reward.imageUri }} style={styles.rewardImage} />
                    </View>
                    <Text style={styles.rewardQty}>x{reward.quantity}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer Button */}
            <TouchableOpacity style={styles.confirmButton} onPress={onReturnToMap} activeOpacity={0.8}>
              <Text style={styles.confirmButtonText}>CONFIRM</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#010206' },
  ambientGlow: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '50%',
    backgroundColor: '#0066ff',
    opacity: 0.1,
    borderRadius: 100,
    transform: [{ scale: 2 }],
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  slWindow: {
    width: '100%',
    maxWidth: 360,
    height: '95%',
    maxHeight: 720,
    backgroundColor: 'rgba(4, 12, 28, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.5)',
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  contentPadding: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  mechBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    zIndex: 60,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  mechInnerLine: {
    position: 'absolute',
    top: 1,
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#e6ffff',
    opacity: 0.5,
  },
  cornerBracket: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#00d2ff',
    zIndex: 70,
  },
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 25,
    position: 'relative',
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexShrink: 1,
    maxWidth: '100%',
  },
  headerBottomLine: {
    position: 'absolute',
    bottom: -1,
    left: '10%',
    width: '80%',
    height: 1,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  iconSquareFrame: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  exclamationText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
    fontFamily: 'Montserrat-Bold',
    includeFontPadding: false,
  },
  titleTextFrame: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    flexShrink: 1,
  },
  victoryTitle: {
    color: '#e6ffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat-Bold',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    textTransform: 'uppercase',
  },
  credentialsBlock: {
    marginTop: 16,
    alignItems: 'center',
  },
  credentialsText: {
    color: 'rgba(0, 210, 255, 0.4)',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 16,
  },
  rankContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  rankDiamond: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: '#00d2ff',
    backgroundColor: 'rgba(0, 68, 170, 0.2)',
    transform: [{ rotate: '45deg' }],
  },
  rankLabel: {
    color: '#e6ffff',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: '#00d2ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  rankAchieved: {
    color: '#aaddff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  playerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 210, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  playerLevel: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: 2,
  },
  expSection: {
    width: '100%',
  },
  expInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  expLabel: {
    color: 'rgba(0, 210, 255, 0.7)',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  expGain: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  expTrack: {
    height: 14,
    width: '100%',
    backgroundColor: '#010510',
    borderWidth: 1,
    borderColor: 'rgba(0, 68, 136, 0.4)',
    transform: [{ skewX: '-20deg' }],
    overflow: 'hidden',
  },
  expFill: {
    height: '100%',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  expTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '20deg' }], 
  },
  expValueText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  partySection: {
    width: '100%',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.3)',
  },
  sectionTitle: {
    color: 'rgba(0, 210, 255, 0.5)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 3,
    marginHorizontal: 12,
  },
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partyCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 34, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.1)',
    padding: 6,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    backgroundColor: '#020814',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partyInfo: {
    flex: 1,
    marginLeft: 8,
  },
  partyName: {
    color: '#e6ffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  hpTrack: {
    height: 4,
    backgroundColor: '#020612',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#00ff66',
  },
  partySubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  partyLevel: {
    color: 'rgba(0, 210, 255, 0.5)',
    fontSize: 7,
    fontWeight: 'bold',
  },
  partyHpText: {
    color: '#00ff66',
    fontSize: 7,
    fontWeight: 'bold',
  },
  rewardsSection: {
    width: '100%',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  rewardContainer: {
    alignItems: 'center',
  },
  rewardBox: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    backgroundColor: '#020814',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardImage: {
    width: 28,
    height: 28,
  },
  rewardQty: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#00e5ff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 229, 255, 0.8)',
    textShadowRadius: 4,
    textTransform: 'uppercase',
  },
  cinematicText: {
    fontSize: 64,
    fontStyle: 'italic',
    fontWeight: '900',
    color: 'white',
    textTransform: 'uppercase',
    textShadowColor: '#22d3ee',
    textShadowRadius: 20,
  },
  petCaptureCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  petCaptureTitle: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  petCaptureSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  petCaptureAvatarWrapper: { marginTop: 18, marginBottom: 12 },
  petCaptureLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
  },
  petCaptureInput: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    color: '#e5e7eb',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    fontSize: 18,
    fontWeight: '600',
  },
  petCaptureError: {
    color: '#fca5a5',
    fontSize: 13,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  petCaptureActions: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
    width: '100%',
  },
  petCaptureSecondaryBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  petCaptureSecondaryText: {
    color: '#e5e7eb',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 15,
  },
  petCapturePrimaryBtn: { flex: 1 },
  exitBtn: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
  },
  exitBtnText: { color: 'white', fontWeight: 'bold' },
});
