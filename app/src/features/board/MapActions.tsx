import { useState } from 'react'
import { LuCamera } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import { findObject } from '../../mocks/projects'
import BranchesPopout from './BranchesPopout'
import LayersButton from './LayersButton'
import { getBoard } from './boardStore'
import { snapshotBlob } from './snapshot'

/** A picture of the map's content, downloaded as `<name>.png` */
async function downloadScreenshot(mapId: string) {
  const blob = await snapshotBlob(getBoard(mapId))
  if (!blob) throw new Error('The browser could not make the picture')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${findObject(mapId)?.name || 'map'}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The map's actions, inside the title bar: branches, layers and screenshot */
export default function MapActions({ mapId, onPickObject }: { mapId: string; onPickObject: (id: number) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shoot = async () => {
    setBusy(true)
    setError(null)
    try {
      await downloadScreenshot(mapId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The picture could not be made')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
          <BranchesPopout mapId={mapId} />
      <LayersButton mapId={mapId} onPick={onPickObject} />
          <HoverInfo title="Screenshot" text={error ?? 'Download a picture of what is on the map.'} side="bottom">
            <IconButton icon={LuCamera} label="Take a screenshot" disabled={busy} onClick={shoot} />
          </HoverInfo>
        </>
  )
}
