<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { addSubjectSession, plannerPrompt, tracker } from '$lib/stores/tracker';
	import { chaptersOf, subjectColor, subjectName } from '$lib/state/subjects';
	import { longDateKey } from '$lib/state/dates';

	export let open = false;
	export let sub = 'P';

	let tab: 'add' | 'past' = 'add';
	let chapter = '';
	let att = 10;
	let cor = 0;

	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? Math.round(value) : min));

	$: chapters = chaptersOf(sub);
	$: if (!chapters.includes(chapter)) chapter = chapters[0] ?? '';
	$: past = $tracker.sess.filter((entry) => entry.sub === sub);
	$: color = subjectColor(sub);

	function save() {
		if (!chapter) return;
		addSubjectSession({ sub, ch: chapter, att: Math.max(0, att), cor: Math.min(Math.max(0, cor), Math.max(0, att)) });
		if (att > 0 && cor / att < 0.5) plannerPrompt.set(`Practice ${subjectName(sub)} — ${chapter}`);
		att = 10; cor = 0;
		tab = 'past';
	}
</script>

<Modal bind:open title="{subjectName(sub)} Hub" width="520px">
	<div class="hub" style="--sub: {color}">
		<div class="tabs">
			<button type="button" class:selected={tab === 'add'} on:click={() => tab = 'add'}>Add session</button>
			<button type="button" class:selected={tab === 'past'} on:click={() => tab = 'past'}>Past sessions <em>{past.length}</em></button>
		</div>

		{#if tab === 'add'}
			<label class="field"><small>Chapter</small>
				<select bind:value={chapter}>
					{#each chapters as ch}<option value={ch}>{ch}</option>{/each}
				</select>
			</label>
			<div class="steppers">
				<div class="stepper">
					<small>Attempted</small>
					<div class="step-row">
						<button type="button" aria-label="Decrease attempted" on:click={() => att = Math.max(0, att - 1)}><NavIcon name="minus" size={13} /></button>
						<input type="number" min="0" max="2000" inputmode="numeric" aria-label="Questions attempted" value={att} on:input={(e) => (att = clamp(Number(e.currentTarget.value), 0, 2000))} on:change={(e) => (att = clamp(Number(e.currentTarget.value), 0, 2000))} />
						<button type="button" aria-label="Increase attempted" on:click={() => att += 1}><NavIcon name="plus" size={13} /></button>
					</div>
				</div>
				<div class="stepper">
					<small>Correct</small>
					<div class="step-row">
						<button type="button" aria-label="Decrease correct" on:click={() => cor = Math.max(0, cor - 1)}><NavIcon name="minus" size={13} /></button>
						<input type="number" min="0" max={att} inputmode="numeric" aria-label="Questions correct" value={cor} on:input={(e) => (cor = clamp(Number(e.currentTarget.value), 0, att))} on:change={(e) => (cor = clamp(Number(e.currentTarget.value), 0, att))} />
						<button type="button" aria-label="Increase correct" on:click={() => cor = Math.min(att, cor + 1)}><NavIcon name="plus" size={13} /></button>
					</div>
				</div>
			</div>
			<p class="acc">Accuracy: <b>{att ? Math.round((cor / att) * 100) : 0}%</b></p>
			<button type="button" class="save" style="background: {color}" on:click={save}>Save session</button>
		{:else}
			{#if past.length}
				<ul class="past-list">
					{#each past as entry (entry.id)}
						<li>
							<span class="dot" style="background: {color}"></span>
							<div><b>{entry.ch}</b><small>{longDateKey(entry.day)} · {entry.att} QS · {entry.att ? Math.round((entry.cor / entry.att) * 100) : 0}% correct</small></div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="none">No {subjectName(sub)} sessions logged yet. Use “Add session” after your next practice block.</p>
			{/if}
		{/if}
	</div>
</Modal>

<style>
	.hub { display: grid; gap: .85rem; }
	.tabs { display: inline-flex; gap: .25rem; justify-self: start; padding: .25rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.tabs button { display: inline-flex; align-items: center; gap: .4rem; height: 30px; padding: 0 .8rem; border: 0; border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.tabs button em { font-style: normal; opacity: .65; }
	.tabs button.selected { color: var(--sub); background: var(--surface-panel); box-shadow: 0 4px 10px rgb(10 8 26 / 10%); }
	.field { display: grid; gap: .3rem; }
	small { color: var(--text-secondary); font-size: .64rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	select { height: 38px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .82rem; font-family: inherit; }
	select:focus { outline: none; border-color: var(--sub); }
	.steppers { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
	.stepper { display: grid; gap: .35rem; padding: .75rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.step-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
	.step-row button { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-secondary); cursor: pointer; }
	.step-row button:hover { color: var(--sub); border-color: var(--sub); }
	.step-row input { width: 100%; min-width: 0; height: 34px; padding: 0 .4rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-primary); font-size: 1.05rem; font-weight: 700; letter-spacing: -.02em; text-align: center; -moz-appearance: textfield; appearance: textfield; }
	.step-row input:focus { outline: none; border-color: var(--sub); }
	.step-row input::-webkit-outer-spin-button, .step-row input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
	.acc { margin: 0; color: var(--text-secondary); font-size: .78rem; }
	.acc b { color: var(--text-primary); }
	.save { height: 40px; border: 0; border-radius: 12px; color: white; font-size: .82rem; font-weight: 800; letter-spacing: .03em; cursor: pointer; font-family: inherit; }
	.past-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; max-height: 300px; overflow: auto; }
	.past-list li { display: flex; align-items: center; gap: .6rem; padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.past-list .dot { width: 9px; height: 9px; border-radius: 99px; }
	.past-list b { display: block; font-size: .78rem; }
	.past-list small { text-transform: none; letter-spacing: 0; font-weight: 600; font-size: .68rem; }
	.none { margin: 0; color: var(--text-secondary); font-size: .8rem; line-height: 1.6; }
</style>
