import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { useListStore } from '../../lib/resource/listStoreContext'
import BoardEditor from '../board/BoardEditor'
import { markSaved, useSaveState } from '../board/boardStore'
import { emptyBoard } from '../board/types'
import type { MapItem } from '../maps/maps'
import { useWorkspace } from '../workspace/useWorkspace'
import { makeStarterMap } from './makeStarter'
import { starterId, starterItem, starterOf } from './starterItems'

const ID = starterId('map')

/**
 * The starter map's page (My world map): the board editor on an empty board that is only here. The first change (something drawn, or
 * the map renamed) makes the map with its board (makeStarter.ts), and the page becomes the map's own (same place in the layout)
 */
export default function StarterMap() {
  const store = useListStore()
  const workspace = useWorkspace()
  const { data: session } = authClient.useSession()
  const [item] = useState(() => starterItem(starterOf('map')) as unknown as MapItem)
  // An empty board the server never had (it is not read from anywhere), each time the page opens: what was drawn on it before is a map now
  useLayoutEffect(() => markSaved(ID, emptyBoard(), 0), [])
  const { dirty } = useSaveState(ID)
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const make = (title: string) => {
    const userId = session?.user.id
    if (!userId || started.current) return
    started.current = true
    setError(null)
    makeStarterMap(title, userId, store)
      .then((id) => workspace.replace({ type: 'map', id: ID }, { type: 'map', id }, { history: 'replace' }))
      .catch((e: unknown) => {
        started.current = false
        setError(e instanceof Error ? e.message : 'The map could not be made.')
      })
  }
  // Something was drawn
  useEffect(() => {
    if (dirty) make(item.title)
  })

  return (
    <>
      {error && (
        <p role="alert" className="absolute top-16 left-4 z-30 text-small text-danger">
          {error}
        </p>
      )}
      <BoardEditor mapId={ID} starter={{ item, onRename: make }} />
    </>
  )
}
