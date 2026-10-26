import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPlus, LuX } from 'react-icons/lu'
import { usePageInset } from '../../lib/pageInset'
import { useTimeout } from '../../lib/useTimeout'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import CreateModal from './CreateModal'
import Button from '../../components/ui/buttons/Button'
import PanelButton from '../../components/ui/buttons/PanelButton'

/** The modal's shrink-back (its animation, in animations.css) before it's removed (ms) */
const CLOSE_MS = 200
/** How long "Created …" stays (ms) */
const TOAST_MS = 6000

// Full class strings so Tailwind can detect them at build time.
// The two faces of the button, back to back: they never show through each other. The face is a wrapper, so the Panel
// button's own press (a transform) doesn't undo the back face's turn
const FACE = 'absolute inset-0 flex [backface-visibility:hidden]'

/** What was made: its panel type (to open it), what to call it ("note") and its name */
type Made = { id: string; panelType: string; label: string; name: string }

/**
 * The floating Create button (bottom right of the page area, over the page and its panes, not in them).
 * Clicked, it flips around to a gray ✕ Cancel and the modal grows out from behind it; clicking again,
 * Esc, or creating something flips it back and the modal shrinks into it. A click outside doesn't
 * close it. After creating, a small note by the button says what was made, with a link to open it.
 */
export default function CreateFab() {
  const [open, setOpen] = useState(false)
  // The modal stays mounted while it shrinks back; a new key each time it opens: a fresh form
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState(0)
  const [made, setMade] = useState<Made | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useTimeout()
  const toastTimer = useTimeout()
  const openLayout = useOpenLayout()
  const inset = usePageInset()

  const show = useCallback(() => {
    closeTimer.clear()
    toastTimer.clear()
    setMade(null)
    setSession((n) => n + 1)
    setMounted(true)
    setOpen(true)
  }, [closeTimer, toastTimer])

  const hide = useCallback(() => {
    setOpen(false)
    closeTimer.set(() => setMounted(false), CLOSE_MS)
  }, [closeTimer])

  // Esc closes it (an open menu in it gets the Esc first)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector(':popover-open')) return
      hide()
      buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, hide])

  const onCreated = (m: Made) => {
    hide()
    setMade(m)
    toastTimer.set(() => setMade(null), TOAST_MS)
  }

  return (
    <>
      {mounted && <CreateModal key={session} closing={!open} inset={inset} onCreated={onCreated} />}

      {/* In the modal's footer corner (24px from the page's edges). A fixed size: both faces say their word without moving */}
      <div style={{ insetInlineEnd: `calc(1.5rem + ${inset}px)` }} className="absolute bottom-6 z-[21] h-14 w-48 transition-[inset-inline-end] duration-200 ease-out [perspective:600px] motion-reduce:transition-none">
        {made && !open && (
          <p
            role="status"
            className="absolute end-0 bottom-[calc(100%+0.5rem)] flex w-max max-w-[min(24rem,calc(100vw-2rem))] animate-[labels-in_200ms_ease-out] items-center gap-3 rounded-(--btn-radius) border border-line-strong bg-surface px-3 py-2 text-body shadow-lg"
          >
            <span className="min-w-0 truncate">
              Created {made.label.toLowerCase()} <strong className="font-medium">{made.name}</strong>
            </span>
            <Button
              variant="text"
              onClick={() => {
                openLayout(single({ type: made.panelType, id: made.id }))
                setMade(null)
              }}
              className="shrink-0 text-highlight"
            >
              Open
            </Button>
          </p>
        )}
        <div
          className={`relative size-full transition-transform duration-[400ms] ease-in-out [transform-style:preserve-3d] motion-reduce:duration-0 ${
            open ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front: Create (the Panel button: the only place it is used) */}
          <span className={FACE}>
            <PanelButton
              ref={buttonRef}
              icon={LuPlus}
              onClick={show}
              tabIndex={open ? -1 : 0}
              aria-hidden={open}
              aria-expanded={open}
              aria-controls="create-modal"
              className="size-full"
            >
              Create
            </PanelButton>
          </span>
          {/* Back: ✕ Cancel (the grey Panel), turned round so it reads right when the button is flipped */}
          <span className={`${FACE} [transform:rotateY(180deg)]`}>
            <PanelButton muted icon={LuX} onClick={hide} tabIndex={open ? 0 : -1} aria-hidden={!open} className="size-full">
              Cancel
            </PanelButton>
          </span>
        </div>
      </div>
    </>
  )
}
