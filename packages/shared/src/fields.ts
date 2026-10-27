import { z } from 'zod'
import { richText as richTextSchema } from './rich-text'

/**
 * The kinds of field a table can have. Each kind is one column type in the database (backend/src/lib/ownedTable.ts), one zod
 * rule here, and one widget in the app's form (FieldRenderer): change a field's kind in data.config.ts and all three follow.
 */
export type FieldKind = 'text' | 'plainText' | 'richText' | 'int' | 'bool' | 'json'

/** One field of a table: its kind, the zod rule a client's value must pass, and the value a new row gets */
export type Field<K extends FieldKind = FieldKind, V = unknown> = {
  readonly kind: K
  readonly zod: z.ZodType<V>
  readonly default: V
  /** Most characters (text kinds) */
  readonly max?: number
}

/** The value type of a field */
export type ValueOf<F> = F extends Field<FieldKind, infer V> ? V : never

/**
 * The field kinds, used in data.config.ts:
 *   title: field.text(200)               one line, trimmed
 *   kind: field.text(16, { pattern: /^(a|b)$/, default: 'a' })   only text of this shape (and the value a new row gets)
 *   description: field.plainText(2000)   several lines, no formatting
 *   content: field.richText()            HTML from the editor, cleaned (rich-text.ts); can have a `preview`
 *   rating: field.int({ min: 0, max: 5, default: 3 })
 *   done: field.bool()
 *   infobox: field.json(infobox, EMPTY_INFOBOX)   a value of this zod shape, kept as JSON text; no form widget (its page edits it)
 */
export const field = {
  text: (max: number, { pattern, default: start = '' }: { pattern?: RegExp; default?: string } = {}): Field<'text', string> => ({
    kind: 'text',
    zod: pattern ? z.string().trim().max(max).regex(pattern) : z.string().trim().max(max),
    default: start,
    max,
  }),
  plainText: (max: number): Field<'plainText', string> => ({ kind: 'plainText', zod: z.string().max(max), default: '', max }),
  richText: (): Field<'richText', string> => ({ kind: 'richText', zod: richTextSchema, default: '' }),
  int: ({ min = 0, max = Number.MAX_SAFE_INTEGER, default: start = Math.max(0, min) }: { min?: number; max?: number; default?: number } = {}): Field<'int', number> => ({
    kind: 'int',
    zod: z.number().int().min(min).max(max),
    default: start,
  }),
  bool: (): Field<'bool', boolean> => ({ kind: 'bool', zod: z.boolean(), default: false }),
  json: <T>(schema: z.ZodType<T>, start: T): Field<'json', T> => ({ kind: 'json', zod: schema, default: start }),
}
