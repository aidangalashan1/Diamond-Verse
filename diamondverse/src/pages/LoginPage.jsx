import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PASSWORD, AUTH_KEY } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [pw, setPw] = useState('')
  const [shake, setShake] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pw === PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'authenticated')
      navigate('/')
    } else {
      setShake(true)
      toast.error('Invalid password')
      setTimeout(() => setShake(false), 600)
      setPw('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '400px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--gold-dim), transparent)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '380px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '3rem', letterSpacing: '0.1em', lineHeight: 1, textShadow: '0 0 40px rgba(201,168,76,0.5)' }}>
            DIAMOND<br />VERSE
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '8px' }}>
            PWS Database Manager
          </p>
        </div>

        <form onSubmit={handleSubmit}
          style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '32px',
            boxShadow: 'var(--shadow), var(--shadow-gold)',
            animation: shake ? 'shake 0.4s ease' : 'none'
          }}>
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20% { transform: translateX(-8px); }
              40% { transform: translateX(8px); }
              60% { transform: translateX(-6px); }
              80% { transform: translateX(6px); }
            }
          `}</style>
          <label htmlFor="pw">Access Password</label>
          <input
            id="pw" type="password" value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Enter password..."
            style={{ marginTop: '6px', marginBottom: '20px' }}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            ENTER THE VERSE
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px', marginTop: '24px' }}>
          DiamondVerse Manager v1.0 — PWS Modding Suite
        </p>
      </div>
    </div>
  )
}
