// The text editor that is open on the map (if one is), so the sidebar's text controls can drive it.
import type { Editor } from '@tiptap/react'
import { useSyncExternalStore } from 'react'

let active: Editor | null = null
const listeners = new Set<() => void>()

export function setActiveEditor(editor: Editor | null) {
  if (editor === active) return
  active = editor
  listeners.forEach((l) => l())
}

export const getActiveEditor = () => active

export const useActiveEditor = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => active,
  )

/** Controls that must not take the focus from the editor (a click on them is not "leaving it") carry this attribute */
export const KEEP_EDITING = 'data-keep-editing'

let finisher: (() => void) | null = null

/** The open editor says how it is finished (committed); a click elsewhere on the map calls it */
export const setFinisher = (fn: (() => void) | null) => {
  finisher = fn
}
export const finishEditing = () => finisher?.()
