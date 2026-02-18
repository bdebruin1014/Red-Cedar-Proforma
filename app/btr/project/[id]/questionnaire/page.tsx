'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { fmt } from '@/lib/format'
import TopNav from '@/components/TopNav'
import Link from 'next/link'

// ── Types ──
interface DDItem { id: string; _lid?: string; category: string; item_name: string; status: string; due_date: string; completed_date: string; responsible_party: string; notes: string; sort_order: number; _new?: boolean }
interface UtilityItem { id: string; _lid?: string; utility_type: string; provider_name: string; status: string; due_date: string; estimated_fees: number; notes: string; _new?: boolean }
interface ContactItem { id: string; _lid?: string; role: string; company_name: string; contact_name: string; phone: string; email: string; _new?: boolean }
interface MilestoneItem { id: string; _lid?: string; milestone_number: number; milestone_name: string; responsible_party: string; target_date: string; actual_date: string; status: string; notes: string; _new?: boolean }

// ── Constants ──
const DD_CATEGORIES = ['environmental', 'survey', 'geotech', 'title', 'legal', 'engineering', 'permits', 'utility', 'other']
const DD_STATUSES = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-500/20 text-slate-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'complete', label: 'Complete', color: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'n_a', label: 'N/A', color: 'bg-slate-600/20 text-slate-500' },
]
const UTILITY_TYPES = ['water', 'sewer', 'electric', 'gas', 'telecom']
const UTILITY_STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'committed', label: 'Committed' },
  { value: 'not_required', label: 'Not Required' },
]
const CONTACT_ROLES = ['engineer', 'surveyor', 'geotech', 'environmental', 'zoning_attorney', 'city_reviewer', 'architect', 'structural_engineer', 'dev_inspector', 'building_inspector', 'other']
const MILESTONE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-slate-500/20 text-slate-400' },
  { value: 'on_track', label: 'On Track', color: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'at_risk', label: 'At Risk', color: 'bg-amber-500/20 text-amber-300' },
  { value: 'complete', label: 'Complete', color: 'bg-green-500/20 text-green-300' },
  { value: 'n_a', label: 'N/A', color: 'bg-slate-600/20 text-slate-500' },
]

const DEFAULT_DD: { category: string; name: string }[] = [
  { category: 'environmental', name: 'Phase 1 Environmental' },
  { category: 'environmental', name: 'Wetlands Delineation' },
  { category: 'environmental', name: 'Endangered Species' },
  { category: 'survey', name: 'ALTA Survey' },
  { category: 'survey', name: 'Boundary Survey' },
  { category: 'survey', name: 'Topographic Survey' },
  { category: 'geotech', name: 'Geotechnical Report' },
  { category: 'geotech', name: 'Soil Borings' },
  { category: 'title', name: 'Title Commitment' },
  { category: 'title', name: 'Title Exceptions Review' },
  { category: 'legal', name: 'Zoning Verification' },
  { category: 'legal', name: 'HOA/CCR Review' },
  { category: 'engineering', name: 'Civil Engineering Plans' },
  { category: 'engineering', name: 'Storm Water Design' },
  { category: 'permits', name: 'Grading Permit' },
  { category: 'permits', name: 'Building Permits' },
]

const DEFAULT_MILESTONES: { name: string; party: string }[] = [
  { name: 'Under Contract', party: 'RCD' },
  { name: 'Rezoning Approved', party: 'RCD' },
  { name: 'Civil Plans Submitted', party: 'RCD' },
  { name: 'Civil Plans Approved', party: 'RCD' },
  { name: 'LDP Approved', party: 'RCD' },
  { name: 'Construction Loan Closed', party: 'RCD' },
  { name: 'Land Closing', party: 'RCD' },
  { name: 'Horizontal Mobilization', party: 'RCC' },
  { name: 'Horizontal Substantial Completion', party: 'RCC' },
  { name: 'Vertical Start (First Unit)', party: 'RCC' },
  { name: 'Model Units Complete', party: 'RCC' },
  { name: 'Pre-Leasing Begins', party: 'Operator' },
  { name: 'First Unit Delivered', party: 'RCC' },
  { name: 'Vertical Completion (Last Unit)', party: 'RCC' },
  { name: 'Stabilization', party: 'Operator' },
]

let lid = 0

export default function QuestionnairePage() {
  const params = useParams()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<any>(null)
  const [tab, setTab] = useState<'dd' | 'utility' | 'contacts' | 'milestones'>('dd')
  const [ddItems, setDdItems] = useState<DDItem[]>([])
  const [utilities, setUtilities] = useState<UtilityItem[]>([])
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [milestones, setMilestones] = useState<MilestoneItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const projectId = params.id as string

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [projRes, ddRes, utilRes, contRes, msRes] = await Promise.all([
      supabase.from('btr_projects').select('name').eq('id', projectId).single(),
      supabase.from('btr_due_diligence').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('btr_utility_capacity').select('*').eq('project_id', projectId),
      supabase.from('btr_contacts').select('*').eq('project_id', projectId),
      supabase.from('btr_milestones').select('*').eq('project_id', projectId).order('milestone_number'),
    ])
    if (projRes.data) setProject(projRes.data)
    if (ddRes.data) setDdItems(ddRes.data as DDItem[])
    if (utilRes.data) setUtilities(utilRes.data as UtilityItem[])
    if (contRes.data) setContacts(contRes.data as ContactItem[])
    if (msRes.data) setMilestones(msRes.data as MilestoneItem[])
    setLoading(false)
  }

  // ── DD helpers ──
  function initDD() {
    setDdItems(DEFAULT_DD.map((d, i) => ({
      id: '', _lid: `dd${++lid}`, category: d.category, item_name: d.name,
      status: 'not_started', due_date: '', completed_date: '', responsible_party: '', notes: '', sort_order: i, _new: true,
    })))
  }
  function addDD(cat: string) {
    setDdItems(prev => [...prev, { id: '', _lid: `dd${++lid}`, category: cat, item_name: '', status: 'not_started', due_date: '', completed_date: '', responsible_party: '', notes: '', sort_order: prev.length, _new: true }])
  }
  function updateDD(idx: number, field: string, value: any) {
    setDdItems(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }
  function removeDD(idx: number) { setDdItems(prev => prev.filter((_, i) => i !== idx)) }

  // ── Utility helpers ──
  function initUtilities() {
    setUtilities(UTILITY_TYPES.map(t => ({
      id: '', _lid: `u${++lid}`, utility_type: t, provider_name: '', status: 'not_started', due_date: '', estimated_fees: 0, notes: '', _new: true,
    })))
  }
  function updateUtil(idx: number, field: string, value: any) {
    setUtilities(prev => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u))
  }

  // ── Contact helpers ──
  function initContacts() {
    setContacts(CONTACT_ROLES.filter(r => r !== 'other').map(r => ({
      id: '', _lid: `c${++lid}`, role: r, company_name: '', contact_name: '', phone: '', email: '', _new: true,
    })))
  }
  function addContact() {
    setContacts(prev => [...prev, { id: '', _lid: `c${++lid}`, role: 'other', company_name: '', contact_name: '', phone: '', email: '', _new: true }])
  }
  function updateContact(idx: number, field: string, value: any) {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }
  function removeContact(idx: number) { setContacts(prev => prev.filter((_, i) => i !== idx)) }

  // ── Milestone helpers ──
  function initMilestones() {
    setMilestones(DEFAULT_MILESTONES.map((m, i) => ({
      id: '', _lid: `ms${++lid}`, milestone_number: i + 1, milestone_name: m.name,
      responsible_party: m.party, target_date: '', actual_date: '', status: 'pending', notes: '', _new: true,
    })))
  }
  function addMilestone() {
    setMilestones(prev => [...prev, { id: '', _lid: `ms${++lid}`, milestone_number: prev.length + 1, milestone_name: '', responsible_party: '', target_date: '', actual_date: '', status: 'pending', notes: '', _new: true }])
  }
  function updateMS(idx: number, field: string, value: any) {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }
  function removeMS(idx: number) { setMilestones(prev => prev.filter((_, i) => i !== idx)) }

  // ── Save All ──
  async function saveAll() {
    setSaving(true)
    try {
      // DD
      await supabase.from('btr_due_diligence').delete().eq('project_id', projectId)
      if (ddItems.length > 0) {
        await supabase.from('btr_due_diligence').insert(ddItems.map((d, i) => ({
          project_id: projectId, category: d.category, item_name: d.item_name || 'Unnamed',
          status: d.status, due_date: d.due_date || null, completed_date: d.completed_date || null,
          responsible_party: d.responsible_party || null, notes: d.notes || null, sort_order: i,
        })))
      }

      // Utilities
      await supabase.from('btr_utility_capacity').delete().eq('project_id', projectId)
      if (utilities.length > 0) {
        await supabase.from('btr_utility_capacity').insert(utilities.map(u => ({
          project_id: projectId, utility_type: u.utility_type, provider_name: u.provider_name || null,
          status: u.status, due_date: u.due_date || null, estimated_fees: u.estimated_fees || null,
          notes: u.notes || null,
        })))
      }

      // Contacts
      await supabase.from('btr_contacts').delete().eq('project_id', projectId)
      if (contacts.length > 0) {
        await supabase.from('btr_contacts').insert(contacts.map(c => ({
          project_id: projectId, role: c.role, company_name: c.company_name || null,
          contact_name: c.contact_name || null, phone: c.phone || null, email: c.email || null,
        })))
      }

      // Milestones
      await supabase.from('btr_milestones').delete().eq('project_id', projectId)
      if (milestones.length > 0) {
        await supabase.from('btr_milestones').insert(milestones.map((m, i) => ({
          project_id: projectId, milestone_number: i + 1, milestone_name: m.milestone_name || 'Unnamed',
          responsible_party: m.responsible_party || null, target_date: m.target_date || null,
          actual_date: m.actual_date || null, status: m.status, notes: m.notes || null,
        })))
      }

      await loadData()
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving. Check console.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>

  // Stats
  const ddComplete = ddItems.filter(d => d.status === 'complete').length
  const ddTotal = ddItems.filter(d => d.status !== 'n_a').length
  const msComplete = milestones.filter(m => m.status === 'complete').length
  const utilCommitted = utilities.filter(u => u.status === 'committed').length

  const TABS = [
    { key: 'dd', label: `Due Diligence (${ddComplete}/${ddTotal})` },
    { key: 'utility', label: `Utilities (${utilCommitted}/${utilities.length})` },
    { key: 'contacts', label: `Contacts (${contacts.length})` },
    { key: 'milestones', label: `Milestones (${msComplete}/${milestones.length})` },
  ]

  return (
    <div className="noise-bg min-h-screen">
      <TopNav />
      <div className="border-b border-slate-800/40 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/btr/project/${projectId}`} className="btn-ghost">&larr; Project</Link>
            <h2 className="text-sm font-medium text-slate-100">{project?.name} — Questionnaire</h2>
          </div>
          <button onClick={saveAll} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-800/40">
          {TABS.map(t => (
            <button key={t.key}
              className={`px-4 py-2.5 text-sm font-medium transition-all -mb-px ${
                tab === t.key ? 'text-cedar-300 border-b-2 border-cedar-500' : 'text-slate-500 hover:text-slate-300'
              }`}
              onClick={() => setTab(t.key as any)}
            >{t.label}</button>
          ))}
        </div>

        {/* DD Tab */}
        {tab === 'dd' && (
          <div>
            {ddItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-3">No due diligence items.</p>
                <button onClick={initDD} className="btn-ghost border border-slate-700">Load Standard DD Checklist</button>
              </div>
            )}
            {DD_CATEGORIES.map(cat => {
              const catItems = ddItems.map((d, i) => ({ ...d, _idx: i })).filter(d => d.category === cat)
              if (catItems.length === 0 && ddItems.length > 0) return null
              if (catItems.length === 0) return null
              return (
                <div key={cat} className="card mb-4 overflow-hidden">
                  <div className="card-header flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-300 capitalize">{cat}</h3>
                    <button onClick={() => addDD(cat)} className="text-xs text-cedar-400 hover:text-cedar-300">+ Add</button>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {catItems.map(d => (
                      <div key={d._idx} className="grid grid-cols-12 gap-2 items-center bg-slate-800/20 rounded px-2 py-1.5">
                        <div className="col-span-3">
                          <input className="input-field text-xs py-1" value={d.item_name}
                                 onChange={e => updateDD(d._idx, 'item_name', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <select className="input-field text-xs py-1" value={d.status}
                                  onChange={e => updateDD(d._idx, 'status', e.target.value)}>
                            {DD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input type="date" className="input-field text-xs py-1" value={d.due_date}
                                 onChange={e => updateDD(d._idx, 'due_date', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <input className="input-field text-xs py-1" value={d.responsible_party}
                                 onChange={e => updateDD(d._idx, 'responsible_party', e.target.value)} placeholder="Responsible" />
                        </div>
                        <div className="col-span-2">
                          <input className="input-field text-xs py-1" value={d.notes}
                                 onChange={e => updateDD(d._idx, 'notes', e.target.value)} placeholder="Notes" />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button className="text-red-400/50 hover:text-red-400 text-xs" onClick={() => removeDD(d._idx)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Utility Tab */}
        {tab === 'utility' && (
          <div>
            {utilities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-3">No utility providers.</p>
                <button onClick={initUtilities} className="btn-ghost border border-slate-700">Load Standard Utilities</button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="p-4 space-y-3">
                  {utilities.map((u, i) => (
                    <div key={i} className="grid grid-cols-6 gap-3 items-center bg-slate-800/20 rounded-lg p-3">
                      <div>
                        <label className="input-label">Type</label>
                        <div className="text-sm text-slate-300 capitalize">{u.utility_type}</div>
                      </div>
                      <div>
                        <label className="input-label">Provider</label>
                        <input className="input-field text-xs py-1.5" value={u.provider_name}
                               onChange={e => updateUtil(i, 'provider_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="input-label">Status</label>
                        <select className="input-field text-xs py-1.5" value={u.status}
                                onChange={e => updateUtil(i, 'status', e.target.value)}>
                          {UTILITY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Est. Fees</label>
                        <input type="number" className="input-field text-xs py-1.5" value={u.estimated_fees || ''}
                               onChange={e => updateUtil(i, 'estimated_fees', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="input-label">Due Date</label>
                        <input type="date" className="input-field text-xs py-1.5" value={u.due_date}
                               onChange={e => updateUtil(i, 'due_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="input-label">Notes</label>
                        <input className="input-field text-xs py-1.5" value={u.notes}
                               onChange={e => updateUtil(i, 'notes', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-3 text-sm text-slate-500">
                  Total estimated utility fees: <span className="font-mono text-slate-300">{fmt(utilities.reduce((s, u) => s + (u.estimated_fees || 0), 0))}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <div>
            {contacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-3">No project contacts.</p>
                <button onClick={initContacts} className="btn-ghost border border-slate-700">Load Standard Roles</button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="card-header flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">Project Contacts</h3>
                  <button onClick={addContact} className="text-xs text-cedar-400 hover:text-cedar-300">+ Add Contact</button>
                </div>
                <div className="p-4 space-y-2">
                  {contacts.map((c, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 items-center bg-slate-800/20 rounded px-2 py-1.5">
                      <div>
                        <select className="input-field text-xs py-1" value={c.role}
                                onChange={e => updateContact(i, 'role', e.target.value)}>
                          {CONTACT_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div>
                        <input className="input-field text-xs py-1" value={c.company_name}
                               onChange={e => updateContact(i, 'company_name', e.target.value)} placeholder="Company" />
                      </div>
                      <div>
                        <input className="input-field text-xs py-1" value={c.contact_name}
                               onChange={e => updateContact(i, 'contact_name', e.target.value)} placeholder="Name" />
                      </div>
                      <div>
                        <input className="input-field text-xs py-1" value={c.phone}
                               onChange={e => updateContact(i, 'phone', e.target.value)} placeholder="Phone" />
                      </div>
                      <div>
                        <input type="email" className="input-field text-xs py-1" value={c.email}
                               onChange={e => updateContact(i, 'email', e.target.value)} placeholder="Email" />
                      </div>
                      <div className="flex justify-end">
                        <button className="text-red-400/50 hover:text-red-400 text-xs" onClick={() => removeContact(i)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {tab === 'milestones' && (
          <div>
            {milestones.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-3">No milestones defined.</p>
                <button onClick={initMilestones} className="btn-ghost border border-slate-700">Load Standard Milestones</button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="card-header flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">Milestone Schedule</h3>
                  <button onClick={addMilestone} className="text-xs text-cedar-400 hover:text-cedar-300">+ Add</button>
                </div>
                <div className="p-4 space-y-1.5">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 uppercase tracking-wider px-2">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Milestone</div>
                    <div className="col-span-1">Party</div>
                    <div className="col-span-2">Target Date</div>
                    <div className="col-span-2">Actual Date</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1"></div>
                  </div>
                  {milestones.map((m, i) => {
                    const st = MILESTONE_STATUSES.find(s => s.value === m.status) || MILESTONE_STATUSES[0]
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-800/20 rounded px-2 py-1.5">
                        <div className="col-span-1 text-xs text-slate-500 font-mono">{i + 1}</div>
                        <div className="col-span-3">
                          <input className="input-field text-xs py-1" value={m.milestone_name}
                                 onChange={e => updateMS(i, 'milestone_name', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          <input className="input-field text-xs py-1" value={m.responsible_party}
                                 onChange={e => updateMS(i, 'responsible_party', e.target.value)} placeholder="RCC" />
                        </div>
                        <div className="col-span-2">
                          <input type="date" className="input-field text-xs py-1" value={m.target_date}
                                 onChange={e => updateMS(i, 'target_date', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <input type="date" className="input-field text-xs py-1" value={m.actual_date}
                                 onChange={e => updateMS(i, 'actual_date', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <select className="input-field text-xs py-1" value={m.status}
                                  onChange={e => updateMS(i, 'status', e.target.value)}>
                            {MILESTONE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button className="text-red-400/50 hover:text-red-400 text-xs" onClick={() => removeMS(i)}>×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
