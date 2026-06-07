'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface VoteButtonsProps {
  cycleId: string
  captions: string[]
  tallies: number[]
  totalVotes: number
  userVote: number | null
  userId: string
  groupId: string
}

export default function VoteButtons({
  cycleId,
  captions,
  tallies,
  totalVotes,
  userVote: initialUserVote,
  userId,
  groupId,
}: VoteButtonsProps) {
  const router = useRouter()
  const [userVote, setUserVote] = useState<number | null>(initialUserVote)
  const [localTallies, setLocalTallies] = useState(tallies)
  const [localTotal, setLocalTotal] = useState(totalVotes)
  const [loading, setLoading] = useState(false)

  async function handleVote(option: number) {
    if (userVote !== null || loading) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('caption_votes').insert({
      cycle_id: cycleId,
      user_id: userId,
      caption_option: option,
    })

    if (!error) {
      setUserVote(option)
      setLocalTallies((prev) => prev.map((t, i) => (i === option ? t + 1 : t)))
      setLocalTotal((prev) => prev + 1)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {captions.map((caption, i) => {
        const pct = localTotal > 0 ? Math.round((localTallies[i] / localTotal) * 100) : 0
        const isSelected = userVote === i
        const hasVoted = userVote !== null

        return (
          <button
            key={i}
            onClick={() => handleVote(i)}
            disabled={hasVoted || loading}
            className={`w-full text-left rounded-3xl border-2 p-4 transition-all ${
              isSelected
                ? 'border-honey-500 bg-honey-400/10'
                : hasVoted
                ? 'border-cream-200 bg-cream-100 opacity-70'
                : 'border-cream-200 bg-cream-100 hover:border-honey-400 hover:bg-cream-200 active:scale-[0.98]'
            }`}
          >
            <p className="text-bark-900 font-medium text-sm leading-relaxed">{caption}</p>

            {hasVoted && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-stone-warm-500 mb-1">
                  <span>{localTallies[i]} vote{localTallies[i] !== 1 ? 's' : ''}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSelected ? 'bg-honey-500' : 'bg-stone-warm-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {isSelected && (
              <p className="text-honey-600 text-xs font-semibold mt-2">✓ Your vote</p>
            )}
          </button>
        )
      })}

      {userVote !== null && (
        <p className="text-center text-stone-warm-500 text-sm pt-2">
          Vote locked in 🔒 — winner announced at deadline
        </p>
      )}
    </div>
  )
}
