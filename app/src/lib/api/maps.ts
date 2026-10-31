import { FILE_VERSION_HEADER, type MapFileSaved } from '@map/shared'
import { request } from './client'

/** A map's file as the server keeps it (docs/plans/38): its bytes (null: never saved, an empty board) and its version */
export async function getMapFile(id: number | string): Promise<{ file: Blob | null; version: number }> {
  const res = await request<Response>(`/api/maps/${encodeURIComponent(String(id))}/file`, { raw: true, headers: { Accept: 'application/octet-stream' } })
  const version = Number(res.headers.get(FILE_VERSION_HEADER) ?? 0)
  return { file: res.status === 204 ? null : await res.blob(), version }
}

/** Saves a map's file over version `baseVersion` (409 CONFLICT, with the newer version in `details`, when another was saved since) */
export const saveMapFile = (id: number | string, file: Blob, baseVersion: number) =>
  request<MapFileSaved>(`/api/maps/${encodeURIComponent(String(id))}/file?baseVersion=${baseVersion}`, { method: 'PUT', body: file })

/** A branch of a map with this file (the board the user has open): the new map, and the source when it became its group's root */
export function branchMap<T>(id: number | string, title: string, file: Blob) {
  const body = new FormData()
  body.append('title', title)
  body.append('file', new File([file], 'board.bin', { type: 'application/octet-stream' }))
  return request<{ map: T; root: T | null }>(`/api/maps/${encodeURIComponent(String(id))}/branches`, { method: 'POST', body })
}

/** Duplicate: map `to` gets a copy of map `from`'s file (nothing when `from` was never saved) */
export const copyMapFile = (to: number | string, from: number | string) =>
  request<MapFileSaved | undefined>(`/api/maps/${encodeURIComponent(String(to))}/file/copy`, { method: 'POST', json: { from: Number(from) } })
