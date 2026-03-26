import re
import os

with open('apps/mobile/src/hooks/useBattleLogic.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import for useBattleStore
if 'import { useBattleStore }' not in code:
    code = code.replace(
        "import { useSkills } from '@/hooks/useSkills';",
        "import { useSkills } from '@/hooks/useSkills';\nimport { useBattleStore } from '@/store/useBattleStore';"
    )

state_block = """  // Entities
  const {
    party, enemy, currentPhase, stance, stanceLevel, activeIndex, logs, chainCount,
    turnQueue, queueIndex, plannedAbilities, selectedAbilityId, enemyTargetId,
    parryPreDelay, parryWindowActive, qteTargets, qteStats, focusMode, burstCharged,
    comboMultiplier, currentPattern, successFlash, failFlash, sequenceFeedback,
    lastDamageEvent, lastSkillAnimationConfig, assetsLoaded, preloadedSpriteUrls,
    setBattleState
  } = useBattleStore();
  
  const realtimeChannelRef = useRef<any>(null);"""

code = re.sub(r'  // Entities.*?const realtimeChannelRef = useRef<any>\(null\);.*?(?=  // Animations)', state_block + '\n\n', code, flags=re.DOTALL)

# Now we need to replace all setter calls with setBattleState
replacements = [
    (r'setParty\((.*?)\);', lambda m: f'setBattleState(state => ({{ party: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.party) : ({m.group(1)}) }}));'),
    (r'setEnemy\((.*?)\);', lambda m: f'setBattleState(state => ({{ enemy: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.enemy) : ({m.group(1)}) }}));'),
    (r'setCurrentPhase\((.*?)\);', lambda m: f'setBattleState(state => ({{ currentPhase: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.currentPhase) : ({m.group(1)}) }}));'),
    (r'setStance\((.*?)\);', lambda m: f'setBattleState(state => ({{ stance: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.stance) : ({m.group(1)}) }}));'),
    (r'setStanceLevel\((.*?)\);', lambda m: f'setBattleState(state => ({{ stanceLevel: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.stanceLevel) : ({m.group(1)}) }}));'),
    (r'setActiveIndex\((.*?)\);', lambda m: f'setBattleState(state => ({{ activeIndex: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.activeIndex) : ({m.group(1)}) }}));'),
    (r'setLogs\((.*?)\);', lambda m: f'setBattleState(state => ({{ logs: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.logs) : ({m.group(1)}) }}));'),
    (r'setChainCount\((.*?)\);', lambda m: f'setBattleState(state => ({{ chainCount: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.chainCount) : ({m.group(1)}) }}));'),
    (r'setTurnQueue\((.*?)\);', lambda m: f'setBattleState(state => ({{ turnQueue: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.turnQueue) : ({m.group(1)}) }}));'),
    (r'setQueueIndex\((.*?)\);', lambda m: f'setBattleState(state => ({{ queueIndex: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.queueIndex) : ({m.group(1)}) }}));'),
    (r'setPlannedAbilities\((.*?)\);', lambda m: f'setBattleState(state => ({{ plannedAbilities: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.plannedAbilities) : ({m.group(1)}) }}));'),
    (r'setSelectedAbilityId\((.*?)\);', lambda m: f'setBattleState(state => ({{ selectedAbilityId: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.selectedAbilityId) : ({m.group(1)}) }}));'),
    (r'setEnemyTargetId\((.*?)\);', lambda m: f'setBattleState(state => ({{ enemyTargetId: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.enemyTargetId) : ({m.group(1)}) }}));'),
    (r'setParryPreDelay\((.*?)\);', lambda m: f'setBattleState(state => ({{ parryPreDelay: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.parryPreDelay) : ({m.group(1)}) }}));'),
    (r'setParryWindowActive\((.*?)\);', lambda m: f'setBattleState(state => ({{ parryWindowActive: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.parryWindowActive) : ({m.group(1)}) }}));'),
    (r'setQteTargets\((.*?)\);', lambda m: f'setBattleState(state => ({{ qteTargets: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.qteTargets) : ({m.group(1)}) }}));'),
    (r'setQteStats\((.*?)\);', lambda m: f'setBattleState(state => ({{ qteStats: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.qteStats) : ({m.group(1)}) }}));'),
    (r'setFocusMode\((.*?)\);', lambda m: f'setBattleState(state => ({{ focusMode: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.focusMode) : ({m.group(1)}) }}));'),
    (r'setBurstCharged\((.*?)\);', lambda m: f'setBattleState(state => ({{ burstCharged: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.burstCharged) : ({m.group(1)}) }}));'),
    (r'setComboMultiplier\((.*?)\);', lambda m: f'setBattleState(state => ({{ comboMultiplier: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.comboMultiplier) : ({m.group(1)}) }}));'),
    (r'setCurrentPattern\((.*?)\);', lambda m: f'setBattleState(state => ({{ currentPattern: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.currentPattern) : ({m.group(1)}) }}));'),
    (r'setSuccessFlash\((.*?)\);', lambda m: f'setBattleState(state => ({{ successFlash: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.successFlash) : ({m.group(1)}) }}));'),
    (r'setFailFlash\((.*?)\);', lambda m: f'setBattleState(state => ({{ failFlash: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.failFlash) : ({m.group(1)}) }}));'),
    (r'setSequenceFeedback\((.*?)\);', lambda m: f'setBattleState(state => ({{ sequenceFeedback: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.sequenceFeedback) : ({m.group(1)}) }}));'),
    (r'setLastDamageEvent\((.*?)\);', lambda m: f'setBattleState(state => ({{ lastDamageEvent: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.lastDamageEvent) : ({m.group(1)}) }}));'),
    (r'setLastSkillAnimationConfig\((.*?)\);', lambda m: f'setBattleState(state => ({{ lastSkillAnimationConfig: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.lastSkillAnimationConfig) : ({m.group(1)}) }}));'),
    (r'setAssetsLoaded\((.*?)\);', lambda m: f'setBattleState(state => ({{ assetsLoaded: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.assetsLoaded) : ({m.group(1)}) }}));'),
    (r'setPreloadedSpriteUrls\((.*?)\);', lambda m: f'setBattleState(state => ({{ preloadedSpriteUrls: typeof ({m.group(1)}) === "function" ? ({m.group(1)})(state.preloadedSpriteUrls) : ({m.group(1)}) }}));'),
]

for pattern, repl in replacements:
    code = re.sub(pattern, repl, code)

with open('apps/mobile/src/hooks/useBattleLogic.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")