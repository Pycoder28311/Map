import { useRef, useState } from 'react'
import { dataFile, fileBase, readDataFile, TooManyColours } from '../export/dataFile'
import { download, pngBlob } from '../export/png'
import { newDrawing, resizeBoard, type Anchor } from '../model/normalize'
import { LIMITS, PAINT_ID } from '../model/types'
import { commit, getState, redo, replaceDrawing, select, setDrawingProps, setNotice, setSettings, undo, useStore } from '../store/store'
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

/** Download: both files (the PNG and the data file to send), or one; the PNG's scale */
function DownloadMenu({ onClose }: { onClose: () => void }) {
  const d = useStore((s) => s.drawing)
  const [busy, setBusy] = useState(false)
  const run = async (png: boolean, data: boolean) => {
    setBusy(true)
    try {
      const base = fileBase(d.name)
      // The data file first: it says if there are too many colours
      if (data) download(new Blob([JSON.stringify(dataFile(d), null, 2)], { type: 'application/json' }), `${base}.pixel.json`)
      if (png) download(await pngBlob(d), `${base}.png`)
      setNotice(null)
      onClose()
    } catch (e) {
      setNotice(e instanceof TooManyColours ? e.message : 'The download failed. Try again.')
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
      </div>
    </div>
  )
}

/** Across the top: the name, New, Open, Undo, Redo, the board's size and background, the grid, Download */
export default function TopBar() {
  const d = useStore((s) => s.drawing)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const grid = useStore((s) => s.settings.grid)
  const [open, setOpen] = useState<'size' | 'download' | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const openFile = async (f: File | undefined) => {
    if (!f) return
    const drawing = readDataFile(await f.text())
    if (!drawing) return setNotice(`${f.name} is not a Pixel Board data file.`)
    replaceDrawing(drawing)
    setNotice(null)
  }

  return (
    <header className="topbar">
      <strong className="brand">Pixel Board</strong>
      <button
        type="button"
        onClick={() => {
          if (confirm('Start a new drawing? The current one is replaced (download it first to keep it).')) replaceDrawing(newDrawing(d.width, d.height))
        }}
      >
        New
      </button>
      <button type="button" onClick={() => file.current?.click()}>
        Open
      </button>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => void openFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      <button type="button" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={undo}>
        Undo
      </button>
      <button type="button" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" onClick={redo}>
        Redo
      </button>
      <span className="sep" />
      <label className="name">
        <span>Name</span>
        <input key={d.name} defaultValue={d.name} onBlur={(e) => e.target.value !== d.name && setDrawingProps({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      </label>
      <div className="anchor-wrap">
        <button type="button" aria-expanded={open === 'size'} onClick={() => setOpen(open === 'size' ? null : 'size')}>
          {d.width} × {d.height} units
        </button>
        {open === 'size' && <BoardSize onClose={() => setOpen(null)} />}
      </div>
      <Toggle label="Background" checked={d.background !== null} onChange={(on) => setDrawingProps({ background: on ? '#1c1c1f' : null })} />
      {d.background !== null && <ColorField label="" value={d.background} onChange={(background) => setDrawingProps({ background })} />}
      <Toggle label="Grid" checked={grid} onChange={(g) => setSettings({ grid: g })} />
      <button type="button" title="Select the paint layer (to move it in the order)" onClick={() => select(PAINT_ID)}>
        Paint layer
      </button>
      <span className="grow" />
      <div className="anchor-wrap">
        <button type="button" className="primary" aria-expanded={open === 'download'} onClick={() => setOpen(open === 'download' ? null : 'download')}>
          Download ▾
        </button>
        {open === 'download' && <DownloadMenu onClose={() => setOpen(null)} />}
      </div>
    </header>
  )
}
