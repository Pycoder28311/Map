import type { LazyStore } from '@tauri-apps/plugin-store'

// DESKTOP ONLY: the session token (backend bearer() plugin) in a file of the app's data folder,
// so the user stays signed in after restarting the app. The website keeps its session in a cookie.

const FILE = 'auth.json'
const KEY = 'session-token'

// Loaded on first use, so the website build never includes the Tauri plugin
let store: Promise<LazyStore> | null = null
const getStore = () => (store ??= import('@tauri-apps/plugin-store').then(({ LazyStore }) => new LazyStore(FILE)))

export async function getToken(): Promise<string | undefined> {
    return (await (await getStore()).get<string>(KEY)) ?? undefined
}

export async function saveToken(token: string) {
    const s = await getStore()
    await s.set(KEY, token)
    await s.save()
}

export async function clearToken() {
    const s = await getStore()
    await s.delete(KEY)
    await s.save()
}
