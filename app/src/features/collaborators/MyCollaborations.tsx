import { ROLE_LABEL, type Page, type SharedItem } from '@map/shared'
import { useCallback, useEffect, useState } from 'react'
import { LuFileText } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import { listShared } from '../../lib/api/shared'
import { resourceByName } from '../../resources/registry'
import { onAccepted } from '../inbox/inboxStore'
import { useWorkspace } from '../workspace/useWorkspace'

const PAGE = 20

type State = { items: SharedItem[]; cursor: string | null; status: 'loading' | 'ready' | 'error'; error: string | null }

/**
 * The articles I collaborate on (docs/plans/40): title, creator and my role, newest first, a page at a time; a click opens it. Read when
 * shown, and again after I accept an invitation
 */
export default function MyCollaborations() {
  const workspace = useWorkspace()
  const [state, setState] = useState<State>({ items: [], cursor: null, status: 'loading', error: null })
  const resource = resourceByName('articles')

  /** The next page (Show more) */
  const more = useCallback(async (cursor: string) => {
    try {
      const page: Page<SharedItem> = await listShared({ limit: PAGE, cursor }, undefined, 'articles')
      setState((s) => ({ items: [...s.items, ...page.items], cursor: page.nextCursor, status: 'ready', error: null }))
    } catch (e) {
      setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : 'Could not load' }))
    }
  }, [])

  // The first page when shown, and again after an Accept
  useEffect(() => {
    let live = true
    const first = () =>
      listShared({ limit: PAGE }, undefined, 'articles').then(
        (page) => live && setState({ items: page.items, cursor: page.nextCursor, status: 'ready', error: null }),
        (e: unknown) => live && setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : 'Could not load' })),
      )
    void first()
    const off = onAccepted(() => void first())
    return () => {
      live = false
      off()
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {state.status === 'loading' && state.items.length === 0 && <p className="text-body text-fg-subtle">Loading…</p>}
      {state.status === 'error' && <p className="text-body text-danger">{state.error}</p>}
      {state.status === 'ready' && state.items.length === 0 && (
        <p className="text-body text-fg-subtle">You are not on anyone's articles yet. Accepted invitations show here.</p>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {state.items.map((item) => (
          <li key={item.id}>
            <Link
              to={workspace.hrefOf({ type: resource?.panelType ?? 'article', id: String(item.objectId) })}
              className="flex min-h-12 items-center gap-3 rounded-(--corner-sm) px-1 py-1.5 hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent"
            >
              <LuFileText aria-hidden className="size-5 shrink-0 text-fg-subtle" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">{item.title || resource?.ui.untitled || 'Untitled'}</span>
                {item.owner && <span className="truncate text-small text-fg-subtle">by {item.owner.name}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-fill px-2 py-0.5 text-small text-fg-muted">{ROLE_LABEL[item.role]}</span>
            </Link>
          </li>
        ))}
      </ul>
      {state.cursor && (
        <Button variant="underline"
         
          size="sm"
         
          className="self-start"
          disabled={state.status === 'loading'}
          onClick={() => {
            setState((s) => ({ ...s, status: 'loading', error: null }))
            void more(state.cursor!)
          }}
        >
          Show more
        </Button>
      )}
    </div>
  )
}
