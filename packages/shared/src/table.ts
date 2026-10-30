import { z } from 'zod'
import { entityId, queryId } from './common'
import type { Field, ValueOf } from './fields'
import { orderFields, type OrderOutput, type OrderSpec } from './order'
import type { ItemAccess, Visibility } from './rights'

/**
 * Who may read and write a table (the backend's crudRoutes guards each one):
 * - owner:        signed in; each user sees and changes only their own rows
 * - public-owner: everyone reads; signed-in users create; owners change their own rows
 * - public-admin: everyone reads; only admins write
 * - admin:        only admins read and write
 */
export type Access = 'owner' | 'public-owner' | 'public-admin' | 'admin'

/** The equality filters a list can take: `archived` (the Trash or not) and `link` (?objectType=&objectId=, `none` = no parent) */
export type ListFilter = 'archived' | 'link'

/**
 * One table, as written in data.config.ts. Every table also gets `id`, its owner, `createdAt`, `updatedAt`, `archived` and the
 * columns of its `order` without listing them.
 */
export type TableConfig = {
  readonly access: Access
  /** List order: pinned first and/or by position, then id (order.ts) */
  readonly order: OrderSpec
  /** Its own fields, by name (camelCase; the column is the snake_case of it) */
  readonly fields: Readonly<Record<string, Field>>
  /** A rich-text field whose first words are kept in a `preview` column: lists send the preview instead of that field */
  readonly preview?: string
  /** A new row needs one of these fields not empty */
  readonly requireOneOf?: readonly string[]
  /**
 * The row can point at its parent: `objectType` (a key of `types`) + `objectId`, both set or both empty. `types` says which table each
 * type is: `{ project: 'projects' }` (the parent row is checked to exist, be the user's and not make a cycle: ownedRepo)
 */
  readonly link?: { readonly types: Readonly<Record<string, string>> }
  /** The list filters kept first in the table's index (default: archived, and link when the table has one) */
  readonly listFilters?: readonly ListFilter[]
  /** Fields a list leaves out (not even read), besides the one `preview` stands for: big and used only on the row's own page */
  readonly omitFromLists?: readonly string[]
  /** Fields of a shared table only its owner and editors get (a reader's copy of the row leaves them out) */
  readonly editorFields?: readonly string[]
  /**
   * Its rows can be shared (docs/plans/34): other people may read or edit one (object_rights), or everyone signed in may read it
   * (`visibility: 'public'`). Adds `visibility`, `version` (a save says which version it changes: 409 when another was saved since)
   * and `edited_by` to the table
   */
  readonly share?: true
}

type FieldValues<C extends TableConfig> = { -readonly [K in keyof C['fields']]: ValueOf<C['fields'][K]> }
type LinkTypes<C extends TableConfig> = C extends { link: { types: infer T } } ? keyof T & string : never
type LinkValues<C extends TableConfig> = [LinkTypes<C>] extends [never] ? unknown : { objectType: LinkTypes<C> | null; objectId: number | null }
type PreviewValue<C extends TableConfig> = C extends { preview: string } ? { preview: string } : unknown
/**
 * A shared table's row also says its version, whether the caller saved it last (`editedByMe`) and what they may do with it. `visibility` comes only to the owner; a non-owner
 * gets the row without the owner's own fields (pinned, position, parent, visibility)
 */
type ShareValues<C extends TableConfig> = C extends { share: true } ? { version: number; access: ItemAccess; visibility?: Visibility; editedByMe: boolean } : unknown

/** A whole row as the API sends it (GET /:id, and what a write answers) */
export type ItemOf<C extends TableConfig> = { id: number; archived: boolean; createdAt: string; updatedAt: string } & FieldValues<C> &
  OrderOutput<C['order']> &
  PreviewValue<C> &
  LinkValues<C> &
  ShareValues<C>

/** A row in a list: without the field the preview stands for (lists send the preview instead) */
type Omitted<C extends TableConfig> = (C extends { preview: infer P extends string } ? P : never) | (C extends { omitFromLists: readonly (infer O extends string)[] } ? O : never)
export type ListItemOf<C extends TableConfig> = [Omitted<C>] extends [never] ? ItemOf<C> : Omit<ItemOf<C>, Omitted<C>>

/** What a client may write: any of its fields (the owner, id and dates always come from the server) */
export type InputOf<C extends TableConfig> = Partial<FieldValues<C> & { archived: boolean } & OrderOutput<C['order']> & LinkValues<C>>
/** A shared table's update may say which version it changes (`baseVersion`): it is written only if that is still the latest */
export type UpdateOf<C extends TableConfig> = InputOf<C> & (C extends { share: true } ? { baseVersion?: number } : unknown)

/** A list's filters, parsed from its query string */
export type FilterOf<C extends TableConfig> = { archived: boolean } & ([LinkTypes<C>] extends [never]
  ? unknown
  : { objectType?: LinkTypes<C> | 'none'; objectId?: number })

/** A table with everything derived from its config: its names and its zod rules */
export type Table<C extends TableConfig = TableConfig> = C & {
  /** The config key, e.g. `objectCards` */
  readonly name: string
  /** The database table, e.g. `object_cards` */
  readonly tableName: string
  /** Its API route under /api, e.g. `object-cards` */
  readonly path: string
  readonly listFilters: readonly ListFilter[]
  /** POST body: partial, with requireOneOf and the link pair rule */
  readonly input: z.ZodType<InputOf<C>>
  /** PATCH body: only the fields that change */
  readonly update: z.ZodType<UpdateOf<C>>
  /** GET / query string: ?archived=true|false (default false), and for a linked table ?objectType=…|none&objectId=… */
  readonly filter: z.ZodType<FilterOf<C>>
}

/** camelCase → snake_case (`objectCards` → `object_cards`): the database names */
export const snakeCase = (name: string) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
/** camelCase → kebab-case (`objectCards` → `object-cards`): the API paths */
export const kebabCase = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const isEmpty = (value: unknown) => value === undefined || value === null || value === ''

function defineTable(name: string, config: TableConfig): Table {
  const listFilters = config.listFilters ?? (config.link ? ['archived', 'link'] : ['archived'])
  const linkTypes = config.link ? (Object.keys(config.link.types) as [string, ...string[]]) : undefined

  const shape: Record<string, z.ZodType> = {
    ...Object.fromEntries(Object.entries(config.fields).map(([key, f]) => [key, f.zod])),
    archived: z.boolean(),
    ...(orderFields(config.order) as Record<string, z.ZodType>),
    ...(linkTypes ? { objectType: z.enum(linkTypes).nullable(), objectId: entityId.nullable() } : {}),
  }
  const writable = z.object(shape).partial()
  // Both or none: a parent is a table and an id together
  const pairOk = (v: Record<string, unknown>) =>
    !linkTypes || ((v.objectType === undefined) === (v.objectId === undefined) && (v.objectType === null) === (v.objectId === null))
  const pairRule = { message: 'objectType and objectId go together', path: ['objectId'] }

  const required = config.requireOneOf ?? []
  const input = writable
    .refine((v) => required.length === 0 || required.some((key) => !isEmpty(v[key])), {
      message: `Needs ${required.join(' or ')}`,
      path: [required[0] ?? ''],
    })
    .refine(pairOk, pairRule)
  const update = (config.share ? writable.extend({ baseVersion: z.number().int().min(0).optional() }) : writable).refine(pairOk, pairRule)

  const filter = z
    .object({
      archived: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
      ...(linkTypes ? { objectType: z.enum([...linkTypes, 'none']).optional(), objectId: queryId.optional() } : {}),
    })
    // An id only means something with its table
    .refine((v) => (v as { objectId?: number }).objectId === undefined || !['none', undefined].includes((v as { objectType?: string }).objectType), {
      message: 'objectId needs an objectType',
      path: ['objectId'],
    })

  return { ...config, name, tableName: snakeCase(name), path: kebabCase(name), listFilters, input, update, filter } as unknown as Table
}

/** Every table of data.config.ts with its names and zod rules derived (the types stay those of each table's own config) */
export function defineTables<const T extends Record<string, TableConfig>>(tables: T): { readonly [K in keyof T]: Table<T[K]> } {
  return Object.fromEntries(Object.entries(tables).map(([name, config]) => [name, defineTable(name, config)])) as {
    readonly [K in keyof T]: Table<T[K]>
  }
}

/**
 * Whether an item belongs in a list of this filter: each value must be the item's (undefined: any), and `objectType: 'none'`
 * means no parent. The app's list store uses it to put a written item into the lists it holds without reading them again.
 */
export function matchesFilter(filter: object, item: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined) return true
    if (key === 'objectType' && value === 'none') return item.objectType === null || item.objectType === undefined
    return item[key] === value
  })
}
