/** Battle UI theme and constants */

export const COLORS = {
  primary: '#06b6d4',
  background: '#0f172a',
  backgroundDark: '#020617',
  accent: '#f97316',
  neonCyan: '#22d3ee',
  neonOrange: '#fb923c',
  neonYellow: '#facc15',
  neonGreen: '#4ade80',
  text: '#FFFFFF',
} as const;

/** Slots shown in battle inventory modal: consumables, other/misc, and capture tools (used during battle to catch pets). */
export const BATTLE_INVENTORY_SLOTS = ['consumable', 'other', 'misc'] as const;

export const BATTLE_TAP_TO_CONFIRM_KEY = 'battle_tap_to_confirm';
