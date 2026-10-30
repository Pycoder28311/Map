import type { SharedItem } from '@map/shared'
import { useState, useSyncExternalStore } from 'react'
import { LuChevronDown, LuChevronUp, LuRefreshCw } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import { listShared } from '../../../lib/api/shared'
import { resourceByName } from '../../../resources/registry'
import Button from '../../ui/buttons/Button'
import Divider from '../../ui/Divider'

const PAGE = 20

type State = { items: SharedItem[]; cursor: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }

// One list for the whole app (the sidebar mounts this again as it changes): read the first time the section is opened, then kept until
// its refresh button, or the next load of the app
let state: State = { items: [], cursor: null, status: 'idle', error: null }
const listeners = new Set<() => void>()
const setState = (next: Partial<State>) => {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Reads the first page (`more`: the next one) */
async function load(more: boolean) {
  if (state.status === 'loading') return
  setState({ status: 'loading', error: null })
  try {
    const page = await listShared({ limit: PAGE, cursor: more ? state.cursor : null })
    setState({ items: more ? [...state.items, ...page.items] : page.items, cursor: page.nextCursor, status: 'ready' })
  } catch (e) {
    setState({ status: 'error', error: e instanceof Error ? e.message : 'Could not load' })
  }
}

/**
 * Shared with me (docs/plans/34): what other people shared with the user, newest first, each with its kind's icon and Reader / Editor;
 * a click opens it. Closed at first: its list is read only when it is opened, a page at a time
 */
export default function SharedSection({ compact }: { compact: boolean }) {
  const [open, setOpen] = useState(false)
  const shared = useSyncExternalStore(subscribe, () => state)
  const workspace = useWorkspace()

  const toggle = () => {
    if (!open && shared.status === 'idle') void load(false)
    setOpen(!open)
  }

  return (
    <section aria-label="Shared with me">
      <Divider
        label="Shared with me"
        action={{ icon: open ? LuChevronUp : LuChevronDown, label: open ? 'Hide what is shared with me' : 'Show what is shared with me', onClick: toggle }}
        compact={compact}
        className="my-(--divider-gap)"
      />
      {open && !compact && (
        <div className="flex flex-col gap-0.5">
          {shared.items.map((item) => {
            const resource = resourceByName(item.objectType)
            if (!resource) return null
            const Icon = resource.ui.icon
            return (
              <Link
                key={item.id}
                to={workspace.hrefOf({ type: resource.panelType, id: String(item.objectId) })}
                className="flex min-w-0 items-center gap-2 rounded-(--corner-sm) px-(--btn-px) py-1 text-body hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent"
                title={item.owner ? `Shared by ${item.owner.name}` : undefined}
              >
                <Icon className="size-(--btn-icon-size) shrink-0 text-fg-subtle" />
                <span className="min-w-0 flex-1 truncate">{item.title || resource.ui.untitled}</span>
                <span className="shrink-0 text-small text-fg-subtle">{item.role === 'editor' ? 'Editor' : 'Reader'}</span>
              </Link>
            )
          })}
          {shared.status === 'loading' && <p className="px-(--btn-px) text-small text-fg-subtle">Loading…</p>}
          {shared.status === 'ready' && shared.items.length === 0 && <p className="px-(--btn-px) text-small text-fg-subtle">Nothing is shared with you yet.</p>}
          {shared.status === 'error' && <p className="px-(--btn-px) text-small text-danger">{shared.error}</p>}
          <div className="flex items-center gap-1">
            {shared.cursor && (
              <Button variant="ghost" size="sm" plain disabled={shared.status === 'loading'} onClick={() => void load(true)}>
                Show more
              </Button>
            )}
            <Button variant="ghost" size="sm" plain icon={LuRefreshCw} className="ms-auto" disabled={shared.status === 'loading'} onClick={() => void load(false)}>
              Refresh
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
