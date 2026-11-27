import { useRef, useState } from 'react'
import { dataFile, fileBase, readDataFile, TooManyColours } from '../export/dataFile'
import { download, pngBlob } from '../export/png'
import { resizeBoard, type Anchor } from '../model/normalize'
import { LIMITS, PAINT_ID } from '../model/types'
import { addAsset, newAsset } from '../store/library'
import { commit, getState, redo, select, setDrawingProps, setNotice, setSettings, setSheet, undo, useStore } from '../store/store'
import { useNarrow } from '../useNarrow'
import Assets from './Assets'
import { ColorField, NumberField, Toggle } from './fields'

const ANCHORS: Anchor[] = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right']

/** The board's size: width and height in units, and which side stays when it grows or shrinks */
function BoardSize({ onClose }: { onClose: () => void }) {
  const d = useStore((s) => s.drawing)
  const [w, setW] = useState(d.width)
  const [h, setH] = useState(d.height)
  const [anchor, setAnchor] = useState<Anchor>('center')
  return (
    <div className="popover">
      <div className="row">
        <NumberField label="Width" value={w} min={LIMITS.boardMin} max={LIMITS.boardMax} suffix="units" onChange={setW} />
        <NumberField label="Height" value={h} min={LIMITS.boardMin} max={LIMITS.boardMax} suffix="units" onChange={setH} />
      </div>
      <div className="field">
        <span>Keep in place</span>
        <div className="anchors" role="radiogroup" aria-label="Keep in place">
          {ANCHORS.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={anchor === a} title={a} className={anchor === a ? 'on' : ''} onClick={() => setAnchor(a)} />
          ))}
        </div>
      </div>
      <div className="actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            commit(resizeBoard(getState().drawing, w, h, anchor))
            onClose()
          }}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

/** The two files of a drawing (the data file first: it says if there are too many colours) */
async function filesOf(png: boolean, data: boolean): Promise<File[]> {
  const d = getState().drawing
  const base = fileBase(d.name)
  const files: File[] = []
  if (data) files.push(new File([JSON.stringify(dataFile(d), null, 2)], `${base}.pixel.json`, { type: 'application/json' }))
  if (png) files.push(new File([await pngBlob(d)], `${base}.png`, { type: 'image/png' }))
  return files
}

/** Phones: the system's share sheet can take files (to send them on from there) */
const canShareFiles = () => {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File(['x'], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/** Download: both files (the PNG and the data file to send), or one; the PNG's scale; on phones also Share */
function DownloadMenu({ onClose }: { onClose: () => void }) {
  const d = useStore((s) => s.drawing)
  const [busy, setBusy] = useState(false)
  const run = async (png: boolean, data: boolean, share = false) => {
    setBusy(true)
    try {
      const files = await filesOf(png, data)
      if (share) await navigator.share({ files, title: d.name })
      else for (const f of files) download(f, f.name)
      setNotice(null)
      onClose()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // the share sheet was closed
      setNotice(e instanceof TooManyColours ? e.message : share ? 'Sharing failed: use Download instead.' : 'The download failed. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="popover end">
      <NumberField label="PNG scale" value={d.exportScale} min={LIMITS.scaleMin} max={LIMITS.scaleMax} suffix="px per unit" onChange={(exportScale) => setDrawingProps({ exportScale })} />
      <p className="hint">
        PNG: {d.width * d.exportScale} × {d.height * d.exportScale} px. Send the <code>.pixel.json</code> to Claude (and the PNG to look at).
      </p>
      <div className="actions column">
        <button type="button" className="primary" disabled={busy} onClick={() => void run(true, true)}>
          PNG + data file
        </button>
        <button type="button" disabled={busy} onClick={() => void run(true, false)}>
          PNG only
        </button>
        <button type="button" disabled={busy} onClick={() => void run(false, true)}>
          Data file only
        </button>
        {canShareFiles() && (
          <button type="button" disabled={busy} onClick={() => void run(true, true, true)}>
            Share both…
          </button>
        )}
      </div>
    </div>
  )
}

/** The drawing's own settings: name, board size, background, grid, the paint layer; inline on wide screens, in the ⋯ menu on phones */
function DrawingControls({ stacked, onSize }: { stacked: boolean; onSize: () => void }) {
  const d = useStore((s) => s.drawing)
  const grid = useStore((s) => s.settings.grid)
  return (
    <>
      <label className="name">
        <span>Name</span>
        <input key={d.name} defaultValue={d.name} onBlur={(e) => e.target.value !== d.name && setDrawingProps({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      </label>
      <button type="button" onClick={onSize} title="The board's size">
        {d.width} × {d.height} units
      </button>
      <span className={stacked ? 'row' : 'inline'}>
        <Toggle label="Background" checked={d.background !== null} onChange={(on) => setDrawingProps({ background: on ? '#1c1c1f' : null })} />
        {d.background !== null && <ColorField label="" value={d.background} onChange={(background) => setDrawingProps({ background })} />}
      </span>
      <Toggle label="Grid" checked={grid} onChange={(g) => setSettings({ grid: g })} />
      <button
        type="button"
        title="Select the paint layer (to move it in the order)"
        onClick={() => {
          select(PAINT_ID)
          setSheet('selection')
        }}
      >
        Paint layer
      </button>
    </>
  )
}

/** Across the top: Assets, New, Open, Undo, Redo, the drawing's settings, Download. On phones the drawing's settings fold into ⋯ */
export default function TopBar() {
  const narrow = useNarrow()
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const d = useStore((s) => s.drawing)
  const [open, setOpen] = useState<'size' | 'download' | 'more' | 'assets' | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const toggle = (which: typeof open) => setOpen(open === which ? null : which)

  // A data file opened becomes a new asset of the library
  const openFile = async (f: File | undefined) => {
    if (!f) return
    const drawing = readDataFile(await f.text())
    if (!drawing) return setNotice(`${f.name} is not a Pixel Board data file.`)
    addAsset(drawing)
    setNotice(null)
  }

  const fileActions = (
    <>
      <button type="button" title="A new empty asset of this size" onClick={() => (newAsset(d.width, d.height), setOpen(null))}>
        New
      </button>
      <button type="button" title="Open a .pixel.json as a new asset" onClick={() => (file.current?.click(), setOpen(null))}>
        Open
      </button>
    </>
  )

  return (
    <header className="topbar">
      <strong className="brand">{narrow ? 'Pixel' : 'Pixel Board'}</strong>
      <button type="button" className="assets-button" aria-expanded={open === 'assets'} onClick={() => toggle('assets')}>
        Assets
      </button>
      {!narrow && fileActions}
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => void openFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      <button type="button" className="icon" disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo" onClick={undo}>
        ↶
      </button>
      <button type="button" className="icon" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={redo}>
        ↷
      </button>
      {!narrow && (
        <>
          <span className="sep" />
          <span className="anchor-wrap inline">
            <DrawingControls stacked={false} onSize={() => toggle('size')} />
            {open === 'size' && <BoardSize onClose={() => setOpen(null)} />}
          </span>
        </>
      )}
      <span className="grow" />
      {narrow && (
        <div className="anchor-wrap">
          <button type="button" className="icon" aria-label="More" aria-expanded={open === 'more' || open === 'size'} onClick={() => toggle('more')}>
            ⋯
          </button>
          {open === 'more' && (
            <div className="popover end stacked">
              <div className="actions">{fileActions}</div>
              <DrawingControls stacked onSize={() => setOpen('size')} />
            </div>
          )}
          {open === 'size' && (
            <div className="popover-end-wrap">
              <BoardSize onClose={() => setOpen(null)} />
            </div>
          )}
        </div>
      )}
      <div className="anchor-wrap">
        <button type="button" className="primary" aria-expanded={open === 'download'} onClick={() => toggle('download')}>
          {narrow ? 'Save ▾' : 'Download ▾'}
        </button>
        {open === 'download' && <DownloadMenu onClose={() => setOpen(null)} />}
      </div>
      {open === 'assets' && <Assets onClose={() => setOpen(null)} />}
    </header>
  )
}
