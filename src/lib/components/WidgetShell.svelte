<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ComponentProps } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let title: string;
	export let eyebrow = '';
	export let icon: ComponentProps<NavIcon>['name'] = 'home';
	export let span: 1 | 2 | 3 = 1;
	export let height: 'sm' | 'md' | 'lg' = 'md';
	export let editing = false;
	export let enabled = true;

	const dispatch = createEventDispatcher<{ move: -1 | 1; toggle: void; resize: void }>();
</script>

<article
	class="widget"
	class:span-2={span === 2}
	class:span-3={span === 3}
	class:h-sm={height === 'sm'}
	class:h-lg={height === 'lg'}
	class:editing
	style="--widget-accent: var(--accent)"
>
	<header class="widget-head">
		<span class="widget-icon"><NavIcon name={icon} size={17} /></span>
		<div class="widget-titles">
			{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
			<h3>{title}</h3>
		</div>
		<div class="widget-tools">
			{#if editing}
				<button type="button" class="tool" title="Move up" on:click={() => dispatch('move', -1)}><NavIcon name="chevron" size={15} /></button>
				<button type="button" class="tool flip" title="Move down" on:click={() => dispatch('move', 1)}><NavIcon name="chevron" size={15} /></button>
				<button type="button" class="tool" title="Resize" on:click={() => dispatch('resize')}><span class="resize-glyph">↔</span></button>
				<button type="button" class="tool danger" title={enabled ? 'Hide widget' : 'Show widget'} on:click={() => dispatch('toggle')}>{enabled ? '−' : '+'}</button>
			{:else}
				<slot name="actions" />
			{/if}
		</div>
	</header>
	<div class="widget-body">
		<slot />
	</div>
</article>

<style>
	.widget { display: flex; flex-direction: column; min-width: 0; padding: 1.15rem 1.25rem 1.3rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); transition: box-shadow .2s ease, border-color .2s ease, transform .2s ease; }
	.widget:hover { border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 60%); }
	.widget.editing { border-style: dashed; border-color: var(--accent); box-shadow: none; }
	.widget-head { display: flex; align-items: center; gap: .7rem; margin-bottom: .95rem; }
	.widget-icon { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 32px; border-radius: 10px; color: var(--accent); background: var(--accent-soft); }
	.widget-titles { min-width: 0; }
	.eyebrow { margin: 0; color: var(--text-secondary); font-size: .66rem; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
	h3 { margin: .1rem 0 0; font-size: .98rem; font-weight: 750; letter-spacing: -.03em; }
	.widget-tools { display: flex; align-items: center; gap: .3rem; margin-left: auto; }
	.tool { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-secondary); background: var(--surface-panel); font-size: .95rem; line-height: 1; }
	.tool:hover { color: var(--accent); border-color: var(--accent); }
	.tool.danger:hover { color: var(--danger); border-color: var(--danger); }
	.tool.flip :global(svg) { transform: rotate(90deg); }
	.resize-glyph { font-size: .82rem; }
	.widget-body { flex: 1; min-height: 0; }
	.span-2 { grid-column: span 2; }
	.span-3 { grid-column: span 3; }
	.h-sm .widget-body { min-height: 92px; }
	.h-lg .widget-body { min-height: 260px; }
	@media (max-width: 1100px) { .span-3 { grid-column: span 2; } }
	@media (max-width: 720px) { .span-2, .span-3 { grid-column: span 1; } }
</style>
