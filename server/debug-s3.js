import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

dotenv.config()
const app = express()
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})
app.use(cors())
app.use(express.json({ limit: '5mb' }))
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/test', async (_req, res) => {
  const command = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: 'x', ContentType: 'text/plain' })
  const url = await getSignedUrl(s3, command, { expiresIn: 60 })
  res.json({ url: !!url })
})
app.listen(4022, () => console.log('debug s3 on :4022'))
