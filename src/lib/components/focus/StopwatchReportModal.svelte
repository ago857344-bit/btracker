<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import type { StopwatchReport } from '$lib/stores/tracker';
	import { subjectColor, subjectName } from '$lib/state/subjects';

	export let open = false;
	export let report: StopwatchReport | null = null;

	const dispatch = createEventDispatcher<{ save: StopwatchReport }>();

	let done = 0; let correct = 0; let mistakes = 0; let saved = false;
	$: if (open && report) { done = report.done; correct = report.correct; mistakes = report.mistakes; saved = false; }
	$: accuracy = done ? Math.round((correct / done) * 100) : 0;
	$: stamp = report ? new Date(report.at) : null;
	$: dateLabel = stamp ? `${stamp.getMonth() + 1}/${stamp.getDate()}/${stamp.getFullYear()}, ${stamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : '';
	$: totalLabel = report ? `${Math.floor(report.seconds / 60)}m ${report.seconds % 60}s` : '';

	function save() {
		if (!report) return;
		dispatch('save', { ...report, done, correct, mistakes });
		saved = true;
		setTimeout(() => { if (saved) open = false; }, 700);
	}
</script>

<Modal bind:open title="STOPWATCH REPORT" width="440px">
	{#if report && stamp}
		<div class="head">
			<span class="icon"><NavIcon name="history" size={17} /></span>
			<div>
				<p class="sub-row">
					<span class="dot" style="background: {subjectColor(report.sub)}"></span>
					{subjectName(report.sub)} · {report.kind === 'questions' ? 'Questions' : report.kind === 'revision' ? 'Revision' : 'Theory'}
				</p>
				<b>{dateLabel}</b>
			</div>
		</div>

		<div class="stats">
			<div><span>TOTAL TIME</span><b>{totalLabel}</b></div>
			<div><span>ACCURACY</span><b class="green">{accuracy}%</b></div>
		</div>

		<div class="steppers">
			<label>
				<span>DONE</span>
				<div class="stepper">
					<button type="button" on:click={() => (done = Math.max(0, done - 1))}>−</button>
					<b>{done}</b>
					<button type="button" on:click={() => (done += 1)}>+</button>
				</div>
			</label>
			<label>
				<span>CORRECT</span>
				<div class="stepper">
					<button type="button" on:click={() => (correct = Math.min(done, Math.max(0, correct - 1)))}>−</button>
					<b class="green">{correct}</b>
					<button type="button" on:click={() => (correct = Math.min(done + 10, correct + 1))}>+</button>
				</div>
			</label>
			<label>
				<span>MISTAKES</span>
				<div class="stepper">
					<button type="button" on:click={() => (mistakes = Math.max(0, mistakes - 1))}>−</button>
					<b class="red">{mistakes}</b>
					<button type="button" on:click={() => (mistakes += 1)}>+</button>
				</div>
			</label>
		</div>

		<button type="button" class="save" class:saved on:click={save}>{saved ? 'Saved!' : 'Save Report'}</button>
		<p class="brand">BTRACKER.APP</p>
	{/if}
</Modal>

<style>
	.head { display: flex; align-items: center; gap: .8rem; }
	.icon { display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 42px; border-radius: 13px; color: var(--accent); background: var(--accent-soft); }
	.sub-row { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--text-secondary); font-size: .72rem; font-weight: 750; }
	.dot { width: 9px; height: 9px; border-radius: 99px; }
	.head b { font-size: .95rem; letter-spacing: -.02em; }
	.stats { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin: 1.1rem 0; }
	.stats div { display: grid; gap: .2rem; padding: .75rem .85rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-canvas); }
	.stats span { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .09em; }
	.stats b { font-size: 1.2rem; font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
	.green { color: var(--success, #2f9e6e); }
	.red { color: var(--danger, #e0455a); }
	.steppers { display: grid; gap: .6rem; }
	.steppers label { display: flex; align-items: center; justify-content: space-between; gap: .6rem; padding: .55rem .8rem; border: 1px solid var(--border-subtle); border-radius: 12px; }
	.steppers span { color: var(--text-secondary); font-size: .66rem; font-weight: 800; letter-spacing: .09em; }
	.stepper { display: flex; align-items: center; gap: .7rem; }
	.stepper button { width: 28px; height: 28px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: var(--surface-panel); font-size: 1rem; line-height: 1; }
	.stepper button:hover { color: var(--accent); border-color: var(--accent); }
	.stepper b { min-width: 28px; text-align: center; font-size: 1rem; font-variant-numeric: tabular-nums; }
	.save { width: 100%; margin-top: 1.1rem; padding: .8rem; border: 0; border-radius: 13px; color: #fff; background: var(--accent); font-size: .9rem; font-weight: 800; letter-spacing: .02em; box-shadow: 0 8px 18px color-mix(in srgb, var(--accent), transparent 66%); }
	.save.saved { background: var(--success, #2f9e6e); box-shadow: none; }
	.brand { margin: .8rem 0 0; text-align: center; color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .18em; }
</style>
