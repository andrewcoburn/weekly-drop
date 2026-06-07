import type { GroupMember, Submission } from '@/types'
import Avatar from '@/components/ui/Avatar'

interface MemberListProps {
  members: GroupMember[]
  submissions: Submission[]
  cyclePublished: boolean
}

export default function MemberList({ members, submissions, cyclePublished }: MemberListProps) {
  const submittedIds = new Set(submissions.map((s) => s.user_id))

  return (
    <div className="flex flex-wrap gap-3">
      {members.map((member) => {
        const submitted = submittedIds.has(member.user_id)
        const user = member.user

        return (
          <div key={member.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <Avatar
                name={user?.name ?? '?'}
                src={user?.avatar_url}
                size="md"
              />
              {submitted && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs animate-bounce-in">
                  ✓
                </span>
              )}
              {!submitted && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-cream-200 border border-cream-300 rounded-full flex items-center justify-center text-xs">
                  ···
                </span>
              )}
            </div>
            <span className="text-xs text-stone-warm-500 max-w-[56px] truncate text-center">
              {user?.name?.split(' ')[0] ?? '?'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
