'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import Link from 'next/link'
import TopNav from '@/components/TopNav'

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

export default function BTRProjectDetail() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [lotMatrix, setLotMatrix] = useState<any[]>([])
  const [productMix, setProductMix] = useState<any[]>([])
  const [returns, setReturns] = useState<any>(null)
  const [feeTotal, setFeeTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProject()
  }, [])

  async function loadProject() {
    const [projRes, lotsRes, prodsRes, retRes, feeRes] = await Promise.all([
      supabase.from('btr_projects').select('*').eq('id', params.id).single(),
      supabase.from('btr_lot_matrix').select('*').eq('project_id', params.id).order('sort_order'),
      supabase.from('btr_product_mix').select('*').eq('project_id', params.id).order('sort_order'),
      supabase.from('btr_calculated_returns').select('*').eq('project_id', params.id).single(),
      supabase.from('btr_rc_fee_profile').select('total_amount, is_included').eq('project_id', params.id),
    ])

    if (projRes.data) setProject(projRes.data)
    if (lotsRes.data) setLotMatrix(lotsRes.data)
    if (prodsRes.data) setProductMix(prodsRes.data)
    if (retRes.data) setReturns(retRes.data)
    if (feeRes.data) setFeeTotal(feeRes.data.filter((f: any) => f.is_included).reduce((s: number, f: any) => s + (f.total_amount || 0), 0))
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
  if (!project) return <div className="min-h-screen flex items-center justify-center text-slate-500">Project not found</div>

  const st = STATUS_LABELS[project.status] || STATUS_LABELS.intake
  const totalProductUnits = productMix.reduce((s: number, p: any) => s + (p.unit_count || 0), 0)
  const totalLots = lotMatrix.reduce((s: number, l: any) => s + (l.lot_count || 0), 0)

  function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
      <div className={`flex justify-between py-1.5 ${bold ? 'border-t border-slate-700/50 pt-2 mt-1' : ''}`}>
        <span className={bold ? 'text-slate-200 font-medium' : 'text-slate-400'}>{label}</span>
        <span className={`font-mono ${bold ? 'font-medium' : ''}`}>{value}</span>
      </div>
    )
  }

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />

      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/btr" className="btn-ghost">&larr; Pipeline</Link>
            <div>
              <h2 className="text-sm font-medium text-slate-100">{project.name}</h2>
              <p className="text-xs text-slate-500">
                {[project.city, project.county, project.state].filter(Boolean).join(', ')}
                {project.property_type && ` · ${project.property_type}`}
                {` · ${project.scope === 'horizontal_and_vertical' ? 'H+V' : 'Vertical Only'}`}
              </p>
            </div>
          </div>
          <span className={`badge border ${st.color}`}>{st.label}</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <div className="card p-3 text-center">
            <div className="stat-value text-lg text-slate-100">{project.total_units || '—'}</div>
            <div className="stat-label">Units</div>
          </div>
          <div className="card p-3 text-center">
            <div className="stat-value text-lg text-slate-100">{project.avg_sf_per_unit || '—'}</div>
            <div className="stat-label">Avg SF</div>
          </div>
          <div className="card p-3 text-center">
            <div className="stat-value text-lg text-slate-100">
              {project.avg_rent_per_unit ? fmt(project.avg_rent_per_unit) : '—'}
            </div>
            <div className="stat-label">Avg Rent</div>
          </div>
          <div className="card p-3 text-center">
            <div className="stat-value text-lg text-slate-300">
              {returns?.total_cost_basis ? fmt(returns.total_cost_basis) : '—'}
            </div>
            <div className="stat-label">Total Cost</div>
          </div>
          <div className="card p-3 text-center">
            <div className="stat-value text-lg text-emerald-400">
              {returns?.stabilized_noi ? fmt(returns.stabilized_noi) : '—'}
            </div>
            <div className="stat-label">Stab. NOI</div>
          </div>
          <div className="card p-3 text-center">
            <div className="stat-value text-lg text-cyan-400">
              {returns?.yield_on_cost ? (returns.yield_on_cost * 100).toFixed(2) + '%' : '—'}
            </div>
            <div className="stat-label">YOC</div>
          </div>
          <div className="card p-3 text-center">
            <div className={`stat-value text-lg ${returns?.dscr >= 1.25 ? 'text-emerald-400' : returns?.dscr >= 1.0 ? 'text-amber-400' : 'text-slate-500'}`}>
              {returns?.dscr ? returns.dscr.toFixed(2) + 'x' : '—'}
            </div>
            <div className="stat-label">DSCR</div>
          </div>
          <div className="card p-3 text-center border-red-500/10">
            <div className="stat-value text-lg text-red-400/80">
              {feeTotal > 0 ? fmt(feeTotal) : '—'}
            </div>
            <div className="stat-label text-red-400/50">RC Fees</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Info */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Project Info</h3>
            <div className="text-sm space-y-1">
              <Row label="Operator" value={project.btr_operator || '—'} />
              <Row label="Developer" value={project.developer || '—'} />
              <Row label="Lender" value={project.lender || '—'} />
              <Row label="Acreage" value={project.acreage ? `${project.acreage} ac` : '—'} />
              <Row label="Construction" value={project.construction_months ? `${project.construction_months} months` : '—'} />
              <Row label="Zoning" value={project.current_zoning || '—'} />
            </div>
          </div>

          {/* Lot Matrix Summary */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Lot Matrix</h3>
            {lotMatrix.length === 0 ? (
              <p className="text-sm text-slate-500">No lot types defined yet.</p>
            ) : (
              <div className="text-sm space-y-1">
                {lotMatrix.map((lot: any) => (
                  <Row key={lot.id}
                       label={`${lot.lot_type_name} (${lot.product_type})`}
                       value={`${lot.lot_count || 0} lots · ${lot.lot_width || '?'}'×${lot.lot_depth || '?'}'`} />
                ))}
                <Row label="Total Lots" value={String(totalLots)} bold />
              </div>
            )}
          </div>

          {/* Product Mix */}
          <div className="card p-5 space-y-3 md:col-span-2">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Product Mix</h3>
            {productMix.length === 0 ? (
              <p className="text-sm text-slate-500">No products defined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      <th className="table-header">Plan</th>
                      <th className="table-header text-right">Units</th>
                      <th className="table-header text-right">SF</th>
                      <th className="table-header text-right">Bed/Bath</th>
                      <th className="table-header">Garage</th>
                      <th className="table-header text-right">Target Rent</th>
                      <th className="table-header text-right">Base S&B</th>
                      <th className="table-header text-right">Adder/Soft</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {productMix.map((prod: any) => (
                      <tr key={prod.id}>
                        <td className="table-cell font-mono text-slate-200">{prod.plan_name}</td>
                        <td className="table-cell text-right font-mono">{prod.unit_count}</td>
                        <td className="table-cell text-right font-mono text-slate-400">{prod.heated_sf || '—'}</td>
                        <td className="table-cell text-right text-slate-400">
                          {prod.bedrooms || '?'}/{prod.bathrooms || '?'}
                        </td>
                        <td className="table-cell text-slate-400">{prod.garage_type || '—'}</td>
                        <td className="table-cell text-right font-mono">
                          {prod.target_rent_monthly ? fmt(prod.target_rent_monthly) : '—'}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {prod.base_cost ? fmt(prod.base_cost) : '—'}
                        </td>
                        <td className="table-cell text-right font-mono text-slate-400">
                          {prod.adder_soft_costs ? fmt(prod.adder_soft_costs) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-700/50">
                      <td className="table-cell font-medium text-slate-200">Totals</td>
                      <td className="table-cell text-right font-mono font-medium">{totalProductUnits}</td>
                      <td colSpan={6}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Placeholder modules */}
          {/* Development Budget */}
          <Link href={`/btr/project/${params.id}/budget`}
                className="card p-5 space-y-3 hover:border-cedar-600/40 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Development Budget</h3>
              <span className="text-xs text-cedar-400 group-hover:text-cedar-300 transition-colors">Open Editor →</span>
            </div>
            <p className="text-sm text-slate-500">S-curve cost distribution, line-item budget by category, construction draw schedule.</p>
          </Link>

          {/* Vertical Timeline */}
          <Link href={`/btr/project/${params.id}/timeline`}
                className="card p-5 space-y-3 hover:border-cedar-600/40 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Vertical Timeline</h3>
              <span className="text-xs text-cedar-400 group-hover:text-cedar-300 transition-colors">Open Editor →</span>
            </div>
            <p className="text-sm text-slate-500">Unit starts per month, delivery schedule, construction pacing.</p>
          </Link>

          {/* Income & OpEx */}
          <Link href={`/btr/project/${params.id}/income`}
                className="card p-5 space-y-3 hover:border-cedar-600/40 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Income & OpEx</h3>
              <span className="text-xs text-cedar-400 group-hover:text-cedar-300 transition-colors">Open Editor →</span>
            </div>
            <p className="text-sm text-slate-500">Rental income, vacancy, other income, operating expenses, stabilized NOI.</p>
          </Link>

          {/* Financing */}
          <Link href={`/btr/project/${params.id}/financing`}
                className="card p-5 space-y-3 hover:border-cedar-600/40 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Financing</h3>
              <span className="text-xs text-cedar-400 group-hover:text-cedar-300 transition-colors">Open Editor →</span>
            </div>
            <p className="text-sm text-slate-500">Construction loan, permanent loan, equity layers, DSCR.</p>
          </Link>

          {/* RC Fee Profile (Internal) */}
          <Link href={`/btr/project/${params.id}/fees`}
                className="card p-5 space-y-3 hover:border-red-500/20 transition-all duration-200 group border-red-500/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-red-400/80 uppercase tracking-wider font-medium">RCC Fee Profile</h3>
              <span className="text-xs text-red-400/60 group-hover:text-red-300 transition-colors">Internal →</span>
            </div>
            <p className="text-sm text-slate-600">Builder fee, staffed positions, CM fee. Hidden from external views.</p>
          </Link>

          {/* Questionnaire */}
          <Link href={`/btr/project/${params.id}/questionnaire`}
                className="card p-5 space-y-3 hover:border-cedar-600/40 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Questionnaire</h3>
              <span className="text-xs text-cedar-400 group-hover:text-cedar-300 transition-colors">Open →</span>
            </div>
            <p className="text-sm text-slate-500">DD checklist, utility capacity, project contacts, milestone schedule.</p>
          </Link>

          {/* Bids */}
          <Link href={`/btr/project/${params.id}/bids`}
                className="card p-5 space-y-3 hover:border-cedar-600/40 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Bid Comparison</h3>
              <span className="text-xs text-cedar-400 group-hover:text-cedar-300 transition-colors">Open →</span>
            </div>
            <p className="text-sm text-slate-500">Site work bid tracking, comparison, and contractor selection.</p>
          </Link>
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="card p-5 mt-6">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-2">Notes</h3>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </main>
    </div>
  )
}
