import { useState } from 'react'
import type { AnyResource } from '../../../resources/types'
import ResourceModal from './ResourceModal'
import ResourcePage from './ResourcePage'

// Also a workspace panel (src/panels.ts, resourcePages): no <main> here, AppLayout provides it
/** Every item of a resource, pinned first, as a list (surfaces.page). A click opens it in its modal; drag one onto a pane edge or the Trash */
export default function ResourceListPage({ resource }: { resource: AnyResource }) {
  const [itemId, setItemId] = useState<string | null>(null)
  return (
    <>
      <ResourcePage resource={resource} description={resource.ui.pageDescription} onOpenItem={setItemId} />
      <ResourceModal resource={resource} itemId={itemId} onClose={() => setItemId(null)} />
    </>
  )
}
