import usePageSeo from '../hooks/usePageSeo'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'

function ContactPage({ content }) {
  usePageSeo({
    title: `Contact | ${content.brand}`,
    description:
      'Contact Lamgara Properties for property inquiries, site visits, and buying assistance in Uttarakhand.',
  })

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
            <form className="lp-contact-form" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" />
              <input type="tel" placeholder="Phone Number" />
              <input type="email" placeholder="Email Address" />
              <textarea rows="4" placeholder="Requirement (location, budget, size)" />
              <button type="submit" className="button">
                Send Inquiry
              </button>
            </form>
          </article>
        </section>
      </main>
      <MarketingFooter content={content} />
    </div>
  )
}

export default ContactPage
