import { pageQuery } from '@map/shared'
import { Hono } from 'hono'
import { toCtx } from '../../lib/crud'
import { toPageParams } from '../../lib/pagination'
import { validate } from '../../lib/validate'
import { requireAuth, type AuthedEnv } from '../../middleware/auth'
import { listShared } from './shared.repo'

/** GET /api/shared?limit=&cursor=: "Shared with me", a page at a time (docs/plans/34) */
const sharedRoutes = new Hono<AuthedEnv>()
  .use(requireAuth)
  .get('/', validate('query', pageQuery), async (c) => c.json(await listShared(toCtx(c), toPageParams(c.req.valid('query')))))

export default sharedRoutes
