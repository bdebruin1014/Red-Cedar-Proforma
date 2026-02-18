'use client'

import { fmt } from '@/lib/format'

interface TimelineChartProps {
  /** Monthly totals per category: { category: string, monthly: number[], color: string }[] */
  series: { category: string; monthly: number[]; color: string }[]
  totalMonths: number
  height?: number
}

const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D']

export default function TimelineChart({ series, totalMonths, height = 200 }: TimelineChartProps) {
  if (totalMonths <= 0 || series.length === 0) return null

  // Calculate stacked totals per month
  const monthlyStacked: { month: number; segments: { category: string; value: number; color: string }[]; total: number }[] = []

  for (let m = 0; m < totalMonths; m++) {
    const segments = series.map(s => ({
      category: s.category,
      value: s.monthly[m] || 0,
      color: s.color,
    })).filter(seg => seg.value > 0)

    monthlyStacked.push({
      month: m,
      segments,
      total: segments.reduce((sum, seg) => sum + seg.value, 0),
    })
  }

  const maxMonthly = Math.max(...monthlyStacked.map(m => m.total), 1)
  const barWidth = Math.max(6, Math.min(24, (700 - totalMonths * 2) / totalMonths))
  const chartWidth = totalMonths * (barWidth + 2)
  const chartHeight = height - 30

  // Cumulative line
  let cumulative = 0
  const cumulativePoints = monthlyStacked.map((m, i) => {
    cumulative += m.total
    return { x: i * (barWidth + 2) + barWidth / 2, y: cumulative }
  })
  const maxCumulative = cumulative || 1

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: chartWidth + 60 }}>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3">
          {series.map(s => (
            <div key={s.category} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] text-slate-500">{s.category}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-amber-400/60" />
            <span className="text-[10px] text-slate-500">Cumulative</span>
          </div>
        </div>

        <svg width={chartWidth + 40} height={height} className="overflow-visible">
          {/* Bars */}
          {monthlyStacked.map((m, mi) => {
            let yOffset = chartHeight
            return (
              <g key={mi}>
                {m.segments.map((seg, si) => {
                  const segHeight = (seg.value / maxMonthly) * (chartHeight - 10)
                  yOffset -= segHeight
                  return (
                    <rect
                      key={si}
                      x={mi * (barWidth + 2)}
                      y={yOffset}
                      width={barWidth}
                      height={segHeight}
                      rx={1}
                      fill={seg.color}
                      opacity={0.75}
                    >
                      <title>{seg.category}: {fmt(seg.value)}</title>
                    </rect>
                  )
                })}
              </g>
            )
          })}

          {/* Cumulative line */}
          {cumulativePoints.length > 1 && (
            <polyline
              points={cumulativePoints.map(p =>
                `${p.x},${chartHeight - (p.y / maxCumulative) * (chartHeight - 10)}`
              ).join(' ')}
              fill="none"
              stroke="rgba(251,191,36,0.5)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          )}

          {/* Month labels */}
          {monthlyStacked.map((m, mi) => {
            if (totalMonths > 36 && mi % 3 !== 0) return null
            if (totalMonths > 60 && mi % 6 !== 0) return null
            return (
              <text
                key={mi}
                x={mi * (barWidth + 2) + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                className="fill-slate-600"
                fontSize={9}
              >
                {mi + 1}
              </text>
            )
          })}
        </svg>

        {/* Totals */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[10px] text-slate-500">Month 1</span>
          <span className="text-[10px] text-slate-500">
            Total: {fmt(cumulative)} over {totalMonths} months
          </span>
          <span className="text-[10px] text-slate-500">Month {totalMonths}</span>
        </div>
      </div>
    </div>
  )
}
