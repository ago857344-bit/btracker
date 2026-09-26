<script lang="ts">
	import StatRing from '$lib/components/StatRing.svelte';
	import { dailyProgress } from '$lib/stores/tracker';
	import { formatMinutes } from '$lib/state/dates';
</script>

<div class="daily">
	<StatRing value={$dailyProgress.questionPct} size={132} stroke={12}>
		<span class="ring-value">{$dailyProgress.solved}</span>
		<span class="ring-label">of {$dailyProgress.questionGoal} Qs</span>
	</StatRing>
	<div class="metrics">
		<div class="metric">
			<p class="metric-label">Questions</p>
			<p class="metric-value">{$dailyProgress.solved}<small>/{$dailyProgress.questionGoal}</small></p>
			<div class="bar"><i style="width:{$dailyProgress.questionPct * 100}%"></i></div>
		</div>
		<div class="metric">
			<p class="metric-label">Focus time</p>
			<p class="metric-value">{formatMinutes($dailyProgress.minutes)}<small>/{$dailyProgress.hourGoal}h</small></p>
			<div class="bar"><i class="alt" style="width:{$dailyProgress.hourPct * 100}%"></i></div>
		</div>
	</div>
</div>

<style>
	.daily { display: flex; align-items: center; gap: 1.5rem; height: 100%; }
	.ring-value { font-size: 2.1rem; font-weight: 800; letter-spacing: -.06em; line-height: 1; }
	.ring-label { margin-top: .25rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.metrics { display: grid; flex: 1; gap: 1rem; min-width: 0; }
	.metric-label { margin: 0; color: var(--text-secondary); font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
	.metric-value { margin: .2rem 0 .5rem; font-size: 1.3rem; font-weight: 750; letter-spacing: -.04em; }
	.metric-value small { margin-left: .25rem; color: var(--text-secondary); font-size: .78rem; font-weight: 600; }
	.bar { height: 7px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.bar i { display: block; height: 100%; border-radius: 99px; background: var(--accent); transition: width .5s cubic-bezier(.4, 0, .2, 1); }
	.bar i.alt { background: var(--success); }
	@media (max-width: 460px) { .daily { flex-direction: column; align-items: stretch; } }
</style>
