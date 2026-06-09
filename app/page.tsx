import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{
    code?: string
    token_hash?: string
    type?: string
    error?: string
  }>
}

/**
 * Root page — also the Site URL fallback when Supabase's redirect_to URL
 * isn't whitelisted. Supabase drops auth params (?code= or ?token_hash=)
 * here instead of /auth/callback. We catch them and forward correctly.
 *
 * The `wr-recovery` cookie (set by /forgot-password when the reset email
 * is sent) is the only reliable signal that a ?code= param is for password
 * recovery — Supabase PKCE redirects don't include type=recovery in the URL.
 */
export default async function Home({ searchParams }: Props) {
  const params = await searchParams
  const cookieStore = await cookies()
  const isRecovery = cookieStore.get('wr-recovery')?.value === '1'

  // Auth error from Supabase (e.g. link expired)
  if (params.error) {
    redirect(isRecovery || params.type === 'recovery'
      ? '/reset-password?error=expired'
      : '/login')
  }

  // PKCE code — direction depends on the wr-recovery cookie
  if (params.code) {
    const next = isRecovery ? '/reset-password' : '/dashboard'
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}&next=${next}`)
  }

  // token_hash — type=recovery is included by Supabase in this format
  if (params.token_hash && params.type) {
    const next = params.type === 'recovery' ? '/reset-password' : '/dashboard'
    redirect(
      `/auth/callback?token_hash=${encodeURIComponent(params.token_hash)}&type=${params.type}&next=${next}`
    )
  }

  redirect('/dashboard')
}
