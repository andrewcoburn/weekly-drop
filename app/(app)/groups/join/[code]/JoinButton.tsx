'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function JoinButton({ groupId, userId }: { groupId: string; userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
      })
      if (error) throw error
      router.push(`/groups/${groupId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}
      <Button fullWidth size="lg" onClick={handleJoin} loading={loading}>
        Join group 🙌
      </Button>
    </div>
  )
}
