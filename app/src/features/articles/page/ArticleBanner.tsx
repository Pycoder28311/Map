import { useRef, useState, type DragEvent } from 'react'
import { LuImagePlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'

/** The banner's pixels (px): its bottom edge, where the body begins, goes up and down in steps of this, and its edge line is this thick */
const PX = 4
/** How many runs (straight pieces) its bottom edge has across the banner */
const RUNS = 60
/**
 * The banner's bottom edge in pixel steps, worn as old paper's: each run 0, 1 or (now and then) 2 pixels up from the box's foot (the same
 * every time)
 */
function pixelEdge() {
  let seed = 11
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const pts = ['0 0', '100% 0']
  for (let i = RUNS - 1; i >= 0; i--) {
    const r = next()
    const d = (r < 0.12 ? 2 : r < 0.55 ? 1 : 0) * PX
    pts.push(`${((i + 1) / RUNS) * 100}% calc(100% - ${d}px)`, `${(i / RUNS) * 100}% calc(100% - ${d}px)`)
  }
  return `polygon(${pts.join(', ')})`
}
const CLIP = pixelEdge()
/** How far (px) the banner's box goes on under the body's first row, past where its place ends: the edge's middle is on that line, where the folder buttons sit */
const REACH = PX
/** Its edge line, a pixel thick, along that stepped edge (a drop shadow follows the clipped shape): the body's frame colour in the dark theme */
const EDGE = 'filter-[drop-shadow(0_4px_0_var(--color-line-strong))] dark:filter-[drop-shadow(0_4px_0_#4a3c31)]'

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
 * there; its bottom edge, where the body begins, is worn in pixel steps with an edge line along it; over it, Replace and Remove show while the pointer is on it. Without one it is a tall place to add it from (9rem; the picture itself is 11rem).
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
        <div className={EDGE} style={{ height: image ? `calc(11rem + ${REACH}px)` : `calc(3rem + ${REACH}px)` }}>
          {image ? <img src={image} alt="" style={{ clipPath: CLIP }} className="size-full object-cover" /> : <div style={{ clipPath: CLIP }} className="size-full bg-fill" />}
        </div>
      </div>
    )
  }
  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={drop} className="group/banner relative" style={{ marginBottom: -REACH }}>
      {image ? (
        <>
          <div className={EDGE} style={{ height: `calc(11rem + ${REACH}px)` }}>
            <img src={image} alt="" style={{ clipPath: CLIP }} className="size-full object-cover" />
          </div>
          <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/banner:opacity-100 group-focus-within/banner:opacity-100">
            <IconButton icon={LuImagePlus} label="Replace banner image" variant="secondary" size="sm" disabled={busy} onClick={() => picker.current?.click()} />
            <IconButton icon={LuX} label="Remove banner image" variant="secondary" size="sm" onClick={() => onChange(null)} />
          </div>
        </>
      ) : (
        <div className={EDGE} style={{ height: `calc(9rem + ${REACH}px)` }}>
          <div style={{ clipPath: CLIP }} className="size-full bg-fill">
            <Button variant="ghost" plain icon={LuImagePlus} disabled={busy} onClick={() => picker.current?.click()} className="w-full justify-center" style={{ height: `calc(100% - ${REACH}px)` }}>
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
