'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface FinancingLayer {
  id: string
  _local_id?: string
  layer_type: string
  lender_name: string
  amount: number
  ltc_or_ltv_pct: number | null
  interest_rate: number
  term_months: number
  amortization_months: number | null
  origination_fee_pct: number
  exit_fee_pct: number
  interest_reserve: number
  funding_method: string
  day_count_basis: number
  sort_order: number
  notes: string
  _new?: boolean
}

const LAYER_TYPES = [
  { value: 'construction_loan', label: 'Construction Loan' },
  { value: 'permanent_loan', label: 'Permanent Loan' },
  { value: 'land_loan', label: 'Land Loan' },
  { value: 'mezzanine', label: 'Mezzanine Debt' },
  { value: 'equity_lp', label: 'LP Equity' },
  { value: 'equity_gp', label: 'GP Equity' },
]

const FUNDING_METHODS = [
  { value: 'equity_first', label: 'Equity First' },
  { value: 'pari_passu', label: 'Pari Passu' },
  { value: 'loan_first', label: 'Loan First' },
]

let localId = 0

export default function FinancingPage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [layers, setLayers] = useState<FinancingLayer[]>([])
  const [totalCostBasis, setTotalCostBasis] = useState(0)
  const [stabilizedNoi, setStabilizedNoi] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const projectId = params.id as string

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [projRes, finRes, retRes] = await Promise.all([
      supabase.from('btr_projects').select('*').eq('id', projectId).single(),
      supabase.from('btr_financing').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('btr_calculated_returns').select('total_cost_basis, stabilized_noi').eq('project_id', projectId).single(),
    ])
    if (projRes.data) setProject(projRes.data)
    if (retRes.data) {
      setTotalCostBasis(retRes.data.total_cost_basis || 0)
      setStabilizedNoi(retRes.data.stabilized_noi || 0)
    }
    if (finRes.data && finRes.data.length > 0) {
      setLayers(finRes.data.map((r: any) => ({ ...r, _new: false })))
    }
    setLoading(false)
  }

  function initDefaults() {
    const constructionLoanAmt = totalCostBasis * 0.70
    setLayers([
      {
        id: '', _local_id: `fl${++localId}`, layer_type: 'construction_loan',
        lender_name: '', amount: Math.round(constructionLoanAmt),
        ltc_or_ltv_pct: 0.70, interest_rate: 0.11, term_months: 36,
        amortization_months: null, origination_fee_pct: 0.02, exit_fee_pct: 0,
        interest_reserve: 0, funding_method: 'equity_first', day_count_basis: 360,
        sort_order: 0, notes: '', _new: true,
      },
      {
        id: '', _local_id: `fl${++localId}`, layer_type: 'permanent_loan',
        lender_name: '', amount: 0,
        ltc_or_ltv_pct: 0.65, interest_rate: 0.065, term_months: 120,
        amortization_months: 360, origination_fee_pct: 0.01, exit_fee_pct: 0,
        interest_reserve: 0, funding_method: 'equity_first', day_count_basis: 360,
        sort_order: 1, notes: 'Refi after stabilization', _new: true,
      },
      {
        id: '', _local_id: `fl${++localId}`, layer_type: 'equity_lp',
        lender_name: '', amount: Math.round(totalCostBasis - constructionLoanAmt),
        ltc_or_ltv_pct: null, interest_rate: 0, term_months: 0,
        amortization_months: null, origination_fee_pct: 0, exit_fee_pct: 0,
        interest_reserve: 0, funding_method: 'equity_first', day_count_basis: 360,
        sort_order: 2, notes: '', _new: true,
      },
    ])
  }

  function updateLayer(id: string, localId: string | undefined, field: string, value: any) {
    setLayers(prev => prev.map(l => {
      const match = id ? l.id === id : l._local_id === localId
      if (!match) return l
      const u = { ...l, [field]: value }

      // Auto-calc amount from LTC if LTC changes and we have total cost
      if (field === 'ltc_or_ltv_pct' && totalCostBasis > 0 && (u.layer_type === 'construction_loan' || u.layer_type === 'land_loan')) {
        u.amount = Math.round(totalCostBasis * (parseFloat(value) || 0))
      }

      return u
    }))
  }

  function addLayer() {
    setLayers(prev => [...prev, {
      id: '', _local_id: `fl${++localId}`, layer_type: 'mezzanine',
      lender_name: '', amount: 0, ltc_or_ltv_pct: null, interest_rate: 0,
      term_months: 36, amortization_months: null, origination_fee_pct: 0,
      exit_fee_pct: 0, interest_reserve: 0, funding_method: 'equity_first',
      day_count_basis: 360, sort_order: prev.length, notes: '', _new: true,
    }])
  }

  function removeLayer(id: string, localId: string | undefined) {
    setLayers(prev => prev.filter(l => id ? l.id !== id : l._local_id !== localId))
  }

  // Calculations
  const calcs = useMemo(() => {
    const constructionLoan = layers.find(l => l.layer_type === 'construction_loan')
    const permLoan = layers.find(l => l.layer_type === 'permanent_loan')
    const equityLayers = layers.filter(l => l.layer_type.startsWith('equity'))
    const debtLayers = layers.filter(l => !l.layer_type.startsWith('equity'))

    const totalDebt = debtLayers.reduce((s, l) => s + (l.amount || 0), 0)
    const totalEquity = equityLayers.reduce((s, l) => s + (l.amount || 0), 0)
    const totalSources = totalDebt + totalEquity

    // Construction interest estimate (simple: avg outstanding * rate * term)
    let constructionInterest = 0
    if (constructionLoan && constructionLoan.amount > 0) {
      const avgOutstanding = constructionLoan.amount * 0.55 // S-curve average ~55%
      const days = (constructionLoan.term_months || 36) * 30
      constructionInterest = avgOutstanding * (constructionLoan.interest_rate || 0) / (constructionLoan.day_count_basis || 360) * days
    }

    // Origination fees
    const originationFees = debtLayers.reduce((s, l) => s + (l.amount || 0) * (l.origination_fee_pct || 0), 0)

    // Permanent loan monthly payment (amortizing)
    let permMonthlyPayment = 0
    if (permLoan && permLoan.amount > 0 && permLoan.amortization_months && permLoan.interest_rate > 0) {
      const r = permLoan.interest_rate / 12
      const n = permLoan.amortization_months
      permMonthlyPayment = permLoan.amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    }

    const annualDebtService = permMonthlyPayment * 12
    const dscr = annualDebtService > 0 ? stabilizedNoi / annualDebtService : 0

    return { totalDebt, totalEquity, totalSources, constructionInterest, originationFees, permMonthlyPayment, annualDebtService, dscr }
  }, [layers, totalCostBasis, stabilizedNoi])

  async function saveFinancing() {
    setSaving(true)
    try {
      await supabase.from('btr_financing').delete().eq('project_id', projectId)

      const rows = layers.map((l, i) => ({
        project_id: projectId,
        layer_type: l.layer_type,
        lender_name: l.lender_name || null,
        amount: l.amount || 0,
        ltc_or_ltv_pct: l.ltc_or_ltv_pct,
        interest_rate: l.interest_rate || 0,
        term_months: l.term_months || 0,
        amortization_months: l.amortization_months,
        origination_fee_pct: l.origination_fee_pct || 0,
        exit_fee_pct: l.exit_fee_pct || 0,
        interest_reserve: l.interest_reserve || 0,
        funding_method: l.funding_method,
        day_count_basis: l.day_count_basis || 360,
        sort_order: i,
        notes: l.notes || null,
      }))

      if (rows.length > 0) {
        const { error } = await supabase.from('btr_financing').insert(rows)
        if (error) throw error
      }

      // Update calculated returns
      await supabase.from('btr_calculated_returns')
        .upsert({
          project_id: projectId,
          total_equity_required: calcs.totalEquity,
          dscr: calcs.dscr,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id' })

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
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/btr/project/${projectId}`} className="btn-ghost">&larr; Project</Link>
            <div>
              <h2 className="text-sm font-medium text-slate-100">{project?.name} — Financing</h2>
              <p className="text-xs text-slate-500">Total Cost Basis: {fmt(totalCostBasis)} · NOI: {fmt(stabilizedNoi)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {layers.length === 0 && (
              <button onClick={initDefaults} className="btn-ghost border border-slate-700">Load Defaults</button>
            )}
            <button onClick={saveFinancing} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Financing'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Sources Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="card p-4">
            <div className="stat-value text-lg text-slate-100">{fmt(calcs.totalSources)}</div>
            <div className="stat-label">Total Sources</div>
          </div>
          <div className="card p-4">
            <div className="stat-value text-lg text-blue-400">{fmt(calcs.totalDebt)}</div>
            <div className="stat-label">Total Debt</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {totalCostBasis > 0 ? ((calcs.totalDebt / totalCostBasis) * 100).toFixed(1) + '% LTC' : ''}
            </div>
          </div>
          <div className="card p-4">
            <div className="stat-value text-lg text-emerald-400">{fmt(calcs.totalEquity)}</div>
            <div className="stat-label">Total Equity</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {totalCostBasis > 0 ? ((calcs.totalEquity / totalCostBasis) * 100).toFixed(1) + '% of cost' : ''}
            </div>
          </div>
          <div className="card p-4">
            <div className="stat-value text-lg text-amber-400">{fmt(calcs.constructionInterest)}</div>
            <div className="stat-label">Est. Construction Interest</div>
          </div>
          <div className="card p-4">
            <div className={`stat-value text-lg ${calcs.dscr >= 1.25 ? 'text-emerald-400' : calcs.dscr >= 1.0 ? 'text-amber-400' : 'text-red-400'}`}>
              {calcs.dscr > 0 ? calcs.dscr.toFixed(2) + 'x' : '—'}
            </div>
            <div className="stat-label">DSCR (Perm)</div>
          </div>
        </div>

        {/* Sources & Uses Balance */}
        {totalCostBasis > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Sources vs Uses:</span>
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500/60" style={{ width: `${Math.min(100, (calcs.totalDebt / totalCostBasis) * 100)}%` }} />
                <div className="h-full bg-emerald-500/60" style={{ width: `${Math.min(100, (calcs.totalEquity / totalCostBasis) * 100)}%` }} />
              </div>
              <span className={`text-xs font-mono ${Math.abs(calcs.totalSources - totalCostBasis) < 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {calcs.totalSources >= totalCostBasis ? 'Balanced' : `Gap: ${fmt(totalCostBasis - calcs.totalSources)}`}
              </span>
            </div>
          </div>
        )}

        {/* Financing Layers */}
        <div className="card overflow-hidden mb-6">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Capital Stack</h3>
            <button onClick={addLayer} className="text-xs text-cedar-400 hover:text-cedar-300">+ Add Layer</button>
          </div>
          <div className="p-4 space-y-4">
            {layers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No financing layers. Click "Load Defaults" to start with a standard capital structure.</p>
            ) : (
              layers.map(layer => {
                const key = layer.id || layer._local_id || ''
                const typeLabel = LAYER_TYPES.find(t => t.value === layer.layer_type)?.label || layer.layer_type
                const isDebt = !layer.layer_type.startsWith('equity')
                return (
                  <div key={key} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isDebt ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <span className="text-sm font-medium text-slate-300">{typeLabel}</span>
                      </div>
                      <button className="text-xs text-red-400/60 hover:text-red-400"
                              onClick={() => removeLayer(layer.id, layer._local_id)}>Remove</button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div>
                        <label className="input-label">Type</label>
                        <select className="input-field" value={layer.layer_type}
                                onChange={e => updateLayer(layer.id, layer._local_id, 'layer_type', e.target.value)}>
                          {LAYER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Lender / Source</label>
                        <input className="input-field" value={layer.lender_name}
                               onChange={e => updateLayer(layer.id, layer._local_id, 'lender_name', e.target.value)} />
                      </div>
                      {isDebt && (
                        <div>
                          <label className="input-label">LTC / LTV (%)</label>
                          <input type="number" step="1" className="input-field"
                                 value={layer.ltc_or_ltv_pct ? (layer.ltc_or_ltv_pct * 100) : ''}
                                 onChange={e => updateLayer(layer.id, layer._local_id, 'ltc_or_ltv_pct', (parseFloat(e.target.value) || 0) / 100)} />
                        </div>
                      )}
                      <div>
                        <label className="input-label">Amount ($)</label>
                        <input type="number" className="input-field" value={layer.amount || ''}
                               onChange={e => updateLayer(layer.id, layer._local_id, 'amount', parseFloat(e.target.value) || 0)} />
                      </div>
                      {isDebt && (
                        <>
                          <div>
                            <label className="input-label">Interest Rate (%)</label>
                            <input type="number" step="0.25" className="input-field"
                                   value={layer.interest_rate ? (layer.interest_rate * 100) : ''}
                                   onChange={e => updateLayer(layer.id, layer._local_id, 'interest_rate', (parseFloat(e.target.value) || 0) / 100)} />
                          </div>
                          <div>
                            <label className="input-label">Term (months)</label>
                            <input type="number" className="input-field" value={layer.term_months || ''}
                                   onChange={e => updateLayer(layer.id, layer._local_id, 'term_months', parseInt(e.target.value) || 0)} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Advanced fields for debt */}
                    {isDebt && (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                        {layer.layer_type === 'permanent_loan' && (
                          <div>
                            <label className="input-label">Amortization (months)</label>
                            <input type="number" className="input-field" value={layer.amortization_months || ''}
                                   onChange={e => updateLayer(layer.id, layer._local_id, 'amortization_months', parseInt(e.target.value) || null)} />
                          </div>
                        )}
                        <div>
                          <label className="input-label">Origination (%)</label>
                          <input type="number" step="0.25" className="input-field"
                                 value={layer.origination_fee_pct ? (layer.origination_fee_pct * 100) : ''}
                                 onChange={e => updateLayer(layer.id, layer._local_id, 'origination_fee_pct', (parseFloat(e.target.value) || 0) / 100)} />
                        </div>
                        <div>
                          <label className="input-label">Funding Method</label>
                          <select className="input-field" value={layer.funding_method}
                                  onChange={e => updateLayer(layer.id, layer._local_id, 'funding_method', e.target.value)}>
                            {FUNDING_METHODS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="input-label">Day Count</label>
                          <select className="input-field" value={layer.day_count_basis}
                                  onChange={e => updateLayer(layer.id, layer._local_id, 'day_count_basis', parseInt(e.target.value))}>
                            <option value={360}>360</option>
                            <option value={365}>365</option>
                          </select>
                        </div>
                        <div>
                          <label className="input-label">Notes</label>
                          <input className="input-field" value={layer.notes}
                                 onChange={e => updateLayer(layer.id, layer._local_id, 'notes', e.target.value)} />
                        </div>
                      </div>
                    )}

                    {/* Calculated metrics for this layer */}
                    {isDebt && layer.amount > 0 && (
                      <div className="flex gap-4 mt-3 text-xs text-slate-500">
                        <span>Origination: {fmt((layer.amount || 0) * (layer.origination_fee_pct || 0))}</span>
                        {layer.layer_type === 'permanent_loan' && layer.amortization_months && layer.interest_rate > 0 && (
                          <>
                            <span>Monthly P&I: {fmt((() => {
                              const r = layer.interest_rate / 12
                              const n = layer.amortization_months
                              return layer.amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
                            })())}</span>
                            <span>Annual Debt Service: {fmt((() => {
                              const r = layer.interest_rate / 12
                              const n = layer.amortization_months!
                              return layer.amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12
                            })())}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
