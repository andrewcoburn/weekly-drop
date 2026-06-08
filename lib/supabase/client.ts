import { createBrowserClient } from '@supabase/ssr'

// Singleton so one client is reused across the whole session
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Keep session alive for 400 days — user stays logged in across app opens
        maxAge: 400 * 24 * 60 * 60,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )
  return client
}
