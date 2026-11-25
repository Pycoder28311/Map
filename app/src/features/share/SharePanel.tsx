import { LuMousePointerClick } from 'react-icons/lu'
import ShareOptions from './ShareOptions'
import { startSharing, useShareState } from './shareStore'

/**
 * What the navbar shows while sharing (the profile menu's Share starts it): "Choose what to share" while the screen is dimmed except what
 * can be shared (ShareMode), then, once one is clicked, the ways to share its link
 */
export default function SharePanel() {
  const { phase, chosenId } = useShareState()
  return (
    <div className="w-72">
      {phase === 'chosen' && chosenId ? (
        <ShareOptions id={chosenId} onChoose={startSharing} />
      ) : (
        <div className="flex flex-col items-center gap-2 px-2 py-3 text-center">
          <LuMousePointerClick className="size-6 text-fg-subtle" aria-hidden />
          <p className="text-heading font-medium">Choose what to share</p>
          <p className="text-small text-fg-muted">Click a highlighted object: a sidebar row, a pane, or one on the page.</p>
        </div>
      )}
    </div>
  )
}
