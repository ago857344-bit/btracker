<script lang="ts">
	import { fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { recommendation, updateTracker } from '$lib/stores/tracker';

	/** Embedded = rendered inside the widget grid (customize mode); otherwise floats bottom-right. */
	export let embedded = false;

	let dismissed = false;

	function turnOff() {
		updateTracker((state) => { state.norec = true; });
	}
</script>

{#if !dismissed}
	{#key $recommendation.title}
		<div class="rec" class:embedded in:fly={{ y: 12, duration: 260 }}>
			<button type="button" class="close" aria-label="Dismiss recommendation" on:click={() => dismissed = true}><NavIcon name="x" size={13} /></button>
			<span class="bulb"><NavIcon name="bulb" size={17} /></span>
			<p class="badge">Based on your performance patterns</p>
			<h4>{$recommendation.title}</h4>
			<p class="body">{$recommendation.body}</p>
			<div class="row">
				<a class="cta" href={$recommendation.href}>{$recommendation.cta} <span>→</span></a>
				<button type="button" class="off" on:click={turnOff}>Turn off recommendations</button>
			</div>
		</div>
	{/key}
{/if}

<style>
	.rec { position: fixed; right: 1.1rem; bottom: 3.6rem; z-index: 80; width: min(330px, calc(100vw - 2.2rem)); padding: 1.05rem 1.15rem; border: 1px solid color-mix(in srgb, var(--accent), var(--border-subtle) 55%); border-radius: 18px; background: var(--surface-panel); box-shadow: 0 20px 48px rgb(12 9 30 / 26%); }
	.rec.embedded { position: static; width: auto; height: 100%; box-shadow: none; background: linear-gradient(135deg, var(--accent-soft), color-mix(in srgb, var(--accent-soft), transparent 55%)); }
	.close { position: absolute; top: .6rem; right: .6rem; display: grid; place-items: center; width: 26px; height: 26px; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); cursor: pointer; }
	.close:hover { color: var(--text-primary); background: var(--surface-subtle); }
	.bulb { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--accent); background: var(--accent-soft); }
	.badge { margin: .55rem 0 .2rem; color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
	h4 { margin: 0 0 .3rem; font-size: .98rem; font-weight: 780; letter-spacing: -.03em; }
	.body { margin: 0; color: var(--text-secondary); font-size: .8rem; line-height: 1.55; }
	.row { display: flex; align-items: center; gap: .6rem; margin-top: .85rem; flex-wrap: wrap; }
	.cta { display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .85rem; border-radius: 10px; color: #fff; background: var(--accent); font-size: .76rem; font-weight: 750; letter-spacing: .03em; text-transform: uppercase; text-decoration: none; box-shadow: 0 7px 16px color-mix(in srgb, var(--accent), transparent 68%); }
	.off { border: 0; background: transparent; color: var(--text-secondary); font-size: .68rem; font-weight: 650; text-decoration: underline; cursor: pointer; }
	.off:hover { color: var(--text-primary); }
	@media (max-width: 760px) { .rec:not(.embedded) { right: .8rem; left: .8rem; bottom: 3.4rem; width: auto; } }
</style>
