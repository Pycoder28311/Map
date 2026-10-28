import { useState } from 'react'
import { LuGlobe, LuLock, LuUserRoundPlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'
import CheckField from '../../../components/ui/fields/CheckField'
import SearchInput from '../../../components/ui/fields/SearchInput'
import Modal from '../../../components/ui/overlays/Modal'
import { personById, usePeople } from '../../people/mockPeople'
import { PersonAvatar } from '../../people/PersonCard'
import type { ArticlePrivacy, Visibility } from './privacyStore'

const CHOICES: { value: Visibility; label: string; text: string; icon: typeof LuLock }[] = [
  { value: 'private', label: 'Private', text: 'Only you, and the people you allow', icon: LuLock },
  { value: 'public', label: 'Public', text: 'Anyone with the link; it can be shared', icon: LuGlobe },
]

type Props = {
  open: boolean
  onClose: () => void
  privacy: ArticlePrivacy
  onChange: (next: ArticlePrivacy) => void
}

/**
 * Who can see the article: Private or Public, and the people allowed while it is private (Allow certain people). Saved at once; on this
 * device for now (privacyStore.ts), the people are made up (mockPeople.ts)
 */
export default function PrivacyModal({ open, onClose, privacy, onChange }: Props) {
  const [choosing, setChoosing] = useState(privacy.allowed.length > 0)
  const [query, setQuery] = useState('')
  const { people, loading } = usePeople(query)
  const allow = (id: string, on: boolean) => onChange({ ...privacy, allowed: on ? [...privacy.allowed, id] : privacy.allowed.filter((a) => a !== id) })

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
          <Button variant={choosing ? 'selected' : 'secondary'} icon={LuUserRoundPlus} aria-expanded={choosing} className="self-start" onClick={() => setChoosing(!choosing)}>
            Allow certain people
          </Button>
          {privacy.allowed.length > 0 && (
            <ul aria-label="Allowed people" className="flex flex-wrap gap-1">
              {privacy.allowed.map((id) => {
                const person = personById(id)
                if (!person) return null
                return (
                  <li key={id} className="flex items-center gap-1 rounded-full bg-fill py-0.5 ps-0.5 pe-1">
                    <PersonAvatar person={person} size="size-6" />
                    <span className="text-small">{person.name}</span>
                    <IconButton icon={LuX} label={`Remove ${person.name}`} size="sm" className="size-6 min-h-0 min-w-0" onClick={() => allow(id, false)} />
                  </li>
                )
              })}
            </ul>
          )}
          {choosing && (
            <>
              <SearchInput label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {people.map((person) => (
                  <li key={person.id}>
                    <CheckField
                      label={
                        <span className="flex min-w-0 items-center gap-2">
                          <PersonAvatar person={person} size="size-6" />
                          <span className="truncate">{person.name}</span>
                          <span className="truncate text-small text-fg-subtle">@{person.handle}</span>
                        </span>
                      }
                      checked={privacy.allowed.includes(person.id)}
                      onChange={(on) => allow(person.id, on)}
                    />
                  </li>
                ))}
                {!loading && people.length === 0 && <li className="text-small text-fg-subtle">Nobody found.</li>}
              </ul>
              {privacy.visibility === 'public' && <p className="text-small text-fg-subtle">It is public: everyone can see it already.</p>}
            </>
          )}
        </div>
        <p className="text-small text-fg-subtle">Saved on this device for now.</p>
      </div>
    </Modal>
  )
}
