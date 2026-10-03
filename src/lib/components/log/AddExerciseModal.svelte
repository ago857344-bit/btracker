<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import { addCustomExercise } from '$lib/stores/tracker';
	import type { SyllabusSubject, SyllabusChapter } from '$lib/state/syllabus';
	import { createEventDispatcher } from 'svelte';
	import { uiClick, uiSuccess } from '$lib/utils/feedback';

	export let subject: SyllabusSubject;
	export let chapter: SyllabusChapter;

	const dispatch = createEventDispatcher<{ close: void }>();

	let exName = '';
	let exCount = '';
	let error = '';

	function save() {
		const name = exName.trim();
		if (!name) {
			error = 'Please enter a name for the exercise.';
			return;
		}
		const count = parseInt(exCount, 10);
		if (isNaN(count) || count < 1) {
			error = 'Please enter a valid number of questions (at least 1).';
			return;
		}
		
		addCustomExercise(subject.code, chapter.no, name, count);
		uiSuccess();
		dispatch('close');
	}

	function close() {
		uiClick();
		dispatch('close');
	}
</script>

<Modal open={true} title="Add Custom Exercise" width="400px" on:close={close}>
	<div class="desc">
		Create a new exercise category for {chapter.name} (e.g. "Mock Test", "DPP", "Module").
	</div>
	
	<div class="form">
		<label>
			<span>Exercise Name</span>
			<input type="text" bind:value={exName} placeholder="e.g. Resonance DPP" autofocus />
		</label>
		<label>
			<span>Number of Questions</span>
			<input type="number" min="1" max="2000" bind:value={exCount} placeholder="e.g. 30" />
		</label>
	</div>

	{#if error}<p class="err">{error}</p>{/if}

	<div class="footer">
		<button type="button" class="btn-cancel" on:click={close}>Cancel</button>
		<button type="button" class="btn-done" on:click={save}>Add Exercise</button>
	</div>
</Modal>

<style>
	.desc { margin-bottom: 1.2rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4; }
	.form { display: flex; flex-direction: column; gap: 1rem; }
	label { display: flex; flex-direction: column; gap: 0.35rem; }
	label span { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
	input { width: 100%; padding: 0.75rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-panel); color: var(--text-primary); font-size: 0.95rem; }
	input:focus { border-color: var(--accent); outline: none; }
	
	.err { margin-top: 0.8rem; color: var(--danger, #ef4444); font-size: 0.8rem; font-weight: 600; }

	.footer { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; }
	.btn-cancel { padding: 0.5rem 1.25rem; background: transparent; color: var(--text-secondary); border: none; font-weight: 600; cursor: pointer; }
	.btn-cancel:hover { color: var(--text-primary); }
	.btn-done { padding: 0.5rem 1.25rem; background: var(--accent); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
</style>
