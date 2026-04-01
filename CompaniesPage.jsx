import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, COMPANY_SIZE_OPTIONS, COUNTRIES, getPushColor, calcAge, formatHeight, logChange } from '../lib/supabase'
import CompanyModal from '../components/CompanyModal'
import WorkerModal from '../components/WorkerModal'
import ConfirmDialog from '../components/ConfirmDialog'
import SearchableSelect from '../components/SearchableSelect'
import toast from 'react-hot-toast'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [workers, setWorkers] = useState([])
  const [titles, setTitles] = useState([])
  const [tagTeams, setTagTeams] = useState([])
  const [stables, setStables] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('table')
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState([{ field: 'name', dir: 'asc' }])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [editCompany, setEditCompany] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [editWorker, setEditWorker] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [inlineEdit, setInlineEdit] = useState({ id: null, field: null, value: '' })
  const [rosterSplit, setRosterSplit] = useState({ push: false, disposition: false, gender: false })
  const [referenceDate, setReferenceDate] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cs }, { data: ws }, { data: ts }, { data: tts }, { data: ss }, { data: es }, { data: settings }] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('workers').select('*').order('name'),
      supabase.from('titles').select('*'),
      supabase.from('tag_teams').select('*'),
      supabase.from('stables').select('*'),
      supabase.from('events').select('*'),
      supabase.from('settings').select('*')
    ])
    setCompanies(cs || [])
    setWorkers(ws || [])
    setTitles(ts || [])
    setTagTeams(tts || [])
    setStables(ss || [])
    setEvents(es || [])
    const ref = (settings || []).find(s => s.key === 'reference_date')
    if (ref) setReferenceDate(ref.value)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let cs = [...companies]
    if (search) cs = cs.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase()))
    cs.sort((a, b) => {
      for (const { field, dir } of sorts) {
        const av = a[field] ?? ''; const bv = b[field] ?? ''
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
    return cs
  }, [companies, search, sorts])

  const toggleSort = (field) => {
    setSorts(prev => {
      const ex = prev.find(s => s.field === field)
      if (ex) {
        if (ex.dir === 'asc') return prev.map(s => s.field === field ? { ...s, dir: 'desc' } : s)
        return prev.filter(s => s.field !== field)
      }
      return [...prev, { field, dir: 'asc' }]
    })
  }
  const sortInd = (field) => { const s = sorts.find(s => s.field === field); return s ? (s.dir === 'asc' ? '↑' : '↓') : '' }

  const startInlineEdit = (id, field, value) => setInlineEdit({ id, field, value: value ?? '' })
  const commitInlineEdit = async () => {
    const { id, field, value } = inlineEdit
    if (!id) return
    const c = companies.find(c => c.id === id)
    const cast = ['popularity', 'year_founded'].includes(field) ? +value : value
    const { error } = await supabase.from('companies').update({ [field]: cast }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      await logChange('company', id, c?.name, 'update', { [field]: c?.[field] }, { [field]: cast })
      setCompanies(cs => cs.map(c => c.id === id ? { ...c, [field]: cast } : c))
    }
    setInlineEdit({ id: null, field: null, value: '' })
  }

  const deleteCompany = async (id) => {
    const c = companies.find(c => c.id === id)
    await logChange('company', id, c?.name, 'delete', c, null)
    await supabase.from('companies').delete().eq('id', id)
    toast.success('Company deleted')
    setConfirmDelete(null)
    if (selectedCompany?.id === id) setSelectedCompany(null)
    load()
  }

  const getCompanyRoster = (cId) => workers.filter(w => (w.company_ids || []).includes(cId))
  const getOwnerName = (ownerId) => workers.find(w => w.id === ownerId)?.name || '—'

  const groupRoster = (roster) => {
    if (!rosterSplit.push && !rosterSplit.disposition && !rosterSplit.gender) return { All: roster }
    let groups = { All: roster }
    if (rosterSplit.push) {
      groups = {}
      for (const w of roster) {
        if (!groups[w.push]) groups[w.push] = []
        groups[w.push].push(w)
      }
    } else if (rosterSplit.disposition) {
      groups = {}
      for (const w of roster) {
        if (!groups[w.disposition]) groups[w.disposition] = []
        groups[w.disposition].push(w)
      }
    } else if (rosterSplit.gender) {
      groups = {}
      for (const w of roster) {
        if (!groups[w.gender]) groups[w.gender] = []
        groups[w.gender].push(w)
      }
    }
    return groups
  }

  if (selectedCompany) {
    const roster = getCompanyRoster(selectedCompany.id)
    const compTitles = titles.filter(t => t.company_id === selectedCompany.id)
    const compTagTeams = tagTeams.filter(t => t.company_id === selectedCompany.id)
    const compStables = stables.filter(s => s.company_id === selectedCompany.id)
    const compEvents = events.filter(e => e.company_id === selectedCompany.id)
    const grouped = groupRoster(roster)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCompany(null)}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {selectedCompany.logo_url && <img src={selectedCompany.logo_url} alt="" style={{ height: 40, objectFit: 'contain' }} />}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>{selectedCompany.name}</h2>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{selectedCompany.size} · {selectedCompany.nation}</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditCompany(selectedCompany); setModalOpen(true) }}>Edit Company</button>
          </div>
        </div>
        <div className="page-body">
          {/* Roster split toggles */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Split by:</span>
            {['push','disposition','gender'].map(k => (
              <button key={k} className={`btn btn-sm ${rosterSplit[k] ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRosterSplit(s => ({ push: false, disposition: false, gender: false, [k]: !s[k] }))}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>

          {/* Roster */}
          <div style={{ marginBottom: 24 }}>
            {Object.entries(grouped).map(([grp, grpWorkers]) => (
              <div key={grp} style={{ marginBottom: 16 }}>
                {grp !== 'All' && <div className="section-header">{grp} ({grpWorkers.length})</div>}
                {grp === 'All' && <div className="section-header">Roster ({grpWorkers.length})</div>}
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ background: 'var(--bg-3)', padding: '5px 8px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-2)' }}>Name</th>
                      <th style={{ background: 'var(--bg-3)', padding: '5px 8px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-2)' }}>Push</th>
                      <th style={{ background: 'var(--bg-3)', padding: '5px 8px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-2)' }}>Disposition</th>
                      <th style={{ background: 'var(--bg-3)', padding: '5px 8px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-2)' }}>Gender</th>
                      <th style={{ background: 'var(--bg-3)', padding: '5px 8px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-2)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grpWorkers.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => { setEditWorker(w); setWorkerModalOpen(true) }}>
                        <td style={{ padding: '5px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                              {w.image_url ? <img src={w.image_url} alt="" /> : w.name?.[0]}
                            </div>
                            <span className="clickable-name" style={{ fontSize: 13 }}>{w.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '5px 8px' }}><span className={`badge ${getPushColor(w.push)}`} style={{ fontSize: 10 }}>{w.push}</span></td>
                        <td style={{ padding: '5px 8px', color: w.disposition === 'Babyface' ? 'var(--blue-bright)' : w.disposition === 'Heel' ? 'var(--red-bright)' : 'var(--text-3)', fontSize: 12 }}>{w.disposition}</td>
                        <td style={{ padding: '5px 8px', fontSize: 12, color: 'var(--text-2)' }}>{w.gender}</td>
                        <td style={{ padding: '5px 8px' }}><span className={`badge ${w.status === 'Active' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>{w.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Mini tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Titles', items: compTitles, keyField: 'name', extraField: 'level' },
              { label: 'Tag Teams', items: compTagTeams, keyField: 'name' },
              { label: 'Stables', items: compStables, keyField: 'name' },
              { label: 'Events', items: compEvents, keyField: 'name', extraField: 'event_intent' },
            ].map(({ label, items, keyField, extraField }) => (
              <div key={label}>
                <div className="section-header">{label} ({items.length})</div>
                {items.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>None</div>
                  : items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{item[keyField]}</span>
                      {extraField && <span className="badge badge-gray" style={{ fontSize: 10 }}>{item[extraField]}</span>}
                    </div>
                  ))
                }
              </div>
            ))}
          </div>
        </div>

        <WorkerModal open={workerModalOpen} worker={editWorker} companies={companies} referenceDate={referenceDate}
          onClose={() => setWorkerModalOpen(false)} onSaved={() => { setWorkerModalOpen(false); load() }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>COMPANIES</h2>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{filtered.length} companies</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>Cards</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditCompany(null); setModalOpen(true) }}>+ Add Company</button>
        </div>
      </div>

      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search companies..." style={{ maxWidth: 240 }} />
      </div>

      <div className="page-body">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : view === 'card' ? (
          <div className="cards-grid">
            {filtered.map(c => (
              <div key={c.id} className="worker-card" onClick={() => setSelectedCompany(c)}>
                <div className="worker-card-img" style={{ height: 100 }}>
                  {c.logo_url ? <img src={c.logo_url} alt={c.name} style={{ objectFit: 'contain', padding: 10 }} /> : '🏢'}
                </div>
                <div className="worker-card-body">
                  <div className="worker-card-name">{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.size} · {c.nation}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>Pop: {c.popularity}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Roster: {getCompanyRoster(c.id).length}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Logo</th>
                  {[['name','Name'],['abbrev','Abbrev'],['size','Size'],['popularity','Pop'],['nation','Country'],['city','City'],['year_founded','Founded']].map(([f,l]) => (
                    <th key={f} onClick={() => toggleSort(f)} style={{ cursor: 'pointer' }}>
                      {l} {sortInd(f)}
                    </th>
                  ))}
                  <th>Owner</th>
                  <th>Roster</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const roster = getCompanyRoster(c.id)
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="avatar" style={{ width: 32, height: 32, borderRadius: 4 }}>
                          {c.logo_url ? <img src={c.logo_url} alt="" style={{ borderRadius: 4 }} /> : '🏢'}
                        </div>
                      </td>
                      <td><span className="clickable-name" onClick={() => setSelectedCompany(c)}>{c.name}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.abbrev || '—'}</td>
                      <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{c.size}</span></td>
                      <td>
                        {inlineEdit.id === c.id && inlineEdit.field === 'popularity'
                          ? <input className="inline-edit-input" type="number" min={0} max={100} value={inlineEdit.value} autoFocus
                              onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                              onBlur={commitInlineEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit() }} />
                          : <span className="editable-cell" style={{ fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--gold)', cursor: 'pointer' }}
                              onClick={() => startInlineEdit(c.id, 'popularity', c.popularity)}>{c.popularity}</span>
                        }
                      </td>
                      <td style={{ fontSize: 12 }}>{c.nation}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.city || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.year_founded || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{getOwnerName(c.owner_worker_id)}</td>
                      <td style={{ fontSize: 12 }}>{roster.length} workers</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-xs" onClick={() => { setEditCompany(c); setModalOpen(true) }}>Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(c.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CompanyModal open={modalOpen} company={editCompany} workers={workers}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Company"
        message="Delete this company? This will not delete its workers."
        onConfirm={() => deleteCompany(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
