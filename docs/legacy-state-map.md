# BTracker v2.9 → BTracker Next state map

Phase 1 keeps the original data keys at the persistence boundary. This makes the importer reversible and prevents silent loss while individual screens are rebuilt.

| Legacy field | Next responsibility | Destination sections |
| --- | --- | --- |
| `d`, `n`, `r` | Question bitmasks, notes, error/review records | Mastery, Plan, Revise, Stats |
| `x` | User-created syllabus data, renames, counts, tags and activities | Mastery, settings |
| `h`, `hd`, `hwSort` | Active/completed homework, backlog and tasks | Plan, Home |
| `log`, `stat`, `norec` | Focus-session log, daily solved counts, catch-up switch | Focus, Stats |
| `marks`, `an` | Custom mark sheets and detailed test analysis | Tests |
| `dl`, `goals` | Deadlines and daily/weekly/monthly/range targets | Plan, Home, Reminders |
| `col`, `bm`, `notes` | Collections, saved questions and standalone notes | Plan, Mastery |
| `rev` | Revision freshness, roulette weights and repeating reminders | Revise, Reminders |
| `theme`, `pom` | Appearance and Pomodoro/Endless/Speedrun settings | Settings, Focus |

New fields are isolated under `ui`: widget composition, accent selection and motion preference. They never alter imported academic data.

The original compact save format (`JEE-...`, v1 through v3) is decoded in `src/lib/state/legacy-code.ts`; this requires no browser execution of the legacy file. Rust saves the full document atomically in the desktop app. The browser-development fallback is IndexedDB, never `localStorage`.

## Phase 2 navigation map

The application shell now maps the legacy features into the target navigation: **Home** (dashboard), **Plan** (homework, tasks, goals and deadlines), **Focus** (study timer), **Revise** (revision and roulette), **Tests** (marks and analysis), **Mastery** (syllabus tree), **Friends** (future social accountability), **Stats** (historic reporting), and **Reminders** (deadline and revision notification hub). Settings is a utility route for themes, import/export, and preferences.
