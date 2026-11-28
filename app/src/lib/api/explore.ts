import type { ExploreFilter, ExploreItem } from '@map/shared'
import { createResourceApi } from './resource'

/** GET /api/explore (docs/plans/41): everyone's public objects, newest first, a page at a time. List only */
export const exploreApi = createResourceApi<ExploreItem, ExploreItem, never, never, ExploreFilter>('/api/explore')
