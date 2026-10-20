import type { PanelProps } from '../../../features/workspace/types'
import type { AnyResource } from '../../../resources/types'
import ResourceEditor from './ResourceEditor'

/** One item of any resource as a workspace panel (resourcePanels in the registry binds the resource): edited in place, like in the modal */
export default function ResourcePanel({ resource, id }: PanelProps & { resource: AnyResource }) {
  if (!id) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  return (
    <div className="flex h-full min-h-48 flex-col">
      <ResourceEditor key={id} resource={resource} id={id} />
    </div>
  )
}
