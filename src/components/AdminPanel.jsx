import { useState } from 'react'
import { Link } from 'react-router-dom'
import usePageSeo from '../hooks/usePageSeo'

const emptyListing = {
  title: '',
  location: '',
  size: '',
  category: '',
  description: '',
  price: '',
  status: 'For Sale',
  featured: true,
  image: '',
  images: [],
  videoIframe: '',
}

const emptySpotlight = {
  title: '',
  location: '',
  description: '',
  price: '',
  status: 'For Sale',
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
    description: 'Manage listings, spotlight properties, and blog posts.',
    robots: 'noindex,nofollow',
  })

  const [newListing, setNewListing] = useState(emptyListing)
  const [newSpotlight, setNewSpotlight] = useState(emptySpotlight)
  const [newBlog, setNewBlog] = useState(emptyBlog)
  const [uploadState, setUploadState] = useState({ key: '', message: '' })

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

    if (!upload.ok) {
      throw new Error('Upload failed. Check S3 CORS/IAM settings.')
    }

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

  const addListing = () => {
    if (!newListing.title || !newListing.location || !newListing.price) return
    const next = {
      ...content,
      listings: [{ id: `l-${Date.now()}`, ...newListing }, ...content.listings],
    }
    setContent(next)
    setNewListing(emptyListing)
  }

  const addSpotlight = () => {
    if (!newSpotlight.title || !newSpotlight.location || !newSpotlight.price) return
    const next = {
      ...content,
      spotlight: [{ id: `s-${Date.now()}`, ...newSpotlight }, ...content.spotlight],
    }
    setContent(next)
    setNewSpotlight(emptySpotlight)
  }

  const addBlog = () => {
    if (!newBlog.title || !newBlog.excerpt || !newBlog.content) return
    const next = {
      ...content,
      blogs: [{ id: `b-${Date.now()}`, ...newBlog }, ...(content.blogs || [])],
    }
    setContent(next)
    setNewBlog(emptyBlog)
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Admin</h2>
        <p>Edit content, upload images, then save.</p>
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
        <section className="panel">
          <h3>Brand & Hero</h3>
          <div className="admin-grid">
            <label>
              Brand
              <input
                value={content.brand}
                onChange={(e) => setContent({ ...content, brand: e.target.value })}
              />
            </label>
            <label>
              Hero Kicker
              <input
                value={content.hero.kicker}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...content.hero, kicker: e.target.value } })
                }
              />
            </label>
            <label>
              Hero Title
              <input
                value={content.hero.title}
                onChange={(e) =>
                  setContent({ ...content, hero: { ...content.hero, title: e.target.value } })
                }
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
                    hero: {
                      ...prev.hero,
                      image: url,
                    },
                  }))
                  e.target.value = ''
                }}
              />
              {uploadState.key === 'hero' ? <small>{uploadState.message}</small> : null}
            </div>
            {content.hero.image ? (
              <div className="preview span-2">
                <img src={content.hero.image} alt="Hero" />
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <h3>Add Listing</h3>
          <div className="admin-grid">
            <input
              placeholder="Title"
              value={newListing.title}
              onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
            />
            <input
              placeholder="Location"
              value={newListing.location}
              onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
            />
            <input
              placeholder="Size"
              value={newListing.size}
              onChange={(e) => setNewListing({ ...newListing, size: e.target.value })}
            />
            <input
              placeholder="Category"
              value={newListing.category}
              onChange={(e) => setNewListing({ ...newListing, category: e.target.value })}
            />
            <textarea
              className="span-2"
              rows="3"
              placeholder="Description"
              value={newListing.description}
              onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
            />
            <input
              placeholder="Price"
              value={newListing.price}
              onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
            />
            <select
              value={newListing.status}
              onChange={(e) => setNewListing({ ...newListing, status: e.target.value })}
            >
              <option>For Sale</option>
              <option>New Listing</option>
              <option>Hot Listing</option>
            </select>
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
              {newListing.images?.length ? (
                <small>{newListing.images.length} image(s) attached.</small>
              ) : null}
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
                            return {
                              ...prev,
                              images: nextImages,
                              image: nextImages[0] || '',
                            }
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
                            return {
                              ...prev,
                              images: nextImages,
                              image: nextImages[0] || '',
                            }
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
                          const nextImages = prev.images.filter((_, i) => i !== idx)
                          return {
                            ...prev,
                            images: nextImages,
                            image: nextImages[0] || '',
                          }
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
          <button type="button" className="button" onClick={addListing}>
            Add Listing
          </button>
        </section>

        <section className="panel">
          <h3>Manage Listings</h3>
          <div className="stack">
            {content.listings.map((item) => (
              <article className="editor" key={item.id}>
                <div className="admin-grid">
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.location}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, location: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.size}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, size: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.category}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, category: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <textarea
                    className="span-2"
                    rows="3"
                    value={item.description || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, description: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.price}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, price: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <select
                    value={item.status}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, status: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option>For Sale</option>
                    <option>New Listing</option>
                    <option>Hot Listing</option>
                  </select>
                  <textarea
                    className="span-2"
                    rows="3"
                    value={item.videoIframe || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        listings: content.listings.map((x) =>
                          x.id === item.id ? { ...x, videoIframe: e.target.value } : x,
                        ),
                      })
                    }
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
                          listings: prev.listings.map((x) =>
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
                                  listings: prev.listings.map((x) => {
                                    if (x.id !== item.id) return x
                                    const current = normalizeImages(x)
                                    const nextImages = moveImage(current, idx, -1)
                                    return {
                                      ...x,
                                      images: nextImages,
                                      image: nextImages[0] || '',
                                    }
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
                                  listings: prev.listings.map((x) => {
                                    if (x.id !== item.id) return x
                                    const current = normalizeImages(x)
                                    const nextImages = moveImage(current, idx, 1)
                                    return {
                                      ...x,
                                      images: nextImages,
                                      image: nextImages[0] || '',
                                    }
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
                                listings: prev.listings.map((x) => {
                                  if (x.id !== item.id) return x
                                  const current = normalizeImages(x)
                                  const nextImages = current.filter((_, i) => i !== idx)
                                  return {
                                    ...x,
                                    images: nextImages,
                                    image: nextImages[0] || '',
                                  }
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
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                      setContent({
                        ...content,
                        listings: content.listings.filter((x) => x.id !== item.id),
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Add Spotlight</h3>
          <div className="admin-grid">
            <input
              placeholder="Title"
              value={newSpotlight.title}
              onChange={(e) => setNewSpotlight({ ...newSpotlight, title: e.target.value })}
            />
            <input
              placeholder="Location"
              value={newSpotlight.location}
              onChange={(e) => setNewSpotlight({ ...newSpotlight, location: e.target.value })}
            />
            <textarea
              className="span-2"
              rows="3"
              placeholder="Description"
              value={newSpotlight.description}
              onChange={(e) =>
                setNewSpotlight({ ...newSpotlight, description: e.target.value })
              }
            />
            <input
              placeholder="Price"
              value={newSpotlight.price}
              onChange={(e) => setNewSpotlight({ ...newSpotlight, price: e.target.value })}
            />
            <select
              value={newSpotlight.status}
              onChange={(e) => setNewSpotlight({ ...newSpotlight, status: e.target.value })}
            >
              <option>For Sale</option>
              <option>New Listing</option>
              <option>Hot Listing</option>
            </select>
            <textarea
              className="span-2"
              rows="3"
              placeholder="YouTube iframe (optional)"
              value={newSpotlight.videoIframe}
              onChange={(e) => setNewSpotlight({ ...newSpotlight, videoIframe: e.target.value })}
            />
            <div className="uploader span-2">
              <p>Spotlight Image</p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  await uploadDraft(file, 'spotlight', 'new-spotlight', (url) =>
                    setNewSpotlight((prev) => ({
                      ...prev,
                      image: prev.image || url,
                      images: [...(prev.images || []), url],
                    })),
                  )
                  e.target.value = ''
                }}
              />
              {newSpotlight.images?.length ? (
                <small>{newSpotlight.images.length} image(s) attached.</small>
              ) : null}
            </div>
            {newSpotlight.images?.length ? (
              <div className="gallery span-2">
                {newSpotlight.images.map((img, idx) => (
                  <div key={`new-spotlight-${idx}`} className="gallery-item">
                    <div className="gallery-preview" style={{ backgroundImage: `url(${img})` }} />
                    <div className="gallery-actions">
                      <button
                        type="button"
                        className="button tiny"
                        disabled={idx === 0}
                        onClick={() =>
                          setNewSpotlight((prev) => {
                            const nextImages = moveImage(prev.images || [], idx, -1)
                            return {
                              ...prev,
                              images: nextImages,
                              image: nextImages[0] || '',
                            }
                          })
                        }
                      >
                        Move Left
                      </button>
                      <button
                        type="button"
                        className="button tiny"
                        disabled={idx === newSpotlight.images.length - 1}
                        onClick={() =>
                          setNewSpotlight((prev) => {
                            const nextImages = moveImage(prev.images || [], idx, 1)
                            return {
                              ...prev,
                              images: nextImages,
                              image: nextImages[0] || '',
                            }
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
                        setNewSpotlight((prev) => {
                          const nextImages = prev.images.filter((_, i) => i !== idx)
                          return {
                            ...prev,
                            images: nextImages,
                            image: nextImages[0] || '',
                          }
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
          <button type="button" className="button" onClick={addSpotlight}>
            Add Spotlight
          </button>
        </section>

        <section className="panel">
          <h3>Manage Spotlight</h3>
          <div className="stack">
            {(content.spotlight || []).map((item) => (
              <article className="editor" key={item.id}>
                <div className="admin-grid">
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).map((x) =>
                          x.id === item.id ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.location}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).map((x) =>
                          x.id === item.id ? { ...x, location: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <textarea
                    className="span-2"
                    rows="3"
                    value={item.description || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).map((x) =>
                          x.id === item.id ? { ...x, description: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.price}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).map((x) =>
                          x.id === item.id ? { ...x, price: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <select
                    value={item.status}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).map((x) =>
                          x.id === item.id ? { ...x, status: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option>For Sale</option>
                    <option>New Listing</option>
                    <option>Hot Listing</option>
                  </select>
                  <textarea
                    className="span-2"
                    rows="3"
                    value={item.videoIframe || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).map((x) =>
                          x.id === item.id ? { ...x, videoIframe: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <div className="uploader span-2">
                    <p>Upload Spotlight Image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        await uploadAndPersist(file, 'spotlight', `spotlight-${item.id}`, (prev, url) => ({
                          ...prev,
                          spotlight: (prev.spotlight || []).map((x) =>
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
                        <div key={`${item.id}-spotlight-img-${idx}`} className="gallery-item">
                          <div className="gallery-preview" style={{ backgroundImage: `url(${img})` }} />
                          <div className="gallery-actions">
                            <button
                              type="button"
                              className="button tiny"
                              disabled={idx === 0}
                              onClick={() =>
                                setContent((prev) => ({
                                  ...prev,
                                  spotlight: (prev.spotlight || []).map((x) => {
                                    if (x.id !== item.id) return x
                                    const current = normalizeImages(x)
                                    const nextImages = moveImage(current, idx, -1)
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
                                  spotlight: (prev.spotlight || []).map((x) => {
                                    if (x.id !== item.id) return x
                                    const current = normalizeImages(x)
                                    const nextImages = moveImage(current, idx, 1)
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
                                spotlight: (prev.spotlight || []).map((x) => {
                                  if (x.id !== item.id) return x
                                  const current = normalizeImages(x)
                                  const nextImages = current.filter((_, i) => i !== idx)
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
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                      setContent({
                        ...content,
                        spotlight: (content.spotlight || []).filter((x) => x.id !== item.id),
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Add Blog</h3>
          <div className="admin-grid">
            <input
              placeholder="Title"
              value={newBlog.title}
              onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
            />
            <input
              placeholder="Category"
              value={newBlog.category}
              onChange={(e) => setNewBlog({ ...newBlog, category: e.target.value })}
            />
            <input
              type="date"
              value={newBlog.date}
              onChange={(e) => setNewBlog({ ...newBlog, date: e.target.value })}
            />
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
                          const nextImages = prev.images.filter((_, i) => i !== idx)
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
          <button type="button" className="button" onClick={addBlog}>
            Add Blog
          </button>
        </section>

        <section className="panel">
          <h3>Manage Blogs</h3>
          <div className="stack">
            {(content.blogs || []).map((item) => (
              <article className="editor" key={item.id}>
                <div className="admin-grid">
                  <input
                    value={item.title}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        blogs: (content.blogs || []).map((x) =>
                          x.id === item.id ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    value={item.category || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        blogs: (content.blogs || []).map((x) =>
                          x.id === item.id ? { ...x, category: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    type="date"
                    value={item.date || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        blogs: (content.blogs || []).map((x) =>
                          x.id === item.id ? { ...x, date: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <textarea
                    className="span-2"
                    rows="3"
                    value={item.excerpt || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        blogs: (content.blogs || []).map((x) =>
                          x.id === item.id ? { ...x, excerpt: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <textarea
                    className="span-2"
                    rows="6"
                    value={item.content || ''}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        blogs: (content.blogs || []).map((x) =>
                          x.id === item.id ? { ...x, content: e.target.value } : x,
                        ),
                      })
                    }
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
                                    const current = normalizeImages(x)
                                    const nextImages = moveImage(current, idx, -1)
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
                                    const current = normalizeImages(x)
                                    const nextImages = moveImage(current, idx, 1)
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
                                  const current = normalizeImages(x)
                                  const nextImages = current.filter((_, i) => i !== idx)
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
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                      setContent({
                        ...content,
                        blogs: (content.blogs || []).filter((x) => x.id !== item.id),
                      })
                    }
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
