const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Returns the full URL for a Supabase Edge Function. */
export function edgeFnUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

/** Standard headers required to call a Supabase Edge Function from the browser. */
export function edgeFnHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}
