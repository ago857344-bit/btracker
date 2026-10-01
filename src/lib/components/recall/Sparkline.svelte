<script lang="ts">
	import type { DecayMetrics } from '$lib/types/tracker';

	export let decay: DecayMetrics;
	export let width = 120;
	export let height = 40;
	export let showTooltip = false;

	$: history = decay.history || [];
	$: points = generateSparklinePoints(history, width, height);
	$: currentScore = decay.currentScore;
	$: trend = calculateTrend(history);

	function generateSparklinePoints(
		history: Array<{ date: string; score: number }>,
		w: number,
		h: number
	): string {
		if (history.length < 2) return '';

		const padding = 2;
		const usableWidth = w - padding * 2;
		const usableHeight = h - padding * 2;

		const maxScore = 100;
		const minScore = 0;

		const xStep = usableWidth / (history.length - 1);

		return history
			.map((point, index) => {
				const x = padding + index * xStep;
				const normalizedScore = (point.score - minScore) / (maxScore - minScore);
				const y = h - padding - normalizedScore * usableHeight;
				return `${x},${y}`;
			})
			.join(' ');
	}

	function calculateTrend(
		history: Array<{ date: string; score: number }>
	): 'up' | 'down' | 'stable' {
		if (history.length < 2) return 'stable';

		const recent = history.slice(-3);
		const avgRecent = recent.reduce((sum, p) => sum + p.score, 0) / recent.length;
		const older = history.slice(0, -3);
		const avgOlder = older.reduce((sum, p) => sum + p.score, 0) / older.length;

		if (avgRecent > avgOlder + 5) return 'up';
		if (avgRecent < avgOlder - 5) return 'down';
		return 'stable';
	}

	function getTrendColor(trend: string): string {
		switch (trend) {
			case 'up':
				return '#10b981';
			case 'down':
				return '#ef4444';
			default:
				return '#6b7280';
		}
	}
</script>

<div class="sparkline" style="width: {width}px; height: {height}px">
	{#if history.length >= 2}
		<svg width={width} height={height} viewBox="0 0 {width} {height}" aria-hidden="true">
			<!-- Gradient fill -->
			<defs>
				<linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3" />
					<stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Area fill -->
			<polygon
				points="0,{height} {points} {width},{height}"
				fill="url(#sparkline-gradient)"
				style="display: {history.length >= 3 ? 'block' : 'none'}"
			/>

			<!-- Line -->
			<polyline
				points={points}
				fill="none"
				stroke="var(--accent)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			<!-- Current score dot -->
			{#if history.length > 0}
				{@const lastPoint = points.split(' ').pop()}
				{@const coords = lastPoint ? lastPoint.split(',') : []}
				{#if coords.length >= 2}
					<circle
						cx={coords[0]}
						cy={coords[1]}
						r="3"
						fill="var(--accent)"
						class="dot"
					/>
				{/if}
			{/if}
		</svg>

		{#if showTooltip}
			<div class="tooltip">
				<span class="score">{Math.round(currentScore)}%</span>
				<span class="trend" style="color: {getTrendColor(trend)}">
					{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
				</span>
			</div>
		{/if}
	{:else}
		<div class="empty">No data</div>
	{/if}
</div>

<style>
	.sparkline {
		position: relative;
		display: grid;
		place-items: center;
	}

	svg {
		display: block;
	}

	.dot {
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.tooltip {
		position: absolute;
		top: -28px;
		right: 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.5rem;
		background: var(--surface-card);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		font-size: 0.65rem;
		font-weight: 700;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.score {
		color: var(--text-primary);
	}

	.trend {
		font-variant-numeric: tabular-nums;
	}

	.empty {
		font-size: 0.65rem;
		color: var(--text-secondary);
		font-weight: 600;
	}
</style>
