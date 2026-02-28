import { useRef } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import usePageSeo from '../hooks/usePageSeo'

const getPrimaryImage = (property) =>
  property.images?.[0] || property.image || ''

function PublicSite({ content }) {
  const stripRef = useRef(null)
  usePageSeo({
    title: `${content.brand} | Buy Properties & Land In Uttarakhand`,
    description: content.hero.description,
  })

  const scrollStrip = (direction) => {
    if (!stripRef.current) return
    stripRef.current.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  return (
    <div className="shell">
      <SiteHeader content={content} />

      <main>
        <section
          className="hero"
          style={
            content.hero.image
              ? {
                  backgroundImage: `linear-gradient(120deg, rgba(18, 23, 33, 0.78), rgba(18, 23, 33, 0.2)), url(${content.hero.image})`,
                }
              : undefined
          }
        >
          <p className="kicker">{content.hero.kicker}</p>
          <h2>{content.hero.title}</h2>
          <p>{content.hero.description}</p>
        </section>

        <section className="section">
          <div className="section-head">
            <h3>Latest Spotlight</h3>
            <div className="arrows">
              <button type="button" onClick={() => scrollStrip(-1)}>
                ‹
              </button>
              <button type="button" onClick={() => scrollStrip(1)}>
                ›
              </button>
            </div>
          </div>

          <div className="strip" ref={stripRef}>
            {content.spotlight.map((property, index) => (
              <Link
                key={property.id}
                to={`/property/spotlight/${property.id}`}
                className="card strip-card"
              >
                <div
                  className={`card-image tone-${(index % 4) + 1}`}
                  style={
                    getPrimaryImage(property)
                      ? { backgroundImage: `url(${getPrimaryImage(property)})` }
                      : undefined
                  }
                >
                  <span className="badge">{property.status}</span>
                </div>
                <div className="card-body">
                  <h4>{property.title}</h4>
                  <p>{property.location}</p>
                  {property.description ? (
                    <p className="card-desc">{property.description}</p>
                  ) : null}
                  <div className="card-row">
                    <strong>{property.price}</strong>
                    <span className="chip">Open</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h3>Featured Properties</h3>
          </div>

          <div className="grid">
            {content.listings.map((property, index) => (
              <Link key={property.id} to={`/property/listing/${property.id}`} className="card">
                <div
                  className={`card-image tone-${(index % 4) + 1}`}
                  style={
                    getPrimaryImage(property)
                      ? { backgroundImage: `url(${getPrimaryImage(property)})` }
                      : undefined
                  }
                >
                  <span className="badge">{property.status}</span>
                  {property.videoIframe ? <span className="video-pill">Video</span> : null}
                </div>
                <div className="card-body">
                  <h4>{property.title}</h4>
                  <p>{property.location}</p>
                  {property.description ? (
                    <p className="card-desc">{property.description}</p>
                  ) : null}
                  <div className="tags">
                    <span>{property.size}</span>
                    <span>{property.category}</span>
                  </div>
                  <div className="card-row">
                    <strong>{property.price}</strong>
                    <span className="chip">Open</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default PublicSite
