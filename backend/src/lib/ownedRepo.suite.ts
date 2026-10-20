// The tests every user-owned table must pass (ownedRepo.test.ts runs them for each table of the data config). A table with
// overrides runs them too: `describeOwnedRepo('notes', ownedRepo(schema.notes, DATA.notes, { … }))`.
import { DATA, previewOf, TABLE_NAMES, type Table, type TableName } from '@map/shared'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import type { Ctx, Repo } from './crud'
import { ownedRepo } from './ownedRepo'

// The real schema in a real in-memory SQLite, created from the SQL drizzle-kit writes for it
export const sqlite = new DatabaseSync(':memory:')
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

let users = 0
/** A new user (each test has its own, so lists hold only what the test made) */
export function newUser(): Ctx {
  const id = `user-${++users}`
  const now = Math.floor(Date.now() / 1000)
  sqlite.prepare('INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(id, id, `${id}@x.test`, now, now)
  return { db, env: {} as CloudflareBindings, user: { id } } as unknown as Ctx
}

type AnyRepo = Repo<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>

/** A value of each field, by its kind (what a client could send) */
function sample(table: Table, n = 1): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(table.fields).map(([name, f]) => {
      switch (f.kind) {
        case 'richText':
          return [name, `<p>words of ${name} ${n}</p>`]
        case 'int':
          return [name, f.default]
        case 'bool':
          return [name, false]
        default:
          return [name, `${name} ${n}`]
      }
    }),
  )
}

export function describeOwnedRepo(name: TableName, repo: AnyRepo) {
  const table = DATA[name] as unknown as Table
  // What the routes do before the repo: the contract parses (and cleans) the body
  const create = (ctx: Ctx, body: Record<string, unknown>) => repo.create(ctx, table.input.parse(body) as Record<string, unknown>)
  const update = (ctx: Ctx, id: number, body: Record<string, unknown>) => repo.update(ctx, id, table.update.parse(body) as Record<string, unknown>)
  const list = (ctx: Ctx, filter: Record<string, string> = {}, limit = 20, cursor: string | null = null) =>
    repo.list(ctx, { limit, cursor }, table.filter.parse(filter) as Record<string, unknown>)
  const ids = (items: Record<string, unknown>[]) => items.map((i) => i.id)

  describe(`${name} (ownedRepo)`, () => {
    it('creates a row with its fields, the server\'s dates and defaults, and never the owner', async () => {
      const ctx = newUser()
      const row = await create(ctx, sample(table))
      expect(row).toMatchObject({ ...table.input.parse(sample(table)), archived: false })
      if (table.order.pinned) expect(row.pinned).toBe(false)
      if (table.order.position) expect(row.position).toBe(0)
      if (table.link) expect(row).toMatchObject({ objectType: null, objectId: null })
      expect(row).not.toHaveProperty('userId')
      expect(new Date(row.createdAt as string).toISOString()).toBe(row.createdAt)
    })

    it('gets, updates and deletes only the owner\'s rows: someone else\'s is missing', async () => {
      const me = newUser()
      const other = newUser()
      const row = await create(me, sample(table))
      const id = row.id as number
      expect(await repo.get(other, id)).toBeNull()
      expect(await update(other, id, { archived: true })).toBeNull()
      expect(await repo.remove(other, id)).toBe(false)
      expect((await list(other)).items).toEqual([])
      expect(await repo.get(me, id)).toEqual(row)
      expect(await update(me, id, { archived: true })).toMatchObject({ id, archived: true })
      expect(await repo.remove(me, id)).toBe(true)
      expect(await repo.get(me, id)).toBeNull()
    })

    it('answers an empty update with the row as it is', async () => {
      const ctx = newUser()
      const row = await create(ctx, sample(table))
      expect(await update(ctx, row.id as number, {})).toEqual(row)
    })

    it('lists the live rows by default and the archived ones on request', async () => {
      const ctx = newUser()
      const live = await create(ctx, sample(table, 1))
      const gone = await create(ctx, { ...sample(table, 2), archived: true })
      expect(ids((await list(ctx)).items)).toEqual([live.id])
      expect(ids((await list(ctx, { archived: 'true' })).items)).toEqual([gone.id])
    })

    if (table.order.pinned && table.order.position) {
      it('lists pinned first, then by position, then by id, a page at a time', async () => {
        const ctx = newUser()
        const a = await create(ctx, { ...sample(table, 1), position: 5 })
        const b = await create(ctx, { ...sample(table, 2), position: 1 })
        const c = await create(ctx, { ...sample(table, 3), position: 5, pinned: true })
        const d = await create(ctx, { ...sample(table, 4), position: 1 })
        expect(ids((await list(ctx)).items)).toEqual([c.id, b.id, d.id, a.id])
        const first = await list(ctx, {}, 2)
        expect(ids(first.items)).toEqual([c.id, b.id])
        const second = await list(ctx, {}, 2, first.nextCursor)
        expect(ids(second.items)).toEqual([d.id, a.id])
        expect(second.nextCursor).toBeNull()
      })
    }

    if (table.preview) {
      const source = table.preview
      it('writes the preview with its field, from the cleaned text, and only then', async () => {
        const ctx = newUser()
        const row = await create(ctx, { ...sample(table), [source]: '<p>safe</p><script>x</script><p onclick="x()">text</p>', preview: 'fake' })
        expect(row[source]).toBe('<p>safe</p><p>text</p>')
        expect(row.preview).toBe('safe text')
        const id = row.id as number
        expect((await update(ctx, id, { archived: false, preview: 'fake' }))?.preview).toBe('safe text')
        expect((await update(ctx, id, { [source]: `<p>${'word '.repeat(200)}</p>` }))?.preview).toBe(previewOf(`<p>${'word '.repeat(200)}</p>`))
        expect((await update(ctx, id, { [source]: '' }))?.preview).toBe('')
      })

      it(`lists the preview instead of ${source}, without even reading it`, async () => {
        const ctx = newUser()
        await create(ctx, sample(table))
        const queries: string[] = []
        const real = sqlite.prepare.bind(sqlite)
        sqlite.prepare = ((query: string) => (queries.push(query), real(query))) as typeof sqlite.prepare
        try {
          const { items } = await list(ctx)
          expect(items[0]).not.toHaveProperty(source)
          expect(items[0].preview).not.toBe('')
        } finally {
          sqlite.prepare = real
        }
        const listQuery = queries.find((q) => /order by/i.test(q)) ?? ''
        expect(listQuery).toContain('"preview"')
        expect(listQuery).not.toContain(`"${source}"`)
        // The whole row comes with get
        expect((await repo.get(ctx, (await list(ctx)).items[0].id as number))?.[source]).toBeTypeOf('string')
      })
    }

    if (table.link) {
      const [parentType, parentTable] = Object.entries(table.link.types)[0]
      // A real parent of the user's: made through the repo of the table its type names
      const parentName = TABLE_NAMES.find((n) => DATA[n].tableName === parentTable || n === parentTable)!
      const parentRepo = ownedRepo((schema as never)[parentName], DATA[parentName] as unknown as Table) as unknown as AnyRepo
      const parentOf = async (ctx: Ctx) => ((await parentRepo.create(ctx, DATA[parentName].input.parse(sample(DATA[parentName] as unknown as Table))))).id as number

      it('keeps a parent, and lists by parent or by having none', async () => {
        const ctx = newUser()
        const parent = await parentOf(ctx)
        const orphan = await create(ctx, sample(table, 1))
        const child = await create(ctx, { ...sample(table, 2), objectType: parentType, objectId: parent })
        expect(child).toMatchObject({ objectType: parentType, objectId: parent })
        expect(ids((await list(ctx, { objectType: 'none' })).items)).toEqual([orphan.id])
        expect(ids((await list(ctx, { objectType: parentType, objectId: String(parent) })).items)).toEqual([child.id])
        expect(ids((await list(ctx, { objectType: parentType })).items)).toEqual([child.id])
        expect(ids((await list(ctx, { objectType: parentType, objectId: String(parent + 100) })).items)).toEqual([])
        // Back to no parent
        expect(await update(ctx, child.id as number, { objectType: null, objectId: null })).toMatchObject({ objectType: null, objectId: null })
        expect((await list(ctx, { objectType: 'none' })).items).toHaveLength(2)
      })

      it('moves a row to another parent', async () => {
        const ctx = newUser()
        const [a, b] = [await parentOf(ctx), await parentOf(ctx)]
        const row = await create(ctx, { ...sample(table), objectType: parentType, objectId: a })
        expect(await update(ctx, row.id as number, { objectType: parentType, objectId: b })).toMatchObject({ objectId: b })
        expect(ids((await list(ctx, { objectType: parentType, objectId: String(a) })).items)).toEqual([])
      })

      it('refuses a parent that is missing or someone else\'s, on create and on move', async () => {
        const ctx = newUser()
        const other = newUser()
        const theirs = await parentOf(other)
        await expect(create(ctx, { ...sample(table), objectType: parentType, objectId: 999999 })).rejects.toMatchObject({ status: 400, code: 'UNKNOWN_REFERENCE' })
        await expect(create(ctx, { ...sample(table), objectType: parentType, objectId: theirs })).rejects.toMatchObject({ status: 400 })
        const row = await create(ctx, sample(table))
        await expect(update(ctx, row.id as number, { objectType: parentType, objectId: theirs })).rejects.toMatchObject({ status: 400 })
        expect((await repo.get(ctx, row.id as number))?.objectType).toBeNull()
      })

      it('does not read for a parent when a write does not set one', async () => {
        const ctx = newUser()
        const row = await create(ctx, sample(table))
        const queries: string[] = []
        const real = sqlite.prepare.bind(sqlite)
        sqlite.prepare = ((query: string) => (queries.push(query), real(query))) as typeof sqlite.prepare
        try {
          await update(ctx, row.id as number, { archived: true })
        } finally {
          sqlite.prepare = real
        }
        expect(queries.filter((q) => /select/i.test(q))).toEqual([])
      })

      it('turns the children of a deleted parent into orphans', async () => {
        const ctx = newUser()
        const parent = await parentOf(ctx)
        const child = await create(ctx, { ...sample(table), objectType: parentType, objectId: parent })
        expect(await parentRepo.remove(ctx, parent)).toBe(true)
        expect(await repo.get(ctx, child.id as number)).toMatchObject({ objectType: null, objectId: null })
      })

      // A table whose parent can be a row of its own table: no cycles
      if (parentTable === table.tableName || parentTable === table.name) {
        it('refuses a row inside itself or inside its own children', async () => {
          const ctx = newUser()
          const a = await create(ctx, sample(table, 1))
          const b = await create(ctx, { ...sample(table, 2), objectType: parentType, objectId: a.id })
          const c = await create(ctx, { ...sample(table, 3), objectType: parentType, objectId: b.id })
          await expect(update(ctx, a.id as number, { objectType: parentType, objectId: a.id })).rejects.toMatchObject({ status: 400 })
          await expect(update(ctx, a.id as number, { objectType: parentType, objectId: b.id })).rejects.toMatchObject({ status: 400 })
          await expect(update(ctx, a.id as number, { objectType: parentType, objectId: c.id })).rejects.toMatchObject({ status: 400 })
          // Moving up is fine
          expect(await update(ctx, c.id as number, { objectType: parentType, objectId: a.id })).toMatchObject({ objectId: a.id })
        })
      }
    }
  })
}
