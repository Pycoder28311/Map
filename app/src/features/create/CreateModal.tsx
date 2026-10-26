import type { Editor } from '@tiptap/react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { LuPlus } from 'react-icons/lu'
import { actionsOf } from '../../lib/resource/hooks'
import { resourcesWith } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import Button from '../../components/ui/buttons/Button'
import SegmentedButtons from '../../components/ui/buttons/SegmentedButtons'
import RichTextToolbar from '../../components/ui/editors/RichTextToolbar'
import RichTextField from '../../components/ui/fields/RichTextField'
import { isFirstLine } from '../notes/editorKeys'

// Full class strings so Tailwind can detect them at build time.
// A field inside the title + body group (the group draws the border)
const INNER = 'w-full bg-transparent px-(--field-px) text-body text-fg outline-none placeholder:text-fg-subtle'

/** What the modal can make: every resource with a Create tab (surfaces.create), in the UI config's order */
const KINDS = resourcesWith('create')

/** The last kind picked (a resource's name), kept for the session; the first time: a note */
let lastKind = 'notes'

/** A resource's form here: its title field and the first other field (its text: rich text or plain) */
function formOf(resource: AnyResource) {
  const title = resource.ui.fields.find((f) => f.heading)
  const body = resource.ui.fields.find((f) => !f.heading)
  return { title, body, rich: body?.widget === 'richText' }
}

type Props = {
  /** Closing (the button flipped back): it shrinks back behind the button */
  closing: boolean
  /** Space (px) the page's own sidebar takes at the right: the modal stays left of it */
  inset: number
  /** It made something: what (the button flips back and says so) */
  onCreated: (made: { id: string; panelType: string; label: string; name: string }) => void
}

/**
 * The floating Create button's modal: the kinds as tabs (the resources with a Create tab), the form of the chosen kind below (its title
 * and its text). The page behind never changes. Mounted fresh each time it opens, so a cancelled
 * draft is gone.
 */
export default function CreateModal({ closing, inset, onCreated }: Props) {
  const formId = useId()
  const [kindName, setKindName] = useState(lastKind)
  const resource = KINDS.find((r) => r.name === kindName) ?? KINDS[0]
  const { title: titleField, body: bodyField, rich } = formOf(resource)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  // Rich text: the editor; plain text: a textarea
  const [editor, setEditor] = useState<Editor | null>(null)
  const hasBody = bodyField !== undefined
  const body = rich ? text : description
  // A title or some text (the API's requireOneOf for most tables; it answers with the rule if not)
  const canCreate = (title.trim() !== '' || body.trim() !== '') && !busy

  const create = async () => {
    if (!canCreate) return
    setBusy(true)
    setError(null)
    try {
      const input: Record<string, unknown> = {}
      if (titleField) input[titleField.name] = title.trim()
      if (bodyField) input[bodyField.name] = body
      const made = await actionsOf(resource).create(input)
      onCreated({ id: String(made.id), panelType: resource.panelType, label: resource.ui.label, name: resource.ui.row.title(made) })
    } catch (e) {
      // The draft stays, so nothing typed is lost
      setError(e instanceof Error ? e.message : `Could not create the ${resource.ui.label.toLowerCase()}.`)
      setBusy(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void create()
    }
  }

  const pick = (next: string) => {
    lastKind = next
    setKindName(next)
  }

  const goes = `Saved with your ${resource.ui.plural.toLowerCase()}`

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
        <p className="px-1.5 text-small text-fg-subtle">{goes}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* The kinds, as tabs above the form */}
        <div className="flex shrink-0 overflow-x-auto border-b border-line px-3 py-2">
          <SegmentedButtons
            label="What to create"
            size="sm"
            options={KINDS.map((k) => ({ value: k.name, label: k.ui.label, icon: k.ui.icon }))}
            value={resource.name}
            onChange={pick}
          />
        </div>

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
              placeholder={titleField?.placeholder ?? 'Title'}
              aria-label="Name"
              maxLength={200}
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
                      placeholder={bodyField?.placeholder}
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
                    placeholder={bodyField?.placeholder}
                    aria-label={bodyField?.label ?? bodyField?.name}
                    rows={3}
                    className={`${INNER} min-h-20 flex-1 resize-none py-2`}
                  />
                )}
              </>
            )}
          </div>
          {error && (
            <p role="alert" className="text-small text-danger">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* The footer: Create here, and in its corner the floating button (Cancel), the modal's own bottom
          right button: as tall as that button (56px) plus 9px around it (the border counted), with room left for its width (192px + the gaps) */}
      <div className="flex h-[74px] shrink-0 items-center justify-end gap-3 border-t border-line ps-3 pe-[225px]">
        <span className="text-small text-fg-subtle">Ctrl+Enter</span>
        <Button variant="primary" icon={LuPlus} type="submit" form={formId} disabled={!canCreate}>
          {busy ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}
