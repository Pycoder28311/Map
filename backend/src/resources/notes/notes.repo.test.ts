import { noteFilter, noteInput, noteUpdate, previewOf } from '@map/shared'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { notesRepo } from './notes.repo'

// The real schema in a real in-memory SQLite, created from the SQL drizzle-kit writes for it
const sqlite = new DatabaseSync(':memory:')
for (const statement of await generateSQLiteMigration(await generateSQLiteDrizzleJson({}), await generateSQLiteDrizzleJson(schema))) sqlite.exec(statement)
const db = drizzle(
  async (query, params, method) => {
    const stmt = sqlite.prepare(query)
    if (method === 'run') {
      stmt.run(...params)
      return { rows: [] }
    }
    const rows = stmt.all(...params).map((row) => Object.values(row))
    return { rows: method === 'get' ? rows[0] : rows } // .get() expects one row, the others a list
  },
  { schema },
)
const now = Math.floor(Date.now() / 1000)
for (const id of ['me', 'other']) {
  sqlite.prepare('INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(id, id, `${id}@x.test`, now, now)
}
const ctx = (id: string) => ({ db, env: {} as CloudflareBindings, user: { id } }) as unknown as Ctx

// What the routes do before the repo: the contract parses (and cleans) the body
const create = (body: unknown, as = 'me') => notesRepo.create(ctx(as), noteInput.parse(body))
const update = (id: number, body: unknown, as = 'me') => notesRepo.update(ctx(as), id, noteUpdate.parse(body))
const list = (as = 'me', archived = 'false') => notesRepo.list(ctx(as), { limit: 20, cursor: null }, noteFilter.parse({ archived }))

describe('notes repo: preview', () => {
  it('writes the preview with the content on create', async () => {
    const note = await create({ title: 't', content: '<h2>Hello</h2><p>big <strong>world</strong></p>' })
    expect(note.preview).toBe('Hello big world')
    expect(note.content).toBe('<h2>Hello</h2><p>big <strong>world</strong></p>')
  })

  it('makes the preview from the cleaned content, not from what was sent', async () => {
    const note = await create({ content: '<p>safe</p><script>alert(1)</script><p onclick="x()">text</p>' })
    expect(note.content).toBe('<p>safe</p><p>text</p>')
    expect(note.preview).toBe('safe text')
  })

  it('cuts a long content at a whole word with an ellipsis', async () => {
    const note = await create({ content: `<p>${'word '.repeat(200)}</p>` })
    expect(note.preview).toBe(previewOf(note.content))
    expect(note.preview.endsWith('…')).toBe(true)
    expect(note.preview.length).toBeLessThanOrEqual(151)
  })

  it('does not let a client set the preview', async () => {
    const note = await create({ title: 't', content: '<p>real</p>', preview: 'fake' })
    expect(note.preview).toBe('real')
    const changed = await update(note.id, { preview: 'fake' })
    expect(changed?.preview).toBe('real')
  })

  it('changes the preview with the content, and only then', async () => {
    const note = await create({ content: '<p>first</p>' })
    expect((await update(note.id, { title: 'new title' }))?.preview).toBe('first')
    expect((await update(note.id, { pinned: true, archived: false }))?.preview).toBe('first')
    const changed = await update(note.id, { content: '<p>second</p>' })
    expect(changed?.preview).toBe('second')
    expect((await notesRepo.get(ctx('me'), note.id))?.preview).toBe('second')
  })

  it('empties the preview when the content is emptied', async () => {
    const note = await create({ title: 'only a title', content: '<p>words</p>' })
    expect((await update(note.id, { content: '' }))?.preview).toBe('')
  })
})

describe('notes repo: list', () => {
  it('returns the preview and not the content', async () => {
    await create({ title: 'listed', content: '<p>some words here</p>' }, 'other')
    const { items } = await list('other')
    expect(items).toHaveLength(1)
    expect(items[0].preview).toBe('some words here')
    expect(items[0]).not.toHaveProperty('content')
    expect(Object.keys(items[0]).sort()).toEqual(['archived', 'createdAt', 'id', 'pinned', 'position', 'preview', 'title', 'updatedAt'])
  })

  it('does not read the content column at all', () => {
    const selected: string[] = []
    const real = sqlite.prepare.bind(sqlite)
    sqlite.prepare = ((query: string) => (selected.push(query), real(query))) as typeof sqlite.prepare
    return list('other').finally(() => {
      sqlite.prepare = real
      const listQuery = selected.find((q) => /from "notes"/i.test(q) && /order by/i.test(q)) ?? ''
      expect(listQuery).toContain('"preview"')
      expect(listQuery).not.toContain('"content"')
    })
  })

  it('still gives the whole note on get', async () => {
    const note = await create({ content: '<p>whole</p>' })
    expect((await notesRepo.get(ctx('me'), note.id))?.content).toBe('<p>whole</p>')
  })

  it('keeps each user to their own notes', async () => {
    const note = await create({ content: '<p>mine</p>' })
    expect(await notesRepo.get(ctx('other'), note.id)).toBeNull()
    expect(await update(note.id, { content: '<p>hijack</p>' }, 'other')).toBeNull()
    expect(await notesRepo.remove(ctx('other'), note.id)).toBe(false)
    expect((await notesRepo.get(ctx('me'), note.id))?.preview).toBe('mine')
  })
})
