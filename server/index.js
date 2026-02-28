import express from 'express'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getContent, initDb, saveContent } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const staticRoot = path.resolve(__dirname, '../dist')
const adminUsername = (process.env.ADMIN_USERNAME || '').trim()
const adminPassword = process.env.ADMIN_PASSWORD || ''
const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim().toLowerCase()
const authSecret = process.env.ADMIN_JWT_SECRET || ''
const authTokenTtlSeconds = Number(process.env.ADMIN_TOKEN_TTL_SECONDS || 60 * 60 * 12)

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

app.use(cors())
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

app.use(express.static(staticRoot))
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'))
})

app.listen(port, () => {
  console.log(`api listening on :${port}`)
})
