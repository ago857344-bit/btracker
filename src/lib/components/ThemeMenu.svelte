<script lang="ts">
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { THEME_PRESETS, isDarkTheme, presetOf, syncThemeWallpaper, resolveLiveWallpaper, resolveEcoMode, isMobileDevice } from '$lib/state/themes';
	import { celebration, customizingHome, setAccent, tracker, updateTracker } from '$lib/stores/tracker';
	import { unlockCtx } from '$lib/stores/cosmetics';
	import { reqLabel, reqMet, type UnlockCtx } from '$lib/state/cosmetics';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import type { ThemeId } from '$lib/types/tracker';

	export let sidebar = false;
	export let collapsed = false;

	const ACCENTS = ['#6d5dfc', '#e0455a', '#d99a2b', '#2f9e6e', '#2b8ba6', '#2383e2', '#46a302', '#b44df0'];

	let open = false;
	let node: HTMLDivElement;
	let isMobile = false;

	onMount(() => {
		isMobile = isMobileDevice();
	});

	$: liveWallpaperActive = resolveLiveWallpaper($tracker.ui.liveWallpaper);
	$: ecoActive = resolveEcoMode($tracker.ui.ecoMode);

	function handleLiveWpToggle(e: Event & { currentTarget: HTMLInputElement }) {
		const enabled = e.currentTarget.checked;
		updateTracker((state) => {
			state.ui.liveWallpaper = enabled;
		});
		celebration.set(enabled ? 'Live wallpapers enabled.' : 'Live wallpapers disabled (lightweight mode).');
	}

	function handleEcoToggle(e: Event & { currentTarget: HTMLInputElement }) {
		const enabled = e.currentTarget.checked;
		updateTracker((state) => {
			state.ui.ecoMode = enabled;
		});
		celebration.set(enabled ? 'Eco Mode active (Battery saver & smooth 60fps).' : 'Eco Mode disabled (Full effects).');
	}

	$: current = presetOf($tracker.theme);
	const canUse = (preset: (typeof THEME_PRESETS)[number], ctx: UnlockCtx) => reqMet(preset.unlock, ctx);

	function handleOutside(event: Event) {
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

<svelte:window on:mousedown={handleOutside} on:pointerdown={handleOutside} />

<div class="theme-menu" class:sidebar-mode={sidebar} class:is-collapsed={collapsed} bind:this={node}>
	{#if sidebar}
		<button class="theme-nav-btn" type="button" aria-label="Appearance" aria-expanded={open} on:click={() => (open = !open)}>
			<span class="nav-icon"><NavIcon name={isDarkTheme($tracker.theme) ? 'sun' : 'moon'} size={22} /></span>
			<span class="nav-text">Theme</span>
			<span class="theme-pill">{current.label}</span>
		</button>
	{:else}
		<button class="icon-button" type="button" aria-label="Appearance" aria-expanded={open} on:click={() => (open = !open)}>
			<NavIcon name={isDarkTheme($tracker.theme) ? 'sun' : 'moon'} size={19} />
		</button>
	{/if}

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

			<!-- Live Wallpaper Tickbox -->
			<div class="toggle-section">
				<label class="toggle-label" for="live-wp-checkbox">
					<div class="checkbox-box">
						<input
							type="checkbox"
							id="live-wp-checkbox"
							checked={liveWallpaperActive}
							on:change={handleLiveWpToggle}
						/>
						<span class="custom-check">
							{#if liveWallpaperActive}
								<NavIcon name="check" size={11} />
							{/if}
						</span>
					</div>
					<div class="toggle-info">
						<span class="toggle-name">Live Wallpapers</span>
						<span class="toggle-sub">
							{#if $tracker.ui.liveWallpaper === undefined}
								{isMobile ? 'Off on mobile (Saves battery)' : 'On on laptops (Default)'}
							{:else if liveWallpaperActive}
								Video background enabled
							{:else}
								Static background (Fast & light)
							{/if}
						</span>
					</div>
				</label>
			</div>

			<!-- Eco Mode (Battery Saver) Tickbox -->
			<div class="toggle-section" style="margin-top: .4rem;">
				<label class="toggle-label" for="eco-mode-checkbox">
					<div class="checkbox-box">
						<input
							type="checkbox"
							id="eco-mode-checkbox"
							checked={ecoActive}
							on:change={handleEcoToggle}
						/>
						<span class="custom-check">
							{#if ecoActive}
								<NavIcon name="check" size={11} />
							{/if}
						</span>
					</div>
					<div class="toggle-info">
						<span class="toggle-name">Eco Mode (Battery Saver)</span>
						<span class="toggle-sub">
							{#if $tracker.ui.ecoMode === undefined}
								{isMobile ? 'On on mobile (Pauses heavy blur & fx)' : 'Off on laptop (Full visual fx)'}
							{:else if ecoActive}
								Heavy blur & aurora paused (Smooth 60fps)
							{:else}
								Full visual effects & dynamic blur active
							{/if}
						</span>
					</div>
				</label>
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
	.theme-menu.sidebar-mode { width: 100%; }
	.icon-button { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--border-subtle); border-radius: 11px; color: var(--text-secondary); background: var(--surface-panel); cursor: pointer; }
	.icon-button:hover { color: var(--accent); border-color: var(--accent); }

	.theme-nav-btn {
		display: flex;
		align-items: center;
		gap: clamp(0.6rem, 1vw, 1rem);
		height: clamp(40px, 6vh, 52px);
		padding: 0 .75rem;
		border-radius: 12px;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		font-size: clamp(0.85rem, 1.2vh, 1rem);
		font-weight: 650;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background .16s ease, color .16s ease;
		font-family: inherit;
	}
	.theme-nav-btn:hover {
		color: var(--text-primary);
		background: var(--surface-subtle);
	}
	.nav-icon {
		display: grid;
		flex: 0 0 24px;
		place-items: center;
	}
	.nav-text {
		white-space: nowrap;
		overflow: hidden;
		transition: opacity .18s ease;
	}
	.theme-pill {
		margin-left: auto;
		padding: 0.12rem 0.45rem;
		border-radius: 6px;
		background: var(--surface-canvas);
		border: 1px solid var(--border-subtle);
		font-size: 0.65rem;
		font-weight: 750;
		color: var(--accent);
		white-space: nowrap;
	}

	.is-collapsed .theme-nav-btn {
		justify-content: center;
		padding-inline: 0;
		gap: 0;
	}
	.is-collapsed .nav-text,
	.is-collapsed .theme-pill {
		display: none;
	}

	.popover {
		position: absolute;
		z-index: 120;
		top: calc(100% + .55rem);
		right: 0;
		width: 320px;
		padding: .95rem;
		border: 1px solid var(--border-subtle);
		border-radius: 18px;
		background: var(--surface-panel);
		box-shadow: var(--shadow-card);
	}

	.sidebar-mode .popover {
		position: fixed;
		top: auto;
		bottom: 1.5rem;
		left: clamp(260px, 22.5vw, 310px);
		right: auto;
		z-index: 250;
		box-shadow: 0 16px 44px rgba(0,0,0,0.35);
	}

	.sidebar-mode.is-collapsed .popover {
		left: 84px;
	}

	@media (max-width: 760px) {
		.popover,
		.sidebar-mode .popover {
			position: fixed;
			top: auto;
			bottom: max(env(safe-area-inset-bottom), 16px);
			left: 10px;
			right: 10px;
			width: calc(100% - 20px);
			max-width: 440px;
			margin: 0 auto;
			max-height: 80vh;
			overflow-y: auto;
			z-index: 2000;
			border-radius: 20px;
			box-shadow: 0 20px 50px rgba(0,0,0,0.5);
		}
	}
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
	
	.toggle-section { margin-top: .75rem; padding: .55rem .65rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.toggle-label { display: flex; align-items: center; gap: .65rem; cursor: pointer; user-select: none; }
	.checkbox-box { position: relative; width: 18px; height: 18px; flex-shrink: 0; }
	.checkbox-box input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
	.custom-check { display: grid; place-items: center; width: 18px; height: 18px; border: 1.5px solid var(--border-subtle); border-radius: 5px; background: var(--surface-panel); color: #fff; transition: background .15s ease, border-color .15s ease; }
	.checkbox-box input:checked + .custom-check { background: var(--accent); border-color: var(--accent); }
	.toggle-info { display: flex; flex-direction: column; min-width: 0; }
	.toggle-name { font-size: .76rem; font-weight: 750; color: var(--text-primary); }
	.toggle-sub { font-size: .62rem; color: var(--text-secondary); line-height: 1.25; }

	.accents { display: flex; flex-wrap: wrap; gap: .4rem; }
	.swatch { width: 26px; height: 26px; border: 2px solid transparent; border-radius: 99px; }
	.swatch.on { border-color: var(--text-primary); transform: scale(1.1); }
	.foot { margin-top: .85rem; padding-top: .75rem; border-top: 1px solid var(--border-subtle); }
	.custom { display: inline-flex; align-items: center; gap: .45rem; width: 100%; height: 38px; justify-content: center; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .78rem; font-weight: 750; font-family: inherit; }
	.custom:hover { border-color: var(--accent); color: var(--accent); }
	.custom.done { color: #fff; border-color: var(--accent); background: var(--accent); }
</style>
