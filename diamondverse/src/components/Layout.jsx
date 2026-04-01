import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { AUTH_KEY } from '../lib/supabase'

const NAV = [
  { to: '/workers', icon: '👤', label: 'Workers' },
  { to: '/companies', icon: '🏢', label: 'Companies' },
  { to: '/titles', icon: '🏆', label: 'Titles' },
  { to: '/tag-teams', icon: '🤝', label: 'Tag Teams' },
  { to: '/stables', icon: '🎭', label: 'Stables' },
  { to: '/events', icon: '🎪', label: 'Events' },
  { to: '/lore', icon: '📜', label: 'Lore' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Layout() {
  const navigate = useNavigate()
  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1 className="text-gold">DIAMOND<br/>VERSE</h1>
          <p style={{color:'var(--text-dim)',fontSize:'9px',letterSpacing:'0.2em',marginTop:4}}>PWS DATABASE MANAGER</p>
        </div>
        <nav className="nav-section">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{marginTop:'auto',padding:'16px',borderTop:'1px solid var(--border)'}}>
          <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
