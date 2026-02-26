import SiteHeader from './SiteHeader'

function ContactPage({ content }) {
  return (
    <div className="shell">
      <SiteHeader content={content} />
      <main className="page-main">
        <section className="page-hero">
          <p className="kicker">Contact</p>
          <h2>Talk to our team for site visits, pricing, and availability.</h2>
          <p>Share your requirement and we will get back with matching options.</p>
        </section>

        <section className="contact-grid">
          <article className="info-card">
            <h3>Direct Contact</h3>
            <p>
              Phone: <a href={`tel:${content.contact.phone}`}>{content.contact.phone}</a>
            </p>
            <p>
              Email: <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
            </p>
            <p>Address: {content.contact.address}</p>
          </article>

          <article className="info-card">
            <h3>Inquiry</h3>
            <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
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
    </div>
  )
}

export default ContactPage
