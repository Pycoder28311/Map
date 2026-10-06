import { SITE_URL } from '../config'
import { isDesktop } from './platform'

/**
 * Absolute URL of a page of the website, for links that come back from emails or Google.
 * Website: this page's own origin. Desktop: the live website, because email links open in the
 * system browser, which can't open tauri://localhost.
 */
export const appUrl = (path: string) => `${isDesktop ? SITE_URL : window.location.origin}${path}`
