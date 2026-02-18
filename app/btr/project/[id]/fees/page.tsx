'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface FeeRow {
  id: string
  _local_id?: string
  fee_type: string
  is_included: boolean
  per_unit_amount: number
  total_amount: number
  fee_structure: string
  notes: string
  _new?: boolean
}

const FEE_TYPES = [
  { value: 'builder_fee', label: 'Builder Fee', desc: 'Per-unit construction fee to RCC' },
  { value: 'staffed_positions', label: 'Staffed Positions', desc: 'Superintendent, PM, PO staff overhead' },
  { value: 'cm_fee', label: 'Construction Mgmt Fee', desc: 'Percentage or flat CM oversight fee' },
  { value: 'developer_fee', label: 'Developer Fee', desc: 'Development management fee (if applicable)' },
  { value: 'other', label: 'Other Fee', desc: 'Miscellaneous fee income' },
]

const STRUCTURES = [
  { value: 'flat', label: 'Flat (per unit)' },
  { value: 'gmp', label: 'GMP (% of hard cost)' },
  { value: 'cost_plus', label: 'Cost Plus' },
  { value: 'percentage', label: 'Percentage of total' },
]

let localId = 0

export default function RCFeeProfilePage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [fees, setFees] = useState<FeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const projectId = params.id as string
  const totalUnits = project?.total_units || 1

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [projRes, feeRes] = await Promise.all([
      supabase.from('btr_projects').select('*').eq('id', projectId).single(),
      supabase.from('btr_rc_fee_profile').select('*').eq('project_id', projectId).order('fee_type'),
    ])
    if (projRes.data) setProject(projRes.data)
    if (feeRes.data && feeRes.data.length > 0) {
      setFees(feeRes.data.map((r: any) => ({ ...r, _new: false })))
    }
    setLoading(false)
  }

  function initDefaults() {
    setFees([
      { id: '', _local_id: `f${++localId}`, fee_type: 'builder_fee', is_included: true, per_unit_amount: 17000, total_amount: 17000 * totalUnits, fee_structure: 'flat', notes: 'Standard RC builder fee', _new: true },
      { id: '', _local_id: `f${++localId}`, fee_type: 'staffed_positions', is_included: true, per_unit_amount: 5000, total_amount: 5000 * totalUnits, fee_structure: 'flat', notes: 'Super + PM + PO allocated', _new: true },
      { id: '', _local_id: `f${++localId}`, fee_type: 'cm_fee', is_included: false, per_unit_amount: 0, total_amount: 0, fee_structure: 'percentage', notes: '', _new: true },
      { id: '', _local_id: `f${++localId}`, fee_type: 'developer_fee', is_included: false, per_unit_amount: 0, total_amount: 0, fee_structure: 'flat', notes: '', _new: true },
    ])
  }

  function updateFee(id: string, localId: string | undefined, field: string, value: any) {
    setFees(prev => prev.map(f => {
      const match = id ? f.id === id : f._local_id === localId
      if (!match) return f
      const updated = { ...f, [field]: value }
      if (field === 'per_unit_amount') updated.total_amount = (parseFloat(value) || 0) * totalUnits
      if (field === 'total_amount') updated.per_unit_amount = totalUnits > 0 ? (parseFloat(value) || 0) / totalUnits : 0
      return updated
    }))
  }

  function addFee() {
    setFees(prev => [...prev, {
      id: '', _local_id: `f${++localId}`, fee_type: 'other', is_included: true,
      per_unit_amount: 0, total_amount: 0, fee_structure: 'flat', notes: '', _new: true,
    }])
  }

  function removeFee(id: string, localId: string | undefined) {
    setFees(prev => prev.filter(f => id ? f.id !== id : f._local_id !== localId))
  }

  const totalFeeIncome = useMemo(() =>
    fees.filter(f => f.is_included).reduce((s, f) => s + (f.total_amount || 0), 0)
  , [fees])

  const perUnitFeeIncome = totalUnits > 0 ? totalFeeIncome / totalUnits : 0

  async function saveFees() {
    setSaving(true)
    try {
      await supabase.from('btr_rc_fee_profile').delete().eq('project_id', projectId)

      const rows = fees.map(f => ({
        project_id: projectId,
        fee_type: f.fee_type,
        is_included: f.is_included,
        per_unit_amount: f.per_unit_amount || 0,
        total_amount: f.total_amount || 0,
        fee_structure: f.fee_structure,
        notes: f.notes || null,
      }))

      if (rows.length > 0) {
        const { error } = await supabase.from('btr_rc_fee_profile').insert(rows)
        if (error) throw error
      }

      // Update calculated returns with fee total
      await supabase.from('btr_calculated_returns')
        .upsert({ project_id: projectId, rc_total_fee_income: totalFeeIncome, updated_at: new Date().toISOString() },
                 { onConflict: 'project_id' })

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
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/btr/project/${projectId}`} className="btn-ghost">&larr; Project</Link>
            <div>
              <h2 className="text-sm font-medium text-slate-100">{project?.name} — RCC Fee Profile</h2>
              <p className="text-xs text-red-400/80">INTERNAL ONLY — Hidden from external views</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fees.length === 0 && (
              <button onClick={initDefaults} className="btn-ghost border border-slate-700">Load Defaults</button>
            )}
            <button onClick={saveFees} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Fees'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Warning banner */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-300">This page is for internal RCC use only. Fee calculations are stored but hidden from the general project view. When role-based access is added, this page will be restricted to admin users.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-5">
            <div className="stat-value text-xl text-emerald-400">{fmt(totalFeeIncome)}</div>
            <div className="stat-label">Total RC Fee Income</div>
          </div>
          <div className="card p-5">
            <div className="stat-value text-xl text-slate-200">{fmt(perUnitFeeIncome)}</div>
            <div className="stat-label">Per Unit</div>
          </div>
          <div className="card p-5">
            <div className="stat-value text-xl text-slate-400">{fees.filter(f => f.is_included).length}</div>
            <div className="stat-label">Active Fee Types</div>
          </div>
        </div>

        {/* Fee Table */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Fee Structure</h3>
            <button onClick={addFee} className="text-xs text-cedar-400 hover:text-cedar-300">+ Add Fee</button>
          </div>
          <div className="p-4 space-y-3">
            {fees.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No fees configured. Click "Load Defaults" to start.</p>
            ) : (
              fees.map(fee => {
                const key = fee.id || fee._local_id || ''
                const typeInfo = FEE_TYPES.find(t => t.value === fee.fee_type) || FEE_TYPES[4]
                return (
                  <div key={key} className={`rounded-lg p-4 ${fee.is_included ? 'bg-slate-800/30' : 'bg-slate-800/10 opacity-50'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="input-label">Fee Type</label>
                        <select className="input-field" value={fee.fee_type}
                                onChange={e => updateFee(fee.id, fee._local_id, 'fee_type', e.target.value)}>
                          {FEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <p className="text-[10px] text-slate-600 mt-0.5">{typeInfo.desc}</p>
                      </div>
                      <div>
                        <label className="input-label">Structure</label>
                        <select className="input-field" value={fee.fee_structure}
                                onChange={e => updateFee(fee.id, fee._local_id, 'fee_structure', e.target.value)}>
                          {STRUCTURES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Per Unit ($)</label>
                        <input type="number" className="input-field" value={fee.per_unit_amount || ''}
                               onChange={e => updateFee(fee.id, fee._local_id, 'per_unit_amount', e.target.value)} />
                      </div>
                      <div>
                        <label className="input-label">Total ({totalUnits} units)</label>
                        <input type="number" className="input-field" value={fee.total_amount || ''}
                               onChange={e => updateFee(fee.id, fee._local_id, 'total_amount', e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          className={`px-3 py-1.5 rounded text-xs ${fee.is_included ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}
                          onClick={() => updateFee(fee.id, fee._local_id, 'is_included', !fee.is_included)}
                        >
                          {fee.is_included ? 'Active' : 'Inactive'}
                        </button>
                        <button className="px-2 py-1.5 rounded bg-red-500/10 text-red-400/60 hover:text-red-400 text-xs"
                                onClick={() => removeFee(fee.id, fee._local_id)}>×</button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <input className="input-field text-xs py-1.5" value={fee.notes}
                             onChange={e => updateFee(fee.id, fee._local_id, 'notes', e.target.value)}
                             placeholder="Notes..." />
                    </div>
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
