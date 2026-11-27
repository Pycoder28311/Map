import { useEffect, useMemo, useState } from 'react'
import { deserializeDrawing } from '../export/dataFile'
import { drawingCanvas } from '../export/png'
import { DEFAULT_ASSETS, drawingOf } from '../library/defaults'
import { LIMITS } from '../model/types'
import { addDefault, deleteAsset, duplicateAsset, newAsset, openAsset, useLibrary, type Entry } from '../store/library'
import { useStore } from '../store/store'
import { NumberField } from './fields'

/** A small picture of a drawing, each unit a whole number of pixels */
function Thumb({ drawing, alt }: { drawing: unknown; alt: string }) {
  const url = useMemo(() => {
    const d = deserializeDrawing(drawing)
    if (!d) return null
    const scale = Math.max(1, Math.floor(96 / Math.max(d.width, d.height)))
    return drawingCanvas(d, scale).toDataURL('image/png')
  }, [drawing])
  return <span className="thumb">{url ? <img src={url} alt={alt} /> : <em>?</em>}</span>
}

const ago = (time: number) => {
  const s = Math.round((Date.now() - time) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return new Date(time).toLocaleDateString()
}

function AssetCard({ entry, current, onDone }: { entry: Entry; current: boolean; onDone: () => void }) {
  return (
    <li className={`asset ${current ? 'current' : ''}`}>
      <button type="button" className="asset-open" title={current ? 'Open now' : `Open ${entry.name}`} onClick={() => (openAsset(entry.id), onDone())}>
        <Thumb drawing={entry.drawing} alt="" />
        <span className="asset-text">
          <strong>{entry.name}</strong>
          <span>
            {entry.width} × {entry.height} units · {current ? 'open' : ago(entry.updatedAt)}
          </span>
        </span>
      </button>
      <span className="asset-actions">
        <button type="button" title="Duplicate" onClick={() => (duplicateAsset(entry.id), onDone())}>
          Copy
        </button>
        <button
          type="button"
          className="danger"
          title="Delete"
          onClick={() => {
            if (confirm(`Delete “${entry.name}” from this browser? Download it first to keep it.`)) deleteAsset(entry.id)
          }}
        >
          Delete
        </button>
      </span>
    </li>
  )
}

/**
 * The asset library (kept in this browser): every saved drawing with a small picture, its size and when it changed; open, copy or delete
 * one; make a new one; add the Map app's own assets again (the article book card)
 */
export default function Assets({ onClose }: { onClose: () => void }) {
  const entries = useLibrary()
  const assetId = useStore((s) => s.assetId)
  const [w, setW] = useState(64)
  const [h, setH] = useState(64)
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="overlay" role="presentation" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Assets">
        <header className="dialog-head">
          <h2>Assets</h2>
          <span className="hint">Saved in this browser</span>
          <button type="button" className="close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <ul className="assets">
          {entries.map((e) => (
            <AssetCard key={e.id} entry={e} current={e.id === assetId} onDone={onClose} />
          ))}
        </ul>
        <div className="dialog-foot">
          <div className="row">
            <NumberField label="Width" value={w} min={LIMITS.boardMin} max={LIMITS.boardMax} suffix="units" onChange={setW} />
            <NumberField label="Height" value={h} min={LIMITS.boardMin} max={LIMITS.boardMax} suffix="units" onChange={setH} />
            <button type="button" className="primary" onClick={() => (newAsset(w, h), onClose())}>
              New asset
            </button>
          </div>
          <div className="defaults">
            <span className="hint">From the Map app:</span>
            {DEFAULT_ASSETS.map((a) => (
              <button key={a.key} type="button" title={`Add a new copy of the ${a.name}`} onClick={() => (addDefault(a), onClose())}>
                <DefaultThumb asset={a} />
                {a.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A default asset's picture */
function DefaultThumb({ asset }: { asset: (typeof DEFAULT_ASSETS)[number] }) {
  const url = useMemo(() => {
    const d = drawingOf(asset)
    return drawingCanvas(d, Math.max(1, Math.floor(40 / Math.max(d.width, d.height)))).toDataURL('image/png')
  }, [asset])
  return <img className="default-thumb" src={url} alt="" />
}
