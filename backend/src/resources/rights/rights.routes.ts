import { rightsApply, rightsFilter } from '@map/shared'
import { requireAuth } from '../../middleware/auth'
import { crudRoutes, toCtx } from '../../lib/crud'
import { validate } from '../../lib/validate'
import { applyRights, rightInput, rightsRepo, rightUpdate } from './rights.repo'

/**
 * /api/object-rights (docs/plans/34, 40): the generic routes (GET /?objectType=&objectId= the row's creator and collaborators, for
 * them; GET /:id and PATCH /:id { role } for the creator; DELETE /:id the creator, or the collaborator leaving; POST refused: people
 * join by invitation), plus POST /apply: the privacy panel's visibility and removals at once (one batch)
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
