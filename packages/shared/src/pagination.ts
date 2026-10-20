import { z } from 'zod'
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from './page-size'

export { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX }

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
