import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { defaultContent } from '../src/data/defaultContent.js'

const DB_PATH = process.env.SQLITE_DB_PATH || './server/data/lamgara.db'

const ensureDbDirectory = async () => {
  const dir = path.dirname(DB_PATH)
  await fs.mkdir(dir, { recursive: true })
}

export const initDb = async () => {
  await ensureDbDirectory()

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS location_cache (
      query_key TEXT PRIMARY KEY,
      query_text TEXT NOT NULL,
      lat REAL,
      lon REAL,
      display_name TEXT,
      found INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  const row = await db.get('SELECT id FROM site_content WHERE id = 1')

  if (!row) {
    await db.run(
      'INSERT INTO site_content (id, data, updated_at) VALUES (1, ?, ?)',
      JSON.stringify(defaultContent),
      new Date().toISOString(),
    )
  }

  return db
}

export const getContent = async (db) => {
  const row = await db.get('SELECT data, updated_at FROM site_content WHERE id = 1')

  if (!row) {
    return { content: defaultContent, updatedAt: null }
  }

  return {
    content: JSON.parse(row.data),
    updatedAt: row.updated_at,
  }
}

export const saveContent = async (db, content) => {
  const updatedAt = new Date().toISOString()
  await db.run(
    'UPDATE site_content SET data = ?, updated_at = ? WHERE id = 1',
    JSON.stringify(content),
    updatedAt,
  )

  return { updatedAt }
}

export const saveInquiry = async (db, inquiry) => {
  const createdAt = new Date().toISOString()
  const { name, phone, email, message } = inquiry

  const result = await db.run(
    'INSERT INTO inquiries (name, phone, email, message, created_at) VALUES (?, ?, ?, ?, ?)',
    name,
    phone,
    email,
    message,
    createdAt,
  )

  return { id: result.lastID, createdAt }
}

export const getCachedLocation = async (db, queryKey) =>
  db.get(
    'SELECT query_text, lat, lon, display_name, found, updated_at FROM location_cache WHERE query_key = ?',
    queryKey,
  )

export const upsertCachedLocation = async (db, queryKey, payload) => {
  const updatedAt = new Date().toISOString()
  const { queryText, lat, lon, displayName, found } = payload
  await db.run(
    `
      INSERT INTO location_cache (query_key, query_text, lat, lon, display_name, found, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(query_key) DO UPDATE SET
        query_text = excluded.query_text,
        lat = excluded.lat,
        lon = excluded.lon,
        display_name = excluded.display_name,
        found = excluded.found,
        updated_at = excluded.updated_at
    `,
    queryKey,
    queryText,
    lat ?? null,
    lon ?? null,
    displayName ?? null,
    found ? 1 : 0,
    updatedAt,
  )
}
