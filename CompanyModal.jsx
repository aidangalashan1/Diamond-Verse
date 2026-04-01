import React, { useState, useEffect } from 'react'
import { supabase, COMPANY_SIZE_OPTIONS, COUNTRIES, logChange } from '../lib/supabase'
import ImageUpload from './ImageUpload'
import SearchableSelect from './SearchableSelect'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '', abbrev: '', logo_url: '', size: 'Small',
  popularity: 50, nation: 'United States', city: '',
  owner_worker_id: null, year_founded: ''
}

export default function CompanyModal({ open, company, workers, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = !!company?.id

  useEffect(() => { if (open) setForm(company?.id ? { ...EMPTY, ...company } : EMPTY) }, [open, company])
  if (!open) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), abbrev: form.abbrev, logo_url: form.logo_url,
      size: form.size, popularity: +form.popularity || 50,
      nation: form.nation, city: form.city,
      owner_worker_id: form.owner_worker_id || null,
      year_founded: form.year_founded ? +form.year_founded : null
    }
    if (isEdit) {
      const { error } = await supabase.from('companies').update(payload).eq('id', company.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      await logChange('company', company.id, form.name, 'update', company, payload)
      toast.success('Company updated')
    } else {
      const { data, error } = await supabase.from('companies').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      await logChange('company', data.id, form.name, 'create', null, payload)
      toast.success('Company created')
    }
    setSaving(false); onSaved()
  }

  const workerOptions = workers.map(w => ({ value: w.id, label: w.name }))

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'EDIT COMPANY' : 'ADD COMPANY'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, marginBottom: 20 }}>
            <ImageUpload bucket="companies" value={form.logo_url} onChange={v => set('logo_url', v)} label="Logo" size={100} />
            <div className="form-grid form-grid-2">
              <div className="form-group" style={{ gridColumn: '1/3' }}>
                <label>Company Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Company name" />
              </div>
              <div className="form-group">
                <label>Abbreviation</label>
                <input value={form.abbrev} onChange={e => set('abbrev', e.target.value)} placeholder="e.g. GWA" maxLength={8} />
              </div>
              <div className="form-group">
                <label>Size</label>
                <select value={form.size} onChange={e => set('size', e.target.value)}>
                  {COMPANY_SIZE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
            <SearchableSelect label="Country" options={COUNTRIES} value={form.nation} onChange={v => set('nation', v)} placeholder="Select country" />
            <div className="form-group">
              <label>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Home city" />
            </div>
            <div className="form-group">
              <label>Popularity <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{form.popularity}</span></label>
              <div className="slider-group">
                <input type="range" min={0} max={100} value={form.popularity} onChange={e => set('popularity', +e.target.value)} tabIndex={-1} />
                <input type="number" min={0} max={100} value={form.popularity} onChange={e => set('popularity', Math.max(0, Math.min(100, +e.target.value)))} style={{ width: 56 }} />
              </div>
            </div>
            <div className="form-group">
              <label>Year Founded</label>
              <input type="number" value={form.year_founded} onChange={e => set('year_founded', e.target.value)} placeholder="e.g. 2005" min={1900} max={2100} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/3' }}>
              <SearchableSelect label="Owner (Worker)" options={workerOptions} value={form.owner_worker_id}
                onChange={v => set('owner_worker_id', v)} placeholder="Select owner..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Company'}
          </button>
        </div>
      </div>
    </div>
  )
}
