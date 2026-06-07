import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/instagram/disconnect
 * Body: { groupId }
 * Removes the Instagram connection for a group. Admin only.
 */
export async function POST(req: Request) {
  const { groupId } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (member?.role !== 'admin') {
    return Response.json({ error: 'Only admins can disconnect Instagram' }, { status: 403 })
  }

  const service = await createServiceClient()
  await service.from('instagram_connections').delete().eq('group_id', groupId)

  return Response.json({ ok: true })
}
