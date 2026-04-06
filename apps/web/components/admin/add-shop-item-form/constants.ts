/** Slots that use skin tint + optional base layer silhouette */
export const SKIN_TINT_SLOTS = [
  'avatar',
  'base_body',
  'hand_grip',
  'face_eyes',
  'face_mouth',
  'hair'
] as const;

export const CREATOR_SLOTS = [
  'avatar',
  'base_body',
  'face_eyes',
  'face_mouth',
  'hair',
  'face',
  'body'
] as const;

export const DUAL_POSITION_SLOTS = [
  'weapon',
  'head',
  'eyes',
  'back',
  'hands',
  'shoulder',
  'accessory',
  'body',
  'face',
  'base_body',
  'face_eyes',
  'face_mouth',
  'hair',
  'hand_grip'
] as const;

/** Creator slots that are not sellable in public shop */
export const NON_SELLABLE_CREATOR_SLOTS = [
  'base_body',
  'face_eyes',
  'face_mouth',
  'hair'
] as const;

export const SLOT_OPTIONS: { value: string; label: string }[] = [
  { value: 'face', label: 'Face (Makeup / tattoo – sellable)' },
  { value: 'body', label: 'Body (Shirts, armor)' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'head', label: 'Head (Hats, crowns)' },
  { value: 'eyes', label: 'Eyes (Glasses, goggles – sellable)' },
  { value: 'back', label: 'Back (Backpacks, capes, flags)' },
  { value: 'shoulder', label: 'Shoulder (Pauldrons, pads, mantle)' },
  { value: 'hands', label: 'Hands (Gloves)' },
  { value: 'feet', label: 'Feet (Shoes, boots)' },
  { value: 'background', label: 'Background (Scenes)' },
  { value: 'accessory', label: 'Accessory (Jewelry, charms, scarves, earrings)' },
  { value: 'magic effects', label: 'Magic Effects (Aura)' },
  { value: 'other', label: 'Other (Consumables, Misc)' },
  { value: 'avatar', label: 'Avatar' },
  { value: 'base_body', label: 'Base Body (Creator – not in shop)' },
  { value: 'face_eyes', label: 'Face Eyes (Creator – avatar lab only)' },
  { value: 'face_mouth', label: 'Face Mouth (Creator – avatar lab only)' },
  { value: 'hair', label: 'Hair (Creator – not in shop)' },
  { value: 'hand_grip', label: 'Hand Grip (System – hidden)' }
];

export const ERASER_MASK_TARGETS: { value: string; label: string }[] = [
  { value: 'base_body', label: 'Base Body' },
  { value: 'avatar', label: 'Unique Avatars' },
  { value: 'hair', label: 'Hair' },
  { value: 'body', label: 'Shirt / Body' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'head', label: 'Head / Hat' },
  { value: 'eyes', label: 'Eyes (Gear)' },
  { value: 'face_eyes', label: 'Eyes (Base)' },
  { value: 'face_mouth', label: 'Mouth (Base)' },
  { value: 'face', label: 'Face / Makeup' },
  { value: 'back', label: 'Back' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'hands', label: 'Hands' },
  { value: 'feet', label: 'Feet' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'magic effects', label: 'Magic Effects' },
  { value: 'hand_grip', label: 'Hand Grip' }
];

export const SKIN_COLOR_SWATCHES: { hex: string; label: string }[] = [
  { hex: '#FFDBAC', label: 'Light' },
  { hex: '#F1C27D', label: 'Light warm' },
  { hex: '#E0AC69', label: 'Medium light' },
  { hex: '#C68642', label: 'Tan' },
  { hex: '#B87333', label: 'Filipino brown' },
  { hex: '#A0522D', label: 'Brown' },
  { hex: '#8D5524', label: 'Light skin Black' },
  { hex: '#5C3317', label: 'Dark brown' },
  { hex: '#3D2314', label: 'Dark skin' },
  { hex: '#2C1810', label: 'Black' }
];

export const BONUS_STAT_OPTIONS: { value: string; label: string }[] = [
  { value: 'str', label: 'Strength (STR)' },
  { value: 'spd', label: 'Speed (SPD)' },
  { value: 'end', label: 'Endurance (END)' },
  { value: 'int', label: 'Intelligence (INT)' },
  { value: 'defense', label: 'Defense' },
  { value: 'attack_damage', label: 'Attack Damage' },
  { value: 'crit_percentage', label: 'Crit Percentage (%)' },
  { value: 'crit_damage', label: 'Crit Damage (x)' },
  { value: 'xp_boost', label: 'XP Boost (%)' },
  { value: 'coin_boost', label: 'Coin Boost (%)' },
  { value: 'lck', label: 'Luck (LCK)' },
  { value: 'per', label: 'Perception (PER)' },
  { value: 'wil', label: 'Will (WIL)' }
];

export const PREVIEW_GRIP_TYPES = ['All Around', 'Caster', 'Shield', 'Wand'] as const;
