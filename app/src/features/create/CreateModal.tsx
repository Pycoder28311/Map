import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { LuPlus } from 'react-icons/lu'
import { findObject, KIND_LABEL } from '../../mocks/projects'
import { getObjects, useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { createFromModal } from './createFromModal'
import CreatePath from './CreatePath'
import { RAISED } from './buttonLook'
import { CREATE_KINDS, eligibleFor, type CreateKind, type Path } from './place'
import { useCurrentPlace } from './useCurrentPlace'

// Full class strings so Tailwind can detect them at build time.
// A field inside the title + body group (the group draws the border)
const INNER = 'w-full bg-transparent px-(--field-px) text-body text-fg outline-none placeholder:text-fg-subtle'
// The modal's Create: the floating button's Create face (CreateFab), same size, green and rounded
const CREATE_BUTTON =
  'inline-flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-[calc(var(--corner-lg)+4px)] bg-create text-base font-medium text-create-fg ' +
  `transition-[background-color,box-shadow,translate] ${RAISED} hover:bg-create-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-create`
// A tab: one of the five kinds, in a row above the form
const KIND_BUTTON =
  'flex shrink-0 cursor-pointer items-center gap-2 rounded-(--btn-radius) px-2.5 py-1.5 text-start text-body font-medium whitespace-nowrap transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'

/** The last kind picked, kept for the session; the first time: a note */
let lastKind: CreateKind = 'note'

type Props = {
  /** Closing (the button flipped back): it shrinks back behind the button */
  closing: boolean
  /** Space (px) the page's own sidebar takes at the right: the modal stays left of it */
  inset: number
  /** It made something: what and where (the button flips back and says so) */
  onCreated: (made: { id: string; kind: CreateKind; name: string; where: string | null }) => void
}

/**
 * The floating Create button's modal: the path of where it goes on top, the five kinds on the left, the
 * form of the chosen kind on the right. A note is linked to the place in the path; the other kinds are
 * created inside it. The page behind never changes. Mounted fresh each time it opens, so a cancelled
 * draft is gone and the path starts from the page's own place.
 */
export default function CreateModal({ closing, inset, onCreated }: Props) {
  const current = useCurrentPlace()
  useMockObjects() // names and existence follow changes
  const formId = useId()
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

  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const hasBody = kind === 'note' || kind === 'article' || kind === 'object'
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
      // Its bottom right corner is right by the floating button, which sits in the footer's corner as the
      // modal's own bottom right button (CreateFab); the modal grows out of it and shrinks back into it
      style={{ insetInlineEnd: `calc(0.75rem + ${inset}px)`, maxWidth: `calc(100% - 1.5rem - ${inset}px)` }}
      className={`absolute bottom-3 z-20 flex h-[min(44rem,calc(100%-1.5rem))] w-[min(28rem,calc(100%-2rem))] origin-bottom-right flex-col overflow-hidden rounded-(--card-radius) border-[3px] border-fg/30 bg-surface shadow-[var(--lift-shadow),0_24px_60px_rgb(0_0_0/0.25)] motion-reduce:animate-none ${
        closing ? 'animate-create-unpop' : 'animate-create-pop'
      }`}
    >
      {/* Where it goes */}
      <div className="flex flex-col gap-0.5 border-b border-line px-3 py-2">
        <CreatePath objects={visible} path={path} kind={kind} onChange={setChosen} />
        <p className="px-1.5 text-small text-fg-subtle">{goes}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* The five kinds, as tabs above the form */}
        <ul aria-label="What to create" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {CREATE_KINDS.map((k) => {
            const Icon = KIND_ICON[k]
            const ok = eligibleFor(k, last)
            return (
              <li key={k} className="shrink-0">
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
          id={formId}
          className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          {/* Title and body: two fields drawn as one, split by a line; ↓ / Enter and ↑ move between them */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-(--field-radius) border border-line-strong bg-surface transition-colors focus-within:border-fg-subtle">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (!hasBody || e.nativeEvent.isComposing) return
                if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.ctrlKey && !e.metaKey)) {
                  e.preventDefault()
                  bodyRef.current?.focus()
                  bodyRef.current?.setSelectionRange(0, 0)
                }
              }}
              placeholder={`${KIND_LABEL[kind]} name`}
              aria-label="Name"
              maxLength={100}
              autoFocus
              className={`${INNER} py-2 font-medium`}
            />
            {hasBody && (
              <>
                <hr className="mx-1.5 my-0 border-0 border-t border-line-strong" />
                <textarea
                  ref={bodyRef}
                  value={kind === 'object' ? description : text}
                  onChange={(e) => (kind === 'object' ? setDescription : setText)(e.target.value)}
                  onKeyDown={(e) => {
                    const { selectionStart, selectionEnd } = e.currentTarget
                    if (e.key === 'ArrowUp' && selectionStart === 0 && selectionEnd === 0) {
                      e.preventDefault()
                      const end = titleRef.current?.value.length ?? 0
                      titleRef.current?.focus()
                      titleRef.current?.setSelectionRange(end, end)
                    }
                  }}
                  placeholder={kind === 'note' ? 'Take a note…' : kind === 'article' ? 'Write an article…' : 'Description'}
                  aria-label={kind === 'object' ? 'Description' : 'Text'}
                  rows={kind === 'object' ? 3 : 5}
                  className={`${INNER} min-h-20 flex-1 resize-none py-2`}
                />
              </>
            )}
          </div>
          {!fit.ok && <p className="text-small text-danger">{fit.why}</p>}
        </form>
      </div>

      {/* The footer: Create here, and in its corner the floating button (Cancel), the modal's own bottom
          right button: as tall as that button (44px) plus 9px around it (the border counted), with room left for its width (144px + the gaps) */}
      <div className="flex h-[62px] shrink-0 items-center justify-end gap-3 border-t border-line ps-3 pe-[165px]">
        <span className="text-small text-fg-subtle">Ctrl+Enter</span>
        <button type="submit" form={formId} disabled={!canCreate} className={CREATE_BUTTON}>
          <LuPlus aria-hidden className="size-5" />
          Create
        </button>
      </div>
    </div>
  )
}
