import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PublicSite from './components/PublicSite'
import AdminPanel from './components/AdminPanel'
import AdminLogin from './components/AdminLogin'
import PropertyDetail from './components/PropertyDetail'
import AboutPage from './components/AboutPage'
import BlogPage from './components/BlogPage'
import BlogDetail from './components/BlogDetail'
import ContactPage from './components/ContactPage'
import { defaultContent } from './data/defaultContent'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const contentEndpoint = apiBase ? `${apiBase}/api/content` : '/api/content'
const authLoginEndpoint = apiBase ? `${apiBase}/api/auth/login` : '/api/auth/login'
const authMeEndpoint = apiBase ? `${apiBase}/api/auth/me` : '/api/auth/me'
const adminTokenKey = 'lamgara_admin_token'

function App() {
  const [content, setContent] = useState(defaultContent)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('')
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(adminTokenKey) || '')
  const [authReady, setAuthReady] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(contentEndpoint)
        if (!response.ok) throw new Error('Failed to load content')

        const payload = await response.json()
        if (payload?.content) {
          setContent(payload.content)
        }
      } catch {
        setSaveState('Could not load server content. Using defaults.')
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [])

  useEffect(() => {
    const verifyAuth = async () => {
      if (!authToken) {
        setAuthReady(true)
        return
      }

      try {
        const response = await fetch(authMeEndpoint, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!response.ok) throw new Error('Session expired')
      } catch {
        localStorage.removeItem(adminTokenKey)
        setAuthToken('')
      } finally {
        setAuthReady(true)
      }
    }

    verifyAuth()
  }, [authToken])

  const logoutAdmin = () => {
    localStorage.removeItem(adminTokenKey)
    setAuthToken('')
    setSaveState('')
  }

  const loginAdmin = async (username, password) => {
    setAuthLoading(true)
    try {
      const response = await fetch(authLoginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error || 'Login failed')
      }

      localStorage.setItem(adminTokenKey, payload.token)
      setAuthToken(payload.token)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Login failed' }
    } finally {
      setAuthLoading(false)
    }
  }

  const saveContent = async (contentOverride) => {
    if (!authToken) {
      setSaveState('Please login as admin to save changes.')
      return false
    }

    const payloadContent = contentOverride || content
    setSaveState('Saving...')

    try {
      const response = await fetch(contentEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content: payloadContent }),
      })

      if (response.status === 401) {
        setSaveState('Session expired. Please login again.')
        logoutAdmin()
        return false
      }

      if (!response.ok) throw new Error('Save failed')

      setSaveState('Saved successfully.')
      return true
    } catch {
      setSaveState('Save failed. Check backend/API connectivity.')
      return false
    }
  }

  if (loading || !authReady) {
    return <div className="shell" style={{ padding: '2rem 1rem' }}>Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite content={content} />} />
        <Route path="/properties" element={<PublicSite content={content} />} />
        <Route path="/about" element={<AboutPage content={content} />} />
        <Route path="/blog" element={<BlogPage content={content} />} />
        <Route path="/blog/:id" element={<BlogDetail content={content} />} />
        <Route path="/contact" element={<ContactPage content={content} />} />
        <Route path="/property/:type/:id" element={<PropertyDetail content={content} />} />
        <Route
          path="/admin/login"
          element={
            authToken ? (
              <Navigate to="/admin" replace />
            ) : (
              <AdminLogin brand={content.brand} onLogin={loginAdmin} loading={authLoading} />
            )
          }
        />
        <Route
          path="/admin"
          element={
            authToken ? (
              <AdminPanel
                content={content}
                setContent={setContent}
                saveContent={saveContent}
                saveState={saveState}
                authToken={authToken}
                onLogout={logoutAdmin}
              />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
