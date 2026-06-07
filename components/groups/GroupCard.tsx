import Link from 'next/link'
import Image from 'next/image'
import type { GroupWithCycle } from '@/types'
import { getDayName, getTimeUntilDeadline, isDeadlineSoon } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

interface GroupCardProps {
  group: GroupWithCycle
}

export default function GroupCard({ group }: GroupCardProps) {
  const { current_cycle, member_count, user_submitted } = group
  const hasDeadline = current_cycle && current_cycle.status !== 'published'
  const soon = hasDeadline && isDeadlineSoon(current_cycle.deadline_at)

  return (
    <Link href={`/groups/${group.id}`} className="block">
      <div className="bg-cream-100 border border-cream-200 rounded-3xl overflow-hidden shadow-sm shadow-bark-900/5 active:scale-[0.98] transition-transform duration-100">
        {/* Cover image */}
        <div className="relative h-36 bg-gradient-to-br from-honey-400 to-ember-500">
          {group.cover_photo_url && (
            <Image
              src={group.cover_photo_url}
              alt={group.name}
              fill
              className="object-cover"
              sizes="(max-width: 390px) 100vw, 390px"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bark-900/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-display text-xl font-bold text-white leading-tight">{group.name}</h3>
            <p className="text-cream-100 text-sm mt-0.5">
              {member_count} {member_count === 1 ? 'member' : 'members'} · drops every {getDayName(group.submission_day)}
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          {current_cycle ? (
            <>
              <div className="flex items-center gap-2">
                {user_submitted ? (
                  <Badge variant="success">✓ Submitted</Badge>
                ) : (
                  <Badge variant={soon ? 'warning' : 'neutral'}>
                    {soon ? '⚡ Submit soon' : 'Not submitted'}
                  </Badge>
                )}
                {current_cycle.status === 'mutiny' && (
                  <Badge variant="danger">⚡ Mutiny</Badge>
                )}
                {current_cycle.status === 'published' && (
                  <Badge variant="warm">✨ Published</Badge>
                )}
              </div>
              {hasDeadline && (
                <span className="text-xs text-stone-warm-500 font-medium">
                  {getTimeUntilDeadline(current_cycle.deadline_at)}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-stone-warm-500">No active cycle</span>
          )}
        </div>
      </div>
    </Link>
  )
}
