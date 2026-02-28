import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'

const toBlogSnippet = (text = '') => (text.length > 160 ? `${text.slice(0, 157).trim()}...` : text)
const getPrimaryImage = (blog) => blog.images?.[0] || blog.image || ''

function BlogPage({ content }) {
  usePageSeo({
    title: `Blog | ${content.brand}`,
    description:
      'Read property market updates, buying guides, and local insights for land and homes in Uttarakhand.',
  })
  const blogs = (content.blogs || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="lp-page">
      <MarketingHeader brand={content.brand} />
      <main className="lp-main lp-page-main">
        <section className="lp-page-hero">
          <p className="lp-kicker">Blog</p>
          <h2>Insights on local property trends and buying decisions.</h2>
          <p>
            Practical reads on pricing patterns, location picks, and what to verify before
            purchasing land in Uttarakhand.
          </p>
        </section>

        <section className="lp-grid">
          {blogs.length ? (
            blogs.map((post) => (
              <article key={post.id} className="lp-card">
                {getPrimaryImage(post) ? (
                  <div
                    className="lp-card-image"
                    style={{ backgroundImage: `url(${getPrimaryImage(post)})` }}
                  />
                ) : null}
                <div className="lp-card-body">
                  <span className="chip">{post.category || 'Update'}</span>
                  <h3>{post.title}</h3>
                  <p>{toBlogSnippet(post.excerpt || post.content || '')}</p>
                  <div className="card-row">
                    <small>{post.date || 'N/A'}</small>
                    <Link className="button outline" to={`/blog/${post.id}`}>
                      Read
                    </Link>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="lp-panel">
              <h3>No blogs yet</h3>
              <p>Create blog posts from the admin panel.</p>
            </article>
          )}
        </section>
      </main>
      <MarketingFooter content={content} />
    </div>
  )
}

export default BlogPage
