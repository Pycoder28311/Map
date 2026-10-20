import { z } from 'zod'
import { orderFields, type OrderOutput } from './order'
import { richText } from './rich-text'

/**
 * The projects table's settings, in one place (the same shape as notesConfig, notes.ts): the backend builds the table's columns and
 * index, the list query and the routes from this, and the contract below too. Run the migration after changing it.
 */
export const projectsConfig = {
  /** Who may read and write: each user only their own projects */
  access: 'owner',
  /** List order: pinned first, then position, then id (see order.ts for the four cases) */
  order: { pinned: true, position: true },
  /** Equality filters of the list, kept first in its index (before the order) so a filtered list reads only its own rows */
  listFilters: ['archived'],
} as const

const projectFields = z.object({
  title: z.string().trim().max(200),
  content: richText, // HTML from the editor: checked and cleaned by the contract itself
  archived: z.boolean(),
  ...orderFields(projectsConfig.order), // pinned and position, whichever the config turns on
})

/** What a client may send to make a project: every field is optional, but it needs a title or some text (the owner always comes from the session) */
export const projectInput = projectFields
  .partial()
  .refine((project) => (project.title ?? '') !== '' || (project.content ?? '') !== '', 'A project needs a title or some text')

/** What a client may send to change a project: only the fields it changes */
export const projectUpdate = projectFields.partial()

/** Query string of the projects list: ?archived=true lists the archived ones (default: the others) */
export const projectFilter = z.object({
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

export type ProjectFilter = z.infer<typeof projectFilter>
export type ProjectInput = z.infer<typeof projectInput>
export type ProjectUpdate = z.infer<typeof projectUpdate>

export type Project = {
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
} & OrderOutput<typeof projectsConfig.order>

/** A project in the list: everything but the content (lists show the preview; the whole project comes from GET /:id) */
export type ProjectListItem = Omit<Project, 'content'>
