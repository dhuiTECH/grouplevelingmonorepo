import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'

// Use actual environment variables with empty string fallbacks to avoid crashes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 1. Client-side Client: Used for general data fetching (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// 2. Admin Client: STRICTLY for server-side operations (bypasses RLS)
// This is what you should use in your /api/admin/shop route
export const supabaseAdmin = createClient(
  supabaseUrl || 'dummy-url',
  supabaseServiceKey || 'dummy-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// Add a runtime check that throws only when actually used
const originalFrom = supabaseAdmin.from.bind(supabaseAdmin);
supabaseAdmin.from = function(table: string) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase Admin Environment Variables");
  }
  return originalFrom(table);
};

// Add runtime check for storage operations
const originalStorage = supabaseAdmin.storage;
supabaseAdmin.storage = new Proxy(originalStorage, {
  get(target, prop) {
    if (prop === 'from') {
      return function(bucket: string) {
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error("Missing Supabase Admin Environment Variables");
        }
        return originalStorage.from(bucket);
      };
    }
    return target[prop as keyof typeof target];
  }
});

// 3. Server Client Factory: Used for standard user Auth in API routes
export const createServerClient = (context?: { req?: any; res?: any }) => {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return context?.req?.cookies?.[name] || ''
      },
      set(name: string, value: string, options: any) {
        context?.res?.cookie(name, value, options)
      },
      remove(name: string, options: any) {
        context?.res?.clearCookie(name, options)
      }
    }
  })
}

// 4. Unified Types (Ensure shop_items matches your Hybrid system)
export type Database = {
  public: {
    Tables: {
      skills: {
        Row: {
          id: string
          name: string
          description_template: string | null
          max_rank: number
          required_level: number
          allowed_classes: string[]
          base_value: number
          energy_cost: number
          cooldown_ms: number
          skill_type: string
          bonus_type: string | null
          target_type: string
          icon_path: string | null
          scaling_factor: number
          x_pos: number | null
          y_pos: number | null
          required_skill_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description_template?: string | null
          max_rank?: number
          required_level?: number
          allowed_classes?: string[]
          base_value?: number
          energy_cost?: number
          cooldown_ms?: number
          skill_type?: string
          bonus_type?: string | null
          target_type?: string
          icon_path?: string | null
          scaling_factor?: number
          x_pos?: number | null
          y_pos?: number | null
          required_skill_id?: string | null
        }
      }
      skill_animations: {
        Row: {
          skill_id: string
          sprite_url: string | null
          sfx_url: string | null
          frame_count: number
          frame_width: number
          frame_height: number
          offset_x: number
          offset_y: number
          preview_scale: number
          duration_ms: number
          vfx_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          skill_id: string
          sprite_url?: string | null
          sfx_url?: string | null
          frame_count?: number
          frame_width?: number
          frame_height?: number
          offset_x?: number
          offset_y?: number
          preview_scale?: number
          duration_ms?: number
          vfx_type?: string
        }
        Update: {
          skill_id?: string
          sprite_url?: string | null
          sfx_url?: string | null
          frame_count?: number
          frame_width?: number
          frame_height?: number
          offset_x?: number
          offset_y?: number
          preview_scale?: number
          duration_ms?: number
          vfx_type?: string
        }
      }
      shop_items: {
        Row: {
          id: string // This will now represent a UUID string
          name: string
          description: string | null
          image_url: string
          offset_x: number
          offset_y: number
          scale: number
          rotation: number
          z_index: number
          bonus_type: string | null
          bonus_value: number | null
          is_animated: boolean
          price: number
          rarity: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string // Optional because the DB generates the UUID
          name: string
          description?: string | null
          image_url: string
          offset_x?: number
          offset_y?: number
          scale?: number
          rotation?: number
          z_index?: number
          bonus_type?: string | null
          bonus_value?: number | null
          is_animated?: boolean
          price: number
          rarity?: string
          is_active?: boolean
        }
        // ... (Update section follows the same logic)
      }
      // ... (Keep other tables as they were)
    }
  }
}