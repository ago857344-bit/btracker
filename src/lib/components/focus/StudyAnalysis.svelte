<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, analysisSummary, type MapGranularity } from '$lib/stores/tracker';
	import { subjectColor } from '$lib/state/subjects';

	const GRANS: MapGranularity[] = ['weekly', 'monthly', 'yearly'];
	let gran: MapGranularity = 'weekly';
	let offset = 0;
	let view: 'bars' | 'donut' = 'bars';

	$: summary = analysisSummary($tracker, gran, offset);
	$: totalMinutes = summary.hours; // minutes despite the name
	$: hours = (totalMinutes / 60).toFixed(1);
	$: maxBar = Math.max(1, ...summary.bars.map((bar) => bar.minutes));
	$: donut = summary.bySubject.filter((entry) => entry.minutes > 0);
	$: circumference = 2 * Math.PI * 62;

	$: segments = (() => {
		let acc = 0;
		return donut.map((entry) => {
			const frac = totalMinutes ? entry.minutes / totalMinutes : 0;
			const seg = { color: entry.color, dash: `${(frac * circumference).toFixed(2)} ${circumference.toFixed(2)}`, rotate: acc * 360 };
			acc += frac;
			return seg;
		});
	})();

	function fmt(minutes: number) {
		const h = Math.floor(minutes / 60); const m = minutes % 60;
		return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
	}
	function setGran(next: MapGranularity) { gran = next; offset = 0; }
</script>

<section class="analysis card">
	<header>
		<div>
			<h3>STUDY ANALYSIS</h3>
			<p class="tag">Tag Breakdown</p>
		</div>
		<div class="tools">
			<div class="grans">
				{#each GRANS as g}
					<button type="button" class:active={gran === g} on:click={() => setGran(g)}>{g.toUpperCase()}</button>
				{/each}
			</div>
			<div class="toggle" role="tablist" aria-label="Chart style">
				<button type="button" role="tab" class:active={view === 'bars'} on:click={() => (view = 'bars')}>Bars</button>
				<button type="button" role="tab" class:active={view === 'donut'} on:click={() => (view = 'donut')}>Donut</button>
			</div>
		</div>
	</header>

	<div class="nav">
		<button type="button" class="pg" aria-label="Previous" on:click={() => (offset -= 1)}><NavIcon name="chevron" size={14} /></button>
		<button type="button" class="pg flip" aria-label="Next" disabled={offset >= 0} on:click={() => (offset += 1)}><NavIcon name="chevron" size={14} /></button>
	</div>

	<div class="kpis">
		<div><b>{hours}</b><span>HOURS</span></div>
		<div><b>{summary.sessions}</b><span>SESSIONS</span></div>
		<div><b>{fmt(summary.avg)}</b><span>AVG SESSION</span></div>
	</div>

	{#if view === 'donut'}
		<div class="donut-wrap">
			<svg width="170" height="170" viewBox="0 0 150 150" aria-hidden="true">
				<circle cx="75" cy="75" r="62" fill="none" stroke="var(--surface-subtle)" stroke-width="18" />
				{#each segments as seg, i (i)}
					<circle cx="75" cy="75" r="62" fill="none" stroke={seg.color} stroke-width="18"
						stroke-dasharray={seg.dash} transform="rotate({seg.rotate - 90} 75 75)" />
				{/each}
			</svg>
			<div class="donut-center">
				{#if totalMinutes}<b>{hours}h</b><span>TOTAL</span>{:else}<span>NO DATA</span>{/if}
			</div>
		</div>
		<ul class="legend">
			{#each summary.bySubject as entry (entry.code)}
				<li>
					<span class="dot" style="background: {entry.color}"></span>
					<b>{entry.name}</b>
					<span class="h">{fmt(entry.minutes)}</span>
					<span class="pct">{entry.pct}%</span>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="bars">
			{#each summary.bars as bar, i (i)}
				<div class="bcol">
					<span class="val">{bar.minutes ? fmt(bar.minutes) : ''}</span>
					<div class="stack">
						{#if bar.parts.length}
							{#each bar.parts as part, j (j)}
								<div class="seg" style="height: {(part.minutes / maxBar) * 100}%; background: {subjectColor(part.code)}" title="{part.code}: {part.minutes}m"></div>
							{/each}
						{:else}
							<div class="seg flat" style="height: {bar.minutes ? (bar.minutes / maxBar) * 100 : 0}%"></div>
						{/if}
					</div>
					<span class="bl">{bar.label}</span>
				</div>
			{/each}
		</div>
		<ul class="legend compact">
			{#each summary.bySubject as entry (entry.code)}
				<li><span class="dot" style="background: {entry.color}"></span>{entry.name}</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.analysis { padding: 1.3rem 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h3 { margin: 0; font-size: .82rem; font-weight: 800; letter-spacing: .1em; color: var(--text-secondary); }
	.tag { margin: .3rem 0 0; font-size: 1.05rem; font-weight: 800; letter-spacing: -.03em; }
	.tools { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
	.grans, .toggle { display: inline-flex; gap: .2rem; padding: .25rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-subtle); }
	.grans button, .toggle button { padding: .38rem .75rem; border: 0; border-radius: 999px; background: transparent; color: var(--text-secondary); font-size: .68rem; font-weight: 800; letter-spacing: .05em; }
	.grans button.active, .toggle button.active { color: #fff; background: var(--accent); }
	.nav { display: flex; gap: .4rem; margin: .9rem 0; }
	.pg { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: var(--surface-panel); }
	.pg:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
	.pg:disabled { opacity: .4; }
	.pg.flip :global(svg) { transform: rotate(180deg); }
	.kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; margin-bottom: 1.1rem; }
	.kpis div { display: grid; gap: .15rem; padding: .7rem .8rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.kpis b { font-size: 1.25rem; font-weight: 800; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
	.kpis span { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .09em; }
	.donut-wrap { position: relative; display: grid; place-items: center; margin: .4rem 0 1rem; }
	.donut-center { position: absolute; display: grid; place-items: center; text-align: center; }
	.donut-center b { font-size: 1.45rem; font-weight: 800; letter-spacing: -.04em; }
	.donut-center span { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .1em; }
	.legend { display: grid; gap: .5rem; margin: 0; padding: 0; list-style: none; }
	.legend li { display: flex; align-items: center; gap: .55rem; padding: .5rem .7rem; border: 1px solid var(--border-subtle); border-radius: 10px; font-size: .8rem; }
	.legend .dot { width: 10px; height: 10px; flex: 0 0 10px; border-radius: 99px; }
	.legend b { font-weight: 750; }
	.legend .h { margin-left: auto; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
	.legend .pct { min-width: 38px; text-align: right; font-weight: 800; }
	.legend.compact { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); grid-auto-flow: column; justify-content: start; gap: .8rem; margin-top: .8rem; }
	.legend.compact li { border: 0; padding: 0; color: var(--text-secondary); font-size: .7rem; font-weight: 700; }
	.bars { display: flex; align-items: flex-end; gap: .45rem; height: 190px; }
	.bcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: .3rem; height: 100%; min-width: 0; }
	.val { color: var(--text-secondary); font-size: .58rem; font-weight: 750; white-space: nowrap; font-variant-numeric: tabular-nums; }
	.stack { flex: 1; display: flex; flex-direction: column-reverse; justify-content: flex-start; width: 100%; max-width: 34px; }
	.seg { width: 100%; border-radius: 3px; min-height: 0; transition: height .3s ease; }
	.seg + .seg { margin-bottom: 2px; }
	.seg.flat { background: var(--accent); }
	.bl { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .04em; }
</style>
