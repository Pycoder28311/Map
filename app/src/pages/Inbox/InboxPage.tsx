import { LuInbox, LuRefreshCw } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import InboxList from '../../features/inbox/InboxList'
import { useAnswered, usePending } from '../../features/inbox/inboxStore'

// No <main> here: AppLayout provides it
/**
 * The inbox (docs/plans/40): the invitations waiting for me (Accept / Decline), then the ones I answered, newest first, a page at a time.
 * Only invitations to collaborate for now; each kind has its own card (features/inbox/cards)
 */
export default function InboxPage() {
  const pending = usePending()
  const answered = useAnswered()
  return (
    <div className="mx-auto flex max-w-[44rem] flex-col gap-10 px-4 pt-10 pb-24 sm:px-6">
      <header className="flex items-center gap-3">
        <LuInbox aria-hidden className="size-7 text-fg-muted" />
        <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
        <Button variant="ghost" size="sm" plain icon={LuRefreshCw} className="ms-auto" disabled={pending.status === 'loading'} onClick={() => void pending.reload()}>
          Refresh
        </Button>
      </header>

      <section aria-labelledby="inbox-pending" className="flex flex-col gap-3">
        <h2 id="inbox-pending" className="text-heading font-semibold">
          Waiting for you {pending.items.length > 0 && <span className="text-fg-subtle">· {pending.items.length}</span>}
        </h2>
        {pending.status === 'loading' && pending.items.length === 0 && <p className="text-body text-fg-subtle">Loading…</p>}
        {pending.status === 'error' && <p className="text-body text-danger">{pending.error}</p>}
        {pending.status === 'ready' && pending.items.length === 0 && <p className="text-body text-fg-subtle">Nothing is waiting for an answer.</p>}
        <InboxList items={pending.items} label="Invitations waiting for an answer" />
      </section>

      <section aria-labelledby="inbox-answered" className="flex flex-col gap-3">
        <h2 id="inbox-answered" className="text-heading font-semibold">
          Answered
        </h2>
        {answered.status === 'ready' && answered.items.length === 0 && <p className="text-body text-fg-subtle">Nothing answered yet.</p>}
        {answered.status === 'error' && <p className="text-body text-danger">{answered.error}</p>}
        <InboxList items={answered.items} label="Answered invitations" />
        {answered.cursor && (
          <Button variant="ghost" size="sm" plain className="self-start" disabled={answered.status === 'loading'} onClick={() => void answered.more()}>
            Show more
          </Button>
        )}
      </section>
    </div>
  )
}
