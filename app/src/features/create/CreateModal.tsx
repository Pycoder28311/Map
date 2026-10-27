import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { LuPlus } from 'react-icons/lu'
import { actionsOf } from '../../lib/resource/hooks'
import { resourcesWith } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import Button from '../../components/ui/buttons/Button'
import TitleInput from '../../components/ui/fields/TitleInput'
import TitleTextFields from '../../components/ui/fields/TitleTextFields'
import DraftAsk from './DraftAsk'
import { draftOutcome } from './draftOutcome'

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
  /** The frame is open (not growing back): a click outside decides only then */
  active: boolean
  /** The Cancel button (bottom right, where the Create label was) */
  onCancel: () => void
  /** It made something: what (the frame shrinks back and says so) */
  onCreated: (made: { id: string; panelType: string; label: string; name: string }) => void
}

/**
 * What fills the floating Create button's frame once it has grown into the modal (CreateFab, PanelFrame): the kinds as tabs (the resources with a Create tab), the form of the chosen kind below (its title
 * and its text). The page behind never changes. Mounted fresh each time it opens, so a cancelled
 * draft is gone. A click outside decides (draftOutcome): nothing typed closes it, text creates it, only a title asks first.
 */
export default function CreateModal({ active, onCancel, onCreated }: Props) {
  const formId = useId()
  const [kindName, setKindName] = useState(lastKind)
  const resource = KINDS.find((r) => r.name === kindName) ?? KINDS[0]
  const { title: titleField, body: bodyField, rich } = formOf(resource)
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')

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
      setAsking(false)
      setBusy(false)
    }
  }

  // A press outside the frame (a popover of its toolbar is outside it in the DOM, and doesn't count). The latest values, without
  // re-listening on every key
  const root = useRef<HTMLDivElement>(null)
  const latest = useRef(() => {})
  latest.current = () => {
    if (busy) return
    const outcome = draftOutcome(title, body, { askOnTitleOnly: true })
    if (outcome === 'discard') onCancel()
    else if (outcome === 'create') void create()
    else setAsking(true)
  }
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target?.isConnected || root.current?.contains(target) || target.closest(':popover-open, [data-create-note]')) return
      latest.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])

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
    <div ref={root} id="create-modal" role="dialog" aria-label="Create" onKeyDown={onKeyDown} onPointerDown={() => setAsking(false)} className="flex size-full min-w-0 flex-col">
      {/* Where it goes */}
      <div className="flex flex-col gap-0.5 border-b border-line px-3 py-2">
        <p className="px-1.5 text-small text-fg-subtle">{goes}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* The kinds, as tabs above the form */}
        <ul aria-label="What to create" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {KINDS.map((k) => {
            const Icon = k.ui.icon
            return (
              <li key={k.name} className="shrink-0">
                <Button variant="ghost" plain size="sm" icon={Icon} aria-pressed={k === resource} onClick={() => pick(k.name)}>
                  {k.ui.label}
                </Button>
              </li>
            )
          })}
        </ul>

        {/* The form of the chosen kind */}
        <form
          id={formId}
          className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto py-3"
          onSubmit={(e) => {
            e.preventDefault()
            void create()
          }}
        >
          {/* The big input's title + text, open: edge to edge, the modal's own background */}
          {hasBody ? (
            <TitleTextFields
              key={resource.name}
              flush
              size="md"
              title={title}
              onTitle={setTitle}
              text={body}
              onText={rich ? setText : setDescription}
              rich={rich}
              titlePlaceholder={titleField?.placeholder}
              textPlaceholder={bodyField?.placeholder}
              textLabel={bodyField?.label ?? bodyField?.name}
              toolbar
              className="flex-1"
            />
          ) : (
            <TitleInput size="md" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleField?.placeholder ?? 'Title'} aria-label="Title" maxLength={200} autoFocus />
          )}
          {error && (
            <p role="alert" className="px-3 text-small text-danger">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* The footer: Create, and in the corner Cancel, where the floating Create label was; after a click outside with only a title, the question */}
      <div className={`flex shrink-0 items-center justify-end gap-base border-t border-line px-3 ${asking ? 'py-3' : 'h-14'}`}>
        {asking ? (
          <DraftAsk question={`Create this ${resource.ui.label.toLowerCase()}?`} busy={busy} onCancel={onCancel} onCreate={() => void create()} />
        ) : (
          <>
            <span className="me-auto text-small text-fg-subtle">Ctrl+Enter</span>
            <Button variant="primary" icon={LuPlus} type="submit" form={formId} disabled={!canCreate}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
            <Button variant="ghost" filled onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
