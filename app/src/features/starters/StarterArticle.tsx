import { useRef, useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { changedFields, type FormValues } from '../../lib/resource/changed'
import { actionsOf } from '../../lib/resource/hooks'
import { useListStore } from '../../lib/resource/listStoreContext'
import type { AnyResource } from '../../resources/types'
import { articlePatch } from '../articles/page/articleValues'
import ArticlePage from '../articles/page/ArticlePage'
import { useWorkspace } from '../workspace/useWorkspace'
import { makeStarterArticle } from './makeStarter'
import { starterId, starterItem, type Starter } from './starterItems'

/**
 * A starter article's page (My main character, My fantasy world): the article page, on the starter's values. The first change makes
 * the article (makeStarter.ts) and the page becomes the article's own (same place in the layout); what changed while it was being
 * made is sent after it, like the page of a new item (NewItemEditor)
 */
export default function StarterArticle({ resource, starter }: { resource: AnyResource; starter: Extract<Starter, { resource: 'articles' }> }) {
  const store = useListStore()
  const workspace = useWorkspace()
  const { data: session } = authClient.useSession()
  const [item] = useState(() => starterItem(starter))
  const latest = useRef<FormValues | null>(null)
  // The article is on its way (one request for every change made meanwhile)
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const own = [starter.infobox.image, starter.infobox.banner].filter((src): src is string => !!src)

  const change = (values: FormValues) => {
    latest.current = values
    const userId = session?.user.id
    if (!userId || started.current) return
    started.current = true
    setError(null)
    makeStarterArticle(starter.key, values, own, userId, store)
      .then(async (id) => {
        // Typed while it was being made
        const patch = latest.current ? changedFields(latest.current, values) : {}
        if (Object.keys(patch).length > 0) await actionsOf(resource).update(id, articlePatch(patch)).catch(() => undefined)
        workspace.replace({ type: resource.panelType, id: starterId(starter.key) }, { type: resource.panelType, id }, { history: 'replace' })
      })
      .catch((e: unknown) => {
        // The next change tries again
        started.current = false
        setError(e instanceof Error ? e.message : 'The article could not be made.')
      })
  }

  return (
    <>
      {error && (
        <p role="alert" className="px-4 pt-2 text-small text-danger">
          {error}
        </p>
      )}
      <ArticlePage resource={resource} item={item} onStarterChange={change} />
    </>
  )
}
