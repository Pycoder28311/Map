import { useLinks, useMockObjects } from '../../mocks/projectsStore'
import { useLinkNode } from '../links/linkNode'
import { ObjectListRow, Rows, useOpenLayout } from '../objects/ListRows'
import RecentList from '../recent/RecentList'
import { resourceByName } from '../../resources/registry'
import { RESOURCE_COLUMNS, type ColumnId } from './columns'
import ResourceColumn from './ResourceColumn'

/** A column's rows: one kind of list per column id (Recent, a resource's, or the mock objects) */
export default function ColumnBody({ id }: { id: ColumnId }) {
  if (id === 'recent') return <RecentList place="dash-col-recent" />
  // The Projects and Notes columns are the server's items
  const resourceName = RESOURCE_COLUMNS[id]
  const resource = resourceName ? resourceByName(resourceName) : undefined
  if (resource) return <ResourceColumn resource={resource} place={`dash-col-${id}`} />
  return <ObjectList id={id} />
}

const EMPTY: Partial<Record<ColumnId, string>> = {
  maps: 'No maps yet.',
  objects: 'No objects yet.',
}

function ObjectList({ id }: { id: ColumnId }) {
  const objects = useMockObjects().filter((o) => !o.archived)
  useLinks() // re-render when links change
  const linkNodeFor = useLinkNode()
  const open = useOpenLayout()
  // Maps: only the maps; Objects: every one
  const rows = (id === 'maps' ? objects.filter((o) => o.kind === 'map') : objects).map((object) => (
    <ObjectListRow key={object.id} object={object} place={`dash-col-${id}`} linkNodeFor={linkNodeFor} open={open} />
  ))
  return <Rows rows={rows} empty={EMPTY[id] ?? 'Nothing here yet.'} />
}
