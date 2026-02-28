import { Link } from 'react-router-dom'

function MarketingFooter({ content }) {
  return (
    <footer className="lp-footer">
      <div className="lp-shell lp-footer-grid">
        <div>
          <h3>{content.brand}</h3>
          <p>Your trusted partner for verified property opportunities in Uttarakhand.</p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>{content.contact.phone}</p>
          <p>{content.contact.email}</p>
          <p>{content.contact.address}</p>
        </div>
        <div>
          <h4>Explore</h4>
          <p>
            <Link to="/about">About</Link>
          </p>
          <p>
            <Link to="/blog">Blog</Link>
          </p>
          <p>
            <Link to="/contact">Contact</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default MarketingFooter
