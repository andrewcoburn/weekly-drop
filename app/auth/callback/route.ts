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

  // Always clear the recovery intent cookie after the callback fires,
  // whether exchange succeeds or fails, so it doesn't affect future logins.
  const clearRecovery = () => {
    try { cookieStore.set('wr-recovery', '', { maxAge: 0, path: '/' }) } catch { /* ignore */ }
  }

  // ── PKCE code exchange ──
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    clearRecovery()
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // ── token_hash exchange (password recovery, email OTP) ──
  else if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery' | 'signup' | 'email' | 'magiclink',
      token_hash,
    })
    clearRecovery()
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  clearRecovery()

  // Exchange failed — route to appropriate error page
  const errorDest = next.startsWith('/reset-password')
    ? `${origin}/reset-password?error=expired`
    : `${origin}/login?error=auth_failed`

  return NextResponse.redirect(errorDest)
}
