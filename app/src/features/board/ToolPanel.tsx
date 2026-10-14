import { LuRedo2, LuUndo2 } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { redo, undo, useCanRedo, useCanUndo } from './boardStore'
import { useWorkspace } from '../workspace/useWorkspace'
import { FLOAT } from './floating'
import { TOOLS, type ToolId } from './tools'

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
  const place = inPane ? 'absolute top-3' : 'fixed top-[calc(var(--sidebar-rail)+0.75rem)] z-10'
  return (
    <div role="toolbar" aria-label="Tools" aria-orientation="horizontal" className={`${place} start-1/2 flex -translate-x-1/2 items-center gap-1.5 p-2 ${FLOAT}`}>
      {TOOLS.map((t) => (
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
      ))}
      <span aria-hidden className="mx-0.5 h-8 w-px bg-line" />
      <IconButton icon={LuUndo2} label="Undo (Ctrl+Z)" className={BIG} disabled={!canUndo} onClick={() => undo(mapId)} />
      <IconButton icon={LuRedo2} label="Redo (Ctrl+Shift+Z)" className={BIG} disabled={!canRedo} onClick={() => redo(mapId)} />
    </div>
  )
}
