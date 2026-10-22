import { useEffect, useMemo, useRef, useState, type FocusEvent } from 'react'
import { changedFields, valuesOf, type FormValues } from '../../../lib/resource/changed'
import { actionsOf } from '../../../lib/resource/hooks'
import { useListStore } from '../../../lib/resource/listStoreContext'
import { keepFocus, NEW_ID } from '../../../lib/resource/newItem'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import type { AnyResource } from '../../../resources/types'
import ResourceForm from './ResourceForm'

/**
 * The page of an item that is not made yet (the sidebar's "+"): the resource's form, empty. The item is made the moment something is
 * typed in any field, through the same create as every other screen (actionsOf): the lists take the answer in (no read), the item
 * is handed to the editor that replaces this page, so it opens on what the server answered without reading it again, and the page
 * becomes the item's own (same place in the layout, Back skips this one); in a modal (`onMade`) the modal shows the item. What was typed while the server answered is sent as an
 * update, and the cursor goes back to the field it was in.
 */
export default function NewItemEditor({ resource, onMade }: { resource: AnyResource; onMade?: (id: string) => void }) {
  const store = useListStore()
  const workspace = useWorkspace()
  const empty = useMemo(() => valuesOf(resource, {}), [resource])
  const latest = useRef<FormValues>(empty)
  // The field the cursor is in (named like FieldRenderer's aria-label)
  const field = useRef<string | undefined>(undefined)
  const making = useRef(false)
  const here = useRef(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    here.current = true
    return () => {
      here.current = false
    }
  }, [])

  const make = async () => {
    making.current = true
    setError(null)
    try {
      const actions = actionsOf(resource)
      const made = await actions.create(latest.current)
      store.seedItem(resource, made)
      // Typed while the server answered
      const patch = changedFields(latest.current, valuesOf(resource, made))
      if (Object.keys(patch).length > 0) void actions.update(made.id, patch).catch(() => undefined)
      // Left this page meanwhile: the item exists (it is in the lists), but the screen is not taken back to it
      if (!here.current) return
      if (field.current) keepFocus(resource.name, made.id, field.current)
      // In a modal the modal shows the item; on a page the page becomes the item's
      if (onMade) onMade(String(made.id))
      else workspace.replace({ type: resource.panelType, id: NEW_ID }, { type: resource.panelType, id: String(made.id) }, { history: 'replace' })
    } catch (e) {
      // Nothing is lost: the form keeps what was typed, and the next change tries again
      making.current = false
      setError(e instanceof Error ? e.message : `Could not create the ${resource.ui.label.toLowerCase()}.`)
    }
  }

  const change = (values: FormValues) => {
    latest.current = values
    if (!making.current && Object.values(values).some((value) => value.trim() !== '')) void make()
  }

  const remember = (e: FocusEvent<HTMLDivElement>) => {
    const label = (e.target.closest('[aria-label]') ?? e.target).getAttribute('aria-label')
    field.current = resource.ui.fields.find((f) => (f.label ?? f.name) === label)?.name
  }

  return (
    <div onFocusCapture={remember} className="flex flex-col gap-2 p-4">
      <ResourceForm resource={resource} initial={empty} onChange={change} autoFocusField="title" />
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
