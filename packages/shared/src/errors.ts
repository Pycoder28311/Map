/** Every error the API can answer with. The shape matches Better Auth's own errors. */
export const ERROR_CODES = [
  // generic
  'UNAUTHORIZED',
  'FORBIDDEN',
  'FORBIDDEN_ORIGIN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'TOO_MANY_REQUESTS',
  'SERVER_MISCONFIGURED',
  'INTERNAL',
  // uploads
  'NO_FILES',
  'TOO_MANY_FILES',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
  // resources
  'UNKNOWN_IMAGE',
  'UNKNOWN_REFERENCE', // a sent id (postId, plantId, …) points to nothing
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export type ValidationIssue = { path: string; message: string }

/** The JSON body of every error response */
export type ApiError = {
  code: ErrorCode
  message: string
  details?: ValidationIssue[]
}
