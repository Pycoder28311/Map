import ResourceEditor from '../../components/ui/resource/ResourceEditor'
import type { PanelProps } from '../../features/workspace/types'
import { asAnyResource } from '../types'
import { projectsResource } from './projects.resource'

const resource = asAnyResource(projectsResource)

/** One project as a workspace panel (registered from the projects resource): edited in place, like in the modal */
export default function ProjectPanel({ id }: PanelProps) {
  if (!id) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  return (
    <div className="flex h-full min-h-48 flex-col">
      <ResourceEditor key={id} resource={resource} id={id} />
    </div>
  )
}
