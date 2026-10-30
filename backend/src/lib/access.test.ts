// Every shared table (`share: true`): who may read and change a row, its versions and what a non-owner is sent (docs/plans/34)
import { DATA, SHAREABLE, type Table } from '@map/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as schema from '../db/schema'
import type { Ctx } from './crud'
import { HttpError } from './errors'
import { ownedRepo } from './ownedRepo'
import { give, newUser } from './ownedRepo.suite'

/** The error a promise fails with */
async function failure(promise: Promise<unknown>): Promise<HttpError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error
    throw error
  }
  throw new Error('Expected a failure')
}

for (const name of SHAREABLE) {
  const table = DATA[name] as unknown as Table
  const repo = ownedRepo(schema[name], table)
  const update = (ctx: Ctx, id: number, body: Record<string, unknown>) => repo.update(ctx, id, table.update.parse(body) as never)
  const make = async (owner: Ctx) => (await repo.create(owner, table.input.parse({ title: 'Mine', pinned: true }) as never)) as Record<string, unknown> & { id: number; version: number }

  describe(`${name}: sharing`, () => {
    it('the owner gets the whole row, with access owner, visibility and version 0', async () => {
      const owner = newUser()
      const row = await make(owner)
      expect(row).toMatchObject({ access: 'owner', visibility: 'private', version: 0, pinned: true })
      expect(row).not.toHaveProperty('editedBy')
      expect(await repo.get(owner, row.id)).toMatchObject({ access: 'owner', title: 'Mine' })
    })

    it('someone without a right gets nothing, as for a missing row', async () => {
      const owner = newUser()
      const row = await make(owner)
      const other = newUser()
      expect(await repo.get(other, row.id)).toBeNull()
      expect(await update(other, row.id, { title: 'x', baseVersion: 0 })).toBeNull()
      expect(await update(other, row.id, { title: 'x' })).toBeNull()
    })

    it('a reader reads it without the owner\'s fields, and cannot change it', async () => {
      const owner = newUser()
      const row = await make(owner)
      const reader = newUser()
      await give(owner, name, row.id, reader, 'reader')
      const seen = await repo.get(reader, row.id)
      expect(seen).toMatchObject({ access: 'reader', title: 'Mine', version: 0 })
      for (const key of ['pinned', 'position', 'objectType', 'objectId', 'visibility', 'userId', 'editedBy']) expect(seen).not.toHaveProperty(key)
      expect(await update(reader, row.id, { title: 'x', baseVersion: 0 })).toBeNull()
      expect((await repo.get(owner, row.id))?.title).toBe('Mine')
    })

    it('a public row can be read by everyone signed in, not changed', async () => {
      const owner = newUser()
      const row = await make(owner)
      await owner.db.update(schema[name]).set({ visibility: 'public' }).where(eq(schema[name].id, row.id))
      const anyone = newUser()
      expect(await repo.get(anyone, row.id)).toMatchObject({ access: 'reader' })
      expect(await update(anyone, row.id, { title: 'x', baseVersion: 0 })).toBeNull()
    })

    it('an editor changes its own fields with the version, raising it; the answer is the editor\'s view', async () => {
      const owner = newUser()
      const row = await make(owner)
      const editor = newUser()
      await give(owner, name, row.id, editor, 'editor')
      const saved = await update(editor, row.id, { title: 'Theirs', baseVersion: 0 })
      expect(saved).toMatchObject({ access: 'editor', title: 'Theirs', version: 1 })
      expect(saved).not.toHaveProperty('pinned')
      expect(await repo.get(owner, row.id)).toMatchObject({ title: 'Theirs', version: 1, pinned: true })
    })

    it('an editor needs the version, and may not touch the owner\'s fields', async () => {
      const owner = newUser()
      const row = await make(owner)
      const editor = newUser()
      await give(owner, name, row.id, editor, 'editor')
      expect((await failure(update(editor, row.id, { title: 'x' }))).status).toBe(400)
      expect((await failure(update(editor, row.id, { pinned: false }))).status).toBe(403)
      expect((await failure(update(editor, row.id, { archived: true, baseVersion: 0 }))).status).toBe(403)
      expect((await failure(update(editor, row.id, { position: 'a5', title: 'x', baseVersion: 0 }))).status).toBe(403)
      expect(await repo.get(owner, row.id)).toMatchObject({ title: 'Mine', pinned: true, archived: false, version: 0 })
    })

    it('two saves from the same version: the second is a conflict that says the version and who saved it', async () => {
      const owner = newUser()
      const row = await make(owner)
      const editor = newUser('Maria')
      await give(owner, name, row.id, editor, 'editor')
      await update(editor, row.id, { title: 'First', baseVersion: 0 })
      const error = await failure(update(owner, row.id, { title: 'Second', baseVersion: 0 }))
      expect(error.status).toBe(409)
      expect(error.details).toEqual([
        { path: 'version', message: '1' },
        { path: 'editedBy', message: 'Maria' },
      ])
      expect((await repo.get(owner, row.id))?.title).toBe('First')
      // With the newest version it goes through
      expect(await update(owner, row.id, { title: 'Second', baseVersion: 1 })).toMatchObject({ title: 'Second', version: 2 })
    })

    it('pin, position and archive do not raise the version (an open editor\'s next save still goes through)', async () => {
      const owner = newUser()
      const row = await make(owner)
      await update(owner, row.id, { pinned: false })
      await update(owner, row.id, { archived: true })
      await update(owner, row.id, { archived: false })
      expect((await repo.get(owner, row.id))?.version).toBe(0)
      expect(await update(owner, row.id, { title: 'x', baseVersion: 0 })).toMatchObject({ version: 1 })
    })

    it('the owner can still save without a version (last write wins, as before)', async () => {
      const owner = newUser()
      const row = await make(owner)
      expect(await update(owner, row.id, { title: 'a' })).toMatchObject({ version: 1 })
    })

    it('a row in the Trash is its owner\'s only', async () => {
      const owner = newUser()
      const row = await make(owner)
      const editor = newUser()
      await give(owner, name, row.id, editor, 'editor')
      await update(owner, row.id, { archived: true })
      expect(await repo.get(editor, row.id)).toBeNull()
      expect(await update(editor, row.id, { title: 'x', baseVersion: 0 })).toBeNull()
    })

    it('a right on another row, or another table, gives nothing', async () => {
      const owner = newUser()
      const row = await make(owner)
      const other = await make(owner)
      const someone = newUser()
      await give(owner, name, other.id, someone, 'editor')
      const otherTable = SHAREABLE.find((n) => n !== name)!
      await give(owner, otherTable, row.id, someone, 'editor')
      expect(await repo.get(someone, row.id)).toBeNull()
    })

    it('only the owner lists and deletes; deleting removes the rights', async () => {
      const owner = newUser()
      const row = await make(owner)
      const editor = newUser()
      await give(owner, name, row.id, editor, 'editor')
      expect((await repo.list(editor, { limit: 20, cursor: null }, table.filter.parse({}) as never)).items).toEqual([])
      expect(await repo.remove(editor, row.id)).toBe(false)
      expect(await repo.remove(owner, row.id)).toBe(true)
      const left = await owner.db.select().from(schema.objectRights).where(eq(schema.objectRights.userId, editor.user!.id))
      expect(left).toEqual([])
    })
  })
}
