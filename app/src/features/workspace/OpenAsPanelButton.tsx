import { LuSquareSplitHorizontal } from 'react-icons/lu'
import IconButton from '../../components/ui/IconButton'
import { MAX_PANELS } from './layout'
import type { PanelRef } from './types'
import { useWorkspace } from './useWorkspace'

/**
 * The one button that turns any element into a panel: put it next to the element with the panel it
 * represents. Opens it beside the current page/panels (or on its own when they can't be combined).
 */
export default function OpenAsPanelButton({ panel, label = 'Open as panel' }: { panel: PanelRef; label?: string }) {
  const { isOpen, canAdd, open } = useWorkspace()
  const alreadyOpen = isOpen(panel)
  const reason = alreadyOpen ? 'Already open' : canAdd ? label : `Up to ${MAX_PANELS} panels`

  return (
    <IconButton
      icon={LuSquareSplitHorizontal}
      label={reason}
      disabled={alreadyOpen || !canAdd}
      onClick={() => open(panel)}
    />
  )
}
