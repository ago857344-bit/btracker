<script lang="ts">
	import type { DailyBreakdownItem } from '$lib/state/weekly';
	import { formatMinutes } from '$lib/state/dates';

	export let daily: DailyBreakdownItem[] = [];
	export let compact: boolean = false;
	export let showSummary: boolean = true;

	// Scale bounds (so small numbers don't blow up to 100% height inappropriately)
	$: maxHours = Math.max(4, ...daily.map((d) => d.hours));
	$: maxQuestions = Math.max(30, ...daily.map((d) => d.questions));

	let hoveredIndex: number | null = null;

	$: totalMinutes = daily.reduce((sum, d) => sum + d.minutes, 0);
	$: totalQuestions = daily.reduce((sum, d) => sum + d.questions, 0);
	$: activeDays = daily.filter((d) => d.minutes > 0 || d.questions > 0).length;

	$: peakDay = (() => {
		let best: DailyBreakdownItem | null = null;
		let bestScore = -1;
		for (const d of daily) {
			const score = d.hours * 20 + d.questions;
			if (score > bestScore && (d.hours > 0 || d.questions > 0)) {
				bestScore = score;
				best = d;
			}
		}
		return best;
	})();

	$: avgHours = activeDays ? (totalMinutes / 60 / activeDays).toFixed(1) : '0';
	$: avgQuestions = activeDays ? Math.round(totalQuestions / activeDays) : 0;
</script>

<div class="double-graph" class:compact>
	<div class="graph-header">
		<div class="title-group">
			<span class="graph-title">DAILY STUDY &amp; QUESTIONS</span>
			<span class="graph-subtitle">7-Day Breakdown</span>
		</div>
		<div class="legend">
			<div class="legend-item hours">
				<span class="legend-box hours-box"></span>
				<span class="legend-label">Study Hours</span>
			</div>
			<div class="legend-item questions">
				<span class="legend-box questions-box"></span>
				<span class="legend-label">Questions Solved</span>
			</div>
		</div>
	</div>

	<!-- Chart area -->
	<div class="chart-wrapper">
		<div class="chart-gridlines">
			<div class="gridline top"><span class="grid-val">{maxHours.toFixed(0)}h / {maxQuestions}Q</span></div>
			<div class="gridline mid"><span class="grid-val">{(maxHours / 2).toFixed(0)}h / {Math.round(maxQuestions / 2)}Q</span></div>
			<div class="gridline base"></div>
		</div>

		<div class="days-columns" role="list">
			{#each daily as day, i (day.key)}
				{@const hoursHeightPct = day.hours > 0 ? Math.max(8, Math.min(100, (day.hours / maxHours) * 100)) : 0}
				{@const qHeightPct = day.questions > 0 ? Math.max(8, Math.min(100, (day.questions / maxQuestions) * 100)) : 0}
				{@const isHovered = hoveredIndex === i}

				<div
					class="day-col"
					class:today={day.isToday}
					class:future={day.isFuture}
					class:active={day.hours > 0 || day.questions > 0}
					on:mouseenter={() => (hoveredIndex = i)}
					on:mouseleave={() => (hoveredIndex = null)}
					role="listitem"
				>
					<!-- Top value labels on hover or if space permits -->
					<div class="bars-container">
						<!-- Hours Bar -->
						<div class="bar-track">
							{#if day.hours > 0}
								<span class="bar-value hours-val" class:visible={isHovered || !compact}>
									{day.hours >= 1 ? `${day.hours}h` : `${day.minutes}m`}
								</span>
							{/if}
							<div
								class="bar-fill hours-fill"
								style="height: {hoursHeightPct}%;"
								title="{day.dayLabel}: {formatMinutes(day.minutes)}"
							></div>
						</div>

						<!-- Questions Bar -->
						<div class="bar-track">
							{#if day.questions > 0}
								<span class="bar-value q-val" class:visible={isHovered || !compact}>
									{day.questions}
								</span>
							{/if}
							<div
								class="bar-fill q-fill"
								style="height: {qHeightPct}%;"
								title="{day.dayLabel}: {day.questions} questions"
							></div>
						</div>
					</div>

					<!-- Day Label & Date -->
					<div class="day-footer">
						<span class="day-name">{day.dayLabel}</span>
						<span class="day-date">{day.dateNum}</span>
						{#if day.isToday}
							<span class="today-dot" title="Today"></span>
						{/if}
					</div>

					<!-- Tooltip on hover -->
					{#if isHovered}
						<div class="col-tooltip">
							<div class="tooltip-head">
								<b>{day.dayLabel}</b> {day.key}
								{#if day.isToday}<span class="tt-today">TODAY</span>{/if}
							</div>
							<div class="tooltip-row hours-row">
								<span class="dot h-dot"></span>
								<span>Study:</span>
								<b>{formatMinutes(day.minutes)}</b>
							</div>
							<div class="tooltip-row q-row">
								<span class="dot q-dot"></span>
								<span>Questions:</span>
								<b>{day.questions} solved</b>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	{#if showSummary}
		<div class="graph-summary">
			<div class="summary-stat">
				<span class="stat-lbl">WEEK TOTAL</span>
				<b class="stat-val">{(totalMinutes / 60).toFixed(1)}h <small>({totalQuestions} Qs)</small></b>
			</div>
			<div class="summary-stat">
				<span class="stat-lbl">DAILY AVG</span>
				<b class="stat-val">{avgHours}h <small>/ {avgQuestions} Qs</small></b>
			</div>
			<div class="summary-stat">
				<span class="stat-lbl">PEAK DAY</span>
				<b class="stat-val">
					{#if peakDay}
						{peakDay.dayLabel} <small>({peakDay.hours}h · {peakDay.questions}Q)</small>
					{:else}
						—
					{/if}
				</b>
			</div>
			<div class="summary-stat">
				<span class="stat-lbl">DAYS ACTIVE</span>
				<b class="stat-val">{activeDays} <small>/ 7 days</small></b>
			</div>
		</div>
	{/if}
</div>

<style>
	.double-graph {
		background: var(--surface-bg, rgba(255, 255, 255, 0.03));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		border-radius: 14px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		position: relative;
	}

	.double-graph.compact {
		padding: 12px;
		gap: 12px;
	}

	.graph-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.title-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.graph-title {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.graph-subtitle {
		font-size: 11px;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.legend-box {
		width: 10px;
		height: 10px;
		border-radius: 3px;
	}

	.hours-box {
		background: linear-gradient(180deg, var(--accent, #6d5dfc), #4e3fe0);
		box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.questions-box {
		background: linear-gradient(180deg, #10b981, #059669);
		box-shadow: 0 0 6px rgba(16, 185, 129, 0.35);
	}

	/* Chart layout */
	.chart-wrapper {
		position: relative;
		height: 180px;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding-top: 24px;
	}

	.compact .chart-wrapper {
		height: 150px;
		padding-top: 20px;
	}

	.chart-gridlines {
		position: absolute;
		inset: 20px 0 34px 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		pointer-events: none;
	}

	.gridline {
		width: 100%;
		border-bottom: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.07));
		position: relative;
	}

	.gridline.base {
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
	}

	.grid-val {
		position: absolute;
		right: 0;
		top: -9px;
		font-size: 9px;
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
		opacity: 0.55;
		background: var(--surface-bg, rgba(20, 20, 30, 0.8));
		padding: 0 4px;
		border-radius: 3px;
	}

	.days-columns {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
		height: 100%;
		position: relative;
		z-index: 1;
	}

	.day-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		position: relative;
		cursor: pointer;
		padding: 0 2px;
		border-radius: 8px;
		transition: background 0.15s ease;
	}

	.day-col:hover {
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}

	.day-col.today {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.bars-container {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 4px;
		padding-bottom: 6px;
	}

	.bar-track {
		flex: 1;
		max-width: 18px;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		position: relative;
	}

	.bar-value {
		font-size: 9px;
		font-weight: 750;
		font-family: ui-monospace, monospace;
		margin-bottom: 3px;
		white-space: nowrap;
		opacity: 0;
		transition: opacity 0.15s ease;
		pointer-events: none;
	}

	.bar-value.visible {
		opacity: 0.9;
	}

	.hours-val {
		color: var(--accent, #6d5dfc);
	}

	.q-val {
		color: #10b981;
	}

	.bar-fill {
		width: 100%;
		border-radius: 4px 4px 1px 1px;
		transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.15s ease;
		min-height: 3px;
	}

	.day-col:hover .bar-fill {
		filter: brightness(1.18);
	}

	.hours-fill {
		background: linear-gradient(180deg, var(--accent, #6d5dfc), #4e3fe0);
	}

	.day-col:not(.active) .hours-fill {
		background: var(--border-subtle, rgba(255, 255, 255, 0.08));
		height: 3px !important;
	}

	.q-fill {
		background: linear-gradient(180deg, #10b981, #059669);
	}

	.day-col:not(.active) .q-fill {
		background: var(--border-subtle, rgba(255, 255, 255, 0.08));
		height: 3px !important;
	}

	.day-footer {
		height: 28px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		position: relative;
	}

	.day-name {
		font-size: 10px;
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.day-col.today .day-name {
		color: var(--accent, #6d5dfc);
		font-weight: 850;
	}

	.day-date {
		font-size: 9px;
		color: var(--text-secondary);
		opacity: 0.7;
	}

	.today-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--accent, #6d5dfc);
		position: absolute;
		bottom: 0;
	}

	/* Tooltip */
	.col-tooltip {
		position: absolute;
		bottom: calc(100% - 10px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--surface-panel, #181828);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
		border-radius: 8px;
		padding: 8px 10px;
		z-index: 100;
		min-width: 140px;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
		animation: fadeIn 0.12s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translate(-50%, 4px); }
		to { opacity: 1; transform: translate(-50%, 0); }
	}

	.tooltip-head {
		font-size: 10px;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		padding-bottom: 3px;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.tooltip-head b {
		color: var(--text-primary);
	}

	.tt-today {
		background: var(--accent, #6d5dfc);
		color: var(--accent-contrast, #ffffff);
		font-size: 8px;
		font-weight: 800;
		padding: 1px 4px;
		border-radius: 3px;
	}

	.tooltip-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
	}

	.tooltip-row span {
		color: var(--text-secondary);
	}

	.tooltip-row b {
		color: var(--text-primary);
		margin-left: auto;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.h-dot { background: var(--accent, #6d5dfc); }
	.q-dot { background: #10b981; }

	/* Summary row */
	.graph-summary {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-lbl {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.stat-val {
		font-size: 13px;
		font-weight: 800;
		color: var(--text-primary);
	}

	.stat-val small {
		font-size: 10px;
		font-weight: 500;
		color: var(--text-secondary);
	}

	@media (max-width: 768px) {
		.graph-header {
			flex-direction: column;
			align-items: flex-start;
		}
		.graph-summary {
			grid-template-columns: repeat(2, 1fr);
			gap: 10px;
		}
		.bar-track {
			max-width: 12px;
		}
		.bar-value {
			font-size: 8px;
		}
	}
</style>
