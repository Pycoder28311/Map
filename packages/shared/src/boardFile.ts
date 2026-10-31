// A map's board file (docs/plans/38): everything drawn on a map, one brotli file in R2 per map, read and written through the maps
// routes (GET / PUT /api/maps/:id/file). The bytes are the app's board codec's; the server keeps them as they are.

/** The largest file a save may send */
export const BOARD_FILE_MAX = 4 * 1024 * 1024

/** The response header with the file's version (GET), and the request header a save says which version it replaces with (PUT) */
export const FILE_VERSION_HEADER = 'X-File-Version'

/** What a save answers: the new version */
export type MapFileSaved = { version: number; savedAt: string }
