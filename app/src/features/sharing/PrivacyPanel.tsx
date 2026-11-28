import { ROLE_LABEL, type Collaborator, type Role } from '@map/shared'
import { useEffect, useState } from 'react'
import { LuCheck, LuGlobe, LuLock, LuSend, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import SearchInput from '../../components/ui/fields/SearchInput'
import { fold } from '../search/search'
import RoleChoice from '../collaborators/RoleChoice'
import { useFollowing } from '../follows/followStore'
import Avatar from '../people/Avatar'
import { collaboratorsIn, invitableFrom, type Sharing, type Visibility } from './sharing'

export { default as Avatar } from '../people/Avatar'

const CHOICES: { value: Visibility; label: string; text: string; icon: typeof LuLock }[] = [
  { value: 'private', label: 'Private', text: 'Only you and your collaborators', icon: LuLock },
  { value: 'public', label: 'Public', text: 'Everyone signed in with the link can read it', icon: LuGlobe },
]

/** A small heading of one part of the panel */
function Heading({ children, count }: { children: string; count?: number }) {
  return (
    <h3 className="flex items-center gap-1 px-1 text-small font-medium text-fg-muted">
      {children}
      {count !== undefined && count > 0 && <span className="text-fg-subtle">· {count}</span>}
    </h3>
  )
}

/** One collaborator: picture, name, Remove, and their role (Read only / Author), changed at once */
function CollaboratorRow({ person, busy, onRole, onRemove }: { person: Collaborator; busy: boolean; onRole: (role: Role) => void; onRemove: () => void }) {
  return (
    <li className="flex flex-col gap-1 rounded-(--corner-sm) px-1 py-1">
      <div className="flex min-h-7 items-center gap-2">
        <Avatar person={person.user} />
        <span className="min-w-0 flex-1 truncate text-body">{person.user.name}</span>
        <IconButton icon={LuX} label={`Remove ${person.user.name}`} size="sm" disabled={busy} onClick={onRemove} />
      </div>
      <div className="ps-8">
        <RoleChoice label={`${person.user.name}'s role`} value={person.role as Role} disabled={busy} onChange={onRole} />
      </div>
    </li>
  )
}

/**
 * Invite someone I follow: a search of the people I follow (not on the row, not invited yet), the role, Send. Only people I follow can be
 * invited (docs/plans/40): the empty list says so
 */
function Invite({ sharing, what }: { sharing: Sharing; what: string }) {
  const following = useFollowing()
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('reader')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  const words = fold(query).split(/\s+/).filter(Boolean)
  const candidates = invitableFrom(following.items, sharing.people, sharing.pending).filter((f) => words.every((w) => fold(f.user.name).includes(w)))
  const person = candidates.find((c) => c.user.id === chosen)?.user

  const send = async () => {
    if (!person) return
    setSending(true)
    try {
      await sharing.invite(person.id, role)
      setSent(person.name)
      setChosen(null)
      setQuery('')
    } catch {
      // sharing.error says it
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Heading>Invite someone you follow</Heading>
      {following.status === 'ready' && following.items.length === 0 ? (
        <p className="px-1 text-small text-fg-subtle">Follow people from your profile to invite them to this {what}.</p>
      ) : (
        <>
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people you follow" aria-label="Search people you follow" />
          <ul aria-label="People you follow" className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
            {candidates.map((f) => (
              <li key={f.user.id}>
                <Button
                  variant={chosen === f.user.id ? 'primary' : 'underline'}
                 
                  size="sm"
                  aria-pressed={chosen === f.user.id}
                  className="w-full justify-start"
                  onClick={() => {
                    setChosen(chosen === f.user.id ? null : f.user.id)
                    setSent(null)
                  }}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Avatar person={f.user} size="size-5" />
                    <span className="truncate">{f.user.name}</span>
                    {chosen === f.user.id && <LuCheck aria-hidden className="ms-auto size-4" />}
                  </span>
                </Button>
              </li>
            ))}
            {following.status === 'loading' && <li className="px-1 text-small text-fg-subtle">Loading…</li>}
            {following.status === 'ready' && candidates.length === 0 && <li className="px-1 text-small text-fg-subtle">{query ? 'Nobody with this name.' : 'Everyone you follow is invited or on it already.'}</li>}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <RoleChoice value={role} onChange={setRole} />
            <Button size="sm" icon={LuSend} disabled={!person || sending} onClick={() => void send()}>
              {sending ? 'Sending…' : 'Invite'}
            </Button>
          </div>
          {sent && (
            <p role="status" className="px-1 text-small text-fg-muted">
              Invitation sent to {sent}. They become a collaborator when they accept it.
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Who can see a row (the popup under the Private / Public button; its creator only): Private or Public (saved at once), its collaborators
 * (their role changed, or taken away, at once), the invitations waiting for an answer (Unsend) and, for projects, folders, articles and
 * maps, Invite (people the creator follows). Its people are read when this opens. `what`: the row's kind, e.g. "article"
 */
export default function PrivacyPanel({ sharing, what }: { sharing: Sharing; what: string }) {
  const [busy, setBusy] = useState(false)
  const { load } = sharing
  // The people are read when the panel opens (not with the page)
  useEffect(() => load(), [load])
  const collaborators = collaboratorsIn(sharing.people)
  const pending = sharing.pending ?? []

  const act = async (change: () => Promise<void>) => {
    setBusy(true)
    try {
      await change()
    } catch {
      // sharing.error says it
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-1 text-fg">
      <h2 className="px-1 pb-1 text-body font-medium text-fg">Who can see this {what}</h2>
      <div role="radiogroup" aria-label="Visibility" className="flex flex-col gap-1">
        {CHOICES.map((c) => (
          <Button
            key={c.value}
            role="radio"
            aria-checked={sharing.visibility === c.value}
            variant={sharing.visibility === c.value ? 'primary' : 'underline'}
           
            icon={c.icon}
            disabled={busy}
            className="w-full justify-start"
            onClick={() => sharing.visibility !== c.value && void act(() => sharing.setVisibility(c.value))}
          >
            <span className="flex flex-col items-start text-start">
              <span>{c.label}</span>
              <span className="text-small font-normal text-fg-subtle">{c.text}</span>
            </span>
          </Button>
        ))}
      </div>
      {sharing.error && <p className="px-1 text-small text-danger">{sharing.error}</p>}

      <div className="flex flex-col gap-1 border-t border-line pt-2">
        <Heading count={collaborators.length}>Collaborators</Heading>
        {sharing.loading && <p className="px-1 text-small text-fg-subtle">Loading…</p>}
        {!sharing.loading && sharing.people !== null && collaborators.length === 0 && <p className="px-1 text-small text-fg-subtle">Nobody yet.</p>}
        {collaborators.length > 0 && (
          <ul aria-label="Collaborators" className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {collaborators.map((p) => (
              <CollaboratorRow
                key={p.id}
                person={p}
                busy={busy}
                onRole={(role) => void act(() => sharing.changeRole(p, role))}
                onRemove={() => void act(() => sharing.remove(p))}
              />
            ))}
          </ul>
        )}
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          <Heading count={pending.length}>Waiting for an answer</Heading>
          <ul aria-label="Invitations waiting for an answer" className="flex flex-col gap-0.5">
            {pending.map((i) => (
              <li key={i.id} className="flex min-h-7 items-center gap-2 px-1">
                <Avatar person={i.to} />
                <span className="min-w-0 flex-1 truncate text-body">
                  {i.to.name} <span className="text-small text-fg-subtle">· {ROLE_LABEL[i.payload.role]}</span>
                </span>
                <Button variant="underline" size="xs" disabled={busy} onClick={() => void act(() => sharing.unsend(i))}>
                  Unsend
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-line pt-2">
        {sharing.invitable ? (
          <Invite sharing={sharing} what={what} />
        ) : (
          <p className="px-1 text-small text-fg-subtle">A {what} keeps the collaborators it has; new people can be invited to projects, folders, articles and maps.</p>
        )}
      </div>
    </div>
  )
}
