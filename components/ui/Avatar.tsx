import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

const warmColors = [
  'bg-honey-400 text-bark-900',
  'bg-ember-400 text-white',
  'bg-cream-300 text-bark-900',
  'bg-honey-600 text-white',
  'bg-bark-700 text-cream-50',
]

function getColor(name: string): string {
  const idx = name.charCodeAt(0) % warmColors.length
  return warmColors[idx]
}

export default function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizeClass = sizes[size]
  const color = getColor(name)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 font-semibold',
        sizeClass,
        !src && color,
        className
      )}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" sizes="80px" />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
