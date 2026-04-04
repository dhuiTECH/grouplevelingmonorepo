import type { ShopItem } from '@/types/user';

export const MAX_ACCESSORIES = 6;

export const CREATOR_SLOTS = ['base_body', 'face_eyes', 'face_mouth', 'hair'] as const;

/** Accessory slot keys that share the multi-accessory equip pool in the equipment modal. */
export const MULTI_ACCESSORY_SLOT_LIST = ['accessory', 'jewelry', 'charms', 'scarves', 'earrings'] as const;

export function getMultiAccessorySlotsSet(): Set<string> {
  return new Set(MULTI_ACCESSORY_SLOT_LIST);
}

export function getCosmeticSlot(item: ShopItem | undefined): string | undefined {
  return item?.slot?.trim().toLowerCase();
}

export function isCreatorSlot(slot: string | undefined): boolean {
  const s = slot?.toLowerCase();
  return CREATOR_SLOTS.includes(s as (typeof CREATOR_SLOTS)[number]);
}

export function isAvatarSlot(slot: string | undefined): boolean {
  const s = slot?.toLowerCase();
  return s === 'avatar' || s === 'fullbody' || s === 'skin' || s === 'character';
}

export function normalizeEquipmentSlot(s: string | undefined): string {
  return (s || '').trim().toLowerCase();
}

export function isGenderCompatible(
  itemGender: string | string[] | undefined,
  userGender: string | undefined
): boolean {
  if (!itemGender || itemGender === 'unisex') return true;
  if (!userGender) return true;

  if (Array.isArray(itemGender)) {
    return itemGender.includes(userGender) || itemGender.includes('unisex');
  }
  return itemGender === userGender || itemGender === 'unisex';
}

/** Returns 'male', 'female', or null for unisex / ambiguous. */
export function getItemGender(itemGender: string | string[] | undefined): string | null {
  if (!itemGender || itemGender === 'unisex') return null;
  if (Array.isArray(itemGender)) {
    if (itemGender.includes('unisex')) return null;
    if (itemGender.length === 1) return itemGender[0];
    return null;
  }
  return itemGender;
}

export function getEquipmentPickerTitle(slotKey: string): string {
  const titles: Record<string, string> = {
    weapon: 'Weapons',
    body: 'Armor',
    back: 'Back',
    hands: 'Hands',
    feet: 'Feet',
    'magic effects': 'Aura',
    eyes: 'Eyes',
    head: 'Head',
    face: 'Face',
    shoulder: 'Shoulder',
    'multi-accessory': 'Accessories',
  };
  return titles[slotKey] || slotKey;
}

/** Bonus line(s) for item detail modal — mirrors previous getFullDescription. */
export function getInventoryItemFullDescription(item: ShopItem): string {
  if (item.bonuses && Array.isArray(item.bonuses) && item.bonuses.length > 0) {
    return (
      'BONUSES: ' +
      item.bonuses
        .map((bonus: { type: string; value: number }) => {
          const typeName =
            bonus.type === 'str'
              ? 'STR'
              : bonus.type === 'spd'
                ? 'SPD'
                : bonus.type === 'end'
                  ? 'END'
                  : bonus.type === 'int'
                    ? 'INT'
                    : bonus.type === 'lck'
                      ? 'LCK'
                      : bonus.type === 'per'
                        ? 'PER'
                        : bonus.type === 'wil'
                          ? 'WIL'
                          : bonus.type === 'attack_damage'
                            ? 'ATK DMG'
                            : bonus.type === 'crit_percentage'
                              ? 'CRIT %'
                              : bonus.type === 'crit_damage'
                                ? 'CRIT DMG'
                                : bonus.type === 'intelligence'
                                  ? 'INT'
                                  : bonus.type.replace('_', ' ').toUpperCase();
          const suffix =
            bonus.type.includes('percentage') || bonus.type === 'xp_boost'
              ? '%'
              : bonus.type === 'crit_damage'
                ? 'x'
                : '';
          return `${typeName} +${bonus.value}${suffix}`;
        })
        .join(', ')
    );
  }
  if (item.bonus_type) {
    const typeName =
      item.bonus_type === 'str'
        ? 'STR'
        : item.bonus_type === 'spd'
          ? 'SPD'
          : item.bonus_type === 'end'
            ? 'END'
            : item.bonus_type === 'int'
              ? 'INT'
              : item.bonus_type === 'lck'
                ? 'LCK'
                : item.bonus_type === 'per'
                  ? 'PER'
                  : item.bonus_type === 'wil'
                    ? 'WIL'
                    : item.bonus_type === 'attack_damage'
                      ? 'ATK DMG'
                      : item.bonus_type === 'crit_percentage'
                        ? 'CRIT %'
                        : item.bonus_type === 'crit_damage'
                          ? 'CRIT DMG'
                          : item.bonus_type === 'intelligence'
                            ? 'INT'
                            : item.bonus_type.replace('_', ' ').toUpperCase();
    const suffix =
      item.bonus_type.includes('percentage') || item.bonus_type === 'xp_boost'
        ? '%'
        : item.bonus_type === 'crit_damage'
          ? 'x'
          : '';
    return `BONUS: ${typeName} +${item.bonus_value}${suffix}`;
  }
  return '';
}
