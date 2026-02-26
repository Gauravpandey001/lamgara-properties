import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { getContent, initDb } from './db.js'

dotenv.config()
const app = express()
const db = await initDb()
app.use(cors())
app.use(express.json({ limit: '5mb' }))
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.get('/api/content', async (_req, res) => res.json(await getContent(db)))
app.listen(4021, () => console.log('debug no s3 on :4021'))
