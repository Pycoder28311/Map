import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../../lib/api/client'
import { authClient } from '../../../lib/auth-client'
import { browserStorage, clearDraft, decideOnOpen, draftKey, readDraft } from '../../../lib/resource/autosave'
import { isOwnVersion } from '../../../lib/resource/changes'
import { changedFields, sameValues, valuesOf, type FormValues } from '../../../lib/resource/changed'
import { useResourceActions, useResourceItem } from '../../../lib/resource/hooks'
import { useAutosave } from '../../../lib/resource/useAutosave'
import type { AnyResource } from '../../../resources/types'

/** What the editor needs of an item of any resource (`version`: a shared table's, docs/plans/34) */
export type EditedItem = { id: number | string; title: string; archived: boolean; createdAt: string; updatedAt: string; version?: number } & Record<string, unknown>

type Options = {
  /** The values edited, as text (default: the resource's form fields, valuesOf). A field that is not text is kept as JSON text */
  values?: (item: Record<string, unknown>) => FormValues
  /** The changed values as the update sends them (default: as they are), e.g. a JSON field parsed back */
  toPatch?: (changed: FormValues) => Record<string, unknown>
}

/**
 * What stands between the editor and its saves:
 * - draft: a draft on this device was made on an older version than the server's (found when it opens)
 * - newer: a save was refused because someone saved a newer version (409); `by`: their name, when known
 */
export type Conflict = { kind: 'draft' } | { kind: 'newer'; by: string; version: number }

/** The version a draft or a save is a change of: a shared item's `version`, else its `updatedAt` */
const versionOf = (item: EditedItem) => (typeof item.version === 'number' ? item.version : item.updatedAt)

/** A refusal that trying again will not mend: a newer version (409), or the item gone or no longer the user's to edit (404, 403) */
const isFinal = (error: Error) => error instanceof ApiError && [403, 404, 409].includes(error.status)

/**
 * Saving one item as it is edited (ResourceEditor's form and the article page): useAutosave (30 s without a change, and 30 s at
 * most after the first, at once when the page is hidden, a draft on this device meanwhile), only the changed fields. A shared item's
 * save says which version it changes (`baseVersion`): when someone saved a newer one, nothing is overwritten, saving stops and the user
 * chooses (`conflict`: keepMine / useServers). A draft kept on this device since the last time is applied if it changes the server's
 * current version, asked about if the item changed since, dropped if it holds nothing new. `lost`: the item can no longer be saved
 * (deleted, or the user's right was taken away): the draft stays on this device
 */
export function useItemAutosave(resource: AnyResource, item: EditedItem, { values = (i) => valuesOf(resource, i), toPatch = (c) => c }: Options = {}) {
  const { update } = useResourceActions(resource)
  const { refresh } = useResourceItem(resource, item.id)
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  const shared = typeof item.version === 'number'

  // What the server has (the values changes are compared with) and the version of it the changes are made on
  const saved = useRef<FormValues>(values(item))
  const base = useRef<number | string>(versionOf(item))

  const [boot] = useState(() => {
    const storage = browserStorage()
    const key = userId ? draftKey(userId, resource.name, item.id) : null
    const draft = key ? readDraft<FormValues>(storage, key) : null
    // A save that landed on the server but was never answered (the page was reloaded while it was on its way) is the only change since
    // the draft's version when the server is exactly one version ahead and the user saved it: the draft is theirs on top of it
    const own = draft && item.editedByMe === true && typeof item.version === 'number' && draft.baseUpdatedAt === String(item.version - 1)
    const decision = decideOnOpen(draft, { updatedAt: own ? draft.baseUpdatedAt : String(versionOf(item)), values: saved.current }, sameValues)
    if (draft && decision === 'none' && key) clearDraft(storage, key)
    return { key, draft, decision }
  })
  const [conflict, setConflict] = useState<Conflict | null>(boot.decision === 'conflict' ? { kind: 'draft' } : null)
  const [lost, setLost] = useState(false)
  const [start, setStart] = useState<{ values: FormValues; version: number }>({
    values: boot.decision === 'apply' && boot.draft ? boot.draft.values : saved.current,
    version: 0,
  })
  // "Use the saved version" after a refused save: the item is read again, then the form starts over with it
  const reloading = useRef(false)

  const autosave = useAutosave<FormValues>({
    save: async (next, { keepalive }) => {
      const patch = changedFields(next, saved.current)
      if (Object.keys(patch).length === 0) return
      try {
        const result = (await update(item.id, { ...toPatch(patch), ...(shared ? { baseVersion: base.current } : {}) }, { keepalive })) as EditedItem
        saved.current = values(result)
        base.current = versionOf(result)
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const detail = (path: string) => error.details.find((d) => d.path === path)?.message ?? ''
          setConflict({ kind: 'newer', by: detail('editedBy'), version: Number(detail('version')) })
        } else if (error instanceof ApiError && (error.status === 404 || error.status === 403)) setLost(true)
        throw error
      }
    },
    draft: boot.key ? { key: boot.key, baseUpdatedAt: () => String(base.current) } : undefined,
    stopOn: isFinal,
  })

  // A newer version this tab wrote itself (a rename from the sidebar) is the one the next save changes: not a conflict. One read from
  // the server (someone else's) is not taken: the next save is refused, and the user chooses
  useEffect(() => {
    if (typeof item.version !== 'number' || item.version === base.current) return
    if (reloading.current) {
      // The server's version, read for "Use the saved version": the form starts over with it
      reloading.current = false
      saved.current = values(item)
      base.current = item.version
      autosave.reset()
      setStart((s) => ({ values: saved.current, version: s.version + 1 }))
      return
    }
    if (isOwnVersion(resource.name, item.id, item.version)) base.current = item.version
    // Only when the item's version changes
  }, [item.version])

  // An applied draft is sent at once
  useEffect(() => {
    if (boot.decision === 'apply' && boot.draft) {
      autosave.change(boot.draft.values)
      void autosave.flush()
    }
    // Once, when the editor opens
  }, [])

  const keepMine = () => {
    if (conflict?.kind === 'newer') {
      // Save what is here over the newer version (the user saw the choice)
      base.current = conflict.version
      setConflict(null)
      autosave.release()
      void autosave.flush()
      return
    }
    if (!boot.draft) return
    setStart((s) => ({ values: boot.draft!.values, version: s.version + 1 }))
    setConflict(null)
    autosave.change(boot.draft.values)
    void autosave.flush()
  }
  const useServers = () => {
    if (conflict?.kind === 'newer') {
      setConflict(null)
      reloading.current = true
      refresh()
      return
    }
    if (boot.key) clearDraft(browserStorage(), boot.key)
    setConflict(null)
  }

  return { ...autosave, start, conflict, lost, keepMine, useServers }
}
