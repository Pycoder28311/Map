import { getState, setSheet, setTool, useStore, type Tool } from '../store/store'
import { useNarrow } from '../useNarrow'

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

/** The tools: down the left side; on phones a bar along the bottom, with the main colour and the panels' button at its end */
export default function Toolbar() {
  const tool = useStore((s) => s.tool)
  const narrow = useNarrow()
  const main = useStore((s) => s.settings.main)
  const sheet = useStore((s) => s.sheet)
  return (
    <nav className="toolbar" aria-label="Tools">
      <div className="tools">
        {TOOLS.map((t) => (
          <button key={t.tool} type="button" className={tool === t.tool ? 'on' : ''} aria-pressed={tool === t.tool} title={`${t.label} (${t.key})`} aria-label={t.label} onClick={() => setTool(t.tool)}>
            <PixelIcon rows={t.icon} size={narrow ? 20 : 16} />
            {!narrow && <kbd>{t.key}</kbd>}
          </button>
        ))}
      </div>
      {narrow && (
        <div className="tool-extras">
          <button type="button" className={`colour-chip ${sheet === 'colours' ? 'on' : ''}`} aria-label="Colours" onClick={() => setSheet(sheet === 'colours' ? null : 'colours')}>
            <span style={{ background: main }} />
          </button>
          <button
            type="button"
            className={sheet === 'tool' || sheet === 'selection' ? 'on' : ''}
            aria-label="Settings"
            onClick={() => setSheet(sheet === 'tool' || sheet === 'selection' ? null : getState().selection ? 'selection' : 'tool')}
          >
            <PixelIcon rows={['...##...', '.######.', '.##..##.', '##....##', '##....##', '.##..##.', '.######.', '...##...']} size={20} />
          </button>
        </div>
      )}
    </nav>
  )
}
