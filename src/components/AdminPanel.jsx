import { useState } from 'react'
import { Link } from 'react-router-dom'
import { defaultContent } from '../data/defaultContent'

const emptyListing = {
  title: '',
  location: '',
  size: '',
  category: '',
  price: '',
  status: 'For Sale',
  featured: true,
  image: '',
}

const emptySpotlight = {
  title: '',
  location: '',
  price: '',
  status: 'For Sale',
  image: '',
}

const emptyVideo = {
  title: '',
  iframe: '',
}

function AdminPanel({ content, setContent }) {
  const [newListing, setNewListing] = useState(emptyListing)
  const [newSpotlight, setNewSpotlight] = useState(emptySpotlight)
  const [newVideo, setNewVideo] = useState(emptyVideo)

  const updateTopLevel = (key, value) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const updateNested = (section, key, value) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const updateArrayFromCsv = (key, value) => {
    const values = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    updateTopLevel(key, values)
  }

  const addListing = () => {
    if (!newListing.title || !newListing.location || !newListing.price) return
    setContent((prev) => ({
      ...prev,
      listings: [{ id: `l-${Date.now()}`, ...newListing }, ...prev.listings],
    }))
    setNewListing(emptyListing)
  }

  const updateListing = (id, key, value) => {
    setContent((prev) => ({
      ...prev,
      listings: prev.listings.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const removeListing = (id) => {
    setContent((prev) => ({
      ...prev,
      listings: prev.listings.filter((item) => item.id !== id),
    }))
  }

  const addSpotlight = () => {
    if (!newSpotlight.title || !newSpotlight.location || !newSpotlight.price) return
    setContent((prev) => ({
      ...prev,
      spotlight: [{ id: `s-${Date.now()}`, ...newSpotlight }, ...prev.spotlight],
    }))
    setNewSpotlight(emptySpotlight)
  }

  const updateSpotlight = (id, key, value) => {
    setContent((prev) => ({
      ...prev,
      spotlight: prev.spotlight.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const removeSpotlight = (id) => {
    setContent((prev) => ({
      ...prev,
      spotlight: prev.spotlight.filter((item) => item.id !== id),
    }))
  }

  const addVideo = () => {
    if (!newVideo.title || !newVideo.iframe) return
    setContent((prev) => ({
      ...prev,
      videos: [{ id: `v-${Date.now()}`, ...newVideo }, ...(prev.videos || [])],
    }))
    setNewVideo(emptyVideo)
  }

  const updateVideo = (id, key, value) => {
    setContent((prev) => ({
      ...prev,
      videos: (prev.videos || []).map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const removeVideo = (id) => {
    setContent((prev) => ({
      ...prev,
      videos: (prev.videos || []).filter((item) => item.id !== id),
    }))
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <h2>Admin Panel</h2>
        <p>Manage website content (no login).</p>
        <Link to="/" className="admin-link">
          Open Public Site
        </Link>
        <button
          type="button"
          className="danger-btn"
          onClick={() => setContent(defaultContent)}
        >
          Reset Demo Content
        </button>
      </aside>

      <main className="admin-main">
        <section className="admin-card">
          <h3>Brand + Navigation</h3>
          <div className="admin-grid two-col">
            <label>
              Brand Name
              <input
                value={content.brand}
                onChange={(event) => updateTopLevel('brand', event.target.value)}
              />
            </label>
            <label>
              Navigation (comma separated)
              <input
                value={content.navItems.join(', ')}
                onChange={(event) => updateArrayFromCsv('navItems', event.target.value)}
              />
            </label>
            <label>
              Property Types (comma separated)
              <input
                value={content.propertyTypes.join(', ')}
                onChange={(event) =>
                  updateArrayFromCsv('propertyTypes', event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="admin-card">
          <h3>Hero + Contact</h3>
          <div className="admin-grid two-col">
            <label>
              Hero Kicker
              <input
                value={content.hero.kicker}
                onChange={(event) =>
                  updateNested('hero', 'kicker', event.target.value)
                }
              />
            </label>
            <label>
              Hero Title
              <input
                value={content.hero.title}
                onChange={(event) => updateNested('hero', 'title', event.target.value)}
              />
            </label>
            <label className="full-col">
              Hero Description
              <textarea
                rows="3"
                value={content.hero.description}
                onChange={(event) =>
                  updateNested('hero', 'description', event.target.value)
                }
              />
            </label>
            <label className="full-col">
              Hero Image URL (GCP)
              <input
                value={content.hero.image || ''}
                onChange={(event) => updateNested('hero', 'image', event.target.value)}
                placeholder="https://storage.googleapis.com/..."
              />
            </label>
            {content.hero.image && (
              <div className="full-col admin-image-preview">
                <img src={content.hero.image} alt="Hero preview" />
              </div>
            )}
            <label>
              Phone
              <input
                value={content.contact.phone}
                onChange={(event) =>
                  updateNested('contact', 'phone', event.target.value)
                }
              />
            </label>
            <label>
              Email
              <input
                value={content.contact.email}
                onChange={(event) =>
                  updateNested('contact', 'email', event.target.value)
                }
              />
            </label>
            <label className="full-col">
              Address
              <input
                value={content.contact.address}
                onChange={(event) =>
                  updateNested('contact', 'address', event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="admin-card">
          <h3>Featured Properties (GCP Image URLs)</h3>
          <div className="admin-grid two-col add-row">
            <input
              placeholder="Title"
              value={newListing.title}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <input
              placeholder="Location"
              value={newListing.location}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, location: event.target.value }))
              }
            />
            <input
              placeholder="Size"
              value={newListing.size}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, size: event.target.value }))
              }
            />
            <input
              placeholder="Category"
              value={newListing.category}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, category: event.target.value }))
              }
            />
            <input
              placeholder="Price"
              value={newListing.price}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, price: event.target.value }))
              }
            />
            <select
              value={newListing.status}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option>For Sale</option>
              <option>New Listing</option>
              <option>Hot Listing</option>
            </select>
            <input
              className="full-col"
              placeholder="GCP Image URL (https://storage.googleapis.com/...)"
              value={newListing.image}
              onChange={(event) =>
                setNewListing((prev) => ({ ...prev, image: event.target.value }))
              }
            />
          </div>
          <button type="button" className="primary-btn" onClick={addListing}>
            Add Property
          </button>

          <div className="admin-list">
            {content.listings.map((item) => (
              <article key={item.id} className="manage-item">
                <div className="admin-grid two-col">
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateListing(item.id, 'title', event.target.value)
                    }
                  />
                  <input
                    value={item.location}
                    onChange={(event) =>
                      updateListing(item.id, 'location', event.target.value)
                    }
                  />
                  <input
                    value={item.size}
                    onChange={(event) => updateListing(item.id, 'size', event.target.value)}
                  />
                  <input
                    value={item.category}
                    onChange={(event) =>
                      updateListing(item.id, 'category', event.target.value)
                    }
                  />
                  <input
                    value={item.price}
                    onChange={(event) => updateListing(item.id, 'price', event.target.value)}
                  />
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateListing(item.id, 'status', event.target.value)
                    }
                  >
                    <option>For Sale</option>
                    <option>New Listing</option>
                    <option>Hot Listing</option>
                  </select>
                  <input
                    className="full-col"
                    value={item.image || ''}
                    onChange={(event) => updateListing(item.id, 'image', event.target.value)}
                    placeholder="GCP Image URL"
                  />
                  {item.image && (
                    <div className="full-col admin-image-preview">
                      <img src={item.image} alt={item.title} />
                    </div>
                  )}
                </div>
                <div className="manage-actions">
                  <label>
                    <input
                      type="checkbox"
                      checked={item.featured}
                      onChange={(event) =>
                        updateListing(item.id, 'featured', event.target.checked)
                      }
                    />
                    Featured
                  </label>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeListing(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h3>Spotlight Slider (GCP Image URLs)</h3>
          <div className="admin-grid two-col add-row">
            <input
              placeholder="Title"
              value={newSpotlight.title}
              onChange={(event) =>
                setNewSpotlight((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <input
              placeholder="Location"
              value={newSpotlight.location}
              onChange={(event) =>
                setNewSpotlight((prev) => ({ ...prev, location: event.target.value }))
              }
            />
            <input
              placeholder="Price"
              value={newSpotlight.price}
              onChange={(event) =>
                setNewSpotlight((prev) => ({ ...prev, price: event.target.value }))
              }
            />
            <select
              value={newSpotlight.status}
              onChange={(event) =>
                setNewSpotlight((prev) => ({ ...prev, status: event.target.value }))
              }
            >
              <option>For Sale</option>
              <option>New Listing</option>
              <option>Hot Listing</option>
            </select>
            <input
              className="full-col"
              placeholder="GCP Image URL (https://storage.googleapis.com/...)"
              value={newSpotlight.image}
              onChange={(event) =>
                setNewSpotlight((prev) => ({ ...prev, image: event.target.value }))
              }
            />
          </div>
          <button type="button" className="primary-btn" onClick={addSpotlight}>
            Add Spotlight
          </button>

          <div className="admin-list">
            {content.spotlight.map((item) => (
              <article key={item.id} className="manage-item">
                <div className="admin-grid two-col">
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateSpotlight(item.id, 'title', event.target.value)
                    }
                  />
                  <input
                    value={item.location}
                    onChange={(event) =>
                      updateSpotlight(item.id, 'location', event.target.value)
                    }
                  />
                  <input
                    value={item.price}
                    onChange={(event) =>
                      updateSpotlight(item.id, 'price', event.target.value)
                    }
                  />
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateSpotlight(item.id, 'status', event.target.value)
                    }
                  >
                    <option>For Sale</option>
                    <option>New Listing</option>
                    <option>Hot Listing</option>
                  </select>
                  <input
                    className="full-col"
                    value={item.image || ''}
                    onChange={(event) => updateSpotlight(item.id, 'image', event.target.value)}
                    placeholder="GCP Image URL"
                  />
                  {item.image && (
                    <div className="full-col admin-image-preview">
                      <img src={item.image} alt={item.title} />
                    </div>
                  )}
                </div>
                <div className="manage-actions">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeSpotlight(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h3>Videos (YouTube Iframe)</h3>
          <div className="admin-grid two-col add-row">
            <input
              placeholder="Video Title"
              value={newVideo.title}
              onChange={(event) =>
                setNewVideo((prev) => ({ ...prev, title: event.target.value }))
              }
            />
            <textarea
              rows="3"
              placeholder="Paste YouTube iframe code"
              value={newVideo.iframe}
              onChange={(event) =>
                setNewVideo((prev) => ({ ...prev, iframe: event.target.value }))
              }
            />
          </div>
          <button type="button" className="primary-btn" onClick={addVideo}>
            Add Video
          </button>

          <div className="admin-list">
            {(content.videos || []).map((item) => (
              <article key={item.id} className="manage-item">
                <div className="admin-grid two-col">
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateVideo(item.id, 'title', event.target.value)
                    }
                  />
                  <textarea
                    rows="3"
                    value={item.iframe}
                    onChange={(event) =>
                      updateVideo(item.id, 'iframe', event.target.value)
                    }
                  />
                </div>
                <div className="manage-actions">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => removeVideo(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminPanel
