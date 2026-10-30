import { useState, type FormEvent } from 'react'
import Button from '../../../components/ui/buttons/Button'
import InputBox from '../../../components/ui/fields/InputBox'
import TextAreaField from '../../../components/ui/fields/TextAreaField'
import TextField from '../../../components/ui/fields/TextField'
import { isWebUrl, LIMITS } from './linkHref'

/** Apply, and Remove when the text is already this kind of link */
export function FormActions({ onRemove, canApply = true }: { onRemove?: () => void; canApply?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      {onRemove && (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      )}
      <Button type="submit" size="sm" disabled={!canApply}>
        Apply
      </Button>
    </div>
  )
}

const submit = (run: () => void) => (e: FormEvent) => {
  e.preventDefault()
  run()
}

/** "https://" in front of an address typed without it */
const withScheme = (url: string) => (/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`)

/** Real link: an outside address and the words it shows (by default the selected ones) */
export function RealLinkForm({ url: startUrl = '', name: startName, onApply, onRemove }: { url?: string; name: string; onApply: (url: string, name: string) => void; onRemove?: () => void }) {
  const [url, setUrl] = useState(startUrl)
  const [name, setName] = useState(startName)
  const full = withScheme(url)
  const valid = url.trim() !== '' && isWebUrl(full)
  return (
    <form className="flex flex-col gap-2" onSubmit={submit(() => valid && onApply(full, name))}>
      <TextField label="Link" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={LIMITS.url} autoFocus />
      <TextField label="Name" placeholder="The words it shows" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
      {url.trim() !== '' && !valid && <p className="text-small text-danger">Only http and https addresses.</p>}
      <FormActions onRemove={onRemove} canApply={valid} />
    </form>
  )
}

/**
 * Message: a title and a text, shown beside the article when the words are clicked. `onApply` may be a request (busy until it ends; its
 * error shows here and the text stays). `note`: why it can't be changed (only its author changes a message)
 */
export function MessageForm({
  title: startTitle = '',
  content: startContent = '',
  onApply,
  onRemove,
  note,
}: {
  title?: string
  content?: string
  onApply: (title: string, content: string) => void | Promise<void>
  onRemove?: () => void
  note?: string
}) {
  const [title, setTitle] = useState(startTitle)
  const [content, setContent] = useState(startContent)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = title.trim() !== '' || content.trim() !== ''
  const readOnly = note !== undefined
  const send = async () => {
    if (!valid || busy || readOnly) return
    setBusy(true)
    setError(null)
    try {
      await onApply(title.trim(), content.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'It could not be saved. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="flex flex-col gap-2" onSubmit={submit(() => void send())}>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} autoFocus readOnly={readOnly} />
      <label className="flex flex-col gap-1">
        <span className="text-small text-fg-muted">Content</span>
        <InputBox as="span" row={false} className="block px-(--field-px) py-2">
          <TextAreaField label="Content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} maxLength={LIMITS.content} readOnly={readOnly} className="max-h-60" />
        </InputBox>
        <span className="self-end text-small text-fg-subtle">
          {content.length} / {LIMITS.content}
        </span>
      </label>
      {note && <p className="text-small text-fg-subtle">{note}</p>}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      <FormActions onRemove={onRemove} canApply={valid && !busy && !readOnly} />
    </form>
  )
}
