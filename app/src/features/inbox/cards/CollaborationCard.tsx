import { ROLE_LABEL, type InvitationItem } from '@map/shared'
import { useState } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Button from '../../../components/ui/buttons/Button'
import { DAY_MONTH_YEAR } from '../../../lib/dates'
import { resourceByName } from '../../../resources/registry'
import { useWorkspace } from '../../workspace/useWorkspace'
import Avatar from '../../people/Avatar'
import { answer } from '../inboxStore'

/** What an item is called in a sentence */
const KIND: Record<string, string> = { projects: 'project', folders: 'folder', articles: 'article', maps: 'map' }

/**
 * "Maria invites you to be an Author of The Drowned Kingdom (article)" (or "to read (Read only) …"), with Accept and Decline while it waits; once answered, what was
 * answered (and, accepted, a link to the item)
 */
export default function CollaborationCard({ invitation }: { invitation: InvitationItem }) {
  const workspace = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const object = invitation.object
  const title = object?.title || 'Untitled'
  const kind = object ? KIND[object.type] ?? 'item' : 'item'
  const resource = object ? resourceByName(object.type) : undefined
  const href = object && resource ? workspace.hrefOf({ type: resource.panelType, id: String(object.id) }) : null

  const reply = async (status: 'accepted' | 'declined') => {
    setBusy(true)
    setError(null)
    try {
      await answer(invitation, status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not answer. Try again.')
      setBusy(false)
    }
  }

  return (
    <article className={`flex gap-3 rounded-(--card-radius) bg-surface p-4 shadow-(--lift-shadow) ring-1 ring-line ${invitation.status === 'pending' ? '' : 'opacity-75'}`}>
      <Avatar person={invitation.from} size="size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-body">
          <span className="font-medium">{invitation.from.name}</span> invites you to{' '}
          {invitation.payload.role === 'editor' ? (
            <>
              be an <span className="font-medium">{ROLE_LABEL.editor}</span> of
            </>
          ) : (
            <>
              read (<span className="font-medium">{ROLE_LABEL.reader}</span>)
            </>
          )}{' '}
          {invitation.status === 'accepted' && href ? (
            <Link to={href} className="font-medium underline-offset-2 hover:underline">
              {title}
            </Link>
          ) : (
            <span className="font-medium">{title}</span>
          )}{' '}
          <span className="text-fg-subtle">({kind})</span>
        </p>
        <p className="text-small text-fg-subtle">
          {invitation.payload.role === 'editor' ? 'Authors can read and edit it.' : 'Read only: you can open and read it.'} · {DAY_MONTH_YEAR.format(new Date(invitation.createdAt))}
        </p>
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
        {invitation.status === 'pending' ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={LuCheck} disabled={busy} onClick={() => void reply('accepted')}>
              Accept
            </Button>
            <Button variant="secondary" size="sm" icon={LuX} disabled={busy} onClick={() => void reply('declined')}>
              Decline
            </Button>
          </div>
        ) : (
          <p className="text-small font-medium text-fg-muted">{invitation.status === 'accepted' ? 'Accepted' : 'Declined'}</p>
        )}
      </div>
    </article>
  )
}
