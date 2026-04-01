import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function SettingsPage() {
  const [referenceDate, setReferenceDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [changelog, setChangelog] = useState([])
  const [logPage, setLogPage] = useState(0)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)
  const [activeTab, setActiveTab] = useState('general')

  const load = useCallback(async () => {
    const [{ data: settings }, { data: log }] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('change_log').select('*').order('created_at', { ascending: false }).limit(100)
    ])
    const ref = (settings || []).find(s => s.key === 'reference_date')
    if (ref) setReferenceDate(ref.value || '')
    setChangelog(log || [])
  }, [])

  useEffect(() => { load() }, [load])

  const saveSettings = async () => {
    setSaving(true)
    await supabase.from('settings').upsert({ key: 'reference_date', value: referenceDate }, { onConflict: 'key' })
    toast.success('Settings saved')
    setSaving(false)
  }

  const exportAll = async () => {
    setExporting(true)
    const tables = ['workers','companies','titles','tag_teams','stables','events','lore','change_log']
    const wb = XLSX.utils.book_new()
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*')
      if (data?.length) {
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, table.replace('_',' ').toUpperCase())
      }
    }
    XLSX.writeFile(wb, `DiamondVerse_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Exported!')
    setExporting(false)
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      setPendingImport({ wb, fileName: file.name })
      setConfirmOverwrite(true)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const doImport = async () => {
    setConfirmOverwrite(false)
    if (!pendingImport) return
    setImporting(true)
    const { wb } = pendingImport
    const tableMap = {
      'WORKERS': 'workers', 'COMPANIES': 'companies', 'TITLES': 'titles',
      'TAG TEAMS': 'tag_teams', 'STABLES': 'stables', 'EVENTS': 'events', 'LORE': 'lore'
    }
    for (const [sheetName, table] of Object.entries(tableMap)) {
      if (!wb.SheetNames.includes(sheetName)) continue
      const ws = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws)
      if (!rows.length) continue
      // Clear table then insert
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        await supabase.from(table).insert(batch)
      }
    }
    toast.success('Import complete!')
    setImporting(false)
    setPendingImport(null)
  }

  const rollback = async (logEntry) => {
    if (!logEntry.previous_data) { toast.error('No previous state to restore'); return }
    const table = logEntry.entity_type + 's'
    const { error } = await supabase.from(table).update(logEntry.previous_data).eq('id', logEntry.entity_id)
    if (error) toast.error(error.message)
    else { toast.success('Rolled back!'); load() }
  }

  const logPaged = changelog.slice(logPage * 20, (logPage + 1) * 20)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="page-header">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.6rem' }}>SETTINGS</h2>
      </div>

      <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <div className="tab-nav" style={{ marginBottom: 0 }}>
          {['general','export','changelog'].map(t => (
            <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {t === 'general' ? '⚙️ General' : t === 'export' ? '📦 Export / Import' : '📋 Change Log'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {activeTab === 'general' && (
          <div style={{ maxWidth: 500 }}>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--gold)' }}>⚙️ General Settings</h3>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Reference Date for Age Calculation</label>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
                  Set a specific date to calculate worker ages against (e.g. the in-game date). Leave blank to use today's date.
                </p>
                <input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div style={{ maxWidth: 600 }}>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8, fontSize: '1rem', color: 'var(--gold)' }}>📤 Export Database</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                Export all data as a multi-sheet Excel file. Each table gets its own sheet.
              </p>
              <button className="btn btn-primary" onClick={exportAll} disabled={exporting}>
                {exporting ? '⏳ Exporting...' : '📥 Export All as .xlsx'}
              </button>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 8, fontSize: '1rem', color: 'var(--gold)' }}>📥 Import Database</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
                Import a previously exported .xlsx file. <strong style={{ color: 'var(--red-bright)' }}>WARNING:</strong> This will overwrite existing data in matching tables.
              </p>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImportFile} disabled={importing} />
                <span className={`btn btn-danger ${importing ? 'btn-secondary' : ''}`} style={{ display: 'inline-flex', gap: 6 }}>
                  {importing ? '⏳ Importing...' : '⚠️ Import .xlsx (Overwrites Data)'}
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'changelog' && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-3)' }}>
              Showing {logPaged.length} of {changelog.length} entries. Click Rollback to restore previous state.
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th><th>Entity</th><th>Name</th><th>Action</th><th>Changed Fields</th><th>Rollback</th>
                  </tr>
                </thead>
                <tbody>
                  {logPaged.map(entry => (
                    <tr key={entry.id}>
                      <td style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{entry.entity_type}</span></td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{entry.entity_name || '—'}</td>
                      <td>
                        <span className={`badge ${entry.action === 'create' ? 'badge-green' : entry.action === 'delete' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: 10 }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(entry.changed_fields || []).join(', ') || '—'}
                      </td>
                      <td>
                        {entry.action === 'update' && entry.previous_data && (
                          <button className="btn btn-secondary btn-xs" onClick={() => rollback(entry)}>↩ Rollback</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {changelog.length > 20 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setLogPage(p => Math.max(0, p - 1))} disabled={logPage === 0}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Page {logPage + 1} of {Math.ceil(changelog.length / 20)}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setLogPage(p => p + 1)} disabled={(logPage + 1) * 20 >= changelog.length}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOverwrite}
        title="⚠️ Overwrite Data?"
        message={`Importing "${pendingImport?.fileName}" will overwrite existing table data. This cannot be undone. Continue?`}
        onConfirm={doImport}
        onCancel={() => { setConfirmOverwrite(false); setPendingImport(null) }}
      />
    </div>
  )
}
