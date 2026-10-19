<svelte:head><title>Home · BTracker</title></svelte:head>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import type { ComponentProps } from 'svelte';
	import WidgetShell from '$lib/components/WidgetShell.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import QuoteWidget from '$lib/components/widgets/QuoteWidget.svelte';
	import DailyProgressWidget from '$lib/components/widgets/DailyProgressWidget.svelte';
	import WeeklyStandingWidget from '$lib/components/widgets/WeeklyStandingWidget.svelte';
	import NewTargetWidget from '$lib/components/widgets/NewTargetWidget.svelte';
	import DueHomeworkWidget from '$lib/components/widgets/DueHomeworkWidget.svelte';
	import SubjectCardsWidget from '$lib/components/widgets/SubjectCardsWidget.svelte';
	import DailyStandingWidget from '$lib/components/widgets/DailyStandingWidget.svelte';
	import UpNextWidget from '$lib/components/widgets/UpNextWidget.svelte';
	import RecentActivityWidget from '$lib/components/widgets/RecentActivityWidget.svelte';
	import YearlyHeatmapWidget from '$lib/components/widgets/YearlyHeatmapWidget.svelte';
	import BrainDumpWidget from '$lib/components/widgets/BrainDumpWidget.svelte';
	import TargetsModal from '$lib/components/TargetsModal.svelte';
	import MinimalistLayout from '$lib/components/dashboard/MinimalistLayout.svelte';
	import FocusLayout from '$lib/components/dashboard/FocusLayout.svelte';
	import CompactLayout from '$lib/components/dashboard/CompactLayout.svelte';
	import { tracker, updateTracker, dashboardWidgets, updateWidget, reorderWidget, cycleWidgetSpan, customizingHome, formulaVaultOpen } from '$lib/stores/tracker';
	import { DEFAULT_WIDGETS } from '$lib/state/defaults';
	import type { WidgetLayout } from '$lib/types/tracker';

	let mobileFilter: 'all' | 'priority' | 'analytics' = 'all';
	const PRIORITY_WIDGETS = new Set(['daily-progress', 'up-next', 'due-homework', 'quote', 'brain-dump']);
	const ANALYTICS_WIDGETS = new Set(['subjects', 'weekly-standing', 'activity', 'yearly-heatmap', 'standing', 'new-target']);

	const registry: Record<WidgetLayout['id'], { title: string; eyebrow: string; icon: ComponentProps<NavIcon>['name']; comp: any }> = {
		'daily-progress': { title: 'Daily progress', eyebrow: 'Today', icon: 'focus', comp: DailyProgressWidget },
		quote: { title: 'Daily quote', eyebrow: 'Motivation', icon: 'quote', comp: QuoteWidget },
		'weekly-standing': { title: 'Last 7 days', eyebrow: 'Consistency', icon: 'stats', comp: WeeklyStandingWidget },
		'new-target': { title: 'New target', eyebrow: 'Exam countdown', icon: 'target', comp: NewTargetWidget },
		'due-homework': { title: 'Due homework', eyebrow: 'Deadlines', icon: 'plan', comp: DueHomeworkWidget },
		subjects: { title: 'Subject hubs', eyebrow: 'Questions solved', icon: 'layers', comp: SubjectCardsWidget },
		standing: { title: 'Daily standing', eyebrow: 'Output', icon: 'trophy', comp: DailyStandingWidget },
		'up-next': { title: 'Up next', eyebrow: 'Planner', icon: 'list', comp: UpNextWidget },
		'brain-dump': { title: 'Brain Dump & Scratchpad', eyebrow: 'Quick Notes', icon: 'edit', comp: BrainDumpWidget },
		activity: { title: 'Recent activity', eyebrow: 'Feed', icon: 'history', comp: RecentActivityWidget },
		'yearly-heatmap': { title: '365-Day Study Matrix', eyebrow: 'Yearly Consistency', icon: 'history', comp: YearlyHeatmapWidget }
	};

	let targetsOpen = false;

	function resetDefaultLayout() {
		updateTracker((state) => {
			state.ui.widgets = structuredClone(DEFAULT_WIDGETS);
		});
	}

	function enableAllWidgets() {
		updateTracker((state) => {
			for (const w of state.ui.widgets) w.enabled = true;
		});
	}

	// In customize mode show every widget (even hidden) so it can be re-enabled.
	$: visible = ($customizingHome ? [...$tracker.ui.widgets] : $dashboardWidgets)
		.filter(w => !!registry[w.id])
		.sort((a, b) => a.order - b.order);
	$: hiddenCount = $tracker.ui.widgets.filter((w) => !w.enabled).length;

	$: filteredVisible = visible.filter((w) => {
		if ($customizingHome || mobileFilter === 'all') return true;
		if (mobileFilter === 'priority') return PRIORITY_WIDGETS.has(w.id);
		if (mobileFilter === 'analytics') return ANALYTICS_WIDGETS.has(w.id);
		return true;
	});

	$: dashboardLayout = $tracker.ui?.dashboardLayout || 'default';
	$: name = $tracker.meta.name.trim();
	const hour = new Date().getHours();
	$: greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
	$: dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
</script>

<section class="home">
	<header class="hero">
		<div>
			<p class="eyebrow">{dateLabel}</p>
			<h1>{greeting}{name ? `, ${name}` : ''}. <span>Let’s make it count.</span></h1>
			<p class="sub">Your personalized command center — progress, targets, and what needs you next.</p>
		</div>
		<div class="hero-tools">


			{#if dashboardLayout === 'default'}
				<button type="button" class="customize-toggle" class:active={$customizingHome} on:click={() => customizingHome.update((v) => !v)}>
					<NavIcon name="settings" size={15} />
					{$customizingHome ? 'Done Editing' : 'Customize Layout'}
				</button>
			{/if}
			<button type="button" class="targets" on:click={() => formulaVaultOpen.set(true)}>
				<NavIcon name="book" size={16} /> Formula Hub
			</button>
		</div>
	</header>

	{#if dashboardLayout === 'minimalist'}
		<MinimalistLayout />
	{:else if dashboardLayout === 'focus'}
		<FocusLayout />
	{:else if dashboardLayout === 'compact'}
		<CompactLayout />
	{:else}
		{#if $customizingHome}
			<div class="customize-banner" in:fly={{ y: -6, duration: 200 }}>
				<div class="banner-info">
					<b>Customizing Dashboard</b>
					<span>Reorder with ↑ / ↓, resize with ↔, or toggle visibility with + / −.</span>
				</div>
				<div class="banner-actions">
					{#if hiddenCount > 0}
						<button type="button" class="btn-subtle" on:click={enableAllWidgets}>
							Show All ({hiddenCount} hidden)
						</button>
					{/if}
					<button type="button" class="btn-subtle" on:click={resetDefaultLayout}>
						Reset to Defaults
					</button>
					<button type="button" class="btn-done" on:click={() => customizingHome.set(false)}>
						Done Editing
					</button>
				</div>
			</div>
		{/if}

		{#if !$customizingHome}
			<div class="mobile-cat-filter" role="tablist" aria-label="Filter widgets by category">
				<button
					type="button"
					class="filter-chip"
					class:active={mobileFilter === 'all'}
					on:click={() => (mobileFilter = 'all')}
					role="tab"
					aria-selected={mobileFilter === 'all'}
				>
					All ({visible.length})
				</button>
				<button
					type="button"
					class="filter-chip"
					class:active={mobileFilter === 'priority'}
					on:click={() => (mobileFilter = 'priority')}
					role="tab"
					aria-selected={mobileFilter === 'priority'}
				>
					Priorities
				</button>
				<button
					type="button"
					class="filter-chip"
					class:active={mobileFilter === 'analytics'}
					on:click={() => (mobileFilter = 'analytics')}
					role="tab"
					aria-selected={mobileFilter === 'analytics'}
				>
					Analytics
				</button>
			</div>
		{/if}

		<div class="grid">
			{#each filteredVisible as widget (widget.id)}
				<div class="cell" class:span-2={widget.span === 2} class:span-3={widget.span === 3} animate:flip={{ duration: 260 }}>
					<WidgetShell
						title={registry[widget.id].title}
						eyebrow={registry[widget.id].eyebrow}
						icon={registry[widget.id].icon}
						height={widget.height ?? 'md'}
						enabled={widget.enabled}
						editing={$customizingHome}
						on:move={(e) => reorderWidget(widget.id, e.detail)}
						on:toggle={() => updateWidget(widget.id, { enabled: !widget.enabled })}
						on:resize={() => cycleWidgetSpan(widget.id)}
					>
						<svelte:component this={registry[widget.id].comp} />
					</WidgetShell>
				</div>
			{/each}
		</div>
	{/if}
</section>

<TargetsModal bind:open={targetsOpen} />

<style>
	.home { display: grid; gap: 1.6rem; padding-top: 0.25rem; }
	.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding-top: 0.25rem; }
	.eyebrow { margin: 0 0 .35rem; color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	h1 { margin: 0; font-size: clamp(1.9rem, 4vw, 2.7rem); line-height: 1.18; letter-spacing: -.04em; padding-top: 0.12em; }
	h1 span { color: var(--text-secondary); }
	.hero-tools { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }

	.customize-toggle {
		display: inline-flex;
		align-items: center;
		gap: .45rem;
		padding: .55rem .95rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 12px;
		color: var(--text-secondary);
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(16px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
		box-shadow: var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.08));
		font-size: .82rem;
		font-weight: 720;
		cursor: pointer;
		transition: all 0.18s var(--ease-ios-spring);
	}
	.customize-toggle:hover, .customize-toggle.active {
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
		box-shadow: 0 8px 20px -4px color-mix(in srgb, var(--accent) 30%, transparent), var(--vision-bevel-inner);
	}
	.customize-toggle.active {
		background: color-mix(in srgb, var(--accent) 14%, var(--surface-panel));
	}
	.targets {
		display: inline-flex;
		align-items: center;
		gap: .45rem;
		padding: .55rem .95rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 12px;
		color: var(--text-primary);
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(16px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
		box-shadow: var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.08));
		font-size: .82rem;
		font-weight: 720;
		cursor: pointer;
		transition: all 0.18s var(--ease-ios-spring);
	}
	.targets:hover {
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
		box-shadow: 0 8px 20px -4px color-mix(in srgb, var(--accent) 30%, transparent), var(--vision-bevel-inner);
	}
	
	.customize-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .85rem 1.15rem; border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border-subtle)); border-radius: 14px; background: color-mix(in srgb, var(--accent) 10%, var(--surface-panel)); flex-wrap: wrap; }
	.banner-info b { display: block; font-size: .86rem; color: var(--accent); }
	.banner-info span { font-size: .76rem; color: var(--text-secondary); }
	.banner-actions { display: flex; align-items: center; gap: .5rem; }
	.btn-subtle { padding: .42rem .75rem; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-primary); font-size: .75rem; font-weight: 700; cursor: pointer; }
	.btn-subtle:hover { border-color: var(--accent); }
	.btn-done { padding: .42rem .9rem; border-radius: 8px; border: none; background: var(--accent); color: white; font-size: .75rem; font-weight: 800; cursor: pointer; }

	
	/* Restored 3-column grid */
	.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.15rem; grid-auto-flow: dense; }
	.cell { display: flex; min-width: 0; }
	.cell.span-2 { grid-column: span 2; }
	.cell.span-3 { grid-column: span 3; }
	.cell :global(.widget) { flex: 1; }
	
	.mobile-cat-filter {
		display: none;
	}

	@media (max-width: 1100px) { 
		.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } 
		.cell.span-3 { grid-column: span 2; } 
	}
	@media (max-width: 768px) { 
		.home { gap: 1.15rem; }
		.hero { gap: 0.85rem; }
		h1 { font-size: clamp(1.45rem, 5.5vw, 1.85rem); line-height: 1.22; word-break: break-word; }
		.mobile-cat-filter {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.35rem;
			padding: 0.3rem;
			background: var(--vision-glass-bg, var(--surface-panel));
			backdrop-filter: var(--vision-glass-blur, blur(16px));
			-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
			border: 1px solid var(--vision-bevel-border, var(--border-subtle));
			border-radius: 12px;
			margin-bottom: 0.2rem;
		}
		.filter-chip {
			border: none;
			background: transparent;
			padding: 0.52rem 0.35rem;
			border-radius: 8px;
			font-size: 0.72rem;
			font-weight: 700;
			color: var(--text-secondary);
			cursor: pointer;
			text-align: center;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			transition: all 0.16s ease;
		}
		.filter-chip.active {
			background: var(--surface-canvas);
			color: var(--accent);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}
		.grid { grid-template-columns: minmax(0, 1fr); gap: 0.95rem; } 
		.cell.span-2, .cell.span-3 { grid-column: span 1 !important; } 
		.hero-tools { width: 100%; justify-content: space-between; } 
		.hero-tools button { flex: 1; justify-content: center; font-size: 0.78rem; padding: 0.55rem 0.65rem; }
		.customize-banner { flex-direction: column; align-items: stretch; gap: 0.75rem; padding: 0.75rem 0.9rem; }
		.banner-actions { flex-wrap: wrap; width: 100%; }
		.banner-actions button { flex: 1; text-align: center; justify-content: center; }
	}
</style>
