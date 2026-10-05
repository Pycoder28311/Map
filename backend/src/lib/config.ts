import { APP_NAME } from '@map/shared'
import { getEnv } from './env'

export type AppConfig = {
  /** Shown to users, e.g. in email subjects (APP_NAME from the shared package) */
  appName: string
  /** Mobile/desktop app URL scheme (e.g. "map"); undefined for projects without one */
  appScheme: string | undefined
  /** Websites allowed to call the API from a browser (CORS + CSRF) */
  webOrigins: string[]
  /** Everything Better Auth may redirect to or accept requests from */
  trustedOrigins: string[]
  /** Folder for this app's files inside the R2 bucket, without slashes; '' = bucket root */
  imagesFolder: string
  /** True when the backend itself runs on localhost */
  isDev: boolean
}

const cache = new WeakMap<object, AppConfig>()

/** Project settings derived from the validated environment (cached per isolate) */
export function getConfig(env: CloudflareBindings): AppConfig {
  const cached = cache.get(env)
  if (cached) return cached

  const e = getEnv(env)
  const webOrigins = e.WEB_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const isDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(e.BETTER_AUTH_URL)

  const config: AppConfig = {
    appName: APP_NAME,
    appScheme: e.APP_SCHEME,
    webOrigins,
    trustedOrigins: [
      ...(e.APP_SCHEME ? [`${e.APP_SCHEME}://`] : []),
      ...webOrigins,
      ...(isDev ? ['exp://'] : []), // Expo Go only while developing locally
    ],
    imagesFolder: (e.IMAGES_FOLDER ?? '').replace(/^\/+|\/+$/g, ''),
    isDev,
  }
  cache.set(env, config)
  return config
}
