import Card from '../../components/ui/Card'
import { findProject } from '../../mocks/projects'
import { useMockProjects } from '../../mocks/projectsStore'
import LinkedList from '../links/LinkedList'
import OpenAsPanelButton from '../workspace/OpenAsPanelButton'
import type { PanelProps } from '../workspace/types'

/** One project and its maps; each map can be opened as its own panel */
export default function ProjectPanel({ id }: PanelProps) {
  useMockProjects() // re-render on changes
  const project = findProject(id)
  if (!project) return <p className="p-4 text-body text-fg-muted">Project not found.</p>

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-heading">{project.name}</h2>
        <p className="text-body text-fg-muted">{project.description}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {project.maps.map((map) => (
          <li key={map.id}>
            <Card variant="muted" className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-body">{map.name}</span>
              <OpenAsPanelButton panel={{ type: map.kind, id: map.id }} />
            </Card>
          </li>
        ))}
      </ul>
      <LinkedList objectId={project.id} isNote={false} title="Linked notes" />
    </div>
  )
}
