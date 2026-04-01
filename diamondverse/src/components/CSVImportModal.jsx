import React, { useState, useRef } from 'react'
import { supabase, PUSH_OPTIONS, DISPOSITION_OPTIONS, logChange } from '../lib/supabase'
import toast from 'react-hot-toast'

function parseHeight(str) {
  if (!str) return { ft: 6, inches: 0 }
  const m = String(str).match(/(\d+)'(\d+)/)
  if (m) return { ft: +m[1], inches: +m[2] }
  const m2 = String(str).match(/(\d+)/)
  if (m2) return { ft: +m2[1], inches: 0 }
  return { ft: 6, inches: 0 }
}

function mapPush(val) {
  if (!val) return 'Midcard'
  const v = String(val).toLowerCase()
  if (v.includes('main') || v.includes('eventer')) return 'Main Event'
  if (v.includes('upper')) return 'Upper Midcard'
  if (v.includes('lower')) return 'Lower Midcard'
  if (v.includes('mid')) return 'Midcard'
  if (v.includes('enhance')) return 'Enhancement Talent'
  if (v.includes('announce')) return 'Announcer'
  if (v.includes('ref')) return 'Referee'
  if (v.includes('person')) return 'Personality'
  if (v.includes('staff')) return 'Staff'
  return 'Midcard'
}

function parseCSV(text) {
  const lines = text.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
  const rows = []
  let i = 1
  while (i < lines.length) {
    let line = lines[i]
    // Handle multiline fields
    while (line && (line.split('"').length - 1) % 2 !== 0 && i < lines.length - 1) {
      i++
      line += '\n' + lines[i]
    }
    if (line.trim()) {
      const cols = []
      let inQuote = false, cur = '', ci = 0
      while (ci < line.length) {
        const ch = line[ci]
        if (ch === '"') {
          if (inQuote && line[ci+1] === '"') { cur += '"'; ci += 2; continue }
          inQuote = !inQuote
        } else if (ch === ',' && !inQuote) {
          cols.push(cur); cur = ''
        } else { cur += ch }
        ci++
      }
      cols.push(cur)
      const obj = {}
      headers.forEach((h, idx) => { obj[h] = (cols[idx] || '').trim() })
      rows.push(obj)
    }
    i++
  }
  return rows
}

export default function CSVImportModal({ open, onClose, onSaved }) {
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  if (!open) return null

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      setPreview(rows.slice(0, 10))
    }
    reader.readAsText(file)
  }

  const doImport = async () => {
    const file = fileRef.current.files[0]
    if (!file) { toast.error('Select a file first'); return }
    setImporting(true)
    const text = await file.text()
    const rows = parseCSV(text)
    
    const workers = rows.filter(r => r.name || r['name']).map(r => {
      const ht = parseHeight(r.height || r['height (ft/in)'] || '')
      return {
        name: (r.name || '').trim(),
        gender: r.gender === 'Female' ? 'Female' : r.gender === 'Non-Binary / Other' ? 'Non-Binary / Other' : 'Male',
        country: r.country || r.nationality || 'United States',
        bio: r.bio || r.biography || '',
        height_ft: ht.ft,
        height_in: ht.inches,
        weight_lbs: r['weight (lbs)'] ? +r['weight (lbs)'] : r.weight ? +r.weight : 220,
        status: r.status || 'Active',
        disposition: r.disposition || 'Neutral / N/A',
        push: mapPush(r.push || r['push level']),
        popularity: r.popularity ? Math.max(0,Math.min(100,+r.popularity)) : 50,
        star_quality: r['star quality'] ? Math.max(0,Math.min(100,+r['star quality'])) : r.star_quality ? +r.star_quality : 50,
        intimidation: r.intimidation ? Math.max(0,Math.min(100,+r.intimidation)) : 50,
        looks: r.looks ? Math.max(0,Math.min(100,+r.looks)) : 50,
        ethnicity: r.ethnicity || '',
        build: r.build || '',
        company_ids: [],
      }
    }).filter(w => w.name)

    if (!workers.length) { toast.error('No valid workers found'); setImporting(false); return }

    // batch insert 50 at a time
    let created = 0
    for (let i = 0; i < workers.length; i += 50) {
      const batch = workers.slice(i, i + 50)
      const { data, error } = await supabase.from('workers').upsert(batch, { onConflict: 'name', ignoreDuplicates: false }).select()
      if (error) { toast.error(`Batch error: ${error.message}`); continue }
      for (const w of (data || [])) await logChange('worker', w.id, w.name, 'create', null, w)
      created += (data || []).length
    }

    toast.success(`Imported ${created} workers`)
    setImporting(false)
    onSaved()
  }

  const colMap = {
    'name': 'Name', 'gender': 'Gender', 'push': 'Push', 'weight (lbs)': 'Weight',
    'height': 'Height', 'star quality': 'Star', 'intimidation': 'Intimidation',
    'looks': 'Looks', 'bio': 'Bio'
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h2>📥 IMPORT FROM CSV</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: 14, marginBottom: 16, fontSize: 12, color: 'var(--text-2)' }}>
            <strong style={{ color: 'var(--gold)' }}>Supported columns:</strong> Name, Age, Bio, Gender, Height, Intimidation, Looks, Push, Build, Star Quality, Weight (lbs), Country/Nationality, Ethnicity, Status, Disposition
            <br/>Duplicate names will be overwritten.
          </div>

          <div className="image-upload-area" style={{ marginBottom: 16, padding: 24 }} onClick={() => fileRef.current?.click()}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ color: 'var(--text-2)', fontWeight: 600 }}>{fileName || 'Click to select CSV file'}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>Supports .csv files with comma or tab separators</div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
          </div>

          {preview.length > 0 && (
            <div>
              <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Preview (first {preview.length} rows):
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: 11 }}>
                  <thead>
                    <tr>
                      {Object.keys(preview[0]).slice(0,8).map(k => (
                        <th key={k} style={{ background: 'var(--bg-3)', padding: '5px 8px', color: 'var(--text-2)', fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {Object.values(row).slice(0,8).map((v, j) => (
                          <td key={j} style={{ padding: '4px 8px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)' }}>
                            {String(v).slice(0, 60)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={doImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import Workers'}
          </button>
        </div>
      </div>
    </div>
  )
}
