import { z } from 'zod'

/** Treats empty strings (e.g. `WEB_ORIGINS=""`) as "not set" */
const emptyAsUndefined = (v: unknown) => (v === '' ? undefined : v)
const optionalText = z.preprocess(emptyAsUndefined, z.string().min(1).optional())
const binding = z.custom<object>((v) => typeof v === 'object' && v !== null, { message: 'Binding is missing' })

/**
 * Everything the backend needs from wrangler.jsonc (vars, bindings) and secrets.
 * Add a line here whenever the code starts using a new variable or binding.
 */
const envSchema = z.object({
  // app (the display name is APP_NAME in the shared package, not a variable)
  APP_SCHEME: z.preprocess(emptyAsUndefined, z.string().regex(/^[a-z][a-z0-9+.-]*$/).optional()),
  WEB_ORIGINS: z.string().default(''),
  // auth
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  // email (address only; the sender name is APP_NAME)
  EMAIL_FROM: z.email(),
  RESEND_API_KEY: z.string().min(1),
  // storage
  IMAGES_URL: z.url(),
  IMAGES_FOLDER: optionalText, // folder inside the bucket; empty = bucket root
  // bindings
  DB: binding,
  BUCKET: binding,
  AUTH_STRICT: binding,
  API_GENERAL: binding,
})

export type ValidEnv = z.infer<typeof envSchema>

/** Thrown when variables are missing or invalid. Lists names only, never values. */
export class EnvError extends Error {
  constructor(public names: string[]) {
    super(`Missing or invalid environment variables: ${names.join(', ')}`)
  }
}

const cache = new WeakMap<object, ValidEnv>()

/** Validates the environment once per isolate and returns the parsed values */
export function getEnv(env: CloudflareBindings): ValidEnv {
  const cached = cache.get(env)
  if (cached) return cached
  const result = envSchema.safeParse(env)
  if (!result.success) {
    throw new EnvError([...new Set(result.error.issues.map((issue) => String(issue.path[0])))])
  }
  cache.set(env, result.data)
  return result.data
}
