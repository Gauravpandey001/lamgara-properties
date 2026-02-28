import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

const getPrimaryImage = (property) => property.images?.[0] || property.image || ''
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const geocodeEndpoint = apiBase ? `${apiBase}/api/geocode` : '/api/geocode'

const toNumberOrNull = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toSafeText = (value) => (typeof value === 'string' ? value : String(value ?? ''))

const getCoordinates = (property) => {
  const lat = toNumberOrNull(property.latitude ?? property.lat)
  const lon = toNumberOrNull(property.longitude ?? property.lng ?? property.lon)
  return lat !== null && lon !== null ? { lat, lon } : null
}

const haversineKm = (aLat, aLon, bLat, bLon) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

function PublicSite({ content }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [localityInput, setLocalityInput] = useState('')
  const [localityFilter, setLocalityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [searchState, setSearchState] = useState({ loading: false, error: '', result: null })
  const topListings = useMemo(() => (content.listings || []).slice(0, 6), [content.listings])
  const topSpotlight = useMemo(() => (content.spotlight || []).slice(0, 4), [content.spotlight])
  const categories = useMemo(
    () => (content.propertyTypes || []).filter((type) => type !== 'All').slice(0, 4),
    [content.propertyTypes],
  )
  const filterOptions = useMemo(() => {
    const listingCategories = (content.listings || [])
      .map((item) => item.category)
      .filter(Boolean)
    const fromTypes = (content.propertyTypes || []).filter((item) => item && item !== 'All')
    return ['All', ...Array.from(new Set([...fromTypes, ...listingCategories]))]
  }, [content.listings, content.propertyTypes])
  const filteredListings = useMemo(() => {
    const categoryMatched = topListings.filter((property) =>
      categoryFilter === 'All' ? true : toSafeText(property.category) === categoryFilter,
    )

    if (!localityFilter) return categoryMatched

    const query = localityFilter.toLowerCase()
    const exact = []
    const others = []

    categoryMatched.forEach((property) => {
      const matches = toSafeText(property.location).toLowerCase().includes(query)
      if (matches) {
        exact.push({ ...property, distanceKm: 0, exactLocalityMatch: true })
        return
      }

      const coords = searchState.result ? getCoordinates(property) : null
      if (coords && searchState.result) {
        others.push({
          ...property,
          distanceKm: haversineKm(searchState.result.lat, searchState.result.lon, coords.lat, coords.lon),
          exactLocalityMatch: false,
        })
      } else {
        others.push({ ...property, distanceKm: null, exactLocalityMatch: false })
      }
    })

    others.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0
      if (a.distanceKm === null) return 1
      if (b.distanceKm === null) return -1
      return a.distanceKm - b.distanceKm
    })

    return [...exact, ...others]
  }, [topListings, localityFilter, categoryFilter, searchState.result])

  const applyLocationSearch = async () => {
    const query = localityInput.trim()
    setLocalityFilter(query)
    setSearchState({ loading: false, error: '', result: null })
    if (!query) return

    try {
      setSearchState({ loading: true, error: '', result: null })
      const response = await fetch(`${geocodeEndpoint}?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Could not resolve location')
      const payload = await response.json()
      if (payload?.found && Number.isFinite(payload.lat) && Number.isFinite(payload.lon)) {
        setSearchState({
          loading: false,
          error: '',
          result: { lat: payload.lat, lon: payload.lon, displayName: payload.displayName || query },
        })
        return
      }

      setSearchState({ loading: false, error: 'Location not found. Showing exact locality matches only.', result: null })
    } catch {
      setSearchState({ loading: false, error: 'Distance lookup unavailable right now.', result: null })
    }
  }

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
            <div className="lp-filter-bar">
              <input
                type="text"
                placeholder="Search locality (e.g. Tehri, Chamba)"
                value={localityInput}
                onChange={(event) => setLocalityInput(event.target.value)}
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                {filterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button lp-search-btn"
                onClick={applyLocationSearch}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className="lp-search-icon"
                >
                  <path
                    fill="currentColor"
                    d="M10.5 3a7.5 7.5 0 1 1 4.67 13.37l4.23 4.24a1 1 0 0 1-1.41 1.41l-4.24-4.23A7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
                  />
                </svg>
                {searchState.loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchState.error ? <p className="lp-search-note">{searchState.error}</p> : null}
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
                  <p>
                    {property.location}
                    {localityFilter && property.distanceKm !== null ? (
                      <span className="lp-distance-pill">
                        {property.exactLocalityMatch
                          ? 'Exact locality match'
                          : Number.isFinite(property.distanceKm)
                            ? `${property.distanceKm.toFixed(1)} km from ${localityFilter}`
                            : `Distance from ${localityFilter} unavailable`}
                      </span>
                    ) : null}
                  </p>
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
            {filteredListings.map((property, index) => (
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
          {!filteredListings.length ? (
            <p className="lp-empty-state">
              No properties found for current locality/category filters.
            </p>
          ) : null}
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
