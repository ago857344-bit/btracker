<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import AnimatedNumber from '$lib/components/ui/AnimatedNumber.svelte';
	import StatRing from '$lib/components/StatRing.svelte';
	import { tracker, activityWindow, analysisSummary, type MapGranularity } from '$lib/stores/tracker';
	import { formatMinutes } from '$lib/state/dates';
	import { subjectColor, subjectName } from '$lib/state/subjects';

	const GRANS: MapGranularity[] = ['daily', 'weekly', 'monthly', 'yearly'];
	let gran: MapGranularity = 'weekly';
	let offset = 0;

	$: win = activityWindow($tracker, gran, offset);
	$: max = Math.max(1, ...win.cells.map((cell) => cell.minutes));
	$: summary = analysisSummary($tracker, gran === 'daily' ? 'weekly' : gran, offset);
	$: bySubject = summary.bySubject.filter((s) => s.minutes > 0).sort((a, b) => b.minutes - a.minutes);
	$: barMax = Math.max(1, ...bySubject.map((s) => s.minutes));

	// Insight: best day and dominant subject
	$: bestCell = [...win.cells].sort((a, b) => b.minutes - a.minutes)[0];
	$: topSubject = bySubject[0];
	$: neglectedSubject = summary.bySubject.find((s) => s.minutes === 0);

	function level(minutes: number) {
		if (minutes <= 0) return 0;
		if (minutes < 120) return 1;
		if (minutes < 240) return 2;
		if (minutes < 360) return 3;
		return 4;
	}
	function setGran(next: MapGranularity) { gran = next; offset = 0; }
</script>

<section class="map card">
	<header>
		<div>
			<h3>ACTIVITY MAP</h3>
			<p class="total"><AnimatedNumber value={win.total} format={formatMinutes} /></p>
		</div>
		<div class="grans">
			{#each GRANS as g}
				<button type="button" class:active={gran === g} on:click={() => setGran(g)}>{g.toUpperCase()}</button>
			{/each}
		</div>
	</header>

	<div class="nav">
		<button type="button" class="pg" aria-label="Previous" on:click={() => (offset -= 1)}><NavIcon name="chevron" size={14} /></button>
		<b class="caption">{win.caption}</b>
		<button type="button" class="pg flip" aria-label="Next" disabled={!win.canNext} on:click={() => (offset += 1)}><NavIcon name="chevron" size={14} /></button>
		{#if offset !== 0}<button type="button" class="current" on:click={() => (offset = 0)}>Go to Current</button>{/if}
	</div>

	{#if gran === 'weekly'}
		<div class="week">
			{#each win.cells as cell (cell.key)}
				<div class="wtile" class:today={cell.today}>
					<StatRing value={cell.minutes / (max || 1)} size={56} stroke={5} color={cell.minutes ? 'var(--accent)' : 'var(--border-subtle)'}>
						<span class="wm">{cell.minutes ? `${Math.round(cell.minutes / 60)}h` : '—'}</span>
					</StatRing>
					<span class="wl">{cell.label}</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid" class:tiny={gran === 'yearly' || gran === 'daily'} style="--cols: {win.cols}">
			{#each win.cells as cell (cell.key)}
				<div class="cell l{level(cell.minutes)}" class:today={cell.today} title="{cell.key}: {cell.minutes}m">{cell.label}</div>
			{/each}
		</div>
	{/if}

	<footer>
		<span class="leg">LOW</span>
		{#each [1, 2, 3, 4] as l}
			<span class="sw l{l}"></span>
		{/each}
		<span class="leg">2H+</span><span class="leg">4H+</span><span class="leg">6H+</span>
	</footer>

	<!-- Subject breakdown -->
	<div class="breakdown">
		<p class="section-label">SUBJECT BREAKDOWN</p>
		{#if bySubject.length === 0}
			<p class="empty-note">No sessions logged this period.</p>
		{:else}
			{#each bySubject as s}
				<div class="sub-row">
					<span class="dot" style="background: {s.color}"></span>
					<span class="sub-name">{subjectName(s.code) || s.code}</span>
					<div class="bar-wrap">
						<div class="bar" style="width: {Math.round((s.minutes / barMax) * 100)}%; background: {s.color}"></div>
					</div>
					<span class="sub-time">{formatMinutes(s.minutes)}</span>
					<span class="sub-pct">{s.pct}%</span>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Smart insight -->
	{#if win.total > 0}
		<div class="insight">
			<span class="insight-icon"><NavIcon name="flame" size={13} /></span>
			<span>
				{#if topSubject && neglectedSubject}
					You focused most on <b>{subjectName(topSubject.code)}</b> ({topSubject.pct}%) — <b>{subjectName(neglectedSubject.code)}</b> got no time this period.
				{:else if topSubject}
					<b>{subjectName(topSubject.code)}</b> dominated at {topSubject.pct}% of your total focus.
				{:else}
					Great focus this period — keep up the momentum!
				{/if}
			</span>
		</div>
	{:else}
		<div class="insight muted">
			<span class="insight-icon"><NavIcon name="target" size={13} /></span>
			<span>Log your first session to see subject breakdown and insights here.</span>
		</div>
	{/if}
</section>

<style>
	.map { display: flex; flex-direction: column; padding: 1.3rem 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h3 { margin: 0; font-size: .82rem; font-weight: 800; letter-spacing: .1em; color: var(--text-secondary); }
	.total { margin: .3rem 0 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
	.grans { display: inline-flex; gap: .2rem; padding: .25rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-canvas); }
	.grans button { padding: .38rem .8rem; border: 0; border-radius: 999px; background: transparent; color: var(--text-secondary); font-size: .68rem; font-weight: 800; letter-spacing: .05em; }
	.grans button.active { color: #fff; background: var(--accent); }
	.nav { display: flex; align-items: center; gap: .5rem; margin: 1rem 0 .9rem; }
	.pg { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: var(--surface-panel); }
	.pg:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
	.pg:disabled { opacity: .4; }
	.pg.flip :global(svg) { transform: rotate(180deg); }
	.caption { font-size: .8rem; font-weight: 800; letter-spacing: .04em; }
	.current { margin-left: .3rem; padding: .35rem .7rem; border: 1px solid var(--accent); border-radius: 8px; color: var(--accent); background: var(--accent-soft); font-size: .66rem; font-weight: 800; }
	.week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .4rem; }
	.wtile { display: grid; justify-items: center; gap: .3rem; }
	.wtile.today .wl { color: var(--accent); font-weight: 800; }
	.wm { font-size: .6rem; font-weight: 750; font-variant-numeric: tabular-nums; }
	.wl { color: var(--text-secondary); font-size: .65rem; font-weight: 700; }
	.grid { display: grid; grid-template-columns: repeat(var(--cols, 7), minmax(0, 1fr)); gap: 4px; }
	.cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; border-radius: 4px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .55rem; font-weight: 650; overflow: hidden; }
	.cell.l1 { background: color-mix(in srgb, var(--accent), transparent 78%); }
	.cell.l2 { background: color-mix(in srgb, var(--accent), transparent 55%); }
	.cell.l3 { background: color-mix(in srgb, var(--accent), transparent 28%); }
	.cell.l4 { background: var(--accent); color: #fff; }
	.cell.today { outline: 2px solid var(--accent); outline-offset: 1px; }
	.grid.tiny .cell { font-size: 0; }
	footer { display: flex; align-items: center; gap: .35rem; margin-top: .8rem; }
	.leg { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .08em; }
	.sw { width: 11px; height: 11px; border-radius: 3px; background: var(--surface-subtle); }
	.sw.l1 { background: color-mix(in srgb, var(--accent), transparent 78%); }
	.sw.l2 { background: color-mix(in srgb, var(--accent), transparent 55%); }
	.sw.l3 { background: color-mix(in srgb, var(--accent), transparent 28%); }
	.sw.l4 { background: var(--accent); }
	footer .leg:nth-of-type(n + 2) { margin-left: .5rem; }

	/* Subject breakdown */
	.breakdown { margin-top: 1.2rem; display: flex; flex-direction: column; gap: .55rem; flex: 1; }
	.section-label { margin: 0 0 .4rem; font-size: .65rem; font-weight: 800; letter-spacing: .1em; color: var(--text-secondary); }
	.empty-note { color: var(--text-secondary); font-size: .78rem; }
	.sub-row { display: grid; grid-template-columns: 8px 5.5rem 1fr auto auto; align-items: center; gap: .5rem; }
	.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.sub-name { font-size: .75rem; font-weight: 700; white-space: nowrap; }
	.bar-wrap { height: 6px; border-radius: 99px; background: var(--surface-canvas); overflow: hidden; min-width: 0; }
	.bar { height: 100%; border-radius: 99px; transition: width .4s ease; }
	.sub-time { font-size: .7rem; font-weight: 750; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--text-primary); }
	.sub-pct { font-size: .65rem; font-weight: 700; color: var(--text-secondary); white-space: nowrap; min-width: 2.4rem; text-align: right; }

	/* Insight */
	.insight { display: flex; align-items: flex-start; gap: .5rem; margin-top: auto; padding-top: 1rem; font-size: .75rem; line-height: 1.5; color: var(--text-secondary); border-top: 1px solid var(--border-subtle); }
	.insight.muted { opacity: .7; }
	.insight-icon { display: grid; place-items: center; flex-shrink: 0; width: 22px; height: 22px; border-radius: 7px; background: color-mix(in srgb, var(--accent), transparent 86%); color: var(--accent); margin-top: .05rem; }
	.insight b { color: var(--text-primary); }

	@media (max-width: 640px) { .week { gap: .25rem; } .wm { font-size: .55rem; } .sub-row { grid-template-columns: 8px 4.5rem 1fr auto; } .sub-pct { display: none; } }
</style>
