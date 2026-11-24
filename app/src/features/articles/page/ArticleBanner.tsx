import { useRef, useState, type DragEvent } from 'react'
import { LuImagePlus, LuX } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import IconButton from '../../../components/ui/buttons/IconButton'

/** The banner's pixels (px): at its foot, where the body begins, it breaks up into pixels of this size */
const PX = 4
/** How tall that band is, in pixels: the picture thins out over it, more of its pixels gone the further down, none left at its foot */
const ROWS = 9
/** How wide the band's pattern is before it repeats across the banner, in pixels */
const COLS = 80
/**
 * The band at the banner's foot as a mask: a grid of pixels, each kept or not, fewer kept row by row going down (a random pattern, the same every
 * time, so the picture crumbles into the body rather than ending at a line)
 */
function pixelFade() {
  let seed = 11
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const rects: string[] = []
  for (let y = 0; y < ROWS; y++) {
    const keep = 1 - (y + 0.5) / ROWS
    for (let x = 0; x < COLS; x++) if (next() < keep) rects.push(`<rect x='${x}' y='${y}' width='1' height='1'/>`)
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${COLS}' height='${ROWS}' shape-rendering='crispEdges'>${rects.join('')}</svg>`
  const band = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  const height = ROWS * PX
  // solid down to the band, then the band repeated across
  return {
    maskImage: `linear-gradient(#000, #000), ${band}`,
    maskSize: `100% calc(100% - ${height}px), ${COLS * PX}px ${height}px`,
    maskPosition: 'top, bottom left',
    maskRepeat: 'no-repeat, repeat-x',
    WebkitMaskImage: `linear-gradient(#000, #000), ${band}`,
    WebkitMaskSize: `100% calc(100% - ${height}px), ${COLS * PX}px ${height}px`,
    WebkitMaskPosition: 'top, bottom left',
    WebkitMaskRepeat: 'no-repeat, repeat-x',
  } as const
}
const FADE = pixelFade()
/** How far (px) the banner's box goes on under the body's first row, past where its place ends: about the middle of the band is on that line */
const REACH = (ROWS * PX) / 2

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
 * there; at its foot, where the body begins, it breaks up into pixels, fewer and fewer going down; over it, Replace and Remove show while the pointer is on it. Without one it is a tall place to add it from (9rem; the picture itself is 11rem).
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
        <div style={{ height: image ? `calc(11rem + ${REACH}px)` : `calc(3rem + ${REACH}px)` }}>
          {image ? <img src={image} alt="" style={FADE} className="size-full object-cover" /> : <div style={FADE} className="size-full bg-fill" />}
        </div>
      </div>
    )
  }
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={drop}
      // Add banner image's words muted gold, brighter when hovered (dark theme), as the title's ribbon
      className="group/banner relative dark:[&_button]:[--btn-text:#b8975a] dark:[&_button]:[--btn-hover-text:#d9b56a]" style={{ marginBottom: -REACH }}>
      {image ? (
        <>
          <div style={{ height: `calc(11rem + ${REACH}px)` }}>
            <img src={image} alt="" style={FADE} className="size-full object-cover" />
          </div>
          <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/banner:opacity-100 group-focus-within/banner:opacity-100">
            <IconButton icon={LuImagePlus} label="Replace banner image" variant="secondary" size="sm" disabled={busy} onClick={() => picker.current?.click()} />
            <IconButton icon={LuX} label="Remove banner image" variant="secondary" size="sm" onClick={() => onChange(null)} />
          </div>
        </>
      ) : (
        <div style={{ height: `calc(9rem + ${REACH}px)` }}>
          <div style={FADE} className="size-full bg-fill">
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
