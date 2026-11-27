import { setTool, useStore, type Tool } from '../store/store'

/** Each tool: its key and a small pixel icon (rows of '#', drawn on the grid like everything else) */
export const TOOLS: { tool: Tool; label: string; key: string; icon: string[] }[] = [
  { tool: 'select', label: 'Select and move', key: 'V', icon: ['#.......', '##......', '###.....', '####....', '#####...', '###.....', '#.##....', '...##...'] },
  { tool: 'brush', label: 'Brush', key: 'B', icon: ['......##', '.....###', '....###.', '...###..', '..###...', '.##.....', '###.....', '##......'] },
  { tool: 'eraser', label: 'Eraser', key: 'E', icon: ['........', '....###.', '...####.', '..####..', '.#..#...', '#..#....', '.##.....', '........'] },
  { tool: 'fill', label: 'Fill bucket', key: 'G', icon: ['..#.....', '.#.#....', '#...#...', '#....#..', '.#...##.', '..#.###.', '...#.##.', '......#.'] },
  { tool: 'eyedropper', label: 'Eyedropper (or hold Alt)', key: 'I', icon: ['......##', '.....###', '....###.', '...#.#..', '..#.#...', '.#.#....', '##......', '#.......'] },
  { tool: 'rect', label: 'Rectangle', key: 'R', icon: ['########', '#......#', '#......#', '#......#', '#......#', '#......#', '#......#', '########'] },
  { tool: 'stepped', label: 'Stepped rectangle', key: 'U', icon: ['..######', '.##....#', '##.....#', '#......#', '#......#', '#.....##', '#....##.', '######..'] },
  { tool: 'ellipse', label: 'Ellipse / circle', key: 'O', icon: ['..####..', '.##..##.', '##....##', '#......#', '#......#', '##....##', '.##..##.', '..####..'] },
  { tool: 'line', label: 'Line', key: 'L', icon: ['#.......', '.#......', '..#.....', '...#....', '....#...', '.....#..', '......#.', '.......#'] },
  { tool: 'text', label: 'Text', key: 'T', icon: ['########', '########', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...'] },
]

/** A pixel icon as an SVG of squares */
export function PixelIcon({ rows, size = 16 }: { rows: string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  )
}

/** The tools, down the left side */
export default function Toolbar() {
  const tool = useStore((s) => s.tool)
  return (
    <nav className="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button key={t.tool} type="button" className={tool === t.tool ? 'on' : ''} aria-pressed={tool === t.tool} title={`${t.label} (${t.key})`} onClick={() => setTool(t.tool)}>
          <PixelIcon rows={t.icon} />
          <kbd>{t.key}</kbd>
        </button>
      ))}
    </nav>
  )
}
