import { mapName, useMaps, type MapItem } from '../maps/maps'
import { useWorkspace } from '../workspace/useWorkspace'
import { FLOAT } from './floating'
import { mapTree, siblingMaps } from './branches'

// Tree lines: each branch has a line down its left side (to its middle for the last one) and a short one across
const BRANCH =
  'relative ps-4 before:absolute before:start-0 before:top-0 before:h-full before:w-0.5 before:bg-line ' +
  'last:before:h-1/2 after:absolute after:start-0 after:top-1/2 after:h-0.5 after:w-2 after:bg-line'

/** The map's name in the bar: a single click opens the list of maps (MapsPanel, a panel of the left column like Search and Notes); renaming is in the ⋯ menu */
export default function MapPicker({ name, open, onToggle }: { name: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onToggle}
      className="block max-w-[28ch] cursor-pointer truncate rounded-(--btn-close-radius) px-2 py-1 text-heading transition-colors hover-fill focus-visible:outline-2 focus-visible:outline-accent"
    >
      {name}
    </button>
  )
}

/** The maps (those with branches show them in a tree under them) as a floating card under the bar; a pick shows that map and closes it */
export function MapsPanel({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const maps = useMaps()
  const workspace = useWorkspace()
  const tree = mapTree(siblingMaps(maps, mapId))

  const show = (id: string) => {
    onClose()
    if (id !== mapId) workspace.replace({ type: 'map', id: mapId }, { type: 'map', id })
  }
  const row = (map: MapItem, branches = 0, label = mapName(map)) => (
    <button
      type="button"
      aria-current={String(map.id) === mapId}
      onClick={() => show(String(map.id))}
      className="flex w-full cursor-pointer items-baseline gap-2 rounded-(--corner-sm) px-2 py-1.5 text-start hover-fill"
    >
      <span className="min-w-0 truncate text-body">{label}</span>
      {branches > 0 && (
        <span className="shrink-0 text-small text-fg-subtle">
          {branches} {branches === 1 ? 'branch' : 'branches'}
        </span>
      )}
    </button>
  )

  return (
    <div role="dialog" aria-label="Maps" onKeyDown={(e) => e.key === 'Escape' && onClose()} className={`pointer-events-auto flex min-h-0 flex-col p-2 ${FLOAT}`}>
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {tree.map(({ map, branches }) => (
          <li key={map.id}>
            {row(map, branches.length ? branches.length + 1 : 0)}
            {branches.length > 0 && (
              <ul className="ms-4">
                <li className={BRANCH}>{row(map, 0, `${mapName(map)} (main)`)}</li>
                {branches.map((b) => (
                  <li key={b.id} className={BRANCH}>
                    {row(b)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
