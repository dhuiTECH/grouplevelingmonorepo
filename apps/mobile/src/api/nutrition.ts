import { supabase } from '@/lib/supabase';

export const api = {
  // --- Nutrition Logs CRUD ---

  getNutritionLogs: async (hunterId: string, day?: string) => {
    try {
      if (!hunterId) throw new Error('Missing hunter_id');

      let query = supabase
        .from('nutrition_logs')
        .select('*')
        .eq('hunter_id', hunterId);
      
      if (day) {
        query = query.eq('day_of_week', day);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Nutrition API error:', error.message);
      return { success: false, error: error.message };
    }
  },

  createNutritionLog: async (logData: any | any[]) => {
    try {
      const itemsToInsert = Array.isArray(logData) ? logData : [logData];
      
      if (itemsToInsert.length === 0) {
        return { success: true, data: [] };
      }

      const hunterId = itemsToInsert[0].hunter_id;
      if (!hunterId) throw new Error('Missing hunter_id');

      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error inserting nutrition log(s):', error.message);
      return { success: false, error: error.message };
    }
  },

  deleteNutritionLog: async (id: string) => {
    try {
      if (!id) throw new Error('Missing id');

      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting nutrition log:', error.message);
      return { success: false, error: error.message };
    }
  },

  // --- Meal Templates CRUD ---

  getMealTemplates: async (hunterId: string) => {
    try {
      if (!hunterId) throw new Error('Missing hunter_id');

      const { data, error } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('hunter_id', hunterId)
        .order('is_starred', { ascending: false })
        .order('name');

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching meal templates:', error.message);
      return { success: false, error: error.message };
    }
  },

  createMealTemplate: async (templateData: any) => {
    try {
      if (!templateData.hunter_id) throw new Error('Missing hunter_id');

      const { data, error } = await supabase
        .from('meal_templates')
        .insert([templateData])
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating meal template:', error.message);
      return { success: false, error: error.message };
    }
  },

  updateMealTemplate: async (id: string, updates: any) => {
    try {
      if (!id) throw new Error('Missing id');

      // Prevent updating id
      const { id: _, ...updateData } = updates;

      const { data, error } = await supabase
        .from('meal_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating meal template:', error.message);
      return { success: false, error: error.message };
    }
  },

  deleteMealTemplate: async (id: string) => {
    try {
      if (!id) throw new Error('Missing id');

      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting meal template:', error.message);
      return { success: false, error: error.message };
    }
  }
};
