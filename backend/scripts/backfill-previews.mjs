// Fills the preview of rows that have text but no preview (rows made before their table had a preview column).
// New and changed rows get theirs from ownedRepo, so run this once after a migration that adds a `preview`:
//
//   npm run backfill:previews -- --local     (the local database, the notes)
//   npm run backfill:previews -- --remote    (production)
//   npm run backfill:previews -- --remote --table articles --column content
//
// --table / --column: the table and the field its preview stands for (data.config.ts `preview`; default: notes, content).
// Extra arguments go to wrangler (e.g. --persist-to <dir> --config <file>). Safe to run again: it only touches rows whose
// preview is still empty, never changes updated_at, and leaves a row alone if it was edited while this ran.
// Needs Node 22.18 or newer (it loads the shared TypeScript file directly).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { previewOf } from '../../packages/shared/src/plain-text.ts'

const [target, ...rest] = process.argv.slice(2)
// Our own options out, the rest goes to wrangler
const option = (name, fallback) => {
  const at = rest.indexOf(name)
  if (at === -1) return fallback
  const [value] = rest.splice(at, 2).slice(1)
  return value
}
const table = option('--table', 'notes')
const column = option('--column', 'content')
const wranglerArgs = rest
if (!/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) {
  console.error('--table and --column take a database name (lower case, e.g. object_cards)')
  process.exit(1)
}
if (target !== '--local' && target !== '--remote') {
  console.error('Usage: npm run backfill:previews -- --local|--remote [--table t --column c] [wrangler args]')
  process.exit(1)
}

const BATCH = 50 // rows per round: their texts can be large
const wrangler = (...args) =>
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'map-db', target, ...wranglerArgs, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

/** The rows of a SELECT, from wrangler's --json output */
const select = (sql) => {
  const out = wrangler('--json', '--command', sql)
  return JSON.parse(out.slice(out.indexOf('[')))[0].results
}

const quote = (text) => `'${text.replaceAll("'", "''")}'`
const dir = mkdtempSync(join(tmpdir(), 'previews-'))
let lastId = 0
let filled = 0
try {
  for (;;) {
    const rows = select(`SELECT id, ${column} AS text FROM ${table} WHERE id > ${lastId} AND preview = '' AND ${column} <> '' ORDER BY id LIMIT ${BATCH}`)
    if (rows.length === 0) break
    lastId = rows.at(-1).id
    const updates = rows
      .map((row) => ({ id: row.id, preview: previewOf(row.text) }))
      .filter((row) => row.preview !== '') // only a picture, say: nothing to show
    if (updates.length === 0) continue
    const file = join(dir, 'updates.sql')
    // "AND preview = ''": a row edited meanwhile already has its own preview
    writeFileSync(file, updates.map(({ id, preview }) => `UPDATE ${table} SET preview = ${quote(preview)} WHERE id = ${id} AND preview = '';`).join('\n'))
    wrangler('--file', file)
    filled += updates.length
    console.log(`${filled} previews written (up to ${table} ${lastId})`)
  }
  console.log(filled === 0 ? 'Nothing to fill.' : `Done: ${filled} previews.`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
