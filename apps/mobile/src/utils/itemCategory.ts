import type { ShopItem } from '@/types/user';

export const ITEM_CATEGORIES = [
  'cosmetic',
  'consumable',
  'crafting_material',
  'quest',
  'misc',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const LEGACY_SET = new Set<string>(ITEM_CATEGORIES);

/**
 * Canonical category for filters, battle bag, and crafting.
 * Uses `item_category` when set; otherwise infers from legacy `slot`.
 */
export function effectiveItemCategory(item: ShopItem | null | undefined): ItemCategory {
  if (!item) return 'cosmetic';
  const raw = item.item_category;
  if (raw && LEGACY_SET.has(raw)) return raw as ItemCategory;
  const slot = (item.slot || '').toLowerCase();
  if (slot === 'consumable') return 'consumable';
  if (slot === 'misc' || slot === 'other') return 'misc';
  return 'cosmetic';
}
