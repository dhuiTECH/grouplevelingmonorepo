import type { ShopItem, UserCosmetic } from '@/types/user';

export type InventoryFilter =
  | 'all'
  | 'equipped'
  | 'weapons'
  | 'armor'
  | 'accessories'
  | 'magics'
  | 'pets'
  | 'other';

export interface SelectedInventoryItem {
  item: ShopItem;
  cosmeticItem: UserCosmetic;
}
