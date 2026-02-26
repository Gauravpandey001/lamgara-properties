import { Link } from 'react-router-dom'
import SiteHeader from './SiteHeader'

const toBlogSnippet = (text = '') => (text.length > 160 ? `${text.slice(0, 157).trim()}...` : text)
const getPrimaryImage = (blog) => blog.images?.[0] || blog.image || ''

function BlogPage({ content }) {
  const blogs = (content.blogs || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="shell">
      <SiteHeader content={content} />
      <main className="page-main">
        <section className="page-hero">
          <p className="kicker">Blog</p>
          <h2>Insights on local property trends and buying decisions.</h2>
          <p>
            Practical reads on pricing patterns, location picks, and what to verify before
            purchasing land in Uttarakhand.
          </p>
        </section>

        <section className="blog-grid">
          {blogs.length ? (
            blogs.map((post) => (
              <article key={post.id} className="info-card">
                {getPrimaryImage(post) ? (
                  <div
                    className="blog-card-image"
                    style={{ backgroundImage: `url(${getPrimaryImage(post)})` }}
                  />
                ) : null}
                <span className="chip">{post.category || 'Update'}</span>
                <h3>{post.title}</h3>
                <p>{toBlogSnippet(post.excerpt || post.content || '')}</p>
                <div className="card-row">
                  <small>{post.date || 'N/A'}</small>
                  <Link className="button outline" to={`/blog/${post.id}`}>
                    Read
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className="info-card">
              <h3>No blogs yet</h3>
              <p>Create blog posts from the admin panel.</p>
            </article>
          )}
        </section>
      </main>
    </div>
  )
}

export default BlogPage
