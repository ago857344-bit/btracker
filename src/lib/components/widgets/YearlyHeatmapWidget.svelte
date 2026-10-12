<script lang="ts">
	import { tracker, streakDays } from '$lib/stores/tracker';
	import { todayKey, addDaysKey, focusMinutesOn, dayKeyOf } from '$lib/state/dates';

	interface DayCell {
		key: string;
		date: Date;
		minutes: number;
		solved: number;
		level: number;
		isToday: boolean;
		isFrozen: boolean;
		monthLabel?: string;
	}

	let hoveredCell: DayCell | null = null;
	let tooltipX = 0;
	let tooltipY = 0;

	const sumSolved = (bucket: Partial<Record<string, number>> | undefined) =>
		Object.values(bucket ?? {}).reduce<number>((total, value) => total + (Number(value) || 0), 0);

	$: today = todayKey();
	$: usedFreezes = $tracker.streakFreezes?.usedDates || [];

	// Generate 52 weeks (7 rows x 52 cols = 364 days + remainder)
	$: matrixData = (() => {
		const cols: DayCell[][] = [];
		const now = new Date();
		// Find end of current week (Sunday) or today
		const daysToGenerate = 52 * 7;
		const startDate = new Date();
		startDate.setDate(now.getDate() - daysToGenerate + 1);

		let activeDaysCount = 0;
		let totalMinutesCount = 0;
		let totalQuestionsCount = 0;

		let currentWeek: DayCell[] = [];
		let lastMonth = -1;

		for (let i = 0; i < daysToGenerate; i++) {
			const d = new Date(startDate);
			d.setDate(startDate.getDate() + i);
			const key = dayKeyOf(d);
			const mins = focusMinutesOn($tracker.log, key);
			const solved = sumSolved($tracker.stat[key]);
			const isToday = key === today;
			const isFrozen = usedFreezes.includes(key);

			if (mins > 0 || solved > 0) activeDaysCount++;
			totalMinutesCount += mins;
			totalQuestionsCount += solved;

			let level = 0;
			if (isFrozen) level = -1; // special frozen state
			else if (mins >= 180 || solved >= 50) level = 4;
			else if (mins >= 90 || solved >= 25) level = 3;
			else if (mins >= 40 || solved >= 10) level = 2;
			else if (mins > 0 || solved > 0) level = 1;

			let monthLabel: string | undefined = undefined;
			if (d.getMonth() !== lastMonth && d.getDate() <= 7) {
				monthLabel = d.toLocaleString('en-US', { month: 'short' });
				lastMonth = d.getMonth();
			}

			const cell: DayCell = {
				key,
				date: d,
				minutes: mins,
				solved,
				level,
				isToday,
				isFrozen,
				monthLabel
			};

			currentWeek.push(cell);

			if (currentWeek.length === 7) {
				cols.push(currentWeek);
				currentWeek = [];
			}
		}

		if (currentWeek.length > 0) {
			cols.push(currentWeek);
		}

		return {
			cols,
			activeDaysCount,
			totalHours: Math.round(totalMinutesCount / 60),
			totalQuestionsCount
		};
	})();

	function formatHours(mins: number): string {
		if (mins < 60) return `${mins}m`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	function handleMouseEnter(cell: DayCell, event: MouseEvent) {
		hoveredCell = cell;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		tooltipX = rect.left + rect.width / 2;
		tooltipY = rect.top - 8;
	}

	function handleMouseLeave() {
		hoveredCell = null;
	}
</script>

<div class="yearly-matrix-widget">
	<div class="matrix-topbar">
		<div class="summary-pills">
			<span class="stat-pill">🔥 <b>{$streakDays}</b> day streak</span>
			<span class="stat-pill">📅 <b>{matrixData.activeDaysCount}</b> active days</span>
			<span class="stat-pill">⏱️ <b>{matrixData.totalHours}h</b> focused</span>
			<span class="stat-pill">🎯 <b>{matrixData.totalQuestionsCount}</b> solved</span>
		</div>
	</div>

	<div class="grid-scroll-wrap">
		<div class="calendar-grid">
			<!-- Month labels across top -->
			<div class="month-row">
				<div class="weekday-gutter"></div>
				<div class="month-labels">
					{#each matrixData.cols as week, i}
						<div class="month-col">
							{#if week[0]?.monthLabel}
								<span class="m-label">{week[0].monthLabel}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Main 7-row calendar grid -->
			<div class="days-area">
				<div class="weekday-labels">
					<span>Mon</span>
					<span>Wed</span>
					<span>Fri</span>
					<span>Sun</span>
				</div>

				<div class="week-columns">
					{#each matrixData.cols as week}
						<div class="week-col">
							{#each week as day (day.key)}
								<div
									class="day-square lvl-{day.level}"
									class:today={day.isToday}
									class:frozen={day.isFrozen}
									on:mouseenter={(e) => handleMouseEnter(day, e)}
									on:mouseleave={handleMouseLeave}
									role="tooltip"
									aria-label="{day.key}"
								>
									{#if day.isFrozen}
										<i class="freeze-dot"></i>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Legend -->
	<div class="matrix-footer">
		<div class="freeze-legend">
			<span class="legend-frozen"><i class="freeze-dot inline"></i></span>
			<span>Streak Freeze Protected</span>
		</div>
		<div class="intensity-legend">
			<span class="legend-text">Less</span>
			<span class="day-square lvl-0 mini"></span>
			<span class="day-square lvl-1 mini"></span>
			<span class="day-square lvl-2 mini"></span>
			<span class="day-square lvl-3 mini"></span>
			<span class="day-square lvl-4 mini"></span>
			<span class="legend-text">More</span>
		</div>
	</div>

	<!-- Hover tooltip -->
	{#if hoveredCell}
		<div
			class="matrix-tooltip"
			style="left: {tooltipX}px; top: {tooltipY}px;"
		>
			<div class="tip-date">
				{hoveredCell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
			</div>
			<div class="tip-details">
				{#if hoveredCell.isFrozen}
					<span class="tip-freeze">🛡️ Streak Freeze Shield</span>
				{/if}
				<span>⏱️ {formatHours(hoveredCell.minutes)}</span>
				<span>🎯 {hoveredCell.solved} solved</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.yearly-matrix-widget {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		padding: 0.35rem 0.2rem;
	}

	.matrix-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.summary-pills {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.stat-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.74rem;
		color: var(--text-secondary);
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		padding: 0.22rem 0.55rem;
		border-radius: 7px;
	}

	.stat-pill b {
		color: var(--text-primary);
		font-weight: 800;
	}

	.grid-scroll-wrap {
		width: 100%;
		overflow-x: auto;
		padding-bottom: 0.4rem;
	}

	.calendar-grid {
		display: inline-flex;
		flex-direction: column;
		min-width: 680px;
	}

	.month-row {
		display: flex;
		height: 18px;
		margin-bottom: 4px;
	}

	.weekday-gutter {
		width: 32px;
		flex-shrink: 0;
	}

	.month-labels {
		display: flex;
		gap: 3px;
		flex: 1;
	}

	.month-col {
		width: 12px;
		position: relative;
		flex-shrink: 0;
	}

	.m-label {
		position: absolute;
		left: 0;
		top: 0;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.days-area {
		display: flex;
		gap: 6px;
	}

	.weekday-labels {
		width: 26px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 2px 0 4px;
		font-size: 0.62rem;
		font-weight: 650;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.week-columns {
		display: flex;
		gap: 3px;
	}

	.week-col {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.day-square {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		background: var(--surface-subtle);
		border: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
		transition: transform 0.1s ease, border-color 0.1s ease;
		position: relative;
		cursor: pointer;
	}

	.day-square:hover {
		transform: scale(1.3);
		z-index: 5;
		border-color: var(--text-primary);
	}

	.day-square.today {
		outline: 1.5px solid var(--accent);
		outline-offset: 1px;
	}

	/* Activity intensity levels */
	.day-square.lvl-0 { background: var(--surface-subtle); }
	.day-square.lvl-1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface-subtle)); }
	.day-square.lvl-2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface-subtle)); }
	.day-square.lvl-3 { background: color-mix(in srgb, var(--accent) 80%, var(--surface-subtle)); }
	.day-square.lvl-4 { background: var(--accent); box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 45%, transparent); }

	/* Frozen days */
	.day-square.lvl--1, .day-square.frozen {
		background: color-mix(in srgb, #38bdf8 35%, var(--surface-subtle));
		border-color: #38bdf8;
	}

	.freeze-dot {
		position: absolute;
		inset: 2px;
		border-radius: 2px;
		background: #38bdf8;
	}

	.freeze-dot.inline {
		display: inline-block;
		width: 8px;
		height: 8px;
		position: static;
		margin-right: 4px;
	}

	.matrix-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.7rem;
		color: var(--text-secondary);
		padding-top: 0.2rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.freeze-legend {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.legend-frozen {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		background: color-mix(in srgb, #38bdf8 30%, var(--surface-subtle));
		border: 1px solid #38bdf8;
		border-radius: 3px;
	}

	.intensity-legend {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.day-square.mini {
		width: 10px;
		height: 10px;
		cursor: default;
	}

	.day-square.mini:hover {
		transform: none;
	}

	.legend-text {
		font-size: 0.65rem;
		margin: 0 2px;
	}

	.matrix-tooltip {
		position: fixed;
		transform: translate(-50%, -100%);
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		padding: 0.45rem 0.65rem;
		border-radius: 8px;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
		pointer-events: none;
		z-index: 99999;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		white-space: nowrap;
	}

	.tip-date {
		font-size: 0.72rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.tip-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.68rem;
		color: var(--text-secondary);
	}

	.tip-freeze {
		color: #38bdf8;
		font-weight: 700;
	}
</style>
