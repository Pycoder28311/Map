import SidePanel from '../common/SidePanel'
import ColourRow from './ColourRow'
import SelectionList from './SelectionList'
import { changeObjects } from '../../boardStore'
import { coloursOf, countOf, recolour } from '../../colours'
import type { BoardObject } from '../../types'

/** Several objects selected: one colour input per colour among them (changing one recolours everything that uses it), then the list of the objects */
export default function SelectionColoursSidebar({ mapId, selected }: { mapId: string; selected: BoardObject[] }) {
  const colours = coloursOf(selected)
  return (
    <SidePanel label="Colours of the selection">
      <h2 className="text-heading">{selected.length} objects</h2>
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
