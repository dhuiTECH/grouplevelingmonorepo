import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, SafeAreaView, Platform, StatusBar, Image as RNImage, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sword, RotateCcw, Play, ArrowUp, Skull, Hexagon as HexagonIcon, Settings, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, LogOut, SkipForward, type LucideIcon } from 'lucide-react-native';
import { getRank } from '@/utils/stats';
import { useBattleLogic, PHASE, ACTOR_TYPE } from '@/hooks/useBattleLogic';
import { useAudio } from '@/contexts/AudioContext';
import LayeredAvatar from '@/components/LayeredAvatar';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import { getPetSpriteConfig } from '@/utils/pet-sprites';
import { useNavigation, useRoute } from '@react-navigation/native';
import SkillSpriteVfx from '@/components/SkillSpriteVfx';
import { BattleAssetWarmer } from '@/components/BattleAssetWarmer';
import { DamageNumber } from '@/components/DamageNumber';
import { useBattleMusic } from '@/hooks/useBattleMusic';
import { usePets } from '@/hooks/usePets';
import BossWarningOverlay from '@/components/BossWarningOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { useTransition } from '@/context/TransitionContext';
import { supabase } from '@/lib/supabase';
import { getCaptureItemCount, findOneCaptureCosmetic, isCaptureItem } from '@/utils/captureItem';
import type { UserCosmetic } from '@/types/user';
import { COLORS, BATTLE_INVENTORY_SLOTS, BATTLE_TAP_TO_CONFIRM_KEY } from '@/components/battle/battleTheme';
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
import { ImpactEffects } from '@/components/battle/ImpactEffects';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BattleScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { encounterId, raidId, isBoss } = route.params || {};
  const { user, setUser } = useAuth();
  const { isTransitioning } = useTransition();
  const { isMuted, setMuted, stopBackgroundMusic, playTrack } = useAudio();

  // Stop global BGM when entering battle
  useEffect(() => {
    stopBackgroundMusic();
    return () => {
      // Resume global BGM or let next screen handle it
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
  } = useBattleLogic({ encounterId, raidId, isBoss, tapToConfirm });

  const { addPet } = usePets();
  const [showWarning, setShowWarning] = useState(isBoss);
  const [petCaptureState, setPetCaptureState] = useState<'idle' | 'prompt' | 'saving' | 'done' | 'skipped'>('idle');
  const [petNickname, setPetNickname] = useState('');
  const [allShopItems, setAllShopItems] = useState<any[]>([]);
  const [petCaptureError, setPetCaptureError] = useState<string | null>(null);
  /** True when the player used a capture item during battle (item already consumed; victory screen is for naming only). */
  const [capturedDuringBattle, setCapturedDuringBattle] = useState(false);

  // Fetch all shop items for hand grip rendering
  useEffect(() => {
    const fetchShopItems = async () => {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*');
      if (!error && data) {
        setAllShopItems(data);
      }
    };
    fetchShopItems();
  }, []);

  const enemyLungeAnim = useRef(new Animated.Value(0)).current;
  const partyLungeAnims = useRef<Record<string, Animated.Value>>({});
  const partyOpacity = useRef(new Animated.Value(0)).current;

  // Ensure lunge anims exist for all party members
  useEffect(() => {
    party.forEach(char => {
      if (!partyLungeAnims.current[char.id]) {
        partyLungeAnims.current[char.id] = new Animated.Value(0);
      }
    });
  }, [party]);

  // Trigger lunge animations on damage events
  useEffect(() => {
    if (!lastDamageEvent) return;
    const { casterCharId, targetId } = lastDamageEvent;
    
    // Enemy attacks (lunge down)
    if (casterCharId === 'ENEMY' || (targetId !== 'ENEMY' && !casterCharId)) {
      Animated.sequence([
        Animated.timing(enemyLungeAnim, { toValue: 50, duration: 150, useNativeDriver: true }),
        Animated.timing(enemyLungeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } 
    // Party attacks (lunge up)
    else if (casterCharId) {
      // Ensure anim value exists before using
      if (!partyLungeAnims.current[casterCharId]) {
        partyLungeAnims.current[casterCharId] = new Animated.Value(0);
      }
      
      const anim = partyLungeAnims.current[casterCharId];
      Animated.sequence([
        Animated.timing(anim, { toValue: -50, duration: 150, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [lastDamageEvent, enemyLungeAnim]);

  // Use the new hook for battle music
  useBattleMusic(enemy, !loading);

  // Fade in party only after encounter walk-in overlay has fully faded (so walk-in happens first, then they appear)
  useEffect(() => {
    if (isTransitioning) return;
    // Removed 80ms delay and shortened duration to 250ms for snappier appearance
    Animated.timing(partyOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [isTransitioning]);

  const [petSpriteActive, setPetSpriteActive] = useState(true);
  const [enemySpriteActive, setEnemySpriteActive] = useState(true);
  
  // Pet and enemy animation actions
  const [petAction, setPetAction] = useState<'idle' | 'enter'>('enter'); // Start with enter animation
  const [enemyAction, setEnemyAction] = useState<'idle' | 'enter'>('enter'); // Start with enter animation

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
  const [particles, setParticles] = useState<any[]>([]);
  const [shockwaves, setShockwaves] = useState<any[]>([]);
  const prevQteTargetsRef = useRef<any[]>([]);

  const enemyFigureRef = useRef<View>(null);
  const gameFrameRef = useRef<View>(null);
  const [enemyFigureCenter, setEnemyFigureCenter] = useState<{ x: number; y: number } | null>(null);
  const [gameFrameOrigin, setGameFrameOrigin] = useState<{ x: number; y: number } | null>(null);

  // 1. Detect Hit/Miss to spawn particles
  // (Swipe logic moved to QTEButton)

  useEffect(() => {
      qteTargets.forEach(target => {
          const prev = prevQteTargetsRef.current.find(t => t.id === target.id);
          if (!prev) return;
          
          // Detect Status Change
          if (prev.status !== 'hit' && target.status === 'hit') {
              spawnParticles(target.x, target.y, '#22d3ee');
              spawnShockwave(target.x, target.y, '#22d3ee');
          } else if (prev.status !== 'perfect' && target.status === 'perfect') {
              spawnParticles(target.x, target.y, '#fbbf24'); // Gold for Perfect
              spawnShockwave(target.x, target.y, '#fbbf24');
          } else if (prev.status !== 'miss' && target.status === 'miss') {
              spawnParticles(target.x, target.y, '#ef4444');
              spawnShockwave(target.x, target.y, '#ef4444');
          }
      });
      prevQteTargetsRef.current = qteTargets;
  }, [qteTargets]);

  const spawnParticles = (xPct: number, yPct: number, color: string) => {
      const x = (xPct / 100) * SCREEN_WIDTH;
      const y = (yPct / 100) * SCREEN_HEIGHT;
      const newParts: any[] = [];
      const count = color === '#fbbf24' ? 12 : 8;
      const baseSpeed = color === '#fbbf24' ? 20 : 12;

      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * baseSpeed + 5;
          newParts.push({
              id: Math.random().toString(),
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              color,
              size: Math.random() * 10 + 5 
          });
      }
      setParticles(prev => [...prev, ...newParts]);
  };

  const spawnShockwave = (xPct: number, yPct: number, color: string) => {
      const x = (xPct / 100) * SCREEN_WIDTH;
      const y = (yPct / 100) * SCREEN_HEIGHT;
      setShockwaves(prev => [...prev, {
          id: Math.random().toString(),
          x,
          y,
          scale: 0.1,
          opacity: 1.0,
          color
      }]);
  };

  // 2. Animation Loop — use requestAnimationFrame with throttle for fewer re-renders
  const particleRafRef = useRef<number | null>(null);
  const lastParticleTickRef = useRef(0);
  useEffect(() => {
      if (particles.length === 0 && shockwaves.length === 0) {
        lastParticleTickRef.current = 0;
        return;
      }

      const tick = (now: number) => {
        if (now - lastParticleTickRef.current < 32) {
          particleRafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastParticleTickRef.current = now;

        setParticles(prevParticles => {
          const nextParticles = prevParticles.length > 0 ? prevParticles.map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.88,
            vy: p.vy * 0.88,
            life: p.life - 0.06
          })).filter(p => p.life > 0) : prevParticles;

          setShockwaves(prevShockwaves => {
            const nextShockwaves = prevShockwaves.length > 0 ? prevShockwaves.map(s => ({
              ...s,
              scale: s.scale + 0.2,
              opacity: s.opacity - 0.07
            })).filter(s => s.opacity > 0) : prevShockwaves;

            // Only update shockwaves if they actually changed
            return nextShockwaves === prevShockwaves ? prevShockwaves : nextShockwaves;
          });

          // Only update particles if they actually changed
          return nextParticles === prevParticles ? prevParticles : nextParticles;
        });

        particleRafRef.current = requestAnimationFrame(tick);
      };

      particleRafRef.current = requestAnimationFrame(tick);
      return () => {
        if (particleRafRef.current) cancelAnimationFrame(particleRafRef.current);
      };
  }, [particles.length > 0 || shockwaves.length > 0]);

  // Damage Number Handling
  const [damageNumbers, setDamageNumbers] = useState<any[]>([]);
  const [visualEnemyHp, setVisualEnemyHp] = useState<number>(0);
  const [visualPartyHps, setVisualPartyHps] = useState<Record<string, number>>({});

  // Sync visual HP with real HP for initialization and healing
  useEffect(() => {
    if (enemy) {
      setVisualEnemyHp(prev => {
        // If real HP is higher (healing) or it's a new enemy, sync immediately
        if (enemy.hp > prev || prev === 0) return enemy.hp;
        return prev;
      });
    }
  }, [enemy?.hp, enemy?.id]);

  useEffect(() => {
    setVisualPartyHps(prev => {
      const next = { ...prev };
      let changed = false;
      party.forEach(p => {
        if (p.hp > (prev[p.id] || 0) || prev[p.id] === undefined) {
          next[p.id] = p.hp;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [party]);
  
  // Feedback Animation
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const [impactEffects, setImpactEffects] = useState<Array<{
    id: string;
    slashAnim: Animated.Value;
    flashAnim: Animated.Value;
    splashAnim: Animated.Value;
    type: 'SLASH' | 'CIRCLE';
  }>>([]);

  const triggerImpact = (count: number, type: 'SLASH' | 'CIRCLE') => {
    const STAGGER_MS = 220;
    const newInstances: typeof impactEffects = [];
    for (let i = 0; i < count; i++) {
        const id = `${Date.now()}-${i}-${Math.random()}`;
        const slashAnim = new Animated.Value(0);
        const flashAnim = new Animated.Value(0);
        const splashAnim = new Animated.Value(0);
        newInstances.push({ id, slashAnim, flashAnim, splashAnim, type });
        
        setTimeout(async () => {
            if (type === 'SLASH') {
              try {
                  const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/QUICK_SLASH.mp3'));
                  await sound.playAsync();
                  sound.setOnPlaybackStatusUpdate((s) => {
                      if (s.isLoaded && 'didJustFinish' in s && s.didJustFinish) sound.unloadAsync();
                  });
              } catch (e) { /* ignore */ }
            }
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
                    Animated.timing(flashAnim, { toValue: 0, duration: 120, useNativeDriver: true })
                ]),
                Animated.timing(splashAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(slashAnim, { toValue: 1, duration: 400, useNativeDriver: true })
            ]).start(() => {
                setImpactEffects(prev => prev.filter(inst => inst.id !== id));
            });
        }, i * STAGGER_MS);
    }
    setImpactEffects(prev => [...prev, ...newInstances]);
  };
  
  useEffect(() => {
    if (sequenceFeedback) {
        feedbackAnim.setValue(0);
        Animated.sequence([
            Animated.timing(feedbackAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
                easing: (t) => t * (2 - t) // Ease out
            }),
            Animated.delay(500),
            Animated.timing(feedbackAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            })
        ]).start();
    }
  }, [sequenceFeedback]);

  const addDamageNumberForEvent = useCallback((event: typeof lastDamageEvent) => {
    if (!event) return;
    const id = Date.now().toString() + Math.random().toString();
    
    // Determine Location using measured centers if available
    let x = SCREEN_WIDTH / 2;
    let y = 200;
    let color = '#fbbf24';

    if (event.targetId === 'ENEMY') {
      if (enemyFigureCenter) {
        x = enemyFigureCenter.x;
        y = enemyFigureCenter.y - 40; // Float above center
      } else {
        x = SCREEN_WIDTH / 2;
        y = 120;
      }
      color = '#fbbf24';
    } else {
      // Find player index
      const idx = party.findIndex((p: any) => p.id === event.targetId);
      if (idx >= 0) {
        const totalWidth = party.length * 100 + (party.length - 1) * 20;
        const startX = (SCREEN_WIDTH - totalWidth) / 2;
        x = startX + idx * 120 + 50; 
        y = SCREEN_HEIGHT / 2 + 100;
      }
      color = '#ef4444';
    }

    const newNum = {
      id,
      value: event.value,
      color,
      x,
      y,
    };
    
    setDamageNumbers(prev => [...prev, newNum]);

    // Update Visual HP to match the damage number appearing
    if (event.targetId === 'ENEMY') {
      setVisualEnemyHp(prev => Math.max(0, prev - event.value));
    } else {
      setVisualPartyHps(prev => ({
        ...prev,
        [event.targetId]: Math.max(0, (prev[event.targetId] || 0) - event.value)
      }));
    }

    // Cleanup logic is now handled inside DamageNumber component via onComplete
    if (event.targetId === 'ENEMY' && event.value > 0) {
      if (event.skillId || event.abilityName) {
        // Generic impact for projectiles/other skills
        triggerImpact(1, 'CIRCLE');
      }
    }
  }, [party, enemyFigureCenter]);

  const addDamageNumberRef = useRef(addDamageNumberForEvent);
  useEffect(() => {
    addDamageNumberRef.current = addDamageNumberForEvent;
  }, [addDamageNumberForEvent]);

  // Timer management to allow "fire-and-forget" damage numbers that persist across rapid clicks
  // while still preventing duplicates for the same event (e.g. when config loads)
  const damageTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastScheduledEventTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      Object.values(damageTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const scheduleDamageNumber = useCallback((evt: typeof lastDamageEvent, delay: number) => {
    if (!evt) return;
    const key = evt.timestamp.toString();
    
    // Clear any existing timer for this specific event (e.g. rescheduling with new config)
    if (damageTimersRef.current[key]) {
      clearTimeout(damageTimersRef.current[key]);
    }

    const t = setTimeout(() => {
      addDamageNumberRef.current(evt);
      delete damageTimersRef.current[key];
    }, delay);

    damageTimersRef.current[key] = t;
  }, []);

  // Only show damage immediately for non-skill hits (e.g. enemy hit player). Skill hits use the timer below.
  useEffect(() => {
    if (!lastDamageEvent) return;
    const isSkillHit = lastDamageEvent.skillId != null || lastDamageEvent.abilityName != null;
    if (!isSkillHit) {
      addDamageNumberRef.current(lastDamageEvent);
    }
  }, [lastDamageEvent]);

  // Handle Skill Hits: Show damage per hit (staggered) or single total. Only schedule once per event.
  const SHOW_DAMAGE_BEFORE_END_MS = 250;
  useEffect(() => {
    if (!lastDamageEvent) return;
    const isSkillHit = lastDamageEvent.skillId != null || lastDamageEvent.abilityName != null;
    if (!isSkillHit) return;

    // Avoid scheduling twice when effect re-runs (e.g. when lastSkillAnimationConfig loads after fetch)
    if (lastScheduledEventTimestampRef.current === lastDamageEvent.timestamp) return;
    lastScheduledEventTimestampRef.current = lastDamageEvent.timestamp;

    const durationMs = lastSkillAnimationConfig?.duration_ms ?? 500;
    const perHit = lastDamageEvent.damagePerHit;
    const playCount = lastDamageEvent.skillUseCount ?? 1;
    const multiResults = lastDamageEvent.multiResults;
    const vfxType = lastSkillAnimationConfig?.vfx_type ?? 'impact';
    const totalDuration = durationMs * playCount;

    // Handle multi-target effects (area heals/damage)
    if (multiResults && multiResults.length > 0) {
      multiResults.forEach((result, i) => {
        const syntheticEvent = {
          ...lastDamageEvent,
          targetId: result.targetId,
          value: result.value,
          type: result.type,
          timestamp: lastDamageEvent.timestamp + i * 50 // Stagger by 50ms
        };
        let delay = 100; // Show immediately for multi-target effects

        if (vfxType === 'projectile') {
          delay = totalDuration;
        } else if (vfxType === 'beam' || vfxType === 'aoe') {
          delay = 100; // Show immediately
        }

        scheduleDamageNumber(syntheticEvent, delay + i * 50);
      });
    } else if (perHit && perHit.length > 0) {
      // One damage number per hit.
      // For projectiles, delay all until the end of the total travel time.
      // For others, stagger them at the start of each loop.
      perHit.forEach((value, i) => {
        const syntheticEvent = { ...lastDamageEvent, value, timestamp: lastDamageEvent.timestamp + i };
        let delay = i * durationMs;

        if (vfxType === 'projectile') {
          // Hits happen when the projectile reaches the target (at the end of totalDuration)
          delay = totalDuration + (i * 100);
        } else {
          // Non-projectiles (impacts) usually show damage at the start or slightly into each loop
          delay = i * durationMs + 100;
        }

        scheduleDamageNumber(syntheticEvent, delay);
      });
    } else {
      // Single hit or no per-hit breakdown
      let delay = durationMs;
      if (vfxType === 'projectile') {
        delay = totalDuration;
      } else if (vfxType === 'beam' || vfxType === 'aoe') {
        delay = 100; // Show immediately
      }
      scheduleDamageNumber(lastDamageEvent, delay);
    }
  }, [lastDamageEvent, lastSkillAnimationConfig, scheduleDamageNumber]);

  const handleLeaveBattle = () => {
      navigation.goBack();
  };

  const handleSettingsPress = () => setSettingsVisible(true);
  const handleInventoryPress = () => {
    setInventoryModalVisible(true);
  };

  const battleInventoryItems = useMemo(() => {
    if (!user?.cosmetics?.length) return [];
    return user.cosmetics.filter((c: UserCosmetic) => {
      const slot = (c.shop_items?.slot || '').toLowerCase();
      return BATTLE_INVENTORY_SLOTS.includes(slot) || isCaptureItem(c.shop_items);
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

  const handleSkipPetCapture = () => {
    setPetCaptureState('skipped');
  };

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

    const getAvatarUri = (p: any) => {
// ... existing getAvatarUri code ...
    };

    const victoryParty = party.map(p => ({
      id: p.id,
      name: p.name,
      level: p.level,
      currentHp: p.hp,
      maxHp: p.maxHP,
      isPet: p.type === 'pet',
      imageUri: getAvatarUri(p),
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

    const getAvatarUriForDefeat = (p: any) => {
      if (p?.type === 'pet') return p.petDetails?.image_url || 'https://via.placeholder.com/40';
      const u = p?.avatar || user;
      if (!u) return 'https://via.placeholder.com/40';
      const url = u.base_body_silhouette_url || u.base_body_url || u.avatar_url;
      if (typeof url === 'string' && url.startsWith('http')) return url;
      const profilePic = u.profilePicture;
      if (!profilePic) return 'https://via.placeholder.com/40';
      if (typeof profilePic === 'string') return profilePic;
      if (profilePic?.uri) return profilePic.uri;
      try {
        const asset = RNImage.resolveAssetSource(profilePic);
        return asset?.uri || 'https://via.placeholder.com/40';
      } catch (e) {
        return 'https://via.placeholder.com/40';
      }
    };

    const defeatParty = party.map(p => ({
      id: p.id,
      name: p.name,
      isPet: p.type === 'pet',
      imageUri: getAvatarUriForDefeat(p),
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
            onSettingsPress={handleSettingsPress}
            onLeaveBattle={handleLeaveBattle}
          />

          {/* --- BATTLEFIELD --- */}
          <View style={styles.battlefield}>
              <EnemyBlock
                enemy={enemy}
                visualEnemyHp={visualEnemyHp}
                currentPhase={currentPhase}
                phaseEnemyStrike={PHASE.ENEMY_STRIKE}
                enemyLungeAnim={enemyLungeAnim}
                enemyFigureRef={enemyFigureRef}
                setEnemyFigureCenter={setEnemyFigureCenter}
                enemySpriteActive={enemySpriteActive}
                action={enemyAction}
                onEnterComplete={() => setEnemyAction('idle')}
              />

              {/* Chain Counter */}
              {chainCount > 0 && isPlayerTurnPhase && (
                  <View style={styles.chainContainer}>
                      <Text style={styles.chainText}>{chainCount} CHAIN</Text>
                      <Text style={styles.chainBonus}>+{(chainCount * 10)}% BONUS</Text>
                  </View>
              )}
              {/* Pet's turn indicator */}
              {activeActorType === ACTOR_TYPE.PET && (
                  <View style={styles.chainContainer}>
                      <Text style={[styles.chainText, { color: '#a855f7' }]}>PET ATTACK</Text>
                      <Text style={[styles.chainBonus, { color: '#a855f7' }]}>Your pet strikes!</Text>
                  </View>
              )}

              {/* Player Figures — fade in after transition so they don’t appear before walk-in is done */}
              <PartyRow
                party={party}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                isPlayerTurnPhase={isPlayerTurnPhase}
                visualPartyHps={visualPartyHps}
                partyLungeAnims={partyLungeAnims}
                partyOpacity={partyOpacity}
                petSpriteActive={petSpriteActive}
                user={user}
                allShopItems={allShopItems}
                petAction={petAction}
                onPetEnterComplete={() => setPetAction('idle')}
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
          />

        </Animated.View>
      </SafeAreaView>

      <ImpactEffects impactEffects={impactEffects} enemyFigureCenter={enemyFigureCenter} />

      {/* Skill VFX from Supabase skill_animations (sprite_url + sfx_url from storage) */}
      {lastSkillAnimationConfig && lastDamageEvent && (() => {
        // Use measured centers for perfect positioning. 
        const isProjectile = lastSkillAnimationConfig.vfx_type === 'projectile';
        const isBeam = lastSkillAnimationConfig.vfx_type === 'beam';
        const isAoe = lastSkillAnimationConfig.vfx_type === 'aoe';

        // 1. RESOLVE TARGET COORDINATES (targetX, targetY)
        let targetX = SCREEN_WIDTH / 2;
        let targetY = 220;

        if (lastDamageEvent.targetId === 'ENEMY') {
          if (enemyFigureCenter) {
            targetX = enemyFigureCenter.x;
            targetY = enemyFigureCenter.y;
          }
        } else if (lastDamageEvent.targetId === 'ALL_ENEMIES') {
          // Center of enemy side
          targetX = SCREEN_WIDTH / 2;
          targetY = 200;
        } else if (lastDamageEvent.targetId === 'ALL_FRIENDS') {
          // Center of party side
          targetX = SCREEN_WIDTH / 2;
          targetY = SCREEN_HEIGHT / 2 + 100;
        } else {
          // Specific party member or caster
          const idx = party.findIndex(p => p.id === lastDamageEvent.targetId);
          if (idx >= 0) {
            const totalWidth = party.length * 100 + (party.length - 1) * 20;
            const layoutStartX = (SCREEN_WIDTH - totalWidth) / 2;
            targetX = layoutStartX + idx * 120 + 50;
            targetY = SCREEN_HEIGHT / 2 + 100;
          }
        }

        // 2. RESOLVE CASTER COORDINATES (startX, startY)
        let startX: number | undefined;
        let startY: number | undefined;

        if (lastDamageEvent.casterCharId === 'ENEMY') {
          if (enemyFigureCenter) {
            startX = enemyFigureCenter.x;
            startY = enemyFigureCenter.y;
          }
        } else if (lastDamageEvent.casterCharId) {
          const casterIdx = party.findIndex(p => p.id === lastDamageEvent.casterCharId);
          if (casterIdx >= 0) {
            const totalWidth = party.length * 100 + (party.length - 1) * 20;
            const layoutStartX = (SCREEN_WIDTH - totalWidth) / 2;
            startX = layoutStartX + casterIdx * 120 + 50;
            startY = SCREEN_HEIGHT / 2 + 100;
          }
        }

        // Only pass start coords if it's a movement-based VFX
        const needsStartCoords = isProjectile || isBeam;
        
        return (
          <SkillSpriteVfx
            key={lastDamageEvent.timestamp}
            config={lastSkillAnimationConfig}
            targetX={targetX}
            targetY={targetY}
            startX={needsStartCoords ? startX : undefined}
            startY={needsStartCoords ? startY : undefined}
            playCount={lastDamageEvent.skillUseCount ?? 1}
            onEnd={() => {
              clearLastSkillAnimation();
            }}
          />
        );
      })()}

      {/* Floating Damage Numbers */}
      {damageNumbers.map(num => (
        <DamageNumber
          key={num.id}
          id={num.id}
          value={Math.floor(num.value)}
          x={num.x}
          y={num.y}
          color={num.color}
          isCrit={false} // You can hook this up to your logic later
          onComplete={(id) => setDamageNumbers(prev => prev.filter(n => n.id !== id))}
        />
      ))}

      {/* Shockwaves Layer */}
      {shockwaves.map(s => (
          <View 
              key={s.id}
              style={{
                  position: 'absolute',
                  left: s.x - 100, 
                  top: s.y - 100,
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 10,
                  borderColor: s.color,
                  opacity: s.opacity,
                  zIndex: 1450, // Below particles
                  transform: [{ scale: s.scale }]
              }}
              pointerEvents="none"
          />
      ))}

      {/* Particles Layer */}
      {particles.map(p => (
          <View 
              key={p.id}
              style={{
                  position: 'absolute',
                  left: p.x - p.size/2,
                  top: p.y - p.size/2,
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size/2,
                  backgroundColor: p.color,
                  opacity: p.life,
                  zIndex: 1500, // Below damage numbers, above QTE
                  transform: [{ scale: p.life }]
              }}
              pointerEvents="none"
          />
      ))}

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
        onClose={() => setSettingsVisible(false)}
        isMuted={isMuted}
        setMuted={setMuted}
        tapToConfirm={tapToConfirm}
        onTapToConfirmToggle={handleTapToConfirmToggle}
      />

      <BattleInventoryModal
        visible={inventoryModalVisible}
        onClose={() => setInventoryModalVisible(false)}
        items={battleInventoryItems}
        onUseItem={handleUseBattleItem}
        enemyCatchable={!!enemy?.metadata?.catchable}
      />

      {/* Boss Warning Overlay */}
      {showWarning && (
        <BossWarningOverlay 
          bossName={enemy?.name || "BOSS"}
          onComplete={() => {
            setShowWarning(false);
          }} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingCentered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#22d3ee', marginTop: 10, letterSpacing: 2 },
  gameFrame: { width: '100%', height: '100%', backgroundColor: '#050b14', position: 'relative' },
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, alignItems: 'center', justifyContent: 'center' },
  cinematicText: { fontSize: 48, fontStyle: 'italic', fontWeight: '900', color: 'white', textTransform: 'uppercase', textShadowColor: '#22d3ee', textShadowRadius: 20 },

  battlefield: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 24 },

  chainContainer: { alignItems: 'center' },
  chainText: { color: '#22d3ee', fontSize: 32, fontStyle: 'italic', fontWeight: '900' },
  chainBonus: { color: '#22d3ee', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  
  charTargeted: { opacity: 1, borderColor: '#ef4444', borderWidth: 1, borderRadius: 10 },

  metricContainer: {
    width: 110,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },
  });
