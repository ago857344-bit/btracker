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
	import CoachingScheduleWidget from '$lib/components/widgets/CoachingScheduleWidget.svelte';
	import RevisionDueWidget from '$lib/components/widgets/RevisionDueWidget.svelte';
	import TargetsModal from '$lib/components/TargetsModal.svelte';
	import MinimalistLayout from '$lib/components/dashboard/MinimalistLayout.svelte';
	import FocusLayout from '$lib/components/dashboard/FocusLayout.svelte';
	import CompactLayout from '$lib/components/dashboard/CompactLayout.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { isMobileDevice } from '$lib/state/themes';
	import { tracker, updateTracker, dashboardWidgets, updateWidget, reorderWidget, cycleWidgetSpan, customizingHome, formulaVaultOpen } from '$lib/stores/tracker';
	import { authConfigured, currentUser, hasSkippedLogin, sessionResolved } from '$lib/stores/auth';
	import { DEFAULT_WIDGETS } from '$lib/state/defaults';
	import type { WidgetLayout } from '$lib/types/tracker';

	$: isPreview = $page.url.searchParams.get('preview') === '1';
	$: showLanding = !isPreview && (($authConfigured && !$currentUser && !$hasSkippedLogin) || $page.url.searchParams.get('landing') === 'true');
	$: if (browser && showLanding) {
		goto('/welcome', { replaceState: true });
	}

	let mobileFilter: 'all' | 'priority' | 'analytics' = 'all';
	const PRIORITY_WIDGETS = new Set(['daily-progress', 'up-next', 'coaching-schedule', 'due-homework', 'quote', 'brain-dump', 'revision-due']);
	const ANALYTICS_WIDGETS = new Set(['subjects', 'weekly-standing', 'activity', 'yearly-heatmap', 'standing', 'new-target', 'revision-due']);

	const registry: Record<WidgetLayout['id'], { title: string; eyebrow: string; icon: ComponentProps<NavIcon>['name']; comp: any }> = {
		'daily-progress': { title: 'Daily progress', eyebrow: 'Today', icon: 'focus', comp: DailyProgressWidget },
		quote: { title: 'Daily quote', eyebrow: 'Motivation', icon: 'quote', comp: QuoteWidget },
		'weekly-standing': { title: 'Last 7 days', eyebrow: 'Consistency', icon: 'stats', comp: WeeklyStandingWidget },
		'new-target': { title: 'New target', eyebrow: 'Exam countdown', icon: 'target', comp: NewTargetWidget },
		'due-homework': { title: 'Due homework', eyebrow: 'Deadlines', icon: 'plan', comp: DueHomeworkWidget },
		subjects: { title: 'Subject hubs', eyebrow: 'Questions solved', icon: 'layers', comp: SubjectCardsWidget },
		standing: { title: 'Daily standing', eyebrow: 'Output', icon: 'trophy', comp: DailyStandingWidget },
		'up-next': { title: 'Up next', eyebrow: 'Planner', icon: 'list', comp: UpNextWidget },
		'coaching-schedule': { title: 'Batch Timetable', eyebrow: "Next Day's Periods", icon: 'clock', comp: CoachingScheduleWidget },
		'brain-dump': { title: 'Brain Dump & Scratchpad', eyebrow: 'Quick Notes', icon: 'edit', comp: BrainDumpWidget },
		'revision-due': { title: 'Revision & Mock Queue', eyebrow: 'Active Recall', icon: 'revise', comp: RevisionDueWidget },
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

	let draggedWidgetId: WidgetLayout['id'] | null = null;
	let dragOverWidgetId: WidgetLayout['id'] | null = null;

	function handleDragStart(id: WidgetLayout['id'], e: DragEvent) {
		draggedWidgetId = id;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
		}
	}

	function handleDragOver(id: WidgetLayout['id'], e: DragEvent) {
		e.preventDefault();
		if (draggedWidgetId === id) return;
		dragOverWidgetId = id;
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	function handleDragLeave(id: WidgetLayout['id']) {
		if (dragOverWidgetId === id) dragOverWidgetId = null;
	}

	function handleDrop(targetId: WidgetLayout['id'], e: DragEvent) {
		e.preventDefault();
		dragOverWidgetId = null;
		if (!draggedWidgetId || draggedWidgetId === targetId) return;

		updateTracker((state) => {
			const widgets = [...state.ui.widgets];
			const fromIdx = widgets.findIndex((w) => w.id === draggedWidgetId);
			const toIdx = widgets.findIndex((w) => w.id === targetId);
			if (fromIdx === -1 || toIdx === -1) return;

			const [moved] = widgets.splice(fromIdx, 1);
			widgets.splice(toIdx, 0, moved);
			widgets.forEach((w, idx) => {
				w.order = idx;
			});
			state.ui.widgets = widgets;
		});

		draggedWidgetId = null;
	}

	function handleDragEnd() {
		draggedWidgetId = null;
		dragOverWidgetId = null;
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

	let isMobile = false;
	onMount(() => {
		isMobile = isMobileDevice();
		const onResize = () => { isMobile = isMobileDevice(); };
		window.addEventListener('resize', onResize, { passive: true });
		return () => window.removeEventListener('resize', onResize);
	});

	$: effectiveIsMobile = typeof window !== 'undefined' ? (isMobile || isMobileDevice()) : false;

	$: dashboardLayout = (() => {
		const saved = $tracker.ui?.dashboardLayout;
		// If the user has completed onboarding and has an explicit choice, honor it
		if ($tracker.onboarded && saved) {
			return saved;
		}
		// For new users or unconfigured sessions on mobile: default to Pocket Flow ('compact')
		if (effectiveIsMobile) {
			return 'compact';
		}
		return saved || 'default';
	})();
	$: name = $tracker.meta?.name ? $tracker.meta.name.trim() : 'Aspirant';
	const hour = new Date().getHours();
	$: greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
	$: dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
</script>

<svelte:head>
	{#if showLanding}
		<title>BTracker · Track every question, from any coaching</title>
		<meta name="description" content="BTracker is the study command center for JEE aspirants. Log questions from coaching modules, DPPs, books and tests, with native module sync for Baktiwal Tutorials." />
	{:else}
		<title>Home · BTracker</title>
	{/if}
</svelte:head>

{#if !showLanding}
	<section class="home">
	<header class="page-header hero">
		<div class="page-header-copy">
			<p class="page-eyebrow eyebrow">{dateLabel}</p>
			<h1 class="page-title">{greeting}{name ? `, ${name}` : ''}. <span>Let’s make it count.</span></h1>
			<p class="page-subtitle sub">Your personalized command center — progress, targets, and what needs you next.</p>
		</div>
		<div class="page-header-actions hero-tools">
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
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="cell"
					class:span-2={widget.span === 2}
					class:span-3={widget.span === 3}
					class:is-dragging={draggedWidgetId === widget.id}
					class:is-drag-over={dragOverWidgetId === widget.id}
					draggable={$customizingHome}
					on:dragstart={(e) => handleDragStart(widget.id, e)}
					on:dragover={(e) => handleDragOver(widget.id, e)}
					on:dragleave={() => handleDragLeave(widget.id)}
					on:drop={(e) => handleDrop(widget.id, e)}
					on:dragend={handleDragEnd}
					animate:flip={{ duration: 260 }}
				>
					<WidgetShell
						title={registry[widget.id].title}
						eyebrow={registry[widget.id].eyebrow}
						icon={registry[widget.id].icon}
						height={widget.height ?? 'md'}
						span={widget.span}
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
{/if}

<style>
	.home { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.6rem; padding-top: 0.25rem; }
	.home > * { min-width: 0; }
	.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding-top: 0.25rem; }
	.eyebrow { margin: 0 0 .35rem; color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; text-shadow: none !important; }
	h1 { margin: 0; font-size: clamp(1.9rem, 4vw, 2.7rem); line-height: 1.18; letter-spacing: -.04em; padding-top: 0.12em; text-shadow: none !important; }
	h1 span { color: var(--text-secondary); text-shadow: none !important; }
	.sub { text-shadow: none !important; }
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
	
	.customize-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: .85rem 1.15rem;
		border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border-subtle));
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent) 10%, var(--surface-panel));
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: 0 8px 24px -4px color-mix(in srgb, var(--accent) 20%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.1);
		flex-wrap: wrap;
	}
	.banner-info b { display: block; font-size: .86rem; color: var(--accent); font-weight: 800; }
	.banner-info span { font-size: .76rem; color: var(--text-secondary); }
	.banner-actions { display: flex; align-items: center; gap: .5rem; }
	.btn-subtle {
		padding: .42rem .75rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-primary);
		font-size: .75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.btn-subtle:hover {
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
	}
	.btn-done {
		padding: .42rem .9rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: .75rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 40%, transparent);
		transition: all 0.15s ease;
	}
	.btn-done:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
		box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 50%, transparent);
	}

	
	/* Restored 3-column grid */
	.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.15rem; grid-auto-flow: dense; }
	.cell { display: flex; min-width: 0; transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease; }
	.cell.span-2 { grid-column: span 2; }
	.cell.span-3 { grid-column: span 3; }
	.cell :global(.widget) { flex: 1; }
	.cell[draggable="true"] { cursor: grab; }
	.cell[draggable="true"]:active { cursor: grabbing; }
	.cell.is-dragging {
		opacity: 0.35;
		transform: scale(0.96);
	}
	.cell.is-drag-over {
		outline: 2px dashed var(--accent);
		outline-offset: 4px;
		border-radius: var(--radius-card);
		transform: translateY(-2px);
		box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 40%, transparent);
	}
	
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
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15);
			font-weight: 800;
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
