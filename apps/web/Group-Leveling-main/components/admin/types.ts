export interface PendingUser {
  id: string;
  hunter_name: string;
  name?: string; // Keep for compatibility
  email: string;
  avatar: string;
  strava_id?: number;
  created_at: string;
}

export interface Dungeon {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  requirement: string;
  xp_reward: number;
  coin_reward: number;
  loot_table: string | null;
  status: string;
  boss: string;
  image_url?: string;
  scheduled_start?: string | null;
  auto_start?: boolean;
  created_at: string;
  world_x?: number;
  world_y?: number;
  icon_url?: string;
  target_distance_meters?: number;
  tier?: string;
  description?: string;
}

export interface PendingReward {
  id: string;
  hunter_id: string;
  dungeon_id: string;
  status: string;
  registered_at: string;
  profiles: {
    hunter_name: string;
    avatar: string;
  } | {
    hunter_name: string;
    avatar: string;
  }[];
  dungeons: {
    name: string;
    xp_reward: number;
    coin_reward: number;
  } | {
    name: string;
    xp_reward: number;
    coin_reward: number;
  }[];
}
