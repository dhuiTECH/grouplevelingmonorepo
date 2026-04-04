import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export const PHASE = {
  ACTIVE: 'ACTIVE_PHASE',
  ENEMY_WINDUP: 'ENEMY_WINDUP',
  ENEMY_STRIKE: 'ENEMY_STRIKE',
  /** Pixel death outro on enemy sprite before VictoryScreen */
  DEATH_OUTRO_ENEMY: 'DEATH_OUTRO_ENEMY',
  /** Pixel death outro on party row before DefeatModal */
  DEATH_OUTRO_PARTY: 'DEATH_OUTRO_PARTY',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT'
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

export const ACTOR_TYPE = {
  PLAYER: 'PLAYER',
  PET: 'PET',
  ENEMY: 'ENEMY'
};

export interface DamageEvent {
  targetId: string;
  value: number;
  type: 'damage' | 'heal';
  timestamp: number;
  abilityName?: string;
  quickSlashCount?: number;
  skillUseCount?: number;
  damagePerHit?: number[];
  skillId?: string;
  casterCharId?: string;
  multiResults?: Array<{ targetId: string, value: number, type: 'damage' | 'heal' }>;
}

export interface BattleState {
  // Entities
  party: any[];
  enemy: any;
  
  // Phase & Turn logic
  currentPhase: string;
  turnQueue: string[];
  queueIndex: number;
  activeIndex: number; // Index in the party array for selected active player
  
  // Stance
  stance: typeof STANCE.ATTACK | typeof STANCE.DEFENSE;
  stanceLevel: number;
  
  // Abilities & Planning
  plannedAbilities: any[];
  selectedAbilityId: string | null;
  
  // Parry & QTE
  enemyTargetId: string | null;
  qteTargets: any[];
  qteStats: { hits: number; misses: number; perfects: number };
  focusMode: boolean;
  burstCharged: boolean;
  comboMultiplier: number;
  parryWindowActive: boolean;
  parryPreDelay: number;
  currentPattern: string;
  
  // Logs & Tracking
  logs: string[];
  chainCount: number;
  
  // Combat FX Tracker
  lastDamageEvent: DamageEvent | null;
  sequenceFeedback: 'PERFECT' | 'COMPLETE' | 'FAILED' | null;
  successFlash: boolean;
  failFlash: boolean;
  lastSkillAnimationConfig: any | null;
  assetsLoaded: boolean;
  preloadedSpriteUrls: string[];

  // Active damage numbers for staggered cascade
  activeDamageNumbers: Array<{
    id: string;
    value: number;
    isCrit: boolean;
    targetId: string;
    xOffset: number;
    yOffset: number;
  }>;
}

export interface BattleActions {
  setBattleState: (partial: Partial<BattleState> | ((state: BattleState) => Partial<BattleState>)) => void;
  // Initialization
  initBattle: (party: any[], enemy: any, turnQueue: string[]) => void;
  
  // Actions
  setPhase: (phase: string) => void;
  setStance: (stance: typeof STANCE.ATTACK | typeof STANCE.DEFENSE) => void;
  advanceQueue: () => void;
  setActiveIndex: (index: number) => void;
  
  // Planning
  setSelectedAbilityId: (id: string | null) => void;
  addPlannedAbility: (ability: any) => void;
  removeLastPlannedAbility: () => void;
  clearPlannedAbilities: () => void;
  
  // Combat state update
  updateEntityHp: (id: string, newHp: number) => void;
  addLog: (log: string) => void;
  setChainCount: (count: number) => void;
  
  // QTE
  setQteTargets: (targets: any[]) => void;
  updateQteTarget: (id: string, updates: any) => void;
  incrementQteStat: (type: 'hits' | 'misses' | 'perfects') => void;
  setComboMultiplier: (mult: number) => void;
  
  // Damage Events
  applyDamageEvent: (event: DamageEvent) => void;
  addDamageNumber: (value: number, isCrit: boolean, targetId: string) => void;
  removeDamageNumber: (id: string) => void;
  setSequenceFeedback: (feedback: 'PERFECT' | 'COMPLETE' | 'FAILED' | null) => void;
}

export const useBattlePhase = () => useBattleStore((s) => s.currentPhase);
export const useBattleParty = () => useBattleStore((s) => s.party);
export const useBattleEnemy = () => useBattleStore((s) => s.enemy);
export const useBattleTurnQueue = () => useBattleStore(useShallow((s) => ({ turnQueue: s.turnQueue, queueIndex: s.queueIndex })));
export const useBattleStance = () => useBattleStore(useShallow((s) => ({ stance: s.stance, stanceLevel: s.stanceLevel })));
export const useBattlePlanning = () => useBattleStore(useShallow((s) => ({ plannedAbilities: s.plannedAbilities, selectedAbilityId: s.selectedAbilityId })));
export const useBattleQte = () => useBattleStore(useShallow((s) => ({
  qteTargets: s.qteTargets,
  qteStats: s.qteStats,
  focusMode: s.focusMode,
  burstCharged: s.burstCharged,
  comboMultiplier: s.comboMultiplier,
  parryWindowActive: s.parryWindowActive,
  parryPreDelay: s.parryPreDelay,
  currentPattern: s.currentPattern,
})));
export const useBattleLogs = () => useBattleStore(useShallow((s) => ({ logs: s.logs, chainCount: s.chainCount })));
export const useBattleFx = () => useBattleStore(useShallow((s) => ({
  lastDamageEvent: s.lastDamageEvent,
  sequenceFeedback: s.sequenceFeedback,
  successFlash: s.successFlash,
  failFlash: s.failFlash,
  lastSkillAnimationConfig: s.lastSkillAnimationConfig,
})));
export const useBattleAssets = () => useBattleStore(useShallow((s) => ({ assetsLoaded: s.assetsLoaded, preloadedSpriteUrls: s.preloadedSpriteUrls })));
export const useBattleDamageNumbers = () => useBattleStore((s) => s.activeDamageNumbers);
export const useBattleActions = () => useBattleStore(useShallow((s) => ({
  setBattleState: s.setBattleState,
  initBattle: s.initBattle,
  setPhase: s.setPhase,
  setStance: s.setStance,
  advanceQueue: s.advanceQueue,
  setActiveIndex: s.setActiveIndex,
  setSelectedAbilityId: s.setSelectedAbilityId,
  addPlannedAbility: s.addPlannedAbility,
  removeLastPlannedAbility: s.removeLastPlannedAbility,
  clearPlannedAbilities: s.clearPlannedAbilities,
  updateEntityHp: s.updateEntityHp,
  addLog: s.addLog,
  setChainCount: s.setChainCount,
  setQteTargets: s.setQteTargets,
  updateQteTarget: s.updateQteTarget,
  incrementQteStat: s.incrementQteStat,
  setComboMultiplier: s.setComboMultiplier,
  applyDamageEvent: s.applyDamageEvent,
  addDamageNumber: s.addDamageNumber,
  removeDamageNumber: s.removeDamageNumber,
  setSequenceFeedback: s.setSequenceFeedback,
})));

export const useBattleStore = create<BattleState & BattleActions>((set, get) => ({
  party: [],
  enemy: null,
  currentPhase: PHASE.ACTIVE,
  turnQueue: [],
  queueIndex: 0,
  activeIndex: 0,
  stance: STANCE.ATTACK,
  stanceLevel: 1.0,
  plannedAbilities: [],
  selectedAbilityId: null,
  enemyTargetId: null,
  qteTargets: [],
  qteStats: { hits: 0, misses: 0, perfects: 0 },
  focusMode: false,
  burstCharged: false,
  comboMultiplier: 1.0,
  parryWindowActive: false,
  parryPreDelay: 0,
  currentPattern: 'NORMAL',
  logs: [],
  chainCount: 0,
  lastDamageEvent: null,
  sequenceFeedback: null,
  successFlash: false,
  failFlash: false,
  lastSkillAnimationConfig: null,
  assetsLoaded: false,
  preloadedSpriteUrls: [],
  activeDamageNumbers: [],

  setBattleState: (partial: Partial<BattleState> | ((state: BattleState) => Partial<BattleState>)) => set(partial as any),

  initBattle: (party, enemy, turnQueue) => set({
    party,
    enemy,
    turnQueue,
    queueIndex: 0,
    currentPhase: PHASE.ACTIVE,
    logs: ['BATTLE START'],
    plannedAbilities: [],
    chainCount: 0,
    selectedAbilityId: null,
    qteStats: { hits: 0, misses: 0, perfects: 0 },
    comboMultiplier: 1.0,
    activeDamageNumbers: []
  }),

  setPhase: (phase) => set({ currentPhase: phase }),
  
  setStance: (stance) => set({ stance }),
  
  advanceQueue: () => set((state) => ({ 
    queueIndex: (state.queueIndex + 1) % state.turnQueue.length 
  })),

  setActiveIndex: (index) => set({ activeIndex: index }),

  setSelectedAbilityId: (id) => set({ selectedAbilityId: id }),
  
  addPlannedAbility: (ability) => set((state) => ({
    plannedAbilities: [...state.plannedAbilities, ability]
  })),
  
  removeLastPlannedAbility: () => set((state) => ({
    plannedAbilities: state.plannedAbilities.slice(0, -1)
  })),
  
  clearPlannedAbilities: () => set({ plannedAbilities: [] }),

  updateEntityHp: (id, newHp) => set((state) => {
    if (state.enemy?.id === id || id === 'ENEMY') {
      return { enemy: { ...state.enemy, hp: Math.max(0, Math.min(newHp, state.enemy.maxHP)) } };
    }
    const newParty = state.party.map(p => {
      if (p.id === id) {
        return { ...p, hp: Math.max(0, Math.min(newHp, p.maxHP)) };
      }
      return p;
    });
    return { party: newParty };
  }),

  addLog: (log) => set((state) => ({
    logs: [log, ...state.logs].slice(0, 50)
  })),

  setChainCount: (count) => set({ chainCount: count }),

  setQteTargets: (targets) => set({ qteTargets: targets }),
  
  updateQteTarget: (id, updates) => set((state) => ({
    qteTargets: state.qteTargets.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  incrementQteStat: (type) => set((state) => ({
    qteStats: { ...state.qteStats, [type]: state.qteStats[type] + 1 }
  })),

  setComboMultiplier: (mult) => set({ comboMultiplier: mult }),

  applyDamageEvent: (event) => set({ lastDamageEvent: event }),

  addDamageNumber: (value, isCrit, targetId) => set((state) => ({
    activeDamageNumbers: [...state.activeDamageNumbers, {
      id: Math.random().toString(36).substring(2, 9),
      value,
      isCrit,
      targetId,
      // Randomize initial starting position slightly for cascade overlap
      xOffset: (Math.random() * 40) - 20, 
      yOffset: (Math.random() * 40) - 20
    }]
  })),

  removeDamageNumber: (id) => set((state) => ({
    activeDamageNumbers: state.activeDamageNumbers.filter(d => d.id !== id)
  })),

  setSequenceFeedback: (feedback) => set({ sequenceFeedback: feedback }),
}));
