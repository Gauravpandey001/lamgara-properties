import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PublicSite from './components/PublicSite'
import AdminPanel from './components/AdminPanel'
import PropertyDetail from './components/PropertyDetail'
import AboutPage from './components/AboutPage'
import BlogPage from './components/BlogPage'
import BlogDetail from './components/BlogDetail'
import ContactPage from './components/ContactPage'
import { defaultContent } from './data/defaultContent'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const contentEndpoint = apiBase ? `${apiBase}/api/content` : '/api/content'

function App() {
  const [content, setContent] = useState(defaultContent)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('')

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

  const saveContent = async (contentOverride) => {
    const payloadContent = contentOverride || content
    setSaveState('Saving...')

    try {
      const response = await fetch(contentEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payloadContent }),
      })

      if (!response.ok) throw new Error('Save failed')

      setSaveState('Saved successfully.')
      return true
    } catch {
      setSaveState('Save failed. Check backend/API connectivity.')
      return false
    }
  }

  if (loading) {
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
          path="/admin"
          element={
            <AdminPanel
              content={content}
              setContent={setContent}
              saveContent={saveContent}
              saveState={saveState}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
