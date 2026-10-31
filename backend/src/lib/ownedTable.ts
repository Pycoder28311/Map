import type { Table } from '@map/shared'
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, type SQLiteColumnBuilderBase, type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'
import { user } from '../db/auth-schema'
import { snakeCase } from '@map/shared'
import { listIndex, orderColumns } from './sort'

// Same columns in every table, written once
export const id = () => integer('id').primaryKey({ autoIncrement: true })
export const createdAt = () => integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
// Whole seconds since 1970 (not milliseconds); refreshed by Drizzle on every update it runs
export const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date())
export const owner = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })

/** A table made by ownedTable: its columns are known by name only (the config says which) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OwnedTable = SQLiteTableWithColumns<any>

/** One field's column, by its kind (fields.ts): the text kinds are text, int is integer, bool is integer 0/1, json is text (Drizzle reads and writes the JSON) */
function columnOf(name: string, kind: string, fallback: unknown): SQLiteColumnBuilderBase {
  const column = snakeCase(name)
  switch (kind) {
    case 'int':
      return integer(column).notNull().default(fallback as number)
    case 'bool':
      return integer(column, { mode: 'boolean' }).notNull().default(fallback as boolean)
    case 'json':
      return text(column, { mode: 'json' }).notNull().default(fallback)
    default:
      return text(column).notNull().default(fallback as string)
  }
}

/**
 * The columns of a shared table (`share: true`, docs/plans/34). Only added columns, so its migration is ALTER TABLE … ADD (no table
 * rebuild): `visibility` is checked by zod, not a CHECK, and `edited_by` has no foreign key (it only names who saved, on a conflict)
 */
const shareColumns = () => ({
  visibility: text('visibility').notNull().default('private'),
  // +1 with every change of one of the config's fields (not pin, position, parent, archive, visibility): what a save says it changes
  version: integer('version').notNull().default(0),
  editedBy: text('edited_by'),
})

/**
 * What a row is attached to (`attach`, docs/plans/38): nullable and with no CHECK (zod checks them), so adding them is ALTER TABLE …
 * ADD (no table rebuild); no foreign key either, since they point at several tables: deleting the thing leaves the row as it is
 */
const attachColumns = () => ({
  attachedType: text('attached_type'),
  attachedId: integer('attached_id'),
  attachedNode: integer('attached_node'),
})

/**
 * A user-owned table from its config (shared/src/data.config.ts), in this column order: id, the owner, the config's fields,
 * `preview` (when the config has one: the first words of that rich-text field, written with it by ownedRepo), the parent pair
 * `object_type`/`object_id` (when it has a `link`; both set or both empty), `attached_type`/`attached_id`/`attached_node` (when it
 * has an `attach`), `extra` (the backend's own columns, which no client writes: a map's file), the dates, `archived`,
 * `visibility`/`version`/`edited_by` (when it has `share`), then the order columns. Its list index: the owner, the list filters, then
 * the list order (lib/sort.ts), so a filtered list reads only its own rows. An attachable table also has an index of its attached
 * rows only (the others are not in it)
 */
export function ownedTable(config: Table, extra: Record<string, SQLiteColumnBuilderBase> = {}): OwnedTable {
  const columns: Record<string, SQLiteColumnBuilderBase> = {
    id: id(),
    userId: owner(),
    ...Object.fromEntries(Object.entries(config.fields).map(([name, f]) => [name, columnOf(name, f.kind, f.default)])),
    ...(config.preview ? { preview: text('preview').notNull().default('') } : {}),
    ...(config.link ? { objectType: text('object_type'), objectId: integer('object_id') } : {}),
    ...(config.attach ? attachColumns() : {}),
    ...extra,
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    ...(config.share ? shareColumns() : {}),
    ...(orderColumns(config.order) as Record<string, SQLiteColumnBuilderBase>),
  }
  const filters = config.listFilters.flatMap((f) => (f === 'link' ? ['objectType', 'objectId'] : [f]))
  return sqliteTable(config.tableName, columns, (t) => [
    listIndex(`${config.tableName}_list_idx`, t as never, { owner: 'userId', filters: filters as never, order: config.order }),
    ...(config.link ? [check(`${config.tableName}_object_pair`, sql`(${t.objectType} IS NULL) = (${t.objectId} IS NULL)`)] : []),
    ...(config.attach
      ? [
          index(`${config.tableName}_attached_idx`)
            .on(t.userId as never, t.attachedType as never, t.attachedId as never, t.attachedNode as never)
            .where(sql`${t.attachedType} IS NOT NULL`),
        ]
      : []),
  ]) as OwnedTable
}
