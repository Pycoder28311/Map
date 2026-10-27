import { z } from 'zod'
import { isSafeImageSrc, isSafeLink } from './rich-text-policy'

/**
 * An article's Info box: a picture, a name and rows of facts, like an encyclopedia's. Kept in the article's `infobox` field
 * (data.config.ts) as JSON; the article page (app/src/features/articles/InfoBox.tsx) edits it. The kinds of row:
 *   value: "Born ……… 1820"   date: a label and a day   period: a label and from – to
 *   link: a label, its words and an address   list: a numbered or bulleted list   text: a label and a description (as bullets, ticked)
 *   image: a picture with its caption (the label)   coordinates: a label and a latitude and longitude
 */
const id = z.string().min(1).max(40)
const label = z.string().max(100)
/** A day (2024-03-05), or none yet */
const day = z.string().regex(/^(?:\d{4}-\d{2}-\d{2})?$/)
/** A degree, as typed (-12.5), or none yet */
const degree = z.string().regex(/^(?:-?\d{1,3}(?:\.\d{1,8})?)?$/)
/** Where a link goes: none yet, or http, https or mailto */
const address = z
  .string()
  .max(500)
  .refine((url) => url === '' || (isSafeLink(url) && /^(?:https?|mailto):/i.test(url.trim())), 'Only http, https or mailto')
/** Only a picture the app stored (like the pictures in rich text); any other address is dropped, not refused */
const picture = z
  .string()
  .max(500)
  .nullable()
  .transform((src) => (src && isSafeImageSrc(src) ? src : null))

export const infoRow = z.discriminatedUnion('kind', [
  z.object({ id, label, kind: z.literal('value'), value: z.string().max(200) }),
  z.object({ id, label, kind: z.literal('date'), value: day }),
  z.object({ id, label, kind: z.literal('period'), from: day, to: day }),
  z.object({ id, label, kind: z.literal('link'), text: z.string().max(200), url: address }),
  z.object({
    id,
    label,
    kind: z.literal('list'),
    items: z.array(z.string().max(200)).max(50),
    // A list saved before bulleted lists existed has no `ordered`: it was numbered
    ordered: z.boolean().default(true),
  }),
  z.object({ id, label, kind: z.literal('text'), text: z.string().max(2000), bullets: z.boolean() }),
  z.object({ id, label, kind: z.literal('image'), image: picture }),
  z.object({ id, label, kind: z.literal('coordinates'), lat: degree, lng: degree }),
])

export const infobox = z.object({
  image: picture,
  name: z.string().max(200),
  rows: z.array(infoRow).max(50),
})

export type InfoRow = z.output<typeof infoRow>
export type InfoRowKind = InfoRow['kind']
export type Infobox = z.output<typeof infobox>

export const EMPTY_INFOBOX: Infobox = { image: null, name: '', rows: [] }
