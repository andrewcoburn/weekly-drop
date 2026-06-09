import { createServiceClient } from '@/lib/supabase/server'
import { postToInstagram } from '@/lib/instagram'
import { sendPushToUsers } from '@/lib/push'
import { NextRequest } from 'next/server'

/**
 * GET /api/publish
 * Cron job: runs every 15 minutes. Finds all past-deadline cycles and publishes them.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()
  const now = new Date().toISOString()

  // Find all cycles past deadline that aren't yet published
  const { data: cycles } = await service
    .from('weekly_cycles')
    .select('*')
    .lt('deadline_at', now)
    .neq('status', 'published')

  const results: string[] = []

  for (const cycle of cycles ?? []) {
    try {
      // If captain didn't submit: trigger mutiny (AI captions)
      if (cycle.status === 'pending') {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/caption`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({ cycleId: cycle.id }),
        })
        results.push(`${cycle.id}: triggered mutiny`)
        continue
      }

      // If mutiny but not enough time has passed for voting (give 1 hour after mutiny triggered)
      if (cycle.status === 'mutiny') {
        // Determine winning caption by vote count
        const { data: votes } = await service
          .from('caption_votes')
          .select('caption_option')
          .eq('cycle_id', cycle.id)

        const captions: string[] = cycle.mutiny_captions ?? []
        const tallies = [0, 1, 2].map(
          (i) => (votes ?? []).filter((v) => v.caption_option === i).length
        )
        const winnerIdx = tallies.indexOf(Math.max(...tallies))
        const winningCaption = captions[winnerIdx] ?? captions[0] ?? 'Another week, another memory 📸'

        await publishCycle(service, cycle, winningCaption)
        results.push(`${cycle.id}: published (mutiny winner: option ${winnerIdx})`)
        continue
      }

      // captain_set: use captain's caption
      if (cycle.status === 'captain_set') {
        await publishCycle(service, cycle, cycle.caption ?? 'This week in photos 📸')
        results.push(`${cycle.id}: published (captain caption)`)
      }
    } catch (err) {
      results.push(`${cycle.id}: ERROR — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Start new cycles for groups that don't have an active one
  await startNewCycles(service)

  return Response.json({ processed: results.length, results })
}

async function publishCycle(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  cycle: Record<string, unknown>,
  caption: string
) {
  // Get all submissions
  const { data: submissions } = await service
    .from('submissions')
    .select('id')
    .eq('cycle_id', cycle.id)

  const submissionIds = (submissions ?? []).map((s) => s.id)
  // Randomize order
  const shuffled = [...submissionIds].sort(() => Math.random() - 0.5)

  // Create vault post
  const { data: vaultPost } = await service.from('vault_posts').insert({
    cycle_id: cycle.id,
    group_id: cycle.group_id,
    final_caption: caption,
    final_song: cycle.song ?? null,
    photo_order: shuffled,
  }).select().single()

  // Mark cycle as published
  await service
    .from('weekly_cycles')
    .update({ status: 'published', caption })
    .eq('id', cycle.id)

  // Auto-post to Instagram if this group has a connection
  if (vaultPost) {
    await tryInstagramPost(service, cycle.group_id as string, vaultPost.id, caption, cycle.song as string | null)
  }

  // Notify all group members
  const { data: members } = await service
    .from('group_members')
    .select('user_id')
    .eq('group_id', cycle.group_id)

  const { data: group } = await service
    .from('groups')
    .select('name')
    .eq('id', cycle.group_id)
    .single()

  const memberIds = (members ?? []).map((m) => m.user_id as string)
  const groupName = group?.name ?? 'your group'

  if (memberIds.length > 0) {
    // In-app notifications
    await service.from('notifications').insert(
      memberIds.map((uid) => ({
        user_id: uid,
        group_id: cycle.group_id,
        type: 'post_published' as const,
        message: `✨ This week's drop is live in ${groupName}! Check the vault.`,
      }))
    )

    // Push notifications (silent fail if VAPID not configured)
    await sendPushToUsers(memberIds, {
      title: `${groupName} — weekly drop is live! ✨`,
      body: caption.slice(0, 100),
      url: `/groups/${cycle.group_id}/vault`,
    }).catch(() => {})
  }
}

async function tryInstagramPost(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  groupId: string,
  vaultPostId: string,
  caption: string,
  song: string | null
) {
  const { data: conn } = await service
    .from('instagram_connections')
    .select('ig_user_id, access_token, ig_username')
    .eq('group_id', groupId)
    .single()

  if (!conn) return // No Instagram connected — skip silently

  try {
    const imageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og?postId=${vaultPostId}`
    const igCaption = song ? `${caption}\n\n🎵 ${song}\n\n#WeeklyDrop` : `${caption}\n\n#WeeklyDrop`

    const igPostId = await postToInstagram(conn.ig_user_id, conn.access_token, imageUrl, igCaption)

    await service
      .from('vault_posts')
      .update({ instagram_post_id: igPostId, instagram_auto_posted: true })
      .eq('id', vaultPostId)
  } catch (err) {
    // Non-fatal — log but don't fail the publish
    console.error(`Instagram auto-post failed for group ${groupId}:`, err)
  }
}

async function startNewCycles(service: Awaited<ReturnType<typeof createServiceClient>>) {
  // Find all groups that don't have an active (non-published) cycle
  const { data: allGroups } = await service.from('groups').select('*')

  for (const group of allGroups ?? []) {
    const { data: activeCycles } = await service
      .from('weekly_cycles')
      .select('id')
      .eq('group_id', group.id)
      .neq('status', 'published')

    if ((activeCycles ?? []).length === 0) {
      // Start a new cycle
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/captain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ groupId: group.id }),
      })
    }
  }
}
