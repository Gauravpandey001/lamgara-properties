import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

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
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const inquiryEndpoint = apiBase ? `${apiBase}/api/inquiries` : '/api/inquiries'

function PropertyDetail({ content }) {
  const { id } = useParams()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: 'I am interested in this property and would like to schedule a call/site visit.',
  })
  const [formState, setFormState] = useState({ submitting: false, error: '', success: '' })

  const item = (content.listings || []).find((entry) => entry.id === id)
  const seoTitle = item ? `${item.title} | ${content.brand}` : `Property Not Found | ${content.brand}`
  const seoDescription =
    item?.description ||
    `${item?.location || 'Uttarakhand'} ${item?.category || 'property'} listing with pricing and details.`

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
  })

  useEffect(() => {
    if (!item?.id) return
    setForm((prev) => ({
      ...prev,
      message: 'I am interested in this property and would like to schedule a call/site visit.',
    }))
    setFormState({ submitting: false, error: '', success: '' })
  }, [item?.id])

  if (!item) {
    return (
      <div className="shell">
        <section className="section detail-page">
          <Link className="button outline detail-back" to="/">
            Back
          </Link>
          <div className="detail detail-not-found">
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

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const submitInquiry = async (event) => {
    event.preventDefault()
    setFormState({ submitting: true, error: '', success: '' })

    try {
      const response = await fetch(inquiryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          property: {
            id: item.id,
            title: item.title,
            location: item.location,
            price: item.price,
            url: `${window.location.origin}/property/listing/${item.id}`,
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to submit inquiry')

      setForm({
        name: '',
        phone: '',
        email: '',
        message: 'I am interested in this property and would like to schedule a call/site visit.',
      })
      setFormState({
        submitting: false,
        error: '',
        success: payload?.mailSent
          ? 'Inquiry sent successfully. Our team will contact you shortly.'
          : 'Inquiry saved. Our team will contact you shortly.',
      })
    } catch (error) {
      setFormState({
        submitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit inquiry',
        success: '',
      })
    }
  }

  return (
    <div className="shell">
      <section className="section detail-page">
        <Link className="button outline detail-back" to="/">
          Back to Listings
        </Link>

        <article className="detail detail-hero-card">
          <div
            className="detail-image"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          />

          <div className="detail-body">
            <div className="detail-top-row">
              <span className="badge static">{item.status}</span>
              {item.category ? <span className="chip detail-chip">{item.category}</span> : null}
            </div>
            <h2>{item.title}</h2>
            <p>{item.location}</p>
            {item.description ? <p className="detail-description">{item.description}</p> : null}
            <div className="detail-meta-grid">
              {'size' in item && item.size ? (
                <div className="detail-meta-item">
                  <small>Size</small>
                  <strong>{item.size}</strong>
                </div>
              ) : null}
              <div className="detail-meta-item">
                <small>Price</small>
                <strong>{item.price}</strong>
              </div>
              <div className="detail-meta-item">
                <small>Location</small>
                <strong>{item.location}</strong>
              </div>
            </div>
          </div>
        </article>

        {images.length ? (
          <div className="thumb-grid detail-thumbs">
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
          <article className="card detail-video-card">
            <h3>Property Video</h3>
            <iframe
              className="detail-video"
              src={videoSrc}
              title={`${item.title} video`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </article>
        ) : null}

        <article className="card detail-contact-card">
          <h3>Interested In This Property?</h3>
          <p className="detail-contact-note">
            Your inquiry will include this listing automatically: <strong>{item.title}</strong>
          </p>
          <form className="contact-form" onSubmit={submitInquiry}>
            <input
              type="text"
              placeholder="Your Name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
            <textarea
              rows="4"
              placeholder="Your message"
              value={form.message}
              onChange={(event) => updateField('message', event.target.value)}
              required
            />
            <button type="submit" className="button" disabled={formState.submitting}>
              {formState.submitting ? 'Sending...' : 'Contact About This Property'}
            </button>
          </form>
          {formState.error ? <p className="auth-error">{formState.error}</p> : null}
          {formState.success ? <p>{formState.success}</p> : null}
        </article>
      </section>
    </div>
  )
}

export default PropertyDetail
