# Scribe

Your campaign scribe — nested page tree, TipTap editor, autosave, optional shared-password auth. Built with Next.js 14 (App Router), TypeScript, Tailwind, Prisma (SQLite locally / Cloudflare D1 in production), and TipTap. Hosted on Cloudflare Workers via OpenNext.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + `@tailwindcss/typography`
- **Prisma** – SQLite for local dev, Cloudflare D1 in production (via `@prisma/adapter-d1`)
- **TipTap** – block-style editor
- **Cloudflare** – Workers for hosting (via `@opennextjs/cloudflare`), D1 for production DB

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install --ignore-scripts --legacy-peer-deps
   ```

2. Copy env and set the database URL:

   ```bash
   cp .env.example .env
   ```

   In `.env` set:

   ```
   DATABASE_URL="file:./dev.db"
   ```

   (Optional: set `EDIT_PASSWORD=your-secret` to enable shared-password auth locally.)

3. Generate Prisma client and run migrations:

   ```bash
   npm run db:generate
   npx prisma migrate dev --name init
   ```

   If the path to the project contains special characters (e.g. `&`), run Prisma via node:

   ```bash
   node node_modules/prisma/build/index.js generate
   node node_modules/prisma/build/index.js migrate dev --name init
   ```

4. Seed the database (creates 3 sample pages, one nested):

   ```bash
   npm run db:seed
   ```

   If the project path contains special characters (e.g. `&`), run: `node node_modules/tsx/dist/cli.mjs prisma/seed.ts` (with `DATABASE_URL` set in `.env` or env).

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Restart the server and pages persist (SQLite file in `prisma/dev.db`).

## Production (Cloudflare Workers + D1)

1. **Create a D1 database** in the Cloudflare dashboard (or `npx wrangler d1 create scribe-db`) and note the `database_id`. Set `database_id` in `wrangler.toml` if it differs.

2. **Apply migrations to D1** (same SQL as local). From the project root:

   ```bash
   npx wrangler d1 execute scribe-db --remote --file=./prisma/migrations/20240203000000_init/migration.sql
   ```

   Or run the initial migration SQL manually in the D1 console. If the `Page` table is missing, the API returns a 500 with `detail` explaining this.

3. **Configure the Worker** in `wrangler.toml`: D1 binding `DB` is already set. Set env vars/secrets in Cloudflare (e.g. `EDIT_PASSWORD` for auth) via dashboard or `npx wrangler secret put EDIT_PASSWORD`.

4. **Preview locally**: `npm run preview` — builds with OpenNext and runs the app locally (Wrangler dev). Open the URL shown (e.g. `http://localhost:8787`). For local env (e.g. Next.js env loading), add a `.dev.vars` file with `NEXTJS_ENV=development` (and optionally `EDIT_PASSWORD=...`).

5. **Deploy**: `npm run deploy` — builds and deploys to Cloudflare Workers. After deploy, open the URL shown in the terminal (e.g. `https://scribe.<your-subdomain>.workers.dev`).

## Scripts

| Script         | Description                                      |
|----------------|--------------------------------------------------|
| `npm run dev`  | Start Next.js dev server                         |
| `npm run build`| Next.js production build                        |
| `npm run preview` | Build + run locally (OpenNext + Wrangler dev)   |
| `npm run deploy` | Build + deploy to Cloudflare Workers            |
| `npm run cf-typegen` | Generate `cloudflare-env.d.ts` from wrangler config |
| `npm run db:generate` | Generate Prisma client                       |
| `npm run db:migrate`  | Run Prisma migrations (local)               |
| `npm run db:seed`     | Seed local DB with sample pages             |
| `npm run db:push`     | Push schema without migrations (optional)   |

## API

| Method | Path              | Description |
|--------|-------------------|-------------|
| GET    | `/api/ping`       | Control route: returns `ok` (no imports that can crash at load). |
| GET    | `/api/diag`       | Diagnostic: Cloudflare context and env bindings (no Prisma). |
| GET    | `/api/pages`      | List pages (tree or flat with `?flat=1`). `?search=...` filters by title. |
| GET    | `/api/pages/:id`  | Get one page by id. |
| POST   | `/api/pages`      | Create page. Body: `{ parentId?, title? }`. |
| PATCH  | `/api/pages/:id`  | Update page. Body: `{ title?, parentId?, sortOrder?, contentJson? }`. |
| DELETE | `/api/pages/:id`  | Soft-delete page (and cascade to children). |
| POST   | `/api/auth/login` | Login with shared password. Body: `{ password }`. |
| DELETE | `/api/auth/login` | Logout (clear auth cookie). |
| GET    | `/api/auth/login` | Check if auth is required and if password is set. |

All mutating routes (POST/PATCH/DELETE on pages) require a valid auth cookie when `EDIT_PASSWORD` is set. Reads can be public; set the cookie via `/api/auth/login` (POST) with the correct password.

## Next improvements (from plan)

1. Body search – full-text search in page content.
2. Drag-and-drop reorder in sidebar.
3. Drag-and-drop nesting.
4. Empty state and loading skeletons.
5. Error handling – toasts, retry, “Unsaved changes” warning.
6. Keyboard nav – arrows in sidebar, Ctrl+K quick open.
7. Restore deleted pages.
8. Export page/tree as Markdown or JSON.
9. Mobile/responsive – collapsible sidebar.
10. Stronger auth – per-user or OAuth.
