import { useEffect, useId, useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { LuMaximize2, LuX } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import IconButton from '../buttons/IconButton'

// Full class strings so Tailwind can detect them at build time.
const SIZES = {
  // Rem values, not max-w-sm / -lg: the theme's --spacing-sm (4px) and --spacing-lg (16px) (styles/tokens.css) are what those names pick up
  sm: 'max-w-[24rem]',
  md: 'max-w-[32rem]',
  lg: 'max-w-[48rem]',
  xl: 'max-w-[72rem]',
} as const

// Centred over a dimmed, blurred page. Opening: fades in and grows from 95% (@starting-style); closing
// is instant, since the content unmounts then
const DIALOG =
  'm-auto w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-hidden rounded-(--card-radius) p-0 shadow-xl ' +
  'transition-[opacity,scale] duration-200 ease-out starting:open:opacity-0 starting:open:scale-95 ' +
  'backdrop:bg-overlay/30 backdrop:backdrop-blur-sm backdrop:transition-opacity backdrop:duration-200 starting:open:backdrop:opacity-0 ' +
  'motion-reduce:transition-none motion-reduce:backdrop:transition-none'

// The same, and a change of `size` slides the width instead of jumping
const DIALOG_SMOOTH = DIALOG.replace('transition-[opacity,scale] duration-200', 'transition-[opacity,scale,max-width] duration-300')

type Props = {
  open: boolean
  /** Called on Esc, the close button and a click on the backdrop; set `open` to false there */
  onClose: () => void
  title: string
  children: ReactNode
  /** Actions at the bottom, e.g. Cancel / Save buttons */
  footer?: ReactNode
  size?: keyof typeof SIZES
  /** No header and no padding: the content draws everything (it should have its own Close); `title` stays as the screen-reader name */
  bare?: boolean
  /** The dialog's background classes (default: the surface) */
  className?: string
  /** A button left of the header's X that closes the modal and goes to `pageHref` (the same thing, full page). Needs the header (not `bare`) */
  zoomable?: boolean
  /** The page the zoom button goes to */
  pageHref?: string
  /** What the zoom button does instead of going to `pageHref` (e.g. show it as a pane beside the others); the modal closes first either way */
  onZoom?: () => void
  /** No padding around the content (it draws its own), the header stays */
  flush?: boolean
  /** Buttons in the header, at its right, before the zoom and close buttons */
  actions?: ReactNode
  /** A change of `size` slides the dialog's width */
  smoothSize?: boolean
  /** The header's buttons close together (--spacing-sm between the actions and the X, --spacing-base between the actions) */
  tightHeader?: boolean
  /** What a click on the backdrop does instead of `onClose` (a draft decides: create, discard or ask). Esc and the X still call `onClose` */
  onOutside?: () => void
}

/**
 * Dialog over everything, built on the native <dialog> + showModal(): the browser puts it in the
 * top layer, so it shows in front of every element (panels included) wherever it is rendered, with
 * Esc, focus kept inside and the page behind it inactive. Centred, the page behind blurred; a click
 * outside it closes it. Render it next to the code that owns its data; the content is only mounted
 * while open. The element with `data-autofocus` (e.g. a name field) gets focus when it opens.
 *
 *   const [open, setOpen] = useState(false)
 *   <Modal open={open} onClose={() => setOpen(false)} title="Rename">…</Modal>
 *
 * `zoomable` + `pageHref` (or `onZoom`) add a button left of the X that closes it and opens the same thing as a page.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md', bare = false, className = '', zoomable = false, pageHref, onZoom, flush = false, actions, tightHeader = false, smoothSize = false, onOutside }: Props) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // The press started on the backdrop (not e.g. a text selection that ended there)
  const pressedBackdrop = useRef(false)

  // `open` decides; the dialog follows (the guards make it safe to run twice)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first focusable element (the close button); prefer the marked one
      const target = dialog.querySelector<HTMLElement>('[data-autofocus]')
      target?.focus()
      if (target instanceof HTMLInputElement) target.select()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Only the backdrop is the <dialog> itself: the content fills the inner box
  const onPointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    pressedBackdrop.current = e.target === e.currentTarget
  }
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (pressedBackdrop.current && e.target === e.currentTarget) (onOutside ?? onClose)()
    pressedBackdrop.current = false
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
      onPointerDown={onPointerDown}
      onClick={onBackdrop}
      className={`${smoothSize ? DIALOG_SMOOTH : DIALOG} ${SIZES[size]} ${className || 'bg-surface'}`}
    >
      {open && (
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          {bare ? (
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
          ) : (
          <header className={`flex shrink-0 items-center border-b border-line py-2 pr-2 pl-4 ${tightHeader ? 'gap-sm' : 'gap-(--btn-gap)'}`}>
            <h2 id={titleId} className="truncate text-body font-medium">
              {title}
            </h2>
            {actions && <div className={`ml-auto flex items-center ${tightHeader ? 'gap-base' : 'gap-(--btn-gap)'}`}>{actions}</div>}
            {zoomable && (pageHref || onZoom) ? (
              <>
                <IconButton
                  icon={LuMaximize2}
                  label="Open as page"
                  onClick={() => {
                    onClose()
                    if (onZoom) onZoom()
                    else if (pageHref) navigate(pageHref)
                  }}
                  className={actions ? '' : 'ml-auto'}
                />
                <IconButton icon={LuX} label="Close" onClick={onClose} />
              </>
            ) : (
              <IconButton icon={LuX} label="Close" onClick={onClose} className={actions ? '' : 'ml-auto'} />
            )}
          </header>
          )}

          <div className={`min-h-0 flex-1 overflow-auto ${bare || flush ? '' : 'p-4'}`}>{children}</div>

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
