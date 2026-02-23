import { supabase } from '@/lib/supabase';

export const api = {
  // --- Training Protocol CRUD ---

  getTrainingProtocol: async (hunterId: string, day?: string) => {
    try {
      if (!hunterId) throw new Error('Missing hunter_id');

      let query = supabase
        .from('training_protocol')
        .select('*')
        .eq('hunter_id', hunterId);
      
      if (day) {
        query = query.eq('day_of_week', day);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Training API error:', error.message);
      return { success: false, error: error.message };
    }
  },

  createTrainingProtocol: async (protocolData: any) => {
    try {
      if (!protocolData.hunter_id) throw new Error('Missing hunter_id');

      const { data, error } = await supabase
        .from('training_protocol')
        .insert([protocolData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error inserting training protocol:', error.message);
      return { success: false, error: error.message };
    }
  },

  updateTrainingProtocol: async (id: string, updates: any) => {
    try {
      if (!id) throw new Error('Missing id');

      // Prevent updating id
      const { id: _, ...updateData } = updates;

      const { data, error } = await supabase
        .from('training_protocol')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating training protocol:', error.message);
      return { success: false, error: error.message };
    }
  },

  deleteTrainingProtocol: async (id: string) => {
    try {
      if (!id) throw new Error('Missing id');

      const { error } = await supabase
        .from('training_protocol')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting training protocol:', error.message);
      return { success: false, error: error.message };
    }
  },

  // --- Claims & Rewards ---

  claimTrainingReward: async (
    userId: string,
    pathName: string,
    xp: number,
    coins: number,
    gems: number,
    isQuestCompletion: boolean
  ) => {
    try {
      if (!userId) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // 1. Check if this path was already rewarded today
      const { data: existingReward, error: checkError } = await supabase
        .from('activities')
        .select('id')
        .eq('hunter_id', userId)
        .eq('name', 'Training Reward')
        .eq('type', pathName)
        .gte('created_at', today)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingReward) {
        throw new Error('Reward already claimed for this path today');
      }

      // 2. Check daily path limit (max 2 paths)
      const { count: pathsToday, error: countError } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('hunter_id', userId)
        .eq('name', 'Training Reward')
        .gte('created_at', today);

      if (countError) throw countError;
      if ((pathsToday || 0) >= 2) {
        throw new Error('Daily reward limit reached (max 2 paths)');
      }

      // 3. Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('exp, coins, gems, daily_completions')
        .eq('id', userId)
        .single();

      if (profileError || !profile) throw new Error('Profile not found');

      // 4. Update Profile
      const newExp = (Number(profile.exp) || 0) + xp;
      const newCoins = (Number(profile.coins) || 0) + coins;
      const newGems = (Number(profile.gems) || 0) + (gems || 0);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          exp: newExp,
          coins: newCoins,
          gems: newGems,
          daily_completions: isQuestCompletion ? 1 : (profile.daily_completions || 0)
        })
        .eq('id', userId);

      if (updateError) throw new Error('Failed to update rewards');

      // 5. Record the reward in activities table
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          hunter_id: userId,
          name: 'Training Reward',
          type: pathName,
          xp_earned: xp,
          coins_earned: coins,
          claimed: true
        });

      if (activityError) {
        console.error('Failed to record activity:', activityError);
        // We don't throw here because profile was already updated
      }

      return { 
        success: true, 
        newExp, 
        newCoins,
        newGems
      };

    } catch (error: any) {
      console.error('Training claim error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // --- Reset Logic ---

  resetWeeklyTraining: async (userId: string, rating?: number) => {
    try {
      if (!userId) throw new Error('User ID required');

      // 1. Reset all training protocol items to not completed
      const { error: resetError } = await supabase
        .from('training_protocol')
        .update({ is_completed: false })
        .eq('hunter_id', userId);

      if (resetError) throw resetError;

      // 2. Delete all nutrition logs for the week
      const { error: nutritionError } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('hunter_id', userId);

      if (nutritionError) throw nutritionError;

      // 3. Update last_reset timestamp in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          last_reset: new Date().toISOString() 
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      return { success: true };
    } catch (error: any) {
      console.error('Weekly reset failed:', error.message);
      return { success: false, error: error.message };
    }
  }
};
