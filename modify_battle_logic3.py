import re

with open('apps/mobile/src/hooks/useBattleLogic.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import for useBattleStore
if 'import { useBattleStore }' not in code:
    code = code.replace(
        "import { useSkills } from '@/hooks/useSkills';",
        "import { useSkills } from '@/hooks/useSkills';\nimport { useBattleStore } from '@/store/useBattleStore';"
    )

state_block = """  // Store Entities & State
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
  const animationConfigCacheRef = useRef<Record<string, SkillAnimationConfig>>({});"""

# Replace all the state declarations
start_marker = "  // Entities"
end_marker = "  const animationConfigCacheRef = useRef<Record<string, SkillAnimationConfig>>({});"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + state_block + code[end_idx:]

with open('apps/mobile/src/hooks/useBattleLogic.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")