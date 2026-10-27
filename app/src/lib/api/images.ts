import { request } from './client'

/** One stored picture, as the server answers an upload (backend/src/resources/images/images.routes.ts) */
type Stored = { id: number; url: string }

/**
 * Stores one picture (JPEG, PNG or WebP, under 10 MB: the server checks) and answers with its address, the only kind of picture
 * rich text and an article's Info box keep
 */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('files', file)
  const [stored] = await request<Stored[]>('/api/images', { method: 'POST', body })
  return stored.url
}
