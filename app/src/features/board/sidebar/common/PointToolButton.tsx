import { LuWaypoints } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'

type Props = { on: boolean; onToggle: () => void; /** What it edits: "line" or "border" */ what: string }

/** Next to the title of the Line and Border sidebars: the Point tool, to catch and move the points of the lines or borders. Lit while on */
export default function PointToolButton({ on, onToggle, what }: Props) {
  return (
    <IconButton
      icon={LuWaypoints}
      label={on ? `Point tool on: move the points of a ${what}` : `Point tool: move the points of a ${what}`}
      aria-pressed={on}
      onClick={onToggle}
      className={on ? 'bg-accent/15 text-accent' : ''}
    />
  )
}
