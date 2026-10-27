import { useEffect, useRef, useState } from 'react'
import { authClient } from '../../../lib/auth-client'
import { browserStorage, clearDraft, decideOnOpen, draftKey, readDraft } from '../../../lib/resource/autosave'
import { changedFields, sameValues, valuesOf, type FormValues } from '../../../lib/resource/changed'
import { useResourceActions } from '../../../lib/resource/hooks'
import { useAutosave } from '../../../lib/resource/useAutosave'
import type { AnyResource } from '../../../resources/types'

/** What the editor needs of an item of any resource */
export type EditedItem = { id: number | string; title: string; archived: boolean; createdAt: string; updatedAt: string } & Record<string, unknown>

type Options = {
  /** The values edited, as text (default: the resource's form fields, valuesOf). A field that is not text is kept as JSON text */
  values?: (item: Record<string, unknown>) => FormValues
  /** The changed values as the update sends them (default: as they are), e.g. a JSON field parsed back */
  toPatch?: (changed: FormValues) => Record<string, unknown>
}

/**
 * Saving one item as it is edited (ResourceEditor's form and the article page): useAutosave (30 s without a change, and 30 s at
 * most after the first, at once when the page is hidden, a draft on this device meanwhile), only the changed fields. A draft kept on
 * this device since the last time is applied if it changes the server's current version, asked about if the item changed since
 * (`conflict`: keepMine / useServers), dropped if it holds nothing new.
 */
export function useItemAutosave(resource: AnyResource, item: EditedItem, { values = (i) => valuesOf(resource, i), toPatch = (c) => c }: Options = {}) {
  const { update } = useResourceActions(resource)
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  // What the server has (the values changes are compared with) and the version of it the draft is a change of
  const saved = useRef<FormValues>(values(item))
  const base = useRef(item.updatedAt)

  const [boot] = useState(() => {
    const storage = browserStorage()
    const key = userId ? draftKey(userId, resource.name, item.id) : null
    const draft = key ? readDraft<FormValues>(storage, key) : null
    const decision = decideOnOpen(draft, { updatedAt: item.updatedAt, values: saved.current }, sameValues)
    if (draft && decision === 'none' && key) clearDraft(storage, key)
    return { key, draft, decision }
  })
  const [conflict, setConflict] = useState(boot.decision === 'conflict')
  const [start, setStart] = useState<{ values: FormValues; version: number }>({
    values: boot.decision === 'apply' && boot.draft ? boot.draft.values : saved.current,
    version: 0,
  })

  const autosave = useAutosave<FormValues>({
    save: async (next, { keepalive }) => {
      const patch = changedFields(next, saved.current)
      if (Object.keys(patch).length === 0) return
      const result = (await update(item.id, toPatch(patch), { keepalive })) as EditedItem
      saved.current = values(result)
      base.current = result.updatedAt
    },
    draft: boot.key ? { key: boot.key, baseUpdatedAt: () => base.current } : undefined,
  })

  // An applied draft is sent at once
  useEffect(() => {
    if (boot.decision === 'apply' && boot.draft) {
      autosave.change(boot.draft.values)
      void autosave.flush()
    }
    // Once, when the editor opens
  }, [])

  const keepMine = () => {
    if (!boot.draft) return
    setStart((s) => ({ values: boot.draft!.values, version: s.version + 1 }))
    setConflict(false)
    autosave.change(boot.draft.values)
    void autosave.flush()
  }
  const useServers = () => {
    if (boot.key) clearDraft(browserStorage(), boot.key)
    setConflict(false)
  }

  return { ...autosave, start, conflict, keepMine, useServers }
}
