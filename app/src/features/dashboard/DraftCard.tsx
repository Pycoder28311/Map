import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import Button from '../../components/ui/buttons/Button'
import TitleInput from '../../components/ui/fields/TitleInput'
import { useResourceActions } from '../../lib/resource/hooks'
import type { AnyResource } from '../../resources/types'
import { draftOutcome } from '../create/draftOutcome'
import CardFace from './cards/cardFaces'
import { CARD_SIZE } from './cards/cardStyles'

const MAX_TITLE = 200
/** How long the card takes to settle (ms): the blur going, the title landing, the buttons sliding away */
const SETTLE_MS = 450

// What is blurred while it is a draft: the card's body (whatever is marked data-card-body in its face, cardFaces.tsx), never its box: its edges,
// outline and background stay sharp. A body that fills its box to the edge (data-card-bleed: a picture) is scaled up a little meanwhile, so the
// soft edge the blur gives it is out of sight. Full class strings so Tailwind can detect them.
const BODY_TRANSITION =
  '[&_[data-card-body]]:transition-[filter,scale] [&_[data-card-body]]:duration-300 [&_[data-card-body]]:ease-out [&_[data-card-title]]:transition-opacity [&_[data-card-title]]:duration-150 motion-reduce:[&_[data-card-body]]:transition-none'
const BODY_BLURRED = '[&_[data-card-body]]:[filter:blur(4px)] [&_[data-card-bleed]]:scale-110 [&_[data-card-title]]:opacity-0'
const BODY_SHARP = '[&_[data-card-body]]:[filter:blur(0px)] [&_[data-card-bleed]]:scale-100 [&_[data-card-title]]:opacity-100 [&_[data-card-title]]:delay-300'

type Props = {
  resource: AnyResource
  /** What the item starts with when it is created (its parent, its place in the row) */
  initial: Record<string, unknown>
  /** The item exists (its id): the row hides its real card until the draft has settled onto it */
  onCreated: (id: string) => void
  /** The draft goes away: discarded, or settled (the real card takes its place in the row) */
  onDone: () => void
}

/**
 * A draft of a folder or an object card, at the start of a Dashboard row, whatever the card looks like: the resource's own face
 * (CardFace) with its body blurred (its box and outline stay sharp), with its title input and its Cancel / Create buttons floating over it. It is not in the database until Create. Then the blur
 * goes, the input moves onto the face's own title and the buttons slide away (all smoothly). A click outside decides (draftOutcome):
 * nothing typed discards it, a title creates it. Esc and Cancel discard.
 */
export default function DraftCard({ resource, initial, onCreated, onDone }: Props) {
  const { create } = useResourceActions(resource)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when the item exists: where the input lands (from its place), and the card is settling
  const [landing, setLanding] = useState<{ dx: number; dy: number } | null>(null)
  // Where the input floats: over the card's own title (its box, from the card's left edge), measured once
  const [place, setPlace] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const rootRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const heading = resource.ui.fields.find((field) => field.heading)
  const valid = title.trim().length > 0
  const settling = landing !== null

  const onMap = resource.ui.card === 'map'
  useLayoutEffect(() => {
    const root = rootRef.current
    const el = root?.querySelector<HTMLElement>('[data-card-title]')
    if (!root || !el) return
    const box = (el.closest('[data-card-title-box]') ?? el).getBoundingClientRect()
    const base = root.getBoundingClientRect()
    const left = box.left - base.left
    setPlace({ left, top: box.top - base.top, width: Math.max(box.width, base.width - 2 * left), height: box.height })
  }, [])

  const make = async () => {
    if (!valid || busy || settling) return
    setBusy(true)
    setError(null)
    try {
      const item = await create({ ...initial, [heading?.name ?? 'title']: title.trim() })
      onCreated(String(item.id))
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDone()
      // The input's text now, and the face's title's (the input's own padding is --field-px, 12px)
      const input = inputRef.current?.getBoundingClientRect()
      const target = rootRef.current?.querySelector('[data-card-title]')?.getBoundingClientRect()
      setLanding(input && target ? { dx: target.left - (input.left + 12), dy: target.top + target.height / 2 - (input.top + input.height / 2) } : { dx: 0, dy: 0 })
    } catch (err) {
      // The draft stays, so nothing typed is lost
      setError(err instanceof Error ? err.message : 'Could not create it.')
      setBusy(false)
    }
  }

  // Settled: the real card takes over (the latest onDone: the row re-renders while it settles)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!settling) return
    const timer = setTimeout(() => done.current(), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [settling])

  // A press outside decides, with the latest title (a ref: no re-listening on every key)
  const outside = useRef(() => {})
  outside.current = () => {
    if (busy || settling) return
    if (draftOutcome(title, '', { askOnTitleOnly: false }) === 'discard') onDone()
    else void make()
  }
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && e.target.isConnected && !rootRef.current?.contains(e.target)) outside.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void make()
  }

  return (
    <form
      ref={rootRef}
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && !busy && !settling && onDone()}
      aria-label={`New ${resource.ui.label.toLowerCase()}`}
      className={`relative shrink-0 ${CARD_SIZE}`}
    >
      {/* The card as it will be: blurred while it is a draft; its own title is hidden until the input has landed on it */}
      <div aria-hidden className={`pointer-events-none ${BODY_TRANSITION} ${settling ? BODY_SHARP : BODY_BLURRED}`}>
        <CardFace resource={resource} item={{ id: 'draft' }} title={title.trim()} />
      </div>

      {/* The title input, floating over the card's own title; once created its text moves onto that title and the input fades into it */}
      <div
        style={place ? { left: place.left, top: place.top + place.height / 2, width: place.width } : { visibility: 'hidden' }}
        className="absolute -translate-y-1/2"
      >
        <div
          style={landing ? { transform: `translate(${landing.dx}px, ${landing.dy}px)` } : undefined}
          className={`w-full rounded-(--field-radius) border shadow-md transition-[transform,opacity,background-color,border-color,box-shadow] duration-300 ease-in-out motion-reduce:transition-none ${
            settling ? 'border-transparent bg-transparent opacity-0 shadow-none [transition-delay:0s,150ms,0s,0s,0s]' : 'border-line-strong bg-surface'
          }`}
        >
          <TitleInput
            ref={inputRef}
            size="sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={heading?.placeholder ?? 'Title'}
            aria-label="Title"
            maxLength={MAX_TITLE}
            readOnly={busy || settling}
            autoFocus
          />
        </div>
      </div>

      {/* Cancel and Create, floating at the bottom in a bar of their own (higher on a map card, whose title hangs at the bottom); the bar slides down and away once the card is created */}
      <div
        className={`absolute inset-x-0 ${onMap ? 'bottom-7' : 'bottom-0'} flex flex-col gap-1 transition-[transform,opacity] duration-200 ease-in motion-reduce:transition-none ${
          settling ? 'translate-y-[200%] opacity-0' : ''
        }`}
      >
        {error && (
          <p role="alert" className="line-clamp-2 rounded-(--field-radius) bg-surface px-2 py-1 text-small text-danger">
            {error}
          </p>
        )}
        <div className={`flex w-full items-center justify-between gap-base border-t border-line-strong bg-surface/90 p-base shadow-md backdrop-blur-sm ${onMap ? '' : 'rounded-b-(--card-radius)'}`}>
          <Button variant="ghost" filled onClick={onDone} disabled={busy || settling} className="flex-1">
            Cancel
          </Button>
          <Button plain type="submit" disabled={!valid || busy || settling} className="flex-1">
            {busy && !settling ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </form>
  )
}
