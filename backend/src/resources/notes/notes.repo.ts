import { imageSrcsIn, type Note, type NoteInput, type NoteUpdate } from '@map/shared'
import { and, desc, eq, like, ne, or } from 'drizzle-orm'
import { notes } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { beforeCursor, fetchLimit, mapPage, toPage } from '../../lib/pagination'
import { deleteImagesByKey, imagesBase } from '../images/images.repo'

const find = (ctx: Ctx, id: number) =>
  ctx.db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId(ctx))) })

type Row = NonNullable<Awaited<ReturnType<typeof find>>>

/** The only fields that leave the server; typed by the shared contract */
const toJson = (note: Row): Note => ({
  id: note.id,
  title: note.title,
  content: note.content,
  pinned: note.pinned,
  archived: note.archived,
  position: note.position,
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString(),
})

/** Most keys checked in one query (D1 allows 100 bound values in a statement) */
const MAX_KEYS = 90

/** The keys of the stored images shown in a note's text (the text is already cleaned: only this app's images are in it) */
const imageKeysIn = (env: CloudflareBindings, content: string) => {
  const base = imagesBase(env)
  const prefix = base.slice(0, base.length - 'img/'.length) // "<IMAGES_URL>/<folder>/": a key is what follows
  return imageSrcsIn(content)
    .filter((src) => src.startsWith(base))
    .map((src) => src.slice(prefix.length))
}

/**
 * Deletes the images that left a note's text (rows and files), except those another of the user's notes still shows
 * (a picture copied from one note into another). `exceptNoteId`: the note whose text is being changed or removed.
 */
async function deleteUnusedImages(ctx: Ctx, keys: string[], exceptNoteId: number) {
  const checked = keys.slice(0, MAX_KEYS)
  if (checked.length === 0) return
  const others = await ctx.db
    .select({ content: notes.content })
    .from(notes)
    .where(and(eq(notes.userId, userId(ctx)), ne(notes.id, exceptNoteId), or(...checked.map((key) => like(notes.content, `%${key}%`)))))
  const stillShown = (key: string) => others.some((n) => n.content.includes(key))
  await deleteImagesByKey(ctx, checked.filter((key) => !stillShown(key)))
}

export const notesRepo: Repo<NoteInput, NoteUpdate, Note> = {
  async list(ctx, page) {
    const rows = await ctx.db.query.notes.findMany({
      where: and(eq(notes.userId, userId(ctx)), beforeCursor(notes.id, page)),
      orderBy: desc(notes.id),
      limit: fetchLimit(page),
    })
    return mapPage(
      toPage(rows, page, (n) => n.id),
      toJson,
    )
  },

  async get(ctx, id) {
    const note = await find(ctx, id)
    return note ? toJson(note) : null
  },

  async create(ctx, fields) {
    const note = await ctx.db.insert(notes).values({ ...fields, userId: userId(ctx) }).returning().get()
    return toJson(note)
  },

  async update(ctx, id, fields) {
    const existing = await find(ctx, id)
    if (!existing) return null
    // updated_at is refreshed by the schema on every update
    const note = await ctx.db.update(notes).set(fields).where(and(eq(notes.id, id), eq(notes.userId, userId(ctx)))).returning().get()
    if (fields.content !== undefined) {
      const kept = new Set(imageKeysIn(ctx.env, note.content))
      await deleteUnusedImages(ctx, imageKeysIn(ctx.env, existing.content).filter((key) => !kept.has(key)), id)
    }
    return toJson(note)
  },

  async remove(ctx, id) {
    const existing = await find(ctx, id)
    if (!existing) return false
    await ctx.db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId(ctx))))
    await deleteUnusedImages(ctx, imageKeysIn(ctx.env, existing.content), id)
    return true
  },
}
