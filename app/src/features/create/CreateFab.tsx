import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { usePageInset } from '../../lib/pageInset'
import { useTimeout } from '../../lib/useTimeout'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import CreateModal from './CreateModal'
import Button from '../../components/ui/buttons/Button'
import PanelFrame from '../../components/ui/buttons/PanelFrame'

/** The frame's growth and shrink (ms): the form is removed once it has shrunk back */
const SIZE_MS = 300
const CLOSE_MS = SIZE_MS
/** How long "Created …" stays (ms) */
const TOAST_MS = 6000

/** What was made: its panel type (to open it), what to call it ("note") and its name */
type Made = { id: string; panelType: string; label: string; name: string }

/**
 * The floating Create button (bottom right of the page area, over the page and its panes, not in them).
 * Clicked, its frame grows (its borders expand, smoothly) until it is the modal, and its Create label gives way to the
 * form, with a Cancel button where the label was; Cancel, Esc, or creating something shrinks it back to the button. A click
 * outside decides, as in every draft (CreateModal). After creating, a small note by the button says what was made, with a link to open it.
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
      {/* Bottom right, 24px from the page's edges: the Create button, and the modal it grows into (it keeps its corner) */}
      <div
        style={{
          insetInlineEnd: `calc(1.5rem + ${inset}px)`,
          width: open ? `min(28rem, calc(100% - 3rem - ${inset}px))` : '12rem',
          height: open ? 'min(44rem, calc(100% - 3rem))' : '3.5rem',
        }}
        className="absolute bottom-6 z-[21] transition-[inset-inline-end,width,height] duration-300 ease-in-out motion-reduce:transition-none"
      >
        {made && !open && (
          <p
            role="status"
            data-create-note
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
        <PanelFrame open={open} icon={LuPlus} label="Create" onPress={show} buttonRef={buttonRef} controls="create-modal" className="size-full">
          {mounted && <CreateModal key={session} active={open} onCreated={onCreated} onCancel={hide} />}
        </PanelFrame>
      </div>
    </>
  )
}
