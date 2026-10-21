// The migrations as D1 runs them, on an in-memory SQLite: here, 0008 (integer positions → fractional-indexing keys) on rows
// written with the schema before it
import { integerKey } from '@map/shared'
import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'

// Tests run from backend/
const folder = 'drizzle/'
const files = readdirSync(folder).filter((f) => f.endsWith('.sql')).sort()
const run = (db: DatabaseSync, file: string) => {
  for (const statement of readFileSync(folder + file, 'utf8').split('--> statement-breakpoint')) db.exec(statement)
}

const TABLES = ['projects', 'notes', 'folders', 'articles', 'object_cards']

describe('0008: positions become keys', () => {
  const db = new DatabaseSync(':memory:')
  const before = files.filter((f) => f < '0008')
  for (const file of before) run(db, file)
  const now = Math.floor(Date.now() / 1000)
  for (const user of ['u1', 'u2']) db.prepare('INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(user, user, `${user}@x.test`, now, now)
  // 6000 rows per table (keys up to the three-digit ones: c000…): two users, some pinned, every old position 0
  db.exec('BEGIN')
  for (const table of TABLES) {
    const insert = db.prepare(`INSERT INTO ${table} (user_id, title, created_at, updated_at, pinned, position) VALUES (?, ?, ?, ?, ?, 0)`)
    for (let i = 0; i < 6000; i++) insert.run(i % 3 === 0 ? 'u2' : 'u1', `t${i}`, now, now, i % 7 === 0 ? 1 : 0)
  }
  db.exec('COMMIT')
  const order = (table: string, user: string) =>
    (db.prepare(`SELECT id FROM ${table} WHERE user_id = ? AND archived = 0 ORDER BY pinned DESC, position, id`).all(user) as { id: number }[]).map((r) => r.id)
  const old = Object.fromEntries(TABLES.map((t) => [t, [order(t, 'u1'), order(t, 'u2')]]))
  run(db, files.find((f) => f.startsWith('0008'))!)

  it('gives each user\'s rows the keys a0, a1, … in the order they had', () => {
    for (const table of TABLES) {
      for (const [i, user] of ['u1', 'u2'].entries()) {
        const rows = db.prepare(`SELECT id, position FROM ${table} WHERE user_id = ? ORDER BY pinned DESC, position, id`).all(user) as { id: number; position: string }[]
        expect(rows.map((r) => r.id)).toEqual(old[table][i])
        expect(rows.map((r) => r.position)).toEqual(rows.map((_, n) => integerKey(n)))
      }
    }
  })

  it('makes position a text column with the list index back, and reads a group\'s last key through it', () => {
    for (const table of TABLES) {
      const column = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; type: string }[]).find((c) => c.name === 'position')
      expect(column?.type.toLowerCase()).toBe('text')
      const linked = table !== 'projects'
      const plan = db
        .prepare(
          `EXPLAIN QUERY PLAN SELECT position FROM ${table} WHERE user_id = ? AND archived = 0 ${linked ? 'AND object_type IS NULL AND object_id IS NULL' : ''} AND pinned = 0 ORDER BY position DESC, id DESC LIMIT 1`,
        )
        .all('u1') as { detail: string }[]
      const text = plan.map((p) => p.detail).join(' | ')
      expect(text).toContain(`${table}_list_idx`)
      expect(text).not.toContain('TEMP B-TREE')
    }
  })
})
