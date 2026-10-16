<script lang="ts">
	import WidgetShell from '$lib/components/WidgetShell.svelte';
	import DailyProgressWidget from '$lib/components/widgets/DailyProgressWidget.svelte';
	import QuoteWidget from '$lib/components/widgets/QuoteWidget.svelte';
	import WeeklyStandingWidget from '$lib/components/widgets/WeeklyStandingWidget.svelte';
	import NewTargetWidget from '$lib/components/widgets/NewTargetWidget.svelte';
	import DueHomeworkWidget from '$lib/components/widgets/DueHomeworkWidget.svelte';
	import SubjectCardsWidget from '$lib/components/widgets/SubjectCardsWidget.svelte';
	import DailyStandingWidget from '$lib/components/widgets/DailyStandingWidget.svelte';
	import UpNextWidget from '$lib/components/widgets/UpNextWidget.svelte';
	import RecentActivityWidget from '$lib/components/widgets/RecentActivityWidget.svelte';
	import YearlyHeatmapWidget from '$lib/components/widgets/YearlyHeatmapWidget.svelte';
	import BrainDumpWidget from '$lib/components/widgets/BrainDumpWidget.svelte';

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';
</script>

<div class="default-preview-grid" class:mode-tablet={deviceMode === 'tablet'} class:mode-mobile={deviceMode === 'mobile'}>
	<div class="cell span-2">
		<WidgetShell title="Daily progress" eyebrow="Today" icon="focus" height="md">
			<DailyProgressWidget />
		</WidgetShell>
	</div>
	<div class="cell">
		<WidgetShell title="Daily quote" eyebrow="Motivation" icon="quote" height="md">
			<QuoteWidget />
		</WidgetShell>
	</div>
	<div class="cell span-2">
		<WidgetShell title="Brain Dump & Scratchpad" eyebrow="Quick Notes" icon="edit" height="md">
			<BrainDumpWidget />
		</WidgetShell>
	</div>
	<div class="cell">
		<WidgetShell title="New target" eyebrow="Exam countdown" icon="target" height="md">
			<NewTargetWidget />
		</WidgetShell>
	</div>
	<div class="cell span-2">
		<WidgetShell title="Up next" eyebrow="Planner" icon="list" height="md">
			<UpNextWidget />
		</WidgetShell>
	</div>
	<div class="cell">
		<WidgetShell title="Due homework" eyebrow="Deadlines" icon="plan" height="md">
			<DueHomeworkWidget />
		</WidgetShell>
	</div>
	<div class="cell span-2">
		<WidgetShell title="Subject hubs" eyebrow="Questions solved" icon="layers" height="md">
			<SubjectCardsWidget />
		</WidgetShell>
	</div>
	<div class="cell">
		<WidgetShell title="Daily standing" eyebrow="Output" icon="trophy" height="md">
			<DailyStandingWidget />
		</WidgetShell>
	</div>
	<div class="cell span-3">
		<WidgetShell title="365-Day Study Matrix" eyebrow="Yearly Consistency" icon="history" height="md">
			<YearlyHeatmapWidget />
		</WidgetShell>
	</div>
	<div class="cell span-2">
		<WidgetShell title="Last 7 days" eyebrow="Consistency" icon="stats" height="md">
			<WeeklyStandingWidget />
		</WidgetShell>
	</div>
	<div class="cell">
		<WidgetShell title="Recent activity" eyebrow="Feed" icon="history" height="md">
			<RecentActivityWidget />
		</WidgetShell>
	</div>
</div>

<style>
	.default-preview-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.1rem;
		width: 100%;
	}
	.cell {
		min-width: 0;
	}
	.cell.span-2 {
		grid-column: span 2;
	}
	.cell.span-3 {
		grid-column: span 3;
	}
	@media (max-width: 1023px) and (min-width: 768px) {
		.default-preview-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.cell.span-3 {
			grid-column: span 2;
		}
	}
	.default-preview-grid.mode-tablet {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.default-preview-grid.mode-tablet .cell.span-3 {
		grid-column: span 2;
	}
	@media (max-width: 767px) {
		.default-preview-grid {
			grid-template-columns: 1fr;
		}
		.cell.span-2, .cell.span-3 {
			grid-column: span 1;
		}
	}
	.default-preview-grid.mode-mobile {
		grid-template-columns: 1fr;
	}
	.default-preview-grid.mode-mobile .cell.span-2,
	.default-preview-grid.mode-mobile .cell.span-3 {
		grid-column: span 1;
	}
</style>
