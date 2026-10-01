<script lang="ts">
	import { dayKeyOf, shortDateKey } from '$lib/state/dates';

	export let data: Record<string, { revisedCount: number; totalTimeMinutes: number }> = {};
	export let days = 90; // Number of days to show
	export let cellSize = 12; // Size of each cell in pixels
	export let showTooltip = true;

	$: today = new Date();
	$: startDate = (() => { const d = new Date(today); d.setDate(today.getDate() - days + 1); return d; })();

	$: daysArray = generateDaysArray(startDate, days);
	$: weeks = organizeByWeeks(daysArray);
	$: maxCount = Math.max(1, ...Object.values(data).map((d) => d.revisedCount));

	function generateDaysArray(start: Date, count: number): Array<{ date: string; dayOfWeek: number }> {
		const days = [];
		const current = new Date(start);

		for (let i = 0; i < count; i++) {
			days.push({
				date: dayKeyOf(current),
				dayOfWeek: current.getDay()
			});
			current.setDate(current.getDate() + 1);
		}

		return days;
	}

	function organizeByWeeks(days: Array<{ date: string; dayOfWeek: number }>) {
		const weeks = [];
		let currentWeek: Array<{ date: string; dayOfWeek: number }> = [];

		// Pad first week if needed
		const firstDay = days[0]?.dayOfWeek ?? 0;
		if (firstDay !== 0) {
			for (let i = 0; i < firstDay; i++) {
				currentWeek.push({ date: '', dayOfWeek: i });
			}
		}

		for (const day of days) {
			currentWeek.push(day);

			if (day.dayOfWeek === 6 || currentWeek.length === 7) {
				weeks.push(currentWeek);
				currentWeek = [];
			}
		}

		// Pad last week if needed
		if (currentWeek.length > 0) {
			while (currentWeek.length < 7) {
				currentWeek.push({ date: '', dayOfWeek: currentWeek.length });
			}
			weeks.push(currentWeek);
		}

		return weeks;
	}

	function getCellColor(count: number): string {
		if (count === 0) return 'var(--surface-subtle)';
		const intensity = count / maxCount;
		if (intensity < 0.25) return 'var(--heatmap-1, #c6e48b)';
		if (intensity < 0.5) return 'var(--heatmap-2, #7bc96f)';
		if (intensity < 0.75) return 'var(--heatmap-3, #239a3b)';
		return 'var(--heatmap-4, #196127)';
	}

	function getDayData(date: string) {
		return data[date] || { revisedCount: 0, totalTimeMinutes: 0 };
	}

	let hoveredDate: string | null = null;
	let tooltipX = 0;
	let tooltipY = 0;

	function handleHover(event: MouseEvent, date: string) {
		if (!showTooltip) return;
		hoveredDate = date;
		tooltipX = event.clientX;
		tooltipY = event.clientY;
	}

	function handleMouseLeave() {
		hoveredDate = null;
	}
</script>

<div class="heatmap">
	<div class="grid" style="--cell-size: {cellSize}px">
		{#each weeks as week}
			<div class="week">
				{#each week as day}
					{#if day.date}
						<button
							type="button"
							class="cell"
							style="background: {getCellColor(getDayData(day.date).revisedCount)}"
							on:mouseenter={(e) => handleHover(e, day.date)}
							on:mouseleave={handleMouseLeave}
							aria-label="{getDayData(day.date).revisedCount} chapters revised on {shortDateKey(day.date)}"
						>
						</button>
					{:else}
						<div class="cell empty"></div>
					{/if}
				{/each}
			</div>
		{/each}
	</div>

	<div class="legend">
		<span class="label">Less</span>
		<div class="scale">
			<div class="legend-cell" style="background: var(--surface-subtle)"></div>
			<div class="legend-cell" style="background: var(--heatmap-1, #c6e48b)"></div>
			<div class="legend-cell" style="background: var(--heatmap-2, #7bc96f)"></div>
			<div class="legend-cell" style="background: var(--heatmap-3, #239a3b)"></div>
			<div class="legend-cell" style="background: var(--heatmap-4, #196127)"></div>
		</div>
		<span class="label">More</span>
	</div>

	{#if showTooltip && hoveredDate}
		<div class="tooltip" style="left: {tooltipX}px; top: {tooltipY - 8}px">
			<div class="tooltip-date">{shortDateKey(hoveredDate)}</div>
			<div class="tooltip-stats">
				<span><b>{getDayData(hoveredDate).revisedCount}</b> chapters revised</span>
				<span><b>{getDayData(hoveredDate).totalTimeMinutes}</b> minutes</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.heatmap {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.grid {
		display: flex;
		gap: 3px;
	}

	.week {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.cell {
		width: var(--cell-size);
		height: var(--cell-size);
		border-radius: 2px;
		border: 1px solid rgba(27, 31, 35, 0.06);
		cursor: pointer;
		transition: transform 0.1s ease, box-shadow 0.1s ease;
	}

	.cell:hover {
		transform: scale(1.2);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		z-index: 1;
	}

	.cell.empty {
		background: transparent;
		border: none;
		cursor: default;
	}

	.cell.empty:hover {
		transform: none;
		box-shadow: none;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.65rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.scale {
		display: flex;
		gap: 2px;
	}

	.legend-cell {
		width: var(--cell-size);
		height: var(--cell-size);
		border-radius: 2px;
	}

	.tooltip {
		position: fixed;
		padding: 0.5rem 0.6rem;
		background: var(--surface-card);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		pointer-events: none;
		transform: translateX(-50%);
	}

	.tooltip-date {
		color: var(--text-secondary);
		font-size: 0.65rem;
		margin-bottom: 0.2rem;
	}

	.tooltip-stats {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.tooltip-stats b {
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 640px) {
		.cell,
		.legend-cell {
			width: 10px;
			height: 10px;
		}
	}
</style>
