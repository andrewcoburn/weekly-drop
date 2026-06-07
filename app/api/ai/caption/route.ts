import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { generateMutinyCaptions } from '@/lib/ai/captions'
import { formatShortDate } from '@/lib/utils'

/**
 * POST /api/ai/caption
 * Generates 3 AI captions for a cycle in mutiny mode.
 * Called by the publish job when a captain misses the deadline.
 */
export async function POST(req: Request) {
  // Allow both authed users and service role (via cron)
  const authHeader = req.headers.get('Authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cycleId } = await req.json()
  const service = await createServiceClient()

  const { data: cycle } = await service
    .from('weekly_cycles')
    .select('*, group:groups(name, id)')
    .eq('id', cycleId)
    .single()

  if (!cycle) return Response.json({ error: 'Cycle not found' }, { status: 404 })

  const { data: captain } = cycle.captain_id
    ? await service.from('users').select('name').eq('id', cycle.captain_id).single()
    : { data: null }

  const { data: members } = await service
    .from('group_members')
    .select('user_id')
    .eq('group_id', (cycle.group as { id: string }).id)

  const captions = await generateMutinyCaptions(
    captain?.name ?? 'The captain',
    (cycle.group as { name: string }).name,
    (members ?? []).length,
    formatShortDate(cycle.week_start)
  )

  // Save to cycle and set status to mutiny
  await service
    .from('weekly_cycles')
    .update({ mutiny_captions: captions, status: 'mutiny' })
    .eq('id', cycleId)

  // Notify all members
  const memberIds = (members ?? []).map((m) => m.user_id)
  if (memberIds.length > 0) {
    await service.from('notifications').insert(
      memberIds.map((uid) => ({
        user_id: uid,
        group_id: (cycle.group as { id: string }).id,
        type: 'mutiny' as const,
        message: `⚡ Mutiny! ${captain?.name ?? 'The captain'} missed the drop in ${(cycle.group as { name: string }).name}. Vote for a caption!`,
      }))
    )
  }

  return Response.json({ captions })
}
