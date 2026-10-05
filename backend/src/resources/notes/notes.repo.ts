import type { Note, NoteInput } from '@map/shared'
import { and, asc, desc, eq } from 'drizzle-orm'
import { images, noteImages, notes } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { beforeCursor, fetchLimit, mapPage, toPage } from '../../lib/pagination'
import { ownsAll, removedIds, replaceLinks, type LinkTable } from '../../lib/relations'
import { deleteImages, imageUrl } from '../images/images.repo'

const noteImageLinks: LinkTable<typeof noteImages> = {
  table: noteImages,
  parent: noteImages.noteId,
  toRow: (noteId, imageId, position) => ({ noteId, imageId, position }),
}

const withImages = { images: { orderBy: asc(noteImages.position), with: { image: true } } } as const

const find = (ctx: Ctx, id: number) =>
  ctx.db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId(ctx))), with: withImages })

type Row = NonNullable<Awaited<ReturnType<typeof find>>>

/** The only fields that leave the server; typed by the shared contract */
const toJson = (env: CloudflareBindings, note: Row): Note => ({
  id: note.id,
  text: note.text,
  images: note.images.map(({ image }) => ({ id: image.id, url: imageUrl(env, image.key) })),
})

const ownsImages = (ctx: Ctx, ids: number[]) =>
  ownsAll(ctx.db, images, { id: images.id, owner: images.userId }, ids, userId(ctx))

export const notesRepo: Repo<NoteInput, NoteInput, Note> = {
  async list(ctx, page) {
    const rows = await ctx.db.query.notes.findMany({
      where: and(eq(notes.userId, userId(ctx)), beforeCursor(notes.id, page)),
      orderBy: desc(notes.id),
      limit: fetchLimit(page),
      with: withImages,
    })
    return mapPage(
      toPage(rows, page, (n) => n.id),
      (n) => toJson(ctx.env, n),
    )
  },

  async get(ctx, id) {
    const note = await find(ctx, id)
    return note ? toJson(ctx.env, note) : null
  },

  async create(ctx, { text, imageIds }) {
    if (!(await ownsImages(ctx, imageIds))) throw new HttpError(400, 'UNKNOWN_IMAGE', 'Unknown image')
    const { id } = await ctx.db.insert(notes).values({ text, userId: userId(ctx) }).returning().get()
    await ctx.db.batch([...replaceLinks(ctx.db, noteImageLinks, id, imageIds)])
    return toJson(ctx.env, (await find(ctx, id))!)
  },

  async update(ctx, id, { text, imageIds }) {
    const existing = await find(ctx, id)
    if (!existing) return null
    if (!(await ownsImages(ctx, imageIds))) throw new HttpError(400, 'UNKNOWN_IMAGE', 'Unknown image')
    await ctx.db.batch([
      ctx.db.update(notes).set({ text }).where(eq(notes.id, id)),
      ...replaceLinks(ctx.db, noteImageLinks, id, imageIds),
    ])
    await deleteImages(ctx, removedIds(existing.images.map((l) => l.imageId), imageIds))
    return toJson(ctx.env, (await find(ctx, id))!)
  },

  async remove(ctx, id) {
    const existing = await find(ctx, id)
    if (!existing) return false
    await ctx.db.delete(notes).where(eq(notes.id, id))
    await deleteImages(ctx, existing.images.map((l) => l.imageId))
    return true
  },
}
