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
