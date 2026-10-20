// Fills the preview of notes that have content but no preview (the notes made before the preview column existed).
// New and changed notes get theirs from the notes repo, so run this once after the migration:
//
//   npm run backfill:previews -- --local     (the local database)
//   npm run backfill:previews -- --remote    (production)
//
// Extra arguments go to wrangler (e.g. --persist-to <dir> --config <file>). Safe to run again: it only touches notes whose
// preview is still empty, never changes updated_at, and leaves a note alone if it was edited while this ran.
// Needs Node 22.18 or newer (it loads the shared TypeScript file directly).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { previewOf } from '../../packages/shared/src/plain-text.ts'

const [target, ...wranglerArgs] = process.argv.slice(2)
if (target !== '--local' && target !== '--remote') {
  console.error('Usage: npm run backfill:previews -- --local|--remote [wrangler args]')
  process.exit(1)
}

const BATCH = 50 // notes per round: their contents can be large
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
    const rows = select(`SELECT id, content FROM notes WHERE id > ${lastId} AND preview = '' AND content <> '' ORDER BY id LIMIT ${BATCH}`)
    if (rows.length === 0) break
    lastId = rows.at(-1).id
    const updates = rows
      .map((row) => ({ id: row.id, preview: previewOf(row.content) }))
      .filter((row) => row.preview !== '') // only a picture, say: nothing to show
    if (updates.length === 0) continue
    const file = join(dir, 'updates.sql')
    // "AND preview = ''": a note edited meanwhile already has its own preview
    writeFileSync(file, updates.map(({ id, preview }) => `UPDATE notes SET preview = ${quote(preview)} WHERE id = ${id} AND preview = '';`).join('\n'))
    wrangler('--file', file)
    filled += updates.length
    console.log(`${filled} previews written (up to note ${lastId})`)
  }
  console.log(filled === 0 ? 'Nothing to fill.' : `Done: ${filled} previews.`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
