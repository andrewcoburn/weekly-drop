import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getWeekStart } from '@/lib/utils'

/**
 * POST /api/captain
 * Creates a new weekly cycle for a group and assigns the next captain.
 * Called when a group is created, or by the publish job after a cycle closes.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = await req.json()

  const service = await createServiceClient()

  // Get group details
  const { data: group } = await service
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (!group) return Response.json({ error: 'Group not found' }, { status: 404 })

  // Get members sorted by join date for round-robin
  const { data: members } = await service
    .from('group_members')
    .select('user_id, joined_at')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  if (!members || members.length === 0) {
    return Response.json({ error: 'No members' }, { status: 400 })
  }

  // Next captain using current captain_index
  const captainUserId = members[group.captain_index % members.length].user_id

  // Compute deadline: next occurrence of submission_day at 23:59:59 in group's timezone
  const { computeNextDeadline } = await import('@/lib/utils')
  const deadline = computeNextDeadline(group.submission_day, group.timezone)
  const weekStart = getWeekStart(deadline)

  // Create cycle
  const { data: cycle, error: cycleErr } = await service
    .from('weekly_cycles')
    .insert({
      group_id: groupId,
      week_start: weekStart,
      deadline_at: deadline.toISOString(),
      captain_id: captainUserId,
      status: 'pending',
    })
    .select()
    .single()

  if (cycleErr) return Response.json({ error: cycleErr.message }, { status: 500 })

  // Increment captain_index on group
  await service
    .from('groups')
    .update({ captain_index: (group.captain_index + 1) % members.length })
    .eq('id', groupId)

  // Notify captain
  const { data: captainUser } = await service
    .from('users')
    .select('name')
    .eq('id', captainUserId)
    .single()

  await service.from('notifications').insert({
    user_id: captainUserId,
    group_id: groupId,
    type: 'captain_selected',
    message: `👑 You're the captain for ${group.name} this week! Write the caption after the deadline.`,
  })

  // Notify all members about new cycle
  const otherMembers = members.filter((m) => m.user_id !== captainUserId)
  if (otherMembers.length > 0) {
    await service.from('notifications').insert(
      otherMembers.map((m) => ({
        user_id: m.user_id,
        group_id: groupId,
        type: 'reminder' as const,
        message: `📸 New week in ${group.name}! Drop your memory before the deadline.`,
      }))
    )
  }

  return Response.json({ cycle, captainName: captainUser?.name })
}
