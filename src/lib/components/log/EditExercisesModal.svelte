<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import { tracker, setQuestionCount } from '$lib/stores/tracker';
	import { EXERCISE_DEFS, cellKey, questionCount } from '$lib/state/syllabus';
	import type { SyllabusSubject, SyllabusChapter } from '$lib/state/syllabus';
	import { createEventDispatcher } from 'svelte';
	import { uiClick, uiSuccess } from '$lib/utils/feedback';

	export let subject: SyllabusSubject;
	export let chapter: SyllabusChapter;

	const dispatch = createEventDispatcher<{ close: void }>();

	// We load the current *effective* counts for all standard exercises.
	let counts: Record<string, number> = {};

	$: {
		for (const def of EXERCISE_DEFS) {
			const chEx = chapter.exs.find(e => e.code === def.code);
			const base = chEx ? chEx.base : 0;
			const override = $tracker.x.cnt[cellKey(subject.code, chapter.no, def.code)];
			counts[def.code] = override !== undefined ? override : base;
		}
	}

	function save(code: string, countStr: string) {
		const parsed = parseInt(countStr, 10);
		if (isNaN(parsed) || parsed < 0) return;
		setQuestionCount({ sc: subject.code, ch: chapter.no, ex: code }, parsed);
	}

	function close() {
		uiClick();
		dispatch('close');
	}
</script>

<Modal open={true} title="Edit Exercises" on:close={close}>
	<div class="desc">
		Set the number of questions for any exercise. Set to 0 to hide it.
	</div>
	
	<div class="ex-list">
		{#each EXERCISE_DEFS as def}
			<label class="ex-row">
				<div class="ex-info">
					<b>{def.name}</b>
					<small>{def.tag}</small>
				</div>
				<input 
					type="number" 
					min="0" 
					max="2000"
					value={counts[def.code]}
					on:change={(e) => save(def.code, e.currentTarget.value)}
					on:blur={(e) => save(def.code, e.currentTarget.value)}
				/>
			</label>
		{/each}
	</div>

	<div class="footer">
		<button type="button" class="btn-done" on:click={close}>Done</button>
	</div>
</Modal>

<style>
	.desc { margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4; }
	.ex-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 50vh; overflow-y: auto; }
	.ex-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: 12px; }
	.ex-info { display: flex; flex-direction: column; gap: 0.15rem; }
	.ex-info b { font-size: 0.9rem; color: var(--text-primary); }
	.ex-info small { font-size: 0.75rem; color: var(--text-secondary); }
	input { width: 70px; text-align: center; padding: 0.4rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-panel); color: var(--text-primary); font-size: 0.9rem; font-weight: 700; }
	input:focus { border-color: var(--accent); outline: none; }
	.footer { margin-top: 1.25rem; display: flex; justify-content: flex-end; }
	.btn-done { padding: 0.5rem 1.25rem; background: var(--accent); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
</style>
