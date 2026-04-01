import { supabase } from "@/lib/supabase";

/**
 * Call admin API routes with the current Supabase session.
 * The browser client uses a custom storageKey (localStorage), so cookie-based
 * verifyAdminAuth often sees no session unless we send Bearer explicitly.
 */
export async function adminAuthorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}
