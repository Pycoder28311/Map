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

describe('0011 + 0012: sharing and messages', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON') // as D1
  for (const file of files.filter((f) => f < '0011')) run(db, file)
  const now = Math.floor(Date.now() / 1000)
  const addUser = (id: string) => db.prepare('INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(id, id, `${id}@x.test`, now, now)
  addUser('owner')
  addUser('other')
  // A row of each table written before the migrations
  for (const table of TABLES) db.prepare(`INSERT INTO ${table} (user_id, title, created_at, updated_at) VALUES ('owner', 'old', ?, ?)`).run(now, now)
  for (const file of files.filter((f) => f >= '0011')) run(db, file)
  const NAMES: Record<string, string> = { projects: 'projects', notes: 'notes', folders: 'folders', articles: 'articles', object_cards: 'objectCards' }

  it('only adds columns: the old rows keep their data and get private, version 0', () => {
    for (const table of TABLES) {
      expect(db.prepare(`SELECT title, visibility, version, edited_by FROM ${table}`).all()[0]).toEqual({ title: 'old', visibility: 'private', version: 0, edited_by: null })
    }
  })

  it('deleting a row deletes its rights (each table its own type), and nothing else', () => {
    const give = (type: string, id: number) =>
      db.prepare("INSERT INTO object_rights (object_type, object_id, user_id, role, created_at) VALUES (?, ?, 'other', 'reader', ?)").run(type, id, now)
    for (const table of TABLES) give(NAMES[table], 1)
    db.prepare('DELETE FROM notes WHERE id = 1').run()
    const left = (db.prepare('SELECT object_type FROM object_rights ORDER BY object_type').all() as { object_type: string }[]).map((r) => r.object_type)
    expect(left).toEqual(['articles', 'folders', 'objectCards', 'projects'])
  })

  it('an account deleted with its rows takes their rights with it (the cascade runs the triggers)', () => {
    db.prepare("DELETE FROM user WHERE id = 'owner'").run()
    expect(db.prepare('SELECT count(*) AS n FROM object_rights').all()[0]).toEqual({ n: 0 })
  })

  it('refuses an unknown table or role, and a person twice on one row', () => {
    addUser('owner')
    db.prepare("INSERT INTO notes (user_id, title, created_at, updated_at) VALUES ('owner', 'n', ?, ?)").run(now, now)
    const insert = db.prepare('INSERT INTO object_rights (object_type, object_id, user_id, role, created_at) VALUES (?, 2, ?, ?, ?)')
    expect(() => insert.run('layouts', 'other', 'reader', now)).toThrow()
    expect(() => insert.run('notes', 'other', 'admin', now)).toThrow()
    insert.run('notes', 'other', 'reader', now)
    expect(() => insert.run('notes', 'other', 'editor', now)).toThrow()
  })

  it('messages: go with their article; a deleted author becomes null; never empty', () => {
    db.prepare("INSERT INTO articles (user_id, title, created_at, updated_at) VALUES ('owner', 'a', ?, ?)").run(now, now)
    const article = (db.prepare('SELECT max(id) AS id FROM articles').all()[0] as { id: number }).id
    const add = db.prepare('INSERT INTO messages (article_id, user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    expect(() => add.run(article, 'other', '', '', now, now)).toThrow()
    add.run(article, 'other', 't', '', now, now)
    db.prepare("DELETE FROM user WHERE id = 'other'").run()
    expect(db.prepare('SELECT user_id FROM messages').all()[0]).toEqual({ user_id: null })
    db.prepare('DELETE FROM articles WHERE id = ?').run(article)
    expect(db.prepare('SELECT count(*) AS n FROM messages').all()[0]).toEqual({ n: 0 })
  })
})

describe('0013: articles get autolinkers', () => {
  it('only adds the column: an old article keeps its data and starts with none', () => {
    const db = new DatabaseSync(':memory:')
    for (const file of files.filter((f) => f < '0013')) run(db, file)
    const now = Math.floor(Date.now() / 1000)
    db.prepare("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('u', 'u', 'u@x.test', 1, ?, ?)").run(now, now)
    db.prepare("INSERT INTO articles (user_id, title, content, created_at, updated_at) VALUES ('u', 'old', '<p>x</p>', ?, ?)").run(now, now)
    run(db, files.find((f) => f.startsWith('0013'))!)
    expect(db.prepare('SELECT title, content, autolinkers FROM articles').all()[0]).toEqual({ title: 'old', content: '<p>x</p>', autolinkers: '[]' })
  })
})
