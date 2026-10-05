import { z } from 'zod'

/** What a client may send: text + ordered image ids (the owner always comes from the session) */
export const noteInput = z.object({
  text: z.string().trim().min(1).max(1000),
  imageIds: z.array(z.number().int().positive()).max(10).default([]),
})

export type NoteInput = z.infer<typeof noteInput>

export type NoteImage = {
  id: number
  url: string
}

export type Note = {
  id: number
  text: string
  images: NoteImage[]
}
