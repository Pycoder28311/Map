import { z } from 'zod'
import { richText } from './rich-text'

const noteFields = z.object({
  title: z.string().trim().max(200),
  content: richText, // HTML from the editor: checked and cleaned by the contract itself
  pinned: z.boolean(),
  archived: z.boolean(),
  /** Where the note sits in a list (smaller first) */
  position: z.number().int().min(0).max(1_000_000_000),
})

/** What a client may send to make a note: every field is optional, but it needs a title or some text (the owner always comes from the session). Pictures go in the content as <img> tags */
export const noteInput = noteFields
  .partial()
  .refine((note) => (note.title ?? '') !== '' || (note.content ?? '') !== '', 'A note needs a title or some text')

/** What a client may send to change a note: only the fields it changes */
export const noteUpdate = noteFields.partial()

export type NoteInput = z.infer<typeof noteInput>
export type NoteUpdate = z.infer<typeof noteUpdate>

export type Note = {
  id: number
  title: string
  /** HTML (already cleaned); its pictures are <img> tags of images stored by the images API */
  content: string
  pinned: boolean
  archived: boolean
  position: number
  /** ISO 8601 */
  createdAt: string
  updatedAt: string
}
