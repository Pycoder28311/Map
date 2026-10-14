import { LuHexagon, LuMapPin, LuMousePointer2, LuSpline, LuType } from 'react-icons/lu'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'

export type ToolId = 'mouse' | 'line' | 'border' | 'text' | 'point'

export type Tool = {
  id: ToolId
  label: string
  icon: PlainIcon
  /** The key that picks it while the editor has focus */
  key: string
  /** false: shown, but its plan has not been built yet */
  enabled: boolean
  /** Said in the tooltip of a tool that is not built yet */
  soon?: string
}

/** The tool panel, top to bottom */
export const TOOLS: Tool[] = [
  { id: 'mouse', label: 'Mouse', icon: LuMousePointer2, key: 'v', enabled: true },
  { id: 'line', label: 'Line', icon: LuSpline, key: 'l', enabled: true },
  { id: 'border', label: 'Border', icon: LuHexagon, key: 'b', enabled: true },
  { id: 'text', label: 'Text', icon: LuType, key: 't', enabled: true },
  { id: 'point', label: 'Point', icon: LuMapPin, key: 'p', enabled: true },
]

/** The tool a key picks, if it is built */
export const toolOfKey = (key: string) => TOOLS.find((t) => t.enabled && t.key === key.toLowerCase())
