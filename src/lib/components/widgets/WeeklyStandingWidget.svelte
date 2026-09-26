<script lang="ts">
	import { weeklyStanding } from '$lib/stores/tracker';
	import { weekdayShort, todayKey } from '$lib/state/dates';

	const today = todayKey();
</script>

<div class="weekly">
	<div class="chart" role="img" aria-label="Questions solved over the last seven days">
		{#each $weeklyStanding.days as day, i}
			<div class="col" class:today={day === today}>
				<div class="bar-track">
					<div class="bar-fill" style="height:{($weeklyStanding.solved[i] / $weeklyStanding.peak) * 100}%" title="{$weeklyStanding.solved[i]} solved"></div>
				</div>
				<span class="dow">{weekdayShort(day).slice(0, 2)}</span>
			</div>
		{/each}
	</div>
	<div class="summary">
		<p class="big">{$weeklyStanding.weekToDate}<small>/ {$weeklyStanding.goal} this week</small></p>
		<div class="progress"><i style="width:{$weeklyStanding.pct * 100}%"></i></div>
		<p class="note">{$weeklyStanding.totalSolved} solved in the last 7 days · {$weeklyStanding.peak} best day</p>
	</div>
</div>

<style>
	.weekly { display: flex; flex-direction: column; gap: 1.1rem; height: 100%; }
	.chart { display: flex; align-items: flex-end; gap: .55rem; height: 118px; }
	.col { display: flex; flex: 1; flex-direction: column; align-items: center; gap: .45rem; height: 100%; }
	.bar-track { display: flex; flex: 1; align-items: flex-end; width: 100%; border-radius: 8px; background: var(--surface-subtle); overflow: hidden; }
	.bar-fill { width: 100%; min-height: 3px; border-radius: 8px 8px 0 0; background: color-mix(in srgb, var(--accent), transparent 25%); transition: height .5s cubic-bezier(.4, 0, .2, 1); }
	.col.today .bar-fill { background: var(--accent); }
	.dow { color: var(--text-secondary); font-size: .66rem; font-weight: 700; }
	.col.today .dow { color: var(--accent); }
	.summary { display: grid; gap: .5rem; }
	.big { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.05em; }
	.big small { margin-left: .4rem; color: var(--text-secondary); font-size: .78rem; font-weight: 600; }
	.progress { height: 8px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.progress i { display: block; height: 100%; border-radius: 99px; background: var(--accent); transition: width .5s ease; }
	.note { margin: 0; color: var(--text-secondary); font-size: .74rem; font-weight: 600; }
</style>
