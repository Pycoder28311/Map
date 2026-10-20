// The Trash's side of the resources: the archived items of every resource that shows in the Trash (surfaces.trash), loaded together,
// and "empty the Trash" for them. No cache: loaded when the sidebar mounts and again whenever one of the resources changed.
import { PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useEffect, useReducer, useState } from 'react'
import type { AnyResource } from '../../resources/types'
import { notifyChanged, subscribeChanges } from './changes'

export type TrashedItem = Record<string, unknown> & { id: number | string }

export type TrashSection = {
  resource: AnyResource
  items: TrashedItem[]
  /** There are more in the Trash than were loaded (one page of the most) */
  more: boolean
}

type State = { sections: TrashSection[]; status: 'loading' | 'ready' | 'error'; error: Error | null }

/** The Trash items of these resources (one page each); `refresh` loads again */
export function useTrashedItems(resources: AnyResource[]) {
  const [state, setState] = useState<State>({ sections: [], status: 'loading', error: null })
  const [tick, refresh] = useReducer((n: number) => n + 1, 0)

  useEffect(() => subscribeChanges((event) => resources.some((r) => r.name === event.name) && refresh()), [resources])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(
      resources.map(async (resource): Promise<TrashSection> => {
        const page = await resource.api.list({ archived: true }, { limit: PAGE_SIZE_MAX }, controller.signal)
        return { resource, items: page.items, more: page.nextCursor !== null }
      }),
    )
      .then((sections) => setState({ sections, status: 'ready', error: null }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Keep what was shown; the Trash just says it could not load
        setState((s) => ({ ...s, status: s.sections.length > 0 ? 'ready' : 'error', error: error instanceof Error ? error : new Error(String(error)) }))
      })
    return () => controller.abort()
  }, [resources, tick])

  const total = state.sections.reduce((n, s) => n + s.items.length, 0)
  return { ...state, total, more: state.sections.some((s) => s.more), refresh }
}

/**
 * Deletes every item in these Trash sections for good, one request each (there is no bulk route). Stops at the first failure and
 * throws it; what was deleted before stays deleted. Tells the lists on screen once at the end
 */
export async function emptyTrashSections(sections: TrashSection[]): Promise<void> {
  const touched = new Set<string>()
  try {
    for (const { resource, items } of sections) {
      for (const item of items) {
        await resource.api.remove(item.id)
        touched.add(resource.name)
      }
    }
  } finally {
    touched.forEach((name) => notifyChanged({ name }))
  }
}
