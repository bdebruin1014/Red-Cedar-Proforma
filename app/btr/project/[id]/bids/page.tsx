'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

interface Bid {
  id: string
  _lid?: string
  contractor_name: string
  bid_date: string
  bid_amount: number
  is_selected: boolean
  scope_notes: string
  notes: string
  document_url: string
  _new?: boolean
}

let lid = 0

export default function BidsPage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const projectId = params.id as string

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [projRes, bidRes] = await Promise.all([
      supabase.from('btr_projects').select('name').eq('id', projectId).single(),
      supabase.from('btr_site_bids').select('*').eq('project_id', projectId).order('bid_amount'),
    ])
    if (projRes.data) setProject(projRes.data)
    if (bidRes.data) setBids(bidRes.data as Bid[])
    setLoading(false)
  }

  function addBid() {
    setBids(prev => [...prev, {
      id: '', _lid: `b${++lid}`, contractor_name: '', bid_date: '', bid_amount: 0,
      is_selected: false, scope_notes: '', notes: '', document_url: '', _new: true,
    }])
  }

  function updateBid(idx: number, field: string, value: any) {
    setBids(prev => prev.map((b, i) => {
      if (i !== idx) return field === 'is_selected' && value === true ? { ...b, is_selected: false } : b
      return { ...b, [field]: value }
    }))
  }

  function removeBid(idx: number) {
    setBids(prev => prev.filter((_, i) => i !== idx))
  }

  async function saveBids() {
    setSaving(true)
    try {
      await supabase.from('btr_site_bids').delete().eq('project_id', projectId)
      if (bids.length > 0) {
        const rows = bids.map(b => ({
          project_id: projectId,
          contractor_name: b.contractor_name || 'Unnamed',
          bid_date: b.bid_date || null,
          bid_amount: b.bid_amount || 0,
          is_selected: b.is_selected,
          scope_notes: b.scope_notes || null,
          notes: b.notes || null,
          document_url: b.document_url || null,
        }))
        const { error } = await supabase.from('btr_site_bids').insert(rows)
        if (error) throw error
      }
      await loadData()
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving. Check console.')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const amounts = bids.filter(b => b.bid_amount > 0).map(b => b.bid_amount)
    if (amounts.length === 0) return { low: 0, high: 0, avg: 0, spread: 0, selected: null as Bid | null }
    const low = Math.min(...amounts)
    const high = Math.max(...amounts)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const selected = bids.find(b => b.is_selected) || null
    return { low, high, avg, spread: high - low, selected }
  }, [bids])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />
      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/btr/project/${projectId}`} className="btn-ghost">&larr; Project</Link>
            <h2 className="text-sm font-medium text-slate-100">{project?.name} — Bid Comparison</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={addBid} className="btn-ghost border border-slate-700">+ Add Bid</button>
            <button onClick={saveBids} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Bids'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Comparison Summary */}
        {bids.length > 0 && stats.low > 0 && (
          <div className="card p-5 mb-6">
            <h3 className="text-xs text-cedar-400 uppercase tracking-wider font-medium mb-3">Bid Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Low Bid</span>
                <div className="font-mono text-lg text-emerald-400">{fmt(stats.low)}</div>
              </div>
              <div>
                <span className="text-slate-400">High Bid</span>
                <div className="font-mono text-lg text-red-400">{fmt(stats.high)}</div>
              </div>
              <div>
                <span className="text-slate-400">Average</span>
                <div className="font-mono text-lg text-slate-200">{fmt(stats.avg)}</div>
              </div>
              <div>
                <span className="text-slate-400">Spread</span>
                <div className="font-mono text-lg text-amber-400">{fmt(stats.spread)}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {stats.avg > 0 ? ((stats.spread / stats.avg) * 100).toFixed(1) + '% variance' : ''}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Selected</span>
                <div className="font-mono text-lg text-cyan-400">
                  {stats.selected ? fmt(stats.selected.bid_amount) : '—'}
                </div>
                <div className="text-[10px] text-slate-500">{stats.selected?.contractor_name || 'None selected'}</div>
              </div>
            </div>

            {/* Visual comparison bar */}
            {stats.high > 0 && (
              <div className="mt-4 space-y-1.5">
                {bids.filter(b => b.bid_amount > 0).sort((a, b) => a.bid_amount - b.bid_amount).map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-28 truncate text-right">{b.contractor_name || 'Unnamed'}</span>
                    <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${b.is_selected ? 'bg-cyan-500/70' : 'bg-slate-600/60'}`}
                        style={{ width: `${(b.bid_amount / stats.high) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 w-24">{fmt(b.bid_amount)}</span>
                    {b.is_selected && <span className="text-[9px] text-cyan-400">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bid Cards */}
        {bids.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-4">No bids added yet.</p>
            <button onClick={addBid} className="btn-primary">+ Add First Bid</button>
          </div>
        ) : (
          <div className="space-y-4">
            {bids.map((bid, i) => (
              <div key={i} className={`card overflow-hidden ${bid.is_selected ? 'border-cyan-500/30' : ''}`}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-mono">Bid {i + 1}</span>
                      {bid.is_selected && <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Selected</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`px-3 py-1 rounded text-xs transition-colors ${
                          bid.is_selected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700/50 text-slate-500 hover:text-slate-300'
                        }`}
                        onClick={() => updateBid(i, 'is_selected', !bid.is_selected)}
                      >
                        {bid.is_selected ? '✓ Selected' : 'Select'}
                      </button>
                      <button className="text-xs text-red-400/50 hover:text-red-400" onClick={() => removeBid(i)}>Remove</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="input-label">Contractor</label>
                      <input className="input-field" value={bid.contractor_name}
                             onChange={e => updateBid(i, 'contractor_name', e.target.value)}
                             placeholder="Contractor name" />
                    </div>
                    <div>
                      <label className="input-label">Bid Amount ($)</label>
                      <input type="number" className="input-field" value={bid.bid_amount || ''}
                             onChange={e => updateBid(i, 'bid_amount', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="input-label">Bid Date</label>
                      <input type="date" className="input-field" value={bid.bid_date}
                             onChange={e => updateBid(i, 'bid_date', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="input-label">Scope of Work</label>
                      <textarea className="input-field text-xs min-h-[60px]" value={bid.scope_notes}
                                onChange={e => updateBid(i, 'scope_notes', e.target.value)}
                                placeholder="Scope details, inclusions, exclusions..." />
                    </div>
                    <div>
                      <label className="input-label">Notes</label>
                      <textarea className="input-field text-xs min-h-[60px]" value={bid.notes}
                                onChange={e => updateBid(i, 'notes', e.target.value)}
                                placeholder="Contractor reputation, timeline, concerns..." />
                    </div>
                  </div>

                  {/* Variance from low bid */}
                  {bid.bid_amount > 0 && stats.low > 0 && bid.bid_amount > stats.low && (
                    <div className="mt-3 text-xs text-slate-500">
                      <span className="text-amber-400/80">+{fmt(bid.bid_amount - stats.low)}</span> above low bid
                      ({((bid.bid_amount - stats.low) / stats.low * 100).toFixed(1)}% premium)
                    </div>
                  )}
                  {bid.bid_amount > 0 && bid.bid_amount === stats.low && (
                    <div className="mt-3 text-xs text-emerald-400/80">Low bid</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
