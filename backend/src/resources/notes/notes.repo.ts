import { notesConfig, previewOf, type Note, type NoteFilter, type NoteInput, type NoteListItem, type NoteUpdate } from '@map/shared'
import { and, eq } from 'drizzle-orm'
import { notes } from '../../db/schema'
import { hasChanges, userId, type Ctx, type Repo } from '../../lib/crud'
import { fetchLimit, mapPage, toPage } from '../../lib/pagination'
import { listSort, pickOrder, sortColumnsOf } from '../../lib/sort'

// The list's order comes from notesConfig.order (shared/src/notes.ts); the table's index (notes_list_idx) has the same order
const noteSort = listSort(sortColumnsOf(notes, notesConfig.order))

type Row = typeof notes.$inferSelect

/** A note without its content: what a list reads and returns (the content column is not even selected) */
type ListRow = Omit<Row, 'content'>

/** The only fields that leave the server; typed by the shared contract */
const toListItem = (note: ListRow): NoteListItem => ({
  id: note.id,
  title: note.title,
  preview: note.preview,
  archived: note.archived,
  ...pickOrder(note, notesConfig.order), // pinned and position, whichever the config turns on
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString(),
})

const toJson = (note: Row): Note => ({ ...toListItem(note), content: note.content })

/**
 * The preview is derived from the content in the same write, so the two never differ: only a write that sets the content
 * sets the preview (the content is already cleaned by the contract; the preview is plain text made from it).
 */
const withPreview = <T extends { content?: string }>(fields: T) =>
  fields.content === undefined ? fields : { ...fields, preview: previewOf(fields.content) }

const mine = (ctx: Ctx, id: number) => and(eq(notes.id, id), eq(notes.userId, userId(ctx)))

/**
 * A note's pictures are <img> tags in its content: nothing here uses the images table, so the files are not deleted when a
 * picture leaves the text or the note goes (the sanitizer only keeps images of this app's storage).
 */
export const notesRepo: Repo<NoteInput, NoteUpdate, Note, NoteFilter, NoteListItem> = {
  async list(ctx, page, { archived }) {
    const rows = await ctx.db.query.notes.findMany({
      where: and(eq(notes.userId, userId(ctx)), eq(notes.archived, archived), noteSort.after(page)),
      columns: { content: false }, // a list shows the preview: the (up to 100 KB) content is not read
      orderBy: noteSort.orderBy,
      limit: fetchLimit(page),
    })
    return mapPage(toPage(rows, page, noteSort.cursorOf), toListItem)
  },

  async get(ctx, id) {
    const note = await ctx.db.query.notes.findFirst({ where: mine(ctx, id) })
    return note ? toJson(note) : null
  },

  async create(ctx, fields) {
    const note = await ctx.db.insert(notes).values({ ...withPreview(fields), userId: userId(ctx) }).returning().get()
    return toJson(note)
  },

  // updated_at is refreshed by the schema on every update
  async update(ctx, id, fields) {
    if (!hasChanges(fields)) return notesRepo.get(ctx, id) // nothing to change (Drizzle rejects an empty SET): the note as it is
    const note = await ctx.db.update(notes).set(withPreview(fields)).where(mine(ctx, id)).returning().get()
    return note ? toJson(note) : null
  },

  async remove(ctx, id) {
    const gone = await ctx.db.delete(notes).where(mine(ctx, id)).returning({ id: notes.id }).get()
    return gone !== undefined
  },
}
