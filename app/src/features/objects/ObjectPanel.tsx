import { LuHeart } from 'react-icons/lu'
import { findObject } from '../../mocks/projects'
import { toggleLike, useMockObjects } from '../../mocks/projectsStore'
import LinkedList from '../links/LinkedList'
import type { PanelProps } from '../workspace/types'
import { placeholderArt } from './placeholderArt'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** One object card: its picture, name, date, description, likes and the notes linked to it */
export default function ObjectPanel({ id }: PanelProps) {
  useMockObjects() // re-render on changes
  const object = findObject(id)
  if (!object) return <p className="p-4 text-body text-fg-muted">Not found.</p>

  return (
    <div className="flex h-full min-h-48 flex-col gap-3 p-4">
      <div style={placeholderArt(object.id)} className="h-40 shrink-0 rounded-(--card-radius)" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-heading">{object.name}</h2>
          <p className="text-small text-fg-subtle">{DATE.format(object.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => toggleLike(object.id)}
          aria-pressed={!!object.liked}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-small text-fg-muted hover:bg-fill"
        >
          <LuHeart className={`size-4 ${object.liked ? 'fill-danger text-danger' : ''}`} />
          {object.likes}
        </button>
      </div>
      <p className="text-body whitespace-pre-wrap">{object.description || <span className="text-fg-muted">No description yet.</span>}</p>
      <LinkedList objectId={object.id} isNote={false} title="Linked notes" />
    </div>
  )
}
