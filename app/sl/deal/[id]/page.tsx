'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt, pct, npmColor, landColor, recBadge, npmBg } from '@/lib/format'
import { npmLabel, landLabel } from '@/lib/underwrite'
import Link from 'next/link'

export default function DealDetailPage() {
  const params = useParams()
  const [deal, setDeal] = useState<any>(null)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadDeal()
  }, [])

  async function loadDeal() {
    const { data } = await supabase
      .from('sl_deals')
      .select('*, sl_deal_results(*)')
      .eq('id', params.id)
      .single()

    if (data) {
      setDeal(data)
      setResults(data.sl_deal_results?.[0] || null)
    }
    setLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
  if (!deal) return <div className="min-h-screen flex items-center justify-center text-slate-500">Deal not found</div>

  const r = results

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
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sl" className="btn-ghost">&larr; Portfolio</Link>
            <div>
              <h1 className="font-display text-lg text-slate-100">{deal.address}</h1>
              <p className="text-xs text-slate-500">{deal.city}, {deal.state} {deal.zip} · {deal.subdivision || ''}</p>
            </div>
          </div>
          <span className={`badge text-sm px-4 py-1 ${recBadge(deal.recommendation || 'DECLINE')}`}>
            {deal.recommendation || 'N/A'}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Top Stats */}
        {r && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="card p-4 text-center">
              <div className={`stat-value text-xl ${npmColor(r.npm)}`}>{pct(r.npm)}</div>
              <div className="stat-label">NPM · {npmLabel(r.npm)}</div>
            </div>
            <div className="card p-4 text-center">
              <div className={`stat-value text-xl ${landColor(r.land_cost_ratio)}`}>{pct(r.land_cost_ratio)}</div>
              <div className="stat-label">Land Ratio · {landLabel(r.land_cost_ratio)}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="stat-value text-xl">{fmt(r.net_profit)}</div>
              <div className="stat-label">Net Profit</div>
            </div>
            <div className="card p-4 text-center">
              <div className="stat-value text-xl text-slate-300">{fmt(r.total_project_cost)}</div>
              <div className="stat-label">Project Cost</div>
            </div>
            <div className="card p-4 text-center">
              <div className="stat-value text-xl text-slate-300">{fmt(deal.asp)}</div>
              <div className="stat-label">ASP</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Property & Plan */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Property & Plan</h3>
            <div className="text-sm space-y-1">
              <Row label="Plan" value={`${deal.plan_name} (${deal.plan_sf} SF)`} />
              <Row label="Config" value={`${deal.plan_bed}/${deal.plan_bath}, ${deal.plan_garage}`} />
              <Row label="Jurisdiction" value={deal.jurisdiction || 'VERIFY'} />
              <Row label="Lot" value={deal.lot_acres ? `${deal.lot_acres} acres` : 'N/A'} />
              <Row label="Duration" value={`${deal.duration_days} days`} />
            </div>
          </div>

          {/* Lot Basis */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Lot Basis</h3>
            <div className="text-sm space-y-1">
              <Row label="Purchase Price" value={fmt(deal.lot_purchase_price)} />
              <Row label="Closing Costs" value={fmt(deal.closing_costs)} />
              <Row label="Due Diligence" value={fmt(deal.due_diligence)} />
              <Row label="Other" value={fmt(deal.other_acq_costs)} />
              {r && <Row label="Total Lot Basis" value={fmt(r.total_lot_basis)} bold />}
            </div>
          </div>

          {/* Contract Cost */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">RCH Contract Cost</h3>
            <div className="text-sm space-y-1">
              <Row label="S&B (DM Budget Sept 2025)" value={fmt(deal.s_and_b)} />
              <Row label="Site Specific" value={fmt(deal.site_specific)} />
              <Row label="Soft Costs" value={fmt(deal.soft_costs)} />
              <Row label="Contingency" value={fmt(deal.contingency)} />
              <Row label="RCH Builder Fee" value={fmt(deal.rch_builder_fee)} />
              {r && <Row label="Total Contract Cost" value={fmt(r.total_contract_cost)} bold />}
            </div>
          </div>

          {/* Upgrades & Muni */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Upgrades & Municipality</h3>
            <div className="text-sm space-y-1">
              <Row label="Hardie Color-Plus" value={fmt(deal.hardie_color_plus)} />
              <Row label="Elevation" value={fmt(deal.elevation_upgrade)} />
              <Row label={`Interior (${deal.interior_package_name || 'None'})`} value={fmt(deal.interior_package)} />
              <Row label="Misc Upgrades" value={fmt(deal.misc_upgrades)} />
              {r && <Row label="Total Upgrades" value={fmt(r.total_upgrades)} bold />}
              <div className="pt-2" />
              <Row label="Water/Sewer/Permits" value={fmt(deal.water_tap + deal.sewer_sssd + deal.sewer_tap + deal.building_permit + deal.plan_review + deal.trade_permits)} />
              <Row label="Additional Site" value={fmt(deal.additional_site_work)} />
            </div>
          </div>

          {/* RCH Fixed & Financing */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">RCH Fixed & Financing</h3>
            <div className="text-sm space-y-1">
              <Row label="Warranty / Risk / PO / PM" value={fmt(deal.builder_warranty + deal.builders_risk + deal.po_fee + deal.pm_fee)} />
              <Row label="RCH AM Fee" value={fmt(deal.rch_am_fee)} />
              <Row label="Utilities + Misc" value={fmt((deal.utility_charges || 0) + deal.misc_fixed)} />
              {r && <Row label="Total RCH Fixed" value={fmt(r.total_rch_fixed_house)} bold />}
              {r && (
                <>
                  <div className="pt-2" />
                  <Row label={`Loan (85% LTC @ ${(deal.interest_rate * 100).toFixed(2)}%)`} value={fmt(r.loan_amount)} />
                  <Row label="Interest Carry" value={fmt(r.interest_carry)} />
                  <Row label="Cost of Capital" value={fmt(r.cost_of_capital_carry)} />
                  <Row label="Total Carry" value={fmt(r.total_carry)} bold />
                </>
              )}
            </div>
          </div>

          {/* Returns */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Returns</h3>
            {r && (
              <div className="text-sm space-y-1">
                <Row label="ASP" value={fmt(deal.asp)} />
                <Row label="Selling Costs (8.5%)" value={`(${fmt(r.selling_costs)})`} />
                <Row label="Concessions" value={`(${fmt(deal.selling_concessions)})`} />
                <Row label="Net Proceeds" value={fmt(r.net_sales_proceeds)} bold />
                <Row label="Total All-In Cost" value={`(${fmt(r.total_all_in_cost)})`} />
                <Row label="Net Profit" value={fmt(r.net_profit)} bold />
                <div className="pt-2" />
                <Row label="Breakeven ASP" value={fmt(r.breakeven_asp)} />
                <Row label="Min ASP (5% margin)" value={fmt(r.min_asp_5pct)} />
              </div>
            )}
          </div>

          {/* Sensitivity */}
          {r && (
            <div className="card p-5 space-y-3 md:col-span-2">
              <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium">Sensitivity Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      <th className="table-header">Scenario</th>
                      <th className="table-header text-right">Net Profit</th>
                      <th className="table-header text-right">NPM</th>
                      <th className="table-header text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {[
                      ['Base Case', r.net_profit, r.npm],
                      ['Best Case (-5% cost, +5% ASP)', r.best_case_profit, r.best_case_npm],
                      ['+10% Cost Overrun', r.stress_cost_profit, r.stress_cost_npm],
                      ['-10% ASP Decline', r.stress_asp_profit, r.stress_asp_npm],
                      ['+30-Day Delay', r.stress_delay_profit, r.stress_delay_npm],
                      ['Worst Case (combined)', r.worst_case_profit, r.worst_case_npm],
                    ].map(([label, profit, npm], i) => (
                      <tr key={i}>
                        <td className="table-cell text-slate-300">{label as string}</td>
                        <td className="table-cell text-right font-mono">{fmt(profit as number)}</td>
                        <td className={`table-cell text-right font-mono ${npmColor(npm as number)}`}>{pct(npm as number)}</td>
                        <td className="table-cell text-right">
                          <span className={`badge ${npmBg(npm as number)} text-xs`}>{npmLabel(npm as number)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
