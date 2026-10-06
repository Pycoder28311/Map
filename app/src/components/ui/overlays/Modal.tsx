import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import IconButton from '../buttons/IconButton'

// Full class strings so Tailwind can detect them at build time.
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
} as const

type Props = {
  open: boolean
  /** Called on Esc, the close button and a click on the backdrop; set `open` to false there */
  onClose: () => void
  title: string
  children: ReactNode
  /** Actions at the bottom, e.g. Cancel / Save buttons */
  footer?: ReactNode
  size?: keyof typeof SIZES
}

/**
 * Dialog over everything, built on the native <dialog> + showModal(): the browser puts it in the
 * top layer, so it shows in front of every element (panels included) wherever it is rendered, with
 * Esc, focus kept inside and the page behind it inactive. Render it next to the code that owns its
 * data; the content is only mounted while open.
 *
 *   const [open, setOpen] = useState(false)
 *   <Modal open={open} onClose={() => setOpen(false)} title="Rename">…</Modal>
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // `open` decides; the dialog follows (the guards make it safe to run twice)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Only the backdrop is the <dialog> itself: the content fills the inner box
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Esc: let React close it, so `open` and the dialog never disagree
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={onBackdrop}
      className={`m-auto w-[calc(100%-2rem)] ${SIZES[size]} max-h-[calc(100%-2rem)] overflow-hidden rounded-(--card-radius) bg-surface p-0 shadow-xl backdrop:bg-overlay/40`}
    >
      {open && (
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <header className="flex shrink-0 items-center gap-(--btn-gap) border-b border-line py-2 pr-2 pl-4">
            <h2 id={titleId} className="truncate text-body font-medium">
              {title}
            </h2>
            <IconButton icon={LuX} label="Close" onClick={onClose} className="ml-auto" />
          </header>

          <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>

          {footer && (
            <footer className="flex shrink-0 justify-end gap-(--btn-gap) border-t border-line px-4 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
