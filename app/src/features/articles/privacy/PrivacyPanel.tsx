import { useState } from 'react'
import { LuGlobe, LuLock, LuSearch, LuUserRoundPlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import CheckField from '../../../components/ui/fields/CheckField'
import SearchInput from '../../../components/ui/fields/SearchInput'
import SwitchField from '../../../components/ui/fields/SwitchField'
import HoverInfo from '../../../components/ui/overlays/HoverInfo'
import Modal from '../../../components/ui/overlays/Modal'
import { personById, usePeople, type Person } from '../../people/mockPeople'
import { PersonAvatar } from '../../people/PersonCard'
import { allowedFrom, changesOf, permissionOf, withRole, withSwitch, type Allowed, type AllowedRole, type ArticlePrivacy, type Permission, type Visibility } from './privacyStore'

const CHOICES: { value: Visibility; label: string; text: string; icon: typeof LuLock }[] = [
  { value: 'private', label: 'Private', text: 'Only you, and the people you allow', icon: LuLock },
  { value: 'public', label: 'Public', text: 'Anyone with the link; it can be shared', icon: LuGlobe },
]

const ROLE_LABEL: Record<AllowedRole, string> = { reader: 'Allow reading', editor: 'Allow reading and editing' }

/** The two switches of a chosen person, each with the sentence its "What it is" says */
const SWITCHES: { key: 'read' | 'edit'; label: string; what: string }[] = [
  { key: 'read', label: 'Allow reading', what: 'They can open and read the article, but cannot change anything in it.' },
  { key: 'edit', label: 'Allow editing', what: 'They can change the article: its text, its info box and its messages. It needs reading, so it turns that on too.' },
]

type Props = {
  privacy: ArticlePrivacy
  onChange: (next: ArticlePrivacy) => void
}

/**
 * One person of the list: a checkbox at the right end of the row chooses them, and then two switches open below, each at the right end of its row, (Allow reading, Allow editing), each with
 * a small faint "What it is" that says what it means in a floating element, as the edit bar's buttons do (HoverInfo). Nothing is saved
 * until Apply (People)
 */
function PersonRow({ person, permission, onPermission }: { person: Person; permission: Permission; onPermission: (change: Partial<Permission>) => void }) {
  return (
    <li className="flex flex-col">
      <CheckField
        label={
          <span className="flex min-w-0 items-center gap-2">
            <PersonAvatar person={person} size="size-6" />
            <span className="truncate">{person.name}</span>
            <span className="truncate text-small text-fg-subtle">@{person.handle}</span>
          </span>
        }
        checked={permission.on}
        onChange={(on) => onPermission({ on })}
        boxAt="end"
        className="min-h-8"
      />
      {permission.on && (
        <ul aria-label={`What ${person.name} can do`} className="flex flex-col gap-1 ps-6 pt-1 pb-1">
          {SWITCHES.map((s) => (
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

/** What the confirmation says about one person */
const roleSentence = (a: Allowed) => ROLE_LABEL[a.role]

/**
 * The people, a search button at the right of their name (it opens the search field below, and becomes an X that closes it), the rows, and
 * Apply under them: it asks first (a modal that says what will be done: Accept saves it, Cancel leaves it as it was)
 */
function People({ privacy, onChange }: { privacy: ArticlePrivacy; onChange: (next: ArticlePrivacy) => void }) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  // What was changed in the rows and is not applied yet (people not in it are as they are saved)
  const [edits, setEdits] = useState<Record<string, Permission>>({})
  const [confirming, setConfirming] = useState(false)
  const { people, loading } = usePeople(query)

  const next = allowedFrom(privacy.allowed, edits)
  const changes = changesOf(privacy.allowed, next)
  const changed = changes.added.length + changes.changed.length + changes.removed.length > 0
  const nameOf = (id: string) => personById(id)?.name ?? 'Someone'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className="text-small font-medium text-fg-muted">People</h3>
        <IconButton
          icon={searching ? LuX : LuSearch}
          label={searching ? 'Close the search of people' : 'Search people'}
          size="sm"
          aria-expanded={searching}
          onClick={() => {
            // (closing it empties the search)
            if (searching) setQuery('')
            setSearching(!searching)
          }}
        />
      </div>
      {searching && <SearchInput label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />}
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            permission={edits[person.id] ?? permissionOf(privacy.allowed, person.id)}
            onPermission={(change) => setEdits({ ...edits, [person.id]: withSwitch(edits[person.id] ?? permissionOf(privacy.allowed, person.id), change) })}
          />
        ))}
        {!loading && people.length === 0 && <li className="text-small text-fg-subtle">Nobody found.</li>}
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
            <Button
              size="sm"
              plain
              onClick={() => {
                onChange({ ...privacy, allowed: next })
                setEdits({})
                setConfirming(false)
              }}
            >
              Accept
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-body">
          <p>This will change who can open the article while it is private:</p>
          <ul className="flex flex-col gap-1">
            {changes.added.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{nameOf(a.id)}</span> <span className="text-fg-muted">gets access: {roleSentence(a)}</span>
              </li>
            ))}
            {changes.changed.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{nameOf(a.id)}</span> <span className="text-fg-muted">now has: {roleSentence(a)}</span>
              </li>
            ))}
            {changes.removed.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{nameOf(a.id)}</span> <span className="text-fg-muted">loses access</span>
              </li>
            ))}
          </ul>
          <p className="text-small text-fg-subtle">Everyone else keeps what they have now.</p>
        </div>
      </Modal>
    </div>
  )
}

/**
 * Who can see the article (the popup under the Private / Public button): Private or Public, and, while it is private, the people allowed
 * (Allow certain people): each chosen with a checkbox and given reading and / or editing with two switches, applied together with Apply.
 * Saved on this device for now (privacyStore.ts), the people are made up (mockPeople.ts)
 */
export default function PrivacyPanel({ privacy, onChange }: Props) {
  const [choosing, setChoosing] = useState(privacy.allowed.length > 0)

  return (
    <div className="flex flex-col gap-1.5 p-1 text-fg">
      <h2 className="px-1 pb-1 text-body font-medium text-fg">Who can see this article</h2>
      <div role="radiogroup" aria-label="Visibility" className="flex flex-col gap-1">
        {CHOICES.map((c) => (
          <Button
            key={c.value}
            role="radio"
            aria-checked={privacy.visibility === c.value}
            variant={privacy.visibility === c.value ? 'selected' : 'ghost'}
            plain
            icon={c.icon}
            className="w-full justify-start"
            onClick={() => onChange({ ...privacy, visibility: c.value })}
          >
            <span className="flex flex-col items-start text-start">
              <span>{c.label}</span>
              <span className="text-small font-normal text-fg-subtle">{c.text}</span>
            </span>
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-1.5">
        {/* Like Private and Public above, set apart by the line over it */}
        <Button variant={choosing ? 'selected' : 'ghost'} plain icon={LuUserRoundPlus} aria-expanded={choosing} className="w-full justify-start" onClick={() => setChoosing(!choosing)}>
          <span className="flex flex-col items-start text-start">
            <span>Allow certain people</span>
            <span className="text-small font-normal text-fg-subtle">Choose who can read or edit it</span>
          </span>
        </Button>
        {privacy.allowed.length > 0 && (
          <ul aria-label="Allowed people" className="flex flex-wrap gap-1">
            {privacy.allowed.map((a) => {
              const person = personById(a.id)
              if (!person) return null
              return (
                <li key={a.id} className="flex items-center gap-1 rounded-full bg-fill py-0.5 ps-0.5 pe-1">
                  <PersonAvatar person={person} size="size-6" />
                  <span className="text-small">
                    {person.name} <span className="text-fg-subtle">· {a.role === 'editor' ? 'Editing' : 'Reading'}</span>
                  </span>
                  <IconButton icon={LuX} label={`Remove ${person.name}`} size="sm" className="size-6 min-h-0 min-w-0" onClick={() => onChange({ ...privacy, allowed: withRole(privacy.allowed, a.id, null) })} />
                </li>
              )
            })}
          </ul>
        )}
        {choosing && (
          <>
            <People privacy={privacy} onChange={onChange} />
            {privacy.visibility === 'public' && <p className="text-small text-fg-subtle">It is public: everyone can see it already.</p>}
          </>
        )}
      </div>
    </div>
  )
}
