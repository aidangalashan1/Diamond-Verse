import React, { useState } from 'react'
import { supabase, PUSH_OPTIONS, DISPOSITION_OPTIONS, STATUS_OPTIONS, GENDER_OPTIONS, logChange } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function MultiAddModal({ open, onClose, onSaved }) {
  const [mode, setMode] = useState('fast')
  const [fastText, setFastText] = useState('')
  const [fullRows, setFullRows] = useState(
    Array.from({ length: 5 }, () => ({ name: '', gender: 'Male', push: 'Midcard', disposition: 'Babyface', status: 'Active', country: 'United States', weight_lbs: '', height_ft: '', height_in: '', popularity: '', star_quality: '', intimidation: '', looks: '' }))
  )
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const addFullRow = () => setFullRows(r => [...r, { name: '', gender: 'Male', push: 'Midcard', disposition: 'Babyface', status: 'Active', country: 'United States', weight_lbs: '', height_ft: '', height_in: '', popularity: '', star_quality: '', intimidation: '', looks: '' }])

  const updateRow = (i, k, v) => {
    setFullRows(rows => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  }

  const handlePasteFull = (e) => {
    const text = e.clipboardData.getData('text')
    const lines = text.split('\n').map(l => l.split('\t'))
    const keys = ['name','gender','push','disposition','status','country','weight_lbs','height_ft','height_in','popularity','star_quality','intimidation','looks']
    const newRows = lines.filter(l => l.some(c => c.trim())).map(cols => {
      const row = { name: '', gender: 'Male', push: 'Midcard', disposition: 'Babyface', status: 'Active', country: 'United States', weight_lbs: '', height_ft: '', height_in: '', popularity: '', star_quality: '', intimidation: '', looks: '' }
      cols.forEach((v, i) => { if (keys[i]) row[keys[i]] = v.trim() })
      return row
    })
    if (newRows.length) { setFullRows(newRows); e.preventDefault() }
  }

  const saveFast = async () => {
    const names = fastText.split('\n').map(n => n.trim()).filter(Boolean)
    if (!names.length) { toast.error('Enter at least one name'); return }
    setSaving(true)
    const inserts = names.map(name => ({ name, gender: 'Male', country: 'United States', status: 'Active', disposition: 'Babyface', push: 'Midcard', popularity: 50, star_quality: 50, intimidation: 50, looks: 50, weight_lbs: 220, height_ft: 6, height_in: 0, company_ids: [] }))
    const { data, error } = await supabase.from('workers').insert(inserts).select()
    if (error) { toast.error(error.message); setSaving(false); return }
    for (const w of data) await logChange('worker', w.id, w.name, 'create', null, w)
    toast.success(`${names.length} workers created`)
    setSaving(false)
    setFastText('')
    onSaved()
  }

  const saveFull = async () => {
    const valid = fullRows.filter(r => r.name.trim())
    if (!valid.length) { toast.error('Enter at least one name'); return }
    setSaving(true)
    const inserts = valid.map(r => ({
      name: r.name.trim(),
      gender: GENDER_OPTIONS.includes(r.gender) ? r.gender : 'Male',
      country: r.country || 'United States',
      status: STATUS_OPTIONS.includes(r.status) ? r.status : 'Active',
      disposition: DISPOSITION_OPTIONS.includes(r.disposition) ? r.disposition : 'Babyface',
      push: PUSH_OPTIONS.includes(r.push) ? r.push : 'Midcard',
      weight_lbs: r.weight_lbs ? +r.weight_lbs : 220,
      height_ft: r.height_ft ? +r.height_ft : 6,
      height_in: r.height_in ? +r.height_in : 0,
      popularity: r.popularity ? Math.max(0, Math.min(100, +r.popularity)) : 50,
      star_quality: r.star_quality ? Math.max(0, Math.min(100, +r.star_quality)) : 50,
      intimidation: r.intimidation ? Math.max(0, Math.min(100, +r.intimidation)) : 50,
      looks: r.looks ? Math.max(0, Math.min(100, +r.looks)) : 50,
      company_ids: []
    }))
    const { data, error } = await supabase.from('workers').insert(inserts).select()
    if (error) { toast.error(error.message); setSaving(false); return }
    for (const w of data) await logChange('worker', w.id, w.name, 'create', null, w)
    toast.success(`${inserts.length} workers created`)
    setSaving(false)
    onSaved()
  }

  const FULL_COLS = [
    { key: 'name', label: 'Name *', width: 140, type: 'text' },
    { key: 'gender', label: 'Gender', width: 90, type: 'select', options: GENDER_OPTIONS },
    { key: 'push', label: 'Push', width: 130, type: 'select', options: PUSH_OPTIONS },
    { key: 'disposition', label: 'Disp.', width: 90, type: 'select', options: DISPOSITION_OPTIONS },
    { key: 'status', label: 'Status', width: 80, type: 'select', options: STATUS_OPTIONS },
    { key: 'country', label: 'Country', width: 110, type: 'text' },
    { key: 'weight_lbs', label: 'Weight', width: 70, type: 'number' },
    { key: 'height_ft', label: 'Ht Ft', width: 55, type: 'number' },
    { key: 'height_in', label: 'Ht In', width: 55, type: 'number' },
    { key: 'popularity', label: 'Pop', width: 55, type: 'number' },
    { key: 'star_quality', label: 'Star', width: 55, type: 'number' },
    { key: 'intimidation', label: 'Intim', width: 55, type: 'number' },
    { key: 'looks', label: 'Looks', width: 55, type: 'number' },
  ]

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: mode === 'full' ? 1100 : 500 }}>
        <div className="modal-header">
          <h2>MULTI-ADD WORKERS</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="tab-nav">
            <button className={`tab-btn ${mode === 'fast' ? 'active' : ''}`} onClick={() => setMode('fast')}>⚡ Fast Mode</button>
            <button className={`tab-btn ${mode === 'full' ? 'active' : ''}`} onClick={() => setMode('full')}>📋 Full Mode</button>
          </div>

          {mode === 'fast' && (
            <div>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>
                Enter one worker name per line. All workers will be created with default values.
              </p>
              <textarea
                value={fastText}
                onChange={e => setFastText(e.target.value)}
                rows={14}
                placeholder={"Drake Diamond\nBilly Anthem\nJade Voss\n..."}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 6 }}>
                {fastText.split('\n').filter(n => n.trim()).length} names entered
              </p>
            </div>
          )}

          {mode === 'full' && (
            <div>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 8 }}>
                Fill in the table below. You can paste tab-separated data (e.g. from Excel/Google Sheets).
                Columns: Name, Gender, Push, Disposition, Status, Country, Weight, Ht Ft, Ht In, Pop, Star, Intim, Looks
              </p>
              <div style={{ overflowX: 'auto' }} onPaste={handlePasteFull}>
                <table style={{ fontSize: 12, borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 30, background: 'var(--bg-3)', padding: '6px 4px', color: 'var(--text-3)', fontSize: 10 }}>#</th>
                      {FULL_COLS.map(c => (
                        <th key={c.key} style={{ background: 'var(--bg-3)', padding: '6px 4px', color: 'var(--text-2)', fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: c.width }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fullRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ color: 'var(--text-dim)', textAlign: 'center', fontSize: 10, padding: '2px 4px' }}>{i + 1}</td>
                        {FULL_COLS.map(c => (
                          <td key={c.key} style={{ padding: '2px 3px' }}>
                            {c.type === 'select'
                              ? <select value={row[c.key]} onChange={e => updateRow(i, c.key, e.target.value)}
                                  style={{ padding: '3px 4px', fontSize: 11, width: '100%' }}>
                                  {c.options.map(o => <option key={o}>{o}</option>)}
                                </select>
                              : <input type={c.type} value={row[c.key]}
                                  onChange={e => updateRow(i, c.key, e.target.value)}
                                  style={{ padding: '3px 4px', fontSize: 11, width: '100%' }} />
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={addFullRow}>+ Add Row</button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={mode === 'fast' ? saveFast : saveFull} disabled={saving}>
            {saving ? 'Saving...' : 'Create Workers'}
          </button>
        </div>
      </div>
    </div>
  )
}
