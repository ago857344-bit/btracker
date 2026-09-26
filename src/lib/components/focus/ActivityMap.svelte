<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import StatRing from '$lib/components/StatRing.svelte';
	import { tracker, activityWindow, type MapGranularity } from '$lib/stores/tracker';
	import { formatMinutes } from '$lib/state/dates';

	const GRANS: MapGranularity[] = ['daily', 'weekly', 'monthly', 'yearly'];
	let gran: MapGranularity = 'weekly';
	let offset = 0;

	$: win = activityWindow($tracker, gran, offset);
	$: max = Math.max(1, ...win.cells.map((cell) => cell.minutes));

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
			<p class="total">{formatMinutes(win.total)}</p>
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
					<StatRing value={cell.minutes / (max || 1)} size={64} stroke={6} color={cell.minutes ? 'var(--accent)' : 'var(--border-subtle)'}>
						<span class="wm">{cell.minutes ? `${cell.minutes}m` : '—'}</span>
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
</section>

<style>
	.map { padding: 1.3rem 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
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
	.week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .55rem; }
	.wtile { display: grid; justify-items: center; gap: .35rem; }
	.wtile.today .wl { color: var(--accent); font-weight: 800; }
	.wm { font-size: .66rem; font-weight: 750; font-variant-numeric: tabular-nums; }
	.wl { color: var(--text-secondary); font-size: .68rem; font-weight: 700; }
	.grid { display: grid; grid-template-columns: repeat(var(--cols, 7), minmax(0, 1fr)); gap: 4px; }
	.cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; border-radius: 4px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .55rem; font-weight: 650; overflow: hidden; }
	.cell.l1 { background: color-mix(in srgb, var(--accent), transparent 78%); }
	.cell.l2 { background: color-mix(in srgb, var(--accent), transparent 55%); }
	.cell.l3 { background: color-mix(in srgb, var(--accent), transparent 28%); }
	.cell.l4 { background: var(--accent); color: #fff; }
	.cell.today { outline: 2px solid var(--accent); outline-offset: 1px; }
	.grid.tiny .cell { font-size: 0; }
	footer { display: flex; align-items: center; gap: .35rem; margin-top: 1rem; }
	.leg { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .08em; }
	.sw { width: 11px; height: 11px; border-radius: 3px; background: var(--surface-subtle); }
	.sw.l1 { background: color-mix(in srgb, var(--accent), transparent 78%); }
	.sw.l2 { background: color-mix(in srgb, var(--accent), transparent 55%); }
	.sw.l3 { background: color-mix(in srgb, var(--accent), transparent 28%); }
	.sw.l4 { background: var(--accent); }
	footer .leg:nth-of-type(n + 2) { margin-left: .5rem; }
	@media (max-width: 640px) { .week { gap: .3rem; } .wm { font-size: .58rem; } }
</style>
