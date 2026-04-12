import type { ShopItem, UserCosmetic } from '@/types/user';

export type InventoryFilter =
  | 'all'
  | 'equipped'
  | 'weapons'
  | 'armor'
  | 'accessories'
  | 'magics'
  | 'pets'
  | 'consumables'
  | 'crafting'
  | 'quest_items'
  | 'misc_items';

export interface SelectedInventoryItem {
  item: ShopItem;
  cosmeticItem: UserCosmetic;
}
