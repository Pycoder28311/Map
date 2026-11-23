/** Every error the API can answer with. The shape matches Better Auth's own errors. */
export const ERROR_CODES = [
  // generic
  'UNAUTHORIZED',
  'FORBIDDEN',
  'FORBIDDEN_ORIGIN',
  'NOT_FOUND',
  'CONFLICT', // the row was saved by someone else since the version this write changes (409)
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
  // follows and invitations (docs/plans/40)
  'NOT_FOLLOWING', // an invitation to someone the sender does not follow (403)
  'ALREADY_INVITED', // an invitation of this kind for this person is still pending (409)
  'ALREADY_COLLABORATOR', // the person is on the item already: change their role instead (409)
  'NOT_AVAILABLE', // the item an invitation is about is in its owner's Trash or gone (410)
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export type ValidationIssue = { path: string; message: string }

/** The JSON body of every error response */
export type ApiError = {
  code: ErrorCode
  message: string
  details?: ValidationIssue[]
}
