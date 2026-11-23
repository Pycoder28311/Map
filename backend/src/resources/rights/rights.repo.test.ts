import { DATA, rightsApply, rightsFilter } from '@map/shared'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { give, newUser } from '../../lib/ownedRepo.suite'
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
  it('apply sets the visibility and takes people away, in one go; it adds nobody', async () => {
    const owner = newUser()
    const ann = newUser('Ann')
    const bob = newUser('Bob')
    const note = await newNote(owner)
    await give(owner, 'notes', note, ann, 'editor')
    await give(owner, 'notes', note, bob, 'reader')
    const first = await apply(owner, { objectType: 'notes', objectId: note, visibility: 'public', set: [{ userId: newUser().user!.id, role: 'reader' }] })
    expect(first.visibility).toBe('public')
    expect(first.rights.map((r) => [r.user.name, r.role])).toEqual([
      ['Ann', 'editor'],
      ['Bob', 'reader'],
    ])
    const second = await apply(owner, { objectType: 'notes', objectId: note, remove: [bob.user!.id] })
    expect(second).toMatchObject({ visibility: 'public', rights: [{ user: { name: 'Ann' }, role: 'editor' }] })
    // The visibility is not a change of the note's own fields
    expect((await notes.get(owner, note))?.version).toBe(0)
    expect(await notes.get(ann, note)).toMatchObject({ access: 'editor' })
    expect(await notes.get(bob, note)).toMatchObject({ access: 'reader' }) // public now
  })

  it('the creator and the collaborators read the list, the creator first; nobody else (a public row\'s readers neither)', async () => {
    const owner = newUser('Olga')
    const ann = newUser('Ann')
    const stranger = newUser()
    const note = await newNote(owner)
    await give(owner, 'notes', note, ann, 'reader')
    await apply(owner, { objectType: 'notes', objectId: note, visibility: 'public' })
    const expected = [
      { id: null, role: 'owner', user: { id: owner.user!.id, name: 'Olga', image: null } },
      { id: expect.any(Number), role: 'reader', user: { id: ann.user!.id, name: 'Ann', image: null } },
    ]
    expect((await people(owner, note)).items).toEqual(expected)
    expect((await people(ann, note)).items).toEqual(expected)
    expect(await status(people(stranger, note))).toBe(404)
  })

  it('only the creator changes a role or the visibility; a collaborator can leave', async () => {
    const owner = newUser()
    const editor = newUser()
    const note = await newNote(owner)
    await give(owner, 'notes', note, editor, 'editor')
    expect(await status(apply(editor, { objectType: 'notes', objectId: note, visibility: 'public' }))).toBe(404)
    const right = (await people(owner, note)).items[1]
    const id = right.id!
    expect(await rightsRepo.get(editor, id)).toBeNull()
    expect(await rightsRepo.update(editor, id, { role: 'reader' })).toBeNull()
    expect(await rightsRepo.update(owner, id, { role: 'reader' })).toMatchObject({ role: 'reader' })
    expect(await rightsRepo.remove(editor, id)).toBe(true)
    expect((await people(owner, note)).items).toHaveLength(1)
  })

  it('someone else cannot take a collaborator away', async () => {
    const owner = newUser()
    const ann = newUser()
    const bob = newUser()
    const note = await newNote(owner)
    await give(owner, 'notes', note, ann, 'reader')
    await give(owner, 'notes', note, bob, 'reader')
    const annRight = (await people(owner, note)).items[1].id!
    expect(await status(rightsRepo.remove(bob, annRight))).toBe(404)
  })

  it('nobody is added directly: people join by invitation', async () => {
    const owner = newUser()
    const ann = newUser()
    const note = await newNote(owner)
    expect(await status(rightsRepo.create(owner, { objectType: 'notes', objectId: note, userId: ann.user!.id, role: 'reader' }))).toBe(403)
  })

  it('a row of another table, or someone else\'s row, cannot be changed', async () => {
    const owner = newUser()
    const other = newUser()
    const theirs = await newNote(other)
    expect(await status(apply(owner, { objectType: 'notes', objectId: theirs, visibility: 'public' }))).toBe(404)
    expect(await status(apply(owner, { objectType: 'folders', objectId: await newNote(owner), visibility: 'public' }))).toBe(404)
  })
})

describe('rights: many at once', () => {
  it('takes 50 people away in one Apply (within D1\'s 100 variables)', async () => {
    const owner = newUser()
    const note = await newNote(owner)
    const people = Array.from({ length: 50 }, () => newUser())
    for (const p of people) await give(owner, 'notes', note, p, 'reader')
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
    await give(owner, 'notes', a, me, 'reader')
    await give(owner, 'notes', b, me, 'reader')
    await give(owner, 'folders', folder, me, 'editor')
    await notes.update(owner, b, DATA.notes.update.parse({ archived: true }) as never)

    const first = await listShared(me, { limit: 1, cursor: null })
    expect(first.items).toEqual([{ id: expect.any(Number), objectType: 'folders', objectId: folder, title: 'Folder', role: 'editor', owner: { name: 'Olga' } }])
    const rest = await listShared(me, { limit: 5, cursor: first.nextCursor })
    expect(rest.items.map((i) => i.title)).toEqual(['First'])
    expect(rest.nextCursor).toBeNull()
    expect((await listShared(owner, { limit: 5, cursor: null })).items).toEqual([])
    // One table's rows only
    expect((await listShared(me, { limit: 5, cursor: null }, { objectType: 'folders' })).items.map((i) => i.title)).toEqual(['Folder'])
  })

  it('a deleted row leaves the list (its rights go with it)', async () => {
    const owner = newUser()
    const me = newUser()
    const a = await newNote(owner)
    await give(owner, 'notes', a, me, 'reader')
    await notes.remove(owner, a)
    expect((await listShared(me, { limit: 5, cursor: null })).items).toEqual([])
  })
})
