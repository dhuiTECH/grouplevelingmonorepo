import type { WeaponAttackPresetId } from '../components/LayeredAvatar/weaponGripAttackPresets';

/** Equipped weapon `shop_items` row — only weapon_type / grip_type needed. */
export function resolveWeaponAttackPreset(shopItem: {
  weapon_type?: string | null;
  grip_type?: string | null;
} | null | undefined): WeaponAttackPresetId | null {
  if (!shopItem) return null;

  const gt = shopItem.grip_type?.trim().toLowerCase() ?? '';

  // Shield / Wand / Caster use grip-only animations — not sword/spear/bow archetypes
  if (gt === 'shield') return 'shield';
  if (gt === 'wand') return 'wand';
  if (gt === 'caster') return 'caster';

  // Sword / Spear / Bow only apply to All Around (or unset grip — legacy / flexible)
  const isAllAroundOrUnset = gt === '' || gt === 'all around' || gt === 'allaround';
  if (!isAllAroundOrUnset) return null;

  const wt = shopItem.weapon_type?.trim().toLowerCase() ?? '';
  if (wt === 'sword') return 'sword';
  if (wt === 'spear' || wt === 'spears') return 'spear';
  if (wt === 'bow' || wt === 'bows') return 'bow';

  return 'allAround';
}
