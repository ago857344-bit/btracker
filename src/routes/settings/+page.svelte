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
		input.value = '';
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const parsed = JSON.parse(String(reader.result)) as Partial<TrackerState>;
				replaceTracker({ ...createInitialTrackerState(), ...parsed });
				celebration.set('Backup restored!');
			} catch { celebration.set('Invalid backup file'); }
		};
		reader.readAsText(file);
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
	.data-actions { display: grid; gap: .55rem; }
	.btn { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; padding: .65rem 1rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-primary); font-size: .82rem; font-weight: 750; cursor: pointer; }
	.btn:hover { border-color: var(--accent); color: var(--accent); }
	.btn.danger:hover { border-color: var(--danger, #e0455a); color: var(--danger, #e0455a); }
	.warn { margin: 0; color: var(--text-secondary); font-size: .84rem; line-height: 1.6; }
</style>
