import { useState } from 'react'
import { LuChevronRight, LuGlobe, LuLock, LuSearch, LuUserRoundPlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import CheckField from '../../../components/ui/fields/CheckField'
import SearchInput from '../../../components/ui/fields/SearchInput'
import HoverInfo from '../../../components/ui/overlays/HoverInfo'
import Modal from '../../../components/ui/overlays/Modal'
import { personById, usePeople, type Person } from '../../people/mockPeople'
import { PersonAvatar } from '../../people/PersonCard'
import { withRole, type AllowedRole, type ArticlePrivacy, type Visibility } from './privacyStore'

const CHOICES: { value: Visibility; label: string; text: string; icon: typeof LuLock }[] = [
  { value: 'private', label: 'Private', text: 'Only you, and the people you allow', icon: LuLock },
  { value: 'public', label: 'Public', text: 'Anyone with the link; it can be shared', icon: LuGlobe },
]

/** What a person can be allowed to do, each with the sentence its "What it is" says */
const ROLES: { value: AllowedRole; label: string; what: string }[] = [
  { value: 'reader', label: 'Read-only', what: 'Can open and read the article, but cannot change anything in it.' },
  { value: 'editor', label: 'Editor', what: 'Can read the article and change it: its text, its info box and its messages.' },
]
const ROLE_LABEL: Record<AllowedRole, string> = { reader: 'Read-only', editor: 'Editor' }

type Props = {
  open: boolean
  onClose: () => void
  privacy: ArticlePrivacy
  onChange: (next: ArticlePrivacy) => void
}

/**
 * One person of the list: an arrow at the left that opens what they can do (two boxes: Read-only and Editor, one at a time; none ticked
 * means they are not allowed), each with a small faint "What it is" at its right that says what it means in a floating element, as the
 * edit bar's buttons do (HoverInfo)
 */
function PersonRow({ person, role, open, onToggle, onRole }: { person: Person; role: AllowedRole | null; open: boolean; onToggle: () => void; onRole: (role: AllowedRole | null) => void }) {
  return (
    <li className="flex flex-col">
      <div className="flex items-center gap-1">
        <IconButton
          icon={LuChevronRight}
          label={open ? `Close what ${person.name} can do` : `What ${person.name} can do`}
          size="sm"
          aria-expanded={open}
          iconClassName={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
          onClick={onToggle}
        />
        <PersonAvatar person={person} size="size-6" />
        <span className="min-w-0 truncate text-body">{person.name}</span>
        <span className="min-w-0 truncate text-small text-fg-subtle">@{person.handle}</span>
        {role && <span className="ms-auto shrink-0 text-small text-fg-muted">{ROLE_LABEL[role]}</span>}
      </div>
      {open && (
        <ul aria-label={`What ${person.name} can do`} className="flex flex-col gap-1 ps-9 pt-1 pb-1">
          {ROLES.map((r) => (
            <li key={r.value} className="flex items-center gap-2">
              <CheckField label={r.label} checked={role === r.value} onChange={(on) => onRole(on ? r.value : null)} />
              <HoverInfo title={r.label} text={r.what} side="top" delay={350}>
                <Button variant="ghost" size="xs" plain className="ms-auto font-normal! [--btn-text:var(--fg-subtle)]!">
                  What it is
                </Button>
              </HoverInfo>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** The people, a search button at the right of their name (it opens the search field below, and becomes an X that closes it), then the rows */
function People({ privacy, onChange }: { privacy: ArticlePrivacy; onChange: (next: ArticlePrivacy) => void }) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const { people, loading } = usePeople(query)
  const roleOf = (id: string) => privacy.allowed.find((a) => a.id === id)?.role ?? null
  const toggle = (id: string) => {
    const next = new Set(opened)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpened(next)
  }

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
            role={roleOf(person.id)}
            open={opened.has(person.id)}
            onToggle={() => toggle(person.id)}
            onRole={(role) => onChange({ ...privacy, allowed: withRole(privacy.allowed, person.id, role) })}
          />
        ))}
        {!loading && people.length === 0 && <li className="text-small text-fg-subtle">Nobody found.</li>}
      </ul>
    </div>
  )
}

/**
 * Who can see the article: Private or Public, and the people allowed while it is private (Allow certain people), each as a reader or an
 * editor. Saved at once; on this device for now (privacyStore.ts), the people are made up (mockPeople.ts)
 */
export default function PrivacyModal({ open, onClose, privacy, onChange }: Props) {
  const [choosing, setChoosing] = useState(privacy.allowed.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Who can see this article" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Visibility" className="flex flex-col gap-1">
          {CHOICES.map((c) => (
            <Button
              key={c.value}
              role="radio"
              aria-checked={privacy.visibility === c.value}
              variant={privacy.visibility === c.value ? 'selected' : 'ghost'}
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

        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <Button variant="secondary" plain icon={LuUserRoundPlus} aria-expanded={choosing} className="self-start" onClick={() => setChoosing(!choosing)}>
            Allow certain people
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
                      {person.name} <span className="text-fg-subtle">· {ROLE_LABEL[a.role]}</span>
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
        <p className="text-small text-fg-subtle">Saved on this device for now.</p>
      </div>
    </Modal>
  )
}
