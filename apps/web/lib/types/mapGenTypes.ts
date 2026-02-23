export interface ReferenceImage {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 string
  category: string;
}

export interface GeneratedAsset {
  id: string;
  category: string;
  imageUrl: string; // Data URL
  prompt: string;
  createdAt: number;
  resolution: string;
  type: AssetType;
}

export type Resolution = '512' | '1K' | '2K' | '4K';
export type StyleStrength = 'Exact match' | 'Slight variation' | 'Wild new style';
export type AssetType = 'static' | 'spritesheet';
export type AnimationAction = 'Idle' | 'Walk' | 'Run' | 'Attack' | 'Jump' | 'Death';
export type SkillType = 'Projectile' | 'Melee Slash' | 'Impact/Hit' | 'Area of Effect' | 'Buff/Aura' | 'Beam' | 'Explosion';
export type ModelType = 'gemini-3-pro-image-preview' | 'gemini-2.5-flash-image';
export type BaseBodyType = 'none' | 'male' | 'female';

export interface GenerationConfig {
  category: string;
  prompt: string;
  styleStrength: StyleStrength;
  resolution: Resolution;
  assetType: AssetType;
  frames?: number;
  animationAction?: AnimationAction;
  skillType?: SkillType;
  model?: ModelType;
  baseBodyType?: BaseBodyType;
}

export const CATEGORIES = [
  'Avatars', 'Base Body', 'Eyes', 'Mouth', 'Hair', 'Face', 'Body', 'Background',
  'Head', 'Back', 'Feet', 'Weapons', 'Accessories', 'Other', 'Skills FX',
  'Skill Icons', 'Mobs', 'Pets', 'NPCs'
];
