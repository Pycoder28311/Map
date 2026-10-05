import { noteInput } from '@map/shared'
import { crudRoutes } from '../../lib/crud'
import { notesRepo } from './notes.repo'

/**
 * GET / (paginated: ?limit=&cursor=) · GET /:id · POST / · PATCH /:id · DELETE /:id,
 * each user only sees their own notes.
 */
export default crudRoutes({ access: 'owner', create: noteInput, update: noteInput, repo: notesRepo })
