import Button from '../buttons/Button'
import Modal from '../overlays/Modal'
import type { Conflict } from './useItemAutosave'

/**
 * A newer version on the server than the one the user's changes are made on (useItemAutosave's `conflict`): a draft kept on this
 * device, or a save refused because someone saved since. Which one stays
 */
export default function ItemConflictModal({ what, conflict, onKeepMine, onUseServers }: { what: string; conflict: Conflict; onKeepMine: () => void; onUseServers: () => void }) {
  const text =
    conflict.kind === 'draft'
      ? `This ${what} was changed somewhere else after you made the changes kept on this device. Which version do you want?`
      : `${conflict.by || 'Someone'} saved a newer version of this ${what} while you were editing it. Your changes were not saved yet. Which version do you want?`
  return (
    <Modal
      open
      onClose={onUseServers}
      title={`This ${what} changed`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onUseServers}>
            Use the saved version
          </Button>
          <Button onClick={onKeepMine}>Keep my changes</Button>
        </>
      }
    >
      <p className="text-body">{text}</p>
    </Modal>
  )
}
