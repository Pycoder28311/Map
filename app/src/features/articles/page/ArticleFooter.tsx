import SaveStatus from '../../../components/ui/resource/SaveStatus'
import type { useItemAutosave } from '../../../components/ui/resource/useItemAutosave'
import { DAY_MONTH_YEAR } from '../../../lib/dates'

type Props = {
  autosave: Pick<ReturnType<typeof useItemAutosave>, 'lost' | 'status'>
  /** An editor's page shows the save status */
  canEdit: boolean
  createdAt: string
}

/** At the bottom of the article: the save status (or why it can no longer be saved) and when it was made */
export default function ArticleFooter({ autosave, canEdit, createdAt }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {autosave.lost && (
        <p role="alert" className="text-small text-danger">
          You can no longer edit this article (it was deleted, or your access changed). Your changes are kept on this device.
        </p>
      )}
      <div className="flex items-center gap-2">
        {canEdit && <SaveStatus status={autosave.status} />}
        <span className="ms-auto text-small text-fg-subtle">Created {DAY_MONTH_YEAR.format(new Date(createdAt))}</span>
      </div>
    </div>
  )
}
