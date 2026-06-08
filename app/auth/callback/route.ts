import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') ?? 'email'
  const next       = searchParams.get('next') ?? '/dashboard'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Route handlers CAN set cookies — this is the right place for auth exchanges
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // ── PKCE code exchange (magic link, OAuth, some password resets) ──
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // ── token_hash exchange (password recovery, email OTP) ──
  else if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery' | 'signup' | 'email' | 'magiclink',
      token_hash,
    })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // Something went wrong — send to reset page with an error flag
  const errorDest = next.startsWith('/reset-password')
    ? `${origin}/reset-password?error=expired`
    : `${origin}/login?error=auth_failed`

  return NextResponse.redirect(errorDest)
}
