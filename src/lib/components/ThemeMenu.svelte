<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { THEME_PRESETS, isDarkTheme, presetOf, syncThemeWallpaper } from '$lib/state/themes';
	import { celebration, customizingHome, setAccent, tracker, updateTracker } from '$lib/stores/tracker';
	import { unlockCtx } from '$lib/stores/cosmetics';
	import { reqLabel, reqMet, type UnlockCtx } from '$lib/state/cosmetics';
	import type { ThemeId } from '$lib/types/tracker';

	const ACCENTS = ['#6d5dfc', '#e0455a', '#d99a2b', '#2f9e6e', '#2b8ba6', '#2383e2', '#46a302', '#b44df0'];

	let open = false;
	let node: HTMLDivElement;

	$: current = presetOf($tracker.theme);
	const canUse = (preset: (typeof THEME_PRESETS)[number], ctx: UnlockCtx) => reqMet(preset.unlock, ctx);

	function handleOutside(event: MouseEvent) {
		if (open && node && !node.contains(event.target as Node)) open = false;
	}

	function selectTheme(id: ThemeId) {
		const preset = presetOf(id);
		if (preset.unlock && !reqMet(preset.unlock, $unlockCtx)) {
			celebration.set(`${preset.label} locked — needs ${reqLabel(preset.unlock)}.`);
			open = false;
			return;
		}
		updateTracker((state) => {
			state.theme = id;
			state.ui.accent = preset.accent;
			syncThemeWallpaper(state);
		});
	}

	function toggleMode() {
		updateTracker((state) => {
			const goingDark = !isDarkTheme(state.theme);
			const target = goingDark ? 'dark' : 'light';
			state.theme = target;
			state.ui.accent = presetOf(target).accent;
			syncThemeWallpaper(state);
		});
	}

	function startCustomize() {
		customizingHome.set(true);
		open = false;
		if ($page.url.pathname !== '/') void goto('/');
	}

	function stopCustomize() {
		customizingHome.set(false);
	}
</script>

<svelte:window on:mousedown={handleOutside} />

<div class="theme-menu" bind:this={node}>
	<button class="icon-button" type="button" aria-label="Appearance" aria-expanded={open} on:click={() => (open = !open)}>
		<NavIcon name={isDarkTheme($tracker.theme) ? 'sun' : 'moon'} size={19} />
	</button>

	{#if open}
		<div class="popover" transition:fade={{ duration: 140 }} role="dialog" aria-label="Appearance">
			<div class="head">
				<span><NavIcon name="palette" size={15} /> Appearance</span>
				<button type="button" class="mode" on:click={toggleMode}>
					<NavIcon name={isDarkTheme($tracker.theme) ? 'sun' : 'moon'} size={14} />
					{isDarkTheme($tracker.theme) ? 'Light' : 'Dark'}
				</button>
			</div>

			<p class="label">THEMES</p>
			<div class="themes">
				{#each THEME_PRESETS as preset, i (preset.id + "-" + i)}
					<button type="button" class="theme-card" class:on={current.id === preset.id} class:locked={!canUse(preset, $unlockCtx)} on:click={() => selectTheme(preset.id)}>
						<span class="chip" style="background: {preset.accent}">
							{#if !canUse(preset, $unlockCtx)}<NavIcon name="lock" size={11} />
							{:else if current.id === preset.id}<NavIcon name="check" size={12} />{/if}
						</span>
						<span class="meta">
							<b>{preset.label}</b>
							<small>{preset.unlock && !canUse(preset, $unlockCtx) ? `${reqLabel(preset.unlock)} to unlock` : preset.blurb}</small>
						</span>
					</button>
				{/each}
			</div>

			<p class="label">ACCENT</p>
			<div class="accents">
				{#each ACCENTS as color, i (i)}
					<button type="button" class="swatch" class:on={$tracker.ui.accent === color} style="background: {color}" aria-label="Accent {color}" on:click={() => setAccent(color)}></button>
				{/each}
			</div>

			<div class="foot">
				{#if $customizingHome}
					<button type="button" class="custom done" on:click={stopCustomize}><NavIcon name="check" size={15} /> Finish customizing</button>
				{:else}
					<button type="button" class="custom" on:click={startCustomize}><NavIcon name="grid" size={15} /> Customize home widgets</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.theme-menu { position: relative; }
	.icon-button { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--border-subtle); border-radius: 11px; color: var(--text-secondary); background: var(--surface-panel); }
	.icon-button:hover { color: var(--accent); border-color: var(--accent); }
	.popover { position: absolute; z-index: 120; top: calc(100% + .55rem); right: 0; width: 320px; padding: .95rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .7rem; }
	.head span { display: inline-flex; align-items: center; gap: .42rem; color: var(--text-primary); font-size: .86rem; font-weight: 800; letter-spacing: -.01em; }
	.mode { display: inline-flex; align-items: center; gap: .35rem; height: 30px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .74rem; font-weight: 750; font-family: inherit; }
	.mode:hover { color: var(--accent); border-color: var(--accent); }
	.label { margin: .8rem 0 .45rem; color: var(--text-secondary); font-size: .63rem; font-weight: 800; letter-spacing: .09em; }
	.themes { display: grid; grid-template-columns: 1fr 1fr; gap: .4rem; }
	.theme-card { display: flex; align-items: center; gap: .5rem; padding: .45rem .5rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); text-align: left; font-family: inherit; }
	.theme-card:hover { border-color: var(--accent); }
	.theme-card.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
	.theme-card.locked { opacity: .65; }
	.chip { display: grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: 8px; color: #fff; }
	.meta { display: grid; min-width: 0; }
	.meta b { color: var(--text-primary); font-size: .74rem; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.meta small { color: var(--text-secondary); font-size: .62rem; line-height: 1.25; }
	.accents { display: flex; flex-wrap: wrap; gap: .4rem; }
	.swatch { width: 26px; height: 26px; border: 2px solid transparent; border-radius: 99px; }
	.swatch.on { border-color: var(--text-primary); transform: scale(1.1); }
	.foot { margin-top: .85rem; padding-top: .75rem; border-top: 1px solid var(--border-subtle); }
	.custom { display: inline-flex; align-items: center; gap: .45rem; width: 100%; height: 38px; justify-content: center; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .78rem; font-weight: 750; font-family: inherit; }
	.custom:hover { border-color: var(--accent); color: var(--accent); }
	.custom.done { color: #fff; border-color: var(--accent); background: var(--accent); }
</style>
