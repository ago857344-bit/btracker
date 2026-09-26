<script lang="ts">
	import { onDestroy } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { setExamDate, tracker } from '$lib/stores/tracker';
	import { longDateKey } from '$lib/state/dates';

	let examInput = '';
	let now = Date.now();
	const tick = setInterval(() => now = Date.now(), 1000);
	onDestroy(() => clearInterval(tick));

	$: exam = $tracker.meta.exam;
	$: remaining = exam ? Math.max(0, new Date(`${exam}T09:00:00`).getTime() - now) : 0;
	$: dd = Math.floor(remaining / 86400000);
	$: hh = Math.floor((remaining % 86400000) / 3600000);
	$: mm = Math.floor((remaining % 3600000) / 60000);
	$: ss = Math.floor((remaining % 60000) / 1000);
	const pad = (n: number) => String(n).padStart(2, '0');

	function setTarget() {
		if (!examInput) return;
		setExamDate(examInput);
		examInput = '';
	}
</script>

<div class="target">
	{#if exam}
		<p class="lead">Target exam · {longDateKey(exam)}</p>
		<div class="countdown" aria-live="off">
			{#each [[dd, 'Days'], [hh, 'Hrs'], [mm, 'Min'], [ss, 'Sec']] as [value, label]}
				<span class="unit">
					<b>{pad(Number(value))}</b>
					<small>{label}</small>
				</span>
			{/each}
		</div>
		<div class="row">
			<input type="date" bind:value={examInput} aria-label="New exam date" />
			<button type="button" class="set" on:click={setTarget} disabled={!examInput}>Update</button>
			<button type="button" class="clear" on:click={() => setExamDate(null)} aria-label="Remove exam date"><NavIcon name="x" size={13} /></button>
		</div>
	{:else}
		<div class="configure">
			<NavIcon name="target" size={18} />
			<p>Configure your target exam date to start the countdown.</p>
			<div class="row">
				<input type="date" bind:value={examInput} aria-label="Exam date" />
				<button type="button" class="set" on:click={setTarget} disabled={!examInput}>Set target</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.target { display: grid; gap: .75rem; height: 100%; align-content: start; }
	.lead { margin: 0; color: var(--text-secondary); font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.countdown { display: flex; gap: .5rem; }
	.unit { display: grid; gap: .15rem; justify-items: center; flex: 1; padding: .6rem .2rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.unit b { font-size: 1.45rem; font-weight: 850; letter-spacing: -.04em; line-height: 1; color: var(--accent); font-variant-numeric: tabular-nums; }
	.unit small { color: var(--text-secondary); font-size: .56rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.row { display: flex; gap: .45rem; align-items: center; }
	input[type="date"] { flex: 1; height: 34px; padding: 0 .6rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-subtle); color: var(--text-primary); font-size: .76rem; font-family: inherit; }
	input:focus { outline: none; border-color: var(--accent); }
	.set { height: 34px; padding: 0 .8rem; border: 0; border-radius: 10px; background: var(--accent); color: white; font-size: .74rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.set:disabled { opacity: .45; cursor: default; }
	.clear { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); cursor: pointer; }
	.clear:hover { color: var(--danger); border-color: var(--danger); }
	.configure { display: grid; gap: .6rem; justify-items: center; padding: 1.1rem .9rem; border: 1.6px dashed var(--border-subtle); border-radius: 14px; color: var(--text-secondary); text-align: center; }
	.configure p { margin: 0; font-size: .76rem; line-height: 1.5; }
	.configure .row { width: 100%; }
</style>
