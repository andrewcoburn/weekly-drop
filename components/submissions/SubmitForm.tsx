'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface SubmitFormProps {
  cycleId: string
  groupId: string
  userId: string
}

export default function SubmitForm({ cycleId, groupId, userId }: SubmitFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function extractVideoThumbnail(videoFile: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = URL.createObjectURL(videoFile)
      video.muted = true
      video.addEventListener('loadeddata', () => {
        video.currentTime = 0.5
      })
      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src)
          if (blob) resolve(blob)
          else reject(new Error('Failed to extract thumbnail'))
        }, 'image/jpeg', 0.85)
      })
      video.addEventListener('error', reject)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    const isVideo = f.type.startsWith('video/')
    const isImage = f.type.startsWith('image/')

    if (!isVideo && !isImage) {
      setError('Please select a photo or video.')
      return
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('File must be under 100 MB.')
      return
    }

    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))

    if (isVideo) {
      try {
        const thumb = await extractVideoThumbnail(f)
        setThumbnailBlob(thumb)
      } catch {
        // non-fatal — video will still upload, just without thumbnail
      }
    }
  }

  async function handleSubmit() {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const isVideo = file.type.startsWith('video/')
      const ext = file.name.split('.').pop()
      const basePath = `${groupId}/${cycleId}/${userId}`
      const mediaPath = `${basePath}/media.${ext}`

      // Upload media
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(mediaPath, file, { upsert: true })
      if (uploadError) throw uploadError

      // Upload thumbnail if video
      let thumbnailPath: string | null = null
      if (isVideo && thumbnailBlob) {
        thumbnailPath = `${basePath}/thumbnail.jpg`
        const { error: thumbError } = await supabase.storage
          .from('submissions')
          .upload(thumbnailPath, thumbnailBlob, { upsert: true, contentType: 'image/jpeg' })
        if (thumbError) console.warn('Thumbnail upload failed:', thumbError)
      }

      // Insert submission record
      const { error: insertError } = await supabase.from('submissions').insert({
        cycle_id: cycleId,
        user_id: userId,
        media_url: mediaPath,
        media_type: isVideo ? 'video' : 'photo',
        thumbnail_url: thumbnailPath,
        private_note: note.trim() || null,
      })
      if (insertError) throw insertError

      router.push(`/groups/${groupId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full aspect-square max-h-80 rounded-3xl border-2 border-dashed border-honey-400 bg-cream-100 hover:bg-cream-200 transition-colors flex flex-col items-center justify-center gap-3 overflow-hidden relative"
      >
        {preview ? (
          <>
            {file?.type.startsWith('video/') ? (
              <video src={preview} className="absolute inset-0 w-full h-full object-cover rounded-3xl" muted playsInline />
            ) : (
              <Image src={preview} alt="Preview" fill className="object-cover rounded-3xl" sizes="390px" />
            )}
            <div className="absolute inset-0 bg-bark-900/30 rounded-3xl flex items-center justify-center">
              <span className="text-white font-semibold text-sm bg-bark-900/50 px-3 py-1.5 rounded-full">
                Tap to change
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-4xl">📸</span>
            <div className="text-center">
              <p className="font-semibold text-bark-800">Drop your memory here</p>
              <p className="text-sm text-stone-warm-500 mt-0.5">Photo or video · up to 100 MB</p>
            </div>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Private note */}
      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">
          Private note <span className="text-stone-warm-400 font-normal">(only you'll ever see this)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What were you thinking? How did this moment feel?"
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 bg-cream-100 border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 text-sm focus:border-honey-500 focus:bg-white transition-colors resize-none"
        />
        <p className="text-right text-xs text-stone-warm-400 mt-1">{note.length}/500</p>
      </div>

      {error && (
        <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
          {error}
        </p>
      )}

      <Button
        fullWidth
        size="lg"
        onClick={handleSubmit}
        disabled={!file}
        loading={uploading}
      >
        {uploading ? 'Uploading...' : 'Drop it 🎯'}
      </Button>
    </div>
  )
}
