export const ITEM_CATEGORIES = [
  'cosmetic',
  'consumable',
  'crafting_material',
  'quest',
  'misc',
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

const LEGACY_SET = new Set<string>(ITEM_CATEGORIES)

export function effectiveItemCategory(item: {
  item_category?: string | null
  slot?: string | null
} | null | undefined): ItemCategory {
  if (!item) return 'cosmetic'
  const raw = item.item_category
  if (raw && LEGACY_SET.has(raw)) return raw as ItemCategory
  const slot = (item.slot || '').toLowerCase()
  if (slot === 'consumable') return 'consumable'
  if (slot === 'misc' || slot === 'other') return 'misc'
  return 'cosmetic'
}
