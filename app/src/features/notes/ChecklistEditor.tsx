import { useRef } from 'react'
import { LuPlus, LuX } from 'react-icons/lu'
import type { ChecklistItem } from '../../mocks/projects'
import { newItemId, splitItems } from './checklist'

type Props = {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}

/** One line: a checkbox, its text (a borderless field) and a × on hover */
function Row({ item, onText, onToggle, onRemove, onEnter, onBackspaceEmpty, inputRef }: {
  item: ChecklistItem
  onText: (text: string) => void
  onToggle: () => void
  onRemove: () => void
  onEnter: () => void
  onBackspaceEmpty: () => void
  inputRef?: (el: HTMLInputElement | null) => void
}) {
  return (
    <li className="group/item flex items-center gap-2">
      <input type="checkbox" checked={item.done} onChange={onToggle} aria-label={`Done: ${item.text || 'item'}`} className="size-4 shrink-0 cursor-pointer accent-(--accent)" />
      <input
        ref={inputRef}
        value={item.text}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
          if (e.key === 'Backspace' && item.text === '') {
            e.preventDefault()
            onBackspaceEmpty()
          }
        }}
        aria-label="List item"
        className={`min-w-0 flex-1 bg-transparent py-1 text-body outline-none ${item.done ? 'text-fg-subtle line-through' : ''}`}
      />
      <button type="button" onClick={onRemove} aria-label="Delete item" className="cursor-pointer rounded-(--radius-pill) p-1 text-fg-subtle opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 hover:text-fg">
        <LuX className="size-3.5" />
      </button>
    </li>
  )
}

/**
 * A note as a checklist, like Google Keep: Enter adds an item below, Backspace on an empty one removes
 * it, a "List item" row at the end adds one, and ticked items drop under a "Completed" line.
 */
export default function ChecklistEditor({ items, onChange }: Props) {
  const inputs = useRef(new Map<string, HTMLInputElement>())
  const { open, done } = splitItems(items)
  const focusLater = (id: string) => requestAnimationFrame(() => inputs.current.get(id)?.focus())

  const patch = (id: string, change: Partial<ChecklistItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...change } : i)))
  const addAfter = (id: string | null) => {
    const item: ChecklistItem = { id: newItemId(), text: '', done: false }
    const at = id === null ? items.length : items.findIndex((i) => i.id === id) + 1
    onChange([...items.slice(0, at), item, ...items.slice(at)])
    focusLater(item.id)
  }
  const remove = (id: string, focusPrevious = false) => {
    const index = open.findIndex((i) => i.id === id)
    onChange(items.filter((i) => i.id !== id))
    if (focusPrevious && index > 0) focusLater(open[index - 1].id)
  }

  const row = (item: ChecklistItem) => (
    <Row
      key={item.id}
      item={item}
      inputRef={(el) => {
        if (el) inputs.current.set(item.id, el)
        else inputs.current.delete(item.id)
      }}
      onText={(text) => patch(item.id, { text })}
      onToggle={() => patch(item.id, { done: !item.done })}
      onRemove={() => remove(item.id)}
      onEnter={() => addAfter(item.id)}
      onBackspaceEmpty={() => remove(item.id, true)}
    />
  )

  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col gap-0.5">{open.map(row)}</ul>
      <button type="button" onClick={() => addAfter(null)} className="flex cursor-pointer items-center gap-2 py-1 text-start text-body text-fg-subtle hover:text-fg">
        <LuPlus className="size-4 shrink-0" />
        List item
      </button>
      {done.length > 0 && (
        <>
          <p className="mt-2 border-t border-line pt-2 text-small text-fg-subtle">
            {done.length} completed {done.length === 1 ? 'item' : 'items'}
          </p>
          <ul className="flex flex-col gap-0.5">{done.map(row)}</ul>
        </>
      )}
    </div>
  )
}
