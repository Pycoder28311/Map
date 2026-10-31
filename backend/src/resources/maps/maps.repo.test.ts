import { DATA } from '@map/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { newUser } from '../../lib/ownedRepo.suite'
import { copyMapFile, createBranch, mapsOverrides, saveMapFile } from './maps.repo'

/** The BOARDS bucket in memory: what R2's get / put / delete do with whole files */
function fakeBucket() {
  const files = new Map<string, Uint8Array>()
  return {
    files,
    async put(key: string, value: ArrayBuffer) {
      files.set(key, new Uint8Array(value.slice(0)))
    },
    async get(key: string) {
      const bytes = files.get(key)
      return bytes ? { body: bytes, arrayBuffer: async () => bytes.slice().buffer } : null
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) files.delete(key)
    },
  }
}

/** A user whose requests reach their own fake bucket */
function owner(name?: string) {
  const ctx = newUser(name)
  const bucket = fakeBucket()
  return { ctx: { ...ctx, env: { BOARDS: bucket } } as unknown as Ctx, bucket }
}

const repo = ownedRepo(schema.maps, DATA.maps, mapsOverrides)
const bytes = (...values: number[]) => new Uint8Array(values).buffer
const newMap = async (ctx: Ctx, title = 'M') => (await repo.create(ctx, DATA.maps.input.parse({ title }) as never)).id as number
const row = (ctx: Ctx, id: number) => ctx.db.select().from(schema.maps).where(eq(schema.maps.id, id)).get()

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error.status
    throw error
  }
  return 200
}

describe('a map\'s file (docs/plans/38)', () => {
  it('a save writes a new file over its version and deletes the old one; the JSON never shows the key', async () => {
    const { ctx, bucket } = owner()
    const id = await newMap(ctx)
    expect(await saveMapFile(ctx, id, 0, bytes(1, 2))).toMatchObject({ version: 1 })
    const first = (await row(ctx, id))!.fileKey!
    expect(await saveMapFile(ctx, id, 1, bytes(3))).toMatchObject({ version: 2 })
    const saved = (await row(ctx, id))!
    expect(bucket.files.has(first)).toBe(false)
    expect([...bucket.files.get(saved.fileKey!)!]).toEqual([3])
    expect(saved).toMatchObject({ fileVersion: 2, fileSize: 1 })
    const json = (await repo.get(ctx, id))!
    expect(json).toMatchObject({ fileVersion: 2, fileSize: 1 })
    expect(json).not.toHaveProperty('fileKey')
  })

  it('a save over an old version is refused (409) and leaves nothing behind; someone else\'s map is 404', async () => {
    const { ctx, bucket } = owner()
    const id = await newMap(ctx)
    await saveMapFile(ctx, id, 0, bytes(1))
    const error = await saveMapFile(ctx, id, 0, bytes(2)).catch((e) => e)
    expect(error).toMatchObject({ status: 409, details: [{ path: 'version', message: '1' }] })
    expect(bucket.files.size).toBe(1)
    const other = owner()
    expect(await status(saveMapFile(other.ctx, id, 1, bytes(9)))).toBe(404)
    expect(other.bucket.files.size).toBe(0)
  })

  it('a branch is one new row with its own file; the group\'s first branch makes the source its root', async () => {
    const { ctx, bucket } = owner()
    const source = await newMap(ctx, 'Main')
    await saveMapFile(ctx, source, 0, bytes(1))
    const first = await createBranch(ctx, source, 'Branch 1', bytes(5, 6))
    expect(first.map).toMatchObject({ title: 'Branch 1', branchOf: source, forkedFrom: source, forkedVersion: 1, fileVersion: 1 })
    expect(first.root).toMatchObject({ id: source, branchOf: source })
    expect([...bucket.files.get((await row(ctx, first.map.id as number))!.fileKey!)!]).toEqual([5, 6])
    // A branch of the branch: same group, nothing changes in the root
    const second = await createBranch(ctx, first.map.id as number, 'Branch 2', bytes(7))
    expect(second).toMatchObject({ map: { branchOf: source, forkedFrom: first.map.id }, root: null })
    expect(await status(createBranch(owner().ctx, source, 'x', bytes(1)))).toBe(404)
  })

  it('Duplicate copies the file under a new key; a map never saved has nothing to copy', async () => {
    const { ctx, bucket } = owner()
    const from = await newMap(ctx)
    const to = await newMap(ctx)
    expect(await copyMapFile(ctx, to, from)).toBeNull()
    await saveMapFile(ctx, from, 0, bytes(4, 2))
    expect(await copyMapFile(ctx, to, from)).toMatchObject({ version: 1 })
    const keys = [(await row(ctx, from))!.fileKey, (await row(ctx, to))!.fileKey]
    expect(keys[0]).not.toBe(keys[1])
    expect([...bucket.files.get(keys[1]!)!]).toEqual([4, 2])
  })

  it('the Trash keeps the file; deleting for good deletes it', async () => {
    const { ctx, bucket } = owner()
    const id = await newMap(ctx)
    await saveMapFile(ctx, id, 0, bytes(1))
    await repo.update(ctx, id, DATA.maps.update.parse({ archived: true }) as never)
    expect(bucket.files.size).toBe(1)
    expect(await saveMapFile(ctx, id, 1, bytes(2))).toMatchObject({ version: 2 })
    expect(await repo.remove(ctx, id)).toBe(true)
    expect(bucket.files.size).toBe(0)
  })
})
