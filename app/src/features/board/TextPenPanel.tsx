import { LuAlignCenter, LuAlignLeft, LuAlignRight } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import ColourField from '../../components/ui/fields/ColourField'
import RangeField from '../../components/ui/fields/RangeField'
import { setTextPen, useTextPen } from './pen'
import SidePanel from './SidePanel'

/** The Text tool's sidebar: what the next text starts with (not undoable, not part of any map) */
export default function TextPenPanel() {
  const pen = useTextPen()
  return (
    <SidePanel label="Text options">
      <h2 className="text-heading">Text</h2>
      <p className="text-small text-fg-muted">Click on the map to type; drag to make a box that wraps.</p>
      <div className="flex items-center gap-1">
        <IconButton icon={LuAlignLeft} label="Align left" variant={pen.align === 'left' ? 'primary' : 'ghost'} onClick={() => setTextPen({ align: 'left' })} />
        <IconButton icon={LuAlignCenter} label="Align centre" variant={pen.align === 'center' ? 'primary' : 'ghost'} onClick={() => setTextPen({ align: 'center' })} />
        <IconButton icon={LuAlignRight} label="Align right" variant={pen.align === 'right' ? 'primary' : 'ghost'} onClick={() => setTextPen({ align: 'right' })} />
      </div>
      <ColourField label="Colour" value={pen.color} onLive={(color) => setTextPen({ color })} onCommit={(color) => setTextPen({ color })} />
      <RangeField label="Size" value={pen.size} min={6} max={200} onLive={(size) => setTextPen({ size })} onCommit={(size) => setTextPen({ size })} />
      <RangeField label="Opacity" value={pen.opacity} min={1} max={100} suffix="%" onLive={(opacity) => setTextPen({ opacity })} onCommit={(opacity) => setTextPen({ opacity })} />
    </SidePanel>
  )
}
