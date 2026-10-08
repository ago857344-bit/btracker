<script lang="ts">
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/services/markdown';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { getAICrashCourse } from '$lib/services/ai';
	import { tracker } from '$lib/stores/tracker';
	import { subjectName } from '$lib/state/subjects';
	import type { ChapterRecallData } from '$lib/types/tracker';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let chapterKey: string | null = null;
	
	let loading = true;
	let error = '';
	let html = '';

	$: if (chapterKey) {
		loadCourse(chapterKey);
	}

	async function loadCourse(key: string) {
		loading = true;
		error = '';
		html = '';
		try {
			const subCode = key.split(/[-:]/)[0] || 'P';
			const sName = subjectName(subCode) || 'Physics';
			const elo = $tracker.gamification?.elo?.[subCode as 'P'|'C'|'M'] || 300;
			const chName = key.split(/[-:]/).slice(1).join('-').trim() || key;
			
			const md = await getAICrashCourse(chName, sName, elo);
			html = await renderMarkdown(md);
		} catch (err: any) {
			error = err.message || 'Failed to generate crash course.';
		} finally {
			loading = false;
		}
	}
</script>

{#if chapterKey}
<Modal title="✨ AI Crash Course" open={true} on:close={() => dispatch('close')}>
	<div class="course-container" class:gemini-glow-box={loading}>
		{#if loading}
			<div class="gemini-loader-container">
				<div class="gemini-orb"></div>
				<p class="gemini-shimmer-text">Gemini is preparing your 2-minute crash course...</p>
			</div>
		{:else if error}
			<div class="ai-error">{error}</div>
		{:else}
			<div class="markdown-body ai-report">
				{@html html}
			</div>
		{/if}
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => dispatch('close')}>Dismiss</button>
	</svelte:fragment>
</Modal>
{/if}

<style>
	.course-container { padding: 1.5rem 1rem; min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
	.ai-error { color: var(--danger, #e0455a); font-weight: 700; background: color-mix(in srgb, var(--danger) 15%, transparent); padding: .6rem 1rem; border-radius: 8px; text-align: center; }
	
	.ai-report { width: 100%; text-align: left; font-size: .95rem; line-height: 1.6; color: var(--text-secondary); padding: 1.2rem; border-radius: 16px; }
	.ai-report :global(h3) { font-size: 1.1rem; color: var(--text-primary); margin: 1.5rem 0 .5rem; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; }
	.ai-report :global(h3:first-child) { margin-top: 0; }
	.ai-report :global(strong) { color: var(--text-primary); font-weight: 750; }
	.ai-report :global(ul) { padding-left: 1.5rem; margin-bottom: 1rem; }
	.ai-report :global(li) { margin-bottom: .4rem; }
</style>
