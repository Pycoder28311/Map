import { findObject, isNoteLike, type MockObject } from '../../mocks/projects'
import { useLinks, useMockObjects } from '../../mocks/projectsStore'
import { useLinkNode } from '../links/linkNode'
import { ObjectListRow, Rows, useOpenLayout } from '../objects/ListRows'
import RecentList from '../recent/RecentList'
import { projectIdOf, type ColumnId } from './columns'

/** Where "Show all" goes, for the lists that have a page */
const ALL_PAGE: Partial<Record<ColumnId, string>> = { notes: '/notes', projects: '/projects' }

/** A column's rows: one kind of list per column id (Recent, or objects) */
export default function ColumnBody({ id }: { id: ColumnId }) {
  if (id === 'recent') return <RecentList place="dash-col-recent" />
  return <ObjectList id={id} />
}

/** The objects a column lists, and the hint after each name */
function objectsOf(id: ColumnId, objects: MockObject[]): { object: MockObject; hint?: string }[] {
  const visible = objects.filter((o) => findObject(o.id))
  const projectName = (o: MockObject) => (o.parentId ? findObject(o.parentId)?.name : undefined)
  const projectId = projectIdOf(id)
  if (projectId) return visible.filter((o) => o.parentId === projectId).map((object) => ({ object }))
  switch (id) {
    case 'notes':
      return visible.filter((o) => isNoteLike(o.kind)).map((object) => ({ object, hint: projectName(object) }))
    case 'maps':
      return visible.filter((o) => o.kind === 'map').map((object) => ({ object, hint: projectName(object) }))
    case 'projects':
      return visible.filter((o) => o.kind === 'project').map((object) => ({ object }))
    case 'orphans':
      // Every top-level object that isn't a project
      return visible.filter((o) => o.parentId === null && o.kind !== 'project').map((object) => ({ object }))
    default:
      return []
  }
}

const EMPTY: Partial<Record<ColumnId, string>> = {
  notes: 'No notes yet.',
  maps: 'No maps yet.',
  projects: 'No projects yet.',
  orphans: 'Nothing outside projects.',
}

function ObjectList({ id }: { id: ColumnId }) {
  const objects = useMockObjects()
  useLinks() // re-render when links change
  const linkNodeFor = useLinkNode()
  const open = useOpenLayout()
  const rows = objectsOf(id, objects).map(({ object, hint }) => (
    <ObjectListRow key={object.id} object={object} hint={hint} place={`dash-col-${id}`} linkNodeFor={linkNodeFor} open={open} />
  ))
  return <Rows rows={rows} empty={EMPTY[id] ?? 'Nothing here yet.'} allHref={ALL_PAGE[id]} />
}
