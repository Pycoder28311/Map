import type { ExploreItem } from '@map/shared'
import { Link } from 'react-router-dom'
import { resourceByName } from '../../resources/registry'
import CardFace from '../dashboard/cards/cardFaces'
import Avatar from '../people/Avatar'
import { useWorkspace } from '../workspace/useWorkspace'

/**
 * One public object on the Explore page: the Dashboard's own card for its kind (the book for an article, the map in its frame, a folder,
 * a project's paper), without the owner's ⋯ menu, and under it who made it ("Yours" on the caller's own). A click opens it, read-only for
 * everyone but its people
 */
export default function ExploreCard({ item }: { item: ExploreItem }) {
  const workspace = useWorkspace()
  const resource = resourceByName(item.type)
  if (!resource) return null
  const title = item.title || resource.ui.untitled
  return (
    <li className="flex flex-col items-center gap-2">
      <Link
        to={workspace.hrefOf({ type: resource.panelType, id: String(item.id) })}
        aria-label={`${resource.ui.label}: ${title}, by ${item.owner.name}`}
        className="rounded-(--card-radius) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <CardFace resource={resource} item={{ id: item.id, title: item.title, preview: item.preview, createdAt: item.createdAt }} title={title} contents={[]} readOnly className="cursor-pointer" />
      </Link>
      <span className="flex max-w-full min-w-0 items-center gap-1.5 text-small text-fg-muted">
        <Avatar person={item.owner} size="size-5" />
        <span className="truncate">{item.owner.name}</span>
        {item.mine && <span className="shrink-0 rounded-full bg-fill px-1.5 text-[0.6875rem] leading-4 text-fg">Yours</span>}
      </span>
    </li>
  )
}
