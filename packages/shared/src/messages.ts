// An article's messages (docs/plans/34): rows of their own, written by the article's editors on some of its words. The text keeps only
// the message's id in a link (`#mapl:k=msg&id=42`); the message is read when its words are clicked.
import { z } from 'zod'
import { entityId, queryId, type Author } from './common'

/** The longest title and text of a message */
export const MESSAGE_LIMITS = { title: 100, content: 2000 } as const
/** The most ids "Not in the text" can leave out, and the most old messages one import makes */
export const MESSAGE_EXCLUDE_MAX = 500
export const MESSAGE_IMPORT_MAX = 50

const title = z.string().trim().max(MESSAGE_LIMITS.title)
const content = z.string().max(MESSAGE_LIMITS.content)
const notEmpty = (v: { title?: string; content?: string }) => (v.title ?? '') !== '' || (v.content ?? '').trim() !== ''
const needsText = { message: 'Needs a title or a text', path: ['title'] }

/** POST /api/messages */
export const messageInput = z.object({ articleId: entityId, title: title.default(''), content: content.default('') }).refine(notEmpty, needsText)
export type MessageInput = z.input<typeof messageInput>

/** PATCH /api/messages/:id: the text (its author), or Done (its author and the article's editors) */
export const messageUpdate = z
  .object({ title: title.optional(), content: content.optional(), done: z.boolean().optional() })
  .refine((v) => v.title === undefined || v.content === undefined || notEmpty(v), needsText)
export type MessageUpdate = z.infer<typeof messageUpdate>

/** A comma list of ids in the query string (`1,2,3`) */
const idList = z
  .string()
  .max(MESSAGE_EXCLUDE_MAX * 16)
  .regex(/^(\d{1,15}(,\d{1,15})*)?$/)
  .transform((text) => (text ? [...new Set(text.split(',').map(Number))] : []))
  .refine((ids) => ids.length <= MESSAGE_EXCLUDE_MAX, { message: `At most ${MESSAGE_EXCLUDE_MAX} ids` })

/** GET /api/messages?articleId=&exclude=: the article's messages but those (the ones whose words are in the text): "Not in the text" */
export const messageFilter = z.object({ articleId: queryId, exclude: idList.default([]) })
export type MessageFilter = z.infer<typeof messageFilter>

/** POST /api/messages/import: the article's old messages (title and text in the link), made into rows at once, in this order */
export const messageImport = z.object({
  articleId: entityId,
  items: z
    .array(z.object({ title: title.default(''), content: content.default('') }).refine(notEmpty, needsText))
    .min(1)
    .max(MESSAGE_IMPORT_MAX),
})
export type MessageImport = z.input<typeof messageImport>

export type Message = {
  id: number
  articleId: number
  /** null: the author's account was deleted */
  author: Author | null
  title: string
  content: string
  done: boolean
  doneAt: string | null
  createdAt: string
  updatedAt: string
  /** What the caller may do with it (the server decides) */
  can: { edit: boolean; done: boolean; remove: boolean }
}
