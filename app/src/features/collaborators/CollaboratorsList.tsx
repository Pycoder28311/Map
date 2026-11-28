import { ROLE_LABEL, type Collaborator, type ShareableName } from '@map/shared'
import { useEffect, useState } from 'react'
import { LuLogOut, LuUsers } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/buttons/Button'
import Modal from '../../components/ui/overlays/Modal'
import { listRights, removeRight } from '../../lib/api/rights'
import { authClient } from '../../lib/auth-client'
import Avatar from '../people/Avatar'

type Props = {
  objectType: ShareableName
  objectId: number
  /** Its kind in a sentence, e.g. "article" */
  what: string
}

/**
 * Who works on a shared row (docs/plans/40): the creator first, then its collaborators with their roles (Creator / Author / Read only).
 * Read once when shown; only its creator and its collaborators may read it, so for anyone else (a public row's reader) nothing shows. Only
 * the creator alone: nothing shows either. A collaborator can Leave (asked first)
 */
export default function CollaboratorsList({ objectType, objectId, what }: Props) {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [people, setPeople] = useState<Collaborator[] | null>(null)
  const [asking, setAsking] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    listRights(objectType, objectId).then(
      (list) => live && setPeople(list),
      () => live && setPeople([]),
    )
    return () => {
      live = false
    }
  }, [objectType, objectId])

  if (!people || people.length <= 1) return null
  // My own right, when I am a collaborator (not the creator)
  const mine = people.find((p) => p.id !== null && p.user.id === session?.user.id)

  const leave = async () => {
    if (!mine?.id) return
    setLeaving(true)
    setError(null)
    try {
      await removeRight(mine.id)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not leave. Try again.')
      setLeaving(false)
    }
  }

  return (
    <section aria-label="Collaborators" className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-small font-medium text-fg-muted">
          <LuUsers aria-hidden className="size-4" />
          Collaborators <span className="text-fg-subtle">· {people.length}</span>
        </h2>
        {mine && (
          <Button variant="underline" size="xs" icon={LuLogOut} className="ms-auto" onClick={() => setAsking(true)}>
            Leave
          </Button>
        )}
      </div>
      <ul className="flex flex-wrap gap-2">
        {people.map((p) => (
          <li key={p.id ?? 'creator'} className="flex items-center gap-2 rounded-full bg-fill py-1 ps-1 pe-3">
            <Avatar person={p.user} size="size-7" />
            <span className="flex flex-col leading-tight">
              <span className="text-small font-medium">
                {p.user.name}
                {p.user.id === session?.user.id && <span className="font-normal text-fg-subtle"> (you)</span>}
              </span>
              <span className="text-[0.6875rem] text-fg-subtle">{ROLE_LABEL[p.role]}</span>
            </span>
          </li>
        ))}
      </ul>
      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title={`Leave this ${what}?`}
        size="sm"
        footer={
          <>
            <Button variant="underline" size="sm" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button tone="red" size="sm" disabled={leaving} onClick={() => void leave()}>
              {leaving ? 'Leaving…' : 'Leave'}
            </Button>
          </>
        }
      >
        <p className="text-body">You stop being a collaborator: it leaves your lists, and only its creator can invite you again.</p>
        {error && <p className="text-small text-danger">{error}</p>}
      </Modal>
    </section>
  )
}
