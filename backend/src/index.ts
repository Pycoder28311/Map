import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { createAuth } from './auth'
import { getConfig } from './lib/config'
import { codeForStatus, errorBody, HttpError } from './lib/errors'
import type { AppEnv } from './middleware/auth'
import { csrfProtection } from './middleware/csrf'
import { checkEnv } from './middleware/env'
import { rateLimit } from './middleware/rate-limit'
import imagesRoutes from './resources/images/images.routes'
import notesRoutes from './resources/notes/notes.routes'

// Only /api/* and /images/* reach this code (wrangler.jsonc run_worker_first);
// every other path is the website from app/dist
const app = new Hono<AppEnv>()

// Fails loudly (500 SERVER_MISCONFIGURED) when variables or bindings are missing
app.use('*', checkEnv)

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => (getConfig(c.env).webOrigins.includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['set-auth-token'], // bearer plugin: lets the desktop app read its session token
    maxAge: 600, // browsers reuse the OPTIONS answer for 10 minutes
  }),
)

// After CORS, so blocked answers can still be read by the browser
app.use('/api/*', csrfProtection)
app.use('/api/*', rateLimit)

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))

// One line per resource (see instructions/adding-a-resource.md)
const routes = app
  .route('/api/notes', notesRoutes)
  .route('/api/images', imagesRoutes)

// Serves R2 files through the Worker for LOCAL development only (production uses the IMAGES_URL domain).
// The bucket is shared with other apps, so only keys inside this app's IMAGES_FOLDER are served.
app.get('/images/*', async (c) => {
  const { isDev, imagesFolder } = getConfig(c.env)
  const key = c.req.path.slice('/images/'.length)
  const allowed = isDev && (!imagesFolder || key.startsWith(`${imagesFolder}/`))
  const object = allowed ? await c.env.BUCKET.get(key) : null
  if (!object) return c.json(errorBody('NOT_FOUND', 'Image not found'), 404)
  return new Response(object.body, {
    headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' },
  })
})

app.notFound((c) => c.json(errorBody('NOT_FOUND', 'Route not found'), 404))

// Every error answers { code, message, details? }; unexpected ones are logged and hidden
app.onError((err, c) => {
  if (err instanceof HttpError) return c.json(errorBody(err.code, err.message, err.details), err.status)
  if (err instanceof HTTPException) {
    return c.json(errorBody(codeForStatus(err.status), err.message || 'Request failed'), err.status)
  }
  console.error(err)
  return c.json(errorBody('INTERNAL', 'Something went wrong. Please try again.'), 500)
})

export type AppType = typeof routes
export default app
