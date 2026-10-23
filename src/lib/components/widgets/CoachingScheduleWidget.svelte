<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, addPeriodToPlanner, celebration } from '$lib/stores/tracker';
	import { todayKey, addDaysKey } from '$lib/state/dates';
	import type { TimetableDay, TimetablePeriod } from '$lib/types/tracker';

	const WEEKDAYS: TimetableDay[] = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday'
	];

	const now = new Date();
	const currentDayIndex = now.getDay();
	const todayDay: TimetableDay = WEEKDAYS[currentDayIndex];
	const tomorrowDay: TimetableDay = WEEKDAYS[(currentDayIndex + 1) % 7];

	$: timetable = $tracker.timetable ?? { batchName: '', periods: [] };
	$: allPeriods = timetable.periods ?? [];

	$: todayKeyStr = todayKey();
	$: tomorrowKeyStr = addDaysKey(todayKeyStr, 1);
	$: hasDatedPeriods = allPeriods.some((p) => !!p.date);

	// Today's periods: match exact ISO date if any period has dates, fallback to weekday
	$: todayPeriods = (() => {
		if (hasDatedPeriods) {
			const matched = allPeriods.filter((p) => p.date === todayKeyStr);
			if (matched.length > 0) return matched.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
		}
		return allPeriods
			.filter((p) => p.day === todayDay)
			.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
	})();

	// Tomorrow's periods
	$: tomorrowPeriods = (() => {
		if (hasDatedPeriods) {
			const matched = allPeriods.filter((p) => p.date === tomorrowKeyStr);
			if (matched.length > 0) return matched.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
		}
		return allPeriods
			.filter((p) => p.day === tomorrowDay)
			.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
	})();

	function periodEndMinutes(p?: TimetablePeriod): number {
		if (!p || !p.endTime) return 0;
		const [h, m] = p.endTime.split(':').map(Number);
		return (h || 0) * 60 + (m || 0);
	}

	let userSelectedView: 'today' | 'tomorrow' | null = null;

	$: currentHour = now.getHours();
	$: currentMinutes = currentHour * 60 + now.getMinutes();

	$: allTodayFinished = (todayPeriods?.length ?? 0) > 0 && todayPeriods.every((p) => periodEndMinutes(p) <= currentMinutes);
	$: shouldDefaultToTomorrow = currentHour >= 19 || allTodayFinished || ((todayPeriods?.length ?? 0) === 0 && (tomorrowPeriods?.length ?? 0) > 0);

	$: activeView = userSelectedView ?? (shouldDefaultToTomorrow ? 'tomorrow' : 'today');

	$: viewingDay = activeView === 'today' ? todayDay : tomorrowDay;
	$: targetDateKey = activeView === 'today' ? todayKeyStr : tomorrowKeyStr;
	$: displayPeriods = activeView === 'today' ? (todayPeriods ?? []) : (tomorrowPeriods ?? []);

	// Period status calculation for today's periods
	function getPeriodStatus(p: TimetablePeriod): 'now' | 'upcoming' | 'passed' {
		if (activeView === 'tomorrow') return 'upcoming';
		if (!p.startTime || !p.endTime) return 'upcoming';
		const [sh, sm] = p.startTime.split(':').map(Number);
		const [eh, em] = p.endTime.split(':').map(Number);
		const startM = (sh || 0) * 60 + (sm || 0);
		const endM = (eh || 0) * 60 + (em || 0);

		if (currentMinutes >= startM && currentMinutes < endM) return 'now';
		if (currentMinutes < startM) return 'upcoming';
		return 'passed';
	}

	function formatTime12(t?: string): string {
		if (!t) return '';
		const [hh, mm] = t.split(':').map(Number);
		if (isNaN(hh)) return t;
		const ampm = hh >= 12 ? 'PM' : 'AM';
		const h = hh % 12 || 12;
		return `${h}:${String(mm ?? 0).padStart(2, '0')} ${ampm}`;
	}

	function formatDisplayDate(isoDate?: string): string {
		if (!isoDate || typeof isoDate !== 'string') return '';
		const [y, m, d] = isoDate.split('-').map(Number);
		if (isNaN(y) || isNaN(m) || isNaN(d)) return isoDate;
		const dateObj = new Date(y, m - 1, d);
		return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
	}

	function getSubjectColor(sub: string): string {
		if (sub === 'P') return 'var(--accent, #6d5dfc)';
		if (sub === 'C') return '#2f9e6e';
		if (sub === 'M') return '#f59f00';
		if (sub === 'Test') return '#e0455a';
		return 'var(--text-secondary)';
	}

	function getSubjectTitle(sub: string): string {
		if (sub === 'P') return 'Physics';
		if (sub === 'C') return 'Chemistry';
		if (sub === 'M') return 'Maths';
		if (sub === 'Test') return 'Test';
		return sub;
	}

	function handleAddToPlan(p: TimetablePeriod) {
		const targetDate = p.date || targetDateKey;
		addPeriodToPlanner(p, targetDate);
		celebration.set(`Added "${p.topic}" to planner for ${targetDate}! 🎯`);
	}
</script>

<div class="coaching-widget">
	<header class="widget-header">
		<div class="day-toggle" role="tablist" aria-label="Schedule day selector">
			<button
				type="button"
				role="tab"
				class="toggle-btn"
				class:active={activeView === 'today'}
				aria-selected={activeView === 'today'}
				on:click={() => (userSelectedView = 'today')}
			>
				Today
			</button>
			<button
				type="button"
				role="tab"
				class="toggle-btn"
				class:active={activeView === 'tomorrow'}
				aria-selected={activeView === 'tomorrow'}
				on:click={() => (userSelectedView = 'tomorrow')}
			>
				Tomorrow
			</button>
		</div>

		<div class="header-right">
			{#if timetable.batchName && !timetable.batchName.toLowerCase().includes('coaching')}
				<span class="batch-badge font-mono" title={timetable.batchName}>
					{timetable.batchName}
				</span>
			{/if}
			<a href="/plan" class="view-all-link" title="Open Daily Planner">
				<span>Planner</span>
				<NavIcon name="arrow-right" size={11} />
			</a>
		</div>
	</header>

	<div class="day-meta-row font-mono">
		<span class="day-label">
			{activeView === 'today' ? 'Today’s Classes' : 'Next Day’s Schedule'} · {viewingDay}
			{#if hasDatedPeriods && displayPeriods.length > 0 && displayPeriods[0].date}
				<span class="date-chip">({formatDisplayDate(displayPeriods[0].date)})</span>
			{/if}
		</span>
		<span class="period-count">
			{displayPeriods.length} {displayPeriods.length === 1 ? 'period' : 'periods'}
		</span>
	</div>

	{#if displayPeriods.length > 0}
		<ul class="periods-list">
			{#each displayPeriods as period (period.id)}
				{@const status = getPeriodStatus(period)}
				<li class="period-item" class:is-now={status === 'now'} class:is-passed={status === 'passed'}>
					<div class="period-left">
						<div class="time-block font-mono">
							<span class="start-time">{formatTime12(period.startTime)}</span>
							<span class="end-time">{formatTime12(period.endTime)}</span>
						</div>
						<span class="sub-stripe" style="background: {getSubjectColor(period.subject)}"></span>
					</div>

					<div class="period-info">
						<div class="topic-row">
							<span class="subject-tag font-mono" style="color: {getSubjectColor(period.subject)}">
								{getSubjectTitle(period.subject)}
							</span>
							{#if period.notes}
								<span class="note-pill font-mono">{period.notes}</span>
							{/if}
							{#if status === 'now'}
								<span class="live-badge">
									<span class="pulse-dot"></span> LIVE
								</span>
							{/if}
						</div>
						<p class="topic-text" title={period.topic}>{period.topic}</p>
						<div class="period-meta font-mono">
							{#if period.room}
								<span class="meta-item">
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
									{period.room}
								</span>
							{/if}
							{#if period.teacher}
								<span class="meta-item">
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
									{period.teacher}
								</span>
							{/if}
						</div>
					</div>

					<button
						type="button"
						class="btn-add-plan"
						title="Add to daily planner tasks"
						aria-label="Add period to daily planner"
						on:click={() => handleAddToPlan(period)}
					>
						<NavIcon name="plus" size={12} />
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty-state">
			{#if allPeriods.length === 0}
				<div class="empty-icon-wrap">
					<NavIcon name="plan" size={22} />
				</div>
				<p class="empty-title">No Timetable Set Up</p>
				<p class="empty-desc">Upload your batch timetable PDF to automatically populate your daily schedule.</p>
				<a href="/plan" class="btn-setup">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
					Upload your timetable
				</a>
			{:else}
				<div class="empty-icon-wrap">
					<NavIcon name="check-circle" size={22} />
				</div>
				<p class="empty-title">No Classes {activeView === 'today' ? 'Today' : 'Tomorrow'}</p>
				<p class="empty-desc">Clear schedule for {viewingDay}. Perfect day for self-study and revision!</p>
				<a href="/plan" class="btn-setup subtle">
					View Planner ↗
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.coaching-widget {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		height: 100%;
		min-height: 0;
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.day-toggle {
		display: inline-flex;
		align-items: center;
		padding: 2px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 9px;
	}

	.toggle-btn {
		background: transparent;
		border: 0;
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.22rem 0.6rem;
		border-radius: 7px;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.16s ease;
	}

	.toggle-btn:hover {
		color: var(--text-primary);
	}

	.toggle-btn.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		font-weight: 700;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}

	.batch-badge {
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.18rem 0.45rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 110px;
	}

	.view-all-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.16s ease;
	}

	.view-all-link:hover {
		color: var(--accent);
	}

	.day-meta-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.64rem;
		color: var(--text-secondary);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-weight: 700;
		padding-bottom: 0.2rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.date-chip {
		color: var(--accent);
		margin-left: 0.25rem;
		font-weight: 750;
	}

	.periods-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		overflow-y: auto;
		max-height: 280px;
		scrollbar-width: thin;
	}

	.period-item {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-subtle);
		transition: all 0.18s ease;
		position: relative;
	}

	.period-item:hover {
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
		background: var(--surface-panel);
	}

	.period-item.is-now {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
		box-shadow: 0 0 0 1px var(--accent-soft);
	}

	.period-item.is-passed {
		opacity: 0.62;
	}

	.period-left {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-shrink: 0;
	}

	.time-block {
		display: flex;
		flex-direction: column;
		font-size: 0.66rem;
		line-height: 1.25;
		text-align: right;
		min-width: 54px;
	}

	.start-time {
		font-weight: 750;
		color: var(--text-primary);
	}

	.end-time {
		font-size: 0.58rem;
		color: var(--text-secondary);
	}

	.sub-stripe {
		width: 3.5px;
		height: 32px;
		border-radius: 99px;
		flex-shrink: 0;
	}

	.period-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}

	.topic-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.subject-tag {
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.note-pill {
		font-size: 0.55rem;
		font-weight: 750;
		padding: 0.08rem 0.35rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 140px;
	}

	.live-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 0.08rem 0.35rem;
		border-radius: 99px;
		background: color-mix(in srgb, #ef4444 15%, transparent);
		color: #ef4444;
		border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
	}

	.pulse-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #ef4444;
		animation: live-pulse 1.4s ease infinite;
	}

	@keyframes live-pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.7); }
	}

	.topic-text {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 650;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.period-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.6rem;
		color: var(--text-secondary);
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.btn-add-plan {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 7px;
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.16s ease;
	}

	.btn-add-plan:hover {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast, #ffffff);
		transform: scale(1.05);
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 1.2rem 0.8rem;
		gap: 0.35rem;
		margin: auto 0;
	}

	.empty-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		margin-bottom: 0.25rem;
	}

	.empty-title {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.empty-desc {
		margin: 0;
		font-size: 0.7rem;
		color: var(--text-secondary);
		line-height: 1.45;
		max-width: 260px;
	}

	.btn-setup {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.5rem;
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		font-size: 0.72rem;
		font-weight: 700;
		text-decoration: none;
		transition: opacity 0.16s ease;
	}

	.btn-setup:hover {
		opacity: 0.9;
	}

	.btn-setup.subtle {
		background: var(--surface-subtle);
		color: var(--accent);
		border: 1px solid var(--border-subtle);
	}

	.btn-setup.subtle:hover {
		background: var(--surface-panel);
		border-color: var(--accent);
	}

	@media (max-width: 600px) {
		.widget-header {
			gap: 0.35rem;
		}

		.batch-badge {
			max-width: 85px;
		}

		.period-item {
			padding: 0.55rem 0.55rem;
			gap: 0.5rem;
		}

		.time-block {
			min-width: 48px;
		}

		.topic-text {
			font-size: 0.76rem;
			white-space: normal;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
			line-height: 1.3;
		}

		.btn-add-plan {
			width: 32px;
			height: 32px;
			border-radius: 8px;
		}
	}
</style>
