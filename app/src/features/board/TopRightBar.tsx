import { useState } from 'react'
import { LuCamera, LuEye, LuPencil, LuShare2 } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import { findObject } from '../../mocks/projects'
import ShareOptions from '../share/ShareOptions'
import BarPopover from './BarPopover'
import BranchesPopout from './BranchesPopout'
import { getBoard } from './boardStore'
import { FLOAT } from './floating'
import { snapshotBlob } from './snapshot'

type Props = { mapId: string; visitor: boolean; onVisitor: () => void }

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

/** Top right: branches, share, screenshot, and the visitor's view. In the visitor's view only the way back stays */
export default function TopRightBar({ mapId, visitor, onVisitor }: Props) {
  const [sharing, setSharing] = useState(false)
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
    <div data-board-bar className={`absolute end-3 top-3 flex items-center gap-0.5 p-1 ${FLOAT}`}>
      {!visitor && (
        <>
          <BranchesPopout mapId={mapId} />
          <BarPopover
            open={sharing}
            onOpenChange={setSharing}
            label="Share this map"
            trigger={
              <HoverInfo title="Share" text="Copy this map's link or send it." side="bottom">
                <IconButton icon={LuShare2} label="Share" variant={sharing ? 'secondary' : 'ghost'} aria-expanded={sharing} onClick={() => setSharing(!sharing)} />
              </HoverInfo>
            }
          >
            <ShareOptions id={mapId} />
          </BarPopover>
          <HoverInfo title="Screenshot" text={error ?? 'Download a picture of what is on the map.'} side="bottom">
            <IconButton icon={LuCamera} label="Take a screenshot" disabled={busy} onClick={shoot} />
          </HoverInfo>
        </>
      )}
      <HoverInfo title={visitor ? 'Back to editing' : 'View as visitor'} text={visitor ? 'Show the tools again.' : 'See the map as a visitor does: pins open their cards.'} side="bottom">
        <IconButton icon={visitor ? LuPencil : LuEye} label={visitor ? 'Back to editing' : 'View as visitor'} variant={visitor ? 'secondary' : 'ghost'} aria-pressed={visitor} onClick={onVisitor} />
      </HoverInfo>
    </div>
  )
}
