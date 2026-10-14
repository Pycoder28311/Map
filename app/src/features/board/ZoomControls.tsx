import { LuMinus, LuPlus } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { FLOAT, usePeekShift } from './floating'

type Props = { scale: number; onZoom: (factor: number) => void; onFit: () => void }

/** Bottom left: − 100% +. The percentage fits the board in the page */
export default function ZoomControls({ scale, onZoom, onFit }: Props) {
  const shift = usePeekShift()
  return (
    <div className={`absolute start-3 bottom-3 flex items-center gap-0.5 p-1 ${FLOAT} ${shift}`}>
      <IconButton icon={LuMinus} label="Zoom out (−)" onClick={() => onZoom(1 / 1.25)} />
      <button
        type="button"
        title="Fit the board (0)"
        onClick={onFit}
        className="min-w-14 cursor-pointer rounded-(--btn-close-radius) px-1 py-(--btn-close-p) text-center text-small tabular-nums hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent"
      >
        {Math.round(scale * 100)}%
      </button>
      <IconButton icon={LuPlus} label="Zoom in (+)" onClick={() => onZoom(1.25)} />
    </div>
  )
}
