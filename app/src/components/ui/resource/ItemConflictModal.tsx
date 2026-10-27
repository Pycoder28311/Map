import Button from '../buttons/Button'
import Modal from '../overlays/Modal'

/** A draft on this device and a newer version on the server (useItemAutosave's `conflict`): which one stays */
export default function ItemConflictModal({ what, onKeepMine, onUseServers }: { what: string; onKeepMine: () => void; onUseServers: () => void }) {
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
      <p className="text-body">This {what} was changed somewhere else after you made the changes kept on this device. Which version do you want?</p>
    </Modal>
  )
}
