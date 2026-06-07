'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface InviteButtonProps {
  inviteCode: string
  groupName: string
}

export default function InviteButton({ inviteCode, groupName }: InviteButtonProps) {
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/join/${inviteCode}`

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: `Join ${groupName} on Weekly Drop`,
        text: `Join our group "${groupName}" on Weekly Drop — we drop a memory every week!`,
        url: inviteUrl,
      })
    } else {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare}>
      {copied ? '✓ Copied!' : '🔗 Invite friends'}
    </Button>
  )
}
