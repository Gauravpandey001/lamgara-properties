import { useRef } from 'react'
import { Link } from 'react-router-dom'

const getYoutubeEmbedSrc = (iframeCode = '') => {
  const srcMatch = iframeCode.match(/src=["']([^"']+)["']/i)
  const src = srcMatch?.[1] || ''
  return src.includes('youtube.com/embed/') ? src : ''
}

function PublicSite({ content }) {
  const stripRef = useRef(null)

  const scrollStrip = (direction) => {
    if (!stripRef.current) return
    stripRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="utility-bar">
          <p>Call: {content.contact.phone}</p>
          <p>Email: {content.contact.email}</p>
        </div>

        <div className="main-nav-wrap">
          <div className="brand">{content.brand}</div>
          <nav className="main-nav" aria-label="Primary">
            {content.navItems.map((item) => (
              <a key={item} href="#">
                {item}
              </a>
            ))}
          </nav>
          <Link to="/admin" className="outline-btn admin-entry">
            Admin Panel
          </Link>
        </div>
      </header>

      <main>
        <section
          className="hero"
          style={
            content.hero.image
              ? {
                  backgroundImage: `linear-gradient(110deg, rgba(17, 24, 39, 0.72), rgba(17, 24, 39, 0.35)), url(${content.hero.image})`,
                }
              : undefined
          }
        >
          <div className="hero-overlay">
            <p className="hero-kicker">{content.hero.kicker}</p>
            <h1>{content.hero.title}</h1>
            <p>{content.hero.description}</p>
          </div>
        </section>

        <section className="search-box">
          <div className="search-grid">
            <label>
              Keyword
              <input type="text" placeholder="Search keyword" />
            </label>
            <label>
              Property Type
              <select defaultValue="">
                <option value="" disabled>
                  Select type
                </option>
                {content.propertyTypes
                  .filter((type) => type !== 'All')
                  .map((type) => (
                    <option key={type}>{type}</option>
                  ))}
              </select>
            </label>
            <label>
              Price Range
              <select defaultValue="">
                <option value="" disabled>
                  Select price
                </option>
                <option>Below 50L</option>
                <option>50L - 1Cr</option>
                <option>1Cr - 2Cr</option>
                <option>2Cr+</option>
              </select>
            </label>
            <button type="button" className="primary-btn">
              Search
            </button>
          </div>
        </section>

        <section className="type-tabs" aria-label="Property Type Tabs">
          {content.propertyTypes.map((type, index) => (
            <button key={type} type="button" className={index === 0 ? 'active' : ''}>
              {type}
            </button>
          ))}
        </section>

        <section className="slider-section" aria-label="Featured Slider">
          <div className="section-head slider-head">
            <h2>Latest Spotlight</h2>
            <div className="slider-arrows">
              <button type="button" aria-label="Scroll left" onClick={() => scrollStrip(-1)}>
                ‹
              </button>
              <button type="button" aria-label="Scroll right" onClick={() => scrollStrip(1)}>
                ›
              </button>
            </div>
          </div>

          <div className="listing-strip" ref={stripRef}>
            {content.spotlight.map((property, index) => (
              <article key={property.id} className="strip-card">
                <div
                  className={`thumb thumb-${(index % 4) + 1}`}
                  style={
                    property.image
                      ? { backgroundImage: `url(${property.image})` }
                      : undefined
                  }
                >
                  <span className="tag-featured">Featured</span>
                  <span className="tag-status">{property.status}</span>
                </div>
                <div className="listing-body">
                  <h3>{property.title}</h3>
                  <p>{property.location}</p>
                  <div className="card-footer">
                    <strong>{property.price}</strong>
                    <button type="button">Details</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="listings">
          <div className="section-head">
            <h2>Featured Properties</h2>
            <p>
              Search land for sale in your area by price, view, and property type.
            </p>
          </div>

          <div className="cards-grid">
            {content.listings.map((property, index) => (
              <article key={property.id} className="listing-card">
                <div
                  className={`thumb thumb-${(index % 4) + 1}`}
                  style={
                    property.image
                      ? { backgroundImage: `url(${property.image})` }
                      : undefined
                  }
                >
                  {property.featured && <span className="tag-featured">Featured</span>}
                  <span className="tag-status">{property.status}</span>
                </div>
                <div className="listing-body">
                  <h3>{property.title}</h3>
                  <p>{property.location}</p>
                  <div className="meta-row">
                    <span>{property.size}</span>
                    <span>{property.category}</span>
                  </div>
                  <div className="card-footer">
                    <strong>{property.price}</strong>
                    <button type="button">Details</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="listings">
          <div className="section-head">
            <h2>Property Videos</h2>
          </div>
          <div className="cards-grid">
            {(content.videos || []).map((video) => {
              const src = getYoutubeEmbedSrc(video.iframe)
              if (!src) return null
              return (
                <article key={video.id} className="listing-card" style={{ padding: '0.9rem' }}>
                  <h3 style={{ marginTop: 0 }}>{video.title}</h3>
                  <iframe
                    width="560"
                    height="315"
                    src={src}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    style={{ width: '100%', borderRadius: '10px' }}
                  />
                </article>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-about">
            <h3>{content.brand}</h3>
            <p>
              We help buyers and investors find quality land and plots across Tehri,
              Chamba, and nearby hill stations.
            </p>
            <ul>
              <li>{content.contact.phone}</li>
              <li>{content.contact.email}</li>
              <li>{content.contact.address}</li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Request A Callback</h4>
            <div className="footer-form">
              <input type="text" placeholder="Your name" />
              <input type="tel" placeholder="Phone number" />
              <button type="button">Submit</button>
            </div>
          </div>
        </div>
        <p className="copyright">© 2026 {content.brand}. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default PublicSite
