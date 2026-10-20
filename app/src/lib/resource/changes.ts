// A resource changed (something was created, updated or deleted through useResourceActions): every list of it that is on
// screen loads again, and an open item of it takes the new version. It carries no data store: only the news.

export type ChangeEvent = {
  /** The resource's name, e.g. 'notes' */
  name: string
  /** The server's version of a created or updated item */
  item?: { id: number | string }
  /** The id of a deleted item */
  removedId?: number | string
}

type Listener = (event: ChangeEvent) => void
const listeners = new Set<Listener>()

export function notifyChanged(event: ChangeEvent) {
  listeners.forEach((listener) => listener(event))
}

export function subscribeChanges(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Whether the event is about this item (ids are numbers on the server and strings in panel refs) */
export const isAbout = (event: ChangeEvent, id: number | string) =>
  (event.item !== undefined && String(event.item.id) === String(id)) || (event.removedId !== undefined && String(event.removedId) === String(id))
