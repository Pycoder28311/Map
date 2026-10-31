import type { Comment, CommentInput, CommentUpdate } from '@map/shared'
import { createResourceApi } from './resource'

/**
 * Comments below an article (docs/plans/37), on the generic routes (/api/comments): `list` is one level a page at a time (`{ articleId }`
 * the top comments, `{ articleId, parentId }` a comment's replies), create (a comment or a reply), update (its text), remove
 */
export const commentsApi = createResourceApi<Comment, Comment, CommentInput, CommentUpdate, { articleId: number; parentId?: number }>('/api/comments')
