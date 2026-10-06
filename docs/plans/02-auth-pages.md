# 02 — Auth pages (sign in, sign up, email code, password reset, Google)

**Goal:** the website gets the same sign-in features as GrowMe's app: sign in with a password or with a
6-digit email code (send, resend, enter), sign up with email confirmation, forgot password → reset link
→ new password, "Continue with Google", and sign out. Dashboard and projects require a session. The
pages are plain React + Tailwind (kept minimal, restyled later), and `npm run dev` in `app/` works
against the **remote** backend, with no local backend needed.

**Source:** `~/Workspace/Coding/Production/GrowMe/app/src/app/{sign-in,sign-up,forgot-password,reset-password}.tsx`,
`components/google-button.tsx`, `lib/auth-client.ts`, `app/_layout.tsx` (route guards). The logic is
copied; the React Native UI (`TextInput`, `ThemedView`, `expo-router`) is rewritten for the web.
**Depends on:** 01 (backend, done). **Blocks:** desktop auth (Tauri: bearer token + Google via system
browser), real resources (projects/maps) behind the session.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Features = GrowMe's auth screens, 1:1: password sign-in, email code (send / resend / enter), sign-up + "check your email", forgot + reset password, Google button, `EMAIL_NOT_VERIFIED` message. GrowMe has no "change password while signed in"; "change password" here means forgot → reset, as in GrowMe | User |
| D2 | Emails stop using `testingggg.lol`: `EMAIL_FROM = onboarding@resend.dev` (Resend's test sender). Images stay on `images.testingggg.lol/map/` | User |
| D3 | `npm run dev` (app) uses the **remote** backend: Vite proxies `/api` to `https://map.kopotitore.workers.dev`. No local backend | User |
| D4 | Tailwind, the simplest possible: a few utility classes, no design system, no theme | User |
| D5 | Plan location `docs/plans/02-auth-pages.md` | Default |
| D6 | Auth client from `better-auth/react` with only `emailOTPClient()`; **no `baseURL`**: it uses the page's own origin + `/api/auth`, which is the proxy locally and the Worker in production | Default |
| D7 | Return links (email confirmation, Google, reset) are built from `window.location.origin`, so the same code works on `localhost:5173` and on the live site | Default |
| D8 | Route guards like GrowMe's `_layout.tsx`: signed-in only (`/dashboard`, `/projects`), guests only (`/sign-in`, `/sign-up`, `/forgot-password`), both (`/reset-password`: the email link must open even when signed in). Home `/` stays public | Default |
| D9 | After sign-in → `/dashboard`. Sign-out button on the dashboard (GrowMe has it in settings/notes) | Default |
| D10 | UI texts in English, as GrowMe's auth screens | Default |
| D11 | The `/api/hello` demo fetch is removed from `HomePage.tsx` (the route no longer exists in the new backend); the home page gets "Sign in" / "Sign up" links | Default |
| D12 | Production `WEB_ORIGINS` also lists `http://localhost:5173`, needed by D3 (CSRF + Better Auth trusted origins) | Default (follows D3) |

## 1 — Risks and blockers

1. **The live Worker still runs the old backend.** The last push (`d732dfb`) did not deploy it:
   `/api/notes` and `/api/auth/*` answer `404`. Most likely the Workers Builds settings were not changed
   (root `/`, build `npm run build --workspace app`, deploy `npm run deploy --workspace backend`). With D3
   nothing works until the new backend is live, so this is **task 1**: fix the settings (user, dashboard)
   or deploy manually.
2. **`onboarding@resend.dev` only delivers to the email of your Resend account.** Signing up with any
   other address creates the account but the confirmation email never arrives (Resend rejects it). Fine
   for testing; real users need a verified domain later (only `EMAIL_FROM` changes then).
3. **The Resend API key must be allowed to send from `resend.dev`.** A key restricted to the
   `testingggg.lol` domain is refused. If sending fails with `403`, create a key with *Sending access* to
   all domains and upload it again (`npx wrangler secret put RESEND_API_KEY`).
4. **Remote backend from `localhost` (D3) has limits:**
   - **Google sign-in can't be tested locally.** It starts on `localhost` (state cookie there) and ends on
     `workers.dev`, so Better Auth reports a state mismatch. Test Google on the live site.
   - **Auto sign-in after the confirmation link** sets the cookie on `workers.dev`, not on `localhost`:
     locally you confirm, then sign in. Works fully on the live site.
   - **Every local test writes to the production database** (`map-db --remote`).
5. **Secure cookies on `http://localhost`.** The remote backend sets `__Secure-` cookies with `Secure`.
   Chrome and Firefox accept them on `localhost` (treated as a secure context), so the proxy needs no
   cookie rewriting. If a browser rejects them, the fix is a cookie rewrite in the Vite proxy (dev only).
6. **Google consent screen in "Testing" mode:** only listed test users can sign in with Google.
7. **Desktop app:** `isDesktop` sends `/` to `/dashboard`, which now redirects to `/sign-in`, but sign-in
   can't work inside Tauri yet (cross-site cookies, no API base URL). Expected until the desktop auth plan.
8. **Rate limits:** 5 attempts per minute per IP on sign-in, sign-up, code sending and reset. Clicking
   "Send code" many times shows "Too many attempts" for a minute, by design.

## 2 — Architecture

```
Browser (localhost:5173 in dev │ map.kopotitore.workers.dev live)
  pages ──► lib/auth-client.ts (better-auth/react) ──► fetch('/api/auth/…')
                                                          │
         dev:  Vite proxy (vite.config.ts) ───────────────┤
         live: same Worker, same origin ──────────────────┤
                                                          ▼
                              Worker map: CSRF (WEB_ORIGINS) → Better Auth → D1 map-db
                                                          │ emails via Resend (onboarding@resend.dev)
```

Route guards read `authClient.useSession()`:

```
/                  public (web) │ desktop → /dashboard
/sign-in, /sign-up, /forgot-password   guests only → signed in? → /dashboard
/reset-password    always (token from the email link)
/dashboard, /projects                  signed in only → guest? → /sign-in
```

## 3 — Backend configuration (no code changes)

- **`backend/wrangler.jsonc` `vars`:**
  - `EMAIL_FROM`: `onboarding@resend.dev` (D2). The sender becomes `Map <onboarding@resend.dev>`
    (name from `APP_NAME`, unchanged code in `lib/email.ts`).
  - `WEB_ORIGINS`: add `http://localhost:5173` (D12) →
    `https://map.kopotitore.workers.dev,http://localhost:5173,tauri://localhost,http://tauri.localhost`.
- **`backend/.dev.vars.example`** (and the user's `.dev.vars`): `EMAIL_FROM=onboarding@resend.dev`.
- **Docs:** `instructions/backend-setup.md` configuration table (`EMAIL_FROM`, `WEB_ORIGINS`, the
  Resend note), `COMMANDS.md` (local backend optional; `npm run dev` in `app/` uses the remote).
- **Deploy** after these changes (task 1/2), because the frontend talks to the live Worker.

## 4 — Frontend setup

- **Package:** `npm install better-auth@^1.7.7 --workspace app` (same version as the backend; npm keeps
  one copy at the root).
- **`app/vite.config.ts`:** add the `tailwindcss()` plugin (`@tailwindcss/vite`, already installed) and
  the dev proxy:
  ```ts
  server: { proxy: { '/api': { target: 'https://map.kopotitore.workers.dev', changeOrigin: true } } }
  ```
  The proxy target is the only remote URL in the app; it is dev-only (the production build calls its own
  origin). `envPrefix` stays.
- **`app/src/index.css`:** replace the Vite template styles (they fix `#root` to 1126px and center all
  text) with `@import "tailwindcss";` only.
- **`app/src/lib/auth-client.ts`** (new):
  ```ts
  import { emailOTPClient } from 'better-auth/client/plugins'
  import { createAuthClient } from 'better-auth/react'

  export const authClient = createAuthClient({ plugins: [emailOTPClient()] })
  ```
- **`app/src/lib/urls.ts`** (new): `appUrl(path)` → `` `${window.location.origin}${path}` `` (D7).

## 5 — Shared UI (minimal Tailwind, D4)

`app/src/components/ui/` — small and unstyled beyond basics, so restyling later touches only these:

| File | What |
|---|---|
| `AuthLayout.tsx` | centered column, `max-w-sm`, title |
| `TextField.tsx` | `<input>` with label, full width, border |
| `Button.tsx` | primary / secondary, `disabled` state, `type` prop |
| `ErrorText.tsx` | red text, renders nothing when empty |

Forms use `<form onSubmit>` (Enter submits) and correct `autoComplete` values (`email`, `current-password`,
`new-password`, `one-time-code`), the web equivalents of GrowMe's `TextInput` props.

## 6 — Pages (logic copied from GrowMe)

| Page (new) | Route | Copied from | Web changes |
|---|---|---|---|
| `pages/SignIn/SignInPage.tsx` | `/sign-in` | `sign-in.tsx`: modes `password` / `code-email` / `code-enter`, `run()` helper, `EMAIL_NOT_VERIFIED` message, "Send a new code", "Use password instead" | `Link` from react-router; on success `navigate('/dashboard')` (the session updates through `useSession`) |
| `pages/SignUp/SignUpPage.tsx` | `/sign-up` | `sign-up.tsx`: name, email, password ≥ 8, "Check your email" state | `callbackURL: appUrl('/dashboard')` instead of `Linking.createURL('/')` |
| `pages/ForgotPassword/ForgotPasswordPage.tsx` | `/forgot-password` | `forgot-password.tsx`: same neutral "If an account exists…" text | `redirectTo: appUrl('/reset-password')` |
| `pages/ResetPassword/ResetPasswordPage.tsx` | `/reset-password` | `reset-password.tsx`: `token` and `error` from the URL, password + confirm, "Link not valid" state | `useSearchParams()` instead of `useLocalSearchParams()`; `navigate('/sign-in', { replace: true })` |
| `components/GoogleButton.tsx` | on sign-in and sign-up | `google-button.tsx` | `callbackURL: appUrl('/dashboard')`; the browser leaves the page for Google |

`authClient` calls stay exactly as in GrowMe: `signIn.email`, `emailOtp.sendVerificationOtp({ type:
'sign-in' })`, `signIn.emailOtp`, `signUp.email`, `requestPasswordReset`, `resetPassword`,
`signIn.social({ provider: 'google' })`, `signOut`.

## 7 — Routing, guards, existing pages

- **`app/src/components/RequireAuth.tsx`** (new): `useSession()`; while `isPending` render nothing;
  no session → `<Navigate to="/sign-in" replace />`; else `<Outlet />`.
- **`app/src/components/GuestOnly.tsx`** (new): the opposite; session → `<Navigate to="/dashboard" replace />`.
- **`app/src/routes/index.tsx`:** wrap `/dashboard` and `/projects` in `RequireAuth`, the three guest
  pages in `GuestOnly`, `/reset-password` outside both (D8). Desktop `/` redirect unchanged.
- **`DashboardPage.tsx`:** show the user's name/email from `useSession()` and a "Sign out" button
  (`authClient.signOut()`, then `navigate('/sign-in')`). Counter demo stays.
- **`HomePage.tsx`:** remove the `/api/hello` fetch and its state (D11); add "Sign in" and "Sign up"
  links. The download link is untouched (separate issue, see open items).

## Testing

Automatic:
- `npm run build --workspace app` (type-check + build) after every task.
- `npx wrangler deploy --dry-run` in `backend/` after the config change.

Manual, on `http://localhost:5173` with `npm run dev --workspace app` (remote backend):
- `/dashboard` and `/projects` signed out → `/sign-in`; `/sign-in` signed in → `/dashboard`.
- Sign up **with the Resend account's email** → "Check your email" → email from `Map <onboarding@resend.dev>`
  → link confirms (lands on `localhost:5173/dashboard`, then sign in, see risk 4).
- Sign in with the password before confirming → "Please confirm your email first…".
- Sign in with password → dashboard shows the user → Sign out → `/sign-in`.
- Email code: send → 6-digit code arrives → sign in; wrong code → error; "Send a new code".
- Forgot password → email → link opens `localhost:5173/reset-password?token=…` → new password → sign in
  with it; reopen the used link → "Link not valid".
- Rate limit: 6 quick code requests → "Too many attempts…".

On the live site after deploy (`https://map.kopotitore.workers.dev`):
- The same flows, plus **Google** (account listed as test user) and auto sign-in after the confirmation link.

Limits: emails only reach the Resend account's address (risk 2); every test writes to the production
database (risk 4).

## Task list

| # | Task | Files |
|---|---|---|
| 1 | **User:** fix Workers Builds settings (root `/`, build `npm run build --workspace app`, deploy `npm run deploy --workspace backend`), or allow a manual deploy | Cloudflare dashboard |
| 2 | `EMAIL_FROM` → `onboarding@resend.dev`; `WEB_ORIGINS` + `http://localhost:5173`; update example + docs; deploy; check `/api/auth/ok` → `200` | `backend/wrangler.jsonc`, `backend/.dev.vars.example`, `instructions/backend-setup.md`, `COMMANDS.md` |
| 3 | Install `better-auth` in `app`; Tailwind plugin + `/api` proxy; replace `index.css` | `app/package.json`, `package-lock.json`, `app/vite.config.ts`, `app/src/index.css` |
| 4 | `auth-client.ts`, `urls.ts`, UI components | `app/src/lib/*`, `app/src/components/ui/*` |
| 5 | Sign-in page + Google button | `app/src/pages/SignIn/SignInPage.tsx`, `app/src/components/GoogleButton.tsx` |
| 6 | Sign-up, forgot-password, reset-password pages | `app/src/pages/{SignUp,ForgotPassword,ResetPassword}/*` |
| 7 | Guards + routes; dashboard user + sign out; home links, demo fetch removed | `app/src/components/{RequireAuth,GuestOnly}.tsx`, `app/src/routes/index.tsx`, `app/src/pages/Dashboard/DashboardPage.tsx`, `app/src/pages/Home/HomePage.tsx` |
| 8 | Manual tests locally (Testing list) | — |
| 9 | Deploy (push or manual); live tests incl. Google | — |

Files **not** touched: backend code (`backend/src/**`), secrets (`RESEND_API_KEY`, Google keys, auth
secret: only `RESEND_API_KEY` may need a new value, risk 3), images config (`IMAGES_URL`,
`IMAGES_FOLDER`), `app/src-tauri/**`, `packages/shared`, the download link in `HomePage.tsx`.

## Open items

1. **Which email is your Resend account's?** Only that address receives emails from
   `onboarding@resend.dev`, so test sign-ups must use it.
2. **Is `RESEND_API_KEY` restricted to `testingggg.lol`?** If yes, a new unrestricted key is needed
   (risk 3).
3. **Download link** in `HomePage.tsx` points to a file that doesn't exist (`app-0.1.0-1.x86_64.rpm` in
   release `test01`, 404). Not part of this plan; fix together with the release naming.
4. **Remove `http://localhost:5173` from production `WEB_ORIGINS` before launch?** It is only needed for
   D3; keeping it is low risk (only code running on the visitor's own `localhost:5173` could use it).
