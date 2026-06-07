import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { GroupWithCycle } from '@/types'
import GroupCard from '@/components/groups/GroupCard'
import NotificationBanner from '@/components/notifications/NotificationBanner'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  const groupIds = (memberships ?? []).map((m) => m.group_id)

  let groups: GroupWithCycle[] = []
  if (groupIds.length > 0) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    for (const g of groupData ?? []) {
      // Get member count
      const { count: memberCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)

      // Get current (most recent non-published) cycle
      const { data: cycles } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('group_id', g.id)
        .neq('status', 'published')
        .order('week_start', { ascending: false })
        .limit(1)

      const currentCycle = cycles?.[0] ?? null

      // Check if user submitted this cycle
      let userSubmitted = false
      if (currentCycle) {
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', currentCycle.id)
          .eq('user_id', user.id)
        userSubmitted = (count ?? 0) > 0
      }

      groups.push({
        ...g,
        current_cycle: currentCycle,
        member_count: memberCount ?? 0,
        user_submitted: userSubmitted,
      })
    }
  }

  // Unread notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const pendingSubmissions = groups.filter(
    (g) => g.current_cycle && g.current_cycle.status !== 'published' && !g.user_submitted
  )

  return (
    <div className="px-4 pt-6 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-bark-900">Weekly Drop</h1>
          <p className="text-stone-warm-500 text-sm mt-0.5">your memories, every week</p>
        </div>
        <Link
          href="/notifications"
          className="relative w-10 h-10 flex items-center justify-center bg-cream-100 border border-cream-200 rounded-2xl"
        >
          <span className="text-xl">🔔</span>
        </Link>
      </div>

      {/* Notification banner */}
      {(notifications ?? []).length > 0 && (
        <NotificationBanner notifications={notifications ?? []} />
      )}

      {/* Pending submission reminders */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-ember-500/10 border border-ember-500/20 rounded-2xl px-4 py-3">
          <p className="text-sm font-semibold text-ember-700">
            ⏰ You have {pendingSubmissions.length} drop{pendingSubmissions.length > 1 ? 's' : ''} waiting
          </p>
          <p className="text-xs text-ember-600 mt-0.5">
            {pendingSubmissions.map((g) => g.name).join(', ')}
          </p>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-bark-800 text-sm uppercase tracking-wide">Your groups</h2>
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="text-6xl">📷</div>
      <div>
        <h2 className="font-display text-2xl font-bold text-bark-900">No groups yet</h2>
        <p className="text-stone-warm-500 text-sm mt-1.5 leading-relaxed">
          Start a group with your friends,<br />or join one with an invite link.
        </p>
      </div>
      <div className="flex gap-3 justify-center pt-2">
        <Link
          href="/groups/create"
          className="bg-honey-600 hover:bg-honey-700 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm shadow-md shadow-honey-600/20 transition-colors"
        >
          Create a group
        </Link>
      </div>
    </div>
  )
}
