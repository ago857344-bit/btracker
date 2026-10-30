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
	class="widget specular-card"
	class:span-2={span === 2}
	class:span-3={span === 3}
	class:h-sm={height === 'sm'}
	class:h-lg={height === 'lg'}
	class:editing
	style="--widget-accent: var(--accent)"
>
	<header class="widget-head">
		{#if editing}
			<span class="drag-grip" title="Drag to reorder"><NavIcon name="menu" size={15} /></span>
		{/if}
		<span class="widget-icon"><NavIcon name={icon} size={17} /></span>
		<div class="widget-titles">
			{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
			<h3>{title}</h3>
		</div>
		<div class="widget-tools">
			{#if editing}
				<button type="button" class="tool" title="Move up" on:click={() => dispatch('move', -1)}><NavIcon name="chevron" size={15} /></button>
				<button type="button" class="tool flip" title="Move down" on:click={() => dispatch('move', 1)}><NavIcon name="chevron" size={15} /></button>
				<button type="button" class="tool span-btn" title="Cycle size: 1-col / 2-col / 3-col" on:click={() => dispatch('resize')}><span class="resize-glyph">{span === 3 ? '3x' : span === 2 ? '2x' : '1x'}</span></button>
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
	.widget {
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 1.15rem 1.25rem 1.3rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: var(--radius-card);
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(20px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(20px));
		box-shadow: var(--shadow-card), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.08));
		overflow: hidden;
		transform: perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateY(var(--card-lift, 0px));
		transition: box-shadow .25s ease, border-color .25s ease, transform .22s var(--ease-ios-spring);
		container-type: inline-size;
	}
	@media (hover: hover) and (pointer: fine) {
		.widget:not(.no-tilt) {
			transform-style: preserve-3d;
			will-change: transform;
		}
	}
	.widget:hover {
		border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 50%);
		--card-lift: -2px;
		box-shadow: 0 16px 44px -6px rgba(0, 0, 0, 0.38), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.12));
	}
	.widget.editing {
		border-style: dashed;
		border-color: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
		animation: editPulse 3s ease-in-out infinite;
	}
	@keyframes editPulse {
		0%, 100% { border-color: var(--accent); }
		50% { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
	}
	.widget-head {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: .65rem;
		margin-bottom: .9rem;
	}
	.widget-icon {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		flex: 0 0 28px;
		border-radius: 8px;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
		box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 14%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.25);
		transition: transform 0.2s var(--ease-ios-spring), box-shadow 0.2s ease;
	}
	.widget:hover .widget-icon {
		transform: scale(1.05);
		box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 25%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}
	.widget-titles { min-width: 0; flex: 1; }
	.eyebrow { margin: 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; opacity: 0.85; }
	h3 { margin: .12rem 0 0; font-size: .95rem; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.widget-tools { display: flex; align-items: center; gap: .3rem; margin-left: auto; flex-shrink: 0; }
	.tool {
		display: grid;
		place-items: center;
		width: 27px;
		height: 27px;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--surface-panel) 80%, transparent);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		font-size: .95rem;
		line-height: 1;
		transition: all 0.16s ease;
	}
	.tool:hover { color: var(--accent); border-color: var(--accent); transform: scale(1.08); }
	.tool.danger:hover { color: var(--danger); border-color: var(--danger); }
	.tool.flip :global(svg) { transform: rotate(90deg); }
	.resize-glyph { font-size: .74rem; font-weight: 800; }
	.drag-grip {
		display: grid;
		place-items: center;
		color: var(--accent);
		opacity: 0.85;
		cursor: grab;
		padding-right: 0.2rem;
		transition: opacity 0.15s ease, transform 0.15s ease;
	}
	.drag-grip:hover {
		opacity: 1;
		transform: scale(1.15);
	}
	.widget-body { position: relative; z-index: 3; flex: 1; min-height: 0; }
	.span-2 { grid-column: span 2; }
	.span-3 { grid-column: span 3; }
	.h-sm .widget-body { min-height: 92px; }
	.h-lg .widget-body { min-height: 260px; }
	@media (max-width: 1100px) { .span-3 { grid-column: span 2; } }
	@media (max-width: 768px) {
		.widget { padding: 1rem 0.9rem 1.15rem; }
		.widget-head { margin-bottom: 0.75rem; }
		.span-2, .span-3 { grid-column: span 1 !important; }
	}
	:global(.mode-mobile) .span-2,
	:global(.mode-mobile) .span-3,
	:global(.is-phone) .span-2,
	:global(.is-phone) .span-3 {
		grid-column: span 1 !important;
	}
	:global(.mode-mobile) .widget,
	:global(.is-phone) .widget {
		padding: 1rem 0.9rem 1.15rem;
	}
	:global(.mode-mobile) .widget-head,
	:global(.is-phone) .widget-head {
		margin-bottom: 0.75rem;
	}
</style>
