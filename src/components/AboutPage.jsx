import usePageSeo from '../hooks/usePageSeo'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'

function AboutPage({ content }) {
  usePageSeo({
    title: `About | ${content.brand}`,
    description:
      'Learn about Lamgara Properties, our local expertise, and how we help with land and property buying in Uttarakhand.',
  })

  return (
    <div className="lp-page">
      <MarketingHeader brand={content.brand} />
      <main className="lp-main lp-page-main">
        <section className="lp-page-hero">
          <p className="lp-kicker">About Lamgara Properties</p>
          <h2>Local expertise for smart property decisions in Uttarakhand.</h2>
          <p>
            We help buyers identify practical land and housing opportunities with clear location
            context, realistic pricing, and transparent deal guidance.
          </p>
        </section>

        <section className="lp-panel-grid">
          <article className="lp-panel">
            <h3>What We Do</h3>
            <p>
              Curated listings, site visit coordination, and documentation support for land and
              residential deals.
            </p>
          </article>
          <article className="lp-panel">
            <h3>Where We Focus</h3>
            <p>
              Tehri, Chamba, Dhanaulti, Kanatal, and nearby growth corridors with tourism and
              second-home demand.
            </p>
          </article>
          <article className="lp-panel">
            <h3>Why Clients Choose Us</h3>
            <p>
              Reliable market inputs, on-ground checks, and a direct communication model from first
              inquiry to closing.
            </p>
          </article>
        </section>
      </main>
      <MarketingFooter content={content} />
    </div>
  )
}

export default AboutPage
