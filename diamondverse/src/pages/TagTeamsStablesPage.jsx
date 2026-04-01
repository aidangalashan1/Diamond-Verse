import React, { useState, useEffect, useCallback } from 'react'
import { supabase, logChange } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import SearchableSelect from '../components/SearchableSelect'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

// ============ TAG TEAMS ============
function TagTeamModal({ open, team, companies, workers, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', image_url: '', company_id: null, worker1_id: null, worker2_id: null, biography: '' })
  const [saving, setSaving] = useState(false)
  const isEdit = !!team?.id
  useEffect(() => { if (open) setForm(team?.id ? { name: '', image_url: '', company_id: null, worker1_id: null, worker2_id: null, biography: '', ...team } : { name: '', image_url: '', company_id: null, worker1_id: null, worker2_id: null, biography: '' }) }, [open, team])
  if (!open) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { name: form.name, image_url: form.image_url, company_id: form.company_id || null, worker1_id: form.worker1_id || null, worker2_id: form.worker2_id || null, biography: form.biography }
    const { error } = isEdit
      ? await supabase.from('tag_teams').update(payload).eq('id', team.id)
      : await supabase.from('tag_teams').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(isEdit ? 'Tag team updated' : 'Tag team created')
    setSaving(false); onSaved()
  }
  const workerOpts = workers.map(w => ({ value: w.id, label: w.name }))
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header"><h2>{isEdit ? 'EDIT TAG TEAM' : 'ADD TAG TEAM'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, marginBottom: 16 }}>
            <ImageUpload bucket="tag-teams" value={form.image_url} onChange={v => set('image_url', v)} label="Image" size={80} />
            <div className="form-group"><label>Team Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          </div>
          <div className="form-grid form-grid-2" style={{ marginBottom: 12 }}>
            <SearchableSelect label="Member 1" options={workerOpts} value={form.worker1_id} onChange={v => set('worker1_id', v)} placeholder="Select worker..." />
            <SearchableSelect label="Member 2" options={workerOpts} value={form.worker2_id} onChange={v => set('worker2_id', v)} placeholder="Select worker..." />
            <SearchableSelect label="Company" options={companies.map(c => ({ value: c.id, label: c.name }))} value={form.company_id} onChange={v => set('company_id', v)} placeholder="Select company..." />
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

export function TagTeamsPage() {
  const [teams, setTeams] = useState([])
  const [companies, setCompanies] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editTeam, setEditTeam] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [view, setView] = useState('table')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ts }, { data: cs }, { data: ws }] = await Promise.all([
      supabase.from('tag_teams').select('*').order('name'),
      supabase.from('companies').select('id,name'),
      supabase.from('workers').select('id,name')
    ])
    setTeams(ts || []); setCompanies(cs || []); setWorkers(ws || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = teams.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()))
  const getWorkerName = (id) => workers.find(w => w.id === id)?.name || '—'
  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || '—'
  const deleteTeam = async (id) => {
    await supabase.from('tag_teams').delete().eq('id', id)
    toast.success('Tag team deleted'); setConfirmDelete(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div><h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>TAG TEAMS</h2><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{filtered.length} teams</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>Cards</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTeam(null); setModalOpen(true) }}>+ Add Tag Team</button>
        </div>
      </div>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search tag teams..." style={{ maxWidth: 240 }} />
      </div>
      <div className="page-body">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : view === 'card' ? (
          <div className="cards-grid">
            {filtered.map(t => (
              <div key={t.id} className="worker-card" onClick={() => { setEditTeam(t); setModalOpen(true) }}>
                <div className="worker-card-img" style={{ height: 100 }}>
                  {t.image_url ? <img src={t.image_url} alt={t.name} style={{ objectFit: 'contain', padding: 8 }} /> : '🤝'}
                </div>
                <div className="worker-card-body">
                  <div className="worker-card-name">{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{getWorkerName(t.worker1_id)} & {getWorkerName(t.worker2_id)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{getCompanyName(t.company_id)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 50 }}>Img</th><th>Name</th><th>Member 1</th><th>Member 2</th><th>Company</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>{t.image_url ? <img src={t.image_url} style={{ width: 36, height: 36, objectFit: 'contain' }} alt="" /> : '🤝'}</td>
                    <td><span className="clickable-name" onClick={() => { setEditTeam(t); setModalOpen(true) }}>{t.name}</span></td>
                    <td style={{ fontSize: 12 }}>{getWorkerName(t.worker1_id)}</td>
                    <td style={{ fontSize: 12 }}>{getWorkerName(t.worker2_id)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{getCompanyName(t.company_id)}</td>
                    <td><button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(t.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TagTeamModal open={modalOpen} team={editTeam} companies={companies} workers={workers}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Tag Team" message="Delete this tag team?"
        onConfirm={() => deleteTeam(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}

// ============ STABLES ============
function StableModal({ open, stable, companies, workers, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', image_url: '', company_id: null, worker_ids: [], biography: '' })
  const [saving, setSaving] = useState(false)
  const isEdit = !!stable?.id
  useEffect(() => { if (open) setForm(stable?.id ? { name: '', image_url: '', company_id: null, worker_ids: [], biography: '', ...stable } : { name: '', image_url: '', company_id: null, worker_ids: [], biography: '' }) }, [open, stable])
  if (!open) return null
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { name: form.name, image_url: form.image_url, company_id: form.company_id || null, worker_ids: form.worker_ids || [], biography: form.biography }
    const { error } = isEdit
      ? await supabase.from('stables').update(payload).eq('id', stable.id)
      : await supabase.from('stables').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(isEdit ? 'Stable updated' : 'Stable created')
    setSaving(false); onSaved()
  }
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header"><h2>{isEdit ? 'EDIT STABLE' : 'ADD STABLE'}</h2><button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, marginBottom: 16 }}>
            <ImageUpload bucket="stables" value={form.image_url} onChange={v => set('image_url', v)} label="Image" size={80} />
            <div>
              <div className="form-group" style={{ marginBottom: 10 }}><label>Stable Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <SearchableSelect label="Company" options={companies.map(c => ({ value: c.id, label: c.name }))} value={form.company_id} onChange={v => set('company_id', v)} placeholder="Select company..." />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <SearchableSelect label="Members (select any number)" options={workers.map(w => ({ value: w.id, label: w.name }))} value={form.worker_ids} onChange={v => set('worker_ids', v)} multi placeholder="Search and add members..." />
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

export function StablesPage() {
  const [stables, setStables] = useState([])
  const [companies, setCompanies] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editStable, setEditStable] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [view, setView] = useState('table')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ss }, { data: cs }, { data: ws }] = await Promise.all([
      supabase.from('stables').select('*').order('name'),
      supabase.from('companies').select('id,name'),
      supabase.from('workers').select('id,name')
    ])
    setStables(ss || []); setCompanies(cs || []); setWorkers(ws || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = stables.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
  const getWorkerNames = (ids) => (ids || []).map(id => workers.find(w => w.id === id)?.name).filter(Boolean).join(', ')
  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || '—'

  const deleteStable = async (id) => {
    await supabase.from('stables').delete().eq('id', id)
    toast.success('Stable deleted'); setConfirmDelete(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div><h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>STABLES</h2><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{filtered.length} stables</div></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>Cards</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditStable(null); setModalOpen(true) }}>+ Add Stable</button>
        </div>
      </div>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search stables..." style={{ maxWidth: 240 }} />
      </div>
      <div className="page-body">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : view === 'card' ? (
          <div className="cards-grid">
            {filtered.map(s => (
              <div key={s.id} className="worker-card" onClick={() => { setEditStable(s); setModalOpen(true) }}>
                <div className="worker-card-img" style={{ height: 100 }}>
                  {s.image_url ? <img src={s.image_url} alt={s.name} style={{ objectFit: 'contain', padding: 8 }} /> : '🎭'}
                </div>
                <div className="worker-card-body">
                  <div className="worker-card-name">{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{getCompanyName(s.company_id)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>{(s.worker_ids || []).length} members</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 50 }}>Img</th><th>Name</th><th>Members</th><th>Company</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>{s.image_url ? <img src={s.image_url} style={{ width: 36, height: 36, objectFit: 'contain' }} alt="" /> : '🎭'}</td>
                    <td><span className="clickable-name" onClick={() => { setEditStable(s); setModalOpen(true) }}>{s.name}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getWorkerNames(s.worker_ids) || `${(s.worker_ids || []).length} members`}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{getCompanyName(s.company_id)}</td>
                    <td><button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(s.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <StableModal open={modalOpen} stable={editStable} companies={companies} workers={workers}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Stable" message="Delete this stable?"
        onConfirm={() => deleteStable(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
