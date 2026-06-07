interface StatusIndicatorProps {
  submitted: boolean
  isOwn?: boolean
}

export default function StatusIndicator({ submitted, isOwn }: StatusIndicatorProps) {
  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold text-sm">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Submitted ✓
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-stone-warm-500 text-sm">
      <span className="w-2 h-2 rounded-full bg-stone-warm-400" />
      {isOwn ? 'Your drop is waiting...' : 'Waiting...'}
    </span>
  )
}
