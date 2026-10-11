import { useDroppable } from '@dnd-kit/core'
import { useCallback, useRef } from 'react'
import { LuFolder } from 'react-icons/lu'
import DropIcon from '../../components/ui/drop/DropIcon'
import type { MockProject } from '../../mocks/projects'
import { linksOf, useLinks, useMockProjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { useObjectDrag } from '../drag/objectDrag'
import { useDragSurface } from '../drag/surfaces'
import { useLinkNode } from '../links/linkNode'
import ObjectRow, { ObjectRowLook } from '../objects/ObjectRow'
import OpenAsPanelButton from '../workspace/OpenAsPanelButton'

type LinkNodeFor = ReturnType<typeof useLinkNode>

/**
 * The projects as cards, each listing its maps and notes (the Dashboard's list). Everything is
 * draggable like its sidebar row (onto sidebar rows, the trash, pane edges); a note dragged onto a
 * project card or a map row gets linked to it (link nodes, features/links). Over this list, a dragged
 * object looks like one of its rows.
 */
export default function ProjectList() {
  const projects = useMockProjects()
  useLinks() // re-render when links change
  const linkNodeFor = useLinkNode()
  const listRef = useRef<HTMLUListElement>(null)
  useDragSurface('project-list', listRef, (item) => <ObjectRowLook label={item.label} icon={item.icon} />)

  return (
    <ul ref={listRef} className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} linkNodeFor={linkNodeFor} />
        </li>
      ))}
    </ul>
  )
}

function ProjectCard({ project, linkNodeFor }: { project: MockProject; linkNodeFor: LinkNodeFor }) {
  const { setNodeRef, listeners, attributes, isDragging } = useObjectDrag({
    id: `dashboard:${project.id}`,
    label: project.name,
    panel: { type: 'project', id: project.id },
    object: { objectId: project.id, kind: 'project', icon: LuFolder, source: 'pane' },
  })
  const { role: _role, ...dragAttributes } = attributes
  const link = linkNodeFor(project.id, 'dashboard', project.name)
  // The whole card takes the note too (the node shows where it falls in)
  const { setNodeRef: setDropRef } = useDroppable({ id: `${link.dropKey}:card`, data: link.data, disabled: link.state !== 'shown' })
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      setNodeRef(el)
      setDropRef(el)
    },
    [setNodeRef, setDropRef],
  )
  const links = linksOf(project.id).length

  return (
    <div
      ref={setRef}
      {...listeners}
      {...dragAttributes}
      className={`flex cursor-grab flex-col gap-3 rounded-(--card-radius) bg-surface p-4 shadow-lg transition-[box-shadow,opacity] active:cursor-grabbing ${
        link.active ? 'ring-2 ring-drop' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <LuFolder className="mt-0.5 size-(--btn-icon-size) shrink-0 text-fg-subtle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium">{project.name}</p>
          <p className="text-small text-fg-muted">
            {project.maps.length} {project.maps.length === 1 ? 'item' : 'items'}
            {links > 0 && ` · ${links} linked`}
          </p>
        </div>
        <DropIcon {...link} size="small" />
        {/* Any element becomes a panel with this one button */}
        <OpenAsPanelButton panel={{ type: 'project', id: project.id }} />
      </div>

      {project.maps.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {project.maps.map((child) => {
            const childLink = child.kind === 'map' ? linkNodeFor(child.id, 'dashboard', child.name) : undefined
            return (
              <li key={child.id}>
                <ObjectRow
                  object={child}
                  icon={KIND_ICON[child.kind]}
                  dragId={`dashboard:${child.id}`}
                  panel={{ type: child.kind, id: child.id }}
                  links={linksOf(child.id).length}
                  className={`py-1.5 ${childLink?.active ? 'ring-2 ring-drop' : ''}`}
                  // Maps take links: their node at the row's end
                  end={childLink && <DropIcon {...childLink} size="small" />}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
