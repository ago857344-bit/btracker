<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, hourDistribution } from '$lib/stores/tracker';
	import { addDaysKey, formatMinutes, longDateKey, sessionDayKey, todayKey, timeOf } from '$lib/state/dates';
	import { subjectColor, subjectName } from '$lib/state/subjects';

	let day = todayKey();
	$: today = todayKey();
	$: dist = hourDistribution($tracker, day);
	$: total = dist.reduce((sum, m) => sum + m, 0);
	$: max = Math.max(1, ...dist);
	$: daySessions = $tracker.log
		.filter((session) => sessionDayKey(session) === day)
		.sort((a, b) => b[0] - a[0]);
	$: dateLabel = longDateKey(day).toUpperCase();

	function shift(n: number) { day = addDaysKey(day, n); }
	function resetToToday() { day = todayKey(); }
</script>

<section class="daily card">
	<header>
		<div>
			<h3>{dateLabel}'S FOCUS ACTIVITY</h3>
			<span class="chip">{total ? formatMinutes(total).replace(' ', '') : '0m'} total</span>
		</div>
		<div class="pager">
			<button type="button" class="pg" aria-label="Previous day" on:click={() => shift(-1)}><NavIcon name="chevron" size={14} /></button>
			<button type="button" class="pg flip" aria-label="Next day" disabled={day >= today} on:click={() => shift(1)}><NavIcon name="chevron" size={14} /></button>
			{#if day !== today}<button type="button" class="reset" on:click={resetToToday}>RESET TO TODAY</button>{/if}
		</div>
	</header>

	<p class="sub">24H DISTRIBUTION</p>
	<div class="strip" role="img" aria-label="Focus minutes by hour of day">
		{#each dist as minutes, hour}
			<div class="col" title="{hour}:00 — {minutes}m">
				<div class="bar" class:on={minutes > 0} style="height: {minutes ? Math.max(8, (minutes / max) * 100) : 3}%"></div>
			</div>
		{/each}
	</div>
	<div class="axis"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>

	{#if daySessions.length}
		<ul class="sessions">
			{#each daySessions as session, i (session[0] + "-" + i)}
				<li>
					<span class="dot" style="background: {subjectColor(session[7] ?? null)}"></span>
					<span class="who">{subjectName(session[7] ?? null)}</span>
					<span class="act">{session[2]}</span>
					{#if session[2] === 'Manual'}<span class="manual">MANUAL</span>{/if}
					<span class="when">{timeOf(new Date(session[0] * 60000))}</span>
					<b>{session[1]}m</b>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty">
			<p>No sessions logged on {longDateKey(day)}</p>
			<span>No focus activity recorded for this date.</span>
		</div>
	{/if}
</section>

<style>
	.daily { padding: 1.3rem 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
	header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h3 { margin: 0; font-size: .92rem; font-weight: 800; letter-spacing: .02em; }
	.chip { display: inline-block; margin-top: .35rem; padding: .22rem .6rem; border: 1px dashed var(--border-subtle); border-radius: 999px; color: var(--text-secondary); font-size: .68rem; font-weight: 700; }
	.pager { display: flex; align-items: center; gap: .4rem; }
	.pg { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: var(--surface-panel); }
	.pg:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
	.pg:disabled { opacity: .4; }
	.pg.flip :global(svg) { transform: rotate(180deg); }
	.reset { padding: .4rem .8rem; border: 1px solid var(--accent); border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-size: .68rem; font-weight: 800; letter-spacing: .04em; }
	.sub { margin: 1.2rem 0 .5rem; color: var(--text-secondary); font-size: .66rem; font-weight: 800; letter-spacing: .1em; }
	.strip { display: flex; align-items: flex-end; gap: 3px; height: 96px; padding: .5rem .6rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-canvas); }
	.col { flex: 1; display: flex; align-items: flex-end; height: 100%; }
	.bar { width: 100%; border-radius: 3px 3px 1px 1px; background: var(--surface-subtle); transition: height .3s ease; }
	.bar.on { background: var(--accent); }
	.axis { display: flex; justify-content: space-between; margin-top: .3rem; color: var(--text-secondary); font-size: .6rem; font-weight: 700; }
	.sessions { display: grid; gap: .45rem; margin: 1.1rem 0 0; padding: 0; list-style: none; }
	.sessions li { display: flex; align-items: center; gap: .55rem; padding: .55rem .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-canvas); font-size: .8rem; }
	.dot { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 99px; }
	.who { font-weight: 750; }
	.act { color: var(--text-secondary); font-size: .72rem; }
	.manual { padding: .12rem .4rem; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-size: .56rem; font-weight: 800; letter-spacing: .06em; }
	.when { margin-left: auto; color: var(--text-secondary); font-size: .7rem; }
	.sessions b { font-variant-numeric: tabular-nums; }
	.empty { display: grid; gap: .25rem; justify-items: center; margin-top: 1.2rem; padding: 1.4rem 1rem; border: 1px dashed var(--border-subtle); border-radius: 14px; text-align: center; }
	.empty p { margin: 0; font-size: .85rem; font-weight: 700; }
	.empty span { color: var(--text-secondary); font-size: .74rem; }
</style>
