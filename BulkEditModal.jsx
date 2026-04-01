import React, { useState } from 'react'
import { supabase, PUSH_OPTIONS, DISPOSITION_OPTIONS, STATUS_OPTIONS, GENDER_OPTIONS, COUNTRIES, logChange } from '../lib/supabase'
import toast from 'react-hot-toast'

const FIELDS = [
  { key: 'gender', label: 'Gender', type: 'select', options: GENDER_OPTIONS },
  { key: 'country', label: 'Country', type: 'select', options: COUNTRIES },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
  { key: 'disposition', label: 'Disposition', type: 'select', options: DISPOSITION_OPTIONS },
  { key: 'push', label: 'Push', type: 'select', options: PUSH_OPTIONS },
  { key: 'popularity', label: 'Popularity', type: 'number', min: 0, max: 100 },
  { key: 'star_quality', label: 'Star Quality', type: 'number', min: 0, max: 100 },
  { key: 'intimidation', label: 'Intimidation', type: 'number', min: 0, max: 100 },
  { key: 'looks', label: 'Looks', type: 'number', min: 0, max: 100 },
  { key: 'weight_lbs', label: 'Weight (lbs)', type: 'number', min: 50, max: 700 },
  { key: 'height_ft', label: 'Height (ft)', type: 'number', min: 4, max: 8 },
  { key: 'height_in', label: 'Height (in)', type: 'number', min: 0, max: 11 },
  { key: 'ethnicity', label: 'Ethnicity', type: 'text' },
  { key: 'build', label: 'Build', type: 'text' },
]

export default function BulkEditModal({ open, selectedWorkers, allWorkers, onClose, onSaved }) {
  const [field, setField] = useState('status')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const fieldDef = FIELDS.find(f => f.key === field) || FIELDS[0]

  const apply = async () => {
    if (value === '') { toast.error('Set a value'); return }
    setSaving(true)
    const cast = fieldDef.type === 'number' ? +value : value
    const { error } = await supabase.from('workers')
      .update({ [field]: cast })
      .in('id', selectedWorkers)
    if (error) { toast.error(error.message); setSaving(false); return }

    for (const id of selectedWorkers) {
      const w = allWorkers.find(w => w.id === id)
      if (w) await logChange('worker', id, w.name, 'update', { [field]: w[field] }, { [field]: cast })
    }
    toast.success(`Updated ${selectedWorkers.length} workers`)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1500 }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>BULK EDIT</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 16 }}>
            Editing <strong style={{ color: 'var(--gold)' }}>{selectedWorkers.length}</strong> selected workers.
            Choose a field and value to apply to all.
          </p>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Field to Edit</label>
            <select value={field} onChange={e => { setField(e.target.value); setValue('') }}>
              {FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>New Value</label>
            {fieldDef.type === 'select'
              ? <select value={value} onChange={e => setValue(e.target.value)}>
                  <option value="">— Select —</option>
                  {fieldDef.options.map(o => <option key={o}>{o}</option>)}
                </select>
              : <input type={fieldDef.type === 'number' ? 'number' : 'text'}
                  min={fieldDef.min} max={fieldDef.max}
                  value={value} onChange={e => setValue(e.target.value)}
                  placeholder={`Enter ${fieldDef.label.toLowerCase()}...`} />
            }
          </div>

          {selectedWorkers.length > 0 && (
            <div style={{ marginTop: 16, background: 'var(--bg-3)', borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Affected Workers
              </div>
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {selectedWorkers.map(id => {
                  const w = allWorkers.find(w => w.id === id)
                  return w ? <div key={id} style={{ fontSize: 12, color: 'var(--text-2)', padding: '1px 0' }}>{w.name}</div> : null
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={apply} disabled={saving}>
            {saving ? 'Applying...' : `Apply to ${selectedWorkers.length} Workers`}
          </button>
        </div>
      </div>
    </div>
  )
}
