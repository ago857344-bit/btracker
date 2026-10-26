<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { SUBJECTS, chaptersOf, subjectName } from '$lib/state/subjects';
	import { UNIVERSAL_SOURCES, universalSourceOf } from '$lib/state/coaching';
	import { logUniversalSession } from '$lib/stores/tracker';
	import { celebration } from '$lib/stores/tracker';
	import { uiClick } from '$lib/utils/feedback';
	import type { UniversalSource } from '$lib/types/tracker';

	export let open = false;
	export let initialSubject = 'P';

	const CUSTOM = '__custom__';
	const LABEL_SUGGESTIONS = ['Ex 1', 'Ex 2', 'Level 2', 'DPP #4', 'Module 3', 'Test 5'];
	const dispatch = createEventDispatcher<{ logged: { solved: number } }>();

	let subject = initialSubject;
	let chapterPick = chaptersOf(subject)[0] ?? CUSTOM;
	let customChapter = '';
	let source: UniversalSource = 'coaching';
	let sourceName = '';
	let label = '';
	let attempted = 20;
	let solved = 16;
	let doubts = 2;
	let previousOpen = false;

	$: chapterOptions = chaptersOf(subject);
	$: if (chapterPick !== CUSTOM && !chapterOptions.includes(chapterPick)) {
		chapterPick = chapterOptions[0] ?? CUSTOM;
	}
	$: sourceMeta = universalSourceOf(source);
	$: attemptedCount = Math.max(0, Math.round(Number(attempted) || 0));
	$: solvedCount = Math.min(attemptedCount, Math.max(0, Math.round(Number(solved) || 0)));
	$: doubtCount = Math.min(solvedCount, Math.max(0, Math.round(Number(doubts) || 0)));
	$: chapterName = chapterPick === CUSTOM ? customChapter.trim() : chapterPick;
	$: accuracy = attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0;
	$: canSave = attemptedCount > 0 && chapterName.length > 0;

	$: if (open && !previousOpen) {
		resetForm();
		previousOpen = true;
	}
	$: if (!open) previousOpen = false;

	function resetForm() {
		subject = SUBJECTS.some((s) => s.code === initialSubject) ? initialSubject : 'P';
		chapterPick = chaptersOf(subject)[0] ?? CUSTOM;
		customChapter = '';
		source = 'coaching';
		sourceName = '';
		label = '';
		attempted = 20;
		solved = 16;
		doubts = 2;
	}

	function save() {
		if (!canSave) return;
		logUniversalSession({
			sub: subject,
			ch: chapterName,
			source,
			sourceName,
			label,
			att: attemptedCount,
			solved: solvedCount,
			doubt: doubtCount
		});
		uiClick();
		celebration.set(`${solvedCount} question${solvedCount === 1 ? '' : 's'} logged · ${subjectName(subject)}`);
		dispatch('logged', { solved: solvedCount });
		open = false;
	}
</script>

<Modal bind:open title="Log a study session" width="620px">
	<div class="entry-form">
		<div class="field-block">
			<span class="field-label">SUBJECT</span>
			<div class="subject-tabs">
				{#each SUBJECTS as sub}
					<button
						type="button"
						class="subject-tab"
						class:active={subject === sub.code}
						style="--c: {sub.color}"
						on:click={() => (subject = sub.code)}
					>
						<NavIcon name={sub.icon} size={15} />
						<span>{sub.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="field-block">
			<span class="field-label">CHAPTER</span>
			<select class="select" bind:value={chapterPick} aria-label="Chapter">
				{#each chapterOptions as chapter}
					<option value={chapter}>{chapter}</option>
				{/each}
				<option value={CUSTOM}>Other / Custom chapter</option>
			</select>
			{#if chapterPick === CUSTOM}
				<input
					class="text-input"
					type="text"
					bind:value={customChapter}
					placeholder="Type your chapter or topic name"
				/>
			{/if}
		</div>

		<div class="field-block">
			<span class="field-label">SOURCE</span>
			<div class="source-chips">
				{#each UNIVERSAL_SOURCES as option}
					<button
						type="button"
						class="source-chip"
						class:active={source === option.id}
						on:click={() => (source = option.id)}
						title={option.hint}
					>
						{option.label}
					</button>
				{/each}
			</div>
			<input
				class="text-input"
				type="text"
				bind:value={sourceName}
				placeholder={sourceMeta.hint}
			/>
		</div>

		<div class="field-block">
			<div class="label-row">
				<span class="field-label">LABEL</span>
				<span class="optional">optional</span>
			</div>
			<input class="text-input" type="text" bind:value={label} placeholder="e.g. Ex 1, Level 2, DPP #4" />
			<div class="label-chips">
				{#each LABEL_SUGGESTIONS as suggestion}
					<button type="button" class="label-chip" class:active={label === suggestion} on:click={() => (label = suggestion)}>
						{suggestion}
					</button>
				{/each}
			</div>
		</div>

		<div class="counts">
			<label class="count-field">
				<span class="field-label">ATTEMPTED</span>
				<input class="num-input" type="number" min="0" bind:value={attempted} />
			</label>
			<label class="count-field">
				<span class="field-label">SOLVED</span>
				<input class="num-input" type="number" min="0" bind:value={solved} />
			</label>
			<label class="count-field">
				<span class="field-label">DOUBTS</span>
				<input class="num-input" type="number" min="0" bind:value={doubts} />
			</label>
			<div class="accuracy">
				<span class="field-label">ACCURACY</span>
				<b>{accuracy}%</b>
			</div>
		</div>

		<p class="form-note">
			Solved counts feed your dashboard heatmap, streak charts and subject totals instantly.
		</p>
	</div>

	<svelte:fragment slot="footer">
		<button type="button" class="btn-cancel" on:click={() => (open = false)}>Cancel</button>
		<button type="button" class="btn-save" disabled={!canSave} on:click={save}>
			<NavIcon name="check" size={14} />
			Log {solvedCount} solved
		</button>
	</svelte:fragment>
</Modal>

<style>
	.entry-form { display: grid; gap: 1rem; }
	.field-block { display: grid; gap: .45rem; }
	.field-label { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .09em; }
	.label-row { display: flex; align-items: center; justify-content: space-between; }
	.optional { color: var(--text-secondary); font-size: .66rem; font-weight: 650; opacity: .8; }
	.subject-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .45rem; }
	.subject-tab {
		display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
		padding: .6rem .5rem; border-radius: 12px; border: 1px solid var(--border-subtle);
		background: var(--surface-subtle); color: var(--text-secondary); font-family: inherit;
		font-size: .8rem; font-weight: 700; cursor: pointer; transition: all .16s ease;
	}
	.subject-tab:hover { border-color: var(--c); color: var(--c); }
	.subject-tab.active { border-color: var(--c); background: color-mix(in srgb, var(--c) 13%, var(--surface-panel)); color: var(--c); box-shadow: 0 0 0 1px var(--c); }
	.select, .text-input, .num-input {
		width: 100%; box-sizing: border-box; padding: .62rem .8rem; border: 1px solid var(--border-subtle);
		border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary);
		font-family: inherit; font-size: .86rem; outline: none; transition: border-color .16s ease;
	}
	.select:focus, .text-input:focus, .num-input:focus { border-color: var(--accent); }
	.source-chips, .label-chips { display: flex; flex-wrap: wrap; gap: .4rem; }
	.source-chip, .label-chip {
		padding: .36rem .7rem; border-radius: 99px; border: 1px solid var(--border-subtle);
		background: var(--surface-subtle); color: var(--text-secondary); font-family: inherit;
		font-size: .74rem; font-weight: 650; cursor: pointer; transition: all .15s ease;
	}
	.source-chip:hover, .label-chip:hover { border-color: var(--accent); color: var(--text-primary); }
	.source-chip.active, .label-chip.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); }
	.counts { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: .55rem; align-items: end; }
	.count-field { display: grid; gap: .4rem; }
	.accuracy { display: grid; gap: .2rem; padding: .42rem .7rem; border-radius: 11px; background: color-mix(in srgb, var(--accent) 10%, var(--surface-subtle)); border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-subtle)); text-align: center; }
	.accuracy b { color: var(--accent); font-size: 1rem; letter-spacing: -.02em; }
	.form-note { margin: .1rem 0 0; color: var(--text-secondary); font-size: .7rem; line-height: 1.45; }
	.btn-cancel, .btn-save {
		display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
		padding: .62rem 1rem; border-radius: 11px; font-family: inherit; font-size: .82rem; font-weight: 700; cursor: pointer;
	}
	.btn-cancel { border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary); }
	.btn-cancel:hover { color: var(--text-primary); border-color: var(--text-secondary); }
	.btn-save { border: none; background: var(--accent); color: var(--accent-contrast, #fff); }
	.btn-save:hover { filter: brightness(1.08); }
	.btn-save:disabled { opacity: .45; cursor: not-allowed; filter: none; }
	@media (max-width: 640px) {
		.counts { grid-template-columns: 1fr 1fr; }
		.accuracy { grid-column: span 2; }
	}
</style>
