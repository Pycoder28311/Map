import { KIND_ICON } from '../../layerIcons'
import { select } from '../../selection'
import type { BoardObject } from '../../types'
import { LIST_ITEM } from '../../../../components/ui/buttons/buttonStyles'

const KIND_NAME = { line: 'Line', border: 'Area', shape: 'Shape', text: 'Text', point: 'Point' } as const

/** What an object is called in the list: its name, a text's words, else its kind and number */
export const listName = (o: BoardObject) => o.name || (o.kind === 'text' && o.text.trim().split('\n')[0]) || `${KIND_NAME[o.kind]} #${o.id}`

/** The selected objects, one row each; a click selects just that object (its own sidebar opens) */
export default function SelectionList({ mapId, selected }: { mapId: string; selected: BoardObject[] }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <h3 className="text-body text-fg-muted">Objects</h3>
      <ul className="flex flex-col gap-0.5">
        {selected.map((o) => {
          const Icon = KIND_ICON[o.kind]
          return (
            <li key={o.id}>
              <button type="button" onClick={() => select(mapId, [o.id])} className={LIST_ITEM}>
                <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-body">{listName(o)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
