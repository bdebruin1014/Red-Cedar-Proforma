'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import {
  distributeBudgetItem, aggregateTimelines, cumulativeSum,
  SCURVE_LABELS, FORECAST_LABELS, CATEGORY_LABELS,
  DEFAULT_BUDGET_ITEMS, BudgetCategory, SCurveRate, ForecastMethod
} from '@/lib/scurve'
import SCurveChart from '@/components/SCurveChart'
import TimelineChart from '@/components/TimelineChart'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface BudgetItem {
  id: string
  _local_id?: string
  category: BudgetCategory
  line_item_name: string
  per_unit_amount: number
  total_amount: number
  forecast_method: ForecastMethod
  start_month: number
  duration_months: number
  s_curve_rate: SCurveRate
  sort_order: number
  notes: string
  is_included: boolean
  _dirty?: boolean
  _new?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  land: '#6366f1',
  horizontal: '#f59e0b',
  vertical: '#10b981',
  soft_cost: '#8b5cf6',
  closing_financing: '#64748b',
}

const CATEGORIES: BudgetCategory[] = ['land', 'horizontal', 'vertical', 'soft_cost', 'closing_financing']

let localIdCounter = 0

export default function BudgetEditorPage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const projectId = params.id as string
  const totalUnits = project?.total_units || 1
  const totalSF = project?.total_residential_sf || (totalUnits * (project?.avg_sf_per_unit || 1400))
  const totalMonths = project?.construction_months || 24

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [projRes, budgetRes] = await Promise.all([
      supabase.from('btr_projects').select('*').eq('id', projectId).single(),
      supabase.from('btr_development_budget').select('*').eq('project_id', projectId).order('sort_order'),
    ])

    if (projRes.data) setProject(projRes.data)

    if (budgetRes.data && budgetRes.data.length > 0) {
      setItems(budgetRes.data.map((r: any) => ({
        ...r,
        _dirty: false,
        _new: false,
      })))
    }
    setLoading(false)
  }

  function initDefaults() {
    const scope = project?.scope || 'vertical_only'
    const newItems: BudgetItem[] = DEFAULT_BUDGET_ITEMS
      .filter(d => scope === 'horizontal_and_vertical' || d.category !== 'horizontal')
      .map((d, i) => ({
        id: '',
        _local_id: `new_${++localIdCounter}`,
        category: d.category,
        line_item_name: d.name,
        per_unit_amount: 0,
        total_amount: 0,
        forecast_method: d.method,
        start_month: d.startMonth,
        duration_months: Math.min(d.duration, totalMonths),
        s_curve_rate: d.rate,
        sort_order: i,
        notes: '',
        is_included: true,
        _dirty: true,
        _new: true,
      }))
    setItems(newItems)
  }

  function toggleSection(cat: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function updateItem(id: string, localId: string | undefined, field: string, value: any) {
    setItems(prev => prev.map(item => {
      const match = id ? item.id === id : item._local_id === localId
      if (!match) return item

      const updated = { ...item, [field]: value, _dirty: true }

      // Auto-calc total from per-unit if per_unit changes
      if (field === 'per_unit_amount') {
        updated.total_amount = (parseFloat(value) || 0) * totalUnits
      }
      // Auto-calc per-unit from total if total changes
      if (field === 'total_amount') {
        updated.per_unit_amount = totalUnits > 0 ? (parseFloat(value) || 0) / totalUnits : 0
      }

      return updated
    }))
  }

  function addItem(category: BudgetCategory) {
    setItems(prev => [...prev, {
      id: '',
      _local_id: `new_${++localIdCounter}`,
      category,
      line_item_name: '',
      per_unit_amount: 0,
      total_amount: 0,
      forecast_method: 's_curve',
      start_month: 0,
      duration_months: 12,
      s_curve_rate: 'moderate_5',
      sort_order: prev.filter(i => i.category === category).length,
      notes: '',
      is_included: true,
      _dirty: true,
      _new: true,
    }])
  }

  function removeItem(id: string, localId: string | undefined) {
    setItems(prev => prev.filter(item => {
      if (id) return item.id !== id
      return item._local_id !== localId
    }))
  }

  async function saveAll() {
    setSaving(true)
    try {
      // Delete removed items (items that were in DB but no longer in local state)
      // For simplicity, delete all and re-insert
      await supabase.from('btr_development_budget').delete().eq('project_id', projectId)

      const rows = items.map((item, i) => ({
        project_id: projectId,
        category: item.category,
        line_item_name: item.line_item_name || 'Unnamed',
        per_unit_amount: item.per_unit_amount || 0,
        total_amount: item.total_amount || 0,
        per_sf_amount: totalSF > 0 ? (item.total_amount || 0) / totalSF : 0,
        forecast_method: item.forecast_method,
        start_month: item.start_month,
        duration_months: item.duration_months,
        s_curve_rate: item.s_curve_rate,
        end_month: item.start_month + item.duration_months - 1,
        monthly_distribution: distributeBudgetItem(item, totalMonths),
        sort_order: i,
        notes: item.notes || null,
        is_included: item.is_included,
      }))

      if (rows.length > 0) {
        const { error } = await supabase.from('btr_development_budget').insert(rows)
        if (error) throw error
      }

      // Update calculated returns
      const grandTotal = items.filter(i => i.is_included).reduce((s, i) => s + (i.total_amount || 0), 0)
      await supabase.from('btr_calculated_returns')
        .upsert({ project_id: projectId, total_cost_basis: grandTotal, updated_at: new Date().toISOString() },
                 { onConflict: 'project_id' })

      // Reload
      await loadData()
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving. Check console.')
    } finally {
      setSaving(false)
    }
  }

  // Computed values
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      totals[cat] = items.filter(i => i.category === cat && i.is_included).reduce((s, i) => s + (i.total_amount || 0), 0)
    }
    return totals
  }, [items])

  const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0)

  // Timeline data for chart
  const timelineSeries = useMemo(() => {
    return CATEGORIES
      .filter(cat => items.some(i => i.category === cat && i.is_included && i.total_amount > 0))
      .map(cat => {
        const catItems = items.filter(i => i.category === cat && i.is_included && i.total_amount > 0)
        const timelines = catItems.map(i => distributeBudgetItem(i, totalMonths))
        const monthly = aggregateTimelines(timelines)
        return {
          category: CATEGORY_LABELS[cat] || cat,
          monthly,
          color: CATEGORY_COLORS[cat] || '#64748b',
        }
      })
  }, [items, totalMonths])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />

      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/btr/project/${projectId}`} className="btn-ghost">&larr; Project</Link>
            <div>
              <h2 className="text-sm font-medium text-slate-100">{project?.name} — Development Budget</h2>
              <p className="text-xs text-slate-500">{totalUnits} units · {totalMonths} months</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {items.length === 0 && (
              <button onClick={initDefaults} className="btn-ghost border border-slate-700">
                Load Defaults
              </button>
            )}
            <button onClick={saveAll} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {CATEGORIES.filter(cat =>
            project?.scope === 'horizontal_and_vertical' || cat !== 'horizontal'
          ).map(cat => (
            <div key={cat} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{CATEGORY_LABELS[cat]}</span>
              </div>
              <div className="font-mono text-sm text-slate-200">{fmt(categoryTotals[cat] || 0)}</div>
            </div>
          ))}
          <div className="card p-3 border-cedar-600/30">
            <span className="text-[10px] text-cedar-400 uppercase tracking-wider">Grand Total</span>
            <div className="font-mono text-sm text-slate-100 font-medium">{fmt(grandTotal)}</div>
            <div className="text-[10px] text-slate-500 font-mono">{fmt(totalUnits > 0 ? grandTotal / totalUnits : 0)}/unit</div>
          </div>
        </div>

        {/* Timeline Visualization */}
        {timelineSeries.some(s => s.monthly.some(v => v > 0)) && (
          <div className="card p-5 mb-6">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-4">
              Construction Draw Schedule
            </h3>
            <TimelineChart series={timelineSeries} totalMonths={totalMonths} height={180} />
          </div>
        )}

        {/* Budget Line Items by Category */}
        {CATEGORIES
          .filter(cat => project?.scope === 'horizontal_and_vertical' || cat !== 'horizontal')
          .map(cat => {
            const catItems = items.filter(i => i.category === cat)
            const isCollapsed = collapsedSections.has(cat)

            return (
              <div key={cat} className="card mb-4 overflow-hidden">
                <div
                  className="card-header flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleSection(cat)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                    <h3 className="text-sm font-medium text-slate-300">{CATEGORY_LABELS[cat]}</h3>
                    <span className="text-xs text-slate-500">({catItems.length} items)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-slate-300">{fmt(categoryTotals[cat] || 0)}</span>
                    <span className="text-slate-500 text-xs">{isCollapsed ? '▸' : '▾'}</span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="p-4">
                    {catItems.length === 0 ? (
                      <p className="text-sm text-slate-500 mb-3">No line items.</p>
                    ) : (
                      <div className="space-y-2">
                        {/* Header row */}
                        <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 uppercase tracking-wider px-1">
                          <div className="col-span-3">Line Item</div>
                          <div className="col-span-1 text-right">Per Unit</div>
                          <div className="col-span-1 text-right">Total</div>
                          <div className="col-span-1">Method</div>
                          <div className="col-span-1 text-center">Start Mo</div>
                          <div className="col-span-1 text-center">Duration</div>
                          <div className="col-span-1">S-Curve</div>
                          <div className="col-span-1 text-center">Preview</div>
                          <div className="col-span-1"></div>
                        </div>

                        {catItems.map(item => {
                          const key = item.id || item._local_id || ''
                          return (
                            <div key={key} className={`grid grid-cols-12 gap-2 items-center rounded-lg px-1 py-1.5 ${
                              item.is_included ? 'bg-slate-800/20' : 'bg-slate-800/10 opacity-50'
                            }`}>
                              <div className="col-span-3">
                                <input
                                  className="input-field text-xs py-1.5"
                                  value={item.line_item_name}
                                  onChange={e => updateItem(item.id, item._local_id, 'line_item_name', e.target.value)}
                                  placeholder="Line item name"
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  className="input-field text-xs py-1.5 text-right"
                                  value={item.per_unit_amount || ''}
                                  onChange={e => updateItem(item.id, item._local_id, 'per_unit_amount', e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  className="input-field text-xs py-1.5 text-right"
                                  value={item.total_amount || ''}
                                  onChange={e => updateItem(item.id, item._local_id, 'total_amount', e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                              <div className="col-span-1">
                                <select
                                  className="input-field text-xs py-1.5"
                                  value={item.forecast_method}
                                  onChange={e => updateItem(item.id, item._local_id, 'forecast_method', e.target.value)}
                                >
                                  {Object.entries(FORECAST_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  className="input-field text-xs py-1.5 text-center"
                                  value={item.start_month}
                                  min={0}
                                  max={totalMonths - 1}
                                  onChange={e => updateItem(item.id, item._local_id, 'start_month', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  className="input-field text-xs py-1.5 text-center"
                                  value={item.duration_months}
                                  min={1}
                                  max={totalMonths}
                                  onChange={e => updateItem(item.id, item._local_id, 'duration_months', parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="col-span-1">
                                <select
                                  className="input-field text-xs py-1.5"
                                  value={item.s_curve_rate}
                                  onChange={e => updateItem(item.id, item._local_id, 's_curve_rate', e.target.value)}
                                  disabled={item.forecast_method !== 's_curve'}
                                >
                                  {Object.entries(SCURVE_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-1 flex justify-center">
                                {item.forecast_method === 's_curve' && item.duration_months > 0 && (
                                  <SCurveChart
                                    durationMonths={item.duration_months}
                                    rate={item.s_curve_rate}
                                    height={24}
                                    width={80}
                                  />
                                )}
                              </div>
                              <div className="col-span-1 flex items-center gap-1 justify-end">
                                <button
                                  className={`w-5 h-5 rounded text-[10px] flex items-center justify-center transition-colors ${
                                    item.is_included
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-slate-700/50 text-slate-500'
                                  }`}
                                  onClick={() => updateItem(item.id, item._local_id, 'is_included', !item.is_included)}
                                  title={item.is_included ? 'Click to exclude' : 'Click to include'}
                                >
                                  ✓
                                </button>
                                <button
                                  className="w-5 h-5 rounded bg-red-500/10 text-red-400/60 hover:text-red-400 text-[10px] flex items-center justify-center transition-colors"
                                  onClick={() => removeItem(item.id, item._local_id)}
                                  title="Delete"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <button
                      onClick={() => addItem(cat)}
                      className="mt-3 text-xs text-cedar-400 hover:text-cedar-300 transition-colors"
                    >
                      + Add Line Item
                    </button>
                  </div>
                )}
              </div>
            )
          })}

        {/* Per-Unit and Per-SF Summary */}
        {grandTotal > 0 && (
          <div className="card p-5 mt-6">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-3">
              Cost Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Total Development Cost</span>
                <div className="font-mono text-lg text-slate-100">{fmt(grandTotal)}</div>
              </div>
              <div>
                <span className="text-slate-400">Per Unit</span>
                <div className="font-mono text-lg text-slate-100">{fmt(grandTotal / totalUnits)}</div>
              </div>
              <div>
                <span className="text-slate-400">Per SF</span>
                <div className="font-mono text-lg text-slate-100">{fmt(totalSF > 0 ? grandTotal / totalSF : 0)}</div>
              </div>
              <div>
                <span className="text-slate-400">% of Total by Category</span>
                <div className="space-y-1 mt-1">
                  {CATEGORIES.filter(c => categoryTotals[c] > 0).map(cat => (
                    <div key={cat} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(categoryTotals[cat] / grandTotal) * 100}%`,
                            backgroundColor: CATEGORY_COLORS[cat],
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono w-10 text-right">
                        {((categoryTotals[cat] / grandTotal) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
