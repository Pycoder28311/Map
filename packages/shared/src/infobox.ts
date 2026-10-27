import { z } from 'zod'
import { isSafeImageSrc } from './rich-text-policy'

/**
 * An article's Info box: a picture, a name and rows of facts. Kept in the article's `infobox` field (data.config.ts) as JSON; the
 * article page (app/src/features/articles/InfoBox.tsx) edits it.
 *   value: "Born ……… 1820"   list: "Works 1) … 2) …"   text: a label and a description, shown as bullets or as one text
 */
const id = z.string().min(1).max(40)
const label = z.string().max(100)

export const infoRow = z.discriminatedUnion('kind', [
  z.object({ id, label, kind: z.literal('value'), value: z.string().max(200) }),
  z.object({ id, label, kind: z.literal('list'), items: z.array(z.string().max(200)).max(50) }),
  z.object({ id, label, kind: z.literal('text'), text: z.string().max(2000), bullets: z.boolean() }),
])

export const infobox = z.object({
  // Only a picture the app stored (like the pictures in rich text); any other address is dropped, not refused
  image: z
    .string()
    .max(500)
    .nullable()
    .transform((src) => (src && isSafeImageSrc(src) ? src : null)),
  name: z.string().max(200),
  rows: z.array(infoRow).max(50),
})

export type InfoRow = z.output<typeof infoRow>
export type InfoRowKind = InfoRow['kind']
export type Infobox = z.output<typeof infobox>

export const EMPTY_INFOBOX: Infobox = { image: null, name: '', rows: [] }
