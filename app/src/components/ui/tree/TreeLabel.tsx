import { useEffect, useRef } from 'react'

// Long names fade out at the end instead of "…". flex-1: the label fills the row up to the right
// icons, so the fade sits at the row's end and short names (which don't reach it) stay untouched.
const FADE =
  'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-start ' +
  '[mask-image:linear-gradient(to_right,black_calc(100%-var(--icons,0px)-var(--tree-label-fade)),transparent_calc(100%-var(--icons,0px)))]'

// The name being edited: same text and line height as the label, so the row keeps its size
const INPUT = 'min-w-0 flex-1 bg-transparent p-0 text-body text-fg outline-none'

const MAX_NAME = 100

type Props = {
  children: string
  /** The name can be edited by double-clicking it: the text cursor shows over the text itself (not the
   *  empty space after it), and only the text reacts */
  onStartEdit?: () => void
  /** Being edited: an input in its place. Enter or leaving it saves (trimmed; empty = no change), Esc cancels */
  editing?: { onSave: (name: string) => void; onCancel: () => void }
}

/** A row's name. The inner span is just the text, so only it gets the editable cursor */
export default function TreeLabel({ children, onStartEdit, editing }: Props) {
  if (editing) return <NameInput initial={children} {...editing} />

  return (
    <span title={children} className={FADE}>
      <span
        className={onStartEdit ? 'cursor-text' : undefined}
        onDoubleClick={
          onStartEdit &&
          ((e) => {
            e.preventDefault()
            e.stopPropagation()
            onStartEdit()
          })
        }
      >
        {children}
      </span>
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
