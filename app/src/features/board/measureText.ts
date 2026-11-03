// Measuring text for the layout: the app's measurer (lib/measureText.ts).
import { measureText } from '../../lib/measureText'
import { layoutOf, type Layout, type Measure } from './textLayout'
import type { TextObject } from './types'

/** The width of `text` in `font` (lib/measureText.ts) */
export const measure: Measure = measureText

/** The layout of a text object as the canvas will paint it */
export const layoutOfText = (o: TextObject): Layout => layoutOf(o, measure)
