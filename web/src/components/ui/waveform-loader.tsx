import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/i18n-helpers'
import { cn } from '@/lib/utils'

export interface WaveformLoaderProps {
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function WaveformLoader({
  label,
  size = 'md',
  className,
}: WaveformLoaderProps) {
  const { pick } = useLanguage()
  const heights = size === 'sm' ? [4, 16, 4] : [6, 24, 6]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label || pick('Memuat data', 'Loading data')}
      className={cn('inline-flex flex-col items-center justify-center gap-2.5', className)}
    >
      <div className={cn('flex items-center space-x-1', size === 'sm' ? 'h-5' : 'h-8')}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              'rounded-full bg-[var(--accent)]',
              size === 'sm' ? 'w-0.5' : 'w-1',
            )}
            animate={{ height: heights }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: Math.sin(i) * 0.45,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-[13px] font-medium text-[var(--muted)]">{label}</span>
      )}
    </div>
  )
}

export function SectionLoading({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  const { pick } = useLanguage()
  return (
    <div className={cn('flex items-center justify-center py-10 px-5', className)}>
      <WaveformLoader label={label ?? pick('Memuat data...', 'Loading data...')} />
    </div>
  )
}

export default WaveformLoader
