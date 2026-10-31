// The map's Save (docs/plans/38): the button in the title bar and Ctrl/⌘+S. Only Save sends the board: there is no autosave
import { useState } from 'react'
import { MapConflict, saveBoard, saveOver, takeServers, useSaveState } from './boardStore'

export type MapSave = ReturnType<typeof useMapSave>

export function useMapSave(mapId: string) {
  const { dirty, saving } = useSaveState(mapId)
  const [error, setError] = useState<string | null>(null)
  // Another version was saved since this one was read (another tab or device)
  const [conflict, setConflict] = useState<number | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
    } catch (e) {
      if (e instanceof MapConflict) setConflict(e.version)
      else setError(e instanceof Error ? e.message : 'The map could not be saved')
    }
  }

  return {
    dirty,
    saving,
    error,
    conflict,
    save: () => (dirty && !saving ? run(() => saveBoard(mapId)) : Promise.resolve()),
    /** Mine over the newer version */
    keepMine: () => {
      const version = conflict
      setConflict(null)
      if (version !== null) void run(() => saveOver(mapId, version))
    },
    /** The saved one (what was not saved here is dropped) */
    useSaved: () => {
      setConflict(null)
      void takeServers(mapId)
    },
  }
}
