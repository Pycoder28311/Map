import { createMiddleware } from 'hono/factory'
import { EnvError, getEnv } from '../lib/env'
import { errorBody } from '../lib/errors'

/** First middleware: a misconfigured deploy fails loudly here instead of mid-request */
export const checkEnv = createMiddleware<{ Bindings: CloudflareBindings }>(async (c, next) => {
  try {
    getEnv(c.env)
  } catch (err) {
    if (!(err instanceof EnvError)) throw err
    console.error(err.message) // variable names only, never values
    return c.json(errorBody('SERVER_MISCONFIGURED', 'The server is misconfigured. Please try again later.'), 500)
  }
  await next()
})
