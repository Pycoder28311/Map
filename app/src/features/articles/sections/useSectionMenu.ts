import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { filterSections, type SectionType } from './sectionTypes'

/**
 * The menu's state: the kinds its query keeps and the one the keyboard is on. `onKey` takes ↑ ↓ Enter (true when it used the key), for the
 * menu's own field or for the text where `/` was typed
 */
export function useSectionMenu(query: string, onPick: (type: SectionType) => void) {
  const types = filterSections(query)
  const [active, setActive] = useState(0)
  const [shownFor, setShownFor] = useState(query)
  // A new query starts on its first kind
  if (shownFor !== query) {
    setShownFor(query)
    setActive(0)
  }
  const onKey = (event: KeyboardEvent | ReactKeyboardEvent): boolean => {
    if (types.length === 0) return false
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((active + step + types.length) % types.length)
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      onPick(types[Math.min(active, types.length - 1)])
      return true
    }
    return false
  }
  return { types, active: Math.min(active, Math.max(types.length - 1, 0)), setActive, onKey }
}
