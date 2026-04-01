import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, PUSH_OPTIONS, DISPOSITION_OPTIONS, STATUS_OPTIONS, GENDER_OPTIONS, COUNTRIES, calcAge, getWeightLabel, getPushColor, formatHeight, logChange } from '../lib/supabase'
import WorkerModal from '../components/WorkerModal'
import MultiAddModal from '../components/MultiAddModal'
import CSVImportModal from '../components/CSVImportModal'
import BulkEditModal from '../components/BulkEditModal'
import ConfirmDialog from '../components/ConfirmDialog'
import SearchableSelect from '../components/SearchableSelect'
import toast from 'react-hot-toast'

const INLINE_EDIT_FIELDS = {
  name: { type: 'text' },
  gender: { type: 'select', options: GENDER_OPTIONS },
  country: { type: 'select', options: COUNTRIES },
  status: { type: 'select', options: STATUS_OPTIONS },
  disposition: { type: 'select', options: DISPOSITION_OPTIONS },
  push: { type: 'select', options: PUSH_OPTIONS },
  weight_lbs: { type: 'number', min: 50, max: 700 },
  height_ft: { type: 'number', min: 4, max: 8 },
  height_in: { type: 'number', min: 0, max: 11 },
  popularity: { type: 'number', min: 0, max: 100 },
  star_quality: { type: 'number', min: 0, max: 100 },
  intimidation: { type: 'number', min: 0, max: 100 },
  looks: { type: 'number', min: 0, max: 100 },
  ethnicity: { type: 'text' },
  build: { type: 'text' },
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('table')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ push: [], disposition: [], status: [], gender: [], country: [] })
  const [sorts, setSorts] = useState([{ field: 'name', dir: 'asc' }])
  const [selected, setSelected] = useState([])
  const [editWorker, setEditWorker] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [multiAddOpen, setMultiAddOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [inlineEdit, setInlineEdit] = useState({ id: null, field: null, value: '' })
  const [miniAddRow, setMiniAddRow] = useState(null)
  const [referenceDate, setReferenceDate] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ws }, { data: cs }, { data: settings }] = await Promise.all([
      supabase.from('workers').select('*').order('name'),
      supabase.from('companies').select('id,name'),
      supabase.from('settings').select('*')
    ])
    setWorkers(ws || [])
    setCompanies(cs || [])
    const refSetting = (settings || []).find(s => s.key === 'reference_date')
    if (refSetting) setReferenceDate(refSetting.value)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let ws = [...workers]
    if (search) {
      const q = search.toLowerCase()
      ws = ws.filter(w => w.name?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q) || w.ethnicity?.toLowerCase().includes(q) || w.build?.toLowerCase().includes(q))
    }
    if (filters.push.length) ws = ws.filter(w => filters.push.includes(w.push))
    if (filters.disposition.length) ws = ws.filter(w => filters.disposition.includes(w.disposition))
    if (filters.status.length) ws = ws.filter(w => filters.status.includes(w.status))
    if (filters.gender.length) ws = ws.filter(w => filters.gender.includes(w.gender))
    if (filters.country.length) ws = ws.filter(w => filters.country.includes(w.country))

    // Multi-level sort
    ws.sort((a, b) => {
      for (const { field, dir } of sorts) {
        const av = a[field] ?? ''; const bv = b[field] ?? ''
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
    return ws
  }, [workers, search, filters, sorts])

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

  const sortIndicator = (field) => {
    const s = sorts.find(s => s.field === field)
    if (!s) return ''
    const idx = sorts.indexOf(s) + 1
    return ` ${s.dir === 'asc' ? '↑' : '↓'}${sorts.length > 1 ? idx : ''}`
  }

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(w => w.id))

  const deleteWorker = async (id) => {
    const w = workers.find(w => w.id === id)
    await logChange('worker', id, w?.name, 'delete', w, null)
    await supabase.from('workers').delete().eq('id', id)
    toast.success('Worker deleted')
    setConfirmDelete(null)
    load()
  }

  const startInlineEdit = (id, field, value) => {
    setInlineEdit({ id, field, value: value ?? '' })
  }

  const commitInlineEdit = async () => {
    const { id, field, value } = inlineEdit
    if (id === null) return
    const def = INLINE_EDIT_FIELDS[field]
    const cast = def?.type === 'number' ? +value : value
    const w = workers.find(w => w.id === id)
    const { error } = await supabase.from('workers').update({ [field]: cast }).eq('id', id)
    if (error) { toast.error(error.message) }
    else {
      await logChange('worker', id, w?.name, 'update', { [field]: w?.[field] }, { [field]: cast })
      setWorkers(ws => ws.map(w => w.id === id ? { ...w, [field]: cast } : w))
    }
    setInlineEdit({ id: null, field: null, value: '' })
  }

  const saveMiniAdd = async () => {
    if (!miniAddRow?.name?.trim()) { toast.error('Name required'); return }
    const payload = {
      name: miniAddRow.name.trim(),
      gender: miniAddRow.gender || 'Male',
      status: 'Active', disposition: 'Babyface',
      push: miniAddRow.push || 'Midcard',
      country: 'United States',
      popularity: 50, star_quality: 50, intimidation: 50, looks: 50,
      weight_lbs: 220, height_ft: 6, height_in: 0, company_ids: []
    }
    const { data, error } = await supabase.from('workers').insert(payload).select().single()
    if (error) { toast.error(error.message); return }
    await logChange('worker', data.id, data.name, 'create', null, payload)
    toast.success('Worker added')
    setMiniAddRow(null)
    load()
  }

  const openEdit = (w) => { setEditWorker(w); setModalOpen(true) }
  const openAdd = () => { setEditWorker(null); setModalOpen(true) }

  const getCompanyNames = (ids) => {
    if (!ids?.length) return '—'
    return ids.map(id => companies.find(c => c.id === id)?.name).filter(Boolean).join(', ')
  }

  const Th = ({ field, children }) => (
    <th onClick={() => toggleSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {children}<span className="sort-indicator">{sortIndicator(field)}</span>
    </th>
  )

  const Cell = ({ worker, field, display }) => {
    const isEditing = inlineEdit.id === worker.id && inlineEdit.field === field
    const def = INLINE_EDIT_FIELDS[field]

    if (isEditing) {
      return (
        <td>
          {def?.type === 'select'
            ? <select className="inline-edit-input" value={inlineEdit.value} autoFocus
                onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                onBlur={commitInlineEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit({ id: null, field: null, value: '' }) }}>
                {def.options.map(o => <option key={o}>{o}</option>)}
              </select>
            : <input className="inline-edit-input" value={inlineEdit.value} autoFocus type={def?.type || 'text'}
                onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                onBlur={commitInlineEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit({ id: null, field: null, value: '' }) }} />
          }
        </td>
      )
    }
    return (
      <td className="editable-cell" onClick={() => startInlineEdit(worker.id, field, worker[field])}
        title="Click to edit">
        {display !== undefined ? display : (worker[field] ?? '—')}
      </td>
    )
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--gold)' }}>WORKERS</h2>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{filtered.length} of {workers.length} workers</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>Cards</button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setCsvOpen(true)}>📥 Import CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMultiAddOpen(true)}>⚡ Multi-Add</button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Worker</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search workers..." style={{ maxWidth: 220 }} />

          <button className={`btn btn-secondary btn-sm ${filterOpen ? 'btn-primary' : ''}`} onClick={() => setFilterOpen(o => !o)}>
            🔽 Filters {activeFilters.length > 0 ? `(${activeFilters.length})` : ''}
          </button>

          {selected.length > 0 && (
            <>
              <div className="bulk-toolbar" style={{ padding: '4px 10px', margin: 0 }}>
                <span>{selected.length} selected</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setBulkOpen(true)}>Bulk Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
              </div>
            </>
          )}

          {/* Sort pills */}
          {sorts.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {sorts.map((s, i) => (
                <span key={s.field} className="filter-tag">
                  {s.field} {s.dir === 'asc' ? '↑' : '↓'}
                  <button onClick={() => setSorts(prev => prev.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expanded filter panel */}
        {filterOpen && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {[
              { key: 'push', label: 'Push', options: PUSH_OPTIONS },
              { key: 'disposition', label: 'Disposition', options: DISPOSITION_OPTIONS },
              { key: 'status', label: 'Status', options: STATUS_OPTIONS },
              { key: 'gender', label: 'Gender', options: GENDER_OPTIONS },
              { key: 'country', label: 'Country', options: COUNTRIES },
            ].map(({ key, label, options }) => (
              <SearchableSelect key={key} label={label} options={options} value={filters[key]}
                onChange={v => setFilters(f => ({ ...f, [key]: v }))} multi placeholder={`All ${label}s`} />
            ))}
          </div>
        )}

        {/* Active filter tags */}
        {activeFilters.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {activeFilters.map(([key, vals]) =>
              vals.map(v => (
                <span key={key+v} className="filter-tag">
                  {key}: {v}
                  <button onClick={() => setFilters(f => ({ ...f, [key]: f[key].filter(x => x !== v) }))}>×</button>
                </span>
              ))
            )}
            <button className="btn btn-ghost btn-xs" onClick={() => setFilters({ push: [], disposition: [], status: [], gender: [], country: [] })}>Clear All</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="page-body">
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Loading workers...</span></div>
        ) : view === 'card' ? (
          <div className="cards-grid">
            {filtered.map(w => {
              const age = calcAge(w.dob, referenceDate)
              const wt = getWeightLabel(w.weight_lbs, w.gender)
              return (
                <div key={w.id} className="worker-card" onClick={() => openEdit(w)}>
                  <div className="worker-card-img">
                    {w.image_url ? <img src={w.image_url} alt={w.name} /> : '👤'}
                  </div>
                  <div className="worker-card-body">
                    <div className="worker-card-name">{w.name}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span className={`badge ${getPushColor(w.push)}`}>{w.push}</span>
                      <span className={`badge ${w.disposition === 'Babyface' ? 'badge-blue' : w.disposition === 'Heel' ? 'badge-red' : 'badge-gray'}`}>{w.disposition}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {w.country} {age ? `· Age ${age}` : ''} · {formatHeight(w.height_ft, w.height_in)}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 3 }} className={wt.cls}>{wt.label} ({w.weight_lbs} lbs)</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {['popularity','star_quality','intimidation','looks'].map(attr => (
                        <div key={attr} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--gold)' }}>{w[attr]}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{attr === 'star_quality' ? 'Star' : attr.slice(0,4)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll} />
                  </th>
                  <th style={{ width: 44 }}>Pic</th>
                  <Th field="name">Name</Th>
                  <Th field="gender">Gender</Th>
                  <Th field="country">Country</Th>
                  <Th field="push">Push</Th>
                  <Th field="disposition">Disposition</Th>
                  <Th field="status">Status</Th>
                  <th>Age</th>
                  <th>Height</th>
                  <Th field="weight_lbs">Weight</Th>
                  <Th field="popularity">Pop</Th>
                  <Th field="star_quality">Star</Th>
                  <Th field="intimidation">Intim</Th>
                  <Th field="looks">Looks</Th>
                  <th>Companies</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => {
                  const age = calcAge(w.dob, referenceDate)
                  const wt = getWeightLabel(w.weight_lbs, w.gender)
                  const isSel = selected.includes(w.id)
                  return (
                    <tr key={w.id} className={isSel ? 'selected' : ''}>
                      <td><input type="checkbox" checked={isSel} onChange={() => toggleSelect(w.id)} /></td>
                      <td>
                        <div className="avatar">
                          {w.image_url ? <img src={w.image_url} alt="" /> : w.name?.[0] || '?'}
                        </div>
                      </td>
                      <td>
                        <span className="clickable-name" onClick={() => openEdit(w)}>{w.name}</span>
                      </td>
                      <Cell worker={w} field="gender" />
                      <Cell worker={w} field="country" />
                      <td onClick={() => startInlineEdit(w.id, 'push', w.push)} className="editable-cell">
                        {inlineEdit.id === w.id && inlineEdit.field === 'push'
                          ? <select className="inline-edit-input" value={inlineEdit.value} autoFocus
                              onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                              onBlur={commitInlineEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit() }}>
                              {PUSH_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                          : <span className={`badge ${getPushColor(w.push)}`}>{w.push}</span>
                        }
                      </td>
                      <td onClick={() => startInlineEdit(w.id, 'disposition', w.disposition)} className="editable-cell">
                        {inlineEdit.id === w.id && inlineEdit.field === 'disposition'
                          ? <select className="inline-edit-input" value={inlineEdit.value} autoFocus
                              onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                              onBlur={commitInlineEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit() }}>
                              {DISPOSITION_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                          : <span className={`badge ${w.disposition === 'Babyface' ? 'badge-blue' : w.disposition === 'Heel' ? 'badge-red' : 'badge-gray'}`}>{w.disposition}</span>
                        }
                      </td>
                      <td onClick={() => startInlineEdit(w.id, 'status', w.status)} className="editable-cell">
                        {inlineEdit.id === w.id && inlineEdit.field === 'status'
                          ? <select className="inline-edit-input" value={inlineEdit.value} autoFocus
                              onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                              onBlur={commitInlineEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit() }}>
                              {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                          : <span className={`badge ${w.status === 'Active' ? 'badge-green' : w.status === 'Retired' ? 'badge-gray' : 'badge-red'}`}>{w.status}</span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{age ?? '—'}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatHeight(w.height_ft, w.height_in)}</td>
                      <td onClick={() => startInlineEdit(w.id, 'weight_lbs', w.weight_lbs)} className="editable-cell">
                        {inlineEdit.id === w.id && inlineEdit.field === 'weight_lbs'
                          ? <input className="inline-edit-input" type="number" value={inlineEdit.value} autoFocus
                              onChange={e => setInlineEdit(i => ({ ...i, value: e.target.value }))}
                              onBlur={commitInlineEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitInlineEdit() }} />
                          : <span className={wt.cls}>{w.weight_lbs} lbs</span>
                        }
                      </td>
                      <Cell worker={w} field="popularity" display={<span style={{ fontWeight: 700, fontFamily: 'var(--font-ui)' }}>{w.popularity}</span>} />
                      <Cell worker={w} field="star_quality" display={<span style={{ fontWeight: 700, fontFamily: 'var(--font-ui)' }}>{w.star_quality}</span>} />
                      <Cell worker={w} field="intimidation" display={<span style={{ fontWeight: 700, fontFamily: 'var(--font-ui)' }}>{w.intimidation}</span>} />
                      <Cell worker={w} field="looks" display={<span style={{ fontWeight: 700, fontFamily: 'var(--font-ui)' }}>{w.looks}</span>} />
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-2)' }}>
                        {getCompanyNames(w.company_ids)}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-xs" onClick={() => setConfirmDelete(w.id)}>✕</button>
                      </td>
                    </tr>
                  )
                })}
                {/* Mini add row */}
                {miniAddRow ? (
                  <tr className="mini-add-row" style={{ background: 'rgba(201,168,76,0.05)' }}>
                    <td colSpan={2} />
                    <td><input value={miniAddRow.name} onChange={e => setMiniAddRow(r => ({ ...r, name: e.target.value }))} placeholder="Name *" autoFocus /></td>
                    <td>
                      <select value={miniAddRow.gender} onChange={e => setMiniAddRow(r => ({ ...r, gender: e.target.value }))}>
                        {GENDER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td colSpan={2}>
                      <select value={miniAddRow.push} onChange={e => setMiniAddRow(r => ({ ...r, push: e.target.value }))}>
                        {PUSH_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </td>
                    <td colSpan={10} />
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-primary btn-xs" onClick={saveMiniAdd}>✓</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setMiniAddRow(null)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={17} style={{ textAlign: 'center', padding: '10px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setMiniAddRow({ name: '', gender: 'Male', push: 'Midcard' })}>
                        + Add worker in table
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkerModal open={modalOpen} worker={editWorker} companies={companies} referenceDate={referenceDate}
        onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load() }} />
      <MultiAddModal open={multiAddOpen} onClose={() => setMultiAddOpen(false)} onSaved={() => { setMultiAddOpen(false); load() }} />
      <CSVImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onSaved={() => { setCsvOpen(false); load() }} />
      <BulkEditModal open={bulkOpen} selectedWorkers={selected} allWorkers={workers}
        onClose={() => setBulkOpen(false)} onSaved={() => { setBulkOpen(false); setSelected([]); load() }} />
      <ConfirmDialog open={!!confirmDelete} title="Delete Worker"
        message="This action cannot be undone. Are you sure you want to delete this worker?"
        onConfirm={() => deleteWorker(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
