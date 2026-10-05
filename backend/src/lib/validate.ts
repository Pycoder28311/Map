import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { z } from 'zod'
import { errorBody, HttpError } from './errors'

const toDetails = (error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }) =>
  error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }))

/**
 * zValidator with the API's error format: invalid input answers
 * 400 { code: 'VALIDATION_FAILED', message, details: [{ path, message }] }
 */
export const validate = <T extends z.ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(errorBody('VALIDATION_FAILED', 'Invalid input', toDetails(result.error)), 400)
    }
  })

/** Parses data inside a handler, throwing the same 400 VALIDATION_FAILED error on failure */
export function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', toDetails(result.error))
  return result.data
}
