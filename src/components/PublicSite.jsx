import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

const getPrimaryImage = (property) => property.images?.[0] || property.image || ''

function PublicSite({ content }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const topListings = useMemo(() => (content.listings || []).slice(0, 6), [content.listings])
  const topSpotlight = useMemo(() => (content.spotlight || []).slice(0, 4), [content.spotlight])
  const categories = useMemo(
    () => (content.propertyTypes || []).filter((type) => type !== 'All').slice(0, 4),
    [content.propertyTypes],
  )

  const stats = [
    { label: 'Properties Listed', value: `${content.listings?.length || 0}+` },
    { label: 'Spotlight Picks', value: `${content.spotlight?.length || 0}+` },
    { label: 'Blog Articles', value: `${content.blogs?.length || 0}+` },
    { label: 'Service Areas', value: '15+' },
  ]

  usePageSeo({
    title: `${content.brand} | Buy Properties & Land In Uttarakhand`,
    description: content.hero.description,
  })

  return (
    <div className="lp-page">
      <header className="lp-nav-wrap">
        <div className="lp-shell lp-nav">
          <Link to="/" className="lp-brand">
            {content.brand}
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
            <a href="#buy" onClick={() => setMenuOpen(false)}>
              Buy
            </a>
            <a href="#spotlight" onClick={() => setMenuOpen(false)}>
              Spotlight
            </a>
            <a href="#properties" onClick={() => setMenuOpen(false)}>
              Properties
            </a>
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

      <main className="lp-main">
        <section
          id="buy"
          className="lp-hero"
          style={
            content.hero.image
              ? {
                  backgroundImage: `linear-gradient(120deg, rgba(18, 23, 33, 0.78), rgba(18, 23, 33, 0.2)), url(${content.hero.image})`,
                }
              : undefined
          }
        >
          <div className="lp-shell">
            <p className="lp-kicker">{content.hero.kicker}</p>
            <h1>{content.hero.title}</h1>
            <p>{content.hero.description}</p>
            <div className="lp-hero-actions">
              <a href="#properties" className="button">
                Browse Properties
              </a>
              <Link to="/contact" className="button outline">
                Contact Team
              </Link>
            </div>
          </div>
        </section>

        <section className="lp-shell lp-stats-wrap">
          <div className="lp-stats-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="lp-stat-item">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="spotlight" className="lp-shell lp-section">
          <div className="lp-section-head">
            <h2>Latest Spotlight</h2>
          </div>
          <div className="lp-strip">
            {topSpotlight.map((property, index) => (
              <Link key={property.id} to={`/property/spotlight/${property.id}`} className="lp-card lp-strip-card">
                <div
                  className={`lp-card-image tone-${(index % 4) + 1}`}
                  style={
                    getPrimaryImage(property)
                      ? { backgroundImage: `url(${getPrimaryImage(property)})` }
                      : undefined
                  }
                >
                  <span className="badge">{property.status}</span>
                </div>
                <div className="lp-card-body">
                  <h4>{property.title}</h4>
                  <p>{property.location}</p>
                  {property.description ? <p className="card-desc">{property.description}</p> : null}
                  <div className="card-row">
                    <strong>{property.price}</strong>
                    <span className="chip">View</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="properties" className="lp-shell lp-section">
          <div className="lp-section-head">
            <h2>Featured Properties</h2>
            <p>Curated opportunities selected for residential and investment value.</p>
          </div>

          <div className="lp-grid">
            {topListings.map((property, index) => (
              <Link key={property.id} to={`/property/listing/${property.id}`} className="lp-card">
                <div
                  className={`lp-card-image tone-${(index % 4) + 1}`}
                  style={
                    getPrimaryImage(property)
                      ? { backgroundImage: `url(${getPrimaryImage(property)})` }
                      : undefined
                  }
                >
                  <span className="badge">{property.status}</span>
                  {property.videoIframe ? <span className="video-pill">Video</span> : null}
                </div>
                <div className="lp-card-body">
                  <h4>{property.title}</h4>
                  <p>{property.location}</p>
                  {property.description ? <p className="card-desc">{property.description}</p> : null}
                  <div className="tags">
                    <span>{property.size}</span>
                    <span>{property.category}</span>
                  </div>
                  <div className="card-row">
                    <strong>{property.price}</strong>
                    <span className="chip">Details</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="lp-categories">
          <div className="lp-shell">
            <div className="lp-section-head">
              <h2>Property Categories</h2>
            </div>
            <div className="lp-cat-grid">
              {categories.map((category) => (
                <article key={category} className="lp-cat-item">
                  <h4>{category}</h4>
                  <p>Premium listings available</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-shell">
            <h2>Ready to find the right property in Uttarakhand?</h2>
            <p>Talk to our team for site visits, pricing and documentation support.</p>
            <Link to="/contact" className="button">
              Contact an Advisor
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-shell lp-footer-grid">
          <div>
            <h3>{content.brand}</h3>
            <p>Your trusted partner for verified property opportunities in Uttarakhand.</p>
          </div>
          <div>
            <h4>Contact</h4>
            <p>{content.contact.phone}</p>
            <p>{content.contact.email}</p>
            <p>{content.contact.address}</p>
          </div>
          <div>
            <h4>Explore</h4>
            <p>
              <Link to="/about">About</Link>
            </p>
            <p>
              <Link to="/blog">Blog</Link>
            </p>
            <p>
              <Link to="/contact">Contact</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicSite
