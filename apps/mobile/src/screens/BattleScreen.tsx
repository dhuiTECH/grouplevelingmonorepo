import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Animated, SafeAreaView, StatusBar, StyleSheet, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRank } from '@/utils/stats';
import { useBattleLogic, PHASE, ACTOR_TYPE } from '@/hooks/useBattleLogic';
import { useAudio } from '@/contexts/AudioContext';
import { getPetSpriteConfig } from '@/utils/pet-sprites';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BattleAssetWarmer } from '@/components/BattleAssetWarmer';
import { useBattleMusic } from '@/hooks/useBattleMusic';
import { usePets } from '@/hooks/usePets';
import BossWarningOverlay from '@/components/BossWarningOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { useTransition } from '@/context/TransitionContext';
import { supabase } from '@/lib/supabase';
import { getCaptureItemCount, findOneCaptureCosmetic, isCaptureItem } from '@/utils/captureItem';
import type { UserCosmetic } from '@/types/user';
import { COLORS, BATTLE_INVENTORY_SLOTS, BATTLE_TAP_TO_CONFIRM_KEY, MELEE_IMPACT_ENTRY_DELAY_MS } from '@/components/battle/battleTheme';
import { battleScreenStyles as styles } from '@/components/battle/battleScreenStyles';
import { BattleFieldHud } from '@/components/battle/BattleFieldHud';
import { BattleSkillSpriteVfxHost } from '@/components/battle/BattleSkillSpriteVfxHost';
import { EnemyBlock } from '@/components/battle/EnemyBlock';
import { PartyRow } from '@/components/battle/PartyRow';
import { TopHUD } from '@/components/battle/TopHUD';
import { BattleBottomPanel } from '@/components/battle/BattleBottomPanel';
import { ParryOverlay } from '@/components/battle/ParryOverlay';
import { SequenceFeedbackOverlay } from '@/components/battle/SequenceFeedbackOverlay';
import { VictoryScreen } from '@/components/battle/VictoryScreen';
import { DefeatModal } from '@/components/modals/DefeatModal';
import { BattleSettingsModal } from '@/components/battle/BattleSettingsModal';
import { BattleInventoryModal } from '@/components/battle/BattleInventoryModal';
import { BattleEffectsLayer } from '@/components/battle/vfx/BattleEffectsLayer';
import { DamageNumberLayer } from '@/components/battle/vfx/DamageNumberLayer';
import { ImpactEffects } from '@/components/battle/ImpactEffects';
import { useBattleVisualDamage } from '@/hooks/useBattleVisualDamage';
import { resolvePartyMemberAvatarUri } from '@/utils/partyMemberAvatarUri';
import { unloadSfxCache } from '@/utils/audio';

export default function BattleScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { encounterId, raidId, isBoss, mapId } = route.params || {};
  const { user, setUser } = useAuth();
  const { isTransitioning } = useTransition();
  const { isMuted, setMuted, stopBackgroundMusic, playTrack } = useAudio();

  useEffect(() => {
    stopBackgroundMusic();
    return () => {
      unloadSfxCache();
    };
  }, [stopBackgroundMusic]);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [tapToConfirm, setTapToConfirm] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(BATTLE_TAP_TO_CONFIRM_KEY).then((v) => {
      if (v !== null) setTapToConfirm(v === 'true');
    });
  }, []);

  const handleTapToConfirmToggle = (value: boolean) => {
    setTapToConfirm(value);
    AsyncStorage.setItem(BATTLE_TAP_TO_CONFIRM_KEY, value ? 'true' : 'false');
  };

  const {
    loading,
    assetsLoaded,
    party,
    enemy,
    currentPhase,
    stance,
    activeIndex,
    setActiveIndex,
    logs,
    turnQueue,
    queueIndex,
    chainCount,
    comboMultiplier,
    focusMode,
    burstCharged,
    plannedAbilities,
    selectedAbilityId,
    enemyTargetId,
    qteTargets,
    handleQteTap,
    handleQteSwipe,
    parryTimerAnim, // Updated from parryTimer
    successFlash,
    failFlash,
    sequenceFeedback,
    shakeAnim,
    activeChar,
    activeActorType,
    turnActorDisplayName,
    isPlayerTurnPhase,
    currentAbility,
    switchStance,
    processPlannedActions,
    undoLastAction,
    skipTurn,
    handleAbilityTap,
    getProjectedDetail,
    lastDamageEvent,
    lastSkillAnimationConfig,
    preloadedSpriteUrls,
    clearLastSkillAnimation,
    setCurrentPhase,
  } = useBattleLogic({ encounterId, raidId, isBoss, tapToConfirm, currentMapId: mapId });

  const { addPet } = usePets();

  const weaponGripCast = useMemo(() => {
    if (!lastDamageEvent?.timestamp || !lastDamageEvent.casterCharId) return null;
    const caster = party.find((p: any) => p.id === lastDamageEvent.casterCharId);
    if (!caster || caster.type === 'pet') return null;
    if (!caster.avatar) return null;
    const vfx = lastSkillAnimationConfig?.vfx_type ?? 'impact';
    const toEnemy = lastDamageEvent.targetId === 'ENEMY';
    const isCloseRange = vfx === 'melee' || vfx === 'impact';
    return {
      key: lastDamageEvent.timestamp as number,
      durationMs: lastSkillAnimationConfig?.duration_ms ?? 500,
      casterCharId: lastDamageEvent.casterCharId as string,
      delayMs: toEnemy && isCloseRange ? MELEE_IMPACT_ENTRY_DELAY_MS : 0,
    };
  }, [
    lastDamageEvent?.timestamp,
    lastDamageEvent?.casterCharId,
    lastDamageEvent?.targetId,
    lastSkillAnimationConfig?.duration_ms,
    lastSkillAnimationConfig?.vfx_type,
    party,
  ]);

  const [showWarning, setShowWarning] = useState(isBoss);
  const [petCaptureState, setPetCaptureState] = useState<'idle' | 'prompt' | 'saving' | 'done' | 'skipped'>('idle');
  const [petNickname, setPetNickname] = useState('');
  const [allShopItems, setAllShopItems] = useState<any[]>([]);
  const [petCaptureError, setPetCaptureError] = useState<string | null>(null);
  /** True when the player used a capture item during battle (item already consumed; victory screen is for naming only). */
  const [capturedDuringBattle, setCapturedDuringBattle] = useState(false);
  /** Stable id for one victory reward apply (Strict Mode / remount safe). */
  const [victoryRewardApplyKey, setVictoryRewardApplyKey] = useState<string | null>(null);

  useEffect(() => {
    if (currentPhase === PHASE.VICTORY) {
      setVictoryRewardApplyKey((k) => k ?? `vr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    } else {
      setVictoryRewardApplyKey(null);
    }
  }, [currentPhase]);

  // Hand-grip cosmetics: load after first paint so battle init isn’t competing with a full-table fetch
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        const { data, error } = await supabase.from('shop_items').select('*');
        if (!error && data) setAllShopItems(data);
      })();
    });
    return () => task.cancel?.();
  }, []);

  const partyOpacity = useRef(new Animated.Value(0)).current;

  // Use the new hook for battle music
  useBattleMusic(enemy, !loading);

  // Fade in party only after encounter walk-in overlay has fully faded (so walk-in happens first, then they appear)
  useEffect(() => {
    if (isTransitioning) return;
    // Removed 80ms delay and shortened duration to 250ms for snappier appearance
    Animated.timing(partyOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    // Trigger pet entrance animation once in position
    setPetAction('enter');
  }, [isTransitioning]);

  const [petSpriteActive, setPetSpriteActive] = useState(false);
  const [enemySpriteActive, setEnemySpriteActive] = useState(false);
  
  // Pet and enemy animation actions
  const [petAction, setPetAction] = useState<'idle' | 'enter'>('idle'); // Start idle, trigger after transition
  const [enemyAction, setEnemyAction] = useState<'idle' | 'enter'>('enter'); // Enemy can start enter immediately as they are on top

  const petInParty = party.find((c: any) => c.type === 'pet');
  const petCycleDuration = useMemo(() => {
    const cfg = petInParty?.petDetails ? getPetSpriteConfig(petInParty.petDetails) : null;
    return cfg ? Math.ceil((cfg.totalFrames / cfg.fps) * 1000) : 1600;
  }, [petInParty?.petDetails]);

  const enemyCycleDuration = useMemo(() => {
    const cfg = enemy?.metadata ? getPetSpriteConfig(enemy) : null;
    return cfg ? Math.ceil((cfg.totalFrames / cfg.fps) * 1000) : 1600;
  }, [enemy?.metadata]);

  // Extract battlefield background if present
  const battlefieldBg = enemy?.metadata?.bg_url || enemy?.metadata?.visuals?.bg_url;

  useEffect(() => {
    if (loading || !assetsLoaded) return;
    const longest = Math.max(petCycleDuration, enemyCycleDuration, 2000);
    // Adjusted timing to better match sprite sheet length
    // Previously was stopping too early/late. 
    // Now just ensures we don't clear if active phase is still on unless needed.
    const t = setTimeout(() => {
      // Only auto-stop if not in a critical phase
      if (currentPhase === PHASE.ACTIVE) {
        setPetSpriteActive(false);
        setEnemySpriteActive(false);
      }
    }, longest);
    return () => clearTimeout(t);
  }, [loading, assetsLoaded, petCycleDuration, enemyCycleDuration, currentPhase]);

  useEffect(() => {
    if (activeActorType === ACTOR_TYPE.PET && currentPhase === PHASE.ACTIVE) {
      setPetSpriteActive(true);
    } else if (activeActorType !== ACTOR_TYPE.PET && petSpriteActive) {
      // Keep active for at least one cycle
      const t = setTimeout(() => setPetSpriteActive(false), petCycleDuration);
      return () => clearTimeout(t);
    }
  }, [activeActorType, currentPhase, petSpriteActive, petCycleDuration]);

  useEffect(() => {
    if (currentPhase === PHASE.ENEMY_STRIKE || currentPhase === PHASE.ENEMY_WINDUP) {
      setEnemySpriteActive(true);
    } else if (enemySpriteActive && currentPhase === PHASE.ACTIVE) {
      // When returning to Active, let it finish one cycle or stop after duration
      const t = setTimeout(() => setEnemySpriteActive(false), enemyCycleDuration);
      return () => clearTimeout(t);
    }
  }, [currentPhase, enemySpriteActive, enemyCycleDuration]);

  // --- Particles System ---
  // Replaced with BattleEffectsLayer

  const enemyFigureRef = useRef<View>(null);
  const gameFrameRef = useRef<View>(null);
  const [enemyFigureCenter, setEnemyFigureCenter] = useState<{ x: number; y: number } | null>(null);
  const [gameFrameOrigin, setGameFrameOrigin] = useState<{ x: number; y: number } | null>(null);

  const { visualEnemyHp, visualPartyHps, impactEffects } = useBattleVisualDamage({
    lastDamageEvent,
    lastSkillAnimationConfig,
    enemy,
    party,
  });

  const feedbackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (sequenceFeedback) {
      feedbackAnim.setValue(0);
      Animated.sequence([
        Animated.timing(feedbackAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: (t) => t * (2 - t),
        }),
        Animated.delay(500),
        Animated.timing(feedbackAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sequenceFeedback]);

  const handleLeaveBattle = useCallback(() => {
      navigation.goBack();
  }, [navigation]);

  const handleSettingsPress = useCallback(() => setSettingsVisible(true), []);
  const handleInventoryPress = useCallback(() => {
    setInventoryModalVisible(true);
  }, []);

  const battleInventoryItems = useMemo(() => {
    if (!user?.cosmetics?.length) return [];
    return user.cosmetics.filter((c: UserCosmetic) => {
      const slot = (c.shop_items?.slot || '').toLowerCase();
      return (BATTLE_INVENTORY_SLOTS as readonly string[]).includes(slot) || isCaptureItem(c.shop_items);
    });
  }, [user?.cosmetics]);

  // When a battle ends against a catchable enemy, prompt to capture only if player has a Capture Contract
  const hasCaptureItem = (user && getCaptureItemCount(user) >= 1) ?? false;

  useEffect(() => {
    if (
      currentPhase === PHASE.VICTORY &&
      enemy?.metadata?.catchable &&
      petCaptureState === 'idle'
    ) {
      setPetNickname(enemy.name || 'Companion');
      setPetCaptureError(null);
      // Show naming prompt if they have a capture item to use now, or they already used one during battle
      if (hasCaptureItem || capturedDuringBattle) {
        setPetCaptureState('prompt');
      } else {
        setPetCaptureState('skipped');
      }
    }
  }, [currentPhase, enemy, petCaptureState, hasCaptureItem, capturedDuringBattle]);

  const handleConfirmPetCapture = async () => {
    if (!enemy || !enemy.id || !user) return;
    const trimmed = petNickname.trim();
    if (!trimmed) {
      setPetCaptureError('Please enter a name for your new companion.');
      return;
    }
    try {
      setPetCaptureError(null);
      setPetCaptureState('saving');

      // If they captured during battle, the capture item was already consumed; only save the pet.
      if (!capturedDuringBattle) {
        const toConsume = findOneCaptureCosmetic(user);
        if (!toConsume) {
          setPetCaptureError('You need a capture item. Get one from the shop.');
          setPetCaptureState('prompt');
          return;
        }
        const q = toConsume.quantity ?? 1;
        if (q > 1) {
          const { error } = await supabase
            .from('user_cosmetics')
            .update({ quantity: q - 1 })
            .eq('id', toConsume.id);
          if (error) throw error;
          setUser({
            ...user,
            cosmetics: (user.cosmetics || []).map(c =>
              c.id === toConsume.id ? { ...c, quantity: q - 1 } : c
            ),
          });
        } else {
          const { error } = await supabase
            .from('user_cosmetics')
            .delete()
            .eq('id', toConsume.id);
          if (error) throw error;
          setUser({
            ...user,
            cosmetics: (user.cosmetics || []).filter(c => c.id !== toConsume.id),
          });
        }
      }

      await addPet(enemy.id, trimmed);
      setPetCaptureState('done');
    } catch (error) {
      console.error('Error capturing pet:', error);
      setPetCaptureError('Failed to store pet. Please try again.');
      setPetCaptureState('prompt');
    }
  };

  const handleSkipPetCapture = useCallback(() => {
    setPetCaptureState('skipped');
  }, []);

  const handleCloseSettings = useCallback(() => setSettingsVisible(false), []);
  const handleCloseInventory = useCallback(() => setInventoryModalVisible(false), []);
  const handleEnemyEnterComplete = useCallback(() => setEnemyAction('idle'), []);
  const handlePetEnterComplete = useCallback(() => setPetAction('idle'), []);
  const handleBossWarningComplete = useCallback(() => setShowWarning(false), []);

  /** Use an item from battle inventory. Capture items: consume one and end battle with victory (then show naming screen). */
  const handleUseBattleItem = useCallback(
    async (cosmetic: UserCosmetic) => {
      if (!user || !enemy) return;
      if (isCaptureItem(cosmetic.shop_items) && enemy?.metadata?.catchable) {
        const toConsume = user.cosmetics?.find((c) => c.id === cosmetic.id);
        if (!toConsume) return;
        try {
          const q = toConsume.quantity ?? 1;
          if (q > 1) {
            const { error } = await supabase
              .from('user_cosmetics')
              .update({ quantity: q - 1 })
              .eq('id', toConsume.id);
            if (error) throw error;
            setUser({
              ...user,
              cosmetics: (user.cosmetics || []).map((c) =>
                c.id === toConsume.id ? { ...c, quantity: q - 1 } : c
              ),
            });
          } else {
            const { error } = await supabase
              .from('user_cosmetics')
              .delete()
              .eq('id', toConsume.id);
            if (error) throw error;
            setUser({
              ...user,
              cosmetics: (user.cosmetics || []).filter((c) => c.id !== toConsume.id),
            });
          }
          setCapturedDuringBattle(true);
          setInventoryModalVisible(false);
          setCurrentPhase(PHASE.VICTORY);
        } catch (e) {
          console.error('Failed to use capture item:', e);
        }
        return;
      }
      // Other consumables could be handled here (e.g. heal) in the future
    },
    [user, enemy, setUser, setCurrentPhase]
  );

  if (loading) {
    // While the walk-in transition overlay is playing, show a fully transparent
    // backing so the overlay is the only thing visible. BattleAssetWarmer still
    // pre-warms sprites in the background.
    if (isTransitioning) {
      return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={preloadedSpriteUrls} />
        </View>
      );
    }
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }]}>
        <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={preloadedSpriteUrls} />
      </View>
    );
  }

  if (currentPhase === PHASE.VICTORY) {
    const level = user?.level || 1;
    const maxExp = level * level * 100;
    const currentExp = user?.exp || 0;
    const { partySize = 1 } = route.params || {};
    const partyBonus = partySize > 1 ? 1.2 : 1.0;

    // Apply encounter rewards if available, otherwise use defaults
    const encounterRewards = enemy?.metadata?.rewards || {};
    const baseExp = encounterRewards.exp || 450;
    const baseCoins = encounterRewards.coins || 120;

    const expGained = Math.floor(baseExp * partyBonus);
    const coinsGained = Math.floor((baseCoins + Math.floor(Math.random() * 50)) * partyBonus);
    
    const playerStats = {
      name: user?.name || 'Hunter',
      level,
      rank: getRank(level),
      currentExp: Math.max(0, currentExp - expGained),
      maxExp,
      expGained
    };

    const victoryParty = party.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      currentHp: p.hp,
      maxHp: p.maxHP,
      isPet: p.type === 'pet',
      imageUri: resolvePartyMemberAvatarUri(p, user),
    }));
    
    const rewards = [
      { id: 'gold', quantity: coinsGained, imageUri: 'https://img.icons8.com/color/96/gold-bars.png', rarityColor: '#fbbf24' },
      { id: 'exp', quantity: expGained, imageUri: 'https://img.icons8.com/color/96/experience-skill.png', rarityColor: '#3b82f6' }
    ];

    return (
      <VictoryScreen
        enemy={enemy}
        party={party}
        spriteUrls={preloadedSpriteUrls}
        petCaptureState={petCaptureState}
        petNickname={petNickname}
        setPetNickname={setPetNickname}
        petCaptureError={petCaptureError}
        hasCaptureItem={hasCaptureItem}
        onConfirmCapture={handleConfirmPetCapture}
        onSkipCapture={handleSkipPetCapture}
        onReturnToMap={() => navigation.goBack()}
        player={playerStats}
        victoryParty={victoryParty}
        rewards={rewards}
        rewardApplyKey={victoryRewardApplyKey ?? undefined}
      />
    );
  }

  if (currentPhase === PHASE.DEFEAT) {
    const level = user?.level || 1;
    const maxExp = level * level * 100;
    const currentExp = user?.exp || 0;
    const expLost = Math.floor(currentExp * 0.1); // 10% exp penalty

    const playerStats = {
      name: user?.name || 'Hunter',
      level,
      rank: getRank(level),
      currentExp,
      maxExp,
      expLost
    };

    const defeatParty = party.map((p) => ({
      id: p.id,
      name: p.name,
      isPet: p.type === 'pet',
      imageUri: resolvePartyMemberAvatarUri(p, user),
      avatar: p.avatar,
      petDetails: p.petDetails,
      type: p.type,
    }));

    // Mock penalties
    const penalties = [
      { id: 'exp', amount: expLost, imageUri: 'https://img.icons8.com/color/96/experience-skill.png' }
    ];

    return (
      <DefeatModal
        visible={true}
        onClose={() => navigation.goBack()}
        player={playerStats}
        party={defeatParty}
        penalties={penalties}
        partyForOverlay={party}
      />
    );
  }

  return (
    <View style={styles.container}>
      <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={preloadedSpriteUrls} />
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={{ flex: 1 }}>
        {/* Main Game Frame */}
        <Animated.View
          ref={gameFrameRef}
          style={[styles.gameFrame, { transform: [{ translateX: shakeAnim }] }]}
          onLayout={() => {
            gameFrameRef.current?.measureInWindow((x, y) => {
              setGameFrameOrigin({ x, y });
            });
          }}
        >
          {/* Battlefield Background Image */}
          {battlefieldBg && (
            <>
              <Image
                source={{ uri: battlefieldBg }}
                style={{
                  position: 'absolute',
                  top: -220, // Moved down slightly from -300
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {/* Dark Overlay for readability */}
              <View 
                style={[
                  StyleSheet.absoluteFill, 
                  { backgroundColor: 'rgba(0,0,0,0.3)', top: -220 } 
                ]} 
                pointerEvents="none" 
              />
              {/* Bottom transition gradient to UI bar */}
              <LinearGradient
                colors={['transparent', 'rgba(5, 11, 20, 0.6)', 'rgba(5, 11, 20, 1)']}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 350, // Slightly taller to be visible above the bottom HUD
                  zIndex: 0,
                }}
                pointerEvents="none"
              />
            </>
          )}

          <TopHUD
            turnQueue={turnQueue}
            queueIndex={queueIndex}
            party={party}
            enemy={enemy}
            activeChar={activeChar}
            actorTypeEnemy={ACTOR_TYPE.ENEMY}
            actorTypePet={ACTOR_TYPE.PET}
            allShopItems={allShopItems}
            onSettingsPress={handleSettingsPress}
            onLeaveBattle={handleLeaveBattle}
          />

          {/* --- BATTLEFIELD --- */}
          <View style={styles.battlefield}>
              <EnemyBlock
                enemyFigureRef={enemyFigureRef}
                setEnemyFigureCenter={setEnemyFigureCenter}
                action={enemyAction}
                onEnterComplete={handleEnemyEnterComplete}
              />

              {/* Player Figures — fade in after transition so they don’t appear before walk-in is done */}
              <PartyRow
                party={party}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                isPlayerTurnPhase={isPlayerTurnPhase}
                visualPartyHps={visualPartyHps}
                partyOpacity={partyOpacity}
                petSpriteActive={petSpriteActive}
                user={user}
                allShopItems={allShopItems}
                petAction={petAction}
                onPetEnterComplete={handlePetEnterComplete}
                lastDamageEvent={lastDamageEvent}
                lastSkillAnimationConfig={lastSkillAnimationConfig}
                weaponGripCast={weaponGripCast}
              />

              {/* Chain / turn labels: absolute overlay so they never push party row down */}
              <BattleFieldHud
                chainCount={chainCount}
                isPlayerTurnPhase={isPlayerTurnPhase}
                activeActorType={activeActorType}
                turnActorDisplayName={turnActorDisplayName}
              />
          </View>

          <BattleBottomPanel
            partyOpacity={partyOpacity}
            isPlayerTurnPhase={isPlayerTurnPhase}
            activeChar={activeChar}
            plannedAbilities={plannedAbilities}
            processPlannedActions={processPlannedActions}
            stance={stance}
            switchStance={switchStance}
            undoLastAction={undoLastAction}
            skipTurn={skipTurn}
            handleInventoryPress={handleInventoryPress}
            selectedAbilityId={selectedAbilityId}
            handleAbilityTap={handleAbilityTap}
            activeActorType={activeActorType}
            activeActorName={activeChar?.name}
            turnActorDisplayName={turnActorDisplayName}
          />

        </Animated.View>
      </SafeAreaView>

      <ImpactEffects impactEffects={impactEffects} enemyFigureCenter={enemyFigureCenter} />

      <BattleSkillSpriteVfxHost
        lastSkillAnimationConfig={lastSkillAnimationConfig}
        lastDamageEvent={lastDamageEvent}
        enemyFigureCenter={enemyFigureCenter}
        party={party}
        clearLastSkillAnimation={clearLastSkillAnimation}
      />

      <DamageNumberLayer enemyFigureCenter={enemyFigureCenter} />
      <BattleEffectsLayer />

      {/* Overlays centered on device screen */}
      {successFlash && !sequenceFeedback && (
        <View style={[styles.flashOverlay, { backgroundColor: 'rgba(34, 211, 238, 0.12)' }]} pointerEvents="none" />
      )}
      {failFlash && (
        <View style={[styles.flashOverlay, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
           {/* Subtle flash only */}
        </View>
      )}

      <ParryOverlay
        visible={currentPhase === PHASE.ENEMY_STRIKE}
        focusMode={focusMode}
        comboMultiplier={comboMultiplier}
        qteTargets={qteTargets}
        parryTimerAnim={parryTimerAnim}
        onQteTap={handleQteTap}
        onQteSwipe={handleQteSwipe}
      />

      <SequenceFeedbackOverlay sequenceFeedback={sequenceFeedback} feedbackAnim={feedbackAnim} />

<BattleSettingsModal
        visible={settingsVisible}
        onClose={handleCloseSettings}
        isMuted={isMuted}
        setMuted={setMuted}
        tapToConfirm={tapToConfirm}
        onTapToConfirmToggle={handleTapToConfirmToggle}
      />

      <BattleInventoryModal
        visible={inventoryModalVisible}
        onClose={handleCloseInventory}
        items={battleInventoryItems}
        onUseItem={handleUseBattleItem}
        enemyCatchable={!!enemy?.metadata?.catchable}
      />

      {/* Boss Warning Overlay */}
      {showWarning && (
        <BossWarningOverlay 
          bossName={enemy?.name || "BOSS"}
          onComplete={handleBossWarningComplete} 
        />
      )}
    </View>
  );
}
