import { useState } from 'react'
import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

function AdminLogin({ brand, onLogin, loading }) {
  usePageSeo({
    title: `Admin Login | ${brand}`,
    description: `Secure admin login for ${brand}.`,
    robots: 'noindex,nofollow',
  })

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submitLogin = async (event) => {
    event.preventDefault()
    setError('')

    const result = await onLogin(username.trim(), password)
    if (!result.ok) {
      setError(result.message || 'Login failed')
    }
  }

  return (
    <div className="auth-wrap">
      <article className="auth-card">
        <h1>{brand} Admin</h1>
        <p>Login to manage listings, spotlight, and blog content.</p>
        <form className="auth-form" onSubmit={submitLogin}>
          <input
            type="text"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        {error ? <p className="auth-error">{error}</p> : null}
        <Link to="/" className="button outline">
          Back to Website
        </Link>
      </article>
    </div>
  )
}

export default AdminLogin
