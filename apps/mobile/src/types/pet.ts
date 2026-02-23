export interface PetEncounterPool {
  id: string;
  name: string;
  icon_url?: string | null;
  image_url?: string | null;
  rarity: string;
  base_stats: any;
  metadata: {
    catchable?: boolean;
    [key: string]: any;
  };
  created_at: string;
}

export interface UserPet {
  id: string;
  user_id: string;
  pet_id: string;
  nickname: string | null;
  level: number;
  experience: number;
  current_skills: string[];
  metadata: any;
  created_at: string;
  pet_details?: PetEncounterPool;
}
