import { previewOf, projectFilter, projectInput, projectUpdate } from '@map/shared'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { projectsRepo } from './projects.repo'

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
const create = (body: unknown, as = 'me') => projectsRepo.create(ctx(as), projectInput.parse(body))
const update = (id: number, body: unknown, as = 'me') => projectsRepo.update(ctx(as), id, projectUpdate.parse(body))
const list = (as = 'me', archived = 'false') => projectsRepo.list(ctx(as), { limit: 20, cursor: null }, projectFilter.parse({ archived }))

describe('projects repo: preview', () => {
  it('writes the preview with the content on create', async () => {
    const project = await create({ title: 't', content: '<h2>Hello</h2><p>big <strong>world</strong></p>' })
    expect(project.preview).toBe('Hello big world')
    expect(project.content).toBe('<h2>Hello</h2><p>big <strong>world</strong></p>')
  })

  it('makes the preview from the cleaned content, not from what was sent', async () => {
    const project = await create({ content: '<p>safe</p><script>alert(1)</script><p onclick="x()">text</p>' })
    expect(project.content).toBe('<p>safe</p><p>text</p>')
    expect(project.preview).toBe('safe text')
  })

  it('cuts a long content at a whole word with an ellipsis', async () => {
    const project = await create({ content: `<p>${'word '.repeat(200)}</p>` })
    expect(project.preview).toBe(previewOf(project.content))
    expect(project.preview.endsWith('…')).toBe(true)
    expect(project.preview.length).toBeLessThanOrEqual(151)
  })

  it('does not let a client set the preview', async () => {
    const project = await create({ title: 't', content: '<p>real</p>', preview: 'fake' })
    expect(project.preview).toBe('real')
    const changed = await update(project.id, { preview: 'fake' })
    expect(changed?.preview).toBe('real')
  })

  it('changes the preview with the content, and only then', async () => {
    const project = await create({ content: '<p>first</p>' })
    expect((await update(project.id, { title: 'new title' }))?.preview).toBe('first')
    expect((await update(project.id, { pinned: true, archived: false }))?.preview).toBe('first')
    const changed = await update(project.id, { content: '<p>second</p>' })
    expect(changed?.preview).toBe('second')
    expect((await projectsRepo.get(ctx('me'), project.id))?.preview).toBe('second')
  })

  it('empties the preview when the content is emptied', async () => {
    const project = await create({ title: 'only a title', content: '<p>words</p>' })
    expect((await update(project.id, { content: '' }))?.preview).toBe('')
  })
})

describe('projects repo: list', () => {
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
      const listQuery = selected.find((q) => /from "projects"/i.test(q) && /order by/i.test(q)) ?? ''
      expect(listQuery).toContain('"preview"')
      expect(listQuery).not.toContain('"content"')
    })
  })

  it('still gives the whole project on get', async () => {
    const project = await create({ content: '<p>whole</p>' })
    expect((await projectsRepo.get(ctx('me'), project.id))?.content).toBe('<p>whole</p>')
  })

  it('keeps each user to their own projects', async () => {
    const project = await create({ content: '<p>mine</p>' })
    expect(await projectsRepo.get(ctx('other'), project.id)).toBeNull()
    expect(await update(project.id, { content: '<p>hijack</p>' }, 'other')).toBeNull()
    expect(await projectsRepo.remove(ctx('other'), project.id)).toBe(false)
    expect((await projectsRepo.get(ctx('me'), project.id))?.preview).toBe('mine')
  })
})
