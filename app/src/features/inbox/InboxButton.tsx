import { useState } from 'react'
import { LuInbox } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import BarPopout from '../../components/ui/overlays/BarPopout'
import InboxList from './InboxList'
import { usePending, usePendingCount } from './inboxStore'

/** The invitations waiting for me, in the popout (read when it opens) */
function Pending({ onAll }: { onAll: () => void }) {
  const pending = usePending()
  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 p-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-body font-medium">Invitations</h2>
        <Button variant="ghost" size="sm" plain onClick={onAll}>
          See all
        </Button>
      </div>
      <div className="flex max-h-[60vh] flex-col overflow-y-auto">
        {pending.status === 'loading' && pending.items.length === 0 && <p className="text-small text-fg-subtle">Loading…</p>}
        {pending.status === 'error' && <p className="text-small text-danger">{pending.error}</p>}
        {pending.status === 'ready' && pending.items.length === 0 && <p className="py-4 text-center text-small text-fg-subtle">No invitations waiting for you.</p>}
        <InboxList items={pending.items} label="Invitations waiting for an answer" />
      </div>
    </div>
  )
}

/**
 * The inbox in the navbar (docs/plans/40): an icon with a badge (how many invitations wait for me, read once when the app opens); a
 * click opens a popout with them, each with Accept / Decline, and "See all" goes to the /inbox page
 */
export default function InboxButton() {
  const count = usePendingCount()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <BarPopout
      mode="click"
      stick="end"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <span className="relative inline-flex">
          <Button variant={open ? 'secondary' : 'ghost'} icon={LuInbox} aria-expanded={open} aria-label={count > 0 ? `Inbox: ${count} waiting` : 'Inbox'} title="Inbox">
            <span className="max-xl:hidden">Inbox</span>
          </Button>
          {count > 0 && (
            <span aria-hidden className="pointer-events-none absolute -top-2 -right-2.5 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.6875rem] leading-5 font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      }
    >
      {open && (
        <Pending
          onAll={() => {
            setOpen(false)
            navigate('/inbox')
          }}
        />
      )}
    </BarPopout>
  )
}
