import { exploreFilter } from '@map/shared'
import { z } from 'zod'
import { crudRoutes } from '../../lib/crud'
import { exploreRepo } from './explore.repo'

const nothing = z.never()

/** GET /api/explore?q=&type=&limit=&cursor= (docs/plans/41): everyone's public objects, for everyone signed in. List only */
const exploreRoutes = crudRoutes({ access: 'owner', create: nothing, update: nothing, filter: exploreFilter, repo: exploreRepo })

export default exploreRoutes
