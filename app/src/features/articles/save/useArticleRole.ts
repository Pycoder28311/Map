import type { ItemAccess } from '@map/shared'

export type ArticleRole = 'editor' | 'reader'

/**
 * Whether the user edits this article or only reads it, from what the server says they may do with it (`access`, docs/plans/34): its
 * owner and the people it allows to edit get the editor's page; the people it allows to read, and everyone when it is public, the
 * reader's
 */
export function useArticleRole(item: Record<string, unknown>): ArticleRole {
  const access = (item.access as ItemAccess | undefined) ?? 'owner'
  return access === 'reader' ? 'reader' : 'editor'
}
