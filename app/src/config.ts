/**
 * The live site: website + API served by one Worker (backend/wrangler.jsonc, BETTER_AUTH_URL).
 * The frontend's only domain. Used by the dev proxy (vite.config.ts) and by the desktop app,
 * which can't use relative /api URLs because its pages run at tauri://localhost.
 */
export const SITE_URL = 'https://map.kopotitore.workers.dev'
