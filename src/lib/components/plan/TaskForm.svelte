<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { addPlannerTask } from '$lib/stores/tracker';
	import { TASK_COLORS, SUBJECTS } from '$lib/state/subjects';
	import { parseKey } from '$lib/state/dates';

	export let day: string;

	let title = '';
	let col = 0;
	let st = '';
	let en = '';
	let sub = '';
	let rec: 'once' | 'daily' | 'weekly' = 'once';
	let hrs = 0;
	let test = false;

	$: header = (() => {
		const d = parseKey(day);
		return `+ Add task to ${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${d.getDate()}`;
	})();

	function submit() {
		const name = title.trim();
		if (!name) return;
		addPlannerTask(day, { title: name, col, s: sub, st, en, rec, hrs, test });
		title = '';
		st = ''; en = ''; sub = ''; rec = 'once'; hrs = 0; test = false; col = 0;
	}
</script>

<form class="task-form" on:submit|preventDefault={submit}>
	<p class="form-title">{header}</p>

	<div class="name-row">
		<input type="text" placeholder="Task name..." bind:value={title} aria-label="Task name" />
		<button type="submit" class="add-btn" aria-label="Add task" disabled={!title.trim()}><NavIcon name="plus" size={16} /></button>
	</div>

	<div class="swatches" role="radiogroup" aria-label="Task color">
		{#each TASK_COLORS as color, i}
			<button type="button" class="swatch" class:selected={col === i} style="background: {color}" aria-label="Color {i + 1}" on:click={() => col = i}></button>
		{/each}
	</div>

	<div class="grid2">
		<label><small>Start</small><input type="time" bind:value={st} /></label>
		<label><small>End</small><input type="time" bind:value={en} /></label>
	</div>

	<div class="grid2">
		<label>
			<small>Subject</small>
			<select bind:value={sub}>
				<option value="">No Subject</option>
				{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
			</select>
		</label>
		<label>
			<small>Repeat</small>
			<select bind:value={rec}>
				<option value="once">One-time</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
			</select>
		</label>
	</div>

	<div class="hrs-row">
		<small>Est. hours</small>
		<div class="hrs-chips">
			{#each [2, 4, 6] as h}
				<button type="button" class="chip" class:selected={hrs === h} on:click={() => hrs = hrs === h ? 0 : h}>{h}h</button>
			{/each}
		</div>
	</div>

	<button type="button" class="test-tag" class:selected={test} on:click={() => test = !test}>
		<span class="ring"></span> Tag as scheduled test
	</button>
</form>

<style>
	.task-form { display: grid; gap: .7rem; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel); }
	.form-title { margin: 0; color: var(--text-secondary); font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.name-row { display: flex; gap: .5rem; }
	input[type="text"], input[type="time"], select { width: 100%; height: 38px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .82rem; font-family: inherit; }
	input:focus, select:focus { outline: none; border-color: var(--accent); }
	.add-btn { display: grid; flex: 0 0 38px; place-items: center; border: 0; border-radius: 11px; color: white; background: var(--accent); cursor: pointer; }
	.add-btn:disabled { opacity: .4; cursor: default; }
	.swatches { display: flex; gap: .5rem; }
	.swatch { width: 24px; height: 24px; border: 2px solid transparent; border-radius: 99px; cursor: pointer; transition: transform .12s ease; }
	.swatch.selected { border-color: var(--text-primary); transform: scale(1.12); }
	.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; }
	.grid2 label, .hrs-row { display: grid; gap: .3rem; }
	.grid2 small, .hrs-row small { color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.hrs-chips { display: flex; gap: .4rem; }
	.chip { height: 30px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 700; cursor: pointer; }
	.chip.selected { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	.test-tag { display: flex; align-items: center; gap: .5rem; height: 36px; padding: 0 .7rem; border: 1px dashed var(--border-subtle); border-radius: 11px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 700; letter-spacing: .03em; cursor: pointer; }
	.test-tag .ring { width: 13px; height: 13px; border: 1.6px solid currentColor; border-radius: 99px; }
	.test-tag.selected { color: var(--accent); border-color: var(--accent); border-style: solid; background: var(--accent-soft); }
</style>
