import SelectionActions from '../common/SelectionActions'
import SidePanel from '../common/SidePanel'
import ColourRow from './ColourRow'
import SelectionList from './SelectionList'
import { changeObjects } from '../../boardStore'
import { coloursOf, countOf, recolour } from '../../colours'
import type { SidebarAction } from '../../selectionButtons'
import type { BoardObject } from '../../types'
import type { Mode } from '../../useMouseTool'

/** Several objects selected: one colour input per colour among them (changing one recolours everything that uses it), then the list of the objects */
export default function SelectionColoursSidebar({ mapId, selected, mode, onAction }: { mapId: string; selected: BoardObject[]; mode: Mode; onAction: (action: SidebarAction) => void }) {
  const colours = coloursOf(selected)
  return (
    <SidePanel label="Colours of the selection">
      {/* The title, and its buttons at the right end of its line */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading">{selected.length} objects</h2>
        <SelectionActions selected={selected} mode={mode} onAction={onAction} />
      </div>
      {colours.length === 0 ? (
        <p className="text-body text-fg-muted">Nothing here has a colour.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {colours.map((colour) => (
            <ColourRow key={colour} colour={colour} count={countOf(selected, colour)} onCommit={(to) => changeObjects(mapId, recolour(selected, colour, to))} />
          ))}
        </ul>
      )}
      <SelectionList mapId={mapId} selected={selected} />
    </SidePanel>
  )
}
