import type { PanelProps } from '../../../features/workspace/types'
import { useEffect } from 'react'
import { dropFocus, isNewId, peekFocus } from '../../../lib/resource/newItem'
import type { AnyResource } from '../../../resources/types'
import NewItemEditor from './NewItemEditor'
import ResourceEditor from './ResourceEditor'

/**
 * One item of any resource as a workspace panel (resourcePanels in the registry binds the resource): edited in place, like in the modal.
 * With the id `new` (the sidebar's "+") it is the page of an item that is made when something is typed (NewItemEditor).
 */
export default function ResourcePanel({ resource, id }: PanelProps & { resource: AnyResource }) {
  // The cursor goes back where it was in the page of a new item (NewItemEditor): once
  useEffect(() => {
    if (id) dropFocus(resource.name, id)
  }, [resource.name, id])
  if (!id) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  return (
    <div className="flex h-full min-h-48 flex-col">
      {isNewId(id) ? <NewItemEditor resource={resource} /> : <ResourceEditor key={id} resource={resource} id={id} focusField={peekFocus(resource.name, id)} />}
    </div>
  )
}
