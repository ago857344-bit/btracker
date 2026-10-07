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
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import StreakButton from '$lib/components/StreakButton.svelte';
	import ThemeMenu from '$lib/components/ThemeMenu.svelte';
	import { hydrateTracker } from '$lib/services/hydrate';
	import { startSync } from '$lib/services/sync';
	import { isDarkTheme } from '$lib/state/themes';
	import { authReady, authConfigured, currentUser, hasSkippedLogin } from '$lib/stores/auth';
	import { saveStatus, tracker } from '$lib/stores/tracker';

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
		if (state.ui.wallpaper) {
			root.setAttribute('data-wallpaper', 'true');
			root.style.setProperty('--user-wallpaper', `url(${state.ui.wallpaper})`);
			
			// Inject dynamic glass opacity based on user preference
			// @ts-ignore
			const opacity = state.ui.glassStrength ?? 45; // Default to 45% opacity (heavy glassmorphism)
			const t = 100 - opacity; // Transparency percentage
			const st = Math.min(100, t + 7);
			
			if (isDarkTheme(state.theme)) {
				root.style.setProperty('--surface-panel', `color-mix(in srgb, #0a0a10, transparent ${t}%)`);
				root.style.setProperty('--surface-subtle', `color-mix(in srgb, #0a0a10, transparent ${st}%)`);
			} else {
				root.style.setProperty('--surface-panel', `color-mix(in srgb, #ffffff, transparent ${t}%)`);
				root.style.setProperty('--surface-subtle', `color-mix(in srgb, #ffffff, transparent ${st}%)`);
			}
		} else {
			root.style.removeProperty('--surface-panel');
			root.style.removeProperty('--surface-subtle');
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
		return tracker.subscribe(applyTheme);
	});
</script>

<svelte:window on:keydown={(event) => { if (event.key === 'Escape') mobileOpen = false; }} />

{#if isAuthRoute}
	<slot />
{:else if $authReady}
	<div class:sidebar-collapsed={collapsed} class="app-shell">
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
	</div>
{:else}
	<div class="auth-loading" aria-live="polite">Checking your session…</div>
{/if}

<style>
	.app-shell { min-height: 100vh; padding-left: 300px; background: var(--surface-canvas); transition: padding-left .24s ease; }
	.app-shell.sidebar-collapsed { padding-left: 76px; }
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
</style>
