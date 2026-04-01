import React, { useState, useEffect, useCallback } from 'react'
import { supabase, EVENT_INTENT_OPTIONS, COUNTRIES, logChange } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import SearchableSelect from '../components/SearchableSelect'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

// ============ EVENTS ============
function EventModal({ open, event, companies, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', image_url: '', company_id: null, biography: '', event_intent: 'Regular' })
  const [saving, setSaving] = useState(false)
  const isEdit = !!event?.id
  useEffect(() => { if (open) setForm(event?.id ? { name: '', image_url: '', company_id: null, biography: '', event_intent: 'Regular', ...event } : { name: '', image_url: '', company_id: null, biography: '', event_intent: 'Regular' }) }, [open, event])
  if (!open) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { name: form.name, image_url: form.image_url, company_id: form.company_id || null, biography: form.biography, event_intent: form.event_intent }
    const { error } = isEdit
      ? await supabase.from('events').update(payload).eq('id', event.id)
      : await supabase.from('events').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(isEdit ? 'Event updated' : 'Event created')
    setSaving(false); onSaved()
  }
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header"><h2>{isEdit ? 'EDIT EVENT' : 'ADD EVENT'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, marginBottom: 16 }}>
            <ImageUpload bucket="events" value={form.image_url} onChange={v => set('image_url', v)} label="Poster" size={80} />
            <div>
              <div className="form-group" style={{ marginBottom: 10 }}><label>Event Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label>Intent</label>
                  <select value={form.event_intent} onChange={e => set('event_intent', e.target.value)}>
                    {EVENT_INTENT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <SearchableSelect label="Company" options={companies.map(c => ({ value: c.id, label: c.name }))} value={form.company_id} onChange={v => set('company_id', v)} placeholder="Select company..." />
              </div>
            </div>
          </div>
          <div className="form-group"><label>Biography</label><textarea value={form.biography} onChange={e => set('biography', e.target.value)} rows={4} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

export function EventsPage() {
  const [events, setEvents] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterIntent, setFilterIntent] = useState([])
  const [editEvent, setEditEvent] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [view, setView] = useState('table')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: es }, { data: cs }] = await Promise.all([
      supabase.from('events').select('*').order('name'),
      supabase.from('companies').select('id,name')
    ])
    setEvents(es || []); setCompanies(cs || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = events
    .filter(e => e.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(e => !filterIntent.length || filterIntent.includes(e.event_intent))

  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || '—'
  const deleteEvent = async (id) => {
    await supabase.from('events').delete().eq('id', id)
    toast.success('Event deleted'); setConfirmDelete(null); load()
  }

  const intentColors = { 'Season Finale': 'badge-gold', 'Special': 'badge-blue', 'Regular': 'badge-gray', 'Weekly TV': 'badge-purple' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div><h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>EVENTS</h2><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{filtered.length} events</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>Cards</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditEvent(null); setModalOpen(true) }}>+ Add Event</button>
        </div>
      </div>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search events..." style={{ maxWidth: 220 }} />
        {EVENT_INTENT_OPTIONS.map(intent => (
          <button key={intent}
            className={`btn btn-sm ${filterIntent.includes(intent) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterIntent(f => f.includes(intent) ? f.filter(x => x !== intent) : [...f, intent])}>
            {intent}
          </button>
        ))}
      </div>
      <div className="page-body">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : view === 'card' ? (
          <div className="cards-grid">
            {filtered.map(e => (
              <div key={e.id} className="worker-card" onClick={() => { setEditEvent(e); setModalOpen(true) }}>
                <div className="worker-card-img" style={{ height: 100 }}>
                  {e.image_url ? <img src={e.image_url} alt={e.name} style={{ objectFit: 'contain', padding: 8 }} /> : '🎪'}
                </div>
                <div className="worker-card-body">
                  <div className="worker-card-name">{e.name}</div>
                  <span className={`badge ${intentColors[e.event_intent] || 'badge-gray'}`} style={{ fontSize: 10 }}>{e.event_intent}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{getCompanyName(e.company_id)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 50 }}>Img</th><th>Name</th><th>Intent</th><th>Company</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>{e.image_url ? <img src={e.image_url} style={{ width: 36, height: 36, objectFit: 'contain' }} alt="" /> : '🎪'}</td>
                    <td><span className="clickable-name" onClick={() => { setEditEvent(e); setModalOpen(true) }}>{e.name}</span></td>
                    <td><span className={`badge ${intentColors[e.event_intent] || 'badge-gray'}`} style={{ fontSize: 10 }}>{e.event_intent}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{getCompanyName(e.company_id)}</td>
                    <td><button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(e.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <EventModal open={modalOpen} event={editEvent} companies={companies}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Event" message="Delete this event?"
        onConfirm={() => deleteEvent(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}

// ============ LORE ============
function LoreModal({ open, entry, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', date_year: '', location: '' })
  const [saving, setSaving] = useState(false)
  const isEdit = !!entry?.id
  useEffect(() => { if (open) setForm(entry?.id ? { title: '', description: '', date_year: '', location: '', ...entry } : { title: '', description: '', date_year: '', location: '' }) }, [open, entry])
  if (!open) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = { title: form.title, description: form.description, date_year: form.date_year ? +form.date_year : null, location: form.location }
    const { error } = isEdit
      ? await supabase.from('lore').update(payload).eq('id', entry.id)
      : await supabase.from('lore').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(isEdit ? 'Lore entry updated' : 'Lore entry created')
    setSaving(false); onSaved()
  }
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header"><h2>{isEdit ? 'EDIT LORE' : 'ADD LORE'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-grid form-grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/3' }}><label>Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} /></div>
            <div className="form-group">
              <label>Year</label>
              <input type="number" value={form.date_year} onChange={e => set('date_year', e.target.value)} placeholder="e.g. 2018" min={1900} max={2100} />
            </div>
            <SearchableSelect label="Location" options={COUNTRIES} value={form.location} onChange={v => set('location', v)} placeholder="Select country..." />
          </div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={6} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}

export function LorePage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [yearRange, setYearRange] = useState([null, null])
  const [editEntry, setEditEntry] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('lore').select('*').order('date_year', { ascending: true, nullsFirst: false })
    setEntries(data || [])
    if (data?.length) {
      const years = data.filter(e => e.date_year).map(e => e.date_year)
      if (years.length) setYearRange([Math.min(...years), Math.max(...years)])
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const allYears = entries.filter(e => e.date_year).map(e => e.date_year)
  const minYear = allYears.length ? Math.min(...allYears) : 2000
  const maxYear = allYears.length ? Math.max(...allYears) : 2025
  const [filterMin, setFilterMin] = useState(null)
  const [filterMax, setFilterMax] = useState(null)

  const filtered = entries
    .filter(e => !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()))
    .filter(e => !filterMin || !e.date_year || e.date_year >= filterMin)
    .filter(e => !filterMax || !e.date_year || e.date_year <= filterMax)

  const deleteEntry = async (id) => {
    await supabase.from('lore').delete().eq('id', id)
    toast.success('Entry deleted'); setConfirmDelete(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div><h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>LORE</h2><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{filtered.length} entries</div></div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setEditEntry(null); setModalOpen(true) }}>+ Add Entry</button>
      </div>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search lore..." style={{ maxWidth: 220 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Year:</span>
          <input type="number" value={filterMin || ''} onChange={e => setFilterMin(e.target.value ? +e.target.value : null)}
            placeholder={String(minYear)} style={{ width: 80 }} />
          <span style={{ color: 'var(--text-3)' }}>—</span>
          <input type="number" value={filterMax || ''} onChange={e => setFilterMax(e.target.value ? +e.target.value : null)}
            placeholder={String(maxYear)} style={{ width: 80 }} />
        </div>
      </div>
      <div className="page-body">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(e => (
              <div key={e.id} className="card" style={{ borderLeft: '3px solid var(--gold-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 16, color: 'var(--text-1)', marginBottom: 4 }}>{e.title}</h3>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      {e.date_year && <span style={{ color: 'var(--gold)' }}>📅 {e.date_year}</span>}
                      {e.location && <span style={{ color: 'var(--text-3)' }}>📍 {e.location}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => { setEditEntry(e); setModalOpen(true) }}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(e.id)}>✕</button>
                  </div>
                </div>
                {e.description && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{e.description}</p>}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>No lore entries found</div>}
          </div>
        )}
      </div>
      <LoreModal open={modalOpen} entry={editEntry}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Entry" message="Delete this lore entry?"
        onConfirm={() => deleteEntry(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
