// Comments below an article (docs/plans/37): like social-media posts, written by every reader of the article. A reply is a comment
// too (`parentId`), nested up to COMMENT_DEPTH levels; a reply to a comment of the last level goes under that comment's parent.
import { z } from 'zod'
import { entityId, queryId, type Author } from './common'

/** The longest comment (and reply) */
export const COMMENT_MAX = 2000
/** The deepest level (a top comment is level 1) */
export const COMMENT_DEPTH = 5
/** Comments read at once (the top ones, or a comment's replies) */
export const COMMENTS_PAGE = 20

const content = z.string().trim().min(1).max(COMMENT_MAX)

/** POST /api/comments: a top comment, or a reply (`parentId`) */
export const commentInput = z.object({ articleId: entityId, parentId: entityId.optional(), content })
export type CommentInput = z.input<typeof commentInput>

/** PATCH /api/comments/:id: its text (its author) */
export const commentUpdate = z.object({ content })
export type CommentUpdate = z.infer<typeof commentUpdate>

/** GET /api/comments?articleId=: the top comments, newest first; with `parentId`: that comment's replies, oldest first */
export const commentFilter = z.object({ articleId: queryId, parentId: queryId.optional() })
export type CommentFilter = z.infer<typeof commentFilter>

export type Comment = {
  id: number
  articleId: number
  /** null: a top comment */
  parentId: number | null
  /** 1 (a top comment) to COMMENT_DEPTH */
  depth: number
  /** null: the author's account was deleted */
  author: Author | null
  content: string
  /** Its direct replies */
  replyCount: number
  createdAt: string
  updatedAt: string
  /** Changed after it was written */
  edited: boolean
  can: { edit: boolean; remove: boolean }
}
