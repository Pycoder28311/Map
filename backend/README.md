# Backend

Hono API on Cloudflare Workers with D1 (Drizzle), R2 and Better Auth. The same Worker also serves the
website (`app/dist`). Part of the root npm workspace: install from the repo root.

```
npm install                                     # at the repo root
npm run dev --workspace backend                 # http://localhost:8787
npm run typecheck --workspace backend
npm run deploy --workspace backend              # build the app first: npm run build --workspace app
npm run cf-typegen --workspace backend          # after changing wrangler.jsonc or .dev.vars
npm run secrets:production --workspace backend  # upload .secrets.production.json
```

- Setup, configuration (every domain and secret), moving accounts: [`instructions/backend-setup.md`](../instructions/backend-setup.md)
- Adding a table and its API: [`instructions/adding-a-resource.md`](../instructions/adding-a-resource.md)
- Request/response contracts and `APP_NAME`, shared with the app: [`packages/shared`](../packages/shared/src)
