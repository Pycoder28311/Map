// Explore (docs/plans/41): the public objects of everyone, for everyone signed in, newest first, a page at a time; a search and a type.
import { z } from 'zod'
import type { Author } from './common'
import { EXPLORABLE, type ExplorableName } from './data.config'

/** The longest search */
export const EXPLORE_QUERY_MAX = 100

/** GET /api/explore?q=&type=: a search (its title, or an article's or project's first words) and one table, both optional */
export const exploreFilter = z.object({
  q: z
    .string()
    .trim()
    .transform((q) => q.slice(0, EXPLORE_QUERY_MAX))
    .optional()
    .transform((q) => (q ? q : undefined)),
  type: z.enum(EXPLORABLE).optional(),
})
export type ExploreFilter = z.infer<typeof exploreFilter>

/** One public object: what its card shows, and who made it */
export type ExploreItem = {
  type: ExplorableName
  id: number
  title: string
  /** The first words of its text (articles and projects; '' for the others) */
  preview: string
  createdAt: string
  owner: Author
  /** The caller made it */
  mine: boolean
}
