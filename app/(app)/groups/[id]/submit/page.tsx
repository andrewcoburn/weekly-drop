import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SubmitForm from '@/components/submissions/SubmitForm'

export default async function SubmitPage({
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

  // Get active cycle
  const { data: cycles } = await supabase
    .from('weekly_cycles')
    .select('*')
    .eq('group_id', id)
    .neq('status', 'published')
    .order('week_start', { ascending: false })
    .limit(1)

  const cycle = cycles?.[0]

  if (!cycle) {
    return (
      <div className="px-4 pt-16 text-center max-w-sm mx-auto">
        <div className="text-5xl mb-4">😴</div>
        <h2 className="font-display text-xl font-bold text-bark-900">No active cycle</h2>
        <p className="text-stone-warm-500 text-sm mt-2">Check back when the next cycle starts.</p>
        <Link href={`/groups/${id}`} className="text-honey-600 underline underline-offset-2 text-sm mt-4 inline-block">
          ← Back to group
        </Link>
      </div>
    )
  }

  // Check if already submitted
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('cycle_id', cycle.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect(`/groups/${id}`)
  }

  // Check deadline
  if (new Date(cycle.deadline_at) < new Date()) {
    return (
      <div className="px-4 pt-16 text-center max-w-sm mx-auto">
        <div className="text-5xl mb-4">⏰</div>
        <h2 className="font-display text-xl font-bold text-bark-900">Deadline passed</h2>
        <p className="text-stone-warm-500 text-sm mt-2">This week's drop is closed.</p>
        <Link href={`/groups/${id}`} className="text-honey-600 underline underline-offset-2 text-sm mt-4 inline-block">
          ← Back to group
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/groups/${id}`} className="text-xl text-stone-warm-500">‹</Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-bark-900">Your drop</h1>
          <p className="text-stone-warm-500 text-sm">{group.name}</p>
        </div>
      </div>

      <SubmitForm cycleId={cycle.id} groupId={id} userId={user.id} />
    </div>
  )
}
