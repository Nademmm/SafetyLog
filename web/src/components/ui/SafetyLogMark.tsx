import { cn } from '@/lib/utils'

interface SafetyLogMarkProps {
  className?: string
  size?: number
}

export function SafetyLogMark({ className, size = 24 }: SafetyLogMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="SafetyLog"
      className={cn('shrink-0', className)}
    >
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="#111418"
        stroke="#343D47"
        strokeWidth="2"
      />
      <g transform="translate(8, 8)">
        <polygon
          points="24,3 42,13.5 42,34.5 24,45 6,34.5 6,13.5"
          fill="#1C2229"
          stroke="#F4F5F6"
          strokeWidth="2.75"
          strokeLinejoin="round"
        />
        <rect x="15.5" y="15.5" width="7" height="7" rx="1.75" fill="#F4F5F6" />
        <rect x="25.5" y="15.5" width="7" height="7" rx="1.75" fill="#F97316" />
        <rect x="15.5" y="25.5" width="7" height="7" rx="1.75" fill="#A3AAB3" />
        <rect x="25.5" y="25.5" width="7" height="7" rx="1.75" fill="#F4F5F6" />
      </g>
    </svg>
  )
}
