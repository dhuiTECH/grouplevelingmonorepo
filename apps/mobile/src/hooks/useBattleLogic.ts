import { useState, useEffect, useRef } from 'react';
import { playHunterSound, preloadBattleSounds, preloadSfxUrl } from '@/utils/audio';
import * as Haptics from 'expo-haptics';
import { Animated, Vibration, Alert } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useEncounterPoolStore } from '@/store/useEncounterPoolStore';
import { useAuth } from '@/contexts/AuthContext';
import { useActivePet } from '@/contexts/ActivePetContext';
import { useSkills } from '@/hooks/useSkills';
import { useBattleStore } from '@/store/useBattleStore';
import { usePets } from '@/hooks/usePets';
import { fetchSkillAnimation } from '@/api/skillAnimations';
import type { SkillAnimationConfig } from '@/components/SkillSpriteVfx';

// --- Constants & Types ---

export const PHASE = {
  ACTIVE: 'ACTIVE_PHASE',
  ENEMY_WINDUP: 'ENEMY_WINDUP',
  ENEMY_STRIKE: 'ENEMY_STRIKE',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT'
};

export const QTE_TYPE = {
  TAP: 'TAP',
  SWIPE: 'SWIPE', // New: Directional Swipe
};

export const ATTACK_PATTERN = {
  NORMAL: 'NORMAL',
  RHYTHM: 'RHYTHM',
  SWIPE_STORM: 'SWIPE_STORM',
  MIXED: 'MIXED',
  FAST_FLURRY: 'FAST_FLURRY',  // Many taps, short gaps – keeps players on edge
  HEAVY_SLOW: 'HEAVY_SLOW',    // Fewer hits, longer gaps – anticipation
};

export const ACTOR_TYPE = {
  PLAYER: 'PLAYER',
  PET: 'PET',
  ENEMY: 'ENEMY'
};

export const STANCE = {
  ATTACK: { 
    id: 'attack', 
    label: 'ASSAULT', 
    color: '#fb923c', 
    bg: '#f97316', 
    borderColor: '#f97316',
    description: "Maximum offense.",
    modifiers: ["+25% Base DMG", "+50% Chain"]
  },
  DEFENSE: { 
    id: 'defense', 
    label: 'GUARD', 
    color: '#22d3ee', 
    bg: '#06b6d4', 
    borderColor: '#06b6d4',
    description: "Survival focus.",
    modifiers: ["-40% Dmg Taken", "+50% Heal"]
  }
};

const generateTurns = (count = 50, partyMembers: any[] = [], seed?: string) => {
    const turns: string[] = [];
    const players = partyMembers.filter(p => p.type === 'player');
    const pets = partyMembers.filter(p => p.type === 'pet');
    
    if (players.length === 0) return [];

    let playerStreak = 0;
    let enemyStreak = 0;
    let turnCounter = 0;

    // Seeded random if provided
    const rnd = seed ? () => {
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
        return () => {
            h = Math.imul(h, 48271) % 2147483647;
            return (h - 1) / 2147483646;
        };
    } : () => Math.random;
    
    const getRand = rnd();

    for (let i = 0; i < count; i++) {
        let isPlayerGroup = getRand() <= 0.6;
        if (i === 0) isPlayerGroup = true; // Guaranteed Player Start

        if (playerStreak >= 3) isPlayerGroup = false;
        if (enemyStreak >= 2) isPlayerGroup = true;

        if (isPlayerGroup) {
            const player = players[turnCounter % players.length];
            turns.push(player.id);
            
            const pet = pets.find(p => p.id === `pet-${player.id}`);
            if (pet) turns.push(pet.id);
            
            playerStreak++;
            enemyStreak = 0;
            turnCounter++;
        } else {
            turns.push('ENEMY');
            enemyStreak++;
            playerStreak = 0;
        }
    }
    return turns;
};

export const useBattleLogic = ({
  encounterId,
  raidId,
  isBoss,
  tapToConfirm = true,
  currentMapId,
}: {
  encounterId?: string;
  raidId?: string;
  isBoss?: boolean;
  tapToConfirm?: boolean;
  currentMapId?: string | null;
}) => {
  const { user } = useAuth();
  const { activePetId } = useActivePet();
  const { pets } = usePets();
  const activePet = pets.find(p => p.id === activePetId) ?? (pets.length > 0 ? pets[0] : null);
  const { getBattleSkills, loadout, loading: loadingSkills } = useSkills(user?.id); // Use the skills hook
  const [loading, setLoading] = useState(true);
  
  // Store Entities & State
  const {
    party, enemy, currentPhase, stance, stanceLevel, activeIndex, logs, chainCount,
    turnQueue, queueIndex, plannedAbilities, selectedAbilityId, enemyTargetId,
    parryPreDelay, parryWindowActive, qteTargets, qteStats, focusMode, burstCharged,
    comboMultiplier, currentPattern, successFlash, failFlash, sequenceFeedback,
    lastDamageEvent, lastSkillAnimationConfig, assetsLoaded, preloadedSpriteUrls,
    setBattleState
  } = useBattleStore();

  const setParty = (valOrUpdater: any) => setBattleState(state => ({ party: typeof valOrUpdater === 'function' ? valOrUpdater(state.party) : valOrUpdater }));
  const setEnemy = (valOrUpdater: any) => setBattleState(state => ({ enemy: typeof valOrUpdater === 'function' ? valOrUpdater(state.enemy) : valOrUpdater }));
  const setCurrentPhase = (val: any) => setBattleState(state => ({ currentPhase: typeof val === 'function' ? val(state.currentPhase) : val }));
  const setStance = (val: any) => setBattleState(state => ({ stance: typeof val === 'function' ? val(state.stance) : val }));
  const setStanceLevel = (val: any) => setBattleState(state => ({ stanceLevel: typeof val === 'function' ? val(state.stanceLevel) : val }));
  const setActiveIndex = (val: any) => setBattleState(state => ({ activeIndex: typeof val === 'function' ? val(state.activeIndex) : val }));
  const setLogs = (val: any) => setBattleState(state => ({ logs: typeof val === 'function' ? val(state.logs) : val }));
  const setChainCount = (val: any) => setBattleState(state => ({ chainCount: typeof val === 'function' ? val(state.chainCount) : val }));
  const setTurnQueue = (val: any) => setBattleState(state => ({ turnQueue: typeof val === 'function' ? val(state.turnQueue) : val }));
  const setQueueIndex = (val: any) => setBattleState(state => ({ queueIndex: typeof val === 'function' ? val(state.queueIndex) : val }));
  const setPlannedAbilities = (val: any) => setBattleState(state => ({ plannedAbilities: typeof val === 'function' ? val(state.plannedAbilities) : val }));
  const setSelectedAbilityId = (val: any) => setBattleState(state => ({ selectedAbilityId: typeof val === 'function' ? val(state.selectedAbilityId) : val }));
  const setEnemyTargetId = (val: any) => setBattleState(state => ({ enemyTargetId: typeof val === 'function' ? val(state.enemyTargetId) : val }));
  const setParryPreDelay = (val: any) => setBattleState(state => ({ parryPreDelay: typeof val === 'function' ? val(state.parryPreDelay) : val }));
  const setParryWindowActive = (val: any) => setBattleState(state => ({ parryWindowActive: typeof val === 'function' ? val(state.parryWindowActive) : val }));
  const setQteTargets = (val: any) => setBattleState(state => ({ qteTargets: typeof val === 'function' ? val(state.qteTargets) : val }));
  const setQteStats = (val: any) => setBattleState(state => ({ qteStats: typeof val === 'function' ? val(state.qteStats) : val }));
  const setFocusMode = (val: any) => setBattleState(state => ({ focusMode: typeof val === 'function' ? val(state.focusMode) : val }));
  const setBurstCharged = (val: any) => setBattleState(state => ({ burstCharged: typeof val === 'function' ? val(state.burstCharged) : val }));
  const setComboMultiplier = (val: any) => setBattleState(state => ({ comboMultiplier: typeof val === 'function' ? val(state.comboMultiplier) : val }));
  const setCurrentPattern = (val: any) => setBattleState(state => ({ currentPattern: typeof val === 'function' ? val(state.currentPattern) : val }));
  const setSuccessFlash = (val: any) => setBattleState(state => ({ successFlash: typeof val === 'function' ? val(state.successFlash) : val }));
  const setFailFlash = (val: any) => setBattleState(state => ({ failFlash: typeof val === 'function' ? val(state.failFlash) : val }));
  const setSequenceFeedback = (val: any) => setBattleState(state => ({ sequenceFeedback: typeof val === 'function' ? val(state.sequenceFeedback) : val }));
  const setLastDamageEvent = (val: any) => setBattleState(state => ({ lastDamageEvent: typeof val === 'function' ? val(state.lastDamageEvent) : val }));
  const setLastSkillAnimationConfig = (val: any) => setBattleState(state => ({ lastSkillAnimationConfig: typeof val === 'function' ? val(state.lastSkillAnimationConfig) : val }));
  const setAssetsLoaded = (val: any) => setBattleState(state => ({ assetsLoaded: typeof val === 'function' ? val(state.assetsLoaded) : val }));
  const setPreloadedSpriteUrls = (val: any) => setBattleState(state => ({ preloadedSpriteUrls: typeof val === 'function' ? val(state.preloadedSpriteUrls) : val }));
  
  const realtimeChannelRef = useRef<any>(null);
  const petTurnStartedRef = useRef(false);
  const parryTimerAnim = useRef(new Animated.Value(0)).current; 
  const animationConfigCacheRef = useRef<Record<string, SkillAnimationConfig>>({});

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const isProcessingActionsRef = useRef(false);
  const attackResolvedRef = useRef(false);
  const battleEndedRef = useRef(false);

  // Constants
  const activeActorId = turnQueue[queueIndex];
  const activeActorType = activeActorId === 'ENEMY' ? ACTOR_TYPE.ENEMY : (activeActorId?.startsWith('pet-') ? ACTOR_TYPE.PET : ACTOR_TYPE.PLAYER);
  // UI active character is always what's selected, rather than the logical turn actor (like pets/enemies)
  const activeChar = party[activeIndex] || party[0];

  const turnActorDisplayName =
    activeActorType === ACTOR_TYPE.ENEMY
      ? (enemy?.name ? String(enemy.name).trim() : '')
      : activeActorType === ACTOR_TYPE.PET
        ? (() => {
            const actor = party.find((p: any) => p.id === activeActorId);
            return actor?.name ? String(actor.name).trim() : '';
          })()
        : '';
  const isPlayerTurnPhase = currentPhase === PHASE.ACTIVE && activeActorType === ACTOR_TYPE.PLAYER && activeActorId === user?.id;
  const currentAbility = activeChar?.abilities?.find((a: any) => a.id === selectedAbilityId);
  const basicAbility = activeChar?.abilities?.find((a: any) => a.id.endsWith('_basic') || a.id === 'generic_attack') ?? activeChar?.abilities?.[0];

  const parryTimerRef = useRef(0);
  const qteTargetsRef = useRef<any[]>([]);
  const qteStatsRef = useRef({ hits: 0, misses: 0, perfects: 0 });
  const comboMultiplierRef = useRef(1.0);

  // Build SkillAnimationConfig from skill_animations row (shared by cache and fetch effect)
  const buildAnimationConfig = (row: { sprite_url: string | null; sfx_url?: string | null; frame_count?: number; frame_width?: number; frame_height?: number; frame_size?: number; offset_x?: number; offset_y?: number; preview_scale?: number | string; duration_ms?: number; vfx_type?: string }) => {
    const frameSize = Number(row.frame_size) || 0;
    return {
      sprite_url: row.sprite_url ?? null,
      sfx_url: row.sfx_url ?? undefined,
      frame_count: Number(row.frame_count) || 1,
      frame_width: Number(row.frame_width) || frameSize || 64,
      frame_height: Number(row.frame_height) || frameSize || 64,
      offset_x: Number(row.offset_x) || 0,
      offset_y: Number(row.offset_y) || 0,
      preview_scale: row.preview_scale ?? 1,
      duration_ms: Number(row.duration_ms) || 800,
      vfx_type: (row.vfx_type as 'impact' | 'projectile' | 'melee') || 'impact',
    } as SkillAnimationConfig;
  };

  // Pre-fetch skill_animations for loadout so VFX can start immediately on press (no network delay)
  useEffect(() => {
    if (!party.length || loadingSkills) return;
    const abilities = party[0]?.abilities ?? getBattleSkills();
    if (!abilities?.length) {
      setAssetsLoaded(true);
      return;
    }

    const preloadAssets = async () => {
      preloadBattleSounds();

      const seen = new Set<string>();
      const promises: Promise<any>[] = [];

      abilities.forEach((ability: { id?: string; name?: string }) => {
        const key = [ability.id, ability.name].filter(Boolean).join('|');
        if (!key || seen.has(key)) return;
        seen.add(key);

        const p = fetchSkillAnimation(ability.id ?? null, ability.name ?? null).then(async (row) => {
          if (!row) return;
          const hasSprite = row.sprite_url && String(row.sprite_url).trim();
          const hasSfx = row.sfx_url && String(row.sfx_url).trim();
          if (!hasSprite && !hasSfx) return;

          const config = buildAnimationConfig(row);
          animationConfigCacheRef.current[row.skill_id] = config;
          if (ability.name) animationConfigCacheRef.current[ability.name] = config;
          if (ability.id) animationConfigCacheRef.current[ability.id] = config;

          const preloads: Promise<any>[] = [];
          if (hasSprite && row.sprite_url) {
            preloads.push(
              Image.prefetch(row.sprite_url).then(() => {
                setPreloadedSpriteUrls(prev => (prev.includes(row.sprite_url!) ? prev : [...prev, row.sprite_url!]));
              }),
            );
          }
          if (hasSfx && row.sfx_url) {
            preloads.push(preloadSfxUrl(String(row.sfx_url).trim()));
          }
          await Promise.all(preloads);
        });
        promises.push(p);
      });

      // 2. Preload Generic/Common Effects
      try {
        // Example: moon_slash.png from your assets
        // promises.push(Asset.fromModule(require('../../assets/effects/moon_slash.png')).downloadAsync());
      } catch (e) {
        // ignore
      }

      try {
        await Promise.all(promises);
      } catch (e) {
        console.warn('[Battle] Some assets failed to preload', e);
      } finally {
        setAssetsLoaded(true);
      }
    };

    preloadAssets();
  }, [party.length, loadingSkills]);

  // Fetch skill_animations when a damage event has skillId or abilityName (fallback if not in cache)
  useEffect(() => {
    if (!lastDamageEvent?.targetId) return;
    const skillId = lastDamageEvent.skillId;
    const abilityName = lastDamageEvent.abilityName;
    if (!skillId && !abilityName) return;
    let cancelled = false;
    fetchSkillAnimation(skillId ?? null, abilityName ?? null).then((row) => {
      if (cancelled) return;

      if (!row) {
        // Create fallback animation for skills without database entries
        const config = buildAnimationConfig({
          sprite_url: null,
          sfx_url: null,
          frame_count: 1,
          duration_ms: 500,
          vfx_type: 'impact'
        });
        setLastSkillAnimationConfig(config);
        return;
      }

      const hasSprite = row.sprite_url && String(row.sprite_url).trim();
      const hasSfx = row.sfx_url && String(row.sfx_url).trim();

      if (!hasSprite && !hasSfx) {
        // Create fallback animation for skills with empty URLs
        const config = buildAnimationConfig({
          ...row,
          sprite_url: null,
          sfx_url: null,
          frame_count: 1,
          duration_ms: 500,
          vfx_type: 'impact'
        });
        setLastSkillAnimationConfig(config);
        return;
      }

      const config = buildAnimationConfig(row);
      setLastSkillAnimationConfig(config);
    });
    return () => { cancelled = true; };
  }, [lastDamageEvent?.timestamp, lastDamageEvent?.skillId, lastDamageEvent?.abilityName, lastDamageEvent?.targetId]);

  useEffect(() => {
      qteTargetsRef.current = qteTargets;
  }, [qteTargets]);

  useEffect(() => {
      qteStatsRef.current = qteStats;
  }, [qteStats]);

  useEffect(() => {
      comboMultiplierRef.current = comboMultiplier;
  }, [comboMultiplier]);


  // Reset battle-ended flag when starting a new encounter
  useEffect(() => {
    battleEndedRef.current = false;
  }, [encounterId, raidId]);

  // --- Initialization ---
  useEffect(() => {
    // Wait for loadout to be populated or confirmed empty before initializing
    if (loadingSkills) return;
    // Don't re-init if battle has already ended (prevents user/context updates from wiping VICTORY/DEFEAT)
    if (battleEndedRef.current) return;

    setAssetsLoaded(false);
    const initBattle = async () => {
      setLoading(true);
      setCurrentPhase(PHASE.ACTIVE);
      setQueueIndex(0);
      setLogs(['BATTLE START']);
      setPlannedAbilities([]);
      setChainCount(0);
      setSelectedAbilityId(null);
      
      try {
        const cachedEncounter =
          !isBoss && encounterId && currentMapId
            ? useEncounterPoolStore.getState().getEncounterById(currentMapId, encounterId)
            : undefined;

        /** Runs in parallel with party setup when cache miss (party_members + cosmetics). */
        const encounterPoolPromise =
          !isBoss && encounterId && !cachedEncounter
            ? supabase.from('encounter_pool').select('*').eq('id', encounterId).single()
            : Promise.resolve({ data: null as any, error: null });

        // 1. Fetch Player Data & Skills (always includes Basic Attack from useSkills)
        let playerAbilities = getBattleSkills();
        if (playerAbilities.length === 0) {
            playerAbilities = [{
                id: 'generic_attack',
                name: 'Generic Attack',
                cost: 0,
                power: 50,
                type: 'damage',
                element: 'Physical',
                hits: 1,
                target: 'Single',
                description: 'Deal 100% ATK.',
                current_rank: 1,
                cooldown: 0,
            }];
        }

        const initialHP = user?.current_hp && user.current_hp > 0 ? user.current_hp : (user?.max_hp || 100);

        const playerChar = {
            id: user?.id || 'player',
            name: user?.name || 'Hunter',
            hp: initialHP,
            maxHP: user?.max_hp || 100,
            ap: user?.current_ap || 3,
            maxAP: user?.max_ap || 3,
            abilities: playerAbilities,
            type: 'player',
            atkBuff: 0,
            level: user?.level || 1,
            avatar: user // Store user object for LayeredAvatar
        };

        const partyMembers: any[] = [playerChar];

        // 1c. Fetch other party members if in a party (including their cosmetics for hand grips)
        if (user?.party_id) {
          const { data: otherMembers } = await supabase
            .from('party_members')
            .select(`
              hunter_id, 
              profiles(*)
            `)
            .eq('party_id', user.party_id)
            .neq('hunter_id', user.id);

          if (otherMembers) {
            // Fetch cosmetics for each party member
            const memberIds = otherMembers.map(m => m.hunter_id).filter(Boolean);
            const { data: memberCosmetics } = await supabase
              .from('user_cosmetics')
              .select(`
                hunter_id,
                equipped,
                shop_items(*)
              `)
              .in('hunter_id', memberIds);

            otherMembers.forEach((m: any) => {
              if (m.profiles) {
                // Get cosmetics for this member
                const userCosmetics = memberCosmetics?.filter(
                  (c: any) => c.hunter_id === m.hunter_id
                ) || [];
                
                // Build avatar object with cosmetics for LayeredAvatar
                const avatarData = {
                  ...m.profiles,
                  cosmetics: userCosmetics,
                  gender: m.profiles.gender,
                };
                
                partyMembers.push({
                  id: m.profiles.id,
                  name: m.profiles.hunter_name || 'Partner',
                  hp: m.profiles.current_hp || m.profiles.max_hp || 100,
                  maxHP: m.profiles.max_hp || 100,
                  ap: m.profiles.current_ap || 3,
                  maxAP: m.profiles.max_ap || 3,
                  abilities: [],
                  type: 'player',
                  atkBuff: 0,
                  level: m.profiles.level || 1,
                  avatar: avatarData
                });
              }
            });
          }
        }

        // 1b. Add active pet to party if available
        if (activePet?.pet_details) {
          const level = activePet.level || 1;
          const petPower = Math.floor(15 + level * 8);
          const petChar = {
            id: `pet-${user?.id}`, // Use player ID prefix for co-op pet tracking
            name: activePet.nickname || activePet.pet_details?.name || 'Pet',
            hp: 50 + level * 10,
            maxHP: 50 + level * 10,
            ap: 0,
            maxAP: 0,
            abilities: [{
              id: 'pet_attack',
              name: 'Pet Attack',
              cost: 0,
              power: petPower,
              type: 'damage',
              element: 'Physical',
              hits: 1,
              target: 'Single',
              description: 'Your pet attacks.',
              current_rank: 1,
              cooldown: 0,
            }],
            type: 'pet',
            atkBuff: 0,
            level: level,
            avatar: null,
            petDetails: activePet.pet_details,
          };
          partyMembers.push(petChar);
        }

        // 1c. Sort party members by ID to ensure deterministic turn order in co-op
        partyMembers.sort((a, b) => a.id.localeCompare(b.id));

        setParty(partyMembers);
        const seed = `${user?.party_id || 'solo'}-${encounterId || raidId}`;
        setTurnQueue(generateTurns(50, partyMembers, seed));

        // 2. Fetch Enemy Data
        if (isBoss && raidId) {
            // Fetch Raid Boss
            const { data: raidData } = await supabase.from('dungeon_raids').select('*, encounter_pool(*)').eq('id', raidId).single();
            if (raidData) {
                setEnemy({
                    id: raidData.id,
                    name: raidData.encounter_pool?.name || 'Raid Boss',
                    hp: raidData.current_hp,
                    maxHP: raidData.encounter_pool?.hp_base || 100000,
                    defDebuff: 0,
                    icon_url: raidData.encounter_pool?.icon_url,
                    metadata: raidData.encounter_pool?.metadata ?? null,
                });

                // Subscribe to Raid HP
                const channel = supabase.channel(`raid-${raidId}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dungeon_raids', filter: `id=eq.${raidId}` }, 
                    payload => {
                        setEnemy((prev: any) => {
                            if (!prev) return null;
                            return { ...prev, hp: payload.new.current_hp };
                        });
                    })
                    .subscribe();
                
                return () => supabase.removeChannel(channel);
            }
        } else if (encounterId) {
            const encounterData =
              cachedEncounter ?? (await encounterPoolPromise).data;
            if (encounterData) {
                 setEnemy({
                    id: encounterData.id,
                    name: encounterData.name,
                    hp: encounterData.hp_base,
                    maxHP: encounterData.hp_base,
                    defDebuff: 0,
                    icon_url: encounterData.icon_url,
                    metadata: encounterData.metadata ?? null,
                });
            }
        }
      } catch (e) {
        console.error("Battle Init Error:", e);
        Alert.alert("Error", "Failed to initialize battle sequence.");
      } finally {
        setLoading(false);
      }
    };

    initBattle();
  }, [encounterId, raidId, isBoss, currentMapId, user?.id, loadingSkills, activePet?.id]); // Use user?.id to avoid re-init on user object reference changes

  const handleRemoteAction = (payload: any) => {
    const { casterId, totalDmg, multiResults, abilityName, skillId } = payload;
    
    setEnemy((prev: any) => {
      if (!prev) return null;
      const newHp = Math.max(0, prev.hp - totalDmg);
      if (newHp <= 0 && !battleEndedRef.current) {
        battleEndedRef.current = true;
        setTimeout(() => setCurrentPhase(PHASE.VICTORY), 800);
      }
      return { ...prev, hp: newHp };
    });

    if (multiResults) {
      multiResults.forEach((res: any) => {
        if (res.targetId !== 'ENEMY') {
          setParty(prev => prev.map(p => p.id === res.targetId ? { ...p, hp: res.type === 'heal' ? Math.min(p.maxHP, p.hp + res.value) : Math.max(0, p.hp - res.value) } : p));
        }
      });
    }

    setLastDamageEvent({
      targetId: 'ENEMY',
      value: totalDmg,
      type: 'damage',
      timestamp: Date.now(),
      abilityName,
      skillId,
      casterCharId: casterId,
      multiResults
    });

    addLog(`${payload.casterName} used ${abilityName}!`);
  };

  // --- Realtime Sync ---
  useEffect(() => {
    if (!user?.party_id || !enemy || !assetsLoaded) return;

    const channelId = `battle:${user.party_id}:${encounterId || raidId}`;
    const channel = supabase.channel(channelId)
      .on('broadcast', { event: 'BATTLE_ACTION' }, ({ payload }) => {
        if (payload.casterId !== user.id) {
          handleRemoteAction(payload);
        }
      })
    .on('broadcast', { event: 'SYNC_REQUEST' }, () => {
      if (enemy && !battleEndedRef.current) {
        realtimeChannelRef.current?.send({
          type: 'broadcast',
          event: 'SYNC_STATE',
          payload: { 
            enemyHp: enemy.hp, 
            logs,
            partyHps: party.map(p => ({ id: p.id, hp: p.hp })),
            queueIndex,
            currentPhase
          }
        });
      }
    })
    .on('broadcast', { event: 'SYNC_STATE' }, ({ payload }) => {
      setEnemy((prev: any) => prev ? { ...prev, hp: payload.enemyHp } : prev);
      if (payload.logs) setLogs(prev => [...new Set([...prev, ...payload.logs])].slice(0, 5));
      if (payload.queueIndex !== undefined) setQueueIndex(payload.queueIndex);
      if (payload.currentPhase) setCurrentPhase(payload.currentPhase);
      if (payload.partyHps) {
        setParty(prev => prev.map(p => {
          const sync = payload.partyHps.find((sh: any) => sh.id === p.id);
          return sync ? { ...p, hp: sync.hp } : p;
        }));
      }
    })
      .subscribe();

    realtimeChannelRef.current = channel;
    
    // Request initial sync
    channel.send({ type: 'broadcast', event: 'SYNC_REQUEST', payload: {} });

    return () => {
      channel.unsubscribe();
      realtimeChannelRef.current = null;
    };
  }, [user?.party_id, !!enemy, assetsLoaded]);

  // --- Helpers ---
  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 2));

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
    Vibration.vibrate(100);
  };

  const startPlayerTurn = (nextActorId: string) => {
    setCurrentPhase(PHASE.ACTIVE);
    setEnemyTargetId(null);
    setChainCount(0);
    setPlannedAbilities([]);
    setSelectedAbilityId(null);

    setParty(prev => {
      // Set active index to the character whose turn it is
      // Don't shift UI focus to pets since they auto-attack instantly, and don't shift to ENEMY
      let uiActiveIdx = prev.findIndex(p => p.id === nextActorId);
      if (uiActiveIdx === -1 || nextActorId === 'ENEMY' || nextActorId?.startsWith('pet-')) {
        // Fall back to the local player
        uiActiveIdx = prev.findIndex(p => p.id === user?.id);
        if (uiActiveIdx === -1) uiActiveIdx = 0;
      }
      setActiveIndex(uiActiveIdx);

      // Only update AP for the active player
      return prev.map(p => p.id === nextActorId
        ? { ...p, ap: Math.min(p.maxAP, p.ap + 1), atkBuff: Math.max(0, p.atkBuff - 1) }
        : p
      );
    });
    setEnemy((prev: any) => {
      if (!prev) return null;
      return { ...prev, defDebuff: Math.max(0, (prev.defDebuff ?? 0) - 1) };
    });
  };

  const advanceTurn = () => {
    setQueueIndex(prev => {
      const nextIdx = prev + 1;
      const nextActorId = turnQueue[nextIdx];
      setTimeout(() => startPlayerTurn(nextActorId), 0);
      return nextIdx;
    });
  };

  const switchStance = () => {
    setStance(prev => prev.id === 'attack' ? STANCE.DEFENSE : STANCE.ATTACK);
  };

  const processPlannedActions = async () => {
    if (!isPlayerTurnPhase || plannedAbilities.length === 0) return;
    if (isProcessingActionsRef.current) return;
    isProcessingActionsRef.current = true;

    try {
      const toProcess = [...plannedAbilities];
      setPlannedAbilities([]);
      setSelectedAbilityId(null);

      let workingParty = JSON.parse(JSON.stringify(party));
      let workingEnemy = { ...enemy };
      let c = 0;
      let totalDmg = 0;
      let lastDamageAbilityName: string | undefined;
      let lastDamageSkillId: string | undefined;
      let lastDamageCharId: string | undefined;
      let lastDamageTargetId: string | undefined;
      let lastEffectAbilityName: string | undefined;
      let lastEffectSkillId: string | undefined;
      let quickSlashCount = 0;
      let skillUseCount = 0;
      const damagePerHit: number[] = [];
      const multiResults: Array<{ targetId: string, value: number, type: 'damage' | 'heal' }> = [];

      for (const item of toProcess) {
        const { charId, ability } = item;
        const caster = workingParty.find((p: any) => p.id === charId);
        const chainMultiplier = 1.0 + (c * 0.1);
        
        // Track ability info for animation triggering
        lastDamageAbilityName = ability.name;
        lastDamageSkillId = ability.id;
        lastDamageCharId = charId;

        if (ability.type !== 'damage') {
          lastEffectAbilityName = ability.name;
          lastEffectSkillId = ability.id;
        }

        // 1. DETERMINE THE TARGET ENTITIES
        let targets: any[] = [];
        let resolvedTargetId: string = 'ENEMY';

        switch (ability.target_type) {
          case 'self':
            targets = [caster];
            resolvedTargetId = charId;
            break;
          case 'teammate':
            const otherPartyMembers = workingParty.filter((p: any) => p.id !== charId);
            if (otherPartyMembers.length > 0) {
              const weakest = [...otherPartyMembers].sort((a, b) => a.hp - b.hp)[0];
              targets = [weakest];
              resolvedTargetId = weakest.id;
            } else {
              targets = [caster];
              resolvedTargetId = charId;
            }
            break;
          case 'enemy':
            targets = [workingEnemy];
            resolvedTargetId = 'ENEMY';
            break;
          case 'area_friendly':
            targets = workingParty;
            resolvedTargetId = 'ALL_FRIENDS';
            break;
          case 'area_enemy':
            targets = [workingEnemy]; // Support for multiple enemies can be added here
            resolvedTargetId = 'ALL_ENEMIES';
            break;
          default:
            targets = [workingEnemy];
            resolvedTargetId = 'ENEMY';
        }
        
        lastDamageTargetId = resolvedTargetId;

        // Handle movement skills (self-target movement)
        if (ability.target_type === 'self' && (ability.skill_animation_type === 'movement' || ability.name?.includes('Dash'))) {
          // Logic to move the character
          // Note: This assumes position properties exist on character objects
          // You may need to add positionX, positionY, etc. to your character data structure
          if (caster && typeof caster.positionX !== 'undefined') {
            caster.positionX += 2; // Example: move 2 units to the right
            // Trigger a "Move" animation in your UI
            // dispatchGameEvent('CHARACTER_MOVE', { charId, newPos: caster.positionX });
          }
        }

        // 2. APPLY THE EFFECTS TO THE RESOLVED TARGETS
        targets.forEach(target => {
          const isEnemy = target === workingEnemy;
          const targetType = (ability.type === 'heal' || ability.type === 'buff') ? 'heal' : 'damage';

          if (ability.type === 'heal') {
            if (!isEnemy) {
              const healVal = Math.floor(ability.power * (stance.id === 'defense' ? 1.5 : 1.0));
              workingParty = workingParty.map((p: any) => p.id === target.id ? { ...p, hp: Math.min(p.maxHP, p.hp + healVal) } : p);
              multiResults.push({ targetId: target.id, value: healVal, type: 'heal' });
            }
          } else if (ability.type === 'buff') {
            if (!isEnemy) {
              workingParty = workingParty.map((p: any) => p.id === target.id ? { ...p, atkBuff: 2 } : p);
              multiResults.push({ targetId: target.id, value: 0, type: 'heal' });
            }
          } else if (ability.type === 'debuff') {
            if (isEnemy) {
              target.defDebuff = 2;
              multiResults.push({ targetId: target.id, value: 0, type: 'damage' });
            }
          } else if (ability.type === 'damage' || ability.type === 'burst') {
            let pwr = ability.power * (stance.id === 'attack' ? (1.25 * stanceLevel) : 0.6);
            if (caster?.atkBuff > 0) pwr *= 1.5;
            if (target.defDebuff > 0) pwr *= 1.5;
            pwr *= chainMultiplier;
            const dmg = Math.floor(pwr);

            if (isEnemy) {
              target.hp = Math.max(0, target.hp - dmg);
              totalDmg += dmg;
              damagePerHit.push(dmg);
              skillUseCount++;
              if (ability.name === 'Quick Slash') quickSlashCount++;
              multiResults.push({ targetId: 'ENEMY', value: dmg, type: 'damage' });
            } else {
              workingParty = workingParty.map((p: any) => p.id === target.id ? { ...p, hp: Math.max(0, p.hp - dmg) } : p);
              multiResults.push({ targetId: target.id, value: dmg, type: 'damage' });
            }
          }
        });

        c++;
      }

      setParty(workingParty);
      setEnemy(workingEnemy);

      let cachedConfig = null;
      if ((lastDamageSkillId != null && (totalDmg > 0 || multiResults.length > 0)) || (lastEffectSkillId != null)) {
          const finalSkillId = lastDamageSkillId || lastEffectSkillId;
          const finalAbilityName = lastDamageAbilityName || lastEffectAbilityName;

          const payload = {
            targetId: lastDamageTargetId || 'ENEMY',
            value: totalDmg,
            type: (totalDmg > 0 ? 'damage' : 'heal') as "damage" | "heal",
            timestamp: Date.now(),
            abilityName: finalAbilityName,
            quickSlashCount,
            skillUseCount: skillUseCount || 1,
            damagePerHit: damagePerHit.length > 0 ? damagePerHit : [0],
            skillId: finalSkillId,
            casterCharId: lastDamageCharId,
            multiResults: multiResults.length > 1 ? multiResults : undefined
          };
          setLastDamageEvent(payload);
          const cache = animationConfigCacheRef.current;
          cachedConfig = (payload.skillId && cache[payload.skillId]) ?? (payload.abilityName && cache[payload.abilityName]) ?? null;
          if (cachedConfig) setLastSkillAnimationConfig(cachedConfig);

          // Broadcast to party
          if (realtimeChannelRef.current) {
            realtimeChannelRef.current.send({
              type: 'broadcast',
              event: 'BATTLE_ACTION',
              payload: {
                casterId: user?.id,
                casterName: user?.hunter_name || 'Hunter',
                totalDmg,
                multiResults,
                abilityName: finalAbilityName,
                skillId: finalSkillId
              }
            });
          }
      }

      if (workingEnemy.hp <= 0) {
        battleEndedRef.current = true;
        const animationDelay = cachedConfig ? (cachedConfig.duration_ms * skillUseCount) + 500 : 1000;
        setTimeout(() => {
          setCurrentPhase(PHASE.VICTORY);
        }, animationDelay);
        isProcessingActionsRef.current = false;
        return;
      }

      if (isBoss && raidId && totalDmg > 0) {
        await supabase.rpc('land_raid_hit', {
          t_raid_id: raidId,
          t_user_id: user?.id,
          t_damage: totalDmg
        });
      }

      setTimeout(() => {
        advanceTurn();
        isProcessingActionsRef.current = false;
      }, 100);
    } catch (e) {
      console.error('processPlannedActions error:', e);
      isProcessingActionsRef.current = false;
    }
  };

  const undoLastAction = () => {
    if (plannedAbilities.length === 0) return;
    const lastAction = plannedAbilities[plannedAbilities.length - 1];
    setParty(prev => prev.map(p => p.id === lastAction.charId ? { ...p, ap: p.ap + lastAction.ability.cost } : p));
    setPlannedAbilities(prev => prev.slice(0, -1));
    setChainCount(prev => prev - 1);
    setSelectedAbilityId(null);
  };

  const skipTurn = () => {
    if (!isPlayerTurnPhase) return;
    if (isProcessingActionsRef.current) return;
    isProcessingActionsRef.current = true;
    
    addLog("SKIP TURN");
    setPlannedAbilities([]);
    setSelectedAbilityId(null);
    setChainCount(0);
    
    setTimeout(() => {
        advanceTurn();
        isProcessingActionsRef.current = false;
    }, 300);
  };

  const handleAbilityTap = (ability: any) => {
    if (!isPlayerTurnPhase) return;
    const char = party.find(p => p.id === activeChar.id);
    if (!char) return;

    if (char.ap < ability.cost) return;

    if (tapToConfirm) {
      if (selectedAbilityId === ability.id) {
        setPlannedAbilities(prev => [...prev, { charId: activeChar.id, ability }]);
        setParty(prev => prev.map(p => p.id === activeChar.id ? { ...p, ap: p.ap - ability.cost } : p));
        setChainCount(prev => prev + 1);
        setSelectedAbilityId(null);
      } else {
        setSelectedAbilityId(ability.id);
      }
    } else {
      // Single-tap: add to plan immediately
      setPlannedAbilities(prev => [...prev, { charId: activeChar.id, ability }]);
      setParty(prev => prev.map(p => p.id === activeChar.id ? { ...p, ap: p.ap - ability.cost } : p));
      setChainCount(prev => prev + 1);
      setSelectedAbilityId(null);
    }
  };

  const handleQteTap = (targetId: string) => {
    const target = qteTargets.find(t => t.id === targetId);
    if (!target || target.status !== 'pending' || target.type !== QTE_TYPE.TAP) return;
    
    const diff = Math.abs(parryTimerRef.current - target.hitTime);
    
    // Tap Logic
    if (diff <= 10) {
        playHunterSound('tap', true);

        // Just-Frame / Perfect Check (Tight Window)
        const isPerfect = diff <= 5; // ~80ms at 60fps logic
        
        setQteTargets(prev => prev.map(t => t.id === targetId ? { ...t, status: isPerfect ? 'perfect' : 'hit' } : t));
        setQteStats(prev => ({ 
            ...prev, 
            hits: prev.hits + 1,
            perfects: isPerfect ? prev.perfects + 1 : prev.perfects 
        }));
        
        if (isPerfect) {
            setSuccessFlash(true); // Brighter flash maybe?
            setFocusMode(true); // Enter Bullet Time
            setComboMultiplier(prev => prev + 0.2); // Increase rewards
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => setFocusMode(false), 500); // 0.5s of slowdown
        } else {
            setSuccessFlash(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        setTimeout(() => setSuccessFlash(false), 300);
    } else {
        setQteTargets(prev => prev.map(t => t.id === targetId ? { ...t, status: 'miss' } : t));
        setQteStats(prev => ({ ...prev, misses: prev.misses + 1 }));
        setFailFlash(true);
        triggerShake();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => setFailFlash(false), 300);
        
        // Fail usually breaks combo
        setComboMultiplier(1.0);
        setFocusMode(false);
        resolveEnemyAttack(false, "FAILED");
    }
  };

  const handleQteSwipe = (targetId: string, direction: string) => {
      const target = qteTargets.find(t => t.id === targetId);
      if (!target || target.status !== 'pending' || target.type !== QTE_TYPE.SWIPE) return;

      const diff = Math.abs(parryTimerRef.current - target.hitTime);

      if (diff <= 12 && target.direction === direction) {
          playHunterSound('swipe', true); // FORCE PLAY SWIPE SOUND

          const isPerfect = diff <= 6;
          setQteTargets(prev => prev.map(t => t.id === targetId ? { ...t, status: isPerfect ? 'perfect' : 'hit' } : t));
          setQteStats(prev => ({ 
              ...prev, 
              hits: prev.hits + 1,
              perfects: isPerfect ? prev.perfects + 1 : prev.perfects 
          }));
          
          if (isPerfect) {
             setSuccessFlash(true);
             setFocusMode(true);
             setComboMultiplier(prev => prev + 0.3); // Swipes reward more
             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
             setTimeout(() => setFocusMode(false), 600);
          } else {
             setSuccessFlash(true);
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
          setTimeout(() => setSuccessFlash(false), 300);
      } else {
          // Miss or Wrong Direction
          setQteTargets(prev => prev.map(t => t.id === targetId ? { ...t, status: 'miss' } : t));
          setQteStats(prev => ({ ...prev, misses: prev.misses + 1 }));
          setFailFlash(true);
          triggerShake();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setComboMultiplier(1.0);
          setFocusMode(false);
          setTimeout(() => setFailFlash(false), 300);
          resolveEnemyAttack(false, "WRONG DIRECTION");
      }
  };

  const resolveEnemyAttack = (isParry: boolean, msg: string, allPerfectFromSequence?: boolean) => {
    if (attackResolvedRef.current) return;
    attackResolvedRef.current = true;
    setParryWindowActive(false);
    
    // ... rest of function
    if (isParry) {
        setSuccessFlash(true);
        setTimeout(() => setSuccessFlash(false), 800);
    } else {
        setFailFlash(true);
        triggerShake();
        setTimeout(() => setFailFlash(false), 800);
    }
    
    // Calculate Damage (Reduced by Hits)
    const baseDmg = 800;
    const mitigation = qteStats.hits * 150 + qteStats.perfects * 250; // Perfects mitigate more
    const dmg = isParry ? 0 : Math.max(0, baseDmg - mitigation); 
    
    const nextParty = party.map(p => p.id === enemyTargetId ? { ...p, hp: Math.max(0, p.hp - dmg) } : p);
    setParty(nextParty); // Update Party HP
    
    if (dmg > 0 && enemyTargetId) {
        setLastDamageEvent({ targetId: enemyTargetId, value: dmg, type: 'damage', timestamp: Date.now() });
    }

    // Determine Sequence Feedback
    let feedback: 'PERFECT' | 'COMPLETE' | 'FAILED' | null = null;
    if (isParry) {
        // Parry success: show PERFECT or COMPLETE (use passed flag to avoid stale state)
        const allPerfect = allPerfectFromSequence ?? (qteStats.perfects === qteTargets.length);
        feedback = allPerfect ? 'PERFECT' : 'COMPLETE';
        if (allPerfect) {
            setBurstCharged(true);
            addLog(`PERFECT BURST!`);
            const counterDmg = 500 * comboMultiplierRef.current;
            const newEnemyHp = Math.max(0, (enemy?.hp ?? 0) - counterDmg);
            setEnemy((prev: any) => ({ ...prev, hp: newEnemyHp }));
            setLastDamageEvent({ targetId: 'ENEMY', value: counterDmg, type: 'damage', timestamp: Date.now() });
            if (newEnemyHp <= 0) {
                battleEndedRef.current = true;
                setTimeout(() => setCurrentPhase(PHASE.VICTORY), 800);
                return;
            }
        } else {
            addLog(`SEQUENCE COMPLETE`);
        }
    } else {
        // Parry failed (miss or wrong swipe)
        addLog(`HIT: ${qteStats.hits} / PERFECT: ${qteStats.perfects} / MISS: ${qteStats.misses}`);
        feedback = 'FAILED';
    }
    
    if (feedback) {
        setSequenceFeedback(feedback as any);
        setTimeout(() => setSequenceFeedback(null), 1200); // Show for longer
    } else {
        // For individual hits, use successFlash but rely on component to NOT show big text
    }

    if (nextParty.every(p => p.hp <= 0)) {
        battleEndedRef.current = true;
        setTimeout(() => {
            setCurrentPhase(PHASE.DEFEAT);
        }, 1000);
        return;
    }

    setTimeout(() => {
        advanceTurn();
    }, 1800);
  };

  // Position zones for varied, intentional placement (avoids clustering, feels less random)
  const POSITION_ZONES = [
    { x: 25, y: 35 }, { x: 50, y: 30 }, { x: 75, y: 35 },
    { x: 20, y: 55 }, { x: 50, y: 55 }, { x: 80, y: 55 },
    { x: 35, y: 45 }, { x: 65, y: 45 },
  ];
  const pickZone = (usedIndices: Set<number>, allowRepeat = false) => {
    if (allowRepeat && Math.random() < 0.25) {
      return { x: 20 + Math.random() * 60, y: 30 + Math.random() * 40 };
    }
    const available = POSITION_ZONES.map((_, i) => i).filter(i => !usedIndices.has(i));
    const idx = available.length ? available[Math.floor(Math.random() * available.length)] : Math.floor(Math.random() * POSITION_ZONES.length);
    usedIndices.add(idx);
    const zone = POSITION_ZONES[idx];
    const jitter = 6;
    return { x: zone.x + (Math.random() - 0.5) * jitter, y: zone.y + (Math.random() - 0.5) * jitter };
  };

  const startEnemyAttack = () => {
    attackResolvedRef.current = false;
    setCurrentPhase(PHASE.ENEMY_STRIKE);
    // setParryTimer(0);
    parryTimerAnim.setValue(0);
    parryTimerRef.current = 0;
    setParryWindowActive(true);
    setParryPreDelay(0.12 + Math.random() * 0.12); // 0.12–0.24s variable windup
    setFocusMode(false);
    setBurstCharged(false);
    setComboMultiplier(1.0);

    // Weighted pattern pick for variety (NORMAL/RHYTHM/MIXED more common, FLURRY/HEAVY/SWIPE surprise)
    const patternRoll = Math.random();
    let selectedPattern: string;
    if (patternRoll < 0.28) selectedPattern = ATTACK_PATTERN.NORMAL;
    else if (patternRoll < 0.52) selectedPattern = ATTACK_PATTERN.RHYTHM;
    else if (patternRoll < 0.72) selectedPattern = ATTACK_PATTERN.MIXED;
    else if (patternRoll < 0.88) selectedPattern = ATTACK_PATTERN.SWIPE_STORM;
    else if (patternRoll < 0.96) selectedPattern = ATTACK_PATTERN.FAST_FLURRY;
    else selectedPattern = ATTACK_PATTERN.HEAVY_SLOW;
    setCurrentPattern(selectedPattern);

    // Variable target count: 3–7, pattern-specific bias
    let count: number;
    if (selectedPattern === ATTACK_PATTERN.FAST_FLURRY) count = 5 + Math.floor(Math.random() * 3); // 5–7
    else if (selectedPattern === ATTACK_PATTERN.HEAVY_SLOW) count = 3 + Math.floor(Math.random() * 2); // 3–4
    else count = 4 + Math.floor(Math.random() * 4); // 4–7
    count = Math.max(3, Math.min(7, count));

    const newTargets: any[] = [];
    const baseFirstHit = 6 + Math.floor(Math.random() * 8); // 6–13 variable first prompt
    let lastTime = baseFirstHit;
    const rhythmBase = 30; // Slightly slower rhythm (was 28)
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const usedZones = new Set<number>();
    let swipeRun = 0; // for MIXED: allow 1–3 swipes in a row
    const mixedSwipeChance = 0.5 + Math.random() * 0.25; // 50–75% swipe in MIXED for better balance

    for (let i = 0; i < count; i++) {
      let type = QTE_TYPE.TAP;
      let direction: string | null = null;
      let gap: number;

      switch (selectedPattern) {
        case ATTACK_PATTERN.RHYTHM:
          gap = rhythmBase + (Math.random() - 0.5) * 6; // humanized rhythm ±3
          type = Math.random() < 0.45 ? QTE_TYPE.SWIPE : QTE_TYPE.TAP;
          if (type === QTE_TYPE.SWIPE) direction = dirs[Math.floor(Math.random() * dirs.length)];
          break;
        case ATTACK_PATTERN.SWIPE_STORM:
          type = QTE_TYPE.SWIPE;
          direction = dirs[Math.floor(Math.random() * dirs.length)];
          gap = 37 + Math.random() * 12; // Slightly slower swipes (was 34)
          break;
        case ATTACK_PATTERN.MIXED:
          if (swipeRun > 0 || Math.random() < mixedSwipeChance) {
            type = QTE_TYPE.SWIPE;
            direction = dirs[Math.floor(Math.random() * dirs.length)];
            swipeRun = swipeRun >= 2 ? 0 : swipeRun + 1;
          } else {
            swipeRun = 0;
          }
          gap = 32 + Math.random() * 18; // Slightly slower mixed (was 30)
          break;
        case ATTACK_PATTERN.FAST_FLURRY:
          gap = 18 + Math.random() * 10; // Slightly slower flurry (was 17)
          type = Math.random() < 0.45 ? QTE_TYPE.SWIPE : QTE_TYPE.TAP;
          if (type === QTE_TYPE.SWIPE) direction = dirs[Math.floor(Math.random() * dirs.length)];
          break;
        case ATTACK_PATTERN.HEAVY_SLOW:
          gap = 47 + Math.random() * 20; // Slightly slower heavy (was 44)
          type = Math.random() < 0.5 ? QTE_TYPE.SWIPE : QTE_TYPE.TAP;
          if (type === QTE_TYPE.SWIPE) direction = dirs[Math.floor(Math.random() * dirs.length)];
          break;
        default:
          gap = 28 + Math.random() * 28; // Slightly slower normal (was 26)
          type = Math.random() < 0.5 ? QTE_TYPE.SWIPE : QTE_TYPE.TAP;
          if (type === QTE_TYPE.SWIPE) direction = dirs[Math.floor(Math.random() * dirs.length)];
          break;
      }

      const startTime = lastTime + gap;
      const { x, y } = pickZone(usedZones, selectedPattern === ATTACK_PATTERN.FAST_FLURRY);

      newTargets.push({
        id: `t-${Date.now()}-${i}`,
        type,
        direction,
        x,
        y,
        hitTime: startTime,
        duration: 0,
        status: 'pending',
      });
      lastTime = startTime;
    }

    setQteTargets(newTargets);
    setQteStats({ hits: 0, misses: 0, perfects: 0 });
  };

  const startEnemyTurn = () => {
    setCurrentPhase(PHASE.ENEMY_WINDUP);
    const living = party.filter(p => p.hp > 0);
    const target = living[Math.floor(Math.random() * living.length)];
    if (target) {
        setEnemyTargetId(target.id);
        setTimeout(() => startEnemyAttack(), 350);
    } else {
        advanceTurn();
    }
  };

  // --- Core Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();

    const loop = () => {
        const currentTime = Date.now();
        let deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Apply Focus Mode (Time Dilation)
        if (focusMode) {
            deltaTime *= 0.5; // 50% Speed
        }

        if (currentPhase === PHASE.ACTIVE && stanceLevel < 2.0) {
            setStanceLevel(prev => Math.min(2.0, prev + (0.8 * deltaTime)));
        }

        if (currentPhase === PHASE.ENEMY_STRIKE && parryWindowActive) {
            if (parryPreDelay > 0) {
                setParryPreDelay(prev => prev - deltaTime);
            } else {
                const speed = 46; // Adjusted to 46 (from 52) for better balance
                
                // Update Timer
                parryTimerRef.current += deltaTime * speed;
                const nextTimer = parryTimerRef.current;
                
                // Directly drive the animation value without triggering a React render
                parryTimerAnim.setValue(nextTimer);
                // setParryTimer(nextTimer); // DISABLED to prevent 60fps re-renders

                // Check for expired targets & update active sliders
                // Use ref to avoid dependency issues/stale closures
                const currentTargets = qteTargetsRef.current;
                let hasChanges = false;
                let newMisses = 0;
                let newHits = 0;
                
                const updated = currentTargets.map(t => {
                    // Check for pending expire
                    if (t.status === 'pending' && nextTimer > t.hitTime + 10) {
                        hasChanges = true;
                        newMisses++;
                        return { ...t, status: 'miss' };
                    }
                    
                    return t;
                });

                if (hasChanges) {
                    setQteTargets(updated);
                    if (newMisses > 0 || newHits > 0) {
                        setQteStats(prev => ({
                            hits: prev.hits + newHits,
                            misses: prev.misses + newMisses,
                            perfects: prev.perfects // Loop doesn't detect perfects, only misses/timeouts
                        }));
                    }
                    
                    if (newMisses > 0) {
                        setComboMultiplier(1.0); // Reset Combo
                        setFocusMode(false); // End Focus
                        resolveEnemyAttack(false, "FAILED");
                        parryTimerRef.current = 0;
                        return;
                    }

                    if (newHits > 0) {
                        setSuccessFlash(true);
                        setTimeout(() => setSuccessFlash(false), 300);
                    }
                }
                
                // Check completion
                const lastTarget = currentTargets[currentTargets.length - 1];
                const sequenceEndTime = lastTarget ? (lastTarget.hitTime + (lastTarget.duration || 0) + 15) : 100;

                if (nextTimer >= sequenceEndTime) {
                    const finalTargets = hasChanges ? updated : currentTargets;
                    const success = finalTargets.length > 0 && finalTargets.every(t => t.status === 'hit' || t.status === 'perfect');
                    const allPerfect = success && finalTargets.every(t => t.status === 'perfect');
                    resolveEnemyAttack(success, success ? "PERFECT SEQUENCE!" : "SEQUENCE COMPLETE", allPerfect);
                    parryTimerRef.current = 0;
                    return;
                }
            }
        }
        animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentPhase, parryWindowActive, parryPreDelay, stanceLevel, focusMode]);

  // Pet turn: auto-attack after a short delay when it's the pet's turn
  // Wait for any active skill VFX to finish before the pet attacks
  useEffect(() => {
    if (currentPhase !== PHASE.ACTIVE || activeActorType !== ACTOR_TYPE.PET) return;
    if (lastSkillAnimationConfig) return;
    if (petTurnStartedRef.current) return;
    const pet = party.find((p: any) => p.type === 'pet');
    if (!pet || !enemy) {
      advanceTurn();
      return;
    }
    petTurnStartedRef.current = true;
    const ability = pet.abilities?.find((a: any) => a.type === 'damage') ?? pet.abilities?.[0];
    const dmg = ability ? Math.floor(ability.power) : 20;

    const timer = setTimeout(() => {
      // Trigger damage event and HP update together so they are "at the same time"
      setLastDamageEvent({
        targetId: 'ENEMY',
        value: dmg,
        type: 'damage',
        timestamp: Date.now(),
        casterCharId: pet.id,
        skillId: ability?.id,
        abilityName: ability?.name,
      });

      setEnemy((prev: any) => {
        if (!prev) return null;
        const newHp = Math.max(0, prev.hp - dmg);
        if (newHp <= 0) {
          battleEndedRef.current = true;
          setCurrentPhase(PHASE.VICTORY);
        }
        return { ...prev, hp: newHp };
      });
      
      if (isBoss && raidId && dmg > 0 && user?.id) {
        supabase.rpc('land_raid_hit', { t_raid_id: raidId, t_user_id: user.id, t_damage: dmg });
      }

      // Advance turn after the impact
      setTimeout(() => {
        if (!battleEndedRef.current) {
          advanceTurn();
        }
        petTurnStartedRef.current = false;
      }, 400);
    }, 400); // Initial wind-up before the pet "strikes"

    return () => clearTimeout(timer);
  }, [queueIndex, currentPhase, activeActorType, lastSkillAnimationConfig]);

  // Turn Trigger (Enemy)
  useEffect(() => {
    if (currentPhase === PHASE.ACTIVE && activeActorType === ACTOR_TYPE.ENEMY) {
        startEnemyTurn();
    }
  }, [queueIndex, currentPhase, activeActorType]);

  const getProjectedDetail = (ability: any) => {
    if (!ability || !activeChar) return null;
    const chainMod = (1.0 + (chainCount * 0.1)).toFixed(1);
    const stanceMod = (stance.id === 'attack' ? (1.25 * stanceLevel) : 0.6).toFixed(2);
    let outcome = "";
    if (ability.type === 'damage') {
        let finalPwr = ability.power * parseFloat(stanceMod);
        if (activeChar.atkBuff > 0) finalPwr *= 1.5;
        if (enemy?.defDebuff > 0) finalPwr *= 1.5;
        finalPwr *= parseFloat(chainMod);
        outcome = Math.floor(finalPwr) + " DMG";
    } else if (ability.type === 'heal') {
        const healMod = stance.id === 'defense' ? 1.5 : 1.0;
        const healAmt = ability.power * healMod;
        outcome = "+" + Math.floor(healAmt) + " HP";
    } else outcome = "Effect / 2T";

    return { name: ability.name, type: ability.type, desc: ability.description, hits: ability.hits, target: ability.target, final: outcome };
  };

  return {
    loading,
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
    currentPattern,
    plannedAbilities,
    selectedAbilityId,
    enemyTargetId,
    qteTargets,
    handleQteTap,
    parryTimerAnim, // Export animated value instead of state
    // parryTimer,
    parryPreDelay,
    parryWindowActive,
    successFlash,
    failFlash,
    sequenceFeedback, // Export
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
    handleQteSwipe,
    resolveEnemyAttack,
    getProjectedDetail,
    basicAbility,
    lastDamageEvent,
    lastSkillAnimationConfig,
    assetsLoaded,
    preloadedSpriteUrls,
    clearLastSkillAnimation: () => {
      setLastSkillAnimationConfig(null);
      setLastDamageEvent(null);
    },
    setCurrentPhase,
    QTE_TYPE,
    ATTACK_PATTERN
  };
};