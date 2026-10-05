import { z } from 'zod'

export const PAGE_SIZE_DEFAULT = 20
export const PAGE_SIZE_MAX = 100

/** Query string of paginated lists: ?limit=20&cursor=<nextCursor from the previous page> */
export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
  cursor: z.string().min(1).optional(),
})

export type PageQuery = z.infer<typeof pageQuery>

/** A page of a list, newest first. nextCursor is null on the last page. */
export type Page<T> = {
  items: T[]
  nextCursor: string | null
}
