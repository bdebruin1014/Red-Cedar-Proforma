'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface IncomeRow {
  id: string
  _local_id?: string
  assumption_category: string
  line_item_name: string
  unit_count: number | null
  monthly_amount: number | null
  annual_amount: number | null
  pct_of_revenue: number | null
  per_unit_amount: number | null
  escalation_rate: number
  sort_order: number
  _new?: boolean
}

const CATEGORIES = [
  { key: 'unit_rent', label: 'Rental Income by Unit Type', icon: '🏠' },
  { key: 'vacancy', label: 'Vacancy & Concessions', icon: '📉' },
  { key: 'other_income', label: 'Other Income', icon: '💰' },
  { key: 'operating_expense', label: 'Operating Expenses', icon: '🔧' },
  { key: 'pm_fee', label: 'Property Management', icon: '👤' },
  { key: 'reserve', label: 'Reserves', icon: '🏦' },
]

const DEFAULT_ITEMS: { category: string; name: string; pct?: number; perUnit?: number; monthly?: number }[] = [
  // Vacancy & Concessions
  { category: 'vacancy', name: 'Physical Vacancy', pct: 0.05 },
  { category: 'vacancy', name: 'Concessions', pct: 0.01 },
  { category: 'vacancy', name: 'Credit Loss', pct: 0.005 },

  // Other Income
  { category: 'other_income', name: 'Pet Rent', monthly: 50 },
  { category: 'other_income', name: 'Admin/Application Fees', monthly: 15 },
  { category: 'other_income', name: 'Parking', monthly: 0 },
  { category: 'other_income', name: 'Valet Trash', monthly: 35 },
  { category: 'other_income', name: 'Other', monthly: 0 },

  // Operating Expenses
  { category: 'operating_expense', name: 'Contract Services', perUnit: 900 },
  { category: 'operating_expense', name: 'Repairs & Maintenance', perUnit: 750 },
  { category: 'operating_expense', name: 'Turnover/Make-Ready', perUnit: 400 },
  { category: 'operating_expense', name: 'Marketing', perUnit: 250 },
  { category: 'operating_expense', name: 'General & Admin', perUnit: 450 },
  { category: 'operating_expense', name: 'Insurance', perUnit: 600 },
  { category: 'operating_expense', name: 'Real Estate Taxes', perUnit: 1800 },
  { category: 'operating_expense', name: 'Utilities', perUnit: 500 },

  // PM
  { category: 'pm_fee', name: 'Property Management Fee', pct: 0.07 },

  // Reserves
  { category: 'reserve', name: 'Capital Reserves', perUnit: 300 },
]

let localId = 0

export default function IncomeAssumptionsPage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [productMix, setProductMix] = useState<any[]>([])
  const [items, setItems] = useState<IncomeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const projectId = params.id as string
  const totalUnits = project?.total_units || 1

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [projRes, prodRes, incRes] = await Promise.all([
      supabase.from('btr_projects').select('*').eq('id', projectId).single(),
      supabase.from('btr_product_mix').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('btr_income_assumptions').select('*').eq('project_id', projectId).order('sort_order'),
    ])
    if (projRes.data) setProject(projRes.data)
    if (prodRes.data) setProductMix(prodRes.data)
    if (incRes.data && incRes.data.length > 0) {
      setItems(incRes.data.map((r: any) => ({ ...r, _new: false })))
    }
    setLoading(false)
  }

  function initDefaults() {
    const newItems: IncomeRow[] = []

    // Auto-create rent rows from product mix
    productMix.forEach((p, i) => {
      newItems.push({
        id: '', _local_id: `i${++localId}`,
        assumption_category: 'unit_rent',
        line_item_name: `${p.plan_name} (${p.heated_sf || '?'} SF, ${p.bedrooms || '?'}bd)`,
        unit_count: p.unit_count || 0,
        monthly_amount: p.target_rent_monthly || 0,
        annual_amount: (p.unit_count || 0) * (p.target_rent_monthly || 0) * 12,
        pct_of_revenue: null,
        per_unit_amount: (p.target_rent_monthly || 0) * 12,
        escalation_rate: 0.03,
        sort_order: i,
        _new: true,
      })
    })

    // Add default items
    DEFAULT_ITEMS.forEach((d, i) => {
      newItems.push({
        id: '', _local_id: `i${++localId}`,
        assumption_category: d.category,
        line_item_name: d.name,
        unit_count: null,
        monthly_amount: d.monthly || null,
        annual_amount: d.perUnit ? d.perUnit * totalUnits : null,
        pct_of_revenue: d.pct || null,
        per_unit_amount: d.perUnit || null,
        escalation_rate: 0.03,
        sort_order: 100 + i,
        _new: true,
      })
    })

    setItems(newItems)
  }

  function updateItem(id: string, localId: string | undefined, field: string, value: any) {
    setItems(prev => prev.map(item => {
      const match = id ? item.id === id : item._local_id === localId
      if (!match) return item
      const u = { ...item, [field]: value }

      // Auto-calc annual for rent types
      if (u.assumption_category === 'unit_rent') {
        if (field === 'monthly_amount' || field === 'unit_count') {
          u.annual_amount = (u.unit_count || 0) * (u.monthly_amount || 0) * 12
          u.per_unit_amount = (u.monthly_amount || 0) * 12
        }
      }
      // Auto-calc annual for per-unit expenses
      if (field === 'per_unit_amount' && (u.assumption_category === 'operating_expense' || u.assumption_category === 'reserve')) {
        u.annual_amount = (parseFloat(value) || 0) * totalUnits
      }

      return u
    }))
  }

  function addItem(category: string) {
    setItems(prev => [...prev, {
      id: '', _local_id: `i${++localId}`,
      assumption_category: category,
      line_item_name: '',
      unit_count: null, monthly_amount: null, annual_amount: null,
      pct_of_revenue: null, per_unit_amount: null,
      escalation_rate: 0.03,
      sort_order: prev.filter(i => i.assumption_category === category).length,
      _new: true,
    }])
  }

  function removeItem(id: string, localId: string | undefined) {
    setItems(prev => prev.filter(i => id ? i.id !== id : i._local_id !== localId))
  }

  // Calculations
  const calcs = useMemo(() => {
    const rentItems = items.filter(i => i.assumption_category === 'unit_rent')
    const grossPotentialRent = rentItems.reduce((s, i) => s + (i.annual_amount || 0), 0)

    const vacancyItems = items.filter(i => i.assumption_category === 'vacancy')
    const totalVacancyPct = vacancyItems.reduce((s, i) => s + (i.pct_of_revenue || 0), 0)
    const vacancyLoss = grossPotentialRent * totalVacancyPct

    const otherItems = items.filter(i => i.assumption_category === 'other_income')
    const otherIncome = otherItems.reduce((s, i) => {
      if (i.monthly_amount) return s + (i.monthly_amount * totalUnits * 12)
      if (i.annual_amount) return s + i.annual_amount
      return s
    }, 0)

    const egi = grossPotentialRent - vacancyLoss + otherIncome

    const opexItems = items.filter(i => i.assumption_category === 'operating_expense')
    const totalOpex = opexItems.reduce((s, i) => s + (i.annual_amount || (i.per_unit_amount || 0) * totalUnits), 0)

    const pmItems = items.filter(i => i.assumption_category === 'pm_fee')
    const pmFee = pmItems.reduce((s, i) => {
      if (i.pct_of_revenue) return s + egi * i.pct_of_revenue
      if (i.annual_amount) return s + i.annual_amount
      return s
    }, 0)

    const reserveItems = items.filter(i => i.assumption_category === 'reserve')
    const reserves = reserveItems.reduce((s, i) => s + (i.annual_amount || (i.per_unit_amount || 0) * totalUnits), 0)

    const totalExpenses = totalOpex + pmFee + reserves
    const noi = egi - totalExpenses

    return { grossPotentialRent, vacancyLoss, totalVacancyPct, otherIncome, egi, totalOpex, pmFee, reserves, totalExpenses, noi }
  }, [items, totalUnits])

  async function saveAssumptions() {
    setSaving(true)
    try {
      await supabase.from('btr_income_assumptions').delete().eq('project_id', projectId)

      const rows = items.map((item, i) => ({
        project_id: projectId,
        assumption_category: item.assumption_category,
        line_item_name: item.line_item_name || 'Unnamed',
        unit_count: item.unit_count,
        monthly_amount: item.monthly_amount,
        annual_amount: item.annual_amount,
        pct_of_revenue: item.pct_of_revenue,
        per_unit_amount: item.per_unit_amount,
        escalation_rate: item.escalation_rate,
        sort_order: i,
      }))

      if (rows.length > 0) {
        const { error } = await supabase.from('btr_income_assumptions').insert(rows)
        if (error) throw error
      }

      // Update calculated returns with NOI and YOC
      const budgetRes = await supabase.from('btr_calculated_returns').select('total_cost_basis').eq('project_id', projectId).single()
      const totalCost = budgetRes.data?.total_cost_basis || 0
      const yoc = totalCost > 0 ? calcs.noi / totalCost : 0

      await supabase.from('btr_calculated_returns')
        .upsert({
          project_id: projectId,
          stabilized_noi: calcs.noi,
          yield_on_cost: yoc,
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
              <h2 className="text-sm font-medium text-slate-100">{project?.name} — Income & OpEx</h2>
              <p className="text-xs text-slate-500">{totalUnits} units</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {items.length === 0 && (
              <button onClick={initDefaults} className="btn-ghost border border-slate-700">Load Defaults</button>
            )}
            <button onClick={saveAssumptions} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Assumptions'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* NOI Waterfall Summary */}
        <div className="card p-5 mb-6">
          <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-3">Stabilized NOI Waterfall</h3>
          <div className="space-y-2 text-sm max-w-md">
            <div className="flex justify-between"><span className="text-slate-400">Gross Potential Rent</span><span className="font-mono">{fmt(calcs.grossPotentialRent)}</span></div>
            <div className="flex justify-between text-red-400/80"><span>Less: Vacancy & Concessions ({(calcs.totalVacancyPct * 100).toFixed(1)}%)</span><span className="font-mono">({fmt(calcs.vacancyLoss)})</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Plus: Other Income</span><span className="font-mono">{fmt(calcs.otherIncome)}</span></div>
            <div className="flex justify-between border-t border-slate-700/50 pt-2 font-medium"><span className="text-slate-200">Effective Gross Income (EGI)</span><span className="font-mono">{fmt(calcs.egi)}</span></div>
            <div className="flex justify-between text-red-400/80"><span>Less: Operating Expenses</span><span className="font-mono">({fmt(calcs.totalOpex)})</span></div>
            <div className="flex justify-between text-red-400/80"><span>Less: Property Management</span><span className="font-mono">({fmt(calcs.pmFee)})</span></div>
            <div className="flex justify-between text-red-400/80"><span>Less: Reserves</span><span className="font-mono">({fmt(calcs.reserves)})</span></div>
            <div className="flex justify-between border-t border-slate-700/50 pt-2 font-medium text-lg">
              <span className={calcs.noi > 0 ? 'text-emerald-400' : 'text-red-400'}>Net Operating Income</span>
              <span className={`font-mono ${calcs.noi > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(calcs.noi)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs pt-1">
              <span>Per Unit</span><span className="font-mono">{fmt(calcs.noi / totalUnits)}</span>
            </div>
          </div>
        </div>

        {/* Category Sections */}
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.assumption_category === cat.key)
          const isRent = cat.key === 'unit_rent'
          const isVacancy = cat.key === 'vacancy'
          const isOther = cat.key === 'other_income'
          const isOpex = cat.key === 'operating_expense' || cat.key === 'reserve'
          const isPM = cat.key === 'pm_fee'

          return (
            <div key={cat.key} className="card mb-4 overflow-hidden">
              <div className="card-header flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300">{cat.icon} {cat.label}</h3>
                <button onClick={() => addItem(cat.key)} className="text-xs text-cedar-400 hover:text-cedar-300">+ Add</button>
              </div>
              <div className="p-4 space-y-2">
                {catItems.length === 0 ? (
                  <p className="text-sm text-slate-500">No items. Click "+ Add" or "Load Defaults".</p>
                ) : (
                  catItems.map(item => {
                    const key = item.id || item._local_id || ''
                    return (
                      <div key={key} className="grid grid-cols-12 gap-2 items-center bg-slate-800/20 rounded-lg px-2 py-1.5">
                        <div className="col-span-3">
                          <input className="input-field text-xs py-1.5" value={item.line_item_name}
                                 onChange={e => updateItem(item.id, item._local_id, 'line_item_name', e.target.value)} />
                        </div>
                        {isRent && (
                          <>
                            <div className="col-span-2">
                              <input type="number" className="input-field text-xs py-1.5" value={item.unit_count || ''}
                                     onChange={e => updateItem(item.id, item._local_id, 'unit_count', parseInt(e.target.value) || 0)}
                                     placeholder="Units" />
                            </div>
                            <div className="col-span-2">
                              <input type="number" className="input-field text-xs py-1.5" value={item.monthly_amount || ''}
                                     onChange={e => updateItem(item.id, item._local_id, 'monthly_amount', parseFloat(e.target.value) || 0)}
                                     placeholder="$/mo" />
                            </div>
                            <div className="col-span-2 text-right font-mono text-xs text-slate-400 py-1.5">
                              {fmt(item.annual_amount || 0)}/yr
                            </div>
                          </>
                        )}
                        {(isVacancy || isPM) && (
                          <>
                            <div className="col-span-3">
                              <div className="flex items-center gap-1">
                                <input type="number" step="0.1" className="input-field text-xs py-1.5 w-20"
                                       value={item.pct_of_revenue ? (item.pct_of_revenue * 100) : ''}
                                       onChange={e => updateItem(item.id, item._local_id, 'pct_of_revenue', (parseFloat(e.target.value) || 0) / 100)}
                                       placeholder="%" />
                                <span className="text-xs text-slate-500">% of {isPM ? 'EGI' : 'GPR'}</span>
                              </div>
                            </div>
                            <div className="col-span-3 text-right font-mono text-xs text-slate-400 py-1.5">
                              {isPM && item.pct_of_revenue ? fmt(calcs.egi * item.pct_of_revenue) + '/yr' : ''}
                              {isVacancy && item.pct_of_revenue ? fmt(calcs.grossPotentialRent * item.pct_of_revenue) + '/yr' : ''}
                            </div>
                          </>
                        )}
                        {isOther && (
                          <>
                            <div className="col-span-3">
                              <div className="flex items-center gap-1">
                                <input type="number" className="input-field text-xs py-1.5 w-24"
                                       value={item.monthly_amount || ''}
                                       onChange={e => updateItem(item.id, item._local_id, 'monthly_amount', parseFloat(e.target.value) || 0)}
                                       placeholder="$/unit/mo" />
                                <span className="text-xs text-slate-500">/unit/mo</span>
                              </div>
                            </div>
                            <div className="col-span-3 text-right font-mono text-xs text-slate-400 py-1.5">
                              {item.monthly_amount ? fmt(item.monthly_amount * totalUnits * 12) + '/yr' : ''}
                            </div>
                          </>
                        )}
                        {isOpex && (
                          <>
                            <div className="col-span-3">
                              <div className="flex items-center gap-1">
                                <input type="number" className="input-field text-xs py-1.5 w-24"
                                       value={item.per_unit_amount || ''}
                                       onChange={e => updateItem(item.id, item._local_id, 'per_unit_amount', e.target.value)}
                                       placeholder="$/unit/yr" />
                                <span className="text-xs text-slate-500">/unit/yr</span>
                              </div>
                            </div>
                            <div className="col-span-3 text-right font-mono text-xs text-slate-400 py-1.5">
                              {item.per_unit_amount ? fmt((item.per_unit_amount || 0) * totalUnits) + '/yr' : ''}
                            </div>
                          </>
                        )}
                        <div className="col-span-2">
                          <div className="flex items-center gap-1">
                            <input type="number" step="0.1" className="input-field text-xs py-1.5 w-14"
                                   value={item.escalation_rate ? (item.escalation_rate * 100) : ''}
                                   onChange={e => updateItem(item.id, item._local_id, 'escalation_rate', (parseFloat(e.target.value) || 0) / 100)}
                                   placeholder="3" />
                            <span className="text-[10px] text-slate-600">%/yr esc</span>
                          </div>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button className="w-5 h-5 rounded bg-red-500/10 text-red-400/60 hover:text-red-400 text-[10px] flex items-center justify-center"
                                  onClick={() => removeItem(item.id, item._local_id)}>×</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
