import { LuPlus } from 'react-icons/lu'
import { ROOTS } from '../../../features/dashboard/childResources'
import { useResourceList } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Divider from '../../ui/Divider'
import ResourceRows, { type SidebarTreeSettings } from './ResourceRows'

type Props = {
  resource: AnyResource
  tree: SidebarTreeSettings
  compact: boolean
  onCreate: () => void
}

/** A resource's own sidebar section (surfaces.sidebar, group 'own'): its header with "+" (and a link to its page), then its rows. Left out of the closed sidebar while it is empty */
export default function ResourceSidebarSection({ resource, tree, compact, onCreate }: Props) {
  // The closed sidebar leaves out an empty section (Notes with no notes), line and all. Not the projects': it also holds the orphans
  const list = useResourceList(resource)
  if (compact && !ROOTS.includes(resource) && list.status === 'ready' && list.items.length === 0) return null
  return (
    <section aria-label={resource.ui.plural}>
      <Divider
        label={resource.ui.plural}
        labelTo={resource.surfaces.page}
        action={{ icon: LuPlus, label: `New ${resource.ui.label.toLowerCase()}`, onClick: onCreate }}
        compact={compact}
        className="my-(--divider-gap)"
      />
      <ResourceRows resource={resource} tree={tree} compact={compact} />
    </section>
  )
}
