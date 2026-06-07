import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CaptainForm from './CaptainForm'

export default async function CaptainPage({
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

  if (!cycle || cycle.captain_id !== user.id) {
    redirect(`/groups/${id}`)
  }

  // Fetch all submissions with signed URLs (captain can see all)
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('cycle_id', cycle.id)

  const submissionsWithUrls = await Promise.all(
    (submissions ?? []).map(async (sub) => {
      const urlPath = sub.thumbnail_url ?? sub.media_url
      const { data } = await supabase.storage
        .from('submissions')
        .createSignedUrl(urlPath, 3600)
      const mediaData = sub.media_url !== urlPath
        ? await supabase.storage.from('submissions').createSignedUrl(sub.media_url, 3600)
        : null
      return {
        ...sub,
        signed_url: mediaData?.data?.signedUrl ?? data?.signedUrl ?? '',
        thumbnail_signed_url: data?.signedUrl,
      }
    })
  )

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/groups/${id}`} className="text-xl text-stone-warm-500">‹</Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-bark-900">Captain's Corner</h1>
          <p className="text-stone-warm-500 text-sm">{group.name}</p>
        </div>
      </div>

      {/* Captain honor card */}
      <div className="bg-gradient-to-br from-honey-500 to-ember-500 rounded-3xl p-4 mt-4 mb-6 shadow-lg shadow-honey-500/25">
        <p className="text-3xl mb-2">👑</p>
        <p className="text-white font-bold text-lg font-display">You're the Captain!</p>
        <p className="text-honey-100 text-sm mt-1 leading-relaxed">
          Your crew submitted their memories. You've seen them all — now write the caption that captures the week.
        </p>
      </div>

      <CaptainForm
        cycleId={cycle.id}
        groupId={id}
        existingCaption={cycle.caption ?? ''}
        existingSong={cycle.song ?? ''}
        submissions={submissionsWithUrls}
        submissionCount={submissionsWithUrls.length}
      />
    </div>
  )
}
