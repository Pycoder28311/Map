import type { SaveStatus as Status } from '../../../lib/resource/useAutosave'

const TEXT: Record<Status, string> = {
  idle: '',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved: trying again',
}

/** The state of an autosaving editor, as a small line (read out politely by screen readers) */
export default function SaveStatus({ status, className = '' }: { status: Status; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={`text-small ${status === 'error' ? 'text-danger' : 'text-fg-subtle'} ${className}`}>
      {TEXT[status]}
    </span>
  )
}
