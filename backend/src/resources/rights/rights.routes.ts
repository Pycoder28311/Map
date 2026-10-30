import { rightsApply, rightsFilter } from '@map/shared'
import { requireAuth } from '../../middleware/auth'
import { crudRoutes, toCtx } from '../../lib/crud'
import { validate } from '../../lib/validate'
import { applyRights, rightInput, rightsRepo, rightUpdate } from './rights.repo'

/**
 * /api/object-rights (docs/plans/34), the owner of the row only: the generic routes (GET /?objectType=&objectId= the row's people,
 * GET /:id, POST, PATCH /:id, DELETE /:id), plus POST /apply: the privacy panel's changes at once (one batch), answering the row's
 * visibility and people
 */
const rightsRoutes = crudRoutes({
  access: 'owner',
  paginate: false,
  create: rightInput,
  update: rightUpdate,
  filter: rightsFilter,
  repo: rightsRepo,
}).post('/apply', requireAuth, validate('json', rightsApply), async (c) => c.json(await applyRights(toCtx(c), c.req.valid('json'))))

export default rightsRoutes
