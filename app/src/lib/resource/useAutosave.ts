// Saves what is being edited, as autosave.ts decides (5 s idle, at most 30 s of continuous typing, at once when the page is
// hidden), and keeps a draft in localStorage until the server has it.
import { useCallback, useEffect, useRef, useState } from 'react'
import { browserStorage, clearDraft, dueAt, fitsKeepalive, retryDelay, writeDraft } from './autosave'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type Options<V> = {
  /** Sends the values. `keepalive`: the page is going away (a small body: the request outlives it) */
  save: (values: V, options: { keepalive: boolean }) => Promise<void>
  /** Keep the values on this device until the server has them: the storage key, and the server version the changes are made on */
  draft?: { key: string; baseUpdatedAt: () => string }
  idleMs?: number
  maxWaitMs?: number
}

/** How often the draft is written while typing (ms): localStorage is synchronous, a big note should not be written at every key */
const DRAFT_EVERY = 400

export function useAutosave<V>(options: Options<V>) {
  // The latest options, without re-creating the callbacks below
  const config = useRef(options)
  useEffect(() => {
    config.current = options
  })

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const run = useRef({
    latest: undefined as V | undefined,
    version: 0,
    dirty: false,
    saving: false,
    first: 0,
    last: 0,
    attempt: 0,
    /** Nothing is sent while true (a delete is being asked of the server) */
    held: false,
    /** The thing was deleted: nothing is sent, ever */
    gone: false,
    saveTimer: undefined as number | undefined,
    draftTimer: undefined as number | undefined,
  })

  const persistDraft = useCallback(() => {
    const r = run.current
    window.clearTimeout(r.draftTimer)
    r.draftTimer = undefined
    const { draft } = config.current
    if (draft && r.dirty && r.latest !== undefined) {
      writeDraft(browserStorage(), draft.key, { values: r.latest, baseUpdatedAt: draft.baseUpdatedAt(), savedAt: Date.now() })
    }
  }, [])

  // `send` and `schedule` call each other: the timer reaches `send` through this
  const sender = useRef<(keepalive: boolean) => Promise<void>>(async () => {})

  const schedule = useCallback(() => {
    const r = run.current
    window.clearTimeout(r.saveTimer)
    const { idleMs, maxWaitMs } = config.current
    const due = dueAt({ dirty: r.dirty, saving: r.saving, firstChange: r.first, lastChange: r.last }, idleMs, maxWaitMs)
    if (due !== null) r.saveTimer = window.setTimeout(() => void sender.current(false), Math.max(0, due - Date.now()))
  }, [])

  const send = useCallback(
    async (keepalive: boolean) => {
      const r = run.current
      if (r.held || r.gone || r.saving || !r.dirty || r.latest === undefined) return
      r.saving = true
      r.first = Date.now() // changes made from now on are counted from now
      const sent = r.latest
      const version = r.version
      setStatus('saving')
      try {
        await config.current.save(sent, { keepalive })
        r.saving = false
        r.attempt = 0
        setError(null)
        if (r.version === version) {
          r.dirty = false
          const { draft } = config.current
          if (draft) clearDraft(browserStorage(), draft.key)
          setStatus('saved')
        } else {
          // Typed more while it was being sent: the draft holds the newer values, and the next save is scheduled
          persistDraft()
          setStatus('dirty')
          schedule()
        }
      } catch (e) {
        r.saving = false
        if (r.gone) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setStatus('error')
        // The draft stays; try again later (5 s, 10 s, 20 s… at most a minute)
        window.clearTimeout(r.saveTimer)
        r.saveTimer = window.setTimeout(() => void sender.current(false), retryDelay(r.attempt++))
      }
    },
    [persistDraft, schedule],
  )
  useEffect(() => {
    sender.current = send
  }, [send])

  /** The values changed */
  const change = useCallback(
    (values: V) => {
      const r = run.current
      const now = Date.now()
      r.latest = values
      r.version++
      if (!r.dirty) {
        r.dirty = true
        r.first = now
      }
      r.last = now
      if (config.current.draft && r.draftTimer === undefined) r.draftTimer = window.setTimeout(persistDraft, DRAFT_EVERY)
      setStatus(r.saving ? 'saving' : 'dirty')
      schedule()
    },
    [persistDraft, schedule],
  )

  /** Saves now (closing the editor, leaving a field) */
  const flush = useCallback(async () => {
    window.clearTimeout(run.current.saveTimer)
    await send(false)
  }, [send])

  /** Stops sending while something else decides what the server has (a delete); `release` goes on, `discard` drops it all */
  const hold = useCallback(() => {
    window.clearTimeout(run.current.saveTimer)
    run.current.held = true
  }, [])
  const release = useCallback(() => {
    run.current.held = false
    schedule()
  }, [schedule])
  /** The thing was deleted: what was not sent, and its draft, are dropped, and nothing is sent again */
  const discard = useCallback(() => {
    const r = run.current
    window.clearTimeout(r.saveTimer)
    window.clearTimeout(r.draftTimer)
    r.saveTimer = r.draftTimer = undefined
    r.gone = true
    r.dirty = false
    r.latest = undefined
    const { draft } = config.current
    if (draft) clearDraft(browserStorage(), draft.key)
    setStatus('idle')
  }, [])

  // The page is hidden or closing: the draft first, then try to send, with keepalive when the body fits
  useEffect(() => {
    const leave = () => {
      const r = run.current
      if (!r.dirty) return
      persistDraft()
      if (!r.saving) void send(r.latest !== undefined && fitsKeepalive(JSON.stringify(r.latest)))
    }
    const onVisibility = () => document.visibilityState === 'hidden' && leave()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', leave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', leave)
    }
  }, [persistDraft, send])

  // The editor closes: send what is left
  useEffect(() => {
    const r = run.current
    return () => {
      window.clearTimeout(r.saveTimer)
      persistDraft()
      void send(false)
    }
  }, [persistDraft, send])

  return { change, flush, hold, release, discard, status, error }
}
