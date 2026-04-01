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

/** Solo Leveling–style “hunter system” HUD (dark glass + neon accents) */
export const HUD = {
  panelBg: 'rgba(3, 7, 18, 0.92)',
  panelBorder: 'rgba(34, 211, 238, 0.4)',
  systemLabel: '#64748b',
  hunterCyan: '#22d3ee',
  hunterCyanDim: 'rgba(34, 211, 238, 0.85)',
  enemyCrimson: '#f87171',
  enemyBorder: 'rgba(248, 113, 113, 0.45)',
  petViolet: '#c4b5fd',
  petBorder: 'rgba(167, 139, 250, 0.45)',
  comboInner: '#e0f2fe',
  comboGlow: '#67e8f9',
} as const;

/** Slots shown in battle inventory modal: consumables, other/misc, and capture tools (used during battle to catch pets). */
export const BATTLE_INVENTORY_SLOTS = ['consumable', 'other', 'misc'] as const;

export const BATTLE_TAP_TO_CONFIRM_KEY = 'battle_tap_to_confirm';

/** Party avatar rushes toward enemy; skill VFX / weapon swing start after this (melee + impact only). */
export const MELEE_IMPACT_ENTRY_DELAY_MS = 240;
