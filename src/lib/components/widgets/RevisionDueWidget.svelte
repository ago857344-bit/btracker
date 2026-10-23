<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker } from '$lib/stores/tracker';
	import { chaptersDueToday } from '$lib/stores/recall-selectors';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import { goto } from '$app/navigation';

	$: dueList = $chaptersDueToday || [];
	$: topDue = dueList.slice(0, 3);
	$: totalDueCount = dueList.length;

	$: dueCardsCount = ($tracker.flashcards || []).filter(
		(c) => (c.nextReviewAt || 0) <= Date.now()
	).length;

	$: recentMocks = $tracker.mocks || [];
	$: latestMock = recentMocks.length > 0 ? recentMocks[recentMocks.length - 1] : null;
</script>

<div class="rev-widget">
	<div class="rev-grid">
		<!-- Spaced Repetition Chapters Section -->
		<div class="rev-section">
			<div class="sec-head">
				<div class="title-with-pill">
					<span class="sec-label">Spaced Revision</span>
					<span class="count-badge" class:urgent={totalDueCount > 0}>
						{totalDueCount} {totalDueCount === 1 ? 'due' : 'due'}
					</span>
				</div>
				<button type="button" class="btn-link" on:click={() => goto('/revise')}>
					<span>Review All</span>
					<NavIcon name="arrow-right" size={12} />
				</button>
			</div>

			{#if topDue.length > 0}
				<ul class="ch-list">
					{#each topDue as ch (ch.chapterKey)}
						{@const [subCode, ...rest] = ch.chapterKey.split(/[-:]/)}
						<li>
							<button type="button" class="ch-row" on:click={() => goto('/revise')}>
								<span class="sub-dot" style="background: {subjectColor(subCode)}"></span>
								<span class="ch-name" title={rest.join('-').trim() || ch.chapterKey}>
									{rest.join('-').trim() || ch.chapterKey}
								</span>
								<span class="score-pill" class:crit={ch.currentScore < 30} class:fading={ch.currentScore >= 30 && ch.currentScore < 60}>
									{Math.round(ch.currentScore)}% Health
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="all-caught-up">
					<span class="green-check"><NavIcon name="check-circle" size={16} /></span>
					<span>Memory health 100% · No chapters due today!</span>
				</div>
			{/if}
		</div>

		<!-- Flashcards & Mock Tests Quick Card -->
		<div class="rec-side">
			<!-- Flashcard Mini Pill -->
			<button type="button" class="mini-card" on:click={() => goto('/revise')}>
				<div class="mini-head">
					<span class="icon-wrap card-icon"><NavIcon name="layers" size={14} /></span>
					<span class="mini-title">Active Recall</span>
				</div>
				<div class="mini-body">
					<b>{dueCardsCount} Cards</b>
					<small>{dueCardsCount > 0 ? 'Ready for recall' : 'Deck up to date'}</small>
				</div>
				<span class="action-arrow"><NavIcon name="arrow-right" size={12} /></span>
			</button>

			<!-- Mock Tests Mini Pill -->
			<button type="button" class="mini-card" on:click={() => goto('/tests')}>
				<div class="mini-head">
					<span class="icon-wrap mock-icon"><NavIcon name="tests" size={14} /></span>
					<span class="mini-title">Mock Tests</span>
				</div>
				<div class="mini-body">
					{#if latestMock}
						<b>{latestMock.score} <small>/ {latestMock.totalMarks}</small></b>
						<small>{latestMock.name.slice(0, 14)}</small>
					{:else}
						<b>No Mocks</b>
						<small>Log to track errors</small>
					{/if}
				</div>
				<span class="action-arrow"><NavIcon name="arrow-right" size={12} /></span>
			</button>
		</div>
	</div>
</div>

<style>
	.rev-widget {
		display: grid;
		gap: 0.65rem;
		height: 100%;
		align-content: start;
	}

	.rev-grid {
		display: grid;
		grid-template-columns: 1.35fr 1fr;
		gap: 0.75rem;
		height: 100%;
	}

	@media (max-width: 640px) {
		.rev-grid {
			grid-template-columns: 1fr;
		}
	}

	.rev-section {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		background: color-mix(in srgb, var(--surface-subtle) 60%, transparent);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.65rem 0.75rem;
	}

	.sec-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.2rem;
	}

	.title-with-pill {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.sec-label {
		font-size: 0.66rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}

	.count-badge {
		font-size: 0.6rem;
		font-weight: 800;
		padding: 0.1rem 0.4rem;
		border-radius: 99px;
		background: var(--surface-panel);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.count-badge.urgent {
		background: color-mix(in srgb, var(--danger, #ff4d6d) 16%, transparent);
		color: var(--danger, #ff4d6d);
		border-color: color-mix(in srgb, var(--danger, #ff4d6d) 30%, transparent);
	}

	.btn-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.68rem;
		font-weight: 750;
		color: var(--accent);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.btn-link:hover {
		text-decoration: underline;
	}

	.ch-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.ch-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		width: 100%;
		padding: 0.4rem 0.5rem;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.16s ease;
	}

	.ch-row:hover {
		border-color: var(--accent);
		transform: translateX(2px);
	}

	.sub-dot {
		flex: 0 0 7px;
		width: 7px;
		height: 7px;
		border-radius: 99px;
	}

	.ch-name {
		flex: 1;
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.score-pill {
		font-size: 0.62rem;
		font-weight: 800;
		padding: 0.12rem 0.4rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--success, #2f9e6e) 15%, transparent);
		color: var(--success, #2f9e6e);
		border: 1px solid color-mix(in srgb, var(--success, #2f9e6e) 30%, transparent);
	}

	.score-pill.fading {
		background: color-mix(in srgb, var(--warning, #f59f00) 15%, transparent);
		color: var(--warning, #f59f00);
		border-color: color-mix(in srgb, var(--warning, #f59f00) 30%, transparent);
	}

	.score-pill.crit {
		background: color-mix(in srgb, var(--danger, #ff4d6d) 15%, transparent);
		color: var(--danger, #ff4d6d);
		border-color: color-mix(in srgb, var(--danger, #ff4d6d) 30%, transparent);
	}

	.all-caught-up {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 0.5rem;
		font-size: 0.74rem;
		color: var(--text-secondary);
	}

	.green-check {
		color: var(--success, #2f9e6e);
		display: grid;
		place-items: center;
	}

	.rec-side {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.mini-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.65rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-subtle) 60%, transparent);
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		text-align: left;
		color: inherit;
		flex: 1;
		transition: all 0.16s ease;
	}

	.mini-card:hover {
		border-color: var(--accent);
		background: var(--surface-panel);
		transform: translateY(-1px);
	}

	.icon-wrap {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		flex: 0 0 28px;
	}

	.card-icon {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
	}

	.mock-icon {
		background: color-mix(in srgb, #e67700 15%, transparent);
		color: #e67700;
	}

	.mini-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.mini-body b {
		font-size: 0.8rem;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.mini-body small {
		font-size: 0.64rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-arrow {
		color: var(--text-secondary);
		opacity: 0.6;
		transition: transform 0.16s ease;
	}

	.mini-card:hover .action-arrow {
		transform: translateX(2px);
		opacity: 1;
		color: var(--accent);
	}

	@media (max-width: 640px) {
		.ch-row {
			min-height: 42px;
			padding: 0.5rem 0.65rem;
		}

		.mini-card {
			min-height: 48px;
			padding: 0.65rem 0.75rem;
		}

		.rec-side {
			gap: 0.55rem;
		}
	}
</style>
