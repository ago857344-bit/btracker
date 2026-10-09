<script lang="ts">
	import '../app.css';
	import { browser, dev } from '$app/environment';
	import { goto, beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/stores';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import GlobalOverlays from '$lib/components/GlobalOverlays.svelte';
	import AIOmentor from '$lib/components/ui/AIOmentor.svelte';
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import StreakButton from '$lib/components/StreakButton.svelte';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { hydrateTracker } from '$lib/services/hydrate';
	import { startSync } from '$lib/services/sync';
	import { THEME_PRESETS, isDarkTheme, wallpaperCss } from '$lib/state/themes';
	import { authReady, authConfigured, currentUser, hasSkippedLogin } from '$lib/stores/auth';
	import { saveStatus, tracker } from '$lib/stores/tracker';
	import { loadout } from '$lib/stores/cosmetics';

	let collapsed = false;
	let mobileOpen = false;

				
	beforeNavigate(({ cancel }) => {
		if (mobileOpen) {
			mobileOpen = false;
			cancel();
		}
	});

	const titles: Record<string, string> = {
		'/': 'Home', '/log': 'Question Log', '/review': 'Review', '/plan': 'Plan', '/focus': 'Focus', '/todo': 'To Do', '/revise': 'Revise',
		'/stats': 'Stats', '/reminders': 'Reminders', '/settings': 'Settings'
	};
	$: isAuthRoute = $page.url.pathname === '/login' || $page.url.pathname.startsWith('/auth/');
	$: currentTitle = titles[$page.url.pathname] ?? 'BTracker';
	$: saveLabel = $saveStatus === 'saving' ? 'Saving' : $saveStatus === 'error' ? 'Save failed' : 'Saved';
	$: if (browser && $authReady) {
		const hasAuth = $authConfigured;
		if (hasAuth) {
			if (isAuthRoute && $currentUser) void goto('/', { replaceState: true });
			else if (!isAuthRoute && !$currentUser && !$hasSkippedLogin) void goto('/login', { replaceState: true });
		} else {
			// No auth configured, allow access to all routes
			if (isAuthRoute) void goto('/', { replaceState: true });
		}
	}

	function applyTheme(state: { theme: string; ui: { accent: string, wallpaper?: string | null } }) {
		const root = document.documentElement;
		root.setAttribute('data-theme', state.theme);
		root.style.setProperty('--accent', state.ui.accent);
		root.style.setProperty('--accent-strong', `color-mix(in srgb, ${state.ui.accent}, black 14%)`);
		root.style.setProperty('--accent-soft', `color-mix(in srgb, ${state.ui.accent}, transparent ${isDarkTheme(state.theme) ? '82%' : '88%'})`);
		
		const themeDef = THEME_PRESETS.find(t => t.id === state.theme);
		if (themeDef && themeDef.confetti) {
			root.style.setProperty('--aurora-1', themeDef.confetti[0] || state.ui.accent);
			root.style.setProperty('--aurora-2', themeDef.confetti[1] || '#69db7c');
			root.style.setProperty('--aurora-3', themeDef.confetti[2] || '#b197fc');
		} else {
			root.style.setProperty('--aurora-1', state.ui.accent);
			root.style.setProperty('--aurora-2', '#69db7c');
			root.style.setProperty('--aurora-3', '#b197fc');
		}
		
		if (state.ui.wallpaper) {
			root.setAttribute('data-wallpaper', 'true');
			root.style.setProperty('--user-wallpaper', wallpaperCss(state.ui.wallpaper));
			
			// Inject dynamic glass opacity based on user preference
			// @ts-ignore
			const opacity = state.ui.glassStrength ?? 45;
			const t = 100 - opacity;
			const st = Math.min(100, t + 7);
			const blurVal = Math.max(0, (opacity / 45) * 20); // 0 at 0%, 20px at 45%
			const filterStr = opacity === 0 ? 'none' : `blur(${blurVal}px) saturate(180%)`;
			root.style.setProperty('--glass-filter', filterStr);
			if (opacity === 0) {
				root.setAttribute('data-clear-glass', 'true');
			} else {
				root.removeAttribute('data-clear-glass');
			}
			if (opacity === 0) {
				root.style.setProperty('--surface-panel', 'transparent', 'important');
				root.style.setProperty('--surface-subtle', 'transparent', 'important');
			}
			
			if (opacity === 0) {
				root.style.setProperty('--surface-panel', 'transparent');
				root.style.setProperty('--surface-subtle', 'transparent');
				root.style.setProperty('--surface-panel-ai', 'transparent');
			} else if (isDarkTheme(state.theme)) {
				root.style.setProperty('--surface-panel', `color-mix(in srgb, #0a0a10, transparent ${t}%)`);
				root.style.setProperty('--surface-panel-ai', `color-mix(in srgb, #0a0a10, transparent ${Math.min(t, 15)}%)`);
				root.style.setProperty('--surface-subtle', `color-mix(in srgb, #0a0a10, transparent ${st}%)`);
			} else {
				root.style.setProperty('--surface-panel', `color-mix(in srgb, #ffffff, transparent ${t}%)`);
				root.style.setProperty('--surface-panel-ai', `color-mix(in srgb, #ffffff, transparent ${Math.min(t, 15)}%)`);
				root.style.setProperty('--surface-subtle', `color-mix(in srgb, #ffffff, transparent ${st}%)`);
			}
		} else {
			root.style.removeProperty('--surface-panel');
			root.style.removeProperty('--surface-subtle');
			root.style.removeProperty('--glass-filter');
			root.removeAttribute('data-wallpaper');
			root.style.removeProperty('--user-wallpaper');
		}
		
		// @ts-ignore
		if (state.ui.reducedMotion) {
			root.setAttribute('data-reduced-motion', 'true');
		} else {
			root.removeAttribute('data-reduced-motion');
		}
	}

	onMount(() => {
		void hydrateTracker().then(() => startSync());
		const stopTheme = tracker.subscribe(applyTheme);
		const stopFx = loadout.subscribe((l) => document.documentElement.setAttribute('data-fx', l.fx));
		return () => { stopTheme(); stopFx(); };
	});
	$: currentWallpaperStr = $tracker.ui.wallpaper;
	$: activeVideoUrl = (() => {
		if (!currentWallpaperStr) return null;
		if (currentWallpaperStr.startsWith('data:video')) return currentWallpaperStr;
		if (currentWallpaperStr.startsWith('builtin:')) {
			const id = currentWallpaperStr.slice(8);
			const preset = THEME_PRESETS.find(t => t.id === id);
			if (preset && preset.wallpaper && preset.wallpaper.endsWith('.mp4')) {
				return preset.wallpaper;
			}
		}
		return null;
	})();

</script>

<svelte:window on:keydown={(event) => { if (event.key === 'Escape') mobileOpen = false; }} />

{#if isAuthRoute}
	<slot />
{:else if $authReady}
	{@const themeIsCustom = THEME_PRESETS.find(t => t.id === $tracker.theme)?.unlock != null}
	<div class:sidebar-collapsed={collapsed} class:aurora-on={$loadout.aurora || themeIsCustom} class="app-shell">
		{#if $loadout.aurora || themeIsCustom}<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>{/if}
		{#if mobileOpen}<button class="scrim" aria-label="Close navigation" on:click={() => mobileOpen = false}></button>{/if}
		<AppSidebar bind:collapsed bind:mobileOpen />
		<div class="app-main">
			<header class="topbar">
				<div class="page-heading">
					<button class="mobile-menu" type="button" aria-label="Open navigation" on:click={() => mobileOpen = true}><NavIcon name="menu" size={21} /></button>
					<div><p class="breadcrumb">BTracker <span>/</span> {currentTitle}</p><h2>{currentTitle}</h2></div>
				</div>
				<div class="topbar-actions">
					<span class:error={$saveStatus === 'error'} class="save-state"><i></i>{saveLabel}</span>
					<StreakButton />
					<ThemeMenu />
					<a class="quick-add" href="/plan?new=task"><NavIcon name="plus" size={17} /><span>New task</span></a>
					<AccountMenu />
				</div>
			</header>
			<main>
				{#key $page.url.pathname}
					<div in:fly={{ y: 8, duration: 200, delay: 0, opacity: 1 }} style="height: 100%;">
						<slot />
					</div>
				{/key}
			</main>
		</div>

		<MobileBottomNav />
		<GlobalOverlays />
		<AIOmentor />
		{#if activeVideoUrl}
			<video src={activeVideoUrl} autoplay loop muted playsinline preload="auto" class="live-wallpaper-bg" on:loadeddata={(e) => e.currentTarget.play()} on:canplay={(e) => e.currentTarget.play()}></video>
		{/if}

	</div>
{:else}
	<div class="auth-loading" aria-live="polite">Checking your session…</div>
{/if}

<style>
	.app-shell { min-height: 100vh; padding-left: 300px; background: var(--surface-canvas); transition: padding-left .24s ease; }
	.app-shell.sidebar-collapsed { padding-left: 76px; }
	/* Isolation keeps the z-index:-1 aurora above the shell background but below its content. */
	.app-shell.aurora-on { isolation: isolate; }
	.aurora { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; opacity: .55; }
	.aurora i { position: absolute; width: 70vmax; height: 38vmax; border-radius: 50%; filter: blur(70px); mix-blend-mode: screen; animation: aurora-drift 26s ease-in-out infinite alternate; }
	.aurora i:nth-child(1) { top: -14vmax; left: -8vmax; background: color-mix(in srgb, var(--aurora-1), transparent 72%); }
	.aurora i:nth-child(2) { top: -6vmax; right: -16vmax; background: color-mix(in srgb, var(--aurora-2), transparent 80%); animation-duration: 32s; animation-delay: -9s; }
	.aurora i:nth-child(3) { bottom: -20vmax; left: 20vw; background: color-mix(in srgb, var(--aurora-3), transparent 80%); animation-duration: 38s; animation-delay: -17s; }
	:global(:root[data-theme='light']) .aurora i, :global(:root[data-theme='notion']) .aurora i, :global(:root[data-theme='duolingo']) .aurora i, :global(:root[data-theme='anki']) .aurora i { mix-blend-mode: multiply; opacity: .5; }
	@keyframes aurora-drift {
		0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
		50% { transform: translate3d(6vw, 4vh, 0) rotate(8deg) scale(1.12); }
		100% { transform: translate3d(-4vw, 8vh, 0) rotate(-6deg) scale(.94); }
	}
	:global(:root[data-reduced-motion='true']) .aurora i { animation: none; }
	@media (prefers-reduced-motion: reduce) { .aurora i { animation: none; } }
	.app-main { min-height: 100vh; }
	.topbar { display: flex; align-items: center; justify-content: space-between; min-height: 88px; padding: 1.25rem clamp(1.5rem, 4vw, 4rem); border-bottom: 1px solid color-mix(in srgb, var(--border-subtle), transparent 32%); }
	.page-heading, .topbar-actions { display: flex; align-items: center; }
	.page-heading { gap: .85rem; }
	.breadcrumb { margin: 0 0 .2rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.breadcrumb span { margin: 0 .26rem; color: var(--border-subtle); }
	h2 { margin: 0; font-size: 1.15rem; line-height: 1.1; letter-spacing: -.035em; }
	.topbar-actions { gap: .65rem; }
	.save-state { display: inline-flex; align-items: center; gap: .42rem; color: var(--text-secondary); font-size: .74rem; font-weight: 650; }
	.save-state i { display: block; width: 7px; height: 7px; border-radius: 99px; background: var(--success); }
	.save-state.error i { background: var(--danger); }
	.quick-add { display: inline-flex; align-items: center; gap: .42rem; height: 36px; padding: 0 .75rem; border-radius: 11px; color: white; background: var(--accent); box-shadow: 0 7px 16px color-mix(in srgb, var(--accent), transparent 67%); font-size: .78rem; font-weight: 750; text-decoration: none; }
	main { width: min(100%, 1560px); margin: 0 auto; padding: clamp(1.5rem, 3.5vw, 3.5rem) clamp(1.5rem, 4vw, 4rem) 4rem; }
	.mobile-menu { display: none; width: 37px; height: 37px; place-items: center; border: 1px solid var(--border-subtle); border-radius: 11px; color: var(--text-primary); background: var(--surface-panel); }
	.scrim { display: none; }
	.auth-loading { display: grid; min-height: 100vh; place-items: center; background: var(--surface-canvas); color: var(--text-secondary); font-size: .9rem; font-weight: 650; }
	@media (max-width: 760px) {
		.app-shell, .app-shell.sidebar-collapsed { padding-left: 0; }
		.topbar { min-height: 76px; padding: 1rem 1.15rem; }
		.mobile-menu { display: grid; }
		.save-state { display: none; }
		.quick-add span { display: none; }
		.quick-add { width: 36px; justify-content: center; padding: 0; }
		main { padding: 1rem .75rem 100px; }
		.scrim { display: block; position: fixed; z-index: 10; inset: 0; border: 0; background: rgb(16 14 30 / 34%); backdrop-filter: blur(2px); }
	}

.live-wallpaper-bg { position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: -2; pointer-events: none; opacity: 0.85; mix-blend-mode: screen; }
::global(:root[data-theme*="-dark"]) .live-wallpaper-bg { opacity: 0.4; }
</style>

