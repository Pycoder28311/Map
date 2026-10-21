import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { getTableConfig, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import { DatabaseSync } from 'node:sqlite'
import { comparePositions, integerKey, orderFields, type OrderSpec, type Page } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { listIndex, listSort, orderColumns, pickOrder, sortColumnsOf } from './sort'
import { toPage, type PageParams } from './pagination'

// The four cases, each table built the way the schema builds one: orderColumns + listIndex from the order flags
const CASES = {
  both: { pinned: true, position: true },
  posOnly: { pinned: false, position: true },
  pinOnly: { pinned: true, position: false },
  neither: { pinned: false, position: false },
} as const

function makeTable<const O extends OrderSpec>(name: string, order: O) {
  return sqliteTable(
    name,
    {
      id: integer('id').primaryKey({ autoIncrement: true }),
      userId: text('user_id').notNull(),
      title: text('title').notNull(),
      archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
      ...(orderColumns(order) as object), // (typed loosely here: the flags are generic in this helper)
    },
    (t) => [listIndex(`${name}_idx`, t as never, { owner: 'userId', filters: ['archived'], order })],
  )
}
const tables = {
  both: makeTable('both', CASES.both),
  posOnly: makeTable('pos_only', CASES.posOnly),
  pinOnly: makeTable('pin_only', CASES.pinOnly),
  neither: makeTable('neither', CASES.neither),
}

const sqlite = new DatabaseSync(':memory:')
// The tables are created from the SQL drizzle-kit itself writes for them (what a migration would run)
const empty = await generateSQLiteDrizzleJson({})
for (const statement of await generateSQLiteMigration(empty, await generateSQLiteDrizzleJson(tables))) sqlite.exec(statement)
const db = drizzle(async (query, params, method) => {
  const stmt = sqlite.prepare(query)
  if (method === 'run') {
    stmt.run(...params)
    return { rows: [] }
  }
  return { rows: stmt.all(...params).map((row) => Object.values(row)) }
})

// Deterministic "random" data: pinned and positions with many ties; some rows archived
let seed = 7
const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n)
const rows = Array.from({ length: 70 }, (_, i) => ({
  userId: i % 5 === 0 ? 'other' : 'me',
  title: `n${i}`,
  archived: i % 7 === 0,
  pinned: rnd(3) === 0,
  position: integerKey(rnd(6) * 10),
}))
const insert = (table: string, columns: string[], values: unknown[]) =>
  sqlite.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...values)
for (const r of rows) {
  const base = [r.userId, r.title, r.archived ? 1 : 0]
  insert('both', ['user_id', 'title', 'archived', 'pinned', 'position'], [...base, r.pinned ? 1 : 0, r.position])
  insert('pos_only', ['user_id', 'title', 'archived', 'position'], [...base, r.position])
  insert('pin_only', ['user_id', 'title', 'archived', 'pinned'], [...base, r.pinned ? 1 : 0])
  insert('neither', ['user_id', 'title', 'archived'], base)
}

type Row = { id: number; pinned?: boolean; position?: string }
const mine = rows.map((r, i) => ({ ...r, id: i + 1 })).filter((r) => r.userId === 'me' && !r.archived)
const compare = (order: OrderSpec) => (a: (typeof mine)[0], b: (typeof mine)[0]) =>
  (order.pinned ? Number(b.pinned) - Number(a.pinned) : 0) || (order.position ? comparePositions(a.position, b.position) || a.id - b.id : b.id - a.id)

/** Reads the whole (not archived) list page by page (limit 4), the way the repo does */
async function readAll<O extends OrderSpec>(table: ReturnType<typeof makeTable<O>>, order: O) {
  const sort = listSort(sortColumnsOf(table as never, order))
  const ids: number[] = []
  let cursor: string | null = null
  for (let pages = 0; pages < 100; pages++) {
    const page: PageParams = { limit: 4, cursor }
    const found: Row[] = await db.select().from(table as never).where(and(eq(table.userId, 'me'), eq(table.archived, false), sort.after(page))).orderBy(...sort.orderBy).limit(5)
    const result: Page<Row> = toPage(found, page, sort.cursorOf)
    ids.push(...result.items.map((r) => r.id))
    if (!result.nextCursor) return ids
    cursor = result.nextCursor
  }
  throw new Error('never ends')
}

describe('listSort, the four cases', () => {
  it('pinned + position: pinned first, position inside each group, every page continues exactly', async () => {
    expect(await readAll(tables.both, CASES.both)).toEqual([...mine].sort(compare(CASES.both)).map((r) => r.id))
  })
  it('position only', async () => {
    expect(await readAll(tables.posOnly, CASES.posOnly)).toEqual([...mine].sort(compare(CASES.posOnly)).map((r) => r.id))
  })
  it('pinned only: newest first inside each group', async () => {
    expect(await readAll(tables.pinOnly, CASES.pinOnly)).toEqual([...mine].sort(compare(CASES.pinOnly)).map((r) => r.id))
  })
  it('neither: newest first', async () => {
    expect(await readAll(tables.neither, CASES.neither)).toEqual([...mine].sort(compare(CASES.neither)).map((r) => r.id))
  })
})

describe('the flags decide the columns, the index and the output', () => {
  const names = (table: Parameters<typeof getTableConfig>[0]) => getTableConfig(table).columns.map((c) => c.name)
  it('adds only the columns the flags turn on', () => {
    expect(names(tables.both)).toEqual(expect.arrayContaining(['pinned', 'position']))
    expect(names(tables.posOnly)).toContain('position')
    expect(names(tables.posOnly)).not.toContain('pinned')
    expect(names(tables.pinOnly)).toContain('pinned')
    expect(names(tables.pinOnly)).not.toContain('position')
    expect(names(tables.neither)).not.toEqual(expect.arrayContaining(['pinned']))
    expect(names(tables.neither)).not.toEqual(expect.arrayContaining(['position']))
  })
  it('keeps only the flagged fields in the output', () => {
    const row = { id: 1, pinned: true, position: 'a3' }
    expect(pickOrder(row, CASES.both)).toEqual({ pinned: true, position: 'a3' })
    expect(pickOrder(row, CASES.posOnly)).toEqual({ position: 'a3' })
    expect(pickOrder(row, CASES.pinOnly)).toEqual({ pinned: true })
    expect(pickOrder(row, CASES.neither)).toEqual({})
  })
  it('makes the contract fields from the flags', () => {
    expect(Object.keys(orderFields(CASES.both) as object)).toEqual(['pinned', 'position'])
    expect(Object.keys(orderFields(CASES.posOnly) as object)).toEqual(['position'])
    expect(Object.keys(orderFields(CASES.pinOnly) as object)).toEqual(['pinned'])
    expect(Object.keys(orderFields(CASES.neither) as object)).toEqual([])
  })
})

describe('the index serves the order', () => {
  const plan = (query: string) =>
    sqlite.prepare(`EXPLAIN QUERY PLAN ${query}`).all().map((r: Record<string, unknown>) => String(r.detail)).join(' | ')
  it.each([
    ['both', 'pinned DESC, position, id'],
    ['pos_only', 'position, id'],
    ['pin_only', 'pinned DESC, id DESC'],
    ['neither', 'id DESC'],
  ])('%s: needs no sort for %s', (table, order) => {
    const text = plan(`SELECT * FROM ${table} WHERE user_id = 'me' AND archived = 0 ORDER BY ${order} LIMIT 5`)
    expect(text).toContain(`USING INDEX ${table}_idx`)
    expect(text).not.toContain('TEMP B-TREE')
  })
})

describe('cursors', () => {
  it('rejects a cursor that is not ours', () => {
    const sort = listSort(sortColumnsOf(tables.both as never, CASES.both))
    for (const cursor of ['%%%', btoa('[1,2]'), btoa('{"a":1}'), btoa('[1,"x",3]'), btoa('[1,5,3]'), btoa('[1,"a-",3]')]) {
      expect(() => sort.after({ limit: 4, cursor })).toThrow()
    }
  })
})
