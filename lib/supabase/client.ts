import { createBrowserClient } from '@supabase/ssr'

/**
 * Returns true only when real Supabase credentials are present.
 * Safe to call in browser — checks the NEXT_PUBLIC_ env vars.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.startsWith('https://') &&
    !url.includes('your_supabase') &&
    !url.includes('placeholder') &&
    key.length > 20 &&
    !key.startsWith('your_')
  )
}

const NOT_CONFIGURED_MSG =
  'App not connected to a database yet. Add your Supabase URL and anon key to Vercel → Project Settings → Environment Variables, then redeploy. (For local dev: edit .env.local and restart.)'

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!isSupabaseConfigured()) throw new Error(NOT_CONFIGURED_MSG)
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}
