import { supabase } from '@/lib/supabase';

// This file is kept for compatibility but logic should move to specific domain files (users.ts, shop.ts, etc.)
// The generic ApiClient pattern is often too simple for complex Supabase queries (joins, RPCs).

export const apiClient = {
  supabase
};
