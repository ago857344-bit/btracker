<script lang="ts">
	import { fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import RevisionDueModal from '$lib/components/RevisionDueModal.svelte';
	import { addPlannerTask, celebration, plannerPrompt } from '$lib/stores/tracker';
	import { todayKey } from '$lib/state/dates';

	let timer: ReturnType<typeof setTimeout>;
	$: if ($celebration) {
		clearTimeout(timer);
		timer = setTimeout(() => celebration.set(null), 2400);
	}

	let promptOpen = false;
	$: promptOpen = Boolean($plannerPrompt);

	function confirmPrompt() {
		const title = $plannerPrompt;
		plannerPrompt.set(null);
		if (title) addPlannerTask(todayKey(), { title, col: 0, s: '', st: '', en: '', rec: 'once', hrs: 1, test: false });
	}
</script>

{#if $celebration}
	<div class="celebration" transition:fly={{ y: -18, duration: 220 }} role="status">
		<span class="check"><NavIcon name="check-circle" size={22} /></span>
		<div><b>{$celebration}</b><small>Great work — streak secured.</small></div>
	</div>
{/if}

<RevisionDueModal />

<Modal open={promptOpen} title="Add to Planner?" width="420px" on:close={() => plannerPrompt.set(null)}>
	<p class="prompt-copy">Add <b>{$plannerPrompt}</b> to today's planner?</p>
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => plannerPrompt.set(null)}>No, thanks</button>
		<button type="button" class="btn solid" on:click={confirmPrompt}>Add task</button>
	</svelte:fragment>
</Modal>

<style>
	.celebration { position: fixed; z-index: 150; top: 1.1rem; left: 50%; display: flex; align-items: center; gap: .7rem; padding: .75rem 1.15rem; border-radius: 16px; background: #0f2e1c; border: 1px solid #245c3a; color: #d8ffe7; box-shadow: 0 18px 44px rgb(4 20 10 / 45%); transform: translateX(-50%); }
	.celebration .check { display: grid; place-items: center; color: #4ade80; }
	.celebration b { display: block; font-size: .88rem; letter-spacing: -.01em; }
	.celebration small { color: #8fd6a8; font-size: .68rem; }

	.prompt-copy { margin: 0; color: var(--text-secondary); font-size: .85rem; }
	.prompt-copy b { color: var(--text-primary); }
	.btn { height: 36px; padding: 0 .95rem; border-radius: 11px; font-size: .78rem; font-weight: 750; border: 1px solid transparent; cursor: pointer; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: transparent; }
	.btn.ghost:hover { color: var(--text-primary); }
	.btn.solid { color: white; background: var(--accent); }
</style>
