import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PublicSite from './components/PublicSite'
import AdminPanel from './components/AdminPanel'
import { defaultContent } from './data/defaultContent'

const STORAGE_KEY = 'lamgara-site-content-v1'

function App() {
  const [content, setContent] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : defaultContent
    } catch {
      return defaultContent
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
  }, [content])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite content={content} />} />
        <Route
          path="/admin"
          element={<AdminPanel content={content} setContent={setContent} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
