'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface TimelineRow {
  month_number: number
  units_started: number
}

export default function VerticalTimelinePage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [rows, setRows] = useState<TimelineRow[]>([])
  const [buildDuration, setBuildDuration] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paceMode, setPaceMode] = useState<'manual' | 'even'>('manual')
  const [evenPace, setEvenPace] = useState(10)

  const projectId = params.id as string
  const totalMonths = project?.construction_months || 24
  const totalUnits = project?.total_units || 0

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [projRes, tlRes] = await Promise.all([
      supabase.from('btr_projects').select('*').eq('id', projectId).single(),
      supabase.from('btr_vertical_timeline').select('*').eq('project_id', projectId).order('month_number'),
    ])

    if (projRes.data) setProject(projRes.data)
    if (tlRes.data && tlRes.data.length > 0) {
      setBuildDuration(tlRes.data[0]?.months_to_build_one_unit || 5)
      setRows(tlRes.data.map((r: any) => ({
        month_number: r.month_number,
        units_started: r.units_started || 0,
      })))
    } else {
      // Initialize empty rows
      const pm = projRes.data?.construction_months || 24
      setRows(Array.from({ length: pm }, (_, i) => ({
        month_number: i + 1,
        units_started: 0,
      })))
    }
    setLoading(false)
  }

  function applyEvenPace() {
    const startMonth = 3 // start unit starts in month 3
    setRows(prev => prev.map(r => ({
      ...r,
      units_started: r.month_number >= startMonth && unitsAssigned(prev, r.month_number, startMonth) < totalUnits
        ? Math.min(evenPace, totalUnits - unitsAssigned(prev, r.month_number, startMonth))
        : 0,
    })))

    // Recalculate with even pace
    const newRows: TimelineRow[] = []
    let assigned = 0
    for (let m = 1; m <= totalMonths; m++) {
      let starts = 0
      if (m >= 3 && assigned < totalUnits) {
        starts = Math.min(evenPace, totalUnits - assigned)
        assigned += starts
      }
      newRows.push({ month_number: m, units_started: starts })
    }
    setRows(newRows)
  }

  function unitsAssigned(rows: TimelineRow[], upToMonth: number, startMonth: number): number {
    return rows.filter(r => r.month_number >= startMonth && r.month_number < upToMonth)
      .reduce((s, r) => s + r.units_started, 0)
  }

  function updateStarts(month: number, value: number) {
    setRows(prev => prev.map(r =>
      r.month_number === month ? { ...r, units_started: Math.max(0, value) } : r
    ))
  }

  // Derived: delivery and cumulative
  const computed = useMemo(() => {
    const result: {
      month: number
      started: number
      cumStarted: number
      delivered: number
      cumDelivered: number
      underConstruction: number
    }[] = []

    let cumStarted = 0
    let cumDelivered = 0
    const startQueue: number[] = [] // month each batch was started

    for (let m = 0; m < rows.length; m++) {
      const r = rows[m]
      cumStarted += r.units_started

      // Track when units started
      for (let i = 0; i < r.units_started; i++) {
        startQueue.push(r.month_number)
      }

      // Count deliveries: units started buildDuration months ago
      const deliveryMonth = r.month_number - buildDuration
      const delivered = startQueue.filter(sm => sm === deliveryMonth + 1).length
      // Actually simpler: units started in month (current - buildDuration)
      const startedThatMonth = rows.find(row => row.month_number === r.month_number - buildDuration)
      const del = startedThatMonth?.units_started || 0
      cumDelivered += del

      result.push({
        month: r.month_number,
        started: r.units_started,
        cumStarted,
        delivered: del,
        cumDelivered,
        underConstruction: cumStarted - cumDelivered,
      })
    }

    return result
  }, [rows, buildDuration])

  const totalAssigned = rows.reduce((s, r) => s + r.units_started, 0)
  const remaining = totalUnits - totalAssigned
  const lastDelivery = computed.findLast(c => c.delivered > 0)
  const maxBar = Math.max(...rows.map(r => r.units_started), 1)

  async function saveTimeline() {
    setSaving(true)
    try {
      await supabase.from('btr_vertical_timeline').delete().eq('project_id', projectId)

      const tlRows = computed.map(c => ({
        project_id: projectId,
        months_to_build_one_unit: buildDuration,
        month_number: c.month,
        units_started: c.started,
        units_delivered: c.delivered,
        cumulative_delivered: c.cumDelivered,
        lease_up_units: c.cumDelivered,
      }))

      const { error } = await supabase.from('btr_vertical_timeline').insert(tlRows)
      if (error) throw error

      await loadData()
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving. Check console.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />

      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/btr/project/${projectId}`} className="btn-ghost">&larr; Project</Link>
            <div>
              <h2 className="text-sm font-medium text-slate-100">{project?.name} — Vertical Timeline</h2>
              <p className="text-xs text-slate-500">{totalUnits} units · {totalMonths} months · {buildDuration}-month build</p>
            </div>
          </div>
          <button onClick={saveTimeline} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Timeline'}
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Controls */}
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="input-label">Months to Build 1 Unit</label>
              <input type="number" className="input-field" value={buildDuration}
                     onChange={e => setBuildDuration(parseInt(e.target.value) || 5)} min={1} max={12} />
            </div>
            <div>
              <label className="input-label">Even Pace (units/month)</label>
              <div className="flex gap-2">
                <input type="number" className="input-field" value={evenPace}
                       onChange={e => setEvenPace(parseInt(e.target.value) || 1)} min={1} />
                <button onClick={applyEvenPace} className="btn-ghost border border-slate-700 text-xs whitespace-nowrap">
                  Apply
                </button>
              </div>
            </div>
            <div>
              <label className="input-label">Units Assigned</label>
              <div className={`font-mono text-lg ${remaining === 0 ? 'text-emerald-400' : remaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                {totalAssigned} / {totalUnits}
              </div>
              {remaining !== 0 && (
                <div className="text-xs text-slate-500">{remaining > 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over-assigned`}</div>
              )}
            </div>
            <div>
              <label className="input-label">Last Delivery</label>
              <div className="font-mono text-lg text-slate-300">
                Month {lastDelivery?.month || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="card p-5 mb-6">
          <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-4">Unit Starts by Month</h3>
          <div className="flex items-end gap-0.5 h-32 overflow-x-auto pb-4">
            {rows.map(r => (
              <div key={r.month_number} className="flex flex-col items-center min-w-[16px]">
                <div
                  className="w-3 bg-emerald-500/60 rounded-t transition-all duration-200"
                  style={{ height: `${(r.units_started / maxBar) * 100}px` }}
                  title={`Month ${r.month_number}: ${r.units_started} starts`}
                />
                {(r.month_number % 3 === 1 || totalMonths <= 12) && (
                  <span className="text-[8px] text-slate-600 mt-1">{r.month_number}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="text-sm font-medium text-slate-300">Monthly Schedule</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800/60 sticky top-0 bg-slate-900">
                <tr>
                  <th className="table-header">Month</th>
                  <th className="table-header text-center">Units Started</th>
                  <th className="table-header text-right">Cum. Started</th>
                  <th className="table-header text-right">Delivered</th>
                  <th className="table-header text-right">Cum. Delivered</th>
                  <th className="table-header text-right">Under Construction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {computed.map(c => (
                  <tr key={c.month} className={c.started > 0 || c.delivered > 0 ? 'bg-slate-800/10' : ''}>
                    <td className="table-cell font-mono text-slate-400">{c.month}</td>
                    <td className="table-cell text-center">
                      <input
                        type="number"
                        className="input-field text-xs py-1 text-center w-20 mx-auto"
                        value={c.started || ''}
                        min={0}
                        onChange={e => updateStarts(c.month, parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td className="table-cell text-right font-mono text-slate-300">{c.cumStarted}</td>
                    <td className={`table-cell text-right font-mono ${c.delivered > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                      {c.delivered || '—'}
                    </td>
                    <td className="table-cell text-right font-mono text-slate-300">{c.cumDelivered}</td>
                    <td className="table-cell text-right font-mono text-slate-400">{c.underConstruction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
