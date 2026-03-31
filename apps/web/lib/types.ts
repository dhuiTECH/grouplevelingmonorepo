export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];

export const RANK_COLORS: Record<string, string> = {
  E: 'text-gray-400 border-gray-400',
  D: 'text-green-400 border-green-400',
  C: 'text-blue-400 border-blue-400',
  B: 'text-purple-400 border-purple-400',
  A: 'text-orange-400 border-orange-400',
  S: 'text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
};

export interface Activity {
  id: string;
  date: string;
  type: string;
  distance: number;
  pace: string;
  elevation: number;
  xp: number;
  coins: number;
}

export interface Dungeon {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  requirement: string;
  xpReward: number;
  coinReward: number;
  loot: string;
  status: string;
  boss: string;
  scheduled_start?: string;
  auto_start?: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  slot: string;
  bonus: string;
  rarity: string;
  icon: string;
  price: number;
  grip_type?: string | null;
  /** Sword | Spear | Bow — battle attack motion; null uses grip_type only */
  weapon_type?: string | null;
  offset_x?: number;
  offset_y?: number;
  z_index?: number;
  scale?: number;
  rotation?: number;
  offset_x_female?: number | null;
  offset_y_female?: number | null;
  scale_female?: number | null;
  rotation_female?: number | null;
  hand_grip_z_index_override?: number | null;
  eraser_mask_url?: string | null;
  eraser_mask_url_female?: string | null;
  eraser_mask_targets?: string[] | null;
}

export interface Skin {
  id: string;
  name: string;
  price: number;
  style: string;
  effect: string;
  backgroundImage?: string;
}

export interface User {
  id: string;
  name?: string; // For UI display
  hunter_name?: string; // From database
  /** From auth session when available (e.g. linked providers) */
  email?: string;
  avatar_url?: string;
  exp: number;
  coins: number;
  gems: number;
  level: number;
  skill_points: number;
  rank: string;
  slotsUsed: number;
  inventory: any[];
  cosmetics: any[];
  equipped: Record<string, string | null>;
  submittedIds: string[];
  completedDungeons: string[];
  stravaConnected?: boolean;
  gender?: string;
  status?: string;
  is_admin?: boolean;
  is_private?: boolean;
  association_id?: string;
  current_class?: string;
  rank_tier?: number;
  current_title?: string;
  next_advancement_attempt?: string | null;
  base_body_url?: string;
  base_body_silhouette_url?: string | null;
  base_body_tint_hex?: string | null;
  hair_tint_hex?: string | null;
  str_stat?: number;
  spd_stat?: number;
  end_stat?: number;
  int_stat?: number;
  lck_stat?: number;
  per_stat?: number;
  wil_stat?: number;
  current_hp?: number;
  max_hp?: number;
  current_mp?: number;
  max_mp?: number;
  unassigned_stat_points?: number;
  daily_completions?: number;
  daily_steps?: number;
  last_steps_reset_at?: string;
  weekly_streak_count?: number;
  grand_chest_available?: boolean;
  last_submission_date?: string;
  referral_code?: string;
  referral_used?: string;
  active_skin?: string;
  last_reset?: string;
  last_nutrition_reward_at?: string;
  manual_daily_completions?: number;
  manual_weekly_streak?: number;
  world_x?: number;
  world_y?: number;
  steps_banked?: number;
  user_skills?: any[]; // For passive skill calculations
}
