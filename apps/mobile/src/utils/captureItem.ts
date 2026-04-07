import type { User, UserCosmetic } from '@/types/user';
import type { ShopItem } from '@/types/user';

/**
 * Supabase item_effects schema for capture tools (e.g. Basic Capture Net).
 * More capture items can be added with different capture_bonus values.
 */
export interface CaptureToolEffect {
  type: 'capture_tool';
  capture_bonus: number;
  is_consumable: boolean;
}

export const CAPTURE_TOOL_TYPE = 'capture_tool';

function parseItemEffects(item: ShopItem | undefined): CaptureToolEffect | null {
  const effects = item?.item_effects;
  if (!effects) return null;
  const raw = Array.isArray(effects) ? effects.find((e: { type?: string }) => e?.type === CAPTURE_TOOL_TYPE) : effects;
  if (!raw || (raw as { type?: string }).type !== CAPTURE_TOOL_TYPE) return null;
  const e = raw as Record<string, unknown>;
  return {
    type: CAPTURE_TOOL_TYPE,
    capture_bonus: typeof e.capture_bonus === 'number' ? e.capture_bonus : 0,
    is_consumable: e.is_consumable === true,
  };
}

/** Returns the capture_tool effect from Supabase item_effects if present (for future capture_bonus use). */
export function getCaptureToolEffect(shopItem: ShopItem | undefined): CaptureToolEffect | null {
  return parseItemEffects(shopItem);
}

/** Returns true if this shop item is a capture tool (item_effects.type === 'capture_tool' in Supabase). */
export function isCaptureItem(shopItem: ShopItem | undefined): boolean {
  return getCaptureToolEffect(shopItem) !== null;
}

/** Returns the number of capture items the user has (sum of quantities). */
export function getCaptureItemCount(user: User | null): number {
  if (!user?.cosmetics?.length) return 0;
  return user.cosmetics.reduce((sum, c) => {
    if (!isCaptureItem(c.shop_items)) return sum;
    const q = c.quantity ?? 1;
    return sum + q;
  }, 0);
}

/** Finds one user cosmetic that is a capture item (for consuming). */
export function findOneCaptureCosmetic(user: User | null): UserCosmetic | null {
  if (!user?.cosmetics?.length) return null;
  return user.cosmetics.find(c => isCaptureItem(c.shop_items)) ?? null;
}

/**
 * Capture chance: lower enemy HP ⇒ higher chance. Uses metadata.base_catch_rate (0–1) if set,
 * plus item capture_bonus from item_effects (treated as fraction if ≤1, else /100).
 */
export function computeCaptureChance(
  enemyHp: number,
  enemyMaxHp: number,
  enemyMetadata: Record<string, unknown> | null | undefined,
  captureBonusRaw: number,
): number {
  const maxHp = Math.max(1, enemyMaxHp);
  const hp = Math.max(0, Math.min(enemyHp, maxHp));
  const hpRatio = hp / maxHp;
  const hpCurve = (1 - hpRatio) * 0.62;
  const baseRaw = enemyMetadata?.base_catch_rate;
  const base =
    typeof baseRaw === "number" && Number.isFinite(baseRaw) ? Math.max(0, baseRaw) : 0.06;
  const bonus = captureBonusRaw > 1 ? captureBonusRaw / 100 : Math.max(0, captureBonusRaw);
  return Math.min(0.95, Math.max(0.03, base + hpCurve + bonus));
}

export function rollCaptureSuccess(
  enemyHp: number,
  enemyMaxHp: number,
  enemyMetadata: Record<string, unknown> | null | undefined,
  captureBonusRaw: number,
): boolean {
  return Math.random() < computeCaptureChance(enemyHp, enemyMaxHp, enemyMetadata, captureBonusRaw);
}
