import { pageQuery, sharedFilter } from '@map/shared'
import { Hono } from 'hono'
import { toCtx } from '../../lib/crud'
import { toPageParams } from '../../lib/pagination'
import { validate } from '../../lib/validate'
import { requireAuth, type AuthedEnv } from '../../middleware/auth'
import { listShared } from './shared.repo'

/** GET /api/shared?limit=&cursor=&objectType=: "Shared with me" (one table's rows: `objectType`), a page at a time (docs/plans/34, 40) */
const sharedRoutes = new Hono<AuthedEnv>()
  .use(requireAuth)
  .get('/', validate('query', pageQuery.extend(sharedFilter.shape)), async (c) => {
    const query = c.req.valid('query')
    return c.json(await listShared(toCtx(c), toPageParams(query), { objectType: query.objectType }))
  })

export default sharedRoutes
