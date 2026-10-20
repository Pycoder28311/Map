import { noteFilter, noteInput, notesConfig, noteUpdate } from '@map/shared'
import { crudRoutes } from '../../lib/crud'
import { notesRepo } from './notes.repo'

/**
 * GET / (paginated: ?limit=&cursor=&archived=true|false; pinned first, then by position) · GET /:id · POST / · PATCH /:id · DELETE /:id,
 * each user only sees their own notes.
 */
export default crudRoutes({ access: notesConfig.access, create: noteInput, update: noteUpdate, filter: noteFilter, repo: notesRepo })
