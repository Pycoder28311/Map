import { useRef, useState, type CSSProperties } from 'react'
import { LuImage } from 'react-icons/lu'
import InputBox from '../../components/ui/fields/InputBox'
import { uploadImage } from '../../lib/api/images'
import { setBackground } from './boardStore'

/**
 * The button at the top right of the sheet (faint until hovered or focused) that gives the map its own background picture: a file input shaped like a field, with an
 * image icon ("Import image", "Change image" once the map has one). The picture is stored like any image of the app, and its address is
 * kept in the map's file (Board.background), saved with the map
 */
export default function BackgroundImport({ mapId, has, style }: { mapId: string; has: boolean; style: CSSProperties }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setBackground(mapId, await uploadImage(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The picture could not be uploaded')
    } finally {
      setBusy(false)
    }
  }

  // (its right edge is the style's `left`)
  return (
    <div style={{ ...style, transform: 'translateX(-100%)' }} className="absolute z-10 flex flex-col items-end gap-1">
      <InputBox as="label" className="cursor-pointer gap-2 whitespace-nowrap text-body opacity-70 transition-opacity duration-200 hover:opacity-100 has-[:focus-visible]:opacity-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent motion-reduce:transition-none">
        <LuImage aria-hidden className="size-4 shrink-0 text-fg-muted" />
        <span>{busy ? 'Uploading…' : has ? 'Change image' : 'Import image'}</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </InputBox>
      {error && (
        <p role="alert" className="rounded-(--corner-sm) bg-surface px-2 py-1 text-small text-danger shadow-lg">
          {error}
        </p>
      )}
    </div>
  )
}
