import { SITE_URL } from '../../config'
import { isDesktop } from '../platform'
import { getToken } from '../session-token'

/** One failed API call: the status (0: the server could not be reached) and the API's error body ({ code, message, details }) */
export class ApiError extends Error {
  status: number
  code: string
  /** Per-field problems of a 400 VALIDATION_FAILED answer */
  details: { path: string; message: string }[]

  constructor(status: number, code: string, message: string, details: { path: string; message: string }[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** `json`: a body sent as JSON; `body`: files (the browser sets their content type) */
export type RequestInitJson = Omit<RequestInit, 'body'> & { json?: unknown; body?: FormData }

export type RequestConfig = {
  /** '' : the page's own origin (the website; in dev the Vite proxy forwards /api). The desktop app uses the live site */
  baseUrl: string
  /** Desktop: the session token (sent as a bearer header, no cookies). The website sends its cookie instead */
  bearer?: () => Promise<string | undefined>
  fetch?: typeof fetch
  /** Called when the API answers 401 (the session is gone) */
  onUnauthorized?: () => void
}

const CODE_FOR_STATUS: Record<number, string> = { 400: 'VALIDATION_FAILED', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'TOO_MANY_REQUESTS' }

/** The `request` function for a configuration (a function so tests can give their own fetch) */
export function createRequest(config: RequestConfig) {
  return async function request<T>(path: string, init: RequestInitJson = {}): Promise<T> {
    const { json, headers, ...rest } = init
    const token = await config.bearer?.()
    let res: Response
    try {
      res = await (config.fetch ?? fetch)(`${config.baseUrl}${path}`, {
        ...rest,
        credentials: config.bearer ? 'omit' : 'include',
        headers: {
          Accept: 'application/json',
          ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        // A JSON body, or the one given as it is (a FormData of files)
        body: json !== undefined ? JSON.stringify(json) : rest.body,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error // a cancelled call is not a failure
      throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.')
    }

    if (res.status === 204) return undefined as T
    // The body may be empty or not JSON (a proxy error page): then only the status is known
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok) {
      if (res.status === 401) config.onUnauthorized?.()
      const error = (body ?? {}) as { code?: string; message?: string; details?: { path: string; message: string }[] }
      throw new ApiError(res.status, error.code ?? CODE_FOR_STATUS[res.status] ?? 'ERROR', error.message ?? `Request failed (${res.status})`, error.details)
    }
    return body as T
  }
}

let unauthorized: (() => void) | undefined
/** Who handles a 401 (RequireAuth: sign out and go to the sign-in page) */
export const setUnauthorizedHandler = (handler: (() => void) | undefined) => {
  unauthorized = handler
}

/** The app's request function: its own origin on the website, the live site and a bearer token on desktop */
export const request = createRequest({
  baseUrl: isDesktop ? SITE_URL : '',
  bearer: isDesktop ? getToken : undefined,
  onUnauthorized: () => unauthorized?.(),
})
