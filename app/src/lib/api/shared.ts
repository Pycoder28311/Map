import type { Page, ShareableName, SharedItem } from '@map/shared'
import { request } from './client'
import { toQuery, type PageOptions } from './resource'

/** "Shared with me": the rows other people shared with the user (one table's: `objectType`), newest first, a page at a time */
export const listShared = (page: PageOptions = {}, signal?: AbortSignal, objectType?: ShareableName) =>
  request<Page<SharedItem>>(`/api/shared${toQuery({ limit: page.limit, cursor: page.cursor, objectType })}`, { signal })
