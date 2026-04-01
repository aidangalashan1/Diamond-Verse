import React, { useState, useRef, useEffect } from 'react'

export default function SearchableSelect({
  options = [], value, onChange, placeholder = 'Search...',
  multi = false, label, tabIndex
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef()
  const inputRef = useRef()

  const filtered = options.filter(o =>
    (typeof o === 'string' ? o : o.label).toLowerCase().includes(search.toLowerCase())
  )

  const getLabel = (v) => {
    const opt = options.find(o => (typeof o === 'string' ? o : o.value) === v)
    return opt ? (typeof opt === 'string' ? opt : opt.label) : v
  }

  const toggle = (val) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : []
      const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
      onChange(next)
    } else {
      onChange(val)
      setOpen(false)
      setSearch('')
    }
  }

  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedArr = multi ? (Array.isArray(value) ? value : []) : []

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && <label>{label}</label>}
      <div
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '6px 10px',
          cursor: 'pointer', minHeight: '34px', display: 'flex',
          flexWrap: 'wrap', gap: '4px', alignItems: 'center',
          transition: 'border-color 0.15s'
        }}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
      >
        {multi
          ? selectedArr.length > 0
            ? selectedArr.map(v => (
              <span key={v} style={{
                background: 'rgba(201,168,76,0.2)', border: '1px solid var(--gold-dim)',
                borderRadius: 3, padding: '1px 6px', fontSize: 11,
                color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4
              }}>
                {getLabel(v)}
                <span style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1 }}
                  onClick={e => { e.stopPropagation(); toggle(v) }}>×</span>
              </span>
            ))
            : <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{placeholder}</span>
          : <span style={{ fontSize: 13, color: value ? 'var(--text-1)' : 'var(--text-dim)' }}>
              {value ? getLabel(value) : placeholder}
            </span>
        }
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 12 }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500,
          background: 'var(--bg-2)', border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius)', marginTop: 2,
          boxShadow: 'var(--shadow)', maxHeight: 220, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
            <input
              ref={inputRef}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Type to search..."
              style={{ padding: '4px 8px', fontSize: 12 }}
              tabIndex={tabIndex}
              onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center' }}>No results</div>
              : filtered.map(o => {
                  const val = typeof o === 'string' ? o : o.value
                  const lbl = typeof o === 'string' ? o : o.label
                  const selected = multi ? selectedArr.includes(val) : value === val
                  return (
                    <div key={val} onClick={() => toggle(val)} style={{
                      padding: '7px 12px', cursor: 'pointer', fontSize: 13,
                      background: selected ? 'rgba(201,168,76,0.1)' : 'transparent',
                      color: selected ? 'var(--gold)' : 'var(--text-1)',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-3)' }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                    >
                      {multi && <span style={{ marginRight: 6 }}>{selected ? '☑' : '☐'}</span>}
                      {lbl}
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}
    </div>
  )
}
