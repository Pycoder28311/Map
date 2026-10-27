import { useSyncExternalStore } from 'react'
import type { AnyResource } from '../../../resources/types'

/** A draft row in the sidebar, at the start of a project's or folder's rows: its name is typed in place; it is made when the name is saved */
export type SidebarDraft = {
  kind: AnyResource
  /** The row it is in: `<resource>:<id>` of the parent, and its node id (to open it) */
  parentKey: string
  parentNodeId: string
  parent: { type: string; id: number | string }
  /** The draft row's own node id (the tree's editing id) */
  nodeId: string
  /** What opens the parent's folder (a new object each draft) */
  reveal: { id: string }
  /** Its name was saved and the item is being made (the row stays, with a spinner, until it is there) */
  saving?: string
}

// One for the whole sidebar: a menu of a Pinned copy starts a draft that the project's own rows (another section) show
let current: SidebarDraft | null = null
const listeners = new Set<() => void>()

// Set by the ✕ as it is pressed, before the name field loses focus (which would save it): the name is then thrown away
let cancelled = false
export const markDraftCancelled = (value = true) => void (cancelled = value)
export const draftWasCancelled = () => cancelled

export function setSidebarDraft(next: SidebarDraft | null) {
  current = next
  listeners.forEach((listener) => listener())
}

export const useSidebarDraft = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
