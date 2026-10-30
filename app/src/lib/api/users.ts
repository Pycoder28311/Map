import type { Author } from '@map/shared'
import { request } from './client'
import { toQuery } from './resource'

/** The person with exactly this email (never their email back); 404 when there is none */
export const lookupUser = (email: string) => request<Author>(`/api/users/lookup${toQuery({ email: email.trim() })}`)
