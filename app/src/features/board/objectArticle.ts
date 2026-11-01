// The article of a board object (a line, area or shape). Until "Create article" is pressed it is only written in the object (its Info
// box and text in the map's file, its title the object's: objectTitle.ts); then the article is made from them and the object keeps `ref`.
import { actionsOf } from '../../lib/resource/hooks'
import { toHtml } from '../notes/noteHtml'
import { resourceByName } from '../../resources/registry'
import { updateObject } from './boardStore'
import { KIND_NAME } from './layers'
import { hasTypes, objectInfoboxOf } from './infoTypes'
import { titleOf } from './objectTitle'
import type { BoardObject } from './types'

/** The id of the article the object is connected to (none: null) */
export const articleIdOf = (object: BoardObject): number | null => (object.ref?.type === 'articles' ? object.ref.id : null)

/** Only these can have an article (a point has its own form; a text is only a text) */
export const canHaveArticle = (object: BoardObject) => object.kind === 'line' || object.kind === 'border' || object.kind === 'shape'

/** The article's text before it is made: what was written in the left element, else the description as paragraphs */
export const draftTextOf = (object: BoardObject) => object.articleText || toHtml(object.description?.trim() ?? '')

/** What the article is made of: the object's title (else what it is), its text and its Info box */
export function articleDraft(object: BoardObject, board: BoardObject[] = []) {
  return {
    title: titleOf(object, board).trim() || KIND_NAME[object.kind],
    content: draftTextOf(object),
    // (its type's rows, or the box as it was changed)
    ...(hasTypes(object) ? { infobox: objectInfoboxOf(object) } : {}),
  }
}

/**
 * Makes the article from what the object holds (one request) and connects them: the object gets `ref`, and what moved to the article
 * leaves it (its Info box, its text, its description; an area keeps its description: it is drawn under its name on the map). One undo
 * step; the connection reaches the server with the next Save
 */
export async function createArticleFor(mapId: string, object: BoardObject, board: BoardObject[] = []): Promise<number> {
  const articles = resourceByName('articles')!
  const article = (await actionsOf(articles).create(articleDraft(object, board) as never)) as { id: number }
  updateObject(mapId, object.id, {
    ref: { type: 'articles', id: article.id },
    infobox: undefined,
    articleText: undefined,
    articleType: undefined,
    ...(object.kind === 'border' ? {} : { description: '' }),
  })
  return article.id
}
