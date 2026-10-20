import { projectFilter, projectInput, projectsConfig, projectUpdate } from '@map/shared'
import { crudRoutes } from '../../lib/crud'
import { projectsRepo } from './projects.repo'

/**
 * GET / (paginated: ?limit=&cursor=&archived=true|false; pinned first, then by position) · GET /:id · POST / · PATCH /:id · DELETE /:id,
 * each user only sees their own projects.
 */
export default crudRoutes({ access: projectsConfig.access, create: projectInput, update: projectUpdate, filter: projectFilter, repo: projectsRepo })
