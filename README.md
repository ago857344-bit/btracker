# BTracker Next

Phase 1 scaffold for migrating `BTracker_v2.9.html` to SvelteKit + Tauri/Rust.

## What exists now

- A strict, lossless TypeScript model of the legacy `S` data object.
- Reactive Svelte stores, selectors, dashboard-widget preferences and timer state.
- Exact question-bit helpers plus a safe v1–v3 `JEE-` save-code importer.
- Rust/Tauri commands for atomic persistence and syllabus summary processing.
- CSS design tokens ready for the deep purple, rounded dashboard system in the next phase.

## Start it after dependencies are installed

```sh
npm install
npm run tauri dev
```

For browser-only UI work, use `npm run dev`. Tauri persists in the operating system's application-data directory; browser development uses IndexedDB.

## Google sign-in & cross-device sync (optional)

BTracker works fully offline: your data stays in this device (IndexedDB in the browser, app-data under Tauri). To add Google sign-in and sync your stats across devices, connect a Supabase project.

1. Create a project at [supabase.com](https://supabase.com). In the SQL editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql) — it creates the `tracker_state` table with row-level security so each user only ever reads/writes their own row.
2. In **Authentication → Providers**, enable **Google** and paste your Google OAuth client ID + secret. Add your Supabase callback URL to the Google credential's authorized redirect URIs.
3. In **Authentication → URL Configuration**, add your production site URL and `http://localhost:1420` for local development.
4. Copy `.env.example` to `.env` and fill in `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
5. Restart the dev server. The topbar account button and `/login` now offer **Continue with Google**.

On first sign-in from a device, any existing local data is migrated up to the cloud account so nothing is lost; afterwards, saves mirror to Supabase automatically. Leave the env values blank to keep running in local-only mode.
# btracker
