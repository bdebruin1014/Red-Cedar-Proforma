'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import Link from 'next/link'
import TopNav from '@/components/TopNav'

interface BTRProject {
  id: string
  name: string
  scope: string
  status: string
  property_type: string | null
  city: string | null
  state: string | null
  county: string | null
  total_units: number | null
  avg_rent_per_unit: number | null
  btr_operator: string | null
  created_at: string
  btr_calculated_returns: {
    total_cost_basis: number | null
    yield_on_cost: number | null
    rc_total_fee_income: number | null
  }[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  intake: { label: 'Intake', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  preliminary_lc: { label: 'Prelim LC', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  exit_dd: { label: 'Exit DD', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  closing: { label: 'Closing', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  construction: { label: 'Construction', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  lease_up: { label: 'Lease-Up', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  stabilized: { label: 'Stabilized', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  archived: { label: 'Archived', color: 'bg-slate-600/20 text-slate-500 border-slate-600/30' },
}

const SCOPE_LABELS: Record<string, string> = {
  vertical_only: 'Vertical Only',
  horizontal_and_vertical: 'H+V',
}

export default function BTRDashboard() {
  const [projects, setProjects] = useState<BTRProject[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const { data, error } = await supabase
      .from('btr_projects')
      .select(`
        id, name, scope, status, property_type, city, state, county,
        total_units, avg_rent_per_unit, btr_operator, created_at,
        btr_calculated_returns (total_cost_basis, yield_on_cost, rc_total_fee_income)
      `)
      .order('created_at', { ascending: false })

    if (data) setProjects(data as BTRProject[])
    setLoading(false)
  }

  const totalProjects = projects.length
  const totalUnits = projects.reduce((sum, p) => sum + (p.total_units || 0), 0)
  const activeProjects = projects.filter(p =>
    ['preliminary_lc', 'exit_dd', 'closing', 'approved', 'construction'].includes(p.status)
  ).length

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />

      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-300">BTR Proforma</h2>
            <p className="text-xs text-slate-500">RCC Fee-Build Underwriting</p>
          </div>
          <Link href="/btr/project/new" className="btn-primary">
            + New Project
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="stat-value text-slate-100">{totalProjects}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="card p-5">
            <div className="stat-value text-cyan-400">{activeProjects}</div>
            <div className="stat-label">Active Pipeline</div>
          </div>
          <div className="card p-5">
            <div className="stat-value text-slate-100">{totalUnits.toLocaleString()}</div>
            <div className="stat-label">Total Units</div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">BTR Pipeline</h2>
            <span className="text-xs text-slate-500">{totalProjects} projects</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 mb-4">No BTR projects yet.</p>
              <Link href="/btr/project/new" className="btn-primary">+ New Project</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-800/60">
                  <tr>
                    <th className="table-header">Project</th>
                    <th className="table-header">Scope</th>
                    <th className="table-header text-right">Units</th>
                    <th className="table-header text-right">Avg Rent</th>
                    <th className="table-header">Operator</th>
                    <th className="table-header text-center">Status</th>
                    <th className="table-header text-right">Total Cost</th>
                    <th className="table-header text-right">YOC</th>
                    <th className="table-header text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {projects.map(proj => {
                    const r = proj.btr_calculated_returns?.[0]
                    const st = STATUS_LABELS[proj.status] || STATUS_LABELS.intake
                    return (
                      <tr
                        key={proj.id}
                        className="hover:bg-slate-800/20 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/btr/project/${proj.id}`}
                      >
                        <td className="table-cell">
                          <div className="font-medium text-slate-200">{proj.name}</div>
                          <div className="text-xs text-slate-500">
                            {[proj.city, proj.county, proj.state].filter(Boolean).join(', ') || 'No location'}
                            {proj.property_type && <span className="ml-1">· {proj.property_type}</span>}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="text-xs text-slate-400 font-mono">{SCOPE_LABELS[proj.scope] || proj.scope}</span>
                        </td>
                        <td className="table-cell text-right font-mono">{proj.total_units || '—'}</td>
                        <td className="table-cell text-right font-mono text-slate-400">
                          {proj.avg_rent_per_unit ? fmt(proj.avg_rent_per_unit) : '—'}
                        </td>
                        <td className="table-cell text-sm text-slate-400">{proj.btr_operator || '—'}</td>
                        <td className="table-cell text-center">
                          <span className={`badge border ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="table-cell text-right font-mono">
                          {r?.total_cost_basis ? fmt(r.total_cost_basis) : '—'}
                        </td>
                        <td className="table-cell text-right font-mono text-slate-400">
                          {r?.yield_on_cost ? (r.yield_on_cost * 100).toFixed(2) + '%' : '—'}
                        </td>
                        <td className="table-cell text-right text-slate-500 text-xs">
                          {new Date(proj.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
