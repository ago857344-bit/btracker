<script lang="ts">
	import { getHealthColor } from '$lib/state/decay';

	export let score = 0; // 0-100
	export let size = 'md'; // sm, md, lg
	export let showLabel = true;
	export let showScore = true;

	$: health = (score >= 60 ? 'fresh' : score >= 30 ? 'fading' : 'critical') as 'fresh' | 'fading' | 'critical';
	$: color = getHealthColor(health);
	$: width = `${Math.max(0, Math.min(100, score))}%`;

	const sizes = {
		sm: { height: '4px', fontSize: '0.65rem' },
		md: { height: '8px', fontSize: '0.72rem' },
		lg: { height: '12px', fontSize: '0.8rem' }
	};
</script>

<div class="health-bar {size}">
	{#if showLabel}
		<div class="label">
			<span class="health-text {health}">{health.toUpperCase()}</span>
			{#if showScore}
				<span class="score">{Math.round(score)}%</span>
			{/if}
		</div>
	{/if}
	<div class="track">
		<div class="fill" style="width: {width}; --bar-color: {color}"></div>
	</div>
</div>

<style>
	.health-bar {
		display: grid;
		gap: 0.35rem;
	}

	.label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.health-text {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.health-text.fresh {
		color: #10b981;
	}

	.health-text.fading {
		color: #f59e0b;
	}

	.health-text.critical {
		color: #ef4444;
	}

	.score {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.track {
		width: 100%;
		background: var(--surface-subtle);
		border-radius: 999px;
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: var(--bar-color);
		border-radius: 999px;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease;
	}

	.health-bar.sm .track {
		height: 4px;
	}

	.health-bar.md .track {
		height: 8px;
	}

	.health-bar.lg .track {
		height: 12px;
	}
</style>
