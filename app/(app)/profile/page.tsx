import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile — if no row exists yet (signed up before trigger was added),
  // create one now so the user can still edit their profile
  let profile: { name: string; avatar_url: string | null; created_at: string } | null = null

  try {
    const { data } = await supabase
      .from('users')
      .select('name, avatar_url, created_at')
      .eq('id', user.id)
      .single()

    if (data) {
      profile = data
    } else {
      // Row missing — create it from auth metadata
      const fallbackName =
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split('@')[0] ??
        'New Member'

      const { data: newProfile } = await supabase
        .from('users')
        .upsert({ id: user.id, name: fallbackName, avatar_url: null }, { onConflict: 'id' })
        .select('name, avatar_url, created_at')
        .single()

      profile = newProfile
    }
  } catch {
    // Tables not set up yet — show form with defaults
  }

  // Group + drop counts (safe — return 0 if tables missing)
  let groupCount = 0
  let dropCount = 0

  try {
    const [gRes, dRes] = await Promise.all([
      supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    groupCount = gRes.count ?? 0
    dropCount = dRes.count ?? 0
  } catch {
    // ignore
  }

  return (
    <ProfileForm
      userId={user.id}
      email={user.email ?? ''}
      initialName={profile?.name ?? ''}
      initialAvatarUrl={profile?.avatar_url ?? null}
      joinedAt={profile?.created_at ?? user.created_at ?? new Date().toISOString()}
      groupCount={groupCount}
      dropCount={dropCount}
    />
  )
}
