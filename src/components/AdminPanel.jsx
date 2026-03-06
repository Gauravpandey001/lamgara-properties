import { useState } from 'react'
import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

const emptyListing = {
  title: '',
  location: '',
  latitude: '',
  longitude: '',
  size: '',
  category: '',
  description: '',
  price: '',
  status: 'For Sale',
  spotlight: false,
  image: '',
  images: [],
  videoIframe: '',
}

const emptyBlog = {
  title: '',
  category: 'Market Insight',
  date: new Date().toISOString().slice(0, 10),
  excerpt: '',
  content: '',
  image: '',
  images: [],
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const presignEndpoint = apiBase ? `${apiBase}/api/uploads/presign` : '/api/uploads/presign'
const geocodeEndpoint = apiBase ? `${apiBase}/api/geocode` : '/api/geocode'

const normalizeImages = (item) => {
  if (Array.isArray(item.images) && item.images.length) return item.images
  if (item.image) return [item.image]
  return []
}

const moveImage = (images, fromIndex, direction) => {
  const toIndex = fromIndex + direction
  if (toIndex < 0 || toIndex >= images.length) return images
  const next = [...images]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function AdminPanel({ content, setContent, saveContent, saveState, authToken, onLogout }) {
  usePageSeo({
    title: `Admin Panel | ${content.brand}`,
    description: 'Manage hero content, listings, spotlight flags, and blogs.',
    robots: 'noindex,nofollow',
  })

  const [activeTab, setActiveTab] = useState('hero')
  const [showAddListing, setShowAddListing] = useState(false)
  const [showAddBlog, setShowAddBlog] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [newListing, setNewListing] = useState(emptyListing)
  const [newBlog, setNewBlog] = useState(emptyBlog)
  const [uploadState, setUploadState] = useState({ key: '', message: '' })
  const [locationState, setLocationState] = useState({ loading: false, message: '', error: false })

  const setUploading = (key, message) => setUploadState({ key, message })

  const uploadImageToS3 = async (file, folder) => {
    const presign = await fetch(presignEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || '',
        folder,
      }),
    })

    if (!presign.ok) {
      if (presign.status === 401) throw new Error('Session expired. Please login again.')
      throw new Error('Could not generate upload URL')
    }

    const { uploadUrl, fileUrl } = await presign.json()
    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: file.type ? { 'Content-Type': file.type } : {},
      body: file,
    })

    if (!upload.ok) throw new Error('Upload failed. Check S3 CORS/IAM settings.')
    return fileUrl
  }

  const uploadAndPersist = async (file, folder, key, updateContent) => {
    if (!file) return
    try {
      setUploading(key, 'Uploading...')
      const imageUrl = await uploadImageToS3(file, folder)
      let nextContent
      setContent((prev) => {
        nextContent = updateContent(prev, imageUrl)
        return nextContent
      })
      const ok = await saveContent(nextContent)
      if (!ok) throw new Error('Upload succeeded but save failed')
      setUploading('', 'Uploaded and saved.')
    } catch (error) {
      setUploading('', error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const uploadDraft = async (file, folder, key, applyDraft) => {
    if (!file) return
    try {
      setUploading(key, 'Uploading...')
      const imageUrl = await uploadImageToS3(file, folder)
      applyDraft(imageUrl)
      setUploading('', 'Uploaded. Add item to save it to DB.')
    } catch (error) {
      setUploading('', error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const setLocationMessage = (message, error = false, loading = false) =>
    setLocationState({ loading, message, error })

  const resolveLocationForDraft = async () => {
    const query = String(newListing.location || '').trim()
    if (!query) {
      setLocationMessage('Enter a location first.', true)
      return
    }

    try {
      setLocationMessage('Searching location...', false, true)
      const response = await fetch(`${geocodeEndpoint}?q=${encodeURIComponent(query)}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Location lookup failed')
      if (!payload?.found || !Number.isFinite(payload.lat) || !Number.isFinite(payload.lon)) {
        setLocationMessage('Location not found. Try a nearby town/locality.', true)
        return
      }
      setNewListing((prev) => ({
        ...prev,
        location: payload.displayName || query,
        latitude: String(payload.lat),
        longitude: String(payload.lon),
      }))
      setLocationMessage(`Location pinned at ${payload.lat.toFixed(5)}, ${payload.lon.toFixed(5)}.`)
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Location lookup failed', true)
    }
  }

  const updateListing = (id, patch) => {
    setContent((prev) => ({
      ...prev,
      listings: (prev.listings || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const deleteListing = (id) => {
    setContent((prev) => ({
      ...prev,
      listings: (prev.listings || []).filter((item) => item.id !== id),
    }))
  }

  const updateBlog = (id, patch) => {
    setContent((prev) => ({
      ...prev,
      blogs: (prev.blogs || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const deleteBlog = (id) => {
    setContent((prev) => ({
      ...prev,
      blogs: (prev.blogs || []).filter((item) => item.id !== id),
    }))
  }

  const addListing = () => {
    if (!newListing.title || !newListing.location || !newListing.price) return
    if (!newListing.latitude || !newListing.longitude) {
      setLocationMessage('Search and pin listing location before adding.', true)
      return
    }

    setContent((prev) => ({
      ...prev,
      listings: [{ id: `l-${Date.now()}`, ...newListing }, ...(prev.listings || [])],
    }))
    setNewListing(emptyListing)
    setLocationState({ loading: false, message: '', error: false })
    setShowAddListing(false)
  }

  const addBlog = () => {
    if (!newBlog.title || !newBlog.excerpt || !newBlog.content) return
    setContent((prev) => ({
      ...prev,
      blogs: [{ id: `b-${Date.now()}`, ...newBlog }, ...(prev.blogs || [])],
    }))
    setNewBlog(emptyBlog)
    setShowAddBlog(false)
  }

  const renderHeroTab = () => (
    <section className="panel">
      <h3>Hero Title & Branding</h3>
      <div className="admin-grid">
        <label>
          Brand
          <input value={content.brand} onChange={(e) => setContent({ ...content, brand: e.target.value })} />
        </label>
        <label>
          Hero Kicker
          <input
            value={content.hero.kicker}
            onChange={(e) => setContent({ ...content, hero: { ...content.hero, kicker: e.target.value } })}
          />
        </label>
        <label>
          Hero Title
          <input
            value={content.hero.title}
            onChange={(e) => setContent({ ...content, hero: { ...content.hero, title: e.target.value } })}
          />
        </label>
        <label className="span-2">
          Hero Description
          <textarea
            rows="3"
            value={content.hero.description}
            onChange={(e) =>
              setContent({
                ...content,
                hero: { ...content.hero, description: e.target.value },
              })
            }
          />
        </label>
        <div className="uploader span-2">
          <p>Hero Image</p>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              await uploadAndPersist(file, 'hero', 'hero', (prev, url) => ({
                ...prev,
                hero: { ...prev.hero, image: url },
              }))
              e.target.value = ''
            }}
          />
          {uploadState.key === 'hero' ? <small>{uploadState.message}</small> : null}
        </div>
      </div>
      {content.hero.image ? (
        <div className="preview" style={{ marginTop: '0.75rem' }}>
          <img src={content.hero.image} alt="Hero" />
        </div>
      ) : null}
    </section>
  )

  const renderListingsTab = () => (
    <>
      <section className="panel">
        <div className="admin-tab-head">
          <h3 className="admin-tab-title">Listings</h3>
          <button type="button" className="button" onClick={() => setShowAddListing(true)}>
            Add New Listing
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>Manage Listings</h3>
        <div className="stack">
          {(content.listings || []).map((item) => (
            <article className="editor" key={item.id}>
              <div className="admin-grid">
                <input value={item.title || ''} onChange={(e) => updateListing(item.id, { title: e.target.value })} />
                <input value={item.location || ''} onChange={(e) => updateListing(item.id, { location: e.target.value })} />
                <input
                  placeholder="Latitude"
                  value={item.latitude || ''}
                  onChange={(e) => updateListing(item.id, { latitude: e.target.value })}
                />
                <input
                  placeholder="Longitude"
                  value={item.longitude || ''}
                  onChange={(e) => updateListing(item.id, { longitude: e.target.value })}
                />
                <input value={item.size || ''} onChange={(e) => updateListing(item.id, { size: e.target.value })} />
                <input value={item.category || ''} onChange={(e) => updateListing(item.id, { category: e.target.value })} />
                <textarea
                  className="span-2"
                  rows="3"
                  value={item.description || ''}
                  onChange={(e) => updateListing(item.id, { description: e.target.value })}
                />
                <input value={item.price || ''} onChange={(e) => updateListing(item.id, { price: e.target.value })} />
                <select value={item.status || 'For Sale'} onChange={(e) => updateListing(item.id, { status: e.target.value })}>
                  <option>For Sale</option>
                  <option>New Listing</option>
                  <option>Hot Listing</option>
                </select>
                <label className="span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(item.spotlight)}
                    onChange={(e) => updateListing(item.id, { spotlight: e.target.checked })}
                  />
                  Show In Spotlight
                </label>
                <textarea
                  className="span-2"
                  rows="3"
                  value={item.videoIframe || ''}
                  onChange={(e) => updateListing(item.id, { videoIframe: e.target.value })}
                />
                <div className="uploader span-2">
                  <p>Replace Image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      await uploadAndPersist(file, 'listings', `listing-${item.id}`, (prev, url) => ({
                        ...prev,
                        listings: (prev.listings || []).map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                image: x.image || url,
                                images: [...(x.images || (x.image ? [x.image] : [])), url],
                              }
                            : x,
                        ),
                      }))
                      e.target.value = ''
                    }}
                  />
                </div>
                {normalizeImages(item).length ? (
                  <div className="gallery span-2">
                    {normalizeImages(item).map((img, idx) => (
                      <div key={`${item.id}-img-${idx}`} className="gallery-item">
                        <div className="gallery-preview" style={{ backgroundImage: `url(${img})` }} />
                        <div className="gallery-actions">
                          <button
                            type="button"
                            className="button tiny"
                            disabled={idx === 0}
                            onClick={() =>
                              setContent((prev) => ({
                                ...prev,
                                listings: (prev.listings || []).map((x) => {
                                  if (x.id !== item.id) return x
                                  const nextImages = moveImage(normalizeImages(x), idx, -1)
                                  return { ...x, images: nextImages, image: nextImages[0] || '' }
                                }),
                              }))
                            }
                          >
                            Move Left
                          </button>
                          <button
                            type="button"
                            className="button tiny"
                            disabled={idx === normalizeImages(item).length - 1}
                            onClick={() =>
                              setContent((prev) => ({
                                ...prev,
                                listings: (prev.listings || []).map((x) => {
                                  if (x.id !== item.id) return x
                                  const nextImages = moveImage(normalizeImages(x), idx, 1)
                                  return { ...x, images: nextImages, image: nextImages[0] || '' }
                                }),
                              }))
                            }
                          >
                            Move Right
                          </button>
                        </div>
                        <button
                          type="button"
                          className="button ghost tiny"
                          onClick={() =>
                            setContent((prev) => ({
                              ...prev,
                              listings: (prev.listings || []).map((x) => {
                                if (x.id !== item.id) return x
                                const nextImages = normalizeImages(x).filter((_, i) => i !== idx)
                                return { ...x, images: nextImages, image: nextImages[0] || '' }
                              }),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="row-end">
                <button type="button" className="button ghost" onClick={() => deleteListing(item.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )

  const renderBlogsTab = () => (
    <>
      <section className="panel">
        <div className="admin-tab-head">
          <h3 className="admin-tab-title">Blogs</h3>
          <button type="button" className="button" onClick={() => setShowAddBlog(true)}>
            Add New Blog
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>Manage Blogs</h3>
        <div className="stack">
          {(content.blogs || []).map((item) => (
            <article className="editor" key={item.id}>
              <div className="admin-grid">
                <input value={item.title || ''} onChange={(e) => updateBlog(item.id, { title: e.target.value })} />
                <input value={item.category || ''} onChange={(e) => updateBlog(item.id, { category: e.target.value })} />
                <input type="date" value={item.date || ''} onChange={(e) => updateBlog(item.id, { date: e.target.value })} />
                <textarea
                  className="span-2"
                  rows="3"
                  value={item.excerpt || ''}
                  onChange={(e) => updateBlog(item.id, { excerpt: e.target.value })}
                />
                <textarea
                  className="span-2"
                  rows="6"
                  value={item.content || ''}
                  onChange={(e) => updateBlog(item.id, { content: e.target.value })}
                />
                <div className="uploader span-2">
                  <p>Upload Blog Image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      await uploadAndPersist(file, 'blogs', `blog-${item.id}`, (prev, url) => ({
                        ...prev,
                        blogs: (prev.blogs || []).map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                image: x.image || url,
                                images: [...(x.images || (x.image ? [x.image] : [])), url],
                              }
                            : x,
                        ),
                      }))
                      e.target.value = ''
                    }}
                  />
                </div>
                {normalizeImages(item).length ? (
                  <div className="gallery span-2">
                    {normalizeImages(item).map((img, idx) => (
                      <div key={`${item.id}-blog-img-${idx}`} className="gallery-item">
                        <div className="gallery-preview" style={{ backgroundImage: `url(${img})` }} />
                        <div className="gallery-actions">
                          <button
                            type="button"
                            className="button tiny"
                            disabled={idx === 0}
                            onClick={() =>
                              setContent((prev) => ({
                                ...prev,
                                blogs: (prev.blogs || []).map((x) => {
                                  if (x.id !== item.id) return x
                                  const nextImages = moveImage(normalizeImages(x), idx, -1)
                                  return { ...x, images: nextImages, image: nextImages[0] || '' }
                                }),
                              }))
                            }
                          >
                            Move Left
                          </button>
                          <button
                            type="button"
                            className="button tiny"
                            disabled={idx === normalizeImages(item).length - 1}
                            onClick={() =>
                              setContent((prev) => ({
                                ...prev,
                                blogs: (prev.blogs || []).map((x) => {
                                  if (x.id !== item.id) return x
                                  const nextImages = moveImage(normalizeImages(x), idx, 1)
                                  return { ...x, images: nextImages, image: nextImages[0] || '' }
                                }),
                              }))
                            }
                          >
                            Move Right
                          </button>
                        </div>
                        <button
                          type="button"
                          className="button ghost tiny"
                          onClick={() =>
                            setContent((prev) => ({
                              ...prev,
                              blogs: (prev.blogs || []).map((x) => {
                                if (x.id !== item.id) return x
                                const nextImages = normalizeImages(x).filter((_, i) => i !== idx)
                                return { ...x, images: nextImages, image: nextImages[0] || '' }
                              }),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="row-end">
                <button type="button" className="button ghost" onClick={() => deleteBlog(item.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )

  const renderListingModal = () => {
    if (!showAddListing) return null

    return (
      <div className="auth-wrap modal-overlay">
        <article className="auth-card modal-card">
          <h3 className="admin-tab-title">Add New Listing</h3>
          <div className="admin-grid">
            <input placeholder="Title" value={newListing.title} onChange={(e) => setNewListing({ ...newListing, title: e.target.value })} />
            <input
              placeholder="Location / Locality"
              value={newListing.location}
              onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
              required
            />
            <div className="uploader span-2">
              <p>Pin Listing Location</p>
              <button type="button" className="button tiny" onClick={resolveLocationForDraft} disabled={locationState.loading}>
                {locationState.loading ? 'Searching...' : 'Search & Set Coordinates'}
              </button>
              {newListing.latitude && newListing.longitude ? (
                <small>Coordinates set: {newListing.latitude}, {newListing.longitude}</small>
              ) : (
                <small>Use location search instead of manual latitude/longitude entry.</small>
              )}
              {locationState.message ? (
                <small className={locationState.error ? 'auth-error' : ''}>{locationState.message}</small>
              ) : null}
            </div>
            <input placeholder="Size" value={newListing.size} onChange={(e) => setNewListing({ ...newListing, size: e.target.value })} />
            <input placeholder="Category" value={newListing.category} onChange={(e) => setNewListing({ ...newListing, category: e.target.value })} />
            <textarea
              className="span-2"
              rows="3"
              placeholder="Description"
              value={newListing.description}
              onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
            />
            <input placeholder="Price" value={newListing.price} onChange={(e) => setNewListing({ ...newListing, price: e.target.value })} />
            <select value={newListing.status} onChange={(e) => setNewListing({ ...newListing, status: e.target.value })}>
              <option>For Sale</option>
              <option>New Listing</option>
              <option>Hot Listing</option>
            </select>
            <label className="span-2">
              <input
                type="checkbox"
                checked={Boolean(newListing.spotlight)}
                onChange={(e) => setNewListing({ ...newListing, spotlight: e.target.checked })}
              />
              Show In Spotlight
            </label>
            <textarea
              className="span-2"
              rows="3"
              placeholder="YouTube iframe (optional)"
              value={newListing.videoIframe}
              onChange={(e) => setNewListing({ ...newListing, videoIframe: e.target.value })}
            />
            <div className="uploader span-2">
              <p>Listing Image</p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  await uploadDraft(file, 'listings', 'new-listing', (url) =>
                    setNewListing((prev) => ({
                      ...prev,
                      image: prev.image || url,
                      images: [...(prev.images || []), url],
                    })),
                  )
                  e.target.value = ''
                }}
              />
              {newListing.images?.length ? <small>{newListing.images.length} image(s) attached.</small> : null}
            </div>
            {newListing.images?.length ? (
              <div className="gallery span-2">
                {newListing.images.map((img, idx) => (
                  <div key={`new-listing-${idx}`} className="gallery-item">
                    <div className="gallery-preview" style={{ backgroundImage: `url(${img})` }} />
                    <div className="gallery-actions">
                      <button
                        type="button"
                        className="button tiny"
                        disabled={idx === 0}
                        onClick={() =>
                          setNewListing((prev) => {
                            const nextImages = moveImage(prev.images || [], idx, -1)
                            return { ...prev, images: nextImages, image: nextImages[0] || '' }
                          })
                        }
                      >
                        Move Left
                      </button>
                      <button
                        type="button"
                        className="button tiny"
                        disabled={idx === newListing.images.length - 1}
                        onClick={() =>
                          setNewListing((prev) => {
                            const nextImages = moveImage(prev.images || [], idx, 1)
                            return { ...prev, images: nextImages, image: nextImages[0] || '' }
                          })
                        }
                      >
                        Move Right
                      </button>
                    </div>
                    <button
                      type="button"
                      className="button ghost tiny"
                      onClick={() =>
                        setNewListing((prev) => {
                          const nextImages = (prev.images || []).filter((_, i) => i !== idx)
                          return { ...prev, images: nextImages, image: nextImages[0] || '' }
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="row-end">
            <button type="button" className="button outline" onClick={() => setShowAddListing(false)}>
              Cancel
            </button>
            <button type="button" className="button" onClick={addListing}>
              Add Listing
            </button>
          </div>
        </article>
      </div>
    )
  }

  const renderBlogModal = () => {
    if (!showAddBlog) return null

    return (
      <div className="auth-wrap modal-overlay">
        <article className="auth-card modal-card">
          <h3 className="admin-tab-title">Add New Blog</h3>
          <div className="admin-grid">
            <input placeholder="Title" value={newBlog.title} onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })} />
            <input placeholder="Category" value={newBlog.category} onChange={(e) => setNewBlog({ ...newBlog, category: e.target.value })} />
            <input type="date" value={newBlog.date} onChange={(e) => setNewBlog({ ...newBlog, date: e.target.value })} />
            <textarea
              className="span-2"
              rows="3"
              placeholder="Short excerpt"
              value={newBlog.excerpt}
              onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
            />
            <textarea
              className="span-2"
              rows="6"
              placeholder="Full blog content"
              value={newBlog.content}
              onChange={(e) => setNewBlog({ ...newBlog, content: e.target.value })}
            />
            <div className="uploader span-2">
              <p>Blog Images</p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  await uploadDraft(file, 'blogs', 'new-blog', (url) =>
                    setNewBlog((prev) => ({
                      ...prev,
                      image: prev.image || url,
                      images: [...(prev.images || []), url],
                    })),
                  )
                  e.target.value = ''
                }}
              />
              {newBlog.images?.length ? <small>{newBlog.images.length} image(s) attached.</small> : null}
            </div>
            {newBlog.images?.length ? (
              <div className="gallery span-2">
                {newBlog.images.map((img, idx) => (
                  <div key={`new-blog-${idx}`} className="gallery-item">
                    <div className="gallery-preview" style={{ backgroundImage: `url(${img})` }} />
                    <div className="gallery-actions">
                      <button
                        type="button"
                        className="button tiny"
                        disabled={idx === 0}
                        onClick={() =>
                          setNewBlog((prev) => {
                            const nextImages = moveImage(prev.images || [], idx, -1)
                            return { ...prev, images: nextImages, image: nextImages[0] || '' }
                          })
                        }
                      >
                        Move Left
                      </button>
                      <button
                        type="button"
                        className="button tiny"
                        disabled={idx === newBlog.images.length - 1}
                        onClick={() =>
                          setNewBlog((prev) => {
                            const nextImages = moveImage(prev.images || [], idx, 1)
                            return { ...prev, images: nextImages, image: nextImages[0] || '' }
                          })
                        }
                      >
                        Move Right
                      </button>
                    </div>
                    <button
                      type="button"
                      className="button ghost tiny"
                      onClick={() =>
                        setNewBlog((prev) => {
                          const nextImages = (prev.images || []).filter((_, i) => i !== idx)
                          return { ...prev, images: nextImages, image: nextImages[0] || '' }
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="row-end">
            <button type="button" className="button outline" onClick={() => setShowAddBlog(false)}>
              Cancel
            </button>
            <button type="button" className="button" onClick={addBlog}>
              Add Blog
            </button>
          </div>
        </article>
      </div>
    )
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  return (
    <div className="admin-shell">
      <button
        type="button"
        className="admin-menu-toggle"
        aria-label={mobileMenuOpen ? 'Close admin menu' : 'Open admin menu'}
        onClick={() => setMobileMenuOpen((prev) => !prev)}
      >
        <span className={`burger-icon ${mobileMenuOpen ? 'open' : ''}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {mobileMenuOpen ? (
        <button
          type="button"
          className="admin-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <h2>Admin</h2>
        <p>Choose a section, edit content, then save all changes.</p>

        <div className="admin-menu">
          <button type="button" className={`button ${activeTab === 'hero' ? '' : 'outline'}`} onClick={() => switchTab('hero')}>
            Hero & Branding
          </button>
          <button type="button" className={`button ${activeTab === 'listings' ? '' : 'outline'}`} onClick={() => switchTab('listings')}>
            Listings
          </button>
          <button type="button" className={`button ${activeTab === 'blogs' ? '' : 'outline'}`} onClick={() => switchTab('blogs')}>
            Blogs
          </button>
        </div>

        <Link to="/" className="button outline">
          Open Website
        </Link>
        <button type="button" className="button" onClick={() => saveContent()}>
          Save All Changes
        </button>
        <button type="button" className="button ghost" onClick={onLogout}>
          Logout
        </button>
        {saveState ? <p className="note">{saveState}</p> : null}
        {uploadState.message ? <p className="note">{uploadState.message}</p> : null}
      </aside>

      <main className="admin-main">
        {activeTab === 'hero' ? renderHeroTab() : null}
        {activeTab === 'listings' ? renderListingsTab() : null}
        {activeTab === 'blogs' ? renderBlogsTab() : null}
      </main>

      {renderListingModal()}
      {renderBlogModal()}
    </div>
  )
}

export default AdminPanel
