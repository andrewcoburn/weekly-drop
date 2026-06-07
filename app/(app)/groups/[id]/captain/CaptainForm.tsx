'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface SubmissionPreview {
  id: string
  media_type: 'photo' | 'video'
  signed_url: string
  thumbnail_signed_url?: string
}

interface CaptainFormProps {
  cycleId: string
  groupId: string
  existingCaption: string
  existingSong: string
  submissions: SubmissionPreview[]
  submissionCount: number
}

const MAX_CAPTION = 150

export default function CaptainForm({
  cycleId,
  groupId,
  existingCaption,
  existingSong,
  submissions,
  submissionCount,
}: CaptainFormProps) {
  const router = useRouter()
  const [caption, setCaption] = useState(existingCaption)
  const [song, setSong] = useState(existingSong)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caption.trim()) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('weekly_cycles')
        .update({
          caption: caption.trim(),
          song: song.trim() || null,
          status: 'captain_set',
        })
        .eq('id', cycleId)

      if (error) throw error

      router.push(`/groups/${groupId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo gallery */}
      {submissions.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-bark-800 mb-3">
            {submissionCount} drop{submissionCount !== 1 ? 's' : ''} from your crew
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {submissions.map((sub) => {
              const src = sub.thumbnail_signed_url ?? sub.signed_url
              return (
                <div key={sub.id} className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-cream-200">
                  <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                  {sub.media_type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">▶</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Caption input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-bark-800">Weekly caption</label>
          <span className={`text-xs font-medium ${caption.length > MAX_CAPTION ? 'text-red-500' : 'text-stone-warm-400'}`}>
            {caption.length}/{MAX_CAPTION}
          </span>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="we don't remember the days, we remember the moments 📸"
          rows={3}
          maxLength={MAX_CAPTION + 20}
          required
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 text-sm focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors resize-none"
        />
      </div>

      {/* Song input */}
      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">
          🎵 Song of the week <span className="text-stone-warm-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="Blinding Lights – The Weeknd"
          maxLength={100}
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 text-sm focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
          {error}
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={loading}
        disabled={caption.length > MAX_CAPTION}
      >
        Lock it in 🔒
      </Button>
    </form>
  )
}
