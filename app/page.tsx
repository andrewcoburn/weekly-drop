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
 * Root page — also acts as a catch-all for when Supabase redirects back to the
 * Site URL with auth params (happens when the redirect URL isn't whitelisted).
 * Forwards the params to /auth/callback so they're exchanged properly.
 */
export default async function Home({ searchParams }: Props) {
  const params = await searchParams

  // Supabase sent an error (e.g. expired reset link)
  if (params.error) {
    const dest = params.type === 'recovery'
      ? '/reset-password?error=expired'
      : '/login'
    redirect(dest)
  }

  // PKCE code — forward to callback with correct next destination
  if (params.code) {
    const next = params.type === 'recovery' ? '/reset-password' : '/dashboard'
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}&next=${next}`)
  }

  // token_hash — forward to callback with correct next destination
  if (params.token_hash && params.type) {
    const next = params.type === 'recovery' ? '/reset-password' : '/dashboard'
    redirect(
      `/auth/callback?token_hash=${encodeURIComponent(params.token_hash)}&type=${params.type}&next=${next}`
    )
  }

  // Normal visit — send to dashboard (middleware will redirect to login if not authed)
  redirect('/dashboard')
}
