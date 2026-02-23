import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { calculateLevel, getRank } from '@/utils/stats';

export const api = {
  // Get a single user by ID
  getUserById: async (id: string): Promise<User | null> => {
    try {
      // 1. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // 2. Fetch User Cosmetics
      const { data: cosmetics, error: cosmeticsError } = await supabase
        .from('user_cosmetics')
        .select(`
          id,
          equipped,
          created_at,
          shop_item_id,
          shop_items (
            id,
            name,
            description,
            image_url,
            slot,
            rarity,
            is_animated,
            animation_config,
            bonuses,
            scale,
            offset_x,
            offset_y,
            z_index
          )
        `)
        .eq('hunter_id', id);

      if (cosmeticsError) {
        console.error('Error fetching cosmetics:', cosmeticsError);
      }

      // 3. Fetch Claimed Activities Count (optional but good for consistency)
      const { count: claimedActivities } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('hunter_id', id)
        .eq('claimed', true);

      // Calculate derived values
      const level = profile.level || calculateLevel(Number(profile.exp || 0));
      const rank = profile.hunter_rank || getRank(level);

      // Map to User interface
      const user: User = {
        id: profile.id,
        name: profile.hunter_name || 'Unknown Hunter',
        email: profile.email || '',
        level,
        exp: Number(profile.exp || 0),
        current_hp: profile.current_hp,
        max_hp: profile.max_hp,
        current_mp: profile.current_mp,
        max_mp: profile.max_mp,
        coins: Number(profile.coins || 0),
        gems: Number(profile.gems || 0),
        hunter_rank: rank,
        current_class: profile.current_class,
        gender: profile.gender,
        onboarding_completed: profile.onboarding_completed,
        base_body_url: profile.base_body_url,
        base_body_silhouette_url: profile.base_body_silhouette_url,
        base_body_tint_hex: profile.base_body_tint_hex,
        avatar_url: profile.avatar,
        is_private: profile.is_private,
        manual_daily_completions: profile.manual_daily_completions,
        manual_weekly_streak: profile.manual_weekly_streak,
        slotsUsed: profile.weekly_slots_used || 0,
        submittedIds: [], // Placeholder, fetch if needed
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at || profile.created_at),
        cosmetics: cosmetics as any || [], // Cast to avoid deep type matching issues for now
        // stats
        str_stat: profile.str_stat,
        spd_stat: profile.spd_stat,
        end_stat: profile.end_stat,
        int_stat: profile.int_stat,
        lck_stat: profile.lck_stat,
        per_stat: profile.per_stat,
        wil_stat: profile.wil_stat,
        unassigned_stat_points: profile.unassigned_stat_points,
        last_reset: profile.last_reset,
      } as unknown as User; // extended casting due to some mismatched optional fields

      return user;
    } catch (error: any) {
      console.error(`Error in getUserById for ${id}:`, error.message);
      throw error;
    }
  },

  // Update an existing user
  updateUser: async (id: string, updates: Partial<User>) => {
    try {
      // Map frontend User fields back to DB profile fields if names differ
      // For now, most match, but be careful with 'name' -> 'hunter_name'
      const dbUpdates: any = {
        updated_at: new Date().toISOString(),
        ...updates
      };

      if (updates.name) {
        dbUpdates.hunter_name = updates.name;
        delete dbUpdates.name;
      }
      
      // Remove fields that shouldn't be updated directly or don't exist on profile
      delete dbUpdates.cosmetics;
      delete dbUpdates.createdAt;
      delete dbUpdates.updatedAt;
      delete dbUpdates.submittedIds;
      delete dbUpdates.slotsUsed;
      delete dbUpdates.profilePicture; // If this is local only

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error(`Error updating user with ID ${id}:`, error.message);
      throw error;
    }
  },

  // Create user - usually handled by Auth, but keeping if needed
  createUser: async (userData: any) => {
     // This usually goes through Auth/Sign up, which creates the profile via triggers
     // But we can implement profile creation here if manual insertion is needed
     return null; 
  },

  // Delete user
  deleteUser: async (id: string) => {
    // Only admin usually
    return false;
  }
};
