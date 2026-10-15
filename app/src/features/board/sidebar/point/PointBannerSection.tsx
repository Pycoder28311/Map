import { useRef, useState } from 'react'
import { LuImagePlus, LuRefreshCw, LuTrash2 } from 'react-icons/lu'
import ErrorText from '../../../../components/ui/fields/ErrorText'
import IconButton from '../../../../components/ui/buttons/IconButton'
import { downscaleImage } from '../../../../lib/downscaleImage'
import { putImage, useImageUrl } from '../../../../mocks/imageStore'

/** The full-width picture on top of a point's modal: add, replace (hover) and remove */
export default function PointBannerSection({ banner, onChange }: { banner: string | undefined; onChange: (banner: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const url = useImageUrl(banner)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      onChange(putImage(await downscaleImage(file)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The picture could not be read')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      {url ? (
        <div className="group relative aspect-[16/7] overflow-hidden rounded-(--card-radius) bg-fill">
          <img src={url} alt="" className="size-full object-cover" />
          <div className="absolute end-2 top-2 flex gap-1 rounded-(--card-radius) bg-surface/90 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <IconButton icon={LuRefreshCw} label="Replace banner" onClick={() => input.current?.click()} />
            <IconButton icon={LuTrash2} label="Remove banner" onClick={() => onChange(undefined)} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex aspect-[16/7] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-(--card-radius) border border-dashed border-line-strong text-small text-fg-muted hover:bg-fill"
        >
          <LuImagePlus className="size-5" />
          Add banner image
        </button>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
