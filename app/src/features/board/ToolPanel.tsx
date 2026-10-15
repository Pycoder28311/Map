import { LuRedo2, LuUndo2 } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { redo, undo, useCanRedo, useCanUndo } from './boardStore'
import { useWorkspace } from '../workspace/useWorkspace'
import { useFocusMode } from '../focus/FocusMode'
import { FLOAT, ROUNDER } from './floating'
import { TOOLS, type Tool, type ToolId } from './tools'

type Props = { mapId: string; tool: ToolId; onTool: (tool: ToolId) => void }

// Bigger buttons than the rest of the editor's: the tools are what is used all the time
const BIG = 'size-11! [&>svg]:size-6!'

/**
 * The tools, then undo and redo. On the page it is centred on the page like the navbar's Recent History above it (so it does not
 * move when the sidebar opens or closes); in a pane it is centred on the pane.
 */
export default function ToolPanel({ mapId, tool, onTool }: Props) {
  const canUndo = useCanUndo(mapId)
  const canRedo = useCanRedo(mapId)
  const inPane = useWorkspace().isPane({ type: 'map', id: mapId })
  // Right-aligned while there is no room to centre it without touching the name bar (MapTitleBar)
  // Below the navbar, or at the top like the title bar when the navbar is hidden (focus mode)
  const focus = useFocusMode().on
  const place = inPane
    ? 'absolute top-3 end-3 @5xl:end-auto @5xl:start-1/2 @5xl:-translate-x-1/2'
    : `fixed ${focus ? 'top-3' : 'top-[calc(var(--sidebar-rail)+0.75rem)]'} z-10 end-3 xl:end-auto xl:start-1/2 xl:-translate-x-1/2`
  const toolButton = (t: Tool) => (
    <IconButton
      key={t.id}
      icon={t.icon}
      label={t.enabled ? `${t.label} (${t.key.toUpperCase()})` : `${t.label}: ${t.soon}`}
      variant={t.id === tool ? 'primary' : 'ghost'}
      aria-pressed={t.id === tool}
      disabled={!t.enabled}
      className={BIG}
      onClick={() => onTool(t.id)}
    />
  )
  return (
    <div role="toolbar" aria-label="Tools" aria-orientation="horizontal" className={`${place} flex items-center gap-1.5 p-0.5 ${FLOAT} ${ROUNDER}`}>
      {/* The Text tool right after the Point tool */}
      {[...TOOLS.filter((t) => t.id !== 'text' && t.id !== 'point'), ...TOOLS.filter((t) => t.id === 'point'), ...TOOLS.filter((t) => t.id === 'text')].map(toolButton)}
      <span aria-hidden className="mx-0.5 h-8 w-px bg-line" />
      <IconButton icon={LuUndo2} label="Undo (Ctrl+Z)" className={BIG} disabled={!canUndo} onClick={() => undo(mapId)} />
      <IconButton icon={LuRedo2} label="Redo (Ctrl+Shift+Z)" className={BIG} disabled={!canRedo} onClick={() => redo(mapId)} />
    </div>
  )
}
