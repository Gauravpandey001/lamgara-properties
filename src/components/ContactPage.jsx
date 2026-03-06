import { useState } from 'react'
import usePageSeo from '../hooks/usePageSeo'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const inquiryEndpoint = apiBase ? `${apiBase}/api/inquiries` : '/api/inquiries'

function ContactPage({ content }) {
  usePageSeo({
    title: `Contact | ${content.brand}`,
    description:
      'Contact Lamgara Properties for property inquiries, site visits, and buying assistance in Uttarakhand.',
  })
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  })
  const [formState, setFormState] = useState({ submitting: false, error: '', success: '' })

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
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to submit inquiry')

      setForm({ name: '', phone: '', email: '', message: '' })
      setFormState({ submitting: false, error: '', success: 'Inquiry submitted. Our team will contact you shortly.' })
    } catch (error) {
      setFormState({
        submitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit inquiry',
        success: '',
      })
    }
  }

  return (
    <div className="lp-page">
      <MarketingHeader brand={content.brand} />
      <main className="lp-main lp-page-main">
        <section className="lp-page-hero">
          <p className="lp-kicker">Contact</p>
          <h2>Talk to our team for site visits, pricing, and availability.</h2>
          <p>Share your requirement and we will get back with matching options.</p>
        </section>

        <section className="lp-contact-grid">
          <article className="lp-panel">
            <h3>Direct Contact</h3>
            <p>
              Phone: <a href={`tel:${content.contact.phone}`}>{content.contact.phone}</a>
            </p>
            <p>
              Email: <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
            </p>
            <p>Address: {content.contact.address}</p>
          </article>

          <article className="lp-panel">
            <h3>Inquiry</h3>
            <form className="lp-contact-form" onSubmit={submitInquiry}>
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
                placeholder="Requirement (location, budget, size)"
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                required
              />
              <button type="submit" className="button" disabled={formState.submitting}>
                {formState.submitting ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
            {formState.error ? <p className="auth-error">{formState.error}</p> : null}
            {formState.success ? <p>{formState.success}</p> : null}
          </article>
        </section>
      </main>
      <MarketingFooter content={content} />
    </div>
  )
}

export default ContactPage
