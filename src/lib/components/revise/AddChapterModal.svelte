<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { celebration } from '$lib/stores/tracker';
	import { addChapterToRecall } from '$lib/stores/recall-actions';
	import { SUBJECTS, chaptersOf, SPACING_METHODS } from '$lib/state/subjects';
	
	const dispatch = createEventDispatcher<{ close: void }>();

	export let open = false;

	let sub = 'P';
	let ch = '';
	let method: 'steady' | 'fast' | 'smart' = 'steady';
	let weightage: 1 | 2 | 3 = 2;

	$: chapters = chaptersOf(sub);
	$: if (sub && !chapters.includes(ch)) ch = '';


	function submit() {
		if (!sub || !ch) return;
		
		addChapterToRecall(`${sub}-${ch}`, weightage);
		celebration.set('Chapter added to active recall!');
		dispatch('close');
		ch = '';
	}
</script>

<Modal open={open} title="ADD CHAPTER TO PLANNER" width="760px" on:close={() => dispatch('close')}>
	<div class="cols">
		<div class="form">
			<label class="field">
				<span>SUBJECT</span>
				<select bind:value={sub}>
					{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
				</select>
			</label>
			<label class="field">
				<span>CHAPTER</span>
				<select bind:value={ch}>
					<option value="" disabled>Select a chapter…</option>
					{#each chapters as c}<option value={c}>{c}</option>{/each}
				</select>
			</label>

			<label class="field">
				<span>HIGH-YIELD WEIGHTAGE</span>
				<select bind:value={weightage}>
					<option value={3}>★★★ High Yield (Core JEE Topic)</option>
					<option value={2}>★★☆ Medium Yield (Standard Topic)</option>
					<option value={1}>★☆☆ Low Yield (Quick Review)</option>
				</select>
			</label>

			<p class="label">SPACING METHOD</p>
			<div class="methods">
				{#each SPACING_METHODS as m}
					<button type="button" class="method" class:selected={method === m.id} style="--m: {m.color}" on:click={() => (method = m.id)}>
						<span class="m-head">{m.emoji} {m.name}{#if method === m.id}<b class="sel">Selected ✓</b>{/if}</span>
						<span class="m-preview">{m.preview}</span>
					</button>
				{/each}
			</div>

			<div class="actions">
				<button type="button" class="btn ghost" on:click={() => dispatch('close')}>Cancel</button>
				<button type="button" class="btn solid" disabled={!ch} on:click={submit}>Add to Active Recall</button>
			</div>
		</div>

		<aside class="how">
			<h4>HOW IT WORKS</h4>
			<p class="how-sub">Choose Your Spacing Style</p>
			{#each SPACING_METHODS as m}
				<div class="how-card" class:selected={method === m.id} style="--m: {m.color}">
					<b>{m.emoji} {m.name}</b>
					<span class="formula">{m.formula}</span>
					<p>{m.blurb}</p>
					{#if m.intervals}
						<div class="tiles">
							{#each m.intervals as days, i}
								<div class="tile"><small>{['1st', '2nd', '3rd', '4th'][i]}</small><b>{days}d</b></div>
							{/each}
						</div>
					{:else}
						<div class="sm2">
							<span>Recall well → longer gap</span>
							<span>Struggle → resets to day 1</span>
						</div>
					{/if}
				</div>
			{/each}
		</aside>
	</div>
</Modal>

<style>
	.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.2rem; }
	.field { display: grid; gap: .35rem; margin-bottom: .9rem; }
	.field span, .label { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .09em; }
	.field select { padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-primary); font-size: .85rem; }
	.label { display: block; margin: 0 0 .5rem; }
	.methods { display: grid; gap: .5rem; margin-bottom: 1.1rem; }
	.method { display: grid; gap: .2rem; padding: .7rem .85rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-panel); text-align: left; transition: border-color .16s ease, box-shadow .16s ease; }
	.method.selected { border-color: var(--m); outline: 3px solid color-mix(in srgb, var(--m), transparent 75%) !important; outline-offset: 1px; }
	.m-head { display: flex; align-items: center; gap: .4rem; font-size: .84rem; font-weight: 750; }
	.sel { margin-left: auto; color: var(--m); font-size: .66rem; font-weight: 800; letter-spacing: .05em; }
	.m-preview { color: var(--text-secondary); font-size: .7rem; }
	.actions { display: flex; justify-content: flex-end; gap: .55rem; }
	.btn { padding: .62rem 1.2rem; border-radius: 11px; border: 1px solid transparent; font-size: .84rem; font-weight: 750; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: var(--surface-panel); }
	.btn.solid { color: #fff; background: var(--accent); }
	.btn.solid:disabled { opacity: .45; }

	.how { padding: 1rem; border: 1px dashed var(--border-subtle); border-radius: 16px; background: var(--surface-subtle); }
	.how h4 { margin: 0; font-size: .66rem; font-weight: 800; letter-spacing: .12em; color: var(--text-secondary); }
	.how-sub { margin: .25rem 0 .8rem; font-size: .95rem; font-weight: 800; letter-spacing: -.02em; }
	.how-card { display: grid; gap: .3rem; margin-bottom: .7rem; padding: .75rem .85rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-panel); }
	.how-card.selected { border-color: var(--m); }
	.how-card b { font-size: .82rem; }
	.formula { color: var(--m); font-size: .66rem; font-weight: 800; letter-spacing: .04em; }
	.how-card p { margin: 0; color: var(--text-secondary); font-size: .72rem; line-height: 1.55; }
	.tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: .35rem; margin-top: .35rem; }
	.tile { display: grid; gap: .1rem; justify-items: center; padding: .4rem .2rem; border-radius: 9px; background: color-mix(in srgb, var(--m), transparent 90%); }
	.tile small { color: var(--text-secondary); font-size: .56rem; font-weight: 800; }
	.tile b { color: var(--m); font-size: .78rem; }
	.sm2 { display: grid; gap: .25rem; margin-top: .35rem; }
	.sm2 span { padding: .4rem .55rem; border-radius: 9px; background: color-mix(in srgb, var(--m), transparent 90%); color: var(--text-secondary); font-size: .68rem; font-weight: 700; }
	@media (max-width: 720px) { .cols { grid-template-columns: minmax(0, 1fr); } }
</style>
