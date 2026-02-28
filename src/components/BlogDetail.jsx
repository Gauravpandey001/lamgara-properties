import { Link, useParams } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'
import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'

const getImages = (blog) => {
  if (Array.isArray(blog.images) && blog.images.length) return blog.images
  if (blog.image) return [blog.image]
  return []
}

function BlogDetail({ content }) {
  const { id } = useParams()
  const blog = (content.blogs || []).find((entry) => entry.id === id)
  const seoTitle = blog ? `${blog.title} | ${content.brand} Blog` : `Blog Not Found | ${content.brand}`
  const seoDescription =
    blog?.excerpt || blog?.content?.slice(0, 160) || 'Read the latest blog updates from Lamgara Properties.'

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
  })

  if (!blog) {
    return (
      <div className="lp-page">
        <MarketingHeader brand={content.brand} />
        <main className="lp-main lp-page-main">
          <article className="lp-panel">
            <h3>Blog not found</h3>
            <p>The requested blog entry does not exist.</p>
            <Link to="/blog" className="button outline">
              Back to Blog
            </Link>
          </article>
        </main>
        <MarketingFooter content={content} />
      </div>
    )
  }

  const images = getImages(blog)

  return (
    <div className="lp-page">
      <MarketingHeader brand={content.brand} />
      <main className="lp-main lp-page-main">
        <article className="lp-panel">
          {images[0] ? (
            <div className="blog-hero-image" style={{ backgroundImage: `url(${images[0]})` }} />
          ) : null}
          <p className="lp-kicker">{blog.category || 'Blog'}</p>
          <h2>{blog.title}</h2>
          <p>{blog.date || 'N/A'}</p>
          <p className="blog-body">{blog.content || blog.excerpt || ''}</p>
        </article>

        {images.length > 1 ? (
          <section className="thumb-grid">
            {images.slice(1).map((image, index) => (
              <div
                key={`${blog.id}-image-${index}`}
                className="thumb-item"
                style={{ backgroundImage: `url(${image})` }}
              />
            ))}
          </section>
        ) : null}

        <Link to="/blog" className="button outline">
          Back to Blog
        </Link>
      </main>
      <MarketingFooter content={content} />
    </div>
  )
}

export default BlogDetail
