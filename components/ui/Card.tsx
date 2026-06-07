import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padded?: boolean
  onClick?: () => void
}

export default function Card({ children, className, padded = true, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-cream-100 border border-cream-200 rounded-3xl',
        'shadow-sm shadow-bark-900/5',
        padded && 'p-4',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform duration-100',
        className
      )}
    >
      {children}
    </div>
  )
}
