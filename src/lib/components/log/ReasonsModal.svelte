<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { addWrongTag, tracker } from '$lib/stores/tracker';
	import { WRONG_TAGS } from '$lib/state/syllabus';

	export let open = false;
	export let selected: string[] = [];
	export let questionLabel = '';

	const dispatch = createEventDispatcher<{ save: string[] }>();

	let draft: string[] = [];
	let newTag = '';

	$: tags = [...WRONG_TAGS, ...($tracker.x.tags ?? [])];
	$: if (open) { draft = [...selected]; newTag = ''; }

	function toggle(id: string) {
		draft = draft.includes(id) ? draft.filter((x) => x !== id) : [...draft, id];
	}
	function addCustom() {
		const value = newTag.trim();
		if (!value) return;
		const id = addWrongTag(value);
		draft = [...draft, id];
		newTag = '';
	}
	function save() {
		dispatch('save', draft);
		open = false;
	}
</script>

<Modal bind:open title="What went wrong?" width="520px" on:close={() => dispatch('save', draft)}>
	<p class="lead">Pick as many as apply for <b>{questionLabel}</b>. You can change this any time.</p>
	<div class="opts">
		{#each tags as tag (tag.id)}
			<button type="button" class="opt" class:on={draft.includes(tag.id)} aria-pressed={draft.includes(tag.id)} on:click={() => toggle(tag.id)}>
				<span class="bx"><NavIcon name="check" size={12} /></span>{tag.n}
			</button>
		{/each}
	</div>
	<div class="addrow">
		<input bind:value={newTag} placeholder="Add your own reason" aria-label="New reason" on:keydown={(e) => { if (e.key === 'Enter') addCustom(); }} />
		<button type="button" class="ghost" on:click={addCustom}>Add</button>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="primary" on:click={save}>Done</button>
	</svelte:fragment>
</Modal>

<style>
	.lead { margin: 0 0 1rem; color: var(--text-secondary); font-size: .82rem; }
	.lead b { color: var(--text-primary); }
	.opts { display: grid; gap: .45rem; }
	.opt { display: flex; align-items: center; gap: .6rem; padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); color: var(--text-primary); font-size: .84rem; font-weight: 650; text-align: left; transition: border-color .14s ease, background .14s ease; }
	.opt:hover { border-color: var(--accent); }
	.opt.on { border-color: var(--accent); background: var(--accent-soft); }
	.bx { display: grid; place-items: center; width: 18px; height: 18px; border: 1.5px solid var(--border-subtle); border-radius: 6px; color: transparent; background: var(--surface-panel); }
	.opt.on .bx { border-color: var(--accent); background: var(--accent); color: white; }
	.addrow { display: flex; gap: .5rem; margin-top: .9rem; }
	.addrow input { flex: 1; height: 38px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-primary); font-size: .84rem; }
	.addrow input:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
	.ghost { height: 38px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-secondary); font-size: .8rem; font-weight: 700; }
	.ghost:hover { color: var(--accent); border-color: var(--accent); }
	.primary { height: 38px; padding: 0 1.1rem; border: 0; border-radius: 11px; background: var(--accent); color: white; font-size: .8rem; font-weight: 750; }
</style>
