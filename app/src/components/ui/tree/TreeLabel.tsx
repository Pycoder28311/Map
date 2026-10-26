import { useEffect, useRef } from 'react'
import { LuLink } from 'react-icons/lu'

// Long names fade out at the end instead of "…". flex-1: the label fills the row up to the right
// icons, so the fade sits at the row's end and short names (which don't reach it) stay untouched.
const FADE =
  'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-start ' +
  '[mask-image:linear-gradient(to_right,black_calc(100%-var(--icons,0px)-var(--tree-label-fade)),transparent_calc(100%-var(--icons,0px)))]'

// The name being edited: same text and line height as the label, so the row keeps its size
const INPUT = 'min-w-0 flex-1 bg-transparent p-0 text-base text-fg outline-none'

const MAX_NAME = 100

/** How long a click on an editable name waits for a second one (a double click edits the name instead of opening the page) */
export const CLICK_DELAY_MS = 250

type Props = {
  children: string
  /** A small count after the name (e.g. linked notes) */
  badge?: number
  /** The name can be edited by double-clicking it: the text cursor shows over the text itself (not the
   *  empty space after it), and only the text reacts. A single click on the text opens the row's page after a short wait
   *  (CLICK_DELAY_MS), so a double click does not open it */
  onStartEdit?: () => void
  /** Being edited: an input in its place. Enter or leaving it saves (trimmed; empty = no change), Esc cancels */
  editing?: { onSave: (name: string) => void; onCancel: () => void }
}

/** A row's name. The inner span is just the text, so only it gets the editable cursor */
export default function TreeLabel({ children, badge, onStartEdit, editing }: Props) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (editing) return <NameInput initial={children} {...editing} />

  // The link is the text's ancestor: its own click is held back for a moment, then sent to it again (a click on the link itself, not on the text)
  const onClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    const link = e.currentTarget.closest('a')
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // a new tab, a download…: at once
    e.preventDefault()
    window.clearTimeout(timer.current)
    if (e.detail > 1) return // the second click of a double click
    timer.current = window.setTimeout(() => link.click(), CLICK_DELAY_MS)
  }

  return (
    <span title={children} className={FADE}>
      <span
        className={onStartEdit ? 'cursor-text' : undefined}
        onClick={onStartEdit && onClick}
        onDoubleClick={
          onStartEdit &&
          ((e) => {
            e.preventDefault()
            e.stopPropagation()
            window.clearTimeout(timer.current)
            onStartEdit()
          })
        }
      >
        {children}
      </span>
      {!!badge && (
        <span title={`${badge} linked`} className="ms-1.5 inline-flex items-center gap-0.5 align-middle text-small text-fg-subtle">
          <LuLink className="size-3" aria-hidden />
          {badge}
        </span>
      )}
    </span>
  )
}

function NameInput({ initial, onSave, onCancel }: { initial: string; onSave: (name: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  // Saved or cancelled already (the blur that follows must not save again)
  const done = useRef(false)

  // Focused with the name selected, also when started from a menu (which hands focus back to its trigger first)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    const name = ref.current?.value.trim() ?? ''
    if (save && name && name !== initial) onSave(name)
    else onCancel()
  }

  return (
    <input
      ref={ref}
      defaultValue={initial}
      maxLength={MAX_NAME}
      aria-label="Name"
      className={INPUT}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        // Kept here: Esc would also close the sidebar drawer
        e.stopPropagation()
        if (e.key === 'Enter') finish(true)
        if (e.key === 'Escape') finish(false)
      }}
    />
  )
}
