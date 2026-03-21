import type { UserCosmetic } from '@/types/user';

/** Match `shop_items.name` (case-insensitive, trimmed) against these in order. */
export const FEMALE_DEFAULT_BODY_SHIRT_NAMES = [
  'White T-Shirt (F)',
  'White t-shirt (FEMALE)',
  'White T-Shirt (FEMALE)',
  'White T-Shirt (Female)',
  'White t-shirt (female)',
];

const normalizedAliases = FEMALE_DEFAULT_BODY_SHIRT_NAMES.map((n) => n.trim().toLowerCase());

export function isFemaleDefaultBodyShirtName(name: string | undefined | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const n = name.trim().toLowerCase();
  return normalizedAliases.includes(n);
}

/** First owned cosmetic in `body` slot whose shop name matches the default female shirt aliases. */
export function findFemaleDefaultBodyCosmetic(
  cosmetics: UserCosmetic[] | undefined | null
): UserCosmetic | undefined {
  if (!cosmetics?.length) return undefined;
  for (const c of cosmetics) {
    const slot = c.shop_items?.slot?.trim().toLowerCase();
    if (slot !== 'body') continue;
    if (isFemaleDefaultBodyShirtName(c.shop_items?.name)) return c;
  }
  return undefined;
}

/** Index in a filtered shop-items list (e.g. AvatarScreen body options for current gender). */
export function findFemaleDefaultBodyShopItemIndex(
  items: Array<{ name?: string | null }>
): number {
  const idx = items.findIndex((it) => isFemaleDefaultBodyShirtName(it?.name ?? undefined));
  return idx;
}
