import IconButton from '../../../../components/ui/buttons/IconButton'
import HoverInfo from '../../../../components/ui/overlays/HoverInfo'
import { keepFocus } from '../../../../lib/keepFocus'
import { sidebarButtonsFor, type SidebarAction } from '../../selectionButtons'
import type { BoardObject } from '../../types'
import type { Mode } from '../../useMouseTool'

/**
 * The row at the right of the sidebar's title (under the first row of a sidebar that has no title): what the selection can do (flip, split, duplicate, by kind: selectionButtons.ts). Split shows as chosen while it is on.
 * A press leaves the focus on the map, whose keys (Ctrl+Z, Delete…) are not heard from the sidebar
 */
export default function SelectionActions({ selected, mode, onAction }: { selected: BoardObject[]; mode: Mode; onAction: (action: SidebarAction) => void }) {
  const buttons = sidebarButtonsFor(selected)
  if (buttons.length === 0) return null
  return (
    <div role="group" aria-label="Actions" className="flex items-center gap-1">
      {buttons.map((b) => {
        const pressed = b.action === 'split' ? mode === 'split' : undefined
        return (
          <HoverInfo key={b.action} title={b.label} text={b.info} shortcut={b.shortcut} side="bottom">
            <IconButton icon={b.icon} label={b.label} variant={pressed ? 'selected' : 'ghost'} aria-pressed={pressed} onMouseDown={keepFocus} onClick={() => onAction(b.action)} />
          </HoverInfo>
        )
      })}
    </div>
  )
}
