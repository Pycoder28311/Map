import { useRef, useState, type DragEvent } from 'react'
import { LuImagePlus, LuX } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import { crackedPolygons } from '../dashboard/cards/crack'

/** How far (px) the crack wanders up and down along the banner's bottom edge, in all */
const CRACK_DEPTH = 5
/** How many straight pieces the crack has across the banner */
const CRACK_PIECES = 80
/** The banner's cracked bottom edge: the line the body begins at (the same every time) */
const CLIP = crackedPolygons('article-banner', CRACK_DEPTH, 0, CRACK_PIECES).top
/**
 * How far (px) the banner's box goes on under the body's first row, past where its place ends: the crack's middle line is on the edge, where the
 * folder buttons sit, and it wanders half of CRACK_DEPTH either way
 */
const REACH = CRACK_DEPTH

type Props = {
  /** The banner's address, or none */
  image: string | null
  onChange: (image: string | null) => void
  /** Stores a picture and answers its address */
  onUploadImage: (file: File) => Promise<string>
  onUploadError: (error: unknown) => void
  /** Only shown (a reader's page): no Add, Replace or Remove */
  readOnly?: boolean
}

/**
 * The picture across the top of an article's page, as wide as the box it is in: click Add banner image (or drop a picture on it) to put one
 * there; its bottom edge is a crack, as the image cards' (crack.ts), where the body begins; over it, Replace and Remove show while the pointer is on it. Without one it is a tall place to add it from (9rem; the picture itself is 11rem).
 */
export default function ArticleBanner({ image, onChange, onUploadImage, onUploadError, readOnly = false }: Props) {
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await onUploadImage(file))
    } catch (error) {
      onUploadError(error)
    } finally {
      setBusy(false)
    }
  }
  const drop = (e: DragEvent) => {
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    void upload(file)
  }
  if (readOnly) {
    return (
      <div className="relative" style={{ marginBottom: -REACH }}>
        <div className="ui-crack" style={{ height: image ? `calc(11rem + ${REACH}px)` : `calc(3rem + ${REACH}px)` }}>
          {image ? <img src={image} alt="" style={{ clipPath: CLIP }} className="size-full object-cover" /> : <div style={{ clipPath: CLIP }} className="size-full bg-fill" />}
        </div>
      </div>
    )
  }
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={drop} className="group/banner relative" style={{ marginBottom: -REACH }}>
      {image ? (
        <>
          <div className="ui-crack" style={{ height: `calc(11rem + ${REACH}px)` }}>
            <img src={image} alt="" style={{ clipPath: CLIP }} className="size-full object-cover" />
          </div>
          <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/banner:opacity-100 group-focus-within/banner:opacity-100">
            <IconButton icon={LuImagePlus} label="Replace banner image" variant="secondary" size="sm" disabled={busy} onClick={() => picker.current?.click()} />
            <IconButton icon={LuX} label="Remove banner image" variant="secondary" size="sm" onClick={() => onChange(null)} />
          </div>
        </>
      ) : (
        <div className="ui-crack" style={{ height: `calc(9rem + ${REACH}px)` }}>
          <div style={{ clipPath: CLIP }} className="size-full bg-fill">
            <Button variant="ghost" icon={LuImagePlus} disabled={busy} onClick={() => picker.current?.click()} className="w-full justify-center" style={{ height: `calc(100% - ${REACH}px)` }}>
              {busy ? 'Uploading…' : 'Add banner image'}
            </Button>
          </div>
        </div>
      )}
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
