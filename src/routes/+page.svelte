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
	import TargetsModal from '$lib/components/TargetsModal.svelte';
	import { tracker, dashboardWidgets, updateWidget, reorderWidget, cycleWidgetSpan, customizingHome } from '$lib/stores/tracker';
	import type { WidgetLayout } from '$lib/types/tracker';

	const registry: Record<WidgetLayout['id'], { title: string; eyebrow: string; icon: ComponentProps<NavIcon>['name']; comp: any }> = {
		'daily-progress': { title: 'Daily progress', eyebrow: 'Today', icon: 'focus', comp: DailyProgressWidget },
		quote: { title: 'Daily quote', eyebrow: 'Motivation', icon: 'quote', comp: QuoteWidget },
		'weekly-standing': { title: 'Last 7 days', eyebrow: 'Consistency', icon: 'stats', comp: WeeklyStandingWidget },
		'new-target': { title: 'New target', eyebrow: 'Exam countdown', icon: 'target', comp: NewTargetWidget },
		'due-homework': { title: 'Due homework', eyebrow: 'Deadlines', icon: 'plan', comp: DueHomeworkWidget },
		subjects: { title: 'Subject hubs', eyebrow: 'Questions solved', icon: 'layers', comp: SubjectCardsWidget },
		standing: { title: 'Daily standing', eyebrow: 'Output', icon: 'trophy', comp: DailyStandingWidget },
		'up-next': { title: 'Up next', eyebrow: 'Planner', icon: 'list', comp: UpNextWidget },
		activity: { title: 'Recent activity', eyebrow: 'Feed', icon: 'history', comp: RecentActivityWidget }
	};

	let targetsOpen = false;

	// In customize mode show every widget (even hidden) so it can be re-enabled.
	$: visible = ($customizingHome ? [...$tracker.ui.widgets] : $dashboardWidgets)
		.filter(w => w.id !== 'recommendation')
		.sort((a, b) => a.order - b.order);
	$: hiddenCount = $tracker.ui.widgets.filter((w) => !w.enabled).length;
	

	$: name = $tracker.meta.name.trim();
	const hour = new Date().getHours();
	$: greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
	$: dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
</script>

<section class="home">
	<header class="hero" in:fade={{ duration: 320 }}>
		<div>
			<p class="eyebrow">{dateLabel}</p>
			<h1>{greeting}{name ? `, ${name}` : ''}. <span>Let’s make it count.</span></h1>
			<p class="sub">Your personalized command center — progress, targets, and what needs you next.</p>
		</div>
		<div class="hero-tools">
			<button type="button" class="targets" on:click={() => (targetsOpen = true)}>
				<NavIcon name="target" size={16} /> Edit targets
			</button>
		</div>
	</header>

	{#if $customizingHome}
		<div class="hint" in:fly={{ y: -6, duration: 200 }}>
			Reorder with the arrows, resize with ↔, hide with −. Hidden widgets ({hiddenCount}) stay listed here so you can bring them back with +. Finish from the appearance menu in the top bar.
		</div>
	{/if}

	<div class="grid">
		{#each visible as widget (widget.id)}
			<div class="cell" class:span-2={widget.span === 2} class:span-3={widget.span === 3} animate:flip={{ duration: 260 }} in:fly={{ y: 12, duration: 280 }}>
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

	
</section>

<TargetsModal bind:open={targetsOpen} />

<style>
	.home { display: grid; gap: 1.6rem; }
	.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
	.eyebrow { margin: 0 0 .35rem; color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	h1 { margin: 0; font-size: clamp(1.9rem, 4vw, 2.7rem); line-height: 1.05; letter-spacing: -.06em; }
	h1 span { color: var(--text-secondary); }
	.sub { max-width: 520px; margin: .55rem 0 0; color: var(--text-secondary); font-size: .98rem; line-height: 1.6; }
	.hero-tools { display: flex; align-items: center; gap: .6rem; }
	.targets { display: inline-flex; align-items: center; gap: .45rem; padding: .55rem .95rem; border: 1px solid var(--border-subtle); border-radius: 11px; color: var(--text-primary); background: var(--surface-panel); font-size: .82rem; font-weight: 720; }
	.targets:hover { border-color: var(--accent); color: var(--accent); }
	.hint { padding: .7rem .95rem; border: 1px dashed var(--accent); border-radius: var(--radius-control); color: var(--text-secondary); background: var(--accent-soft); font-size: .8rem; line-height: 1.5; }
	
	/* Restored 3-column grid */
	.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.15rem; }
	.cell { display: flex; min-width: 0; }
	.cell.span-2 { grid-column: span 2; }
	.cell.span-3 { grid-column: span 3; }
	.cell :global(.widget) { flex: 1; }
	
	@media (max-width: 1100px) { 
		.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } 
		.cell.span-3 { grid-column: span 2; } 
	}
	@media (max-width: 760px) { 
		.grid { grid-template-columns: minmax(0, 1fr); } 
		.cell.span-2, .cell.span-3 { grid-column: span 1; } 
		.hero-tools { width: 100%; justify-content: space-between; } 
	}
</style>
