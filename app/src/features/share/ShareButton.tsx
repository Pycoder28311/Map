import { useEffect, useState } from 'react'
import { LuShare2, LuMousePointerClick } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import BarPopout from '../../components/ui/overlays/BarPopout'
import ShareOptions from './ShareOptions'
import { startSharing, stopSharing, useShareState } from './shareStore'

/**
 * Share in the navbar: opening it dims the screen except what can be shared (ShareMode); the popout,
 * stuck to the bar's right end, says "Choose what to share" until one is clicked, then offers the ways
 * to share its link. Closing it (Esc, a click outside, the button) ends share mode.
 */
export default function ShareButton() {
  const { phase, chosenId } = useShareState()
  const [open, setOpen] = useState(false)

  // Share mode ended elsewhere (Esc, a click beside the highlights): the popout closes too
  useEffect(() => {
    if (phase === 'idle') setOpen(false)
  }, [phase])

  return (
    <BarPopout
      mode="click"
      stick="end"
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) startSharing()
        else stopSharing()
      }}
      trigger={
        <Button variant={open ? 'secondary' : 'ghost'} icon={LuShare2} aria-expanded={open}>
          Share
        </Button>
      }
    >
      <div className="w-72">{phase === 'chosen' && chosenId ? <ShareOptions id={chosenId} onChoose={startSharing} /> : <Choosing />}</div>
    </BarPopout>
  )
}

function Choosing() {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-3 text-center">
      <LuMousePointerClick className="size-6 text-fg-subtle" aria-hidden />
      <p className="text-heading font-medium">Choose what to share</p>
      <p className="text-small text-fg-muted">Click a highlighted object: a sidebar row, a pane, or one on the page.</p>
    </div>
  )
}

