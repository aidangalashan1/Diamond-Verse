import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AUTH_KEY } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import WorkersPage from './pages/WorkersPage'
import CompaniesPage from './pages/CompaniesPage'
import TitlesPage from './pages/TitlesPage'
import { TagTeamsPage, StablesPage } from './pages/TagTeamsStablesPage'
import { EventsPage, LorePage } from './pages/EventsLorePage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }) {
  const auth = localStorage.getItem(AUTH_KEY)
  if (!auth) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1e1e25', border: '1px solid #2a2a38', color: '#f0ece0' },
          success: { iconTheme: { primary: '#c9a84c', secondary: '#0a0a0c' } },
          error: { iconTheme: { primary: '#c94c4c', secondary: '#0a0a0c' } }
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/workers" replace />} />
          <Route path="workers" element={<WorkersPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="titles" element={<TitlesPage />} />
          <Route path="tag-teams" element={<TagTeamsPage />} />
          <Route path="stables" element={<StablesPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="lore" element={<LorePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
