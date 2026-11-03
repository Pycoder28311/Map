import Button from '../../../../components/ui/buttons/Button'
import HoverInfo from '../../../../components/ui/overlays/HoverInfo'
import type { Mode } from '../../useMouseTool'

type Props = { mode: Mode; onSplit: () => void; onErase: () => void; splitLabel?: string; /** Show the split button (default) */ canSplit?: boolean }

/** Eraser (drag over the line to erase parts) and Split line (click the point of the line to cut it in two), text only with a background only when hovered; the one on shows as chosen */
export default function LineEditButtons({ mode, onSplit, onErase, splitLabel = 'Split line', canSplit = true }: Props) {
  return (
    <div className="flex gap-1">
      <HoverInfo title="Eraser" text="Drag over the object to erase the parts under the circle." side="bottom">
        <Button variant={mode === 'erase' ? 'selected' : 'ghost'} size="sm" plain aria-pressed={mode === 'erase'} onClick={onErase} className="flex-1">
          Eraser
        </Button>
      </HoverInfo>
      {canSplit && (
        <HoverInfo title={splitLabel} text="Click it, then click the point of the line to cut it in two." side="bottom">
          <Button variant={mode === 'split' ? 'selected' : 'ghost'} size="sm" plain aria-pressed={mode === 'split'} onClick={onSplit} className="flex-1">
            {splitLabel}
          </Button>
        </HoverInfo>
      )}
    </div>
  )
}
