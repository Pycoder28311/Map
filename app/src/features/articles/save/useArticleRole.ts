import { useLocation } from 'react-router-dom'

export type ArticleRole = 'editor' | 'reader'

/**
 * Whether the user edits this article or only reads it. Today the API answers only the user's own articles (access: 'owner'), so it is
 * always the editor; `?as=reader` in the address shows the reader's page, to try it. The sharing backend answers it for real (the
 * article's owner, or the people it allows)
 */
export function useArticleRole(): ArticleRole {
  const { search } = useLocation()
  return new URLSearchParams(search).get('as') === 'reader' ? 'reader' : 'editor'
}
