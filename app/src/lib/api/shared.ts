import type { Page, SharedItem } from '@map/shared'
import { request } from './client'
import { toQuery, type PageOptions } from './resource'

/** "Shared with me": the rows other people shared with the user, newest first, a page at a time */
export const listShared = (page: PageOptions = {}, signal?: AbortSignal) =>
  request<Page<SharedItem>>(`/api/shared${toQuery({ limit: page.limit, cursor: page.cursor })}`, { signal })
