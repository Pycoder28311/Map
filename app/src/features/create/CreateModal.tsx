import type { Editor } from '@tiptap/react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { LuPlus } from 'react-icons/lu'
import { findObject, KIND_LABEL } from '../../mocks/projects'
import { getObjects, useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { useResourceActions } from '../../lib/resource/hooks'
import { notesResource } from '../../resources/notes/notes.resource'
import { createFromModal } from './createFromModal'
import CreatePath from './CreatePath'
import { RAISED } from './buttonLook'
import { CREATE_KINDS, eligibleFor, type CreateKind, type Path } from './place'
import { useCurrentPlace } from './useCurrentPlace'
import { FOCUS_RING } from '../../components/ui/buttons/buttonStyles'
import RichTextToolbar from '../../components/ui/editors/RichTextToolbar'
import RichTextField from '../../components/ui/fields/RichTextField'
import { isFirstLine } from '../notes/editorKeys'

// Full class strings so Tailwind can detect them at build time.
// A field inside the title + body group (the group draws the border)
const INNER = 'w-full bg-transparent px-(--field-px) text-body text-fg outline-none placeholder:text-fg-subtle'
// The modal's Create: the floating button's Create face (CreateFab), same size, green and rounded
const CREATE_BUTTON =
  'corner-marks relative inline-flex h-11 w-36 cursor-pointer items-center justify-center gap-2 rounded-(--corner-xl) bg-create text-base font-medium text-create-fg ' +
  `transition-[background-color,box-shadow,translate] ${RAISED} hover:bg-(--btn-create-hover-bg) ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-create`
// A tab: one of the kinds, in a row above the form
const KIND_BUTTON =
  'flex shrink-0 cursor-pointer items-center gap-2 rounded-(--btn-radius) px-2.5 py-1.5 text-start text-body font-medium whitespace-nowrap transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'

/** What the modal can make: a note (on the server, no place) or an object card / a map (in a place) */
type ModalKind = 'note' | CreateKind
const MODAL_KINDS: ModalKind[] = ['note', ...CREATE_KINDS]
const LABEL: Record<ModalKind, string> = { note: notesResource.ui.label, object: KIND_LABEL.object, map: KIND_LABEL.map }
const ICON: Record<ModalKind, (typeof KIND_ICON)[CreateKind]> = { note: notesResource.ui.icon, object: KIND_ICON.object, map: KIND_ICON.map }

/** The last kind picked, kept for the session; the first time: a note */
let lastKind: ModalKind = 'note'

type Props = {
  /** Closing (the button flipped back): it shrinks back behind the button */
  closing: boolean
  /** Space (px) the page's own sidebar takes at the right: the modal stays left of it */
  inset: number
  /** It made something: what and where (the button flips back and says so) */
  onCreated: (made: { id: string; panelType: string; label: string; name: string; where: string | null }) => void
}

/**
 * The floating Create button's modal: the kinds as tabs, the form of the chosen kind below. A note is made on the server and has no
 * place; an object card or a map is created in the place in the path (shown on top). The page behind never changes. Mounted fresh each time it opens, so a cancelled
 * draft is gone and the path starts from the page's own place.
 */
export default function CreateModal({ closing, inset, onCreated }: Props) {
  const current = useCurrentPlace()
  useMockObjects() // names and existence follow changes
  const formId = useId()
  const [kind, setKind] = useState<ModalKind>(lastKind)
  const { create: createNote } = useResourceActions(notesResource)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  // A note has no place; the others need one they can go in
  const fit = kind === 'note' ? ({ ok: true } as const) : eligibleFor(kind, last)

  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  // A note's text is the rich-text editor; an object card's description stays a plain textarea
  const [editor, setEditor] = useState<Editor | null>(null)
  const rich = kind === 'note'
  const hasBody = kind === 'note' || kind === 'object'
  // A note needs a title or some text (the API's rule); the others a title
  const canCreate = (kind === 'note' ? title.trim() !== '' || text !== '' : title.trim() !== '') && fit.ok && !busy

  const create = async () => {
    if (!canCreate) return
    if (kind === 'note') {
      setBusy(true)
      setError(null)
      try {
        const note = await createNote({ title: title.trim(), content: text })
        onCreated({ id: String(note.id), panelType: notesResource.panelType, label: LABEL.note, name: title.trim() || notesResource.ui.untitled, where: null })
      } catch (e) {
        // The draft stays, so nothing typed is lost
        setError(e instanceof Error ? e.message : 'Could not create the note.')
        setBusy(false)
      }
      return
    }
    const made = createFromModal(kind, path, { title, description })
    if (made) onCreated({ id: made.id, panelType: kind, label: LABEL[kind], name: title.trim() || 'Untitled', where: made.where })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void create()
    }
  }

  const pick = (next: ModalKind) => {
    lastKind = next
    setKind(next)
  }

  const goes = kind === 'note' ? 'Saved with your notes' : `Created ${last ? `in ${last.name}` : 'at the top level'}`

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
      {/* Where it goes (a note has no place) */}
      <div className="flex flex-col gap-0.5 border-b border-line px-3 py-2">
        {kind !== 'note' && <CreatePath objects={visible} path={path} onChange={setChosen} />}
        <p className="px-1.5 text-small text-fg-subtle">{goes}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* The kinds, as tabs above the form */}
        <ul aria-label="What to create" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {MODAL_KINDS.map((k) => {
            const Icon = ICON[k]
            const ok = k === 'note' ? ({ ok: true } as const) : eligibleFor(k, last)
            return (
              <li key={k} className="shrink-0">
                <button
                  type="button"
                  disabled={!ok.ok}
                  title={ok.ok ? undefined : ok.why}
                  aria-pressed={k === kind}
                  onClick={() => pick(k)}
                  className={`${KIND_BUTTON} ${k === kind ? 'bg-fill-strong text-fg' : 'text-fg-muted hover-fill hover:text-fg'}`}
                >
                  <Icon className="size-(--btn-icon-size) shrink-0" />
                  {LABEL[k]}
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
            void create()
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
                  if (rich) editor?.commands.focus('start')
                  else {
                    bodyRef.current?.focus()
                    bodyRef.current?.setSelectionRange(0, 0)
                  }
                }
              }}
              placeholder={kind === 'note' ? 'Title' : `${LABEL[kind]} name`}
              aria-label="Name"
              maxLength={kind === 'note' ? 200 : 100}
              autoFocus
              className={`${INNER} py-2 font-medium`}
            />
            {hasBody && (
              <>
                <hr className="mx-1.5 my-0 border-0 border-t border-line-strong" />
                {rich ? (
                  <>
                    <RichTextField
                      value={text}
                      onChange={setText}
                      onEditor={setEditor}
                      onKeyDown={(e) => {
                        if (e.key !== 'ArrowUp' || !isFirstLine(editor)) return
                        e.preventDefault()
                        const end = titleRef.current?.value.length ?? 0
                        titleRef.current?.focus()
                        titleRef.current?.setSelectionRange(end, end)
                      }}
                      placeholder="Take a note…"
                      label="Text"
                      minHeight="min-h-20"
                      className="min-h-0 flex-1 overflow-y-auto px-(--field-px) py-2"
                    />
                    <RichTextToolbar editor={editor} only={['bold', 'italic', 'size']} className="border-t border-line px-1.5 py-1" />
                  </>
                ) : (
                  <textarea
                    ref={bodyRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      const { selectionStart, selectionEnd } = e.currentTarget
                      if (e.key === 'ArrowUp' && selectionStart === 0 && selectionEnd === 0) {
                        e.preventDefault()
                        const end = titleRef.current?.value.length ?? 0
                        titleRef.current?.focus()
                        titleRef.current?.setSelectionRange(end, end)
                      }
                    }}
                    placeholder="Description"
                    aria-label="Description"
                    rows={3}
                    className={`${INNER} min-h-20 flex-1 resize-none py-2`}
                  />
                )}
              </>
            )}
          </div>
          {!fit.ok && <p className="text-small text-danger">{fit.why}</p>}
          {error && (
            <p role="alert" className="text-small text-danger">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* The footer: Create here, and in its corner the floating button (Cancel), the modal's own bottom
          right button: as tall as that button (44px) plus 9px around it (the border counted), with room left for its width (144px + the gaps) */}
      <div className="flex h-[62px] shrink-0 items-center justify-end gap-3 border-t border-line ps-3 pe-[165px]">
        <span className="text-small text-fg-subtle">Ctrl+Enter</span>
        <button type="submit" form={formId} disabled={!canCreate} className={CREATE_BUTTON}>
          <LuPlus aria-hidden className="size-5" />
          {busy ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
}
