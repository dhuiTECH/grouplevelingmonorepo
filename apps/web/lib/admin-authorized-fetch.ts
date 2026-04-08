import { supabase } from "@/lib/supabase";

/** Refresh access token before it expires (or if already expired). */
const REFRESH_BUFFER_MS = 60_000;

/** Default timeout for JSON/admin API calls (avoids infinite spinners on hung requests). */
export const DEFAULT_ADMIN_FETCH_TIMEOUT_MS = 30_000;

/** Longer default for multipart uploads (large images / slow networks). */
export const DEFAULT_ADMIN_UPLOAD_TIMEOUT_MS = 120_000;

function joinAbortSignals(
  a: AbortSignal | undefined | null,
  b: AbortSignal | undefined | null,
): AbortSignal | undefined {
  const aSig = a ?? undefined;
  const bSig = b ?? undefined;
  if (!aSig && !bSig) return undefined;
  if (aSig && !bSig) return aSig;
  if (bSig && !aSig) return bSig;
  const left = aSig!;
  const right = bSig!;
  if (left.aborted) return left;
  if (right.aborted) return right;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  left.addEventListener("abort", onAbort);
  right.addEventListener("abort", onAbort);
  return controller.signal;
}

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
  options?: { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_ADMIN_UPLOAD_TIMEOUT_MS;

  const attempt = async (accessToken: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: buildFormData(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

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
  options?: { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_ADMIN_FETCH_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  const tryFetch = async (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const signal = joinAbortSignals(init.signal ?? undefined, timeoutController.signal);
    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
      ...(signal ? { signal } : {}),
    });
  };

  try {
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
  } finally {
    clearTimeout(timer);
  }
}
