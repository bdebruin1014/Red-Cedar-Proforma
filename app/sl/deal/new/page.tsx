'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FLOOR_PLANS, FloorPlan } from '@/lib/floor-plans'
import { underwrite, DealInputs, npmLabel, landLabel } from '@/lib/underwrite'
import { fmt, pct, npmColor, landColor, recBadge } from '@/lib/format'
import { createBrowserClient } from '@/lib/supabase'

const DEFAULTS = {
  closing_costs: 2500,
  acquisition_comm: 0,
  due_diligence: 1500,
  other_acq_costs: 500,
  duration_days: 150,
  interest_rate: 9.75,
  cost_of_capital_rate: 16,
  site_specific: 10875,
  soft_costs: 2650,
  contingency: 11000,
  rch_builder_fee: 17500,
  hardie_color_plus: 3500,
  elevation_upgrade: 3500,
  interior_package: 0,
  misc_upgrades: 0,
  water_tap: 3000,
  sewer_sssd: 2500,
  sewer_tap: 2000,
  building_permit: 2500,
  plan_review: 1250,
  trade_permits: 400,
  other_muni_costs: 0,
  additional_site_work: 5000,
  builder_warranty: 5000,
  builders_risk: 1500,
  po_fee: 3000,
  pm_fee: 3500,
  rch_am_fee: 5000,
  misc_fixed: 11000,
  selling_cost_pct: 8.5,
  selling_concessions: 5000,
}

const INTERIOR_PACKAGES: Record<string, number> = {
  'None': 0,
  'Foxcroft Classic': 4059,
  'Midwood Classic': 3792,
  'Madison Classic': 3852,
  'Uptown Classic': 3984,
  'Foxcroft Elegance': 6181,
  'Midwood Elegance': 6468,
  'Madison Elegance': 8197,
  'Uptown Elegance': 8623,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-6">
      <div className="card-header">
        <h3 className="text-sm font-medium text-cedar-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? 'md:col-span-2' : span === 3 ? 'lg:col-span-3' : ''}>
      <label className="input-label">{label}</label>
      {children}
    </div>
  )
}

export default function NewDealPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<ReturnType<typeof underwrite> | null>(null)

  const [form, setForm] = useState({
    address: '', city: '', state: 'SC', zip: '',
    subdivision: '', jurisdiction: '', lot_acres: '',
    lot_purchase_price: '',
    plan_name: '',
    interior_package_name: 'None',
    asp: '',
    ...DEFAULTS,
  })

  const selectedPlan = FLOOR_PLANS.find(p => p.name === form.plan_name)

  function update(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
    setPreview(null)
  }

  function numVal(v: string | number): number {
    if (typeof v === 'number') return v
    return parseFloat(v) || 0
  }

  function runPreview() {
    if (!selectedPlan || !form.lot_purchase_price || !form.asp) return

    const inputs: DealInputs = {
      lot_purchase_price: numVal(form.lot_purchase_price),
      closing_costs: numVal(form.closing_costs),
      acquisition_comm: numVal(form.acquisition_comm),
      due_diligence: numVal(form.due_diligence),
      other_acq_costs: numVal(form.other_acq_costs),
      duration_days: numVal(form.duration_days),
      interest_rate: numVal(form.interest_rate) / 100,
      cost_of_capital_rate: numVal(form.cost_of_capital_rate) / 100,
      plan_name: selectedPlan.name,
      plan_sf: selectedPlan.sf,
      s_and_b: selectedPlan.s_and_b,
      site_specific: numVal(form.site_specific),
      soft_costs: numVal(form.soft_costs),
      contingency: numVal(form.contingency),
      rch_builder_fee: numVal(form.rch_builder_fee),
      hardie_color_plus: numVal(form.hardie_color_plus),
      elevation_upgrade: numVal(form.elevation_upgrade),
      interior_package: INTERIOR_PACKAGES[form.interior_package_name] || 0,
      misc_upgrades: numVal(form.misc_upgrades),
      water_tap: numVal(form.water_tap),
      sewer_sssd: numVal(form.sewer_sssd),
      sewer_tap: numVal(form.sewer_tap),
      building_permit: numVal(form.building_permit),
      plan_review: numVal(form.plan_review),
      trade_permits: numVal(form.trade_permits),
      other_muni_costs: numVal(form.other_muni_costs),
      additional_site_work: numVal(form.additional_site_work),
      builder_warranty: numVal(form.builder_warranty),
      builders_risk: numVal(form.builders_risk),
      po_fee: numVal(form.po_fee),
      pm_fee: numVal(form.pm_fee),
      rch_am_fee: numVal(form.rch_am_fee),
      misc_fixed: numVal(form.misc_fixed),
      asp: numVal(form.asp),
      selling_cost_pct: numVal(form.selling_cost_pct) / 100,
      selling_concessions: numVal(form.selling_concessions),
    }

    setPreview(underwrite(inputs))
  }

  async function saveDeal() {
    if (!preview || !selectedPlan) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const dealData = {
        created_by: user?.id || null,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        subdivision: form.subdivision || null,
        jurisdiction: form.jurisdiction || null,
        lot_acres: form.lot_acres ? parseFloat(form.lot_acres) : null,
        lot_purchase_price: numVal(form.lot_purchase_price),
        closing_costs: numVal(form.closing_costs),
        acquisition_comm: numVal(form.acquisition_comm),
        due_diligence: numVal(form.due_diligence),
        other_acq_costs: numVal(form.other_acq_costs),
        duration_days: numVal(form.duration_days),
        interest_rate: numVal(form.interest_rate) / 100,
        cost_of_capital_rate: numVal(form.cost_of_capital_rate) / 100,
        plan_name: selectedPlan.name,
        plan_sf: selectedPlan.sf,
        plan_bed: selectedPlan.bed,
        plan_bath: selectedPlan.bath,
        plan_garage: selectedPlan.garage,
        plan_stories: selectedPlan.stories,
        plan_width: selectedPlan.width,
        s_and_b: selectedPlan.s_and_b,
        site_specific: numVal(form.site_specific),
        soft_costs: numVal(form.soft_costs),
        contingency: numVal(form.contingency),
        rch_builder_fee: numVal(form.rch_builder_fee),
        hardie_color_plus: numVal(form.hardie_color_plus),
        elevation_upgrade: numVal(form.elevation_upgrade),
        interior_package: INTERIOR_PACKAGES[form.interior_package_name] || 0,
        interior_package_name: form.interior_package_name,
        misc_upgrades: numVal(form.misc_upgrades),
        water_tap: numVal(form.water_tap),
        sewer_sssd: numVal(form.sewer_sssd),
        sewer_tap: numVal(form.sewer_tap),
        building_permit: numVal(form.building_permit),
        plan_review: numVal(form.plan_review),
        trade_permits: numVal(form.trade_permits),
        other_muni_costs: numVal(form.other_muni_costs),
        additional_site_work: numVal(form.additional_site_work),
        builder_warranty: numVal(form.builder_warranty),
        builders_risk: numVal(form.builders_risk),
        po_fee: numVal(form.po_fee),
        pm_fee: numVal(form.pm_fee),
        rch_am_fee: numVal(form.rch_am_fee),
        utility_charges: preview.utility_charges,
        misc_fixed: numVal(form.misc_fixed),
        asp: numVal(form.asp),
        selling_cost_pct: numVal(form.selling_cost_pct) / 100,
        selling_concessions: numVal(form.selling_concessions),
        status: 'analyzed',
        recommendation: preview.recommendation,
      }

      const { data: deal, error: dealError } = await supabase
        .from('sl_deals')
        .insert(dealData)
        .select('id')
        .single()

      if (dealError) throw dealError

      const resultData = {
        deal_id: deal.id,
        total_lot_basis: preview.total_lot_basis,
        total_contract_cost: preview.total_contract_cost,
        total_upgrades: preview.total_upgrades,
        total_muni_soft_costs: preview.total_muni_soft_costs,
        total_rch_fixed_house: preview.total_rch_fixed_house,
        total_project_cost: preview.total_project_cost,
        loan_amount: preview.loan_amount,
        equity_required: preview.equity_required,
        interest_carry: preview.interest_carry,
        cost_of_capital_carry: preview.cost_of_capital_carry,
        total_carry: preview.total_carry,
        total_all_in_cost: preview.total_all_in_cost,
        selling_costs: preview.selling_costs,
        net_sales_proceeds: preview.net_sales_proceeds,
        net_profit: preview.net_profit,
        npm: preview.npm,
        land_cost_ratio: preview.land_cost_ratio,
        breakeven_asp: preview.breakeven_asp,
        min_asp_5pct: preview.min_asp_5pct,
        best_case_profit: preview.best_case_profit,
        best_case_npm: preview.best_case_npm,
        worst_case_profit: preview.worst_case_profit,
        worst_case_npm: preview.worst_case_npm,
        stress_cost_profit: preview.stress_cost_profit,
        stress_cost_npm: preview.stress_cost_npm,
        stress_asp_profit: preview.stress_asp_profit,
        stress_asp_npm: preview.stress_asp_npm,
        stress_delay_profit: preview.stress_delay_profit,
        stress_delay_npm: preview.stress_delay_npm,
      }

      await supabase.from('sl_deal_results').insert(resultData)

      router.push('/sl')
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving deal. Check console.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="noise-bg min-h-screen">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/sl" className="btn-ghost">&larr; Back</a>
            <h1 className="font-display text-lg text-slate-100">New Deal Analysis</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={runPreview} className="btn-ghost border border-slate-700"
                    disabled={!selectedPlan || !form.lot_purchase_price || !form.asp}>
              Preview Results
            </button>
            <button onClick={saveDeal} className="btn-primary"
                    disabled={!preview || saving}>
              {saving ? 'Saving...' : 'Save Deal'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form Inputs */}
          <div className="lg:col-span-2 space-y-0">
            <Section title="A. Property Info">
              <Field label="Street Address" span={2}>
                <input className="input-field" value={form.address}
                       onChange={e => update('address', e.target.value)}
                       placeholder="378 Copper Creek Cir" />
              </Field>
              <Field label="City">
                <input className="input-field" value={form.city}
                       onChange={e => update('city', e.target.value)} placeholder="Inman" />
              </Field>
              <Field label="State">
                <input className="input-field" value={form.state}
                       onChange={e => update('state', e.target.value)} placeholder="SC" />
              </Field>
              <Field label="ZIP">
                <input className="input-field" value={form.zip}
                       onChange={e => update('zip', e.target.value)} placeholder="29349" />
              </Field>
              <Field label="Subdivision">
                <input className="input-field" value={form.subdivision}
                       onChange={e => update('subdivision', e.target.value)} placeholder="Copper Creek" />
              </Field>
              <Field label="Jurisdiction">
                <input className="input-field" value={form.jurisdiction}
                       onChange={e => update('jurisdiction', e.target.value)} placeholder="Spartanburg County" />
              </Field>
              <Field label="Lot Acres">
                <input type="number" step="0.01" className="input-field" value={form.lot_acres}
                       onChange={e => update('lot_acres', e.target.value)} placeholder="0.65" />
              </Field>
            </Section>

            <Section title="B. Lot Basis">
              <Field label="Lot Purchase Price ($)">
                <input type="number" className="input-field" value={form.lot_purchase_price}
                       onChange={e => update('lot_purchase_price', e.target.value)} placeholder="85000" />
              </Field>
              <Field label="Closing Costs">
                <input type="number" className="input-field" value={form.closing_costs}
                       onChange={e => update('closing_costs', numVal(e.target.value))} />
              </Field>
              <Field label="Acquisition Comm">
                <input type="number" className="input-field" value={form.acquisition_comm}
                       onChange={e => update('acquisition_comm', numVal(e.target.value))} />
              </Field>
              <Field label="Due Diligence">
                <input type="number" className="input-field" value={form.due_diligence}
                       onChange={e => update('due_diligence', numVal(e.target.value))} />
              </Field>
              <Field label="Other Acq Costs">
                <input type="number" className="input-field" value={form.other_acq_costs}
                       onChange={e => update('other_acq_costs', numVal(e.target.value))} />
              </Field>
            </Section>

            <Section title="C. Floor Plan">
              <Field label="Select Floor Plan" span={3}>
                <select className="input-field" value={form.plan_name}
                        onChange={e => update('plan_name', e.target.value)}>
                  <option value="">Choose a plan...</option>
                  <optgroup label="Single Family Homes">
                    {FLOOR_PLANS.filter(p => p.type === 'SFH').map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} — {p.sf} SF, {p.bed}/{p.bath}, {p.garage}, {p.width} wide, S&B: ${p.s_and_b.toLocaleString()}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Townhomes">
                    {FLOOR_PLANS.filter(p => p.type === 'TH').map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} — {p.sf} SF, {p.bed}/{p.bath}, {p.garage}, {p.width} wide, S&B: ${p.s_and_b.toLocaleString()}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              {selectedPlan && (
                <div className="lg:col-span-3 bg-slate-800/30 rounded-lg p-3 text-sm">
                  <span className="font-mono text-cedar-400">{selectedPlan.name}</span>
                  <span className="text-slate-400"> — {selectedPlan.sf} SF, {selectedPlan.bed} bed / {selectedPlan.bath} bath, {selectedPlan.garage}, {selectedPlan.stories}-story, {selectedPlan.width} wide</span>
                  <span className="text-slate-500 ml-2">S&B: {fmt(selectedPlan.s_and_b)} ({fmt(Math.round(selectedPlan.s_and_b / selectedPlan.sf))}/SF)</span>
                </div>
              )}
            </Section>

            <Section title="D. Upgrades">
              <Field label="Hardie Color-Plus">
                <input type="number" className="input-field" value={form.hardie_color_plus}
                       onChange={e => update('hardie_color_plus', numVal(e.target.value))} />
              </Field>
              <Field label="Elevation Upgrade">
                <input type="number" className="input-field" value={form.elevation_upgrade}
                       onChange={e => update('elevation_upgrade', numVal(e.target.value))} />
              </Field>
              <Field label="Interior Package">
                <select className="input-field" value={form.interior_package_name}
                        onChange={e => update('interior_package_name', e.target.value)}>
                  {Object.entries(INTERIOR_PACKAGES).map(([name, cost]) => (
                    <option key={name} value={name}>{name}{cost > 0 ? ` — $${cost.toLocaleString()}` : ''}</option>
                  ))}
                </select>
              </Field>
              <Field label="Misc Upgrades">
                <input type="number" className="input-field" value={form.misc_upgrades}
                       onChange={e => update('misc_upgrades', numVal(e.target.value))} />
              </Field>
            </Section>

            <Section title="E. Municipality Soft Costs">
              <Field label="Water Tap">
                <input type="number" className="input-field" value={form.water_tap}
                       onChange={e => update('water_tap', numVal(e.target.value))} />
              </Field>
              <Field label="SSSD Capacity">
                <input type="number" className="input-field" value={form.sewer_sssd}
                       onChange={e => update('sewer_sssd', numVal(e.target.value))} />
              </Field>
              <Field label="Sewer Tap">
                <input type="number" className="input-field" value={form.sewer_tap}
                       onChange={e => update('sewer_tap', numVal(e.target.value))} />
              </Field>
              <Field label="Building Permit">
                <input type="number" className="input-field" value={form.building_permit}
                       onChange={e => update('building_permit', numVal(e.target.value))} />
              </Field>
              <Field label="Plan Review">
                <input type="number" className="input-field" value={form.plan_review}
                       onChange={e => update('plan_review', numVal(e.target.value))} />
              </Field>
              <Field label="Trade Permits">
                <input type="number" className="input-field" value={form.trade_permits}
                       onChange={e => update('trade_permits', numVal(e.target.value))} />
              </Field>
            </Section>

            <Section title="F. Additional Site Work">
              <Field label="Additional Site Work ($)">
                <input type="number" className="input-field" value={form.additional_site_work}
                       onChange={e => update('additional_site_work', numVal(e.target.value))} />
              </Field>
            </Section>

            <Section title="G. RCH Fixed House Costs">
              <Field label="Builder Warranty">
                <input type="number" className="input-field" value={form.builder_warranty}
                       onChange={e => update('builder_warranty', numVal(e.target.value))} />
              </Field>
              <Field label="Builder's Risk">
                <input type="number" className="input-field" value={form.builders_risk}
                       onChange={e => update('builders_risk', numVal(e.target.value))} />
              </Field>
              <Field label="PO Fee">
                <input type="number" className="input-field" value={form.po_fee}
                       onChange={e => update('po_fee', numVal(e.target.value))} />
              </Field>
              <Field label="PM Fee">
                <input type="number" className="input-field" value={form.pm_fee}
                       onChange={e => update('pm_fee', numVal(e.target.value))} />
              </Field>
              <Field label="RCH AM Fee">
                <input type="number" className="input-field" value={form.rch_am_fee}
                       onChange={e => update('rch_am_fee', numVal(e.target.value))} />
              </Field>
              <Field label="Misc Fixed">
                <input type="number" className="input-field" value={form.misc_fixed}
                       onChange={e => update('misc_fixed', numVal(e.target.value))} />
              </Field>
            </Section>

            <Section title="H. Sales Info">
              <Field label="Anticipated Sales Price ($)">
                <input type="number" className="input-field" value={form.asp}
                       onChange={e => update('asp', e.target.value)} placeholder="475000" />
              </Field>
              <Field label="Selling Cost %">
                <input type="number" step="0.1" className="input-field" value={form.selling_cost_pct}
                       onChange={e => update('selling_cost_pct', numVal(e.target.value))} />
              </Field>
              <Field label="Selling Concessions ($)">
                <input type="number" className="input-field" value={form.selling_concessions}
                       onChange={e => update('selling_concessions', numVal(e.target.value))} />
              </Field>
            </Section>

            <Section title="Timing & Financing">
              <Field label="Duration (days)">
                <input type="number" className="input-field" value={form.duration_days}
                       onChange={e => update('duration_days', numVal(e.target.value))} />
              </Field>
              <Field label="Interest Rate (%)">
                <input type="number" step="0.25" className="input-field" value={form.interest_rate}
                       onChange={e => update('interest_rate', numVal(e.target.value))} />
              </Field>
              <Field label="Cost of Capital (%)">
                <input type="number" step="1" className="input-field" value={form.cost_of_capital_rate}
                       onChange={e => update('cost_of_capital_rate', numVal(e.target.value))} />
              </Field>
            </Section>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {preview ? (
                <>
                  <div className="card p-5">
                    <div className="text-center mb-4">
                      <span className={`badge text-base px-4 py-1 ${recBadge(preview.recommendation)}`}>
                        {preview.recommendation}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className={`stat-value text-xl ${npmColor(preview.npm)}`}>{pct(preview.npm)}</div>
                        <div className="stat-label">NPM · {preview.npm_label}</div>
                      </div>
                      <div>
                        <div className={`stat-value text-xl ${landColor(preview.land_cost_ratio)}`}>{pct(preview.land_cost_ratio)}</div>
                        <div className="stat-label">Land Ratio · {preview.land_label}</div>
                      </div>
                    </div>
                  </div>

                  <div className="card p-5 space-y-3">
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider">Returns</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Net Profit</span><span className="font-mono">{fmt(preview.net_profit)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Total All-In</span><span className="font-mono text-slate-400">{fmt(preview.total_all_in_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Breakeven ASP</span><span className="font-mono text-slate-500">{fmt(preview.breakeven_asp)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Min ASP (5%)</span><span className="font-mono text-slate-500">{fmt(preview.min_asp_5pct)}</span></div>
                    </div>
                  </div>

                  <div className="card p-5 space-y-3">
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider">Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Lot Basis</span><span className="font-mono">{fmt(preview.total_lot_basis)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Contract Cost</span><span className="font-mono">{fmt(preview.total_contract_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Upgrades</span><span className="font-mono">{fmt(preview.total_upgrades)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Muni Soft Costs</span><span className="font-mono">{fmt(preview.total_muni_soft_costs)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">RCH Fixed House</span><span className="font-mono">{fmt(preview.total_rch_fixed_house)}</span></div>
                      <div className="flex justify-between border-t border-slate-800/60 pt-2"><span className="text-slate-300 font-medium">Project Cost</span><span className="font-mono font-medium">{fmt(preview.total_project_cost)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Carry</span><span className="font-mono text-slate-400">{fmt(preview.total_carry)}</span></div>
                    </div>
                  </div>

                  <div className="card p-5 space-y-3">
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider">Sensitivity</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Best Case</span><span className={`font-mono ${npmColor(preview.best_case_npm)}`}>{pct(preview.best_case_npm)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">+10% Cost</span><span className={`font-mono ${npmColor(preview.stress_cost_npm)}`}>{pct(preview.stress_cost_npm)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">-10% ASP</span><span className={`font-mono ${npmColor(preview.stress_asp_npm)}`}>{pct(preview.stress_asp_npm)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">+30d Delay</span><span className={`font-mono ${npmColor(preview.stress_delay_npm)}`}>{pct(preview.stress_delay_npm)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Worst Case</span><span className={`font-mono ${npmColor(preview.worst_case_npm)}`}>{pct(preview.worst_case_npm)}</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card p-8 text-center">
                  <div className="text-slate-600 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Fill in lot price, select a plan, set ASP, then click "Preview Results"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
