import SidePanel from './SidePanel'
import LineOptions from './LineOptions'
import { setPen, usePen } from './pen'
import ShapeFields from './ShapeFields'
import { shapeParamDefault } from './shapes'

/** The Line tool's card at the top right: what the next line or shape is drawn with (not undoable, not part of any map) */
export default function PenPanel() {
  const pen = usePen()
  return (
    <SidePanel label="Line options">
      <h2 className="text-heading">Line</h2>
      <LineOptions
        kind="line"
        style={pen.style}
        onChange={(style) => setPen({ style })}
        shapeActive={pen.shape !== null}
        onShape={() => setPen({ shape: pen.shape ?? 'rect', param: pen.shape ? pen.param : shapeParamDefault('rect') })}
        onLine={() => setPen({ shape: null })}
        afterWays={pen.shape && <ShapeFields value={{ shape: pen.shape, param: pen.param, fill: pen.fill }} onChange={(patch) => setPen(patch)} />}
      />
    </SidePanel>
  )
}
