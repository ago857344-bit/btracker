<script lang="ts">
	import DailyProgressWidget from '$lib/components/widgets/DailyProgressWidget.svelte';
	import UpNextWidget from '$lib/components/widgets/UpNextWidget.svelte';
	import DueHomeworkWidget from '$lib/components/widgets/DueHomeworkWidget.svelte';
	import QuoteWidget from '$lib/components/widgets/QuoteWidget.svelte';
	import NewTargetWidget from '$lib/components/widgets/NewTargetWidget.svelte';
	import SubjectCardsWidget from '$lib/components/widgets/SubjectCardsWidget.svelte';
	import WeeklyStandingWidget from '$lib/components/widgets/WeeklyStandingWidget.svelte';
	import RecentActivityWidget from '$lib/components/widgets/RecentActivityWidget.svelte';
	import YearlyHeatmapWidget from '$lib/components/widgets/YearlyHeatmapWidget.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';
</script>

<div class="focus-layout" class:mode-tablet={deviceMode === 'tablet'} class:mode-mobile={deviceMode === 'mobile'}>
	<!-- ASYMMETRIC SPLIT: MAIN STAGE (70%) vs SIDE RAIL (30%) -->
	<div class="focus-split">
		<!-- MAIN STAGE (70% on Desktop) -->
		<main class="main-stage">
			<!-- Centerpiece Hero Timer Card -->
			<section class="hero-timer-card specular-card">
				<div class="stage-tag-row">
					<span class="hero-live-pill">⚡ FOCUS COMMAND CENTER</span>
					<span class="hero-action-hint">Active Session</span>
				</div>
				<div class="hero-timer-content">
					<DailyProgressWidget />
				</div>
			</section>

			<!-- Today's Mission Planner & Chapter Checklists -->
			<section class="stage-missions-grid">
				<div class="mission-card specular-card">
					<div class="card-title-row">
						<NavIcon name="list" size={16} />
						<h3>Today's Mission Planner</h3>
					</div>
					<UpNextWidget />
				</div>
				<div class="mission-card specular-card">
					<div class="card-title-row">
						<NavIcon name="plan" size={16} />
						<h3>Active Chapter Checklist</h3>
					</div>
					<DueHomeworkWidget />
				</div>
			</section>
		</main>

		<!-- SIDE RAIL (30% on Desktop) -->
		<aside class="side-rail">
			<div class="rail-header">
				<span class="rail-title"><NavIcon name="stats" size={14} /> Mission Support &amp; Stats</span>
			</div>

			<!-- Streak & Daily Motivation -->
			<div class="rail-card specular-card">
				<div class="rail-card-head"><NavIcon name="quote" size={13} /> Motivation &amp; Streak</div>
				<QuoteWidget />
			</div>

			<!-- Daily Targets & Exam Countdown -->
			<div class="rail-card specular-card">
				<div class="rail-card-head"><NavIcon name="target" size={13} /> Target Countdown</div>
				<NewTargetWidget />
			</div>

			<!-- Subject Hubs Overview -->
			<div class="rail-card specular-card">
				<div class="rail-card-head"><NavIcon name="layers" size={13} /> Subject Hubs</div>
				<SubjectCardsWidget />
			</div>

			<!-- 7-Day Consistency & Activity -->
			<div class="rail-card specular-card">
				<div class="rail-card-head"><NavIcon name="stats" size={13} /> Weekly Trend</div>
				<WeeklyStandingWidget />
			</div>

			<!-- 365-Day Matrix -->
			<div class="rail-card specular-card">
				<div class="rail-card-head"><NavIcon name="history" size={13} /> Yearly Consistency</div>
				<YearlyHeatmapWidget />
			</div>

			<!-- Activity Feed -->
			<div class="rail-card specular-card">
				<div class="rail-card-head"><NavIcon name="history" size={13} /> Recent Log</div>
				<RecentActivityWidget />
			</div>
		</aside>
	</div>
</div>

<style>
	.focus-layout {
		width: 100%;
		max-width: 1560px;
		margin: 0 auto;
	}

	.focus-split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 380px;
		gap: 1.5rem;
		align-items: start;
	}

	/* MAIN STAGE (70%) */
	.main-stage {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		min-width: 0;
	}

	.hero-timer-card {
		position: relative;
		padding: 1.6rem 2rem 1.8rem;
		border: 1px solid var(--vision-bevel-border, color-mix(in srgb, var(--accent) 30%, var(--border-subtle)));
		border-radius: 24px;
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(28px)) saturate(190%);
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(28px)) saturate(190%);
		box-shadow: var(--shadow-card), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.12));
		overflow: hidden;
		transition: box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.28s ease, transform 0.22s var(--ease-ios-spring);
	}
	.hero-timer-card:hover {
		border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 50%);
		transform: translateY(-2px);
		box-shadow: 0 20px 52px -10px rgba(0, 0, 0, 0.44), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.14));
	}

	.stage-tag-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.2rem;
	}

	.hero-live-pill {
		font-size: 0.74rem;
		font-weight: 850;
		letter-spacing: 0.1em;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		padding: 0.3rem 0.75rem;
		border-radius: 99px;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.hero-action-hint {
		font-size: 0.74rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.hero-timer-content {
		min-height: 180px;
		display: flex;
		align-items: center;
	}

	.stage-missions-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.4rem;
	}

	.mission-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.35rem 1.5rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 20px;
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(20px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(20px));
		box-shadow: var(--shadow-card), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.08));
		overflow: hidden;
		min-width: 0;
		transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.22s var(--ease-ios-spring);
	}
	.mission-card:hover {
		border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 50%);
		transform: translateY(-2px);
		box-shadow: 0 16px 44px -6px rgba(0, 0, 0, 0.38), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.12));
	}

	.card-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--accent);
	}

	.card-title-row h3 {
		margin: 0;
		font-size: 0.96rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	/* SIDE RAIL (30%) */
	.side-rail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: sticky;
		top: calc(max(env(safe-area-inset-top), 14px) + 70px);
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		padding-right: 4px;
		scrollbar-width: thin;
	}

	.rail-header {
		padding: 0.2rem 0.4rem;
	}

	.rail-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.74rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.rail-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.15rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 16px;
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(16px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
		box-shadow: var(--shadow-card), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.08));
		overflow: hidden;
		min-width: 0;
		transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.22s var(--ease-ios-spring);
	}
	.rail-card:hover {
		border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 50%);
		transform: translateY(-2px);
		box-shadow: 0 16px 44px -6px rgba(0, 0, 0, 0.38), var(--vision-bevel-inner, inset 0 1px 0 rgba(255, 255, 255, 0.12));
	}

	.rail-card-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.74rem;
		font-weight: 750;
		color: var(--text-secondary);
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
		padding-bottom: 0.4rem;
	}

	/* TABLET BREAKPOINT (768px – 1023px) */
	@media (max-width: 1023px) and (min-width: 768px) {
		.focus-split {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.stage-missions-grid {
			grid-template-columns: 1fr 1fr;
		}

		.side-rail {
			position: static;
			max-height: none;
			overflow-y: visible;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}

		.rail-header {
			grid-column: span 2;
		}
	}

	/* MOBILE BREAKPOINT (< 768px) */
	@media (max-width: 767px) {
		.focus-split {
			grid-template-columns: 1fr;
			gap: 1.25rem;
		}

		/* ABOVE-THE-FOLD HERO STAGE (top 65vh-75vh) */
		.main-stage {
			gap: 1rem;
		}

		.hero-timer-card {
			padding: 1.2rem 1.1rem;
			border-radius: 18px;
			min-height: 40vh;
		}

		.stage-missions-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.mission-card {
			padding: 1.1rem;
			border-radius: 16px;
		}

		/* BELOW-THE-FOLD SECONDARY DECK (Tight 2-column summary grid) */
		.side-rail {
			position: static;
			max-height: none;
			overflow-y: visible;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
		}

		.rail-header {
			grid-column: span 2;
		}

		.rail-card {
			padding: 0.85rem;
			border-radius: 14px;
		}

		/* Span wide analytics items full width on mobile */
		.rail-card:nth-child(n+5) {
			grid-column: span 2;
		}
	}

	/* Simulated Tablet Mode */
	.focus-layout.mode-tablet .focus-split {
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}
	.focus-layout.mode-tablet .stage-missions-grid {
		grid-template-columns: 1fr 1fr;
	}
	.focus-layout.mode-tablet .side-rail {
		position: static;
		max-height: none;
		overflow-y: visible;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.focus-layout.mode-tablet .rail-header {
		grid-column: span 2;
	}

	/* Simulated Mobile Mode */
	.focus-layout.mode-mobile .focus-split {
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}
	.focus-layout.mode-mobile .main-stage {
		gap: 1rem;
	}
	.focus-layout.mode-mobile .hero-timer-card {
		padding: 1.2rem 1.1rem;
		border-radius: 18px;
		min-height: 40vh;
	}
	.focus-layout.mode-mobile .stage-missions-grid {
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	.focus-layout.mode-mobile .mission-card {
		padding: 1.1rem;
		border-radius: 16px;
	}
	.focus-layout.mode-mobile .side-rail {
		position: static;
		max-height: none;
		overflow-y: visible;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.focus-layout.mode-mobile .rail-header {
		grid-column: span 2;
	}
	.focus-layout.mode-mobile .rail-card {
		padding: 0.85rem;
		border-radius: 14px;
	}
	.focus-layout.mode-mobile .rail-card:nth-child(n+5) {
		grid-column: span 2;
	}
</style>
