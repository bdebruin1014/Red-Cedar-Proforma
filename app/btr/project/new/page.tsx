'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface LotType {
  key: string
  lot_type_name: string
  product_type: 'sfh' | 'townhome'
  lot_count: number
  lot_width: string
  lot_depth: string
  pad_width: string
  pad_depth: string
  load_type: string
}

interface ProductLine {
  key: string
  lot_key: string
  plan_name: string
  unit_count: number
  heated_sf: string
  bedrooms: string
  bathrooms: string
  garage_type: string
  target_rent_monthly: string
  base_cost: string
  adder_soft_costs: string
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card mb-6">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-sm font-medium text-cedar-400 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  const cls = span === 2 ? 'md:col-span-2' : span === 3 ? 'lg:col-span-3' : span === 4 ? 'lg:col-span-4' : ''
  return (
    <div className={cls}>
      <label className="input-label">{label}</label>
      {children}
    </div>
  )
}

let lotKeyCounter = 0
let prodKeyCounter = 0

export default function NewBTRProject() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    scope: 'vertical_only' as 'vertical_only' | 'horizontal_and_vertical',
    property_type: 'TH',
    address: '', city: '', state: 'SC', county: '', zip: '',
    acreage: '',
    total_units: '',
    avg_sf_per_unit: '',
    avg_rent_per_unit: '',
    btr_operator: '',
    developer: '',
    lender: '',
    construction_months: '24',
    notes: '',
  })

  const [lotTypes, setLotTypes] = useState<LotType[]>([])
  const [products, setProducts] = useState<ProductLine[]>([])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addLotType() {
    setLotTypes(prev => [...prev, {
      key: `lot_${++lotKeyCounter}`,
      lot_type_name: '',
      product_type: 'townhome',
      lot_count: 0,
      lot_width: '', lot_depth: '', pad_width: '', pad_depth: '',
      load_type: 'Rear load',
    }])
  }

  function updateLot(key: string, field: string, value: any) {
    setLotTypes(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l))
  }

  function removeLot(key: string) {
    setLotTypes(prev => prev.filter(l => l.key !== key))
    setProducts(prev => prev.filter(p => p.lot_key !== key))
  }

  function addProduct(lot_key?: string) {
    setProducts(prev => [...prev, {
      key: `prod_${++prodKeyCounter}`,
      lot_key: lot_key || '',
      plan_name: '',
      unit_count: 0,
      heated_sf: '', bedrooms: '', bathrooms: '', garage_type: '',
      target_rent_monthly: '', base_cost: '', adder_soft_costs: '',
    }])
  }

  function updateProduct(key: string, field: string, value: any) {
    setProducts(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p))
  }

  function removeProduct(key: string) {
    setProducts(prev => prev.filter(p => p.key !== key))
  }

  async function saveProject() {
    if (!form.name) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: project, error: projErr } = await supabase
        .from('btr_projects')
        .insert({
          created_by: user?.id || null,
          name: form.name,
          scope: form.scope,
          property_type: form.property_type || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state,
          county: form.county || null,
          zip: form.zip || null,
          acreage: form.acreage ? parseFloat(form.acreage) : null,
          total_units: form.total_units ? parseInt(form.total_units) : null,
          avg_sf_per_unit: form.avg_sf_per_unit ? parseFloat(form.avg_sf_per_unit) : null,
          avg_rent_per_unit: form.avg_rent_per_unit ? parseFloat(form.avg_rent_per_unit) : null,
          btr_operator: form.btr_operator || null,
          developer: form.developer || null,
          lender: form.lender || null,
          construction_months: form.construction_months ? parseInt(form.construction_months) : null,
          notes: form.notes || null,
        })
        .select('id')
        .single()

      if (projErr) throw projErr

      // Save lot matrix
      const lotKeyToId: Record<string, string> = {}
      if (lotTypes.length > 0) {
        const lotRows = lotTypes.map((l, i) => ({
          project_id: project.id,
          lot_type_name: l.lot_type_name || `Type ${i + 1}`,
          product_type: l.product_type,
          lot_count: l.lot_count || null,
          lot_width: l.lot_width ? parseFloat(l.lot_width) : null,
          lot_depth: l.lot_depth ? parseFloat(l.lot_depth) : null,
          pad_width: l.pad_width ? parseFloat(l.pad_width) : null,
          pad_depth: l.pad_depth ? parseFloat(l.pad_depth) : null,
          load_type: l.load_type || null,
          sort_order: i,
        }))

        const { data: lotData, error: lotErr } = await supabase
          .from('btr_lot_matrix')
          .insert(lotRows)
          .select('id')

        if (lotErr) throw lotErr
        lotTypes.forEach((l, i) => {
          if (lotData?.[i]) lotKeyToId[l.key] = lotData[i].id
        })
      }

      // Save product mix
      if (products.length > 0) {
        const prodRows = products.map((p, i) => ({
          project_id: project.id,
          lot_type_id: p.lot_key ? lotKeyToId[p.lot_key] || null : null,
          plan_name: p.plan_name || `Product ${i + 1}`,
          unit_count: p.unit_count || 1,
          heated_sf: p.heated_sf ? parseInt(p.heated_sf) : null,
          bedrooms: p.bedrooms ? parseInt(p.bedrooms) : null,
          bathrooms: p.bathrooms ? parseFloat(p.bathrooms) : null,
          garage_type: p.garage_type || null,
          target_rent_monthly: p.target_rent_monthly ? parseFloat(p.target_rent_monthly) : null,
          base_cost: p.base_cost ? parseFloat(p.base_cost) : null,
          adder_soft_costs: p.adder_soft_costs ? parseFloat(p.adder_soft_costs) : null,
          sort_order: i,
        }))

        await supabase.from('btr_product_mix').insert(prodRows)
      }

      // Create empty calculated returns record
      await supabase.from('btr_calculated_returns').insert({ project_id: project.id })

      router.push('/btr')
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving project. Check console.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />

      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/btr" className="btn-ghost">&larr; Back</Link>
            <h2 className="text-sm font-medium text-slate-300">New BTR Project</h2>
          </div>
          <button onClick={saveProject} className="btn-primary" disabled={!form.name || saving}>
            {saving ? 'Saving...' : 'Create Project'}
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Project Info */}
        <Section title="A. Project Info">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Project Name" span={2}>
              <input className="input-field" value={form.name}
                     onChange={e => update('name', e.target.value)}
                     placeholder="e.g., Alcove at Boiling Springs" />
            </Field>
            <Field label="RCC Scope">
              <select className="input-field" value={form.scope}
                      onChange={e => update('scope', e.target.value)}>
                <option value="vertical_only">Vertical Only</option>
                <option value="horizontal_and_vertical">Horizontal + Vertical</option>
              </select>
            </Field>
            <Field label="Property Type">
              <select className="input-field" value={form.property_type}
                      onChange={e => update('property_type', e.target.value)}>
                <option value="TH">Townhome</option>
                <option value="SFH">Single Family</option>
                <option value="Mixed">Mixed</option>
              </select>
            </Field>
            <Field label="BTR Operator / Client">
              <input className="input-field" value={form.btr_operator}
                     onChange={e => update('btr_operator', e.target.value)}
                     placeholder="e.g., NexMetro, AHV" />
            </Field>
            <Field label="Developer">
              <input className="input-field" value={form.developer}
                     onChange={e => update('developer', e.target.value)} placeholder="" />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="B. Location">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Address" span={2}>
              <input className="input-field" value={form.address}
                     onChange={e => update('address', e.target.value)} />
            </Field>
            <Field label="City">
              <input className="input-field" value={form.city}
                     onChange={e => update('city', e.target.value)} />
            </Field>
            <Field label="County">
              <input className="input-field" value={form.county}
                     onChange={e => update('county', e.target.value)} />
            </Field>
            <Field label="State">
              <input className="input-field" value={form.state}
                     onChange={e => update('state', e.target.value)} />
            </Field>
            <Field label="ZIP">
              <input className="input-field" value={form.zip}
                     onChange={e => update('zip', e.target.value)} />
            </Field>
            <Field label="Acreage">
              <input type="number" step="0.01" className="input-field" value={form.acreage}
                     onChange={e => update('acreage', e.target.value)} />
            </Field>
            <Field label="Zoning">
              <input className="input-field" value={form.notes}
                     onChange={e => update('notes', e.target.value)} placeholder="Current zoning" />
            </Field>
          </div>
        </Section>

        {/* Project Summary */}
        <Section title="C. Project Summary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Total Units">
              <input type="number" className="input-field" value={form.total_units}
                     onChange={e => update('total_units', e.target.value)} placeholder="210" />
            </Field>
            <Field label="Avg SF / Unit">
              <input type="number" className="input-field" value={form.avg_sf_per_unit}
                     onChange={e => update('avg_sf_per_unit', e.target.value)} placeholder="1450" />
            </Field>
            <Field label="Avg Rent / Unit">
              <input type="number" className="input-field" value={form.avg_rent_per_unit}
                     onChange={e => update('avg_rent_per_unit', e.target.value)} placeholder="1850" />
            </Field>
            <Field label="Construction (months)">
              <input type="number" className="input-field" value={form.construction_months}
                     onChange={e => update('construction_months', e.target.value)} />
            </Field>
            <Field label="Lender">
              <input className="input-field" value={form.lender}
                     onChange={e => update('lender', e.target.value)} />
            </Field>
            <Field label="Land Purchase Price ($)">
              <input type="number" className="input-field"
                     onChange={e => update('notes', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* Lot Matrix */}
        <Section title="D. Lot Matrix" action={
          <button onClick={addLotType} className="text-xs text-cedar-400 hover:text-cedar-300 transition-colors">
            + Add Lot Type
          </button>
        }>
          {lotTypes.length === 0 ? (
            <p className="text-sm text-slate-500">No lot types added. Click "+ Add Lot Type" to begin.</p>
          ) : (
            <div className="space-y-4">
              {lotTypes.map((lot, i) => (
                <div key={lot.key} className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 font-mono">Lot Type {i + 1}</span>
                    <button onClick={() => removeLot(lot.key)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="input-label">Name</label>
                      <input className="input-field" value={lot.lot_type_name}
                             onChange={e => updateLot(lot.key, 'lot_type_name', e.target.value)}
                             placeholder="41' SF" />
                    </div>
                    <div>
                      <label className="input-label">Type</label>
                      <select className="input-field" value={lot.product_type}
                              onChange={e => updateLot(lot.key, 'product_type', e.target.value)}>
                        <option value="townhome">Townhome</option>
                        <option value="sfh">SFH</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Count</label>
                      <input type="number" className="input-field" value={lot.lot_count || ''}
                             onChange={e => updateLot(lot.key, 'lot_count', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="input-label">Width (ft)</label>
                      <input type="number" className="input-field" value={lot.lot_width}
                             onChange={e => updateLot(lot.key, 'lot_width', e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">Depth (ft)</label>
                      <input type="number" className="input-field" value={lot.lot_depth}
                             onChange={e => updateLot(lot.key, 'lot_depth', e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">Load</label>
                      <select className="input-field" value={lot.load_type}
                              onChange={e => updateLot(lot.key, 'load_type', e.target.value)}>
                        <option value="Rear load">Rear Load</option>
                        <option value="Front load">Front Load</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Product Mix */}
        <Section title="E. Product Mix" action={
          <button onClick={() => addProduct()} className="text-xs text-cedar-400 hover:text-cedar-300 transition-colors">
            + Add Product
          </button>
        }>
          {products.length === 0 ? (
            <p className="text-sm text-slate-500">No products added. Click "+ Add Product" to map floor plans to lots.</p>
          ) : (
            <div className="space-y-4">
              {products.map((prod, i) => (
                <div key={prod.key} className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 font-mono">Product {i + 1}</span>
                    <button onClick={() => removeProduct(prod.key)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {lotTypes.length > 0 && (
                      <div>
                        <label className="input-label">Lot Type</label>
                        <select className="input-field" value={prod.lot_key}
                                onChange={e => updateProduct(prod.key, 'lot_key', e.target.value)}>
                          <option value="">—</option>
                          {lotTypes.map(l => (
                            <option key={l.key} value={l.key}>{l.lot_type_name || 'Unnamed'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="input-label">Plan Name</label>
                      <input className="input-field" value={prod.plan_name}
                             onChange={e => updateProduct(prod.key, 'plan_name', e.target.value)}
                             placeholder="WILLOW" />
                    </div>
                    <div>
                      <label className="input-label">Units</label>
                      <input type="number" className="input-field" value={prod.unit_count || ''}
                             onChange={e => updateProduct(prod.key, 'unit_count', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="input-label">SF</label>
                      <input type="number" className="input-field" value={prod.heated_sf}
                             onChange={e => updateProduct(prod.key, 'heated_sf', e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">Bed / Bath</label>
                      <div className="flex gap-1">
                        <input type="number" className="input-field w-1/2" value={prod.bedrooms}
                               onChange={e => updateProduct(prod.key, 'bedrooms', e.target.value)} placeholder="3" />
                        <input type="number" step="0.5" className="input-field w-1/2" value={prod.bathrooms}
                               onChange={e => updateProduct(prod.key, 'bathrooms', e.target.value)} placeholder="2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Garage</label>
                      <input className="input-field" value={prod.garage_type}
                             onChange={e => updateProduct(prod.key, 'garage_type', e.target.value)} placeholder="1-Car" />
                    </div>
                    <div>
                      <label className="input-label">Target Rent/mo</label>
                      <input type="number" className="input-field" value={prod.target_rent_monthly}
                             onChange={e => updateProduct(prod.key, 'target_rent_monthly', e.target.value)} placeholder="1850" />
                    </div>
                    <div>
                      <label className="input-label">Base S&B Cost</label>
                      <input type="number" className="input-field" value={prod.base_cost}
                             onChange={e => updateProduct(prod.key, 'base_cost', e.target.value)} placeholder="143200" />
                    </div>
                    <div>
                      <label className="input-label">Adder/Soft</label>
                      <input type="number" className="input-field" value={prod.adder_soft_costs}
                             onChange={e => updateProduct(prod.key, 'adder_soft_costs', e.target.value)} placeholder="12000" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Notes */}
        <Section title="F. Notes">
          <textarea className="input-field min-h-[100px]" value={form.notes}
                    onChange={e => update('notes', e.target.value)}
                    placeholder="General project notes, key considerations..." />
        </Section>

        <div className="flex justify-end pt-4">
          <button onClick={saveProject} className="btn-primary" disabled={!form.name || saving}>
            {saving ? 'Saving...' : 'Create Project'}
          </button>
        </div>
      </main>
    </div>
  )
}
