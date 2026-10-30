import type { Author } from '@map/shared'
import { useEffect, useState, type FormEvent } from 'react'
import { LuGlobe, LuLock, LuSearch, LuUserRoundPlus, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import CheckField from '../../components/ui/fields/CheckField'
import SwitchField from '../../components/ui/fields/SwitchField'
import TextField from '../../components/ui/fields/TextField'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import Modal from '../../components/ui/overlays/Modal'
import { ApiError } from '../../lib/api/client'
import { lookupUser } from '../../lib/api/users'
import { placeholderArt } from '../objects/placeholderArt'
import { allowedFrom, allowedOf, changesOf, initialsOf, permissionOf, withSwitch, type Allowed, type AllowedRole, type Permission, type useSharing, type Visibility } from './sharing'

const CHOICES: { value: Visibility; label: string; text: string; icon: typeof LuLock }[] = [
  { value: 'private', label: 'Private', text: 'Only you, and the people you allow', icon: LuLock },
  { value: 'public', label: 'Public', text: 'Everyone signed in who has the link', icon: LuGlobe },
]

const ROLE_LABEL: Record<AllowedRole, string> = { reader: 'Allow reading', editor: 'Allow reading and editing' }

type Sharing = ReturnType<typeof useSharing>

/** A person's round picture: theirs, or their initials on a colour made from their id */
export function Avatar({ person, size = 'size-6' }: { person: Author; size?: string }) {
  if (person.image) return <img src={person.image} alt="" referrerPolicy="no-referrer" className={`shrink-0 rounded-full object-cover ${size}`} />
  return (
    <span aria-hidden style={placeholderArt(person.id)} className={`inline-flex shrink-0 items-center justify-center rounded-full text-small font-medium text-fg ${size}`}>
      {initialsOf(person)}
    </span>
  )
}

/**
 * One person of the list: a checkbox at the right end of the row chooses them, and then two switches open below (Allow reading, Allow
 * editing), each with a small faint "What it is" (HoverInfo). Nothing is saved until Apply (People)
 */
function PersonRow({ person, what, permission, onPermission }: { person: Author; what: string; permission: Permission; onPermission: (change: Partial<Permission>) => void }) {
  const switches = [
    { key: 'read' as const, label: 'Allow reading', what: `They can open and read the ${what}, but cannot change anything in it.` },
    { key: 'edit' as const, label: 'Allow editing', what: `They can change the ${what}'s own text. It needs reading, so it turns that on too.` },
  ]
  return (
    <li className="flex flex-col">
      <CheckField
        label={
          <span className="flex min-w-0 items-center gap-2">
            <Avatar person={person} />
            <span className="truncate">{person.name}</span>
          </span>
        }
        checked={permission.on}
        onChange={(on) => onPermission({ on })}
        boxAt="end"
        className="min-h-8"
      />
      {permission.on && (
        <ul aria-label={`What ${person.name} can do`} className="flex flex-col gap-1 ps-6 pt-1 pb-1">
          {switches.map((s) => (
            <li key={s.key}>
              <SwitchField label={s.label} checked={permission[s.key]} onChange={(on) => onPermission({ [s.key]: on })}>
                <HoverInfo title={s.label} text={s.what} side="top" delay={350}>
                  <Button variant="ghost" size="xs" plain className="font-normal! [--btn-text:var(--fg-subtle)]!">
                    What it is
                  </Button>
                </HoverInfo>
              </SwitchField>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** The message of a failed email search */
const lookupError = (e: unknown) =>
  e instanceof ApiError && e.status === 404 ? 'Nobody with this email.' : e instanceof ApiError && e.status === 429 ? 'Too many searches. Wait a minute.' : 'Could not search. Try again.'

/**
 * The people: the ones allowed already and the ones found by their exact email (Find), each chosen with a checkbox and given reading
 * and / or editing with two switches; Apply asks first (a modal that says what will be done) and sends only the changes, at once
 */
function People({ sharing, what }: { sharing: Sharing; what: string }) {
  const [searching, setSearching] = useState(false)
  const [email, setEmail] = useState('')
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState<string | null>(null)
  // People found by email, not allowed yet (shown first, newest on top)
  const [found, setFound] = useState<Author[]>([])
  // What was changed in the rows and is not applied yet (people not in it are as they are saved)
  const [edits, setEdits] = useState<Record<string, Permission>>({})
  const [confirming, setConfirming] = useState(false)
  const [applying, setApplying] = useState(false)

  const rights = sharing.rights ?? []
  const saved = allowedOf(rights)
  const people = [...found.filter((p) => !rights.some((r) => r.user.id === p.id)), ...rights.map((r) => r.user)]
  const next = allowedFrom(saved, edits)
  const changes = changesOf(saved, next)
  const changed = changes.added.length + changes.changed.length + changes.removed.length > 0
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Someone'
  const permission = (id: string) => edits[id] ?? permissionOf(saved, id)

  const find = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || finding) return
    setFinding(true)
    setFindError(null)
    try {
      const person = await lookupUser(email)
      setFound((list) => [person, ...list.filter((p) => p.id !== person.id)])
      // Found to be added: chosen, with reading
      if (!rights.some((r) => r.user.id === person.id)) setEdits((all) => ({ ...all, [person.id]: withSwitch(permissionOf(saved, person.id), { on: true }) }))
      setEmail('')
    } catch (error) {
      setFindError(lookupError(error))
    } finally {
      setFinding(false)
    }
  }

  const accept = async () => {
    setApplying(true)
    try {
      await sharing.apply({ set: [...changes.added, ...changes.changed], remove: changes.removed.map((a) => a.id) })
      setEdits({})
      setFound([])
      setConfirming(false)
    } catch {
      // sharing.error says it; the modal stays to try again
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className="text-small font-medium text-fg-muted">People</h3>
        <IconButton
          icon={searching ? LuX : LuSearch}
          label={searching ? 'Close the search of people' : 'Find a person by email'}
          size="sm"
          aria-expanded={searching}
          onClick={() => {
            if (searching) {
              setEmail('')
              setFindError(null)
            }
            setSearching(!searching)
          }}
        />
      </div>
      {searching && (
        <form className="flex items-end gap-1" onSubmit={(e) => void find(e)}>
          <TextField label="Their email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus className="min-w-0 flex-1" />
          <Button type="submit" size="sm" disabled={!email.trim() || finding}>
            {finding ? 'Finding…' : 'Find'}
          </Button>
        </form>
      )}
      {findError && <p className="text-small text-danger">{findError}</p>}
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            what={what}
            permission={permission(person.id)}
            onPermission={(change) => setEdits({ ...edits, [person.id]: withSwitch(permission(person.id), change) })}
          />
        ))}
        {sharing.loading && <li className="text-small text-fg-subtle">Loading…</li>}
        {!sharing.loading && sharing.rights !== null && people.length === 0 && <li className="text-small text-fg-subtle">Nobody yet. Find a person by their email.</li>}
      </ul>
      <Button className="w-full" disabled={!changed} onClick={() => setConfirming(true)}>
        Apply
      </Button>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Apply these permissions?"
        size="sm"
        footer={
          <>
            {/* sortBy2: a Shade button with its text, without the white corner elements and without an arrow */}
            <Button variant="ghost" size="sm" plain onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" plain disabled={applying} onClick={() => void accept()}>
              {applying ? 'Applying…' : 'Accept'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-body">
          <p>This will change who can open the {what} while it is private:</p>
          <ul className="flex flex-col gap-1">
            {changes.added.map((a: Allowed) => (
              <li key={a.id}>
                <span className="font-medium">{nameOf(a.id)}</span> <span className="text-fg-muted">gets access: {ROLE_LABEL[a.role]}</span>
              </li>
            ))}
            {changes.changed.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{nameOf(a.id)}</span> <span className="text-fg-muted">now has: {ROLE_LABEL[a.role]}</span>
              </li>
            ))}
            {changes.removed.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{nameOf(a.id)}</span> <span className="text-fg-muted">loses access</span>
              </li>
            ))}
          </ul>
          <p className="text-small text-fg-subtle">Everyone else keeps what they have now.</p>
          {sharing.error && <p className="text-small text-danger">{sharing.error}</p>}
        </div>
      </Modal>
    </div>
  )
}

/**
 * Who can see a row (the popup under the Private / Public button; its owner only): Private or Public (saved at once), and the people
 * allowed (Allow certain people): read from the server when this opens, each chosen with a checkbox and given reading and / or editing
 * with two switches, applied together with Apply. `what`: the row's kind, e.g. "article"
 */
export default function PrivacyPanel({ sharing, what }: { sharing: Sharing; what: string }) {
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const { load } = sharing
  // The people are read when the panel opens (not with the page)
  useEffect(() => load(), [load])
  const rights = sharing.rights ?? []

  const change = async (visibility?: Visibility, remove?: string[]) => {
    setBusy(true)
    try {
      await sharing.apply({ visibility, remove })
    } catch {
      // sharing.error says it
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 p-1 text-fg">
      <h2 className="px-1 pb-1 text-body font-medium text-fg">Who can see this {what}</h2>
      <div role="radiogroup" aria-label="Visibility" className="flex flex-col gap-1">
        {CHOICES.map((c) => (
          <Button
            key={c.value}
            role="radio"
            aria-checked={sharing.visibility === c.value}
            variant={sharing.visibility === c.value ? 'selected' : 'ghost'}
            plain
            icon={c.icon}
            disabled={busy}
            className="w-full justify-start"
            onClick={() => sharing.visibility !== c.value && void change(c.value)}
          >
            <span className="flex flex-col items-start text-start">
              <span>{c.label}</span>
              <span className="text-small font-normal text-fg-subtle">{c.text}</span>
            </span>
          </Button>
        ))}
      </div>
      {sharing.error && !busy && <p className="px-1 text-small text-danger">{sharing.error}</p>}

      <div className="flex flex-col gap-2 border-t border-line pt-1.5">
        {/* Like Private and Public above, set apart by the line over it */}
        <Button variant={choosing ? 'selected' : 'ghost'} plain icon={LuUserRoundPlus} aria-expanded={choosing} className="w-full justify-start" onClick={() => setChoosing(!choosing)}>
          <span className="flex flex-col items-start text-start">
            <span>Allow certain people</span>
            <span className="text-small font-normal text-fg-subtle">Choose who can read or edit it</span>
          </span>
        </Button>
        {rights.length > 0 && (
          <ul aria-label="Allowed people" className="flex flex-wrap gap-1">
            {rights.map((r) => (
              <li key={r.id} className="flex items-center gap-1 rounded-full bg-fill py-0.5 ps-0.5 pe-1">
                <Avatar person={r.user} />
                <span className="text-small">
                  {r.user.name} <span className="text-fg-subtle">· {r.role === 'editor' ? 'Editing' : 'Reading'}</span>
                </span>
                <IconButton icon={LuX} label={`Remove ${r.user.name}`} size="sm" disabled={busy} className="size-6 min-h-0 min-w-0" onClick={() => void change(undefined, [r.user.id])} />
              </li>
            ))}
          </ul>
        )}
        {choosing && (
          <>
            <People sharing={sharing} what={what} />
            {sharing.visibility === 'public' && <p className="text-small text-fg-subtle">It is public: everyone signed in can read it already.</p>}
          </>
        )}
      </div>
    </div>
  )
}
