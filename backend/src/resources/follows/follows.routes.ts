import { followCountsQuery, followInput, followsFilter, followUpdate } from '@map/shared'
import { crudRoutes, toCtx } from '../../lib/crud'
import { validate } from '../../lib/validate'
import { requireAuth } from '../../middleware/auth'
import { Hono } from 'hono'
import type { AppEnv } from '../../middleware/auth'
import { followCounts, followsRepo } from './follows.repo'

/**
 * /api/follows (docs/plans/40): the generic routes (GET /?direction=&userId= a list, GET /:id, POST { userId } follow, PATCH /:id
 * nothing to change, DELETE /:id unfollow or remove a follower), plus GET /counts?userId=. /counts comes first: /:id takes numbers only
 */
const followsRoutes = new Hono<AppEnv>()
  .get('/counts', requireAuth, validate('query', followCountsQuery), async (c) => c.json(await followCounts(toCtx(c), c.req.valid('query').userId)))
  .route('/', crudRoutes({ access: 'owner', create: followInput, update: followUpdate, filter: followsFilter, repo: followsRepo }))

export default followsRoutes
