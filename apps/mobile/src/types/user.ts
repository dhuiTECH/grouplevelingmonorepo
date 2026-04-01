import React from 'react';
import { ImageSourcePropType } from 'react-native';

export interface ShopItem {
  id: string;
  name: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'monarch';
  slot: 'weapon' | 'body' | 'back' | 'hands' | 'feet' | 'magic effects' | 'eyes' | 'head' | 'face' | 'accessory' | 'jewelry' | 'charms' | 'scarves' | 'earrings' | 'background' | 'avatar' | 'fullbody' | 'skin' | 'character' | string; // Added string for flexibility
  is_animated?: boolean;
  animation_config?: string | {
    frameWidth: number;
    frameHeight: number;
    totalFrames?: number;
    fps?: number;
  };
  offset_x?: number;
  offset_y?: number;
  offset_x_female?: number;
  offset_y_female?: number;
  z_index?: number;
  scale?: string; // Stored as string, but parsed as float
  scale_female?: number;
  rotation?: number;
  rotation_female?: number;
  grip_type?: string;
  /** Sword | Spear | Bow — battle attack motion; omit/null = grip_type only */
  weapon_type?: string | null;
  hand_grip_type?: string;
  bonuses?: { type: string; value: number }[];
  bonus_type?: string;
  bonus_value?: number;
  min_level?: number;
  class_req?: string; // e.g., 'All', 'Warrior', 'Mage'
  gender?: string | string[]; // e.g., 'unisex', 'male', 'female', ['male', 'female']
  no_restrictions?: boolean;
  is_stackable?: boolean;
  item_effects?: { type: string; value: number } | { type: string; value: number }[];
  collection_id?: string;
  is_global?: boolean;
  is_sellable?: boolean;
  onboarding_available?: boolean;
  image_base_url?: string;
  skin_tint_hex?: string;
  created_at?: string;
  hand_grip_z_index_override?: number;
  eraser_mask_url?: string;
  eraser_mask_url_female?: string;
  eraser_mask_targets?: string | string[];
}

export interface UserCosmetic {
  id: string;
  user_id: string;
  shop_item_id: string;
  equipped: boolean;
  quantity?: number;
  created_at: string; // ISO date string
  shop_items: ShopItem; // The actual shop item details
}

export interface User {
  id: string;
  name: string;
  hunter_name?: string;
  email: string;
  profilePicture?: any; 
  bio?: string;
  level: number;
  exp: number;
  current_hp?: number;
  max_hp?: number;
  current_mp?: number;
  max_mp?: number;
  current_ap?: number;
  max_ap?: number;
  manual_daily_completions?: number;
  manual_weekly_streak?: number;
  last_reset?: string;
  submittedIds: string[];
  slotsUsed: number;
  createdAt: Date;
  updatedAt: Date;
  cosmetics?: UserCosmetic[];
  base_body_url?: string;
  base_body_silhouette_url?: string;
  base_body_tint_hex?: string;
  hair_tint_hex?: string;
  avatar_url?: string;
  coins?: number;
  gems?: number;
  is_private?: boolean; 
  current_class?: string;
  onboarding_completed?: boolean;
  /** basics | avatar | class | done — only while onboarding; use DB as source of truth */
  onboarding_step?: 'basics' | 'avatar' | 'class' | 'done';
  tutorial_completed?: boolean;
  gender?: string;
  hunter_rank?: string;
  world_x?: number;
  world_y?: number;
  steps_banked?: number;
  last_sync_time?: string;
  referral_code?: string;
  referral_used?: string;
  str_stat?: number;
  spd_stat?: number;
  end_stat?: number;
  int_stat?: number;
  lck_stat?: number;
  per_stat?: number;
  wil_stat?: number;
  showcase_score?: number;
  skill_loadout?: string[]; // Array of skill IDs
  rank_tier?: number;
  next_advancement_attempt?: string | null; // ISO date string
  current_title?: string;
  unassigned_stat_points?: number;
  current_party_id?: string | null; // For co-op party tracking
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, password: string) => Promise<void>;
  logout: () => void;
  // Add any other authentication-related functions here
}

export interface NavigationProps {
  navigation: any; // Replace 'any' with a more specific type from React Navigation if possible
  route: any; // Replace 'any' with a more specific type from React Navigation if possible
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  image?: ImageSourcePropType;
  likes: number;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppState {
  isOnline: boolean;
  isDarkMode: boolean;
  notificationCount: number;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  image?: ImageSourcePropType;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
}