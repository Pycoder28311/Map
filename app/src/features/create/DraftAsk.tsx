import Button from '../../components/ui/buttons/Button'

type Props = {
  /** What is asked: "Create this note?" */
  question: string
  busy?: boolean
  onCancel: () => void
  onCreate: () => void
}

/**
 * The question a modal draft asks when it was left with only a title (click outside): a line of text above two big buttons. Fills
 * the modal's footer (the caller's footer box draws the line and the padding). Only for drafts (the Note / Article modal, the floating Create frame).
 */
export default function DraftAsk({ question, busy = false, onCancel, onCreate }: Props) {
  return (
    <div role="alertdialog" aria-label={question} className="flex w-full flex-col items-center gap-3">
      <p className="text-body font-medium">{question}</p>
      <div className="flex w-full gap-base">
        <Button variant="ghost" filled size="lg" onClick={onCancel} disabled={busy} className="flex-1 justify-center">
          Cancel
        </Button>
        <Button size="lg" onClick={onCreate} disabled={busy} className="flex-1 justify-center">
          {busy ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}
