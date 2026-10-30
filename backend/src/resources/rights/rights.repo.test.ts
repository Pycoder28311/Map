import { DATA, rightsApply, rightsFilter } from '@map/shared'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { newUser } from '../../lib/ownedRepo.suite'
import { listShared } from '../shared/shared.repo'
import { applyRights, rightsRepo } from './rights.repo'

const notes = ownedRepo(schema.notes, DATA.notes)
const folders = ownedRepo(schema.folders, DATA.folders)
const newNote = async (owner: Ctx, title = 'N') => (await notes.create(owner, DATA.notes.input.parse({ title }) as never)).id as number
const apply = (ctx: Ctx, body: Record<string, unknown>) => applyRights(ctx, rightsApply.parse(body))
const people = (ctx: Ctx, objectId: number) => rightsRepo.list(ctx, null, rightsFilter.parse({ objectType: 'notes', objectId: String(objectId) }))

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error.status
    throw error
  }
  return 200
}

describe('rights', () => {
  it('apply gives, changes and takes away rights and sets the visibility, in one go', async () => {
    const owner = newUser()
    const ann = newUser('Ann')
    const bob = newUser('Bob')
    const note = await newNote(owner)
    const first = await apply(owner, { objectType: 'notes', objectId: note, visibility: 'public', set: [{ userId: ann.user!.id, role: 'reader' }, { userId: bob.user!.id, role: 'editor' }] })
    expect(first.visibility).toBe('public')
    expect(first.rights.map((r) => [r.user.name, r.role])).toEqual([
      ['Ann', 'reader'],
      ['Bob', 'editor'],
    ])
    const second = await apply(owner, { objectType: 'notes', objectId: note, set: [{ userId: ann.user!.id, role: 'editor' }], remove: [bob.user!.id] })
    expect(second).toMatchObject({ visibility: 'public', rights: [{ user: { name: 'Ann' }, role: 'editor' }] })
    expect((await people(owner, note)).items).toHaveLength(1)
    // The visibility is not a change of the note's own fields
    expect((await notes.get(owner, note))?.version).toBe(0)
    expect(await notes.get(ann, note)).toMatchObject({ access: 'editor' })
    expect(await notes.get(bob, note)).toMatchObject({ access: 'reader' }) // public now
  })

  it('only the owner sees or changes them', async () => {
    const owner = newUser()
    const editor = newUser()
    const note = await newNote(owner)
    await apply(owner, { objectType: 'notes', objectId: note, set: [{ userId: editor.user!.id, role: 'editor' }] })
    expect(await status(people(editor, note))).toBe(404)
    expect(await status(apply(editor, { objectType: 'notes', objectId: note, visibility: 'public' }))).toBe(404)
    const [right] = (await people(owner, note)).items
    expect(await rightsRepo.get(editor, right.id).catch((e: HttpError) => e.status)).toBe(404)
    expect(await status(rightsRepo.remove(editor, right.id))).toBe(404)
  })

  it('refuses the owner themself, and an unknown person writes nothing', async () => {
    const owner = newUser()
    const ann = newUser()
    const note = await newNote(owner)
    expect(await status(apply(owner, { objectType: 'notes', objectId: note, set: [{ userId: owner.user!.id, role: 'reader' }] }))).toBe(400)
    expect(await status(apply(owner, { objectType: 'notes', objectId: note, visibility: 'public', set: [{ userId: ann.user!.id, role: 'reader' }, { userId: 'nobody', role: 'reader' }] }))).toBe(400)
    expect((await people(owner, note)).items).toEqual([])
    expect((await notes.get(owner, note))?.visibility).toBe('private')
  })

  it('a right on a row of another table, or someone else\'s row, cannot be given', async () => {
    const owner = newUser()
    const other = newUser()
    const theirs = await newNote(other)
    expect(await status(apply(owner, { objectType: 'notes', objectId: theirs, set: [{ userId: other.user!.id, role: 'reader' }] }))).toBe(404)
    expect(await status(apply(owner, { objectType: 'folders', objectId: await newNote(owner), visibility: 'public' }))).toBe(404)
  })

  it('the single routes: create (or change), update and delete one right', async () => {
    const owner = newUser()
    const ann = newUser('Ann')
    const note = await newNote(owner)
    const made = await rightsRepo.create(owner, { objectType: 'notes', objectId: note, userId: ann.user!.id, role: 'reader' })
    expect(made).toMatchObject({ role: 'reader', user: { name: 'Ann' } })
    expect(await rightsRepo.update(owner, made.id, { role: 'editor' })).toMatchObject({ role: 'editor' })
    expect(await rightsRepo.remove(owner, made.id)).toBe(true)
    expect(await status(rightsRepo.create(owner, { objectType: 'notes', objectId: note, userId: 'nobody', role: 'reader' }))).toBe(400)
  })
})

describe('rights: many at once', () => {
  it('gives 50 people a right in one Apply, and takes 50 away (within D1\'s 100 variables)', async () => {
    const owner = newUser()
    const note = await newNote(owner)
    const people = Array.from({ length: 50 }, () => newUser())
    const given = await apply(owner, { objectType: 'notes', objectId: note, set: people.map((p) => ({ userId: p.user!.id, role: 'reader' })) })
    expect(given.rights).toHaveLength(50)
    const taken = await apply(owner, { objectType: 'notes', objectId: note, remove: people.map((p) => p.user!.id) })
    expect(taken.rights).toEqual([])
  })
})

describe('shared with me', () => {
  it('lists the rows shared with me, newest first, with title, role and owner, a page at a time; not those in the Trash', async () => {
    const owner = newUser('Olga')
    const me = newUser()
    const a = await newNote(owner, 'First')
    const b = await newNote(owner, 'In the Trash')
    const folder = (await folders.create(owner, DATA.folders.input.parse({ title: 'Folder' }) as never)).id as number
    await apply(owner, { objectType: 'notes', objectId: a, set: [{ userId: me.user!.id, role: 'reader' }] })
    await apply(owner, { objectType: 'notes', objectId: b, set: [{ userId: me.user!.id, role: 'reader' }] })
    await apply(owner, { objectType: 'folders', objectId: folder, set: [{ userId: me.user!.id, role: 'editor' }] })
    await notes.update(owner, b, DATA.notes.update.parse({ archived: true }) as never)

    const first = await listShared(me, { limit: 1, cursor: null })
    expect(first.items).toEqual([{ id: expect.any(Number), objectType: 'folders', objectId: folder, title: 'Folder', role: 'editor', owner: { name: 'Olga' } }])
    const rest = await listShared(me, { limit: 5, cursor: first.nextCursor })
    expect(rest.items.map((i) => i.title)).toEqual(['First'])
    expect(rest.nextCursor).toBeNull()
    expect((await listShared(owner, { limit: 5, cursor: null })).items).toEqual([])
  })

  it('a deleted row leaves the list (its rights go with it)', async () => {
    const owner = newUser()
    const me = newUser()
    const a = await newNote(owner)
    await apply(owner, { objectType: 'notes', objectId: a, set: [{ userId: me.user!.id, role: 'reader' }] })
    await notes.remove(owner, a)
    expect((await listShared(me, { limit: 5, cursor: null })).items).toEqual([])
  })
})
