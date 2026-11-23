import { invitationAnswer, invitationInput, invitationsFilter } from '@map/shared'
import { Hono } from 'hono'
import { crudRoutes, toCtx } from '../../lib/crud'
import { requireAuth, type AppEnv } from '../../middleware/auth'
import { invitationsRepo, pendingCount } from './invitations.repo'

/**
 * /api/invitations (docs/plans/40): the generic routes (GET /?box=&status=&type=&objectType=&objectId= a list, GET /:id, POST send,
 * PATCH /:id { status } answer, DELETE /:id unsend), plus GET /pending-count (the inbox badge), before /:id (numbers only)
 */
const invitationsRoutes = new Hono<AppEnv>()
  .get('/pending-count', requireAuth, async (c) => c.json(await pendingCount(toCtx(c))))
  .route('/', crudRoutes({ access: 'owner', create: invitationInput, update: invitationAnswer, filter: invitationsFilter, repo: invitationsRepo }))

export default invitationsRoutes
