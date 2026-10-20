import { z } from 'zod'
import { orderFields, type OrderOutput } from './order'
import { richText } from './rich-text'

/**
 * The notes table's settings, in one place. The backend builds the table's columns and index, the list query and the routes from
 * this, and the contract below too, so a change here (e.g. `position: false`) adjusts them all. Run the migration after changing it.
 */
export const notesConfig = {
  /** Who may read and write: each user only their own notes */
  access: 'owner',
  /** List order: pinned first, then position, then id (see order.ts for the four cases) */
  order: { pinned: true, position: true },
  /** Equality filters of the list, kept first in its index (before the order) so a filtered list reads only its own rows */
  listFilters: ['archived'],
} as const

const noteFields = z.object({
  title: z.string().trim().max(200),
  content: richText, // HTML from the editor: checked and cleaned by the contract itself
  archived: z.boolean(),
  ...orderFields(notesConfig.order), // pinned and position, whichever the config turns on
})

/** What a client may send to make a note: every field is optional, but it needs a title or some text (the owner always comes from the session). Pictures go in the content as <img> tags */
export const noteInput = noteFields
  .partial()
  .refine((note) => (note.title ?? '') !== '' || (note.content ?? '') !== '', 'A note needs a title or some text')

/** What a client may send to change a note: only the fields it changes */
export const noteUpdate = noteFields.partial()

/** Query string of the notes list: ?archived=true lists the archived ones (default: the others) */
export const noteFilter = z.object({
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

export type NoteFilter = z.infer<typeof noteFilter>
export type NoteInput = z.infer<typeof noteInput>
export type NoteUpdate = z.infer<typeof noteUpdate>

export type Note = {
  id: number
  title: string
  /** HTML (already cleaned); its pictures are <img> tags of images stored by the images API */
  content: string
  /** The first words of the content as plain text (never HTML: show it as text); written by the server with the content */
  preview: string
  archived: boolean
  /** ISO 8601 */
  createdAt: string
  updatedAt: string
} & OrderOutput<typeof notesConfig.order>

/** A note in the list: everything but the content (lists show the preview; the whole note comes from GET /:id) */
export type NoteListItem = Omit<Note, 'content'>
