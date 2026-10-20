import { useState } from 'react'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import ResourcePage from '../../components/ui/resource/ResourcePage'
import { projectsResource } from '../../resources/projects/projects.resource'
import { asAnyResource } from '../../resources/types'

const resource = asAnyResource(projectsResource)

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/** Every project, pinned first, as a list. A click opens the project; drag one onto a pane edge to open it there, or onto the Trash */
export default function ProjectsPage() {
  const [projectId, setProjectId] = useState<string | null>(null)
  return (
    <>
      <ResourcePage resource={resource} description="Pinned projects come first." onOpenItem={setProjectId} />
      <ResourceModal resource={resource} itemId={projectId} onClose={() => setProjectId(null)} />
    </>
  )
}
