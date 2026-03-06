import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

const getPrimaryImage = (property) => property.images?.[0] || property.image || ''
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const propertySearchEndpoint = apiBase ? `${apiBase}/api/search/properties` : '/api/search/properties'

const toSafeText = (value) => (typeof value === 'string' ? value : String(value ?? ''))
const sortModes = ['nearest', 'farthest']
const sortModeLabel = {
  nearest: 'Nearest',
  farthest: 'Farthest',
}

function PublicSite({ content }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [localityInput, setLocalityInput] = useState('')
  const [localityFilter, setLocalityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('nearest')
  const [searchState, setSearchState] = useState({ loading: false, error: '', result: null })
  const spotlightListings = useMemo(
    () => (content.listings || []).filter((item) => Boolean(item.spotlight)),
    [content.listings],
  )
  const topSpotlight = useMemo(() => spotlightListings.slice(0, 4), [spotlightListings])
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

  const categoryMatchedListings = useMemo(
    () =>
      (content.listings || []).filter((property) =>
        categoryFilter === 'All' ? true : toSafeText(property.category) === categoryFilter,
      ),
    [content.listings, categoryFilter],
  )

  const displayedListings = useMemo(() => {
    if (!localityFilter) return categoryMatchedListings
    const fromSearch = searchState.result?.results
    if (Array.isArray(fromSearch)) return fromSearch
    return []
  }, [localityFilter, categoryMatchedListings, searchState.result])
  const hasActiveSearch = Boolean(localityFilter)

  const nearestProperty = searchState.result?.nearestProperty || null

  const runLocationSearch = useCallback(async (query, category) => {
    const trimmed = query.trim()
    setLocalityFilter(trimmed)
    setSearchState({ loading: false, error: '', result: null })
    if (!trimmed) return

    try {
      setSearchState({ loading: true, error: '', result: null })
      const url = new URL(propertySearchEndpoint, window.location.origin)
      url.searchParams.set('q', trimmed)
      url.searchParams.set('category', category)
      const response = await fetch(url.toString())
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not search by location')
      }

      setSearchState({ loading: false, error: '', result: payload })
    } catch (error) {
      setSearchState({
        loading: false,
        error: error instanceof Error ? error.message : 'Location search unavailable right now.',
        result: null,
      })
    }
  }, [])

  const applyLocationSearch = async () => {
    setSortBy('nearest')
    await runLocationSearch(localityInput, categoryFilter)
  }

  useEffect(() => {
    if (!localityFilter) return
    runLocationSearch(localityFilter, categoryFilter)
  }, [categoryFilter, localityFilter, runLocationSearch])

  const featuredListings = useMemo(
    () =>
      displayedListings.filter((property) =>
        categoryFilter === 'All' ? true : toSafeText(property.category) === categoryFilter,
      ),
    [displayedListings, categoryFilter],
  )

  const topFeaturedListings = useMemo(() => featuredListings.slice(0, 12), [featuredListings])
  const sortedSearchResults = useMemo(() => {
    const list = [...featuredListings]
    list.sort((a, b) => {
      const aDistance = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY
      const bDistance = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY

      if (sortBy === 'nearest') {
        if (a.exactLocalityMatch && !b.exactLocalityMatch) return -1
        if (!a.exactLocalityMatch && b.exactLocalityMatch) return 1
        if (aDistance !== bDistance) return aDistance - bDistance
        return toSafeText(a.title).localeCompare(toSafeText(b.title))
      }
      if (a.exactLocalityMatch && !b.exactLocalityMatch) return -1
      if (!a.exactLocalityMatch && b.exactLocalityMatch) return 1
      if (aDistance !== bDistance) return bDistance - aDistance
      return toSafeText(a.title).localeCompare(toSafeText(b.title))
    })
    return list
  }, [featuredListings, sortBy])
  const toggleSortMode = () =>
    setSortBy((prev) => sortModes[(sortModes.indexOf(prev) + 1) % sortModes.length])
  const clearSearchView = () => {
    setLocalityFilter('')
    setLocalityInput('')
    setSearchState({ loading: false, error: '', result: null })
    setSortBy('nearest')
  }

  const stats = [
    { label: 'Properties Listed', value: `${content.listings?.length || 0}+` },
    { label: 'Spotlight Picks', value: `${spotlightListings.length || 0}+` },
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
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className={`lp-burger-icon ${menuOpen ? 'open' : ''}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
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
        {hasActiveSearch ? (
          <section className="lp-page-main lp-search-page">
            <div className="lp-search-topbar">
              <button type="button" className="button outline" onClick={clearSearchView}>
                Back
              </button>
              <Link to="/" className="lp-search-brand" onClick={clearSearchView}>
                {content.brand}
              </Link>
            </div>

            <div className="lp-search-surface">
              <div className="lp-search-controls">
                <input
                  type="text"
                  placeholder="Search locality (e.g. Tehri, Chamba)"
                  value={localityInput}
                  onChange={(event) => setLocalityInput(event.target.value)}
                />
                <button type="button" className="button lp-search-btn" onClick={applyLocationSearch}>
                  {searchState.loading ? 'Searching...' : 'Search'}
                </button>
                <button type="button" className="button outline lp-sort-btn" onClick={toggleSortMode}>
                  Sort By: {sortModeLabel[sortBy]}
                </button>
              </div>

              <div className="lp-search-meta">
                {searchState.loading ? (
                  <p className="lp-search-note">Finding closest properties...</p>
                ) : (
                  <p className="lp-search-note">
                    Results for <strong>{localityFilter}</strong>
                    {searchState.result?.resolvedLocation?.displayName
                      ? ` (${searchState.result.resolvedLocation.displayName})`
                      : ''}
                  </p>
                )}
                {nearestProperty && !searchState.loading ? (
                  <p className="lp-search-note">
                    Nearest property: {nearestProperty.title}
                    {Number.isFinite(nearestProperty.distanceKm)
                      ? ` (${nearestProperty.distanceKm.toFixed(1)} km)`
                      : ''}
                  </p>
                ) : null}
              </div>
            </div>

            {searchState.error ? <p className="lp-search-note">{searchState.error}</p> : null}
            {searchState.loading ? (
              <div className="lp-grid lp-loading-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <article key={`skeleton-${index}`} className="lp-card lp-skeleton-card">
                    <div className="lp-skeleton-block lp-skeleton-image" />
                    <div className="lp-card-body">
                      <div className="lp-skeleton-block lp-skeleton-line" />
                      <div className="lp-skeleton-block lp-skeleton-line short" />
                      <div className="lp-skeleton-block lp-skeleton-line" />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="lp-grid">
                {sortedSearchResults.map((property, index) => (
                  <Link
                    key={property.id}
                    to={`/property/listing/${property.id}`}
                    className="lp-card lp-result-card"
                    style={{ '--stagger': index }}
                  >
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
                      <p>
                        {property.location}
                        {Number.isFinite(property.distanceKm) ? (
                          <span className="lp-distance-pill">
                            {property.distanceKm.toFixed(1)} km from {localityFilter}
                          </span>
                        ) : null}
                        {property.exactLocalityMatch ? (
                          <span className="lp-distance-pill">Exact locality match</span>
                        ) : null}
                      </p>
                      {property.description ? <p className="card-desc">{property.description}</p> : null}
                      <div className="tags">
                        <span>{property.size}</span>
                        <span>{property.category}</span>
                      </div>
                      <div className="card-row">
                        <strong>{property.price}</strong>
                        <span className="chip">
                          {nearestProperty && nearestProperty.id === property.id ? 'Nearest' : 'Details'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!sortedSearchResults.length ? (
              <p className="lp-empty-state">No properties found for this searched location.</p>
            ) : null}
          </section>
        ) : (
          <>
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
            {localityFilter && !searchState.loading && nearestProperty ? (
              <p className="lp-search-note">
                Nearest property near {localityFilter}: {nearestProperty.title}
                {Number.isFinite(nearestProperty.distanceKm)
                  ? ` (${nearestProperty.distanceKm.toFixed(1)} km)`
                  : ''}
              </p>
            ) : null}
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
              <Link key={property.id} to={`/property/listing/${property.id}`} className="lp-card lp-strip-card">
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
            {topFeaturedListings.map((property, index) => (
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
                  <p>
                    {property.location}
                    {localityFilter && Number.isFinite(property.distanceKm) ? (
                      <span className="lp-distance-pill">
                        {property.distanceKm.toFixed(1)} km from {localityFilter}
                      </span>
                    ) : null}
                    {localityFilter && property.exactLocalityMatch ? (
                      <span className="lp-distance-pill">Exact locality match</span>
                    ) : null}
                  </p>
                  {property.description ? <p className="card-desc">{property.description}</p> : null}
                  <div className="tags">
                    <span>{property.size}</span>
                    <span>{property.category}</span>
                  </div>
                  <div className="card-row">
                    <strong>{property.price}</strong>
                    <span className="chip">
                      {nearestProperty && nearestProperty.id === property.id ? 'Nearest' : 'Details'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {!topFeaturedListings.length ? (
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
          </>
        )}
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
