import { useState, type KeyboardEvent } from 'react'
import Button from '../../components/ui/buttons/Button'
import { findObject, KIND_LABEL } from '../../mocks/projects'
import { getObjects, useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { createFromModal } from './createFromModal'
import CreatePath from './CreatePath'
import { CREATE_KINDS, eligibleFor, type CreateKind, type Path } from './place'
import { useCurrentPlace } from './useCurrentPlace'

// Full class strings so Tailwind can detect them at build time.
const FIELD =
  'w-full rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) py-2 text-body text-fg outline-none transition-colors ' +
  'placeholder:text-fg-subtle focus:border-fg-subtle'
const KIND_BUTTON =
  'flex w-full cursor-pointer items-center gap-2 rounded-(--btn-radius) px-2.5 py-2 text-start text-body font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'

/** The last kind picked, kept for the session; the first time: a note */
let lastKind: CreateKind = 'note'

type Props = {
  /** Closing (the button flipped back): it shrinks back behind the button */
  closing: boolean
  /** It made something: what and where (the button flips back and says so) */
  onCreated: (made: { id: string; kind: CreateKind; name: string; where: string | null }) => void
}

/**
 * The floating Create button's modal: the path of where it goes on top, the five kinds on the left, the
 * form of the chosen kind on the right. A note is linked to the place in the path; the other kinds are
 * created inside it. The page behind never changes. Mounted fresh each time it opens, so a cancelled
 * draft is gone and the path starts from the page's own place.
 */
export default function CreateModal({ closing, onCreated }: Props) {
  const current = useCurrentPlace()
  useMockObjects() // names and existence follow changes
  const [kind, setKind] = useState<CreateKind>(lastKind)
  const [chosen, setChosen] = useState<Path | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')

  // The path: the one picked, or the page's own place; cut where an object has gone
  const visible = getObjects().filter((o) => findObject(o.id))
  const wanted = chosen ?? current
  const firstGone = wanted.findIndex((id) => !findObject(id))
  const path = firstGone === -1 ? wanted : wanted.slice(0, firstGone)
  const last = path.length ? (findObject(path.at(-1)) ?? null) : null
  const fit = eligibleFor(kind, last)

  const canCreate = title.trim() !== '' && fit.ok

  const create = () => {
    if (!canCreate) return
    const made = createFromModal(kind, path, { title, text, description })
    if (made) onCreated({ id: made.id, kind, name: title.trim() || 'Untitled', where: made.where })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      create()
    }
  }

  const pick = (next: CreateKind) => {
    lastKind = next
    setKind(next)
  }

  const goes =
    kind === 'note'
      ? last
        ? `Linked to ${last.name}`
        : 'Not linked to anything'
      : `Created ${last ? `in ${last.name}` : 'at the top level'}`

  return (
    <div
      id="create-modal"
      role="dialog"
      aria-label="Create"
      onKeyDown={onKeyDown}
      // Its bottom right corner is behind the button, which it grows out of (and shrinks back into): pb-8
      // keeps its own buttons clear of the one over its corner
      className={`absolute end-9 bottom-7 z-20 flex max-h-[calc(100%-5rem)] w-[min(34rem,calc(100%-2rem))] origin-bottom-right flex-col overflow-hidden rounded-(--card-radius) border-[3px] border-fg/30 bg-surface pb-8 shadow-[var(--lift-shadow),0_24px_60px_rgb(0_0_0/0.25)] motion-reduce:animate-none ${
        closing ? 'animate-create-unpop' : 'animate-create-pop'
      }`}
    >
      {/* Where it goes */}
      <div className="flex flex-col gap-0.5 border-b border-line px-3 py-2">
        <CreatePath objects={visible} path={path} kind={kind} onChange={setChosen} />
        <p className="px-1.5 text-small text-fg-subtle">{goes}</p>
      </div>

      <div className="flex min-h-0 flex-1 max-sm:flex-col">
        {/* The five kinds */}
        <ul aria-label="What to create" className="flex shrink-0 gap-1 border-line p-2 sm:w-40 sm:flex-col sm:border-e max-sm:border-b max-sm:overflow-x-auto">
          {CREATE_KINDS.map((k) => {
            const Icon = KIND_ICON[k]
            const ok = eligibleFor(k, last)
            return (
              <li key={k} className="max-sm:shrink-0">
                <button
                  type="button"
                  disabled={!ok.ok}
                  title={ok.ok ? undefined : ok.why}
                  aria-pressed={k === kind}
                  onClick={() => pick(k)}
                  className={`${KIND_BUTTON} ${k === kind ? 'bg-fill-strong text-fg' : 'text-fg-muted hover:bg-fill hover:text-fg'}`}
                >
                  <Icon className="size-(--btn-icon-size) shrink-0" />
                  {KIND_LABEL[k]}
                </button>
              </li>
            )
          })}
        </ul>

        {/* The form of the chosen kind */}
        <form
          className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${KIND_LABEL[kind]} name`}
            aria-label="Name"
            maxLength={100}
            autoFocus
            className={`${FIELD} font-medium`}
          />
          {(kind === 'note' || kind === 'article') && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === 'note' ? 'Take a note…' : 'Write an article…'}
              aria-label="Text"
              rows={5}
              className={`${FIELD} min-h-24 resize-none`}
            />
          )}
          {kind === 'object' && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              aria-label="Description"
              rows={3}
              className={`${FIELD} resize-none`}
            />
          )}
          {!fit.ok && <p className="text-small text-danger">{fit.why}</p>}
          <div className="mt-auto flex items-center justify-end gap-3">
            <span className="text-small text-fg-subtle">Ctrl+Enter</span>
            <Button type="submit" disabled={!canCreate}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
