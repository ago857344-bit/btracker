# Phase 1 — Architecture foundation

The new project is scaffolded in the workspace root. It uses SvelteKit for reactive presentation and Tauri/Rust for desktop persistence and processing.

The migration keeps the old `S` object fields at the persistence boundary to preserve existing save data. New view-specific code will interact through Svelte stores and selectors. See `docs/legacy-state-map.md` in the workspace for the one-to-one feature inventory.

The next phase replaces the temporary page with the responsive sidebar application shell and maps the new route names: Home, Plan, Focus, Revise, Tests, Mastery, Friends, Stats, and Reminders.
