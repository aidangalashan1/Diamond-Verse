import React, { useState, useEffect, useCallback } from 'react'
import { supabase, TITLE_LEVEL_OPTIONS, TITLE_TYPE_OPTIONS, logChange } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import SearchableSelect from '../components/SearchableSelect'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

const EMPTY = { name: '', image_url: '', company_id: null, champion_worker_id: null, level: 'Primary', type: 'Singles', biography: '' }

function TitleModal({ open, title, companies, workers, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = !!title?.id
  useEffect(() => { if (open) setForm(title?.id ? { ...EMPTY, ...title } : EMPTY) }, [open, title])
  if (!open) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { name: form.name, image_url: form.image_url, company_id: form.company_id || null, champion_worker_id: form.champion_worker_id || null, level: form.level, type: form.type, biography: form.biography }
    if (isEdit) {
      const { error } = await supabase.from('titles').update(payload).eq('id', title.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Title updated')
    } else {
      const { error } = await supabase.from('titles').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Title created')
    }
    setSaving(false); onSaved()
  }
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header"><h2>{isEdit ? 'EDIT TITLE' : 'ADD TITLE'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 16, marginBottom: 16 }}>
            <ImageUpload bucket="titles" value={form.image_url} onChange={v => set('image_url', v)} label="Belt Image" size={80} />
            <div>
              <div className="form-group" style={{ marginBottom: 12 }}><label>Title Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group"><label>Level</label><select value={form.level} onChange={e => set('level', e.target.value)}>{TITLE_LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div>
                <div className="form-group"><label>Type</label><select value={form.type} onChange={e => set('type', e.target.value)}>{TITLE_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div>
              </div>
            </div>
          </div>
          <div className="form-grid form-grid-2" style={{ marginBottom: 12 }}>
            <SearchableSelect label="Company" options={companies.map(c => ({ value: c.id, label: c.name }))} value={form.company_id} onChange={v => set('company_id', v)} placeholder="Select company..." />
            <SearchableSelect label="Current Champion" options={workers.map(w => ({ value: w.id, label: w.name }))} value={form.champion_worker_id} onChange={v => set('champion_worker_id', v)} placeholder="Select champion..." />
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

export default function TitlesPage() {
  const [titles, setTitles] = useState([])
  const [companies, setCompanies] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editTitle, setEditTitle] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [view, setView] = useState('table')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ts }, { data: cs }, { data: ws }] = await Promise.all([
      supabase.from('titles').select('*').order('name'),
      supabase.from('companies').select('id,name'),
      supabase.from('workers').select('id,name')
    ])
    setTitles(ts || []); setCompanies(cs || []); setWorkers(ws || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = titles.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))
  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || '—'
  const getWorkerName = (id) => workers.find(w => w.id === id)?.name || '—'

  const deleteTitle = async (id) => {
    await supabase.from('titles').delete().eq('id', id)
    toast.success('Title deleted')
    setConfirmDelete(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div><h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>TITLES</h2><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{filtered.length} titles</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>Cards</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTitle(null); setModalOpen(true) }}>+ Add Title</button>
        </div>
      </div>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search titles..." style={{ maxWidth: 240 }} />
      </div>
      <div className="page-body">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : view === 'card' ? (
          <div className="cards-grid">
            {filtered.map(t => (
              <div key={t.id} className="worker-card" onClick={() => { setEditTitle(t); setModalOpen(true) }}>
                <div className="worker-card-img" style={{ height: 100 }}>
                  {t.image_url ? <img src={t.image_url} alt={t.name} style={{ objectFit: 'contain', padding: 10 }} /> : '🏆'}
                </div>
                <div className="worker-card-body">
                  <div className="worker-card-name">{t.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    <span className="badge badge-gold" style={{ fontSize: 10 }}>{t.level}</span>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{t.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{getCompanyName(t.company_id)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>🏆 {getWorkerName(t.champion_worker_id)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th style={{ width: 50 }}>Belt</th>
                <th>Name</th><th>Level</th><th>Type</th><th>Company</th><th>Champion</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>{t.image_url ? <img src={t.image_url} style={{ width: 36, height: 36, objectFit: 'contain' }} alt="" /> : '🏆'}</td>
                    <td><span className="clickable-name" onClick={() => { setEditTitle(t); setModalOpen(true) }}>{t.name}</span></td>
                    <td><span className="badge badge-gold" style={{ fontSize: 10 }}>{t.level}</span></td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{t.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{getCompanyName(t.company_id)}</td>
                    <td style={{ fontSize: 12 }}>{getWorkerName(t.champion_worker_id)}</td>
                    <td><button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(t.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TitleModal open={modalOpen} title={editTitle} companies={companies} workers={workers}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Title" message="Delete this title?"
        onConfirm={() => deleteTitle(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
