import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const getYoutubeEmbedSrc = (iframeCode = '') => {
  const srcMatch = iframeCode.match(/src=["']([^"']+)["']/i)
  const src = srcMatch?.[1] || ''
  return src.includes('youtube.com/embed/') ? src : ''
}

const getImages = (item) => {
  if (Array.isArray(item.images) && item.images.length > 0) return item.images
  if (item.image) return [item.image]
  return []
}

function PropertyDetail({ content }) {
  const { type, id } = useParams()
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const source = type === 'spotlight' ? content.spotlight : content.listings
  const item = source.find((entry) => entry.id === id)

  if (!item) {
    return (
      <div className="shell">
        <section className="section">
          <Link className="button outline" to="/">
            Back
          </Link>
          <div className="detail" style={{ marginTop: '1rem' }}>
            <h2>Property not found.</h2>
          </div>
        </section>
      </div>
    )
  }

  const videoSrc = getYoutubeEmbedSrc(item.videoIframe)
  const images = getImages(item)
  const safeIndex = Math.min(activeImageIndex, Math.max(images.length - 1, 0))
  const coverImage = images[safeIndex] || ''

  return (
    <div className="shell">
      <section className="section">
        <Link className="button outline" to="/">
          Back to Listings
        </Link>

        <article className="detail" style={{ marginTop: '1rem' }}>
          <div
            className="detail-image"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          />

          <div className="detail-body">
            <span className="badge static">{item.status}</span>
            <h2>{item.title}</h2>
            <p>{item.location}</p>
            {item.description ? <p className="detail-description">{item.description}</p> : null}
            <div className="tags">
              {'size' in item && item.size ? <span>{item.size}</span> : null}
              {'category' in item && item.category ? <span>{item.category}</span> : null}
              <span>{item.price}</span>
            </div>
          </div>
        </article>

        {images.length ? (
          <div className="thumb-grid">
            {images.map((image, index) => (
              <button
                key={`${item.id}-img-${index}`}
                type="button"
                className={`thumb-item ${index === safeIndex ? 'active' : ''}`}
                style={{ backgroundImage: `url(${image})` }}
                onClick={() => setActiveImageIndex(index)}
                aria-label={`Show image ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        {videoSrc ? (
          <article className="card" style={{ marginTop: '1rem', padding: '0.9rem' }}>
            <h3>Property Video</h3>
            <iframe
              width="560"
              height="315"
              src={videoSrc}
              title={`${item.title} video`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{ width: '100%', borderRadius: '10px' }}
            />
          </article>
        ) : null}
      </section>
    </div>
  )
}

export default PropertyDetail
