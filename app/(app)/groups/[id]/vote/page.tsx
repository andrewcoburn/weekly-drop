import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import VoteButtons from './VoteButtons'

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', id)
    .single()

  if (!group) notFound()

  const { data: cycles } = await supabase
    .from('weekly_cycles')
    .select('*, captain:users!captain_id(name)')
    .eq('group_id', id)
    .eq('status', 'mutiny')
    .order('week_start', { ascending: false })
    .limit(1)

  const cycle = cycles?.[0]
  if (!cycle) redirect(`/groups/${id}`)

  const captions: string[] = cycle.mutiny_captions ?? []

  // Vote tallies
  const { data: votes } = await supabase
    .from('caption_votes')
    .select('caption_option')
    .eq('cycle_id', cycle.id)

  const tallies = [0, 1, 2].map(
    (i) => (votes ?? []).filter((v) => v.caption_option === i).length
  )
  const totalVotes = tallies.reduce((a, b) => a + b, 0)

  // User's existing vote
  const { data: myVote } = await supabase
    .from('caption_votes')
    .select('caption_option')
    .eq('cycle_id', cycle.id)
    .eq('user_id', user.id)
    .single()

  const captainName = (cycle.captain as { name?: string })?.name ?? 'The captain'

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/groups/${id}`} className="text-xl text-stone-warm-500">‹</Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-bark-900">⚡ Mutiny Mode</h1>
          <p className="text-stone-warm-500 text-sm">{group.name}</p>
        </div>
      </div>

      <div className="bg-bark-900 rounded-3xl p-4 mt-4 mb-6">
        <p className="text-cream-100 font-semibold leading-snug">
          {captainName} didn't show up this week.
          The crew votes for the caption.
        </p>
        <p className="text-stone-warm-400 text-xs mt-1.5">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} so far
        </p>
      </div>

      <VoteButtons
        cycleId={cycle.id}
        captions={captions}
        tallies={tallies}
        totalVotes={totalVotes}
        userVote={myVote?.caption_option ?? null}
        userId={user.id}
        groupId={id}
      />
    </div>
  )
}
