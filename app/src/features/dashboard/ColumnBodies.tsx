import RecentList from '../recent/RecentList'
import { resourceByName } from '../../resources/registry'
import type { ColumnId } from './columns'
import ResourceColumn from './ResourceColumn'

/** A column's rows: Recent, or a resource's list */
export default function ColumnBody({ id }: { id: ColumnId }) {
  if (id === 'recent') return <RecentList place="dash-col-recent" />
  const resource = resourceByName(id)
  return resource ? <ResourceColumn resource={resource} place={`dash-col-${id}`} /> : null
}
