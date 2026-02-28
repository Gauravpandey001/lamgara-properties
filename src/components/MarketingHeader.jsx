import { useState } from 'react'
import { Link } from 'react-router-dom'

function MarketingHeader({ brand }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="lp-nav-wrap">
      <div className="lp-shell lp-nav">
        <Link to="/" className="lp-brand">
          {brand}
        </Link>

        <button
          type="button"
          className="lp-nav-toggle"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>

        <nav className={`lp-nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/properties" onClick={() => setMenuOpen(false)}>
            Properties
          </Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>
            About
          </Link>
          <Link to="/blog" onClick={() => setMenuOpen(false)}>
            Blog
          </Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default MarketingHeader
