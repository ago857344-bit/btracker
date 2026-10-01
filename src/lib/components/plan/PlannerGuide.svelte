<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let open = false;

	const cards = [
		{ icon: 'palette' as const, title: 'Visual Focus Journal', text: 'Every task gets a color and a subject. Your day becomes a visual map of where your effort went.' },
		{ icon: 'shield' as const, title: 'Cloud Resilience', text: 'Tasks are saved locally in real time. Close the tab, lose power — your plan survives.' },
		{ icon: 'sunrise' as const, title: 'The 4 AM Rule', text: 'Days that slip away are marked as missed, not deleted. BTracker never hides your history.' },
		{ icon: 'library' as const, title: 'The Routine Library', text: 'Save any day as a reusable routine and re-apply it to future days in one click.' },
		{ icon: 'calendar-check' as const, title: 'Seamless Rescheduling', text: 'Drag a task to another day, or open its detail card and reschedule instantly.' },
		{ icon: 'brain' as const, title: 'Mistake DNA Log', text: 'The daily reflection journal captures what went right and the mistakes to avoid tomorrow.' }
	];
</script>

<Modal bind:open title="Master the New Planner" width="640px">
	<div class="guide-grid">
		{#each cards as card}
			<article>
				<span class="guide-icon"><NavIcon name={card.icon} size={17} /></span>
				<div><b>{card.title}</b><p>{card.text}</p></div>
			</article>
		{/each}
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="guide-cta" on:click={() => open = false}>Got it, let's plan</button>
	</svelte:fragment>
</Modal>

<style>
	.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: .7rem; }
	article { display: flex; gap: .7rem; padding: .85rem; border: 1px solid var(--border-subtle); border-radius: 14px; background: var(--surface-subtle); }
	.guide-icon { display: grid; flex: 0 0 32px; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--accent); background: var(--accent-soft); }
	article b { font-size: .8rem; letter-spacing: -.01em; }
	article p { margin: .25rem 0 0; color: var(--text-secondary); font-size: .72rem; line-height: 1.5; }
	.guide-cta { height: 38px; padding: 0 1.1rem; border: 0; border-radius: 12px; color: white; background: var(--accent); font-size: .78rem; font-weight: 750; letter-spacing: .02em; cursor: pointer; }
</style>
