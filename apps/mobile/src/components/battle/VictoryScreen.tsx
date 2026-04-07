import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Platform, Text, Image, type ImageSourcePropType } from 'react-native';
import coinIcon from '@assets/coinicon.png';
import expCrystal from '@assets/expcrystal.png';
import gemIcon from '@assets/gemicon.png';
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
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BattleAssetWarmer } from '@/components/BattleAssetWarmer';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import LayeredAvatar from '@/components/LayeredAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { claimLoot, type ClaimLootResult } from '@/lib/claimLoot';
import {
  SYSTEM_WINDOW_FROM,
  SYSTEM_WINDOW_TO,
  SYSTEM_WINDOW_TRANSITION,
} from '@/utils/systemWindowMotion';
import exclamationIcon from '@assets/exclamation.png';

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
  source: ImageSourcePropType;
  rarityColor: string;
}

export interface VictoryScreenProps {
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
  /** Dedupes optimistic reward apply across React Strict Mode remounts. */
  rewardApplyKey?: string;
  /** Encounter UUID — optional override for claim_loot source when no tier. */
  encounterId?: string;
  /** Resolved battle tier key, e.g. battle_tier_3 — primary source for claim_loot('battle', ...). */
  battleLootSourceId?: string;
  /** Resolve shop_item_id → image for `lootResult.items` (same as admin shop_items). */
  shopItems?: { id: string; image_url?: string | null; name?: string; rarity?: string }[];
  /** Capture net was already used and consumed during the fight — only naming + DB save remain. */
  capturedDuringBattle?: boolean;
}

function borderColorForShopRarity(rarity?: string): string {
  const r = (rarity || '').toLowerCase();
  if (r === 'legendary' || r === 'monarch') return '#fbbf24';
  if (r === 'epic') return '#a855f7';
  if (r === 'rare') return '#38bdf8';
  if (r === 'uncommon') return '#4ade80';
  return '#22d3ee';
}

const appliedVictoryRewardKeys = new Set<string>();

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
  rewardApplyKey,
  encounterId,
  battleLootSourceId,
  shopItems,
  capturedDuringBattle = false,
}: VictoryScreenProps) {
  const { user, setUser } = useAuth();

  const isCatchable = !!enemy?.metadata?.catchable;
  const shouldShowCapture =
    isCatchable && petCaptureState !== 'done' && petCaptureState !== 'skipped';

  const [lootResult, setLootResult] = useState<ClaimLootResult | null>(null);

  const attemptClaimLoot = useCallback(async () => {
    if (shouldShowCapture || !rewardApplyKey || !user?.id) return;
    if (appliedVictoryRewardKeys.has(rewardApplyKey)) return;

    try {
      const sourceId = battleLootSourceId ?? encounterId ?? 'default';
      const result = await claimLoot('battle', sourceId, rewardApplyKey);
      setLootResult(result);

      if (result.ok) {
        appliedVictoryRewardKeys.add(rewardApplyKey);
        setUser((prev) =>
          prev?.id
            ? {
                ...prev,
                exp: result.exp_total ?? prev.exp ?? 0,
                coins: result.coins_total ?? prev.coins ?? 0,
                gems: result.gems_total ?? prev.gems ?? 0,
              }
            : prev,
        );
      }
    } catch {
      /* claim failed — optimistic rewards from props still show */
    }
  }, [shouldShowCapture, rewardApplyKey, user?.id, encounterId, battleLootSourceId, setUser]);

  useEffect(() => {
    void attemptClaimLoot();
  }, [attemptClaimLoot]);

  const rewardsList: VictoryReward[] = useMemo(() => {
    if (!lootResult?.ok) return rewards || [];
    const currency: VictoryReward[] = [
      ...(lootResult.coins_delta
        ? [{ id: 'gold', quantity: lootResult.coins_delta, source: coinIcon, rarityColor: '#fbbf24' }]
        : []),
      ...(lootResult.exp_delta
        ? [{ id: 'exp', quantity: lootResult.exp_delta, source: expCrystal, rarityColor: '#3b82f6' }]
        : []),
      ...(lootResult.gems_delta
        ? [{ id: 'gems', quantity: lootResult.gems_delta, source: gemIcon, rarityColor: '#a855f7' }]
        : []),
    ];
    const grants = lootResult.items ?? [];
    const itemRewards: VictoryReward[] = grants.map((g, i) => {
      const shop = shopItems?.find((s) => s.id === g.shop_item_id);
      const src = shop?.image_url ? { uri: shop.image_url } : exclamationIcon;
      return {
        id: `loot-item-${g.shop_item_id}-${i}`,
        quantity: g.quantity,
        source: src,
        rarityColor: borderColorForShopRarity(shop?.rarity),
      };
    });
    return [...currency, ...itemRewards];
  }, [lootResult, rewards, shopItems]);

  // --- Pet Capture View (same system window chrome as main victory) ---
  if (shouldShowCapture) {
    const captureBody = capturedDuringBattle
      ? 'Combat capture complete — your net was already spent during this fight. Enter a codename to finalize registry.'
      : 'Victory secured. Confirming will consume one capture item from your inventory and bind this entity to your party.';
    const primaryCta =
      petCaptureState === 'saving'
        ? 'REGISTERING…'
        : capturedDuringBattle
          ? 'REGISTER'
          : 'USE ITEM & REGISTER';

    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={spriteUrls} />
        <View style={styles.ambientGlow} />
        <View style={styles.centeredContent}>
          <MotiView
            from={SYSTEM_WINDOW_FROM}
            animate={SYSTEM_WINDOW_TO}
            transition={SYSTEM_WINDOW_TRANSITION}
            style={[styles.petCaptureSystemWindow, { transformOrigin: 'center' }]}
          >
            <Scanlines />
            <MechanicalBorder position="top" />
            <MechanicalBorder position="bottom" />
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />

            <View style={styles.petCaptureContentPadding}>
              <View style={styles.headerBlock}>
                <View style={styles.headerRow}>
                  <View style={styles.iconSquareFrame}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.exclamationText}>+</Text>
                    </View>
                  </View>
                  <View style={styles.titleTextFrame}>
                    <Text style={styles.victoryTitle}>COMPANION REGISTRY</Text>
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
              </View>

              <View style={styles.captureProtocolBlock}>
                <Text style={styles.credentialsText}>SYSTEM CREDENTIALS</Text>
                <Text style={styles.captureBodyText}>{captureBody}</Text>
              </View>

              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionTitle}>TARGET SIGNATURE</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.petCaptureAvatarFrame}>
                {enemy?.metadata ? (
                  <OptimizedPetAvatar petDetails={enemy} size={112} square hideBackground forceLegacy={true} />
                ) : (
                  <Text style={{ fontSize: 48 }}>🐾</Text>
                )}
              </View>

              <Text style={styles.petCaptureLabelSystem}>CODENAME</Text>
              <TextInput
                value={petNickname}
                onChangeText={setPetNickname}
                placeholder="Enter designation"
                placeholderTextColor="rgba(0, 210, 255, 0.35)"
                style={styles.petCaptureInputSystem}
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
                  style={styles.captureRowButtonOutline}
                  disabled={petCaptureState === 'saving'}
                  activeOpacity={0.85}
                >
                  <Text style={styles.captureOutlineButtonText}>SKIP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirmCapture}
                  style={[styles.captureRowButtonPrimary, petCaptureState === 'saving' && { opacity: 0.85 }]}
                  disabled={petCaptureState === 'saving'}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmButtonText}>{primaryCta}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </MotiView>
        </View>
      </SafeAreaView>
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

  /** BattleScreen estimates EXP from encounter metadata; claim_loot is authoritative — keep gauge + "+X" in sync with rewards. */
  const serverLootOk = lootResult?.ok === true;
  const displayExpGained =
    serverLootOk && typeof lootResult.exp_delta === "number"
      ? lootResult.exp_delta
      : playerStats.expGained;
  const displayTotalExp =
    serverLootOk && typeof lootResult.exp_total === "number"
      ? lootResult.exp_total
      : playerStats.currentExp + playerStats.expGained;
  const expPercent = Math.min(1, displayTotalExp / (playerStats.maxExp || 100));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={spriteUrls} />
      <View style={styles.ambientGlow} />
      
      <View style={styles.centeredContent}>
        <MotiView
          from={SYSTEM_WINDOW_FROM}
          animate={SYSTEM_WINDOW_TO}
          transition={SYSTEM_WINDOW_TRANSITION}
          style={[styles.slWindow, { transformOrigin: 'center' }]}
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
                <Text style={styles.expGain}>+{displayExpGained}</Text>
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
                    {displayTotalExp.toLocaleString()} / {(playerStats.maxExp || 0).toLocaleString()}
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
                {rewardsList.map((reward) => (
                  <View key={reward.id} style={styles.rewardContainer}>
                    <View style={[styles.rewardBox, { borderColor: reward.rarityColor || '#00d2ff' }]}>
                      <Image source={reward.source} style={styles.rewardImage} />
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
    </SafeAreaView>
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
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    rowGap: 16,
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
  /** Same chrome as `slWindow` but sized for the companion form (no 95% height). */
  petCaptureSystemWindow: {
    width: '100%',
    maxWidth: 360,
    minHeight: 400,
    maxHeight: 620,
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
  petCaptureContentPadding: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
    paddingBottom: 22,
  },
  captureProtocolBlock: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  captureBodyText: {
    color: '#aaddff',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 6,
    letterSpacing: 0.3,
  },
  petCaptureAvatarFrame: {
    marginTop: 10,
    marginBottom: 6,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.55)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    padding: 6,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  petCaptureLabelSystem: {
    color: 'rgba(0, 210, 255, 0.55)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 6,
  },
  petCaptureInputSystem: {
    width: '100%',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#e6ffff',
    backgroundColor: 'rgba(2, 12, 32, 0.95)',
    fontSize: 16,
    fontWeight: '600',
  },
  petCaptureError: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  petCaptureActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
    width: '100%',
  },
  captureRowButtonOutline: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureOutlineButtonText: {
    color: '#e6ffff',
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 3,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  captureRowButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#00e5ff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
});
