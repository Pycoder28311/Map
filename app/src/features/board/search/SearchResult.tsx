import { useEffect, useRef } from 'react'
import { LuChevronDown, LuLocateFixed, LuPencil } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import { FLOAT } from '../floating'
import { KIND_ICON } from '../layerIcons'
import PinBadge from '../PinIconView'
import PointDescription from '../PointDescription'
import type { BoardObject } from '../types'
import type { SearchEntry } from './mapSearch'
import { mockDetails } from './mockDetails'

type Props = {
  entry: SearchEntry
  /** The object it is (its pin's look, a point's rich description) */
  object: BoardObject
  open: boolean
  onToggle: () => void
  /** Moves the map to it */
  onShow: () => void
  /** Selects it to edit it */
  onEdit: () => void
}

/**
 * One result of the map's search, a card of its own (the list has no background, like Google Maps'): its picture, name and what it is.
 * A click opens it inside the list, taller, with its fields (sample ones for now: mockDetails.ts) and its buttons; the map moves to it
 */
export default function SearchResult({ entry, object, open, onToggle, onShow, onEdit }: Props) {
  const card = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (open) card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])
  const Icon = KIND_ICON[entry.kind]
  const links = object.links.length

  return (
    <li ref={card} className={`pointer-events-auto shrink-0 overflow-hidden ${FLOAT}`}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full cursor-pointer items-center gap-3 p-3 text-start hover-fill">
        {object.kind === 'point' ? (
          <PinBadge icon={object.icon} color={object.color} className="size-10" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-(--radius-pill) bg-fill">
            <Icon className="size-5 text-fg-muted" aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium">{entry.name}</span>
          <span className="block truncate text-small text-fg-muted">
            {entry.type}
            {!open && entry.description ? ` · ${entry.description.split('\n')[0]}` : ''}
          </span>
        </span>
        <LuChevronDown className={`size-4 shrink-0 text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line p-3">
          {object.kind === 'point' && object.description ? (
            <PointDescription text={object.description} className="max-h-48 overflow-y-auto" />
          ) : entry.description ? (
            <p className="max-h-48 overflow-y-auto text-body whitespace-pre-wrap">{entry.description}</p>
          ) : (
            <p className="text-body text-fg-subtle">No description yet.</p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
            <dt className="text-fg-muted">Type</dt>
            <dd className="min-w-0 truncate">{entry.type}</dd>
            <dt className="text-fg-muted">Links</dt>
            <dd>{links === 0 ? 'None' : links}</dd>
            {mockDetails(entry).map((field) => (
              <div key={field.name} className="contents">
                <dt className="text-fg-muted">{field.name}</dt>
                <dd className="text-fg-subtle">{field.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={LuLocateFixed} onClick={onShow}>
              Show on map
            </Button>
            <Button variant="ghost" size="sm" icon={LuPencil} onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
