import type { Message, MessageImport, MessageInput, MessageUpdate } from '@map/shared'
import { request } from './client'
import { createResourceApi } from './resource'

/**
 * An article's messages (docs/plans/34), on the generic routes (/api/messages): `get` when its words are clicked, `list` for "Not in
 * the text" (`{ articleId, exclude: 'id,id' }`), create, update (text, Done), remove
 */
export const messagesApi = createResourceApi<Message, Message, MessageInput, MessageUpdate, { articleId: number; exclude?: string }>('/api/messages')

/** The article's old messages (title and text in their links) made into rows, in this order */
export const importMessages = (body: MessageImport) => request<Message[]>('/api/messages/import', { method: 'POST', json: body })
