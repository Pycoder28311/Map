import type { ApiError, ErrorCode, ValidationIssue } from '@map/shared'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** The JSON body of every error response: { code, message, details? } */
export const errorBody = (code: ErrorCode, message: string, details?: ValidationIssue[]): ApiError =>
  details ? { code, message, details } : { code, message }

/** Throw from anywhere (middleware, repos, helpers); app.onError turns it into errorBody() */
export class HttpError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: ErrorCode,
    message: string,
    public details?: ValidationIssue[],
  ) {
    super(message)
  }
}

export const unauthorized = (message = 'Please sign in') => new HttpError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'You do not have access to this') => new HttpError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Not found') => new HttpError(404, 'NOT_FOUND', message)

/** Error code for errors that only carry an HTTP status (e.g. Hono's HTTPException) */
export function codeForStatus(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 429) return 'TOO_MANY_REQUESTS'
  if (status >= 400 && status < 500) return 'VALIDATION_FAILED'
  return 'INTERNAL'
}
