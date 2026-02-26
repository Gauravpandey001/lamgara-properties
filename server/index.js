import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getContent, initDb, saveContent } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)

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

app.put('/api/content', async (req, res) => {
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

const allowedFolders = new Set(['hero', 'listings', 'spotlight'])

app.post('/api/uploads/presign', async (req, res) => {
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

app.listen(port, () => {
  console.log(`api listening on :${port}`)
})
