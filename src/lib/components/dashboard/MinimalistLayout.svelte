<script lang="ts">
	import DailyProgressWidget from '$lib/components/widgets/DailyProgressWidget.svelte';
	import QuoteWidget from '$lib/components/widgets/QuoteWidget.svelte';
	import NewTargetWidget from '$lib/components/widgets/NewTargetWidget.svelte';
	import UpNextWidget from '$lib/components/widgets/UpNextWidget.svelte';
	import DueHomeworkWidget from '$lib/components/widgets/DueHomeworkWidget.svelte';
	import SubjectCardsWidget from '$lib/components/widgets/SubjectCardsWidget.svelte';
	import WeeklyStandingWidget from '$lib/components/widgets/WeeklyStandingWidget.svelte';
	import RecentActivityWidget from '$lib/components/widgets/RecentActivityWidget.svelte';
	import YearlyHeatmapWidget from '$lib/components/widgets/YearlyHeatmapWidget.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { dailyProgress, streakDays, tracker } from '$lib/stores/tracker';
	import { formatMinutes } from '$lib/state/dates';

	$: streak = $streakDays || 0;
	$: hourPct = Math.round(($dailyProgress?.hourPct || 0) * 100);
	$: questionPct = Math.round(($dailyProgress?.questionPct || 0) * 100);

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';
</script>

<div class="minimalist-layout" class:mode-tablet={deviceMode === 'tablet'} class:mode-mobile={deviceMode === 'mobile'}>
	<!-- TOP STATUS BAR (Sticky 48px on mobile, sleek inline bar on desktop/tablet) -->
	<header class="mini-status-bar">
		<div class="status-summary-pill">
			<span class="status-badge live-dot"><i></i> Live</span>
			<span class="status-metric">
				<NavIcon name="clock" size={13} />
				<b>{formatMinutes($dailyProgress?.minutes || 0)}</b>
				<small>/{$dailyProgress?.hourGoal || 4}h</small>
			</span>
			<span class="divider">/</span>
			<span class="status-metric">
				<NavIcon name="target" size={13} />
				<b>{$dailyProgress?.solved || 0}</b>
				<small>/{$dailyProgress?.questionGoal || 50} Qs</small>
			</span>
			<span class="divider">/</span>
			<span class="status-metric streak-chip">
				🔥 <b>{streak}</b>d streak
			</span>
		</div>

		<!-- Desktop & Tablet expanded top status widgets -->
		<div class="top-widgets-row">
			<div class="top-widget-slot timer-slot">
				<DailyProgressWidget />
			</div>
			<div class="top-widget-slot quote-slot">
				<QuoteWidget />
			</div>
			<div class="top-widget-slot target-slot">
				<NewTargetWidget />
			</div>
		</div>
	</header>

	<!-- UNIFIED CORE LIST (Missions, Checklists) -->
	<section class="section-divider core-missions-section">
		<div class="section-heading">
			<span class="section-tag">EXECUTION</span>
			<h2>Daily Missions & Chapter Checklists</h2>
		</div>
		<div class="two-col-flow">
			<div class="flat-pane">
				<div class="pane-title"><NavIcon name="list" size={15} /> Today's Priorities</div>
				<UpNextWidget />
			</div>
			<div class="flat-pane">
				<div class="pane-title"><NavIcon name="plan" size={15} /> Active Homework & Due Dates</div>
				<DueHomeworkWidget />
			</div>
		</div>
	</section>

	<!-- COMPACT BOTTOM STRIP (Subject Hubs with thin progress bars) -->
	<section class="section-divider subjects-section">
		<div class="section-heading">
			<span class="section-tag">SYLLABUS COVERAGE</span>
			<h2>Subject Hubs</h2>
		</div>
		<div class="subjects-flat-wrapper">
			<SubjectCardsWidget />
		</div>
	</section>

	<!-- STUDY HISTORY & ANALYTICS SUMMARY STRIP -->
	<section class="section-divider analytics-section">
		<div class="section-heading">
			<span class="section-tag">CONSISTENCY</span>
			<h2>Study History & Activity Feed</h2>
		</div>
		<div class="analytics-flat-flow">
			<div class="analytics-left">
				<div class="flat-pane">
					<div class="pane-title"><NavIcon name="stats" size={15} /> 7-Day Consistency</div>
					<WeeklyStandingWidget />
				</div>
			</div>
			<div class="analytics-right">
				<div class="flat-pane">
					<div class="pane-title"><NavIcon name="history" size={15} /> Recent Activity</div>
					<RecentActivityWidget />
				</div>
			</div>
		</div>
		<div class="heatmap-flat-pane">
			<div class="pane-title"><NavIcon name="history" size={15} /> 365-Day Matrix</div>
			<YearlyHeatmapWidget />
		</div>
	</section>
</div>

<style>
	.minimalist-layout {
		display: flex;
		flex-direction: column;
		gap: 2.2rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	/* TOP STATUS BAR */
	.mini-status-bar {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-bottom: 1.6rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.status-summary-pill {
		display: none;
	}

	.top-widgets-row {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1fr;
		gap: 1.25rem;
		align-items: stretch;
	}

	.top-widget-slot {
		padding: 1.2rem 1.4rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-panel) 60%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		min-width: 0;
	}

	/* SECTION DIVIDERS */
	.section-divider {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-heading {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.section-tag {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: var(--accent);
		text-transform: uppercase;
	}

	.section-heading h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 750;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	/* TWO-COLUMN FLOW */
	.two-col-flow {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.4rem;
	}

	.flat-pane {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1.2rem 1.35rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-panel) 45%, transparent);
		min-width: 0;
	}

	.pane-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.82rem;
		font-weight: 750;
		letter-spacing: 0.02em;
		color: var(--text-secondary);
		padding-bottom: 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
	}

	/* SUBJECTS */
	.subjects-flat-wrapper {
		width: 100%;
	}

	/* ANALYTICS */
	.analytics-flat-flow {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.4rem;
	}

	.heatmap-flat-pane {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1.2rem 1.35rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-panel) 45%, transparent);
		margin-top: 0.5rem;
		overflow-x: auto;
	}

	/* TABLET BREAKPOINT (768px – 1023px) */
	@media (max-width: 1023px) and (min-width: 768px) {
		.top-widgets-row {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.two-col-flow {
			grid-template-columns: 1fr;
		}
		.analytics-flat-flow {
			grid-template-columns: 1fr;
		}
	}

	/* MOBILE BREAKPOINT (< 768px) */
	@media (max-width: 767px) {
		.minimalist-layout {
			gap: 1.5rem;
		}

		/* STICKY MINI-BAR */
		.mini-status-bar {
			position: sticky;
			top: calc(max(env(safe-area-inset-top), 14px) + 56px);
			z-index: 12;
			background: color-mix(in srgb, var(--surface-canvas, #0d0c16) 92%, transparent);
			backdrop-filter: blur(24px) saturate(190%);
			-webkit-backdrop-filter: blur(24px) saturate(190%);
			margin-inline: -0.85rem;
			padding: 0.5rem 0.85rem;
			border-bottom: 0.5px solid var(--border-subtle);
			gap: 0;
		}

		.status-summary-pill {
			display: flex;
			align-items: center;
			justify-content: space-between;
			height: 48px;
			padding: 0 0.85rem;
			border-radius: 12px;
			background: color-mix(in srgb, var(--surface-panel) 80%, transparent);
			border: 0.5px solid var(--border-subtle);
			font-size: 0.78rem;
			gap: 0.45rem;
		}

		.status-badge.live-dot {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			font-size: 0.68rem;
			font-weight: 800;
			text-transform: uppercase;
			color: var(--success);
		}

		.status-badge.live-dot i {
			width: 6px;
			height: 6px;
			border-radius: 99px;
			background: var(--success);
			box-shadow: 0 0 6px var(--success);
		}

		.status-metric {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			color: var(--text-primary);
			font-size: 0.76rem;
		}

		.status-metric small {
			color: var(--text-secondary);
			font-size: 0.68rem;
		}

		.divider {
			color: var(--border-subtle);
			font-size: 0.8rem;
		}

		.top-widgets-row {
			display: flex;
			flex-direction: column;
			gap: 0.85rem;
			margin-top: 0.85rem;
		}

		.two-col-flow {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.analytics-flat-flow {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.flat-pane {
			padding: 0.95rem 1rem;
			border-radius: 14px;
		}

		.section-divider {
			padding-bottom: 1.5rem;
		}
	}

	/* Simulated Tablet Mode */
	.minimalist-layout.mode-tablet .top-widgets-row {
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	.minimalist-layout.mode-tablet .two-col-flow {
		grid-template-columns: 1fr;
	}
	.minimalist-layout.mode-tablet .analytics-flat-flow {
		grid-template-columns: 1fr;
	}

	/* Simulated Mobile Mode */
	.minimalist-layout.mode-mobile .mini-status-bar {
		position: sticky;
		top: 0;
		padding: 0.6rem 0.8rem;
		background: color-mix(in srgb, var(--surface-panel) 90%, transparent);
	}
	.minimalist-layout.mode-mobile .top-widgets-row {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 0.85rem;
	}
	.minimalist-layout.mode-mobile .two-col-flow {
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	.minimalist-layout.mode-mobile .analytics-flat-flow {
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	.minimalist-layout.mode-mobile .flat-pane {
		padding: 0.95rem 1rem;
		border-radius: 14px;
	}
	.minimalist-layout.mode-mobile .section-divider {
		padding-bottom: 1.5rem;
	}
</style>
