/**
 * Human-readable message for Supabase client errors and other thrown values (alerts / logs).
 */
export function formatSupabaseErrorMessage(error: unknown): string {
  if (error == null) return 'Something went wrong';
  if (error instanceof Error) {
    const any = error as Error & { details?: string; hint?: string; code?: string };
    const parts = [any.message].filter(Boolean);
    if (typeof any.details === 'string' && any.details.trim()) parts.push(any.details.trim());
    if (typeof any.hint === 'string' && any.hint.trim()) parts.push(any.hint.trim());
    if (typeof any.code === 'string' && any.code.length && any.code !== 'PGRST116') {
      parts.push(`[${any.code}]`);
    }
    return parts.join(' — ');
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
