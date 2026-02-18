'use client'

import { generateSCurve } from '@/lib/scurve'

interface SCurveChartProps {
  durationMonths: number
  rate: string
  totalAmount?: number
  height?: number
  width?: number
  showLabels?: boolean
}

export default function SCurveChart({
  durationMonths,
  rate,
  totalAmount,
  height = 40,
  width = 160,
  showLabels = false,
}: SCurveChartProps) {
  if (durationMonths <= 0) return null

  const curve = generateSCurve(durationMonths, rate)
  const maxVal = Math.max(...curve)
  if (maxVal === 0) return null

  const barWidth = Math.max(2, (width - (curve.length - 1)) / curve.length)
  const gap = 1
  const totalWidth = curve.length * (barWidth + gap) - gap

  return (
    <div className="inline-flex flex-col items-center">
      <svg width={totalWidth} height={height} className="overflow-visible">
        {curve.map((val, i) => {
          const barHeight = (val / maxVal) * (height - 2)
          const x = i * (barWidth + gap)
          const y = height - barHeight
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={1}
              className="fill-cedar-500/60"
            />
          )
        })}
      </svg>
      {showLabels && totalAmount && (
        <div className="flex justify-between w-full mt-1">
          <span className="text-[9px] text-slate-600">M1</span>
          <span className="text-[9px] text-slate-600">M{durationMonths}</span>
        </div>
      )}
    </div>
  )
}
