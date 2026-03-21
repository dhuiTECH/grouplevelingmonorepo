import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const noopStorage = {
  getItem: (): string | null => null,
  setItem: (): void => {},
  removeItem: (): void => {},
};

/**
 * Server-side client for public RLS-only reads (no user session).
 * No cookie/storage and no token refresh — avoids stale-refresh-token noise.
 */
export function createPublicServerClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: noopStorage,
    },
  });
}

/** PostgREST / GoTrue errors often print as `{}` in console — use this for logs. */
export function formatSupabaseError(error: unknown): Record<string, string> {
  if (error == null || typeof error !== "object") {
    return { message: String(error) };
  }
  const e = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    status?: number;
  };
  return {
    message: e.message ?? "(no message)",
    code: e.code ?? "",
    details: e.details ?? "",
    hint: e.hint ?? "",
    status: e.status != null ? String(e.status) : "",
  };
}
