/**
 * Resolves `claim_loot('battle', sourceId, ...)` source id from encounter enemy data.
 * Tiers scale loot pools: weak mobs → battle_tier_1, bosses → battle_tier_5.
 */
export function getBattleLootSourceId(enemy: any, isBoss: boolean): string {
  if (isBoss) return "battle_tier_5";

  const meta = enemy?.metadata ?? {};
  const raw = meta.loot_tier ?? meta.lootTier;
  if (raw != null) {
    const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    if (n >= 1 && n <= 5) return `battle_tier_${n}`;
    const s = String(raw).toLowerCase();
    if (s === "scout" || s === "t1") return "battle_tier_1";
    if (s === "veteran" || s === "t2") return "battle_tier_2";
    if (s === "hunter" || s === "t3") return "battle_tier_3";
    if (s === "elite" || s === "t4") return "battle_tier_4";
    if (s === "boss" || s === "t5") return "battle_tier_5";
  }

  const lr = meta.level_range ?? meta.levelRange;
  const maxLv = Number(lr?.max ?? lr?.min ?? 0);
  if (maxLv > 0) {
    if (maxLv <= 5) return "battle_tier_1";
    if (maxLv <= 12) return "battle_tier_2";
    if (maxLv <= 25) return "battle_tier_3";
    if (maxLv <= 45) return "battle_tier_4";
    return "battle_tier_5";
  }

  const hp = Number(
    enemy?.maxHP ?? enemy?.maxHp ?? meta.hp_base ?? meta.hpBase ?? 0,
  );
  if (hp > 0) {
    if (hp < 450) return "battle_tier_1";
    if (hp < 1100) return "battle_tier_2";
    if (hp < 2800) return "battle_tier_3";
    if (hp < 7500) return "battle_tier_4";
    return "battle_tier_5";
  }

  return "battle_tier_3";
}
