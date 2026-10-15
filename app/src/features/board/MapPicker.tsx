import { useState } from 'react'
import { findObject } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import { useWorkspace } from '../workspace/useWorkspace'
import BarPopover from './BarPopover'
import { mapTree, siblingMaps } from './branches'
import type { MockObject } from '../../mocks/projects'

// Tree lines: each branch has a line down its left side (to its middle for the last one) and a short one across
const BRANCH =
  'relative ps-4 before:absolute before:start-0 before:top-0 before:h-full before:w-0.5 before:bg-line ' +
  'last:before:h-1/2 after:absolute after:start-0 after:top-1/2 after:h-0.5 after:w-2 after:bg-line'

/** The map's name; a click lists the maps of its project (those with branches show them in a tree under them) */
export default function MapPicker({ mapId, name }: { mapId: string; name: string }) {
  const objects = useMockObjects()
  const workspace = useWorkspace()
  const [open, setOpen] = useState(false)
  const project = findObject(findObject(mapId)?.parentId ?? undefined)
  const tree = mapTree(siblingMaps(objects, mapId))

  const show = (id: string) => {
    setOpen(false)
    if (id !== mapId) workspace.replace({ type: 'map', id: mapId }, { type: 'map', id })
  }
  const row = (map: MockObject, branches = 0, label = map.name) => (
    <button
      type="button"
      aria-current={map.id === mapId}
      onClick={() => show(map.id)}
      className={`flex w-full cursor-pointer items-baseline gap-2 rounded-(--corner-sm) px-2 py-1.5 text-start hover:bg-fill`}
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
    <BarPopover
      open={open}
      onOpenChange={setOpen}
      label="Maps of this project"
      trigger={
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(!open)}
          className="block max-w-[28ch] cursor-pointer truncate rounded-(--btn-close-radius) px-2 py-1 text-heading transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent"
        >
          {name}
        </button>
      }
    >
      {project && <p className="truncate px-2 pb-1 text-small text-fg-subtle">{project.name}</p>}
      <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
        {tree.map(({ map, branches }) => (
          <li key={map.id}>
            {row(map, branches.length ? branches.length + 1 : 0)}
            {branches.length > 0 && (
              <ul className="ms-4">
                <li className={BRANCH}>{row(map, 0, `${map.name} (main)`)}</li>
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
    </BarPopover>
  )
}
