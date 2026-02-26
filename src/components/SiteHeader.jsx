import { Link, NavLink } from 'react-router-dom'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Properties in Uttarakhand', to: '/properties' },
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
]

function SiteHeader({ content }) {
  return (
    <header className="header">
      <div className="topline">
        <span>{content.contact.phone}</span>
        <span>{content.contact.email}</span>
      </div>

      <div className="navbox">
        <h1 className="brand">{content.brand}</h1>
        <nav className="nav" aria-label="Main">
          {navLinks.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/admin" className="button outline">
          Admin
        </Link>
      </div>
    </header>
  )
}

export default SiteHeader
