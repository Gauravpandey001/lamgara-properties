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
