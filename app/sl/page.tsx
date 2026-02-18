'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { fmt, pct, npmColor, recBadge } from '@/lib/format'
import Link from 'next/link'
import TopNav from '@/components/TopNav'

interface DealRow {
  id: string
  address: string
  city: string
  state: string
  subdivision: string | null
  plan_name: string
  plan_sf: number
  asp: number
  status: string
  created_at: string
  recommendation: string | null
  sl_deal_results: {
    net_profit: number
    npm: number
    land_cost_ratio: number
    total_project_cost: number
  }[]
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadDeals()
  }, [])

  async function loadDeals() {
    const { data, error } = await supabase
      .from('sl_deals')
      .select(`
        id, address, city, state, subdivision, plan_name, plan_sf, asp,
        status, created_at, recommendation,
        sl_deal_results (net_profit, npm, land_cost_ratio, total_project_cost)
      `)
      .order('created_at', { ascending: false })

    if (data) setDeals(data as DealRow[])
    setLoading(false)
  }

  const totalDeals = deals.length
  const proceedDeals = deals.filter(d => d.recommendation === 'PROCEED').length
  const totalProfit = deals.reduce((sum, d) => {
    const r = d.sl_deal_results?.[0]
    return sum + (r?.net_profit || 0)
  }, 0)
  const avgNPM = deals.length > 0
    ? deals.reduce((sum, d) => sum + (d.sl_deal_results?.[0]?.npm || 0), 0) / deals.length
    : 0

  return (
    <div className="noise-bg min-h-screen">
      {/* Header */}
      <TopNav />
      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-300">SL Deal Analyzer</h2>
            <p className="text-xs text-slate-500">Scattered Lot Underwriting</p>
          </div>
          <Link href="/sl/deal/new" className="btn-primary">
            + New Deal
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card p-5">
            <div className="stat-value text-slate-100">{totalDeals}</div>
            <div className="stat-label">Total Deals</div>
          </div>
          <div className="card p-5">
            <div className="stat-value text-emerald-400">{proceedDeals}</div>
            <div className="stat-label">Proceed</div>
          </div>
          <div className="card p-5">
            <div className="stat-value text-slate-100">{fmt(totalProfit)}</div>
            <div className="stat-label">Total Est. Profit</div>
          </div>
          <div className="card p-5">
            <div className={`stat-value ${npmColor(avgNPM)}`}>{pct(avgNPM)}</div>
            <div className="stat-label">Avg NPM</div>
          </div>
        </div>

        {/* Deals Table */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">Deal Portfolio</h2>
            <span className="text-xs text-slate-500">{totalDeals} deals</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading deals...</div>
          ) : deals.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 mb-4">No deals yet. Run your first underwriting analysis.</p>
              <Link href="/sl/deal/new" className="btn-primary">+ New Deal</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-800/60">
                  <tr>
                    <th className="table-header">Property</th>
                    <th className="table-header">Plan</th>
                    <th className="table-header text-right">ASP</th>
                    <th className="table-header text-right">Project Cost</th>
                    <th className="table-header text-right">Net Profit</th>
                    <th className="table-header text-right">NPM</th>
                    <th className="table-header text-center">Recommendation</th>
                    <th className="table-header text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {deals.map(deal => {
                    const r = deal.sl_deal_results?.[0]
                    return (
                      <tr key={deal.id} className="hover:bg-slate-800/20 transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/sl/deal/${deal.id}`}>
                        <td className="table-cell">
                          <div className="font-medium text-slate-200">{deal.address}</div>
                          <div className="text-xs text-slate-500">{deal.city}, {deal.state} · {deal.subdivision || 'N/A'}</div>
                        </td>
                        <td className="table-cell">
                          <span className="font-mono text-sm">{deal.plan_name}</span>
                          <span className="text-xs text-slate-500 ml-1">{deal.plan_sf} SF</span>
                        </td>
                        <td className="table-cell text-right font-mono">{fmt(deal.asp)}</td>
                        <td className="table-cell text-right font-mono text-slate-400">{r ? fmt(r.total_project_cost) : '—'}</td>
                        <td className="table-cell text-right font-mono">{r ? fmt(r.net_profit) : '—'}</td>
                        <td className={`table-cell text-right font-mono ${r ? npmColor(r.npm) : ''}`}>
                          {r ? pct(r.npm) : '—'}
                        </td>
                        <td className="table-cell text-center">
                          {deal.recommendation ? (
                            <span className={`badge ${recBadge(deal.recommendation)}`}>
                              {deal.recommendation}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="table-cell text-right text-slate-500 text-xs">
                          {new Date(deal.created_at).toLocaleDateString()}
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
