import type { TreeMenuGroup } from '../../components/ui/tree/types'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import type { AnyResource } from '../../resources/types'
import { useObjectDrag } from '../drag/objectDrag'
import { COMMENT_SIZE, cardOf } from './cards/CardShell'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
// Shown on hover or keyboard focus, and while its menu is open
const ON_HOVER = 'opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 has-[:popover-open]:opacity-100'

type Props = {
  resource: AnyResource
  item: Record<string, unknown> & { id: number | string; createdAt?: string }
  /** The ⋯ menu's groups (useResourceMenu().menuOf) */
  menu: TreeMenuGroup[]
  onOpen: () => void
}

/**
 * An item of a resource as a Dashboard card, like a comment: a wide paper card, its title and date on top, its preview quoted below
 * behind a thin bar, fading out where it's cut. Drags like every card (onto pane edges, the Trash…), opens on a click, ⋯ menu on hover.
 */
export default function ResourceCard({ resource, item, menu, onOpen }: Props) {
  const id = String(item.id)
  const title = resource.ui.row.title(item)
  const Icon = resource.ui.icon
  const { setNodeRef, listeners, attributes, isDragging } = useObjectDrag({
    id: `dash-card:${resource.name}:${id}`,
    label: title,
    panel: resource.surfaces.panel ? { type: resource.panelType, id } : undefined,
    object: { objectId: id, kind: resource.panelType, icon: Icon, source: 'pane' },
  })
  const { role: _role, ...dragAttributes } = attributes
  const created = item.createdAt ? new Date(item.createdAt) : null

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...dragAttributes}
      data-card-id={id}
      data-card-kind={resource.panelType}
      onClick={onOpen}
      className={`${cardOf(COMMENT_SIZE)} bg-note cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2 px-0.5 pe-8 pt-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-body font-medium">
          <Icon className="size-3.5 shrink-0 text-fg-subtle" />
          <span className="min-w-0 truncate">{title}</span>
        </span>
        {created && <span className="shrink-0 text-small text-fg-subtle">{DATE.format(created)}</span>}
      </div>
      <p className="line-clamp-4 border-s-2 border-fg/20 ps-2 text-body text-fg-muted [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        {resource.ui.row.subtitle?.(item) || 'Empty'}
      </p>
      {/* Its own button: clicking it doesn't open the card */}
      <div onClick={(e) => e.stopPropagation()} className={`absolute end-2 top-2 rounded-(--btn-close-radius) bg-surface/80 ${ON_HOVER}`}>
        <TreeMenu label={`More: ${title}`} groups={menu} />
      </div>
    </div>
  )
}
