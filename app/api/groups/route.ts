import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return Response.json([])

  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)

  return Response.json(groups ?? [])
}
