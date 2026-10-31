import { commentFilter, commentInput, commentUpdate } from '@map/shared'
import { crudRoutes } from '../../lib/crud'
import { commentsRepo } from './comments.repo'

/**
 * /api/comments (docs/plans/37): GET /?articleId=&parentId=&cursor= (one level, a page at a time), POST (10 a minute per person),
 * PATCH /:id, DELETE /:id, signed in; the repo checks the article's access
 */
const commentsRoutes = crudRoutes({
  access: 'owner',
  create: commentInput,
  update: commentUpdate,
  filter: commentFilter,
  repo: commentsRepo,
})

export default commentsRoutes
