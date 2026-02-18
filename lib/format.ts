export function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function pct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

export function npmColor(npm: number): string {
  if (npm > 0.10) return 'text-emerald-400'
  if (npm >= 0.07) return 'text-green-400'
  if (npm >= 0.05) return 'text-amber-400'
  return 'text-red-400'
}

export function npmBg(npm: number): string {
  if (npm > 0.10) return 'bg-emerald-500/20 border-emerald-500/30'
  if (npm >= 0.07) return 'bg-green-500/20 border-green-500/30'
  if (npm >= 0.05) return 'bg-amber-500/20 border-amber-500/30'
  return 'bg-red-500/20 border-red-500/30'
}

export function landColor(ratio: number): string {
  if (ratio < 0.20) return 'text-emerald-400'
  if (ratio <= 0.25) return 'text-green-400'
  if (ratio <= 0.30) return 'text-amber-400'
  return 'text-red-400'
}

export function recBadge(rec: string): string {
  if (rec === 'PROCEED') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
  if (rec === 'PROCEED WITH CAUTION') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  return 'bg-red-500/20 text-red-300 border border-red-500/30'
}
