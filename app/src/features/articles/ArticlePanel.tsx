import { useEffect } from 'react'
import NewItemEditor from '../../components/ui/resource/NewItemEditor'
import ResourceItemGate from '../../components/ui/resource/ResourceItemGate'
import { dropFocus, isNewId, peekFocus } from '../../lib/resource/newItem'
import { resourceByName } from '../../resources/registry'
import StarterArticle from '../starters/StarterArticle'
import { starterKeyOf, starterOf } from '../starters/starterItems'
import type { PanelProps } from '../workspace/types'
import ArticlePage from './page/ArticlePage'

/**
 * An article's panel (resources.config.ts): its page (page/ArticlePage.tsx) once the item is read.
 * With the id `new` (the sidebar's "+") it is the generic page of an item that is made when something is typed (NewItemEditor); with a
 * starter's id, the starter's page (features/starters).
 */
export default function ArticlePanel({ id }: PanelProps) {
  const resource = resourceByName('articles')!
  // The cursor goes back where it was in the page of a new item (NewItemEditor): once
  useEffect(() => {
    if (id) dropFocus(resource.name, id)
  }, [resource.name, id])
  if (!id) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  if (isNewId(id)) return <NewItemEditor resource={resource} />
  // A starter (My main character, My fantasy world): not on the server until it is first changed
  const starter = starterKeyOf(id)
  if (starter) {
    const found = starterOf(starter)
    return found.resource === 'articles' ? <StarterArticle resource={resource} starter={found} /> : <p className="p-4 text-body text-fg-muted">Not found.</p>
  }
  return (
    <ResourceItemGate key={id} resource={resource} id={id}>
      {(item) => <ArticlePage key={item.id} resource={resource} item={item} focusField={peekFocus(resource.name, id)} />}
    </ResourceItemGate>
  )
}
