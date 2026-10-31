import { FILE_VERSION_HEADER, type MapFileSaved } from '@map/shared'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { maps } from '../../db/schema'
import { userId, type Ctx } from '../../lib/crud'
import { HttpError, notFound } from '../../lib/errors'
import type { RepoOverrides } from '../../lib/ownedRepo'

type MapRow = typeof maps.$inferSelect

export { FILE_VERSION_HEADER }

/** A new key for a board file: every save writes a new one, so a save is all or nothing (docs/plans/38) */
export const newKey = () => `boards/${crypto.randomUUID()}.bin`

/** The user's map (one read by primary key); undefined when it is not there or not theirs */
export const mapRow = (ctx: Ctx, id: number) =>
  ctx.db
    .select()
    .from(maps)
    .where(and(eq(maps.id, id), eq(maps.userId, userId(ctx))))
    .get()

/** A map as the app gets it: the generic JSON without the owner and without where its file is (the key is the server's) */
export function mapJson(row: Record<string, unknown>): Record<string, unknown> {
  const { userId: _owner, fileKey: _key, createdAt, updatedAt, savedAt, ...rest } = row
  return {
    ...rest,
    createdAt: (createdAt as Date).toISOString(),
    updatedAt: (updatedAt as Date).toISOString(),
    savedAt: savedAt ? (savedAt as Date).toISOString() : null,
  }
}

/** The maps table's own ways (index.ts passes them to its ownedRepo): its JSON, and a map deleted for good takes its file with it */
export const mapsOverrides: RepoOverrides = {
  toJson: mapJson,
  removed: async (ctx, row) => {
    if (typeof row.fileKey === 'string') await ctx.env.BOARDS.delete(row.fileKey)
  },
}

const conflict = (version: number) => new HttpError(409, 'CONFLICT', 'A newer version was saved', [{ path: 'version', message: String(version) }])

/**
 * Saves a map's file over version `base`: the file goes to a new key first, then the row moves to it only if it is still at `base`
 * (one read and one write, in one batch: the read gives the old key and says why when nothing was written). Written: the old file
 * is deleted. Not written: the new file is deleted, and 404 (not theirs) or 409 (another version was saved since)
 */
export async function saveMapFile(ctx: Ctx, id: number, base: number, bytes: ArrayBuffer): Promise<MapFileSaved> {
  const me = userId(ctx)
  const key = newKey()
  await ctx.env.BOARDS.put(key, bytes, { httpMetadata: { contentType: 'application/octet-stream' } })
  const savedAt = new Date()
  let before: { fileKey: string | null; fileVersion: number }[]
  let written: { fileVersion: number }[]
  try {
    ;[before, written] = await ctx.db.batch([
      ctx.db.select({ fileKey: maps.fileKey, fileVersion: maps.fileVersion }).from(maps).where(and(eq(maps.id, id), eq(maps.userId, me))),
      ctx.db
        .update(maps)
        .set({ fileKey: key, fileVersion: sql`${maps.fileVersion} + 1`, fileSize: bytes.byteLength, savedAt })
        .where(and(eq(maps.id, id), eq(maps.userId, me), eq(maps.fileVersion, base)))
        .returning({ fileVersion: maps.fileVersion }),
    ])
  } catch (error) {
    await ctx.env.BOARDS.delete(key)
    throw error
  }
  if (written.length === 0) {
    await ctx.env.BOARDS.delete(key)
    if (before.length === 0) throw notFound('Map not found')
    throw conflict(before[0].fileVersion)
  }
  const old = before[0]?.fileKey
  if (old) await ctx.env.BOARDS.delete(old)
  return { version: written[0].fileVersion, savedAt: savedAt.toISOString() }
}

/**
 * A branch of a map (docs/plans/38): a new map in the source's branch group, with `file` (the board the user has open) as its file.
 * One read (the source), then one batch: the new row and, for the group's first branch, the source becoming the group's root. Its
 * nodes are in the file (their `ref`s too): no row per node
 */
export async function createBranch(ctx: Ctx, sourceId: number, title: string, file: ArrayBuffer) {
  const source = await mapRow(ctx, sourceId)
  if (!source) throw notFound('Map not found')
  const root = source.branchOf || source.id
  const key = newKey()
  await ctx.env.BOARDS.put(key, file, { httpMetadata: { contentType: 'application/octet-stream' } })
  try {
    const insert = ctx.db
      .insert(maps)
      .values({
        userId: userId(ctx),
        title,
        branchOf: root,
        position: source.position,
        forkedFrom: source.id,
        forkedVersion: source.fileVersion,
        fileKey: key,
        fileVersion: 1,
        fileSize: file.byteLength,
        savedAt: new Date(),
      })
      .returning()
    if (source.branchOf) {
      const [made] = await ctx.db.batch([insert])
      return { map: mapJson(made[0]), root: null }
    }
    // (branch_of is in no index: the root's update is one write)
    const [made, rooted] = await ctx.db.batch([insert, ctx.db.update(maps).set({ branchOf: source.id }).where(eq(maps.id, source.id)).returning()])
    return { map: mapJson(made[0]), root: rooted[0] ? mapJson(rooted[0]) : null }
  } catch (error) {
    await ctx.env.BOARDS.delete(key)
    throw error
  }
}

/**
 * Duplicate's copy of a map's file (the generic copy made the row): `from`'s file under a new key, for map `to`. Two rows read in one
 * query, one write. Nothing to copy (`from` was never saved): null
 */
export async function copyMapFile(ctx: Ctx, to: number, from: number): Promise<MapFileSaved | null> {
  const rows = await ctx.db
    .select({ id: maps.id, fileKey: maps.fileKey })
    .from(maps)
    .where(and(inArray(maps.id, [to, from]), eq(maps.userId, userId(ctx))))
  const target = rows.find((r) => r.id === to)
  const source = rows.find((r) => r.id === from)
  if (!target || !source) throw notFound('Map not found')
  if (!source.fileKey) return null
  const object = await ctx.env.BOARDS.get(source.fileKey)
  if (!object) return null
  const bytes = await object.arrayBuffer()
  const key = newKey()
  await ctx.env.BOARDS.put(key, bytes, { httpMetadata: { contentType: 'application/octet-stream' } })
  const savedAt = new Date()
  const written = await ctx.db
    .update(maps)
    .set({ fileKey: key, fileVersion: sql`${maps.fileVersion} + 1`, fileSize: bytes.byteLength, savedAt })
    .where(eq(maps.id, to))
    .returning({ fileVersion: maps.fileVersion })
  if (target.fileKey) await ctx.env.BOARDS.delete(target.fileKey)
  return { version: written[0].fileVersion, savedAt: savedAt.toISOString() }
}

export type { MapRow }
