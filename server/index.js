import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import nodemailer from 'nodemailer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  getCachedLocation,
  getContent,
  initDb,
  saveContent,
  saveInquiry,
  upsertCachedLocation,
} from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const staticRoot = path.resolve(__dirname, '../dist')
const hasBuiltFrontend =
  fs.existsSync(path.join(staticRoot, 'index.html')) && fs.existsSync(path.join(staticRoot, 'assets'))
const adminUsername = (process.env.ADMIN_USERNAME || '').trim()
const adminPassword = process.env.ADMIN_PASSWORD || ''
const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim().toLowerCase()
const authSecret = process.env.ADMIN_JWT_SECRET || ''
const authTokenTtlSeconds = Number(process.env.ADMIN_TOKEN_TTL_SECONDS || 60 * 60 * 12)
const sitemapPaths = ['/', '/properties', '/about', '/blog', '/contact']
const nearbyRadiusKm = Number(process.env.SEARCH_NEARBY_RADIUS_KM || 60)
const inquiryNotificationEmail = (process.env.INQUIRY_NOTIFICATION_EMAIL || 'lamgaraproperties@gmail.com').trim()
const smtpHost = (process.env.SMTP_HOST || '').trim()
const smtpPort = Number(process.env.SMTP_PORT || 465)
const smtpUser = (process.env.SMTP_USER || '').trim()
const smtpPass = process.env.SMTP_PASS || ''
const smtpFromEmail = (process.env.SMTP_FROM_EMAIL || smtpUser || inquiryNotificationEmail).trim()
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false'

const requiredEnv = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
]

const missingEnv = requiredEnv.filter((name) => !process.env[name])

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const db = await initDb()
let mailTransporter = null

const getMailTransporter = () => {
  if (mailTransporter) return mailTransporter
  if (!smtpHost || !smtpUser || !smtpPass) return null

  mailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  return mailTransporter
}

const parseOrigins = (raw) =>
  (raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const isLocalhostOrigin = (origin) => {
  try {
    const parsed = new URL(origin)
    return ['localhost', '127.0.0.1'].includes(parsed.hostname)
  } catch {
    return false
  }
}

const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN)
const corsOrigin = (origin, callback) => {
  if (!origin) {
    callback(null, true)
    return
  }

  if (configuredOrigins.length > 0) {
    callback(null, configuredOrigins.includes(origin))
    return
  }

  callback(null, isLocalhostOrigin(origin))
}

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  }),
)
app.use(express.json({ limit: '5mb' }))

const secureEqual = (a, b) => {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  if (aBuffer.length !== bBuffer.length) return false
  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

const normalizeHash = (value) => value.replace(/^sha256[:$]/, '').trim()

const isAuthConfigured = Boolean(adminUsername && authSecret && (adminPassword || adminPasswordHash))

const isValidPassword = (inputPassword) => {
  if (adminPasswordHash) {
    return secureEqual(sha256(inputPassword), normalizeHash(adminPasswordHash))
  }

  return secureEqual(inputPassword, adminPassword)
}

const signToken = (payload) => {
  const headerEncoded = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', authSecret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64url')
  return `${headerEncoded}.${payloadEncoded}.${signature}`
}

const verifyToken = (token) => {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const expected = crypto
    .createHmac('sha256', authSecret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  if (!secureEqual(signature, expected)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

const getBearerToken = (req) => {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

const requireAdmin = (req, res, next) => {
  if (!isAuthConfigured) {
    res.status(503).json({ error: 'Admin authentication is not configured on server.' })
    return
  }

  const token = getBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  req.admin = { username: payload.sub }
  next()
}

app.get('/api/health', (_req, res) => {
  if (missingEnv.length) {
    res.status(500).json({ ok: false, missingEnv })
    return
  }

  res.json({ ok: true })
})

app.get('/api/content', async (_req, res) => {
  try {
    const content = await getContent(db)
    res.json(content)
  } catch {
    res.status(500).json({ error: 'Failed to read content' })
  }
})

app.post('/api/auth/login', (req, res) => {
  if (!isAuthConfigured) {
    res.status(503).json({ error: 'Admin authentication is not configured on server.' })
    return
  }

  const { username, password } = req.body || {}
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' })
    return
  }

  const userOk = secureEqual(String(username).trim(), adminUsername)
  const passwordOk = isValidPassword(String(password))
  if (!userOk || !passwordOk) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + authTokenTtlSeconds
  const token = signToken({ sub: adminUsername, iat: issuedAt, exp: expiresAt })
  res.json({ ok: true, token, expiresAt })
})

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ ok: true, user: { username: req.admin.username } })
})

app.put('/api/content', requireAdmin, async (req, res) => {
  const content = req.body?.content

  if (!content || typeof content !== 'object') {
    res.status(400).json({ error: 'content object is required' })
    return
  }

  try {
    const result = await saveContent(db, content)
    res.json({ ok: true, ...result })
  } catch {
    res.status(500).json({ error: 'Failed to save content' })
  }
})

const safeName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const allowedFolders = new Set(['hero', 'listings', 'spotlight', 'blogs'])

const toNumberOrNull = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toSafeText = (value) => (typeof value === 'string' ? value : String(value ?? ''))
const escapeHtml = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const haversineKm = (aLat, aLon, bLat, bLon) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

const normalizeLocationKey = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ')

const geocodeLocation = async (query) => {
  const normalized = normalizeLocationKey(query)
  if (!normalized) return { found: false }

  const cached = await getCachedLocation(db, normalized)
  if (cached) {
    return {
      found: Boolean(cached.found),
      lat: toNumberOrNull(cached.lat),
      lon: toNumberOrNull(cached.lon),
      displayName: cached.display_name || query,
      source: 'cache',
    }
  }

  const email = process.env.NOMINATIM_EMAIL ? `&email=${encodeURIComponent(process.env.NOMINATIM_EMAIL)}` : ''
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}${email}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'lamgara-properties/1.0',
    },
  })

  if (!response.ok) {
    throw new Error('Geocoding provider error')
  }

  const data = await response.json()
  if (!Array.isArray(data) || !data[0]) {
    await upsertCachedLocation(db, normalized, {
      queryText: query,
      lat: null,
      lon: null,
      displayName: query,
      found: false,
    })
    return { found: false, source: 'provider' }
  }

  const first = data[0]
  const lat = toNumberOrNull(first.lat)
  const lon = toNumberOrNull(first.lon)
  const displayName = first.display_name || query
  await upsertCachedLocation(db, normalized, {
    queryText: query,
    lat,
    lon,
    displayName,
    found: lat !== null && lon !== null,
  })

  return { found: lat !== null && lon !== null, lat, lon, displayName, source: 'provider' }
}

const listingCoordinates = async (listing) => {
  const lat = toNumberOrNull(listing.latitude ?? listing.lat)
  const lon = toNumberOrNull(listing.longitude ?? listing.lng ?? listing.lon)
  if (lat !== null && lon !== null) return { lat, lon, source: 'listing' }

  const locationQuery = toSafeText(listing.location).trim()
  if (!locationQuery) return null

  try {
    const resolved = await geocodeLocation(locationQuery)
    if (!resolved.found) return null
    return { lat: resolved.lat, lon: resolved.lon, source: resolved.source }
  } catch {
    return null
  }
}

const sanitizeHost = (value) => String(value || '').replace(/[^a-z0-9.:_-]/gi, '')

const getPublicBaseUrl = (req) => {
  const fromEnv = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  const host = sanitizeHost(req.get('host'))
  return `${req.protocol}://${host}`
}

app.get('/robots.txt', (req, res) => {
  const base = getPublicBaseUrl(req)
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`)
})

app.get('/sitemap.xml', (req, res) => {
  const base = getPublicBaseUrl(req)
  const urls = sitemapPaths
    .map((route) => {
      const loc = route === '/' ? base : `${base}${route}`
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <changefreq>${route === '/blog' ? 'weekly' : route === '/' ? 'daily' : 'monthly'}</changefreq>`,
        `    <priority>${route === '/' ? '1.0' : route === '/properties' ? '0.9' : '0.7'}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', urls, '</urlset>'].join('\n')
  res.type('application/xml').send(xml)
})

app.post('/api/inquiries', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const phone = String(req.body?.phone || '').trim()
  const email = String(req.body?.email || '').trim()
  const message = String(req.body?.message || '').trim()
  const property = req.body?.property && typeof req.body.property === 'object' ? req.body.property : null
  const propertyId = String(property?.id || '').trim()
  const propertyTitle = String(property?.title || '').trim()
  const propertyLocation = String(property?.location || '').trim()
  const propertyPrice = String(property?.price || '').trim()
  const propertyUrl = String(property?.url || '').trim()

  if (!name || !phone || !email || !message) {
    res.status(400).json({ error: 'name, phone, email and message are required' })
    return
  }

  if (name.length > 120 || phone.length > 40 || email.length > 160 || message.length > 4000) {
    res.status(400).json({ error: 'One or more fields exceed allowed length' })
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email format' })
    return
  }

  if (propertyUrl && propertyUrl.length > 500) {
    res.status(400).json({ error: 'Property URL is too long' })
    return
  }

  const propertySummary = propertyTitle
    ? [
        '[Property Interest]',
        `Title: ${propertyTitle}`,
        propertyId ? `ID: ${propertyId}` : null,
        propertyLocation ? `Location: ${propertyLocation}` : null,
        propertyPrice ? `Price: ${propertyPrice}` : null,
        propertyUrl ? `URL: ${propertyUrl}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : ''
  const persistedMessage = propertySummary ? `${propertySummary}\n\n${message}` : message

  try {
    const result = await saveInquiry(db, { name, phone, email, message: persistedMessage })

    let mailSent = false
    const transporter = getMailTransporter()
    if (transporter) {
      try {
        const escapedName = escapeHtml(name)
        const escapedPhone = escapeHtml(phone)
        const escapedEmail = escapeHtml(email)
        const escapedTitle = escapeHtml(propertyTitle)
        const escapedId = escapeHtml(propertyId)
        const escapedLocation = escapeHtml(propertyLocation)
        const escapedPrice = escapeHtml(propertyPrice)
        const escapedUrl = escapeHtml(propertyUrl)
        const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>')
        const htmlBody = `
          <h2>New Property Inquiry</h2>
          <p><strong>Name:</strong> ${escapedName}</p>
          <p><strong>Phone:</strong> ${escapedPhone}</p>
          <p><strong>Email:</strong> ${escapedEmail}</p>
          ${propertyTitle ? `<p><strong>Interested Property:</strong> ${escapedTitle}</p>` : ''}
          ${propertyId ? `<p><strong>Property ID:</strong> ${escapedId}</p>` : ''}
          ${propertyLocation ? `<p><strong>Location:</strong> ${escapedLocation}</p>` : ''}
          ${propertyPrice ? `<p><strong>Price:</strong> ${escapedPrice}</p>` : ''}
          ${propertyUrl ? `<p><strong>Property Link:</strong> <a href="${escapedUrl}">${escapedUrl}</a></p>` : ''}
          <p><strong>Message:</strong></p>
          <p>${escapedMessage}</p>
          <hr />
          <p><small>Saved inquiry ID: ${result.id}</small></p>
        `

        await transporter.sendMail({
          from: smtpFromEmail,
          to: inquiryNotificationEmail,
          replyTo: email,
          subject: propertyTitle
            ? `Property Inquiry: ${propertyTitle}`
            : 'New Inquiry from Lamgara Properties',
          text: persistedMessage,
          html: htmlBody,
        })
        mailSent = true
      } catch (mailError) {
        console.error('Inquiry email delivery failed:', mailError)
      }
    }

    res.status(201).json({
      ok: true,
      inquiryId: result.id,
      createdAt: result.createdAt,
      mailSent,
    })
  } catch (error) {
    console.error('Inquiry save failed:', error)
    res.status(500).json({ error: 'Failed to save inquiry' })
  }
})

app.get('/api/geocode', async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) {
    res.status(400).json({ error: 'q query is required' })
    return
  }

  try {
    const resolved = await geocodeLocation(query)
    if (!resolved.found) {
      res.json({ found: false })
      return
    }

    res.json({
      found: true,
      lat: resolved.lat,
      lon: resolved.lon,
      displayName: resolved.displayName || query,
    })
  } catch {
    res.status(502).json({ error: 'Geocoding provider error' })
  }
})

app.get('/api/search/properties', async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) {
    res.status(400).json({ error: 'q query is required' })
    return
  }

  const category = String(req.query.category || 'All').trim()

  try {
    const payload = await getContent(db)
    const listings = Array.isArray(payload.content?.listings) ? payload.content.listings : []
    const filtered = listings.filter((item) =>
      category === 'All' ? true : toSafeText(item.category) === category,
    )

    const exactTerm = query.toLowerCase()
    const resolved = await geocodeLocation(query)
    const ranked = []

    for (const listing of filtered) {
      const exactLocalityMatch = toSafeText(listing.location).toLowerCase().includes(exactTerm)
      let distanceKm = null

      if (resolved.found) {
        const coords = await listingCoordinates(listing)
        if (coords) {
          distanceKm = haversineKm(resolved.lat, resolved.lon, coords.lat, coords.lon)
        }
      }

      ranked.push({
        ...listing,
        exactLocalityMatch,
        distanceKm,
      })
    }

    ranked.sort((a, b) => {
      if (a.exactLocalityMatch && !b.exactLocalityMatch) return -1
      if (!a.exactLocalityMatch && b.exactLocalityMatch) return 1

      const aHasDistance = Number.isFinite(a.distanceKm)
      const bHasDistance = Number.isFinite(b.distanceKm)
      if (aHasDistance && bHasDistance) return a.distanceKm - b.distanceKm
      if (aHasDistance) return -1
      if (bHasDistance) return 1
      return toSafeText(a.title).localeCompare(toSafeText(b.title))
    })

    const nearestProperty =
      ranked.find((item) => Number.isFinite(item.distanceKm)) ||
      ranked.find((item) => item.exactLocalityMatch) ||
      null

    const nearby = ranked.filter(
      (item) => item.exactLocalityMatch || (Number.isFinite(item.distanceKm) && item.distanceKm <= nearbyRadiusKm),
    )

    res.json({
      ok: true,
      found: resolved.found,
      query,
      category,
      nearbyRadiusKm,
      resolvedLocation: resolved.found
        ? { lat: resolved.lat, lon: resolved.lon, displayName: resolved.displayName || query }
        : null,
      nearestProperty,
      totalMatches: ranked.length,
      nearbyCount: nearby.length,
      results: nearby.length ? nearby : ranked,
    })
  } catch {
    res.status(500).json({ error: 'Location search failed' })
  }
})

app.post('/api/uploads/presign', requireAdmin, async (req, res) => {
  if (missingEnv.length) {
    res.status(500).json({ error: 'Missing required server env vars', missingEnv })
    return
  }

  const { filename, contentType, folder } = req.body || {}

  if (!filename || !folder) {
    res.status(400).json({ error: 'filename and folder are required' })
    return
  }

  if (!allowedFolders.has(folder)) {
    res.status(400).json({ error: 'Invalid folder' })
    return
  }

  const cleaned = safeName(filename)
  const key = `${folder}/${Date.now()}-${cleaned || 'upload-file'}`

  try {
    const commandParams = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
    }

    // Keep ContentType optional to avoid signature mismatch if browser omits/changes it.
    if (contentType && typeof contentType === 'string') {
      commandParams.ContentType = contentType
    }

    const command = new PutObjectCommand(commandParams)

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    const publicBase = process.env.S3_PUBLIC_BASE_URL
      ? process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')
      : `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`

    res.json({
      uploadUrl,
      key,
      fileUrl: `${publicBase}/${key}`,
    })
  } catch (error) {
    console.error('presign_failed', error)
    res.status(500).json({ error: 'Failed to create upload URL' })
  }
})

if (hasBuiltFrontend) {
  app.use(express.static(staticRoot))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'))
  })
} else {
  console.warn('frontend build missing: run `npm run build` to generate ./dist assets')
  app.get(/^\/(?!api).*/, (_req, res) => {
    res
      .status(503)
      .type('text/plain')
      .send('Frontend build is missing. Run `npm run build` and restart the server.')
  })
}

app.listen(port, () => {
  console.log(`api listening on :${port}`)
})
