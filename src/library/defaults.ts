// The assets the library starts with (and that can be added again from it): the Map app's own pixel art, unit for unit.
import { fromRows } from '../export/dataFile'
import { normalizeDrawing } from '../model/normalize'
import { PAINT_ID, type Drawing } from '../model/types'
import { ARTICLE_BOOK } from './articleBook'

export type DefaultAsset = { key: string; name: string; width: number; height: number; palette: Record<string, string>; rows: string[] }

export const DEFAULT_ASSETS: DefaultAsset[] = [{ key: 'article-book', ...ARTICLE_BOOK }]

/** A default asset as a drawing: its pixels on the paint layer */
export const drawingOf = (asset: DefaultAsset): Drawing =>
  normalizeDrawing({
    version: 1,
    name: asset.name,
    width: asset.width,
    height: asset.height,
    exportScale: 4,
    background: null,
    items: [{ kind: 'paint', id: PAINT_ID, cells: fromRows(asset.rows, asset.palette, asset.width, asset.height) }],
  })
