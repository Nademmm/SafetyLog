import * as React from 'react'
import { generateQrMatrix } from '@/lib/qrcode'
import { cn } from '@/lib/utils'

export interface QrCodeSvgProps extends React.SVGProps<SVGSVGElement> {
  value: string
  size?: number
  quietZone?: number
  label?: string
}

/**
 * QrCodeSvg — Renders a high-contrast ISO/IEC 18004 QR Code SVG.
 * Uses pure black on white for reliable mobile camera scanning on factory floors and printed labels.
 */
export function QrCodeSvg({
  value,
  size = 188,
  quietZone = 3,
  label,
  className,
  ...props
}: QrCodeSvgProps) {
  const matrix = React.useMemo(() => generateQrMatrix(value), [value])
  const moduleCount = matrix.length
  const totalModules = moduleCount + quietZone * 2

  const pathData = React.useMemo(() => {
    const segments: string[] = []
    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (matrix[y][x]) {
          const px = x + quietZone
          const py = y + quietZone
          segments.push(`M${px} ${py}h1v1h-1z`)
        }
      }
    }
    return segments.join('')
  }, [matrix, moduleCount, quietZone])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label ?? `Kode QR untuk ${value}`}
      className={cn('block select-none rounded-sm bg-white', className)}
      {...props}
    >
      <rect width={totalModules} height={totalModules} fill="#FFFFFF" />
      <path d={pathData} fill="#111418" />
    </svg>
  )
}
