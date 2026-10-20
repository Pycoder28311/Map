import { LuPlus } from 'react-icons/lu'
import type { AnyResource } from '../../../resources/types'
import IconButton from '../../ui/buttons/IconButton'
import Divider from '../../ui/Divider'
import ResourceRows, { type SidebarTreeSettings } from './ResourceRows'

type Props = {
  /** The resources of the group 'orphans', in the UI config's order */
  resources: AnyResource[]
  tree: SidebarTreeSettings
  compact: boolean
  onCreate: (resource: AnyResource) => void
}

/**
 * The Orphans section: what has no parent yet (folders, articles, object cards, maps…), grouped by kind. Each group is its
 * resource's list of items without a parent (sidebarFilter), with a small heading and "+" (hidden in the rail).
 */
export default function SidebarOrphans({ resources, tree, compact, onCreate }: Props) {
  if (resources.length === 0) return null
  return (
    <section aria-label="Orphans">
      <Divider label="Orphans" compact={compact} className="my-(--divider-gap)" />
      {resources.map((resource) => (
        <section key={resource.name} aria-label={resource.ui.plural} className="mb-1">
          <div className={`flex h-7 items-center justify-between ps-(--btn-px) text-small text-fg-subtle transition-opacity ${compact ? 'pointer-events-none opacity-0' : ''}`}>
            <span className="truncate">{resource.ui.plural}</span>
            <IconButton icon={LuPlus} label={`New ${resource.ui.label.toLowerCase()}`} onClick={() => onCreate(resource)} />
          </div>
          <ResourceRows resource={resource} tree={tree} compact={compact} quiet />
        </section>
      ))}
    </section>
  )
}
