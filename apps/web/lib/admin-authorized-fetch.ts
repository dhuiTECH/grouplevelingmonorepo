import { supabase } from "@/lib/supabase";

/** Refresh access token before it expires (or if already expired). */
const REFRESH_BUFFER_MS = 60_000;

/**
 * Returns a Supabase access token suitable for Bearer auth on admin API routes.
 * Proactively calls refreshSession when the token is expired or near expiry so
 * long-lived admin tabs don't send stale JWTs.
 */
export async function getValidAccessTokenForAdmin(): Promise<string | null> {
  const {
    data: { session: initial },
  } = await supabase.auth.getSession();

  if (!initial?.access_token) return null;

  const expiresAtMs = initial.expires_at ? initial.expires_at * 1000 : 0;
  const needsRefresh =
    !expiresAtMs || expiresAtMs < Date.now() + REFRESH_BUFFER_MS;

  if (needsRefresh && initial.refresh_token) {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();
    if (!error && session?.access_token) return session.access_token;
  }

  return initial.access_token;
}

/**
 * POST multipart to an admin upload route with a fresh Bearer token.
 * Retries once after refreshSession on 401. Uses a FormData factory so the body
 * can be sent again on retry (FormData streams are consumed per request).
 */
export async function adminAuthorizedUpload(
  url: string,
  buildFormData: () => FormData,
): Promise<Response> {
  const attempt = async (accessToken: string) =>
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: buildFormData(),
    });

  let token = await getValidAccessTokenForAdmin();
  if (!token) throw new Error("Not authenticated - please log in again");

  let response = await attempt(token);
  if (response.status !== 401) return response;

  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession();
  if (error || !session?.access_token) {
    throw new Error("Not authenticated - please log in again");
  }
  return attempt(session.access_token);
}

/**
 * Call admin API routes with the current Supabase session.
 * The browser client uses a custom storageKey (localStorage), so cookie-based
 * verifyAdminAuth often sees no session unless we send Bearer explicitly.
 */
export async function adminAuthorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const tryFetch = async (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  };

  let token = await getValidAccessTokenForAdmin();
  let response = await tryFetch(token);

  if (response.status === 401) {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();
    if (!error && session?.access_token) {
      response = await tryFetch(session.access_token);
    }
  }

  return response;
}
