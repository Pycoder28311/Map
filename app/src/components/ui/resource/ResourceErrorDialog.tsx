import Button from '../buttons/Button'
import Modal from '../overlays/Modal'

/** Says an action on a resource failed (a menu action has no form to show the error in) */
export default function ResourceErrorDialog({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Something went wrong" size="sm" footer={<Button onClick={onClose}>OK</Button>}>
      <p role="alert" className="text-body">
        {message}
      </p>
    </Modal>
  )
}
