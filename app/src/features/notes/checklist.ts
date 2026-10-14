// A note's checklist: converting to and from plain text, and the order Keep shows it in. Pure (checklist.test.ts).
import type { ChecklistItem } from '../../mocks/projects'

let counter = 0
/** A new item's id, unique among a note's items */
export const newItemId = () => `i${Date.now().toString(36)}${(counter++).toString(36)}`

/** Text → items: one per non-blank line */
export function textToItems(text: string | undefined): ChecklistItem[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ id: newItemId(), text: line, done: false }))
}

/** Items → text: one line each (blank items left out) */
export const itemsToText = (items: ChecklistItem[]) =>
  items
    .map((i) => i.text.trim())
    .filter(Boolean)
    .join('\n')

/** Open items first, then the ticked ones (each group in its own order) */
export function splitItems(items: ChecklistItem[]) {
  return { open: items.filter((i) => !i.done), done: items.filter((i) => i.done) }
}
