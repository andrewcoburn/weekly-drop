import { cn } from '@/lib/utils'

type BadgeVariant = 'warm' | 'success' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  warm: 'bg-honey-100 text-honey-700 border border-honey-300',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-cream-100 text-stone-warm-600 border border-cream-200',
}

// Map missing Tailwind colors to available ones
const adjustedVariants: Record<BadgeVariant, string> = {
  warm: 'bg-honey-400/20 text-honey-700 border border-honey-300',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-honey-400/30 text-bark-800 border border-honey-400',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-cream-100 text-bark-700 border border-cream-200',
}

export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        adjustedVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
