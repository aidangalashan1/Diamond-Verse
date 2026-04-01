import React, { useState, useEffect, useRef } from 'react'
import { supabase, PUSH_OPTIONS, DISPOSITION_OPTIONS, STATUS_OPTIONS, GENDER_OPTIONS, COUNTRIES, calcAge, getWeightLabel, randomDOB, logChange } from '../lib/supabase'
import ImageUpload from './ImageUpload'
import SearchableSelect from './SearchableSelect'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '', gender: 'Male', country: 'United States', dob: '', bio: '',
  height_ft: 6, height_in: 0, weight_lbs: 220, status: 'Active',
  disposition: 'Babyface', push: 'Midcard',
  popularity: 50, star_quality: 50, intimidation: 50, looks: 50,
  image_url: '', ethnicity: '', build: '', company_ids: []
}

export default function WorkerModal({ open, worker, companies, referenceDate, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = !!worker?.id

  useEffect(() => {
    if (open) setForm(worker?.id ? { ...EMPTY, ...worker } : EMPTY)
  }, [open, worker])

  if (!open) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const age = calcAge(form.dob, referenceDate)
  const weightInfo = getWeightLabel(form.weight_lbs, form.gender)

  const handleHeightFt = (val) => {
    let ft = parseInt(val)
    if (isNaN(ft)) ft = 4
    ft = Math.max(4, Math.min(8, ft))
    set('height_ft', ft)
  }
  const handleHeightIn = (val) => {
    let inches = parseInt(val)
    if (isNaN(inches)) inches = 0
    if (inches >= 12) { set('height_ft', Math.min(8, form.height_ft + 1)); set('height_in', 0) }
    else if (inches < 0) { set('height_ft', Math.max(4, form.height_ft - 1)); set('height_in', 11) }
    else set('height_in', inches)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), gender: form.gender, country: form.country,
      dob: form.dob || null, bio: form.bio, height_ft: +form.height_ft,
      height_in: +form.height_in, weight_lbs: +form.weight_lbs,
      status: form.status, disposition: form.disposition, push: form.push,
      popularity: +form.popularity, star_quality: +form.star_quality,
      intimidation: +form.intimidation, looks: +form.looks,
      image_url: form.image_url, ethnicity: form.ethnicity, build: form.build,
      company_ids: form.company_ids || []
    }
    if (isEdit) {
      const { error } = await supabase.from('workers').update(payload).eq('id', worker.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      await logChange('worker', worker.id, form.name, 'update', worker, payload)
      toast.success('Worker updated')
    } else {
      const { data, error } = await supabase.from('workers').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      await logChange('worker', data.id, form.name, 'create', null, payload)
      toast.success('Worker created')
    }
    setSaving(false)
    onSaved()
  }

  const companyOptions = companies.map(c => ({ value: c.id, label: c.name }))

  const bioWords = form.bio ? form.bio.trim().split(/\s+/).filter(Boolean).length : 0
  const bioChars = form.bio ? form.bio.length : 0

  const Attr = ({ label, field }) => (
    <div className="form-group">
      <label>{label} <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{form[field]}</span></label>
      <div className="slider-group">
        <input type="range" min={0} max={100} value={form[field]} onChange={e => set(field, +e.target.value)} tabIndex={-1} />
        <input type="number" min={0} max={100} value={form[field]}
          onChange={e => set(field, Math.max(0, Math.min(100, +e.target.value)))}
          style={{ width: 56 }} />
      </div>
    </div>
  )

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 960 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'EDIT WORKER' : 'ADD WORKER'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 24, marginBottom: 24 }}>
            <ImageUpload bucket="workers" value={form.image_url} onChange={v => set('image_url', v)} label="Photo" size={120} />
            <div className="form-grid form-grid-3" style={{ alignContent: 'start' }}>
              <div className="form-group" style={{ gridColumn: '1/3' }}>
                <label>Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Worker name" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                  {GENDER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Disposition</label>
                <select value={form.disposition} onChange={e => set('disposition', e.target.value)}>
                  {DISPOSITION_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Push</label>
                <select value={form.push} onChange={e => set('push', e.target.value)}>
                  {PUSH_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Country + DOB + Heights + Weight */}
          <div className="form-grid form-grid-4" style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ gridColumn: '1/2' }}>
              <SearchableSelect
                label="Country"
                options={COUNTRIES}
                value={form.country}
                onChange={v => set('country', v)}
                placeholder="Select country"
              />
            </div>

            <div className="form-group">
              <label>
                Date of Birth
                {age !== null && <span style={{ color: 'var(--gold)', marginLeft: 8, fontWeight: 700 }}>Age: {age}</span>}
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} style={{ flex: 1 }} tabIndex={0} />
                <button type="button" className="btn btn-secondary btn-sm" title="Random DOB"
                  onClick={() => set('dob', randomDOB())} tabIndex={-1}>🎲</button>
              </div>
            </div>

            <div className="form-group">
              <label>Height</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" min={4} max={8} value={form.height_ft}
                  onChange={e => handleHeightFt(e.target.value)}
                  style={{ width: 56 }} />
                <span style={{ color: 'var(--text-3)' }}>ft</span>
                <input type="number" min={0} max={11} value={form.height_in}
                  onChange={e => handleHeightIn(e.target.value)}
                  style={{ width: 56 }} />
                <span style={{ color: 'var(--text-3)' }}>in</span>
              </div>
              <input type="range" min={48} max={108}
                value={form.height_ft * 12 + form.height_in}
                onChange={e => {
                  const total = +e.target.value
                  set('height_ft', Math.floor(total / 12))
                  set('height_in', total % 12)
                }} tabIndex={-1} style={{ marginTop: 4 }} />
            </div>

            <div className="form-group">
              <label>
                Weight (lbs)
                <span style={{ marginLeft: 8 }} className={weightInfo.cls}>{weightInfo.label}</span>
              </label>
              <div className="slider-group">
                <input type="range" min={50} max={700} value={form.weight_lbs}
                  onChange={e => set('weight_lbs', +e.target.value)} tabIndex={-1} />
                <input type="number" min={50} max={700} value={form.weight_lbs}
                  onChange={e => set('weight_lbs', Math.max(50, Math.min(700, +e.target.value)))}
                  style={{ width: 68 }} />
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div className="form-grid form-grid-4" style={{ marginBottom: 20 }}>
            <Attr label="Popularity" field="popularity" />
            <Attr label="Star Quality" field="star_quality" />
            <Attr label="Intimidation" field="intimidation" />
            <Attr label="Looks" field="looks" />
          </div>

          {/* Extra fields */}
          <div className="form-grid form-grid-3" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label>Ethnicity</label>
              <input value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} placeholder="e.g. White, Hispanic..." tabIndex={0} />
            </div>
            <div className="form-group">
              <label>Build</label>
              <input value={form.build} onChange={e => set('build', e.target.value)} placeholder="e.g. Athletic, Muscular..." />
            </div>
            <div className="form-group">
              <SearchableSelect
                label="Companies"
                options={companyOptions}
                value={form.company_ids}
                onChange={v => set('company_ids', v)}
                multi
                placeholder="Select companies..."
              />
            </div>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label>
              Biography
              <span style={{ marginLeft: 12, fontWeight: 400, color: 'var(--text-3)' }}>
                {bioWords} words · {bioChars} chars
              </span>
            </label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
              rows={5} placeholder="Worker biography..." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Worker'}
          </button>
        </div>
      </div>
    </div>
  )
}
