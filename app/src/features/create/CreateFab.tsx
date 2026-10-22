import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPlus, LuX } from 'react-icons/lu'
import { usePageInset } from '../../lib/pageInset'
import { useTimeout } from '../../lib/useTimeout'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import CreateModal from './CreateModal'
import PixelSquare from '../../components/ui/pixel/PixelSquare'

/** The modal's shrink-back (its animation, in animations.css) before it's removed (ms) */
const CLOSE_MS = 200
/** How long "Created …" stays (ms) */
const TOAST_MS = 6000

// Full class strings so Tailwind can detect them at build time.
// The two faces of the button, back to back: they never show through each other
const FACE =
  'absolute inset-0 flex cursor-pointer items-center justify-center gap-2 text-base font-medium [backface-visibility:hidden] ' +
  'transition-[background-color,translate] active:translate-y-0.5 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent'

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
      <div style={{ insetInlineEnd: `calc(1.5rem + ${inset}px)` }} className="absolute bottom-6 z-[21] h-11 w-36 transition-[inset-inline-end] duration-200 ease-out [perspective:600px] motion-reduce:transition-none">
        {made && !open && (
          <p
            role="status"
            className="absolute end-0 bottom-[calc(100%+0.5rem)] flex w-max max-w-[min(24rem,calc(100vw-2rem))] animate-[labels-in_200ms_ease-out] items-center gap-3 rounded-(--btn-radius) border border-line-strong bg-surface px-3 py-2 text-body shadow-lg"
          >
            <span className="min-w-0 truncate">
              Created {made.label.toLowerCase()} <strong className="font-medium">{made.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                openLayout(single({ type: made.panelType, id: made.id }))
                setMade(null)
              }}
              className="shrink-0 cursor-pointer font-medium text-highlight underline-offset-2 hover:underline"
            >
              Open
            </button>
          </p>
        )}
        <div
          className={`relative size-full transition-transform duration-[400ms] ease-in-out [transform-style:preserve-3d] motion-reduce:duration-0 ${
            open ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front: Create (green, like the rows' Create buttons) */}
          <PixelSquare
            as="button"
            bevel
            ref={buttonRef}
            type="button"
            onClick={show}
            tabIndex={open ? -1 : 0}
            aria-hidden={open}
            aria-expanded={open}
            aria-controls="create-modal"
            className={`${FACE} text-create-fg [--pixel-face:var(--create)] hover:[--pixel-face:var(--btn-create-hover-bg)]`}
          >
            <LuPlus aria-hidden className="size-5" />
            Create
          </PixelSquare>
          {/* Back: ✕ Cancel (gray), turned round so it reads right when the button is flipped */}
          <PixelSquare
            as="button"
            bevel
            type="button"
            onClick={hide}
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            className={`${FACE} text-fg [--pixel-face:var(--fill-strong)] hover:[--pixel-face:var(--fill)] [transform:rotateY(180deg)]`}
          >
            <LuX aria-hidden className="size-5" />
            Cancel
          </PixelSquare>
        </div>
      </div>
    </>
  )
}
