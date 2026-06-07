import Image from 'next/image'
import type { VaultPost, SubmissionWithUrl } from '@/types'
import { formatDate, formatShortDate } from '@/lib/utils'
import DownloadButton from './DownloadButton'

interface VaultEntryProps {
  post: VaultPost & { instagram_auto_posted?: boolean; instagram_post_id?: string | null }
  currentUserId: string
}

export default function VaultEntry({ post, currentUserId }: VaultEntryProps) {
  const photos = (post.photo_order ?? [])
    .map((id) => post.submissions?.find((s) => s.id === id))
    .filter(Boolean) as SubmissionWithUrl[]

  return (
    <article className="bg-cream-100 border border-cream-200 rounded-3xl overflow-hidden shadow-sm shadow-bark-900/5 animate-reveal-bloom">
      {/* Photo grid */}
      <PhotoGridLayout photos={photos} />

      {/* Caption + meta */}
      <div className="p-4 space-y-2">
        <p className="font-display text-lg font-semibold text-bark-900 leading-snug">
          {post.final_caption}
        </p>
        {post.final_song && (
          <p className="text-sm text-stone-warm-500 flex items-center gap-1.5">
            <span>🎵</span> {post.final_song}
          </p>
        )}
        <p className="text-xs text-stone-warm-400">{formatDate(post.published_at)}</p>

        {/* Footer: download + IG badge */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <DownloadButton
            postId={post.id}
            weekLabel={formatShortDate(post.published_at).replace(' ', '-').toLowerCase()}
          />
          {post.instagram_auto_posted && (
            <span className="flex items-center gap-1 text-xs text-stone-warm-500 font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Auto-posted to Instagram
            </span>
          )}
        </div>

        {/* Private notes section */}
        {post.submissions?.some(
          (s) => s.user_id === currentUserId && s.private_note
        ) && (
          <div className="mt-3 pt-3 border-t border-cream-200">
            <p className="text-xs font-medium text-stone-warm-500 mb-1">Your private note</p>
            <p className="text-sm text-bark-800 italic">
              "{post.submissions.find((s) => s.user_id === currentUserId)?.private_note}"
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

function PhotoGridLayout({ photos }: { photos: SubmissionWithUrl[] }) {
  if (photos.length === 0) return null

  if (photos.length === 1) {
    return (
      <div className="relative aspect-square">
        <MediaItem submission={photos[0]} />
      </div>
    )
  }

  if (photos.length === 2) {
    return (
      <div className="flex gap-0.5 aspect-square">
        {photos.map((p) => (
          <div key={p.id} className="relative flex-1">
            <MediaItem submission={p} />
          </div>
        ))}
      </div>
    )
  }

  if (photos.length === 3) {
    return (
      <div className="flex gap-0.5 aspect-square">
        <div className="relative flex-1">
          <MediaItem submission={photos[0]} />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="relative flex-1">
            <MediaItem submission={photos[1]} />
          </div>
          <div className="relative flex-1">
            <MediaItem submission={photos[2]} />
          </div>
        </div>
      </div>
    )
  }

  if (photos.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5 aspect-square">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square">
            <MediaItem submission={p} />
          </div>
        ))}
      </div>
    )
  }

  // 5+: 3-column grid
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {photos.map((p) => (
        <div key={p.id} className="relative aspect-square">
          <MediaItem submission={p} />
        </div>
      ))}
    </div>
  )
}

function MediaItem({ submission }: { submission: SubmissionWithUrl }) {
  const url = submission.thumbnail_signed_url ?? submission.signed_url
  return (
    <>
      <Image
        src={url}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 390px) 50vw, 200px"
      />
      {submission.media_type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">
            ▶
          </div>
        </div>
      )}
    </>
  )
}
