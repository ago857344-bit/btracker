<svelte:head><title>Settings · BTracker</title></svelte:head>

<script lang="ts">
	import { fade } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import {
		tracker, updateTracker, replaceTracker, celebration,
		setProfileName, setExamDate, setWeeklyGoalHours, setStreakGoalHours
	} from '$lib/stores/tracker';
	import { createInitialTrackerState } from '$lib/state/defaults';
	import { mergeImportedProgress } from '$lib/state/legacy-progress';
	import { importLegacyCode } from '$lib/state/legacy-code';
	import { parseImportedProgress } from '$lib/services/progressImport';
	import { longDateKey } from '$lib/state/dates';
	import { THEME_PRESETS, presetOf } from '$lib/state/themes';
	import type { ThemeId, TrackerState } from '$lib/types/tracker';

	const ACCENTS = ['#6d5dfc', '#e0455a', '#d99a2b', '#2f9e6e', '#2b8ba6', '#8b7bff', '#ff5c8a', '#b44df0'];
	const THEMES = THEME_PRESETS;

	let nameDraft = $tracker.meta.name;
	let confirmClear = false;

	$: if (typeof document !== 'undefined' && $tracker.meta.name !== nameDraft.trim() && document.activeElement?.tagName !== 'INPUT') nameDraft = $tracker.meta.name;

	function commitName() { setProfileName(nameDraft.trim()); }
	function setTheme(id: ThemeId) {
		const accent = presetOf(id).accent;
		updateTracker((s) => {
			s.theme = id;
			s.ui.accent = accent;
		});
	}
	function setAccent(color: string) { updateTracker((s) => { s.ui.accent = color; }); }

	function exportData() {
		const blob = new Blob([JSON.stringify($tracker, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `btracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		celebration.set('Backup exported!');
	}

	function importData(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			input.value = '';
			try {
				const parsed = JSON.parse(String(reader.result)) as Partial<TrackerState>;
				replaceTracker({ ...createInitialTrackerState(), ...parsed });
				celebration.set('Backup restored!');
			} catch { celebration.set('Invalid backup file'); }
		};
		reader.onerror = () => { input.value = ''; celebration.set('Could not read that file'); };
		reader.readAsText(file);
	}

	let legacyCode = '';
	let legacyError = '';

	async function loadCodeFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		legacyError = '';
		try {
			legacyCode = await file.text();
		} catch {
			input.value = '';
			legacyError = 'Could not read that file — pick it again, or paste the code instead.';
			return;
		}
		input.value = '';
		if (!legacyCode.trim()) {
			legacyError = 'That file is empty — pick the .txt the old tracker downloaded.';
			return;
		}
		importCode();
	}

	function importCode() {
		legacyError = '';
		try {
			const input = legacyCode.trim();
			// Saved .txt files can carry wrapper text or NUL bytes (UTF-16 re-saves),
			// so find the "JEE-" marker instead of trusting the first characters.
			const compact = input.replaceAll(/[\s\u0000]+/g, '');
			const jeeAt = compact.startsWith('{') ? -1 : compact.indexOf('JEE-');
			let next: TrackerState;
			if (jeeAt >= 0) {
				// Old save codes predate the library, todos, reflections, sessions and
				// profile — keep whatever this app already holds in those sections.
				next = {
					...importLegacyCode(compact.slice(jeeAt)),
					ui: $tracker.ui, meta: $tracker.meta, lib: $tracker.lib,
					gt: $tracker.gt, todos: $tracker.todos, refl: $tracker.refl, sess: $tracker.sess
				};
			} else {
				next = mergeImportedProgress(parseImportedProgress<Partial<TrackerState>>(input), $tracker);
			}
			replaceTracker(next);
			legacyCode = '';
			celebration.set('Progress imported from old tracker!');
		} catch (error) {
			legacyError = error instanceof Error ? error.message : 'Import failed.';
		}
	}

	function clearAll() {
		replaceTracker(createInitialTrackerState());
		confirmClear = false;
		celebration.set('All data cleared');
	}
</script>

<section class="settings" in:fade={{ duration: 260 }}>
	<header>
		<h1>Settings</h1>
		<p>PROFILE, APPEARANCE &amp; DATA</p>
	</header>

	<div class="panels">
		<div class="panel">
			<h2><NavIcon name="settings" size={15} /> Profile</h2>
			<label class="field">
				<span>USERNAME</span>
				<input type="text" placeholder="Your name" bind:value={nameDraft} on:blur={commitName} />
			</label>
			<label class="field">
				<span>TARGET EXAM DATE</span>
				<input type="date" value={$tracker.meta.exam ?? ''} on:change={(e) => setExamDate(e.currentTarget.value || null)} />
			</label>
			{#if $tracker.meta.exam}
				<p class="hint">Countdown target: {longDateKey($tracker.meta.exam)} · exam at 09:00 AM.</p>
			{/if}
			<div class="row">
				<label class="field">
					<span>WEEKLY GOAL (H)</span>
					<input type="number" min="1" max="500" value={$tracker.meta.weekGoalH} on:change={(e) => setWeeklyGoalHours(Number(e.currentTarget.value))} />
				</label>
				<label class="field">
					<span>STREAK GOAL (H/DAY)</span>
					<input type="number" min="1" max="24" value={$tracker.meta.streakGoalH} on:change={(e) => setStreakGoalHours(Number(e.currentTarget.value))} />
				</label>
			</div>
		</div>

		<div class="panel">
			<h2><NavIcon name="palette" size={15} /> Appearance</h2>
			<p class="label">ACCENT COLOR</p>
			<div class="swatches">
				{#each ACCENTS as color}
					<button type="button" class="swatch" class:on={$tracker.ui.accent === color} style="background: {color}" aria-label="Accent {color}" on:click={() => setAccent(color)}></button>
				{/each}
				<label class="swatch custom" title="Custom color">
					<input type="color" value={$tracker.ui.accent} on:input={(e) => setAccent(e.currentTarget.value)} />
				</label>
			</div>
			<p class="label">THEME</p>
			<div class="themes">
				{#each THEMES as t}
					<button type="button" class="theme" class:on={$tracker.theme === t.id} on:click={() => setTheme(t.id)}>
						<NavIcon name={t.dark ? 'moon' : 'sun'} size={14} /> {t.label}
					</button>
				{/each}
			</div>
			<label class="check">
				<input type="checkbox" checked={$tracker.ui.reducedMotion} on:change={(e) => { const v = e.currentTarget.checked; updateTracker((s) => { s.ui.reducedMotion = v; }); }} />
				<span>Reduce motion</span>
				<small>Tones down transitions and animations.</small>
			</label>
		</div>

		<div class="panel">
			<h2><NavIcon name="shield" size={15} /> Data</h2>
			<p class="muted">Everything lives locally in your browser (IndexedDB). Backups are plain JSON files.</p>
			<div class="data-actions">
				<button type="button" class="btn" on:click={exportData}><NavIcon name="download" size={14} /> Export backup</button>
				<label class="btn"><NavIcon name="save" size={14} /> Import backup<input type="file" accept="application/json,.json" hidden on:change={importData} /></label>
				<button type="button" class="btn danger" on:click={() => (confirmClear = true)}><NavIcon name="trash" size={14} /> Clear all data</button>
			</div>

			<p class="label legacy-label">IMPORT FROM OLD TRACKER</p>
			<p class="muted">Paste the export code from the old site (or open the .txt file it downloaded), then import. Matching sections — syllabus progress, homework, tests, notes, goals — replace the current ones; your profile, to-dos, reflections and sessions stay untouched.</p>
			<textarea
				class="code-area"
				rows="4"
				placeholder="Paste the old tracker's export code here…"
				bind:value={legacyCode}
				on:input={() => (legacyError = '')}
			></textarea>
			{#if legacyError}<p class="warn legacy-error">{legacyError}</p>{/if}
			<div class="legacy-actions">
				<label class="btn"><NavIcon name="save" size={14} /> Open a .txt file<input type="file" accept=".txt,text/plain" hidden on:change={loadCodeFile} /></label>
				<button type="button" class="btn accent" on:click={importCode}><NavIcon name="download" size={14} /> Import code</button>
			</div>
		</div>
	</div>
</section>

<Modal bind:open={confirmClear} title="CLEAR ALL DATA?" width="420px">
	<p class="warn">This permanently deletes every session, task, goal, revision plan and test record from this browser. Export a backup first if you might want it later.</p>
	<svelte:fragment slot="footer">
		<button type="button" class="btn" on:click={() => (confirmClear = false)}>Cancel</button>
		<button type="button" class="btn danger" on:click={clearAll}>Delete everything</button>
	</svelte:fragment>
</Modal>

<style>
	.settings { display: grid; gap: 1.2rem; }
	header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .3rem 0 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .14em; }

	.panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; align-items: start; }
	.panel { padding: 1.3rem 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.panel h2 { display: flex; align-items: center; gap: .5rem; margin: 0 0 1.1rem; font-size: .95rem; font-weight: 800; letter-spacing: -.02em; }
	.panel h2 :global(svg) { color: var(--accent); }

	.field { display: grid; gap: .35rem; margin-bottom: .9rem; }
	.field span, .label { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .09em; }
	.label { display: block; margin: 0 0 .5rem; }
	.field input { padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-canvas); color: var(--text-primary); font-size: .85rem; }
	.field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
	.hint { margin: -.4rem 0 .9rem; color: var(--text-secondary); font-size: .72rem; }

	.swatches { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.1rem; }
	.swatch { width: 32px; height: 32px; border: 2px solid transparent; border-radius: 99px; box-shadow: 0 2px 8px rgb(10 8 26 / 20%); }
	.swatch.on { border-color: var(--text-primary); transform: scale(1.12); }
	.swatch.custom { position: relative; display: grid; place-items: center; background: conic-gradient(#e0455a, #d99a2b, #2f9e6e, #2b8ba6, #6d5dfc, #e0455a); overflow: hidden; }
	.swatch.custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
	.themes { display: flex; gap: .45rem; flex-wrap: wrap; margin-bottom: 1rem; }
	.theme { display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .9rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-secondary); font-size: .76rem; font-weight: 750; }
	.theme.on { color: #fff; border-color: var(--accent); background: var(--accent); }
	.check { display: grid; grid-template-columns: auto 1fr; gap: .15rem .55rem; align-items: center; font-size: .84rem; }
	.check input { width: 17px; height: 17px; accent-color: var(--accent); }
	.check small { grid-column: 2; color: var(--text-secondary); font-size: .7rem; }

	.muted { margin: 0 0 1rem; color: var(--text-secondary); font-size: .78rem; line-height: 1.55; }
	.data-actions { display: grid; gap: .55rem; margin-bottom: 1.2rem; }
	.btn { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; padding: .65rem 1rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-primary); font-size: .82rem; font-weight: 750; cursor: pointer; }
	.btn:hover { border-color: var(--accent); color: var(--accent); }
	.btn.danger:hover { border-color: var(--danger, #e0455a); color: var(--danger, #e0455a); }
	.btn.accent { border-color: var(--accent); background: var(--accent); color: #fff; }
	.btn.accent:hover { color: #fff; filter: brightness(1.08); }
	.warn { margin: 0; color: var(--text-secondary); font-size: .84rem; line-height: 1.6; }

	.legacy-label { margin: 0 0 .5rem; padding-top: 1.1rem; border-top: 1px solid var(--border-subtle); }
	.code-area { width: 100%; box-sizing: border-box; margin: 0 0 .7rem; padding: .65rem .75rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-canvas); color: var(--text-primary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .74rem; line-height: 1.5; resize: vertical; }
	.code-area:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
	.legacy-error { margin: -.2rem 0 .7rem; color: var(--danger, #e0455a); font-size: .76rem; }
	.legacy-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; }
</style>
