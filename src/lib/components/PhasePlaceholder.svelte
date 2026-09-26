<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let title: string;
	export let eyebrow: string;
	export let description: string;
	export let icon: 'plan' | 'focus' | 'revise' | 'tests' | 'mastery' | 'friends' | 'stats' | 'reminders';
</script>

<svelte:head><title>{title} · BTracker</title></svelte:head>

<section class="placeholder">
	<div class="icon-wrap"><NavIcon name={icon} size={27} /></div>
	<p class="eyebrow">{eyebrow}</p>
	<h1>{title}</h1>
	<p class="description">{description}</p>
	<span class="coming">This workspace is being brought to life in the next build step.</span>
</section>

<style>
	.placeholder { min-height: min(67vh, 680px); display: grid; align-content: center; justify-items: center; max-width: 650px; margin: 0 auto; text-align: center; padding: 4rem 1rem; }
	.icon-wrap { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 20px; background: var(--accent-soft); color: var(--accent); margin-bottom: 1.4rem; }
	.eyebrow { color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin: 0; }
	h1 { margin: .45rem 0 .85rem; font-size: clamp(2.4rem, 6vw, 4rem); letter-spacing: -.065em; }
	.description { max-width: 560px; margin: 0; color: var(--text-secondary); font-size: 1.05rem; line-height: 1.7; }
	.coming { margin-top: 1.8rem; border: 1px solid var(--border-subtle); border-radius: 999px; padding: .55rem .85rem; font-size: .82rem; color: var(--text-secondary); background: var(--surface-panel); }
</style>
