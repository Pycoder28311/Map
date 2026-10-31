import Button from '../../components/ui/buttons/Button'
import Modal from '../../components/ui/overlays/Modal'

/** A save refused because another version of the map was saved since it was read (another tab or device): which one stays */
export default function MapConflictModal({ onKeepMine, onUseSaved }: { onKeepMine: () => void; onUseSaved: () => void }) {
  return (
    <Modal
      open
      onClose={onUseSaved}
      title="This map changed"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onUseSaved}>
            Load the saved one
          </Button>
          <Button onClick={onKeepMine}>Save mine over it</Button>
        </>
      }
    >
      <p className="text-body">A newer version of this map was saved somewhere else after you opened it. Your changes are not saved yet. Which version do you want?</p>
    </Modal>
  )
}
