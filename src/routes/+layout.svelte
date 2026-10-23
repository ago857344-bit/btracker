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
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import FocusScreen from '$lib/components/focus/FocusScreen.svelte';
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import StreakButton from '$lib/components/StreakButton.svelte';
	import TriRingsButton from '$lib/components/ui/TriRingsButton.svelte';
	import FormulaVault from '$lib/components/FormulaVault.svelte';
	import TestDaySheetModal from '$lib/components/tests/TestDaySheetModal.svelte';
	import PwaBanner from '$lib/components/PwaBanner.svelte';
	import DynamicIsland from '$lib/components/ui/DynamicIsland.svelte';
	import PipFloatingIsland from '$lib/components/ui/PipFloatingIsland.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import FeynmanDuckModal from '$lib/components/feynman/FeynmanDuckModal.svelte';
	import { hydrateTracker } from '$lib/services/hydrate';
	import { startSync } from '$lib/services/sync';
	import { THEME_PRESETS, isDarkTheme, wallpaperCss, resolveLiveWallpaper, resolveEcoMode, isMobileDevice, isBuiltinWallpaper, EXTRA_WALLPAPERS } from '$lib/state/themes';
	import { authReady, authConfigured, currentUser, hasSkippedLogin, syncStatus } from '$lib/stores/auth';
	import { saveStatus, tracker, formulaVaultOpen, testDaySheetOpen, targetsModalOpen, autoCheckStreakFreeze } from '$lib/stores/tracker';
	import { loadout } from '$lib/stores/cosmetics';
	import { globalTimer } from '$lib/stores/timerState';
	import HotkeyCheatsheetModal from '$lib/components/ui/HotkeyCheatsheetModal.svelte';
	import { sampleVideoFrame, analyzeWallpaperLuminance, clearWallpaperContrast, activeWallpaperColors } from '$lib/utils/wallpaperContrast';

	let collapsed = false;
	let mobileOpen = false;
	let hotkeyModalOpen = false;

	let touchStartX = 0;
	let touchStartY = 0;
	const mainRoutes = ['/', '/log', '/focus', '/todo', '/settings'];

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
		touchStartY = e.changedTouches[0].screenY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (mobileOpen) return;
		if (typeof document !== 'undefined' && (document.body.dataset.sheetOpen || document.body.dataset.deepWork || document.querySelector('.modal-backdrop, .gm-backdrop, .island-scrim, .vault-drawer, .vault-backdrop, .overlay'))) return;
		const touchEndX = e.changedTouches[0].screenX;
		const touchEndY = e.changedTouches[0].screenY;

		const diffX = touchEndX - touchStartX;
		const diffY = touchEndY - touchStartY;

		if (Math.abs(diffX) > 75 && Math.abs(diffY) < 50) {
			let target = (e.target instanceof Element ? e.target : (e.target as Node)?.parentElement) as HTMLElement | null;
			if (target?.closest('input, textarea, select, [contenteditable="true"], .slider, [role="slider"]')) return;
			let isScrollable = false;
			while (target && target !== e.currentTarget) {
				if (target.classList && target.classList.contains('flashcard')) {
					isScrollable = true;
					break;
				}
				const style = window.getComputedStyle(target);
				if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
					if (target.scrollWidth > target.clientWidth) {
						isScrollable = true;
						break;
					}
				}
				target = target.parentElement;
			}

			if (isScrollable) return;

			// @ts-ignore
			const currentIdx = mainRoutes.indexOf($page.url.pathname);
			if (currentIdx === -1) return;

			if (diffX < 0) {
				if (currentIdx < mainRoutes.length - 1) void goto(mainRoutes[currentIdx + 1]);
			} else {
				if (currentIdx > 0) void goto(mainRoutes[currentIdx - 1]);
			}
		}
	}


	let pointerRaf: number | null = null;
	let lastTiltedEl: HTMLElement | null = null;
	function handleGlobalPointerMove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		if (pointerRaf) return;
		pointerRaf = requestAnimationFrame(() => {
			pointerRaf = null;

			const el = e.target as HTMLElement | null;
			// Popups, modals, dialogs, drawers, and menus NEVER tilt
			if (!el || el.closest('.modal-card, .modal-backdrop, [role="dialog"], .menu, .drawer, .goals-drawer, .no-tilt, header, nav, .bottom-nav')) {
				if (lastTiltedEl) {
					lastTiltedEl.style.removeProperty('--tilt-x');
					lastTiltedEl.style.removeProperty('--tilt-y');
					lastTiltedEl.style.removeProperty('--card-lift');
					lastTiltedEl = null;
				}
				return;
			}

			// Only allow ultra-subtle tilt on dashboard widgets and bento cards
			const target = el.closest?.('.widget, .bento-card') as HTMLElement | null;

			if (lastTiltedEl && lastTiltedEl !== target) {
				lastTiltedEl.style.removeProperty('--tilt-x');
				lastTiltedEl.style.removeProperty('--tilt-y');
				lastTiltedEl.style.removeProperty('--card-lift');
			}
			lastTiltedEl = target;

			if (target && !target.closest('.no-tilt, [role="dialog"]')) {
				const rect = target.getBoundingClientRect();
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;
				target.style.setProperty('--mouse-x', `${mouseX}px`);
				target.style.setProperty('--mouse-y', `${mouseY}px`);

				// Micro-depth tilt: only 1.8 deg max to avoid peripheral distortion
				const centerX = rect.width / 2;
				const centerY = rect.height / 2;
				const deltaX = Math.max(-1, Math.min(1, (mouseX - centerX) / (centerX || 1)));
				const deltaY = Math.max(-1, Math.min(1, (mouseY - centerY) / (centerY || 1)));
				const maxTilt = 1.8;
				const tiltX = -deltaY * maxTilt;
				const tiltY = deltaX * maxTilt;
				target.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
				target.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
				target.style.setProperty('--card-lift', '-2px');
			}
		});
	}

	function handleGlobalPointerOut(e: PointerEvent) {
		if (!e.relatedTarget && lastTiltedEl) {
			lastTiltedEl.style.removeProperty('--tilt-x');
			lastTiltedEl.style.removeProperty('--tilt-y');
			lastTiltedEl.style.removeProperty('--card-lift');
			lastTiltedEl = null;
		}
	}

	function handleGlobalPointerDown(e: Event) {
		if (!mobileOpen) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest('aside') || target?.closest('.mobile-menu')) return;
		mobileOpen = false;
	}

	beforeNavigate(() => {
		if (mobileOpen) {
			mobileOpen = false;
		}
	});

	const titles: Record<string, string> = {
		'/': 'Home', '/log': 'Question Log', '/review': 'Review', '/plan': 'Plan', '/focus': 'Focus', '/todo': 'To Do', '/revise': 'Revise',
		'/dump': 'Study Dump', '/tests': 'Tests', '/stats': 'Stats', '/reminders': 'Reminders', '/settings': 'Settings'
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

	function resolveEffectiveWallpaper(themeId: string, userWp: string | null | undefined, unauth: boolean): string | null {
		if (unauth) return null;
		const preset = THEME_PRESETS.find(t => t.id === themeId);
		if (!userWp) {
			return preset?.wallpaper ? ('builtin:' + themeId) : null;
		}
		if (isBuiltinWallpaper(userWp)) {
			const builtinId = userWp.startsWith('builtin:') ? userWp.slice(8) : null;
			if (builtinId && EXTRA_WALLPAPERS.some(w => w.id === builtinId)) {
				return userWp;
			}
			if (preset?.wallpaper) {
				return 'builtin:' + themeId;
			}
			return null;
		}
		return userWp;
	}

	function applyTheme(state: { theme: string; ui: { accent: string, wallpaper?: string | null } }) {
		const root = document.documentElement;
		root.setAttribute('data-theme', state.theme);
		root.style.setProperty('--accent', state.ui.accent);
		root.style.setProperty('--accent-strong', `color-mix(in srgb, ${state.ui.accent}, black 14%)`);
		root.style.setProperty('--accent-soft', `color-mix(in srgb, ${state.ui.accent}, transparent ${isDarkTheme(state.theme) ? '82%' : '88%'})`);
		const isBrightAccent = state.theme === 'god-mode' || state.theme === 'catalyst' || state.theme === 'initiate' || state.theme === 'aurora' || state.theme === 'celestial';
		root.style.setProperty('--accent-contrast', isBrightAccent ? '#070602' : '#ffffff');
		
		if (isDarkTheme(state.theme)) {
			root.style.setProperty('--surface-popup', state.theme === 'catalyst' || state.theme === 'green' ? 'rgba(21, 33, 26, 0.96)' : 'rgba(18, 16, 32, 0.96)');
			root.style.setProperty('--surface-popup-solid', state.theme === 'catalyst' || state.theme === 'green' ? '#15211a' : '#121020');
		} else {
			root.style.setProperty('--surface-popup', 'rgba(255, 255, 255, 0.96)');
			root.style.setProperty('--surface-popup-solid', '#ffffff');
		}
		
		const themeDef = THEME_PRESETS.find(t => t.id === state.theme);		if (themeDef && themeDef.confetti) {
			root.style.setProperty('--aurora-1', themeDef.confetti[0] || state.ui.accent);
			root.style.setProperty('--aurora-2', themeDef.confetti[1] || '#69db7c');
			root.style.setProperty('--aurora-3', themeDef.confetti[2] || '#b197fc');
		} else {
			root.style.setProperty('--aurora-1', state.ui.accent);
			root.style.setProperty('--aurora-2', '#69db7c');
			root.style.setProperty('--aurora-3', '#b197fc');
		}

		const effectiveWallpaper = resolveEffectiveWallpaper(state.theme, state.ui.wallpaper, isFirstTimeOrUnauth);
		
		if (effectiveWallpaper) {
			root.setAttribute('data-wallpaper', 'true');
			root.style.setProperty('--user-wallpaper', wallpaperCss(effectiveWallpaper));
		} else {
			root.removeAttribute('data-wallpaper');
			root.removeAttribute('data-live-wallpaper');
			root.style.removeProperty('--user-wallpaper');
		}

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
			root.style.setProperty('--surface-panel', 'transparent');
			root.style.setProperty('--surface-subtle', 'transparent');
			root.style.setProperty('--surface-panel-ai', 'transparent');
		} else {
			root.removeAttribute('data-clear-glass');
			if (isDarkTheme(state.theme)) {
				// Use theme-specific base colour so panels match the theme palette rather than generic near-black
				const DARK_THEME_BASES: Record<string, string> = {
					aurora: '#040e1d', initiate: '#040a10', 'god-mode': '#0e0c04', catalyst: '#050e06',
					celestial: '#0a0618', challenger: '#100502', quantum: '#04051a', axiom: '#100408',
					obsidian: '#120e24', quizlet: '#0c1128', green: '#061210', red: '#120408'
				};
				const base = DARK_THEME_BASES[state.theme] ?? '#0a0a10';
				root.style.setProperty('--surface-panel', `color-mix(in srgb, ${base}, transparent ${t}%)`);
				root.style.setProperty('--surface-panel-ai', `color-mix(in srgb, ${base}, transparent ${Math.min(t, 15)}%)`);
				root.style.setProperty('--surface-subtle', `color-mix(in srgb, ${base}, transparent ${st}%)`);
			} else {
				root.style.setProperty('--surface-panel', `color-mix(in srgb, #ffffff, transparent ${t}%)`);
				root.style.setProperty('--surface-panel-ai', `color-mix(in srgb, #ffffff, transparent ${Math.min(t, 15)}%)`);
				root.style.setProperty('--surface-subtle', `color-mix(in srgb, #ffffff, transparent ${st}%)`);
			}
		}
		
		// @ts-ignore
		if (state.ui.reducedMotion) {
			root.setAttribute('data-reduced-motion', 'true');
		} else {
			root.removeAttribute('data-reduced-motion');
		}

		// @ts-ignore
		const liveWpExplicit = state.ui.liveWallpaper === true;
		const themeHasVideo = Boolean(THEME_PRESETS.find(t => t.id === state.theme)?.wallpaper?.endsWith('.mp4'));
		// @ts-ignore
		const eco = resolveEcoMode(state.ui.ecoMode);
		if (eco && !liveWpExplicit && !themeHasVideo) {
			root.setAttribute('data-eco', 'true');
		} else {
			root.removeAttribute('data-eco');
		}
		root.removeAttribute('data-ambient-shader');
	}

	$: isFirstTimeOrUnauth = isAuthRoute || (!$currentUser && !$hasSkippedLogin);
	$: effectiveTheme = isFirstTimeOrUnauth ? 'light' : ($tracker.theme || 'light');
	$: if (browser) {
		applyTheme({
			theme: effectiveTheme,
			ui: $tracker.ui
		});
	}

	let isMobile = false;
	onMount(() => {
		void hydrateTracker().then(() => {
			startSync();
			autoCheckStreakFreeze();
		});
		isMobile = isMobileDevice();
		const onResize = () => { isMobile = isMobileDevice(); };
		window.addEventListener('resize', onResize, { passive: true });
		const stopFx = loadout.subscribe((l) => document.documentElement.setAttribute('data-fx', l.fx));
		const unlockVideo = () => {
			if (bgVideo && bgVideo.paused && activeVideoUrl) {
				bgVideo.muted = true;
				bgVideo.play().catch(() => {});
			}
		};
		window.addEventListener('click', unlockVideo, { passive: true });
		window.addEventListener('touchstart', unlockVideo, { passive: true });
		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('click', unlockVideo);
			window.removeEventListener('touchstart', unlockVideo);
			if (pointerRaf) cancelAnimationFrame(pointerRaf);
			stopFx();
		};
	});
	$: currentThemePreset = THEME_PRESETS.find(t => t.id === effectiveTheme);
	$: themeHasVideo = Boolean(currentThemePreset?.wallpaper?.endsWith('.mp4'));
	$: isExplicitLiveWp = !isFirstTimeOrUnauth && $tracker.ui.liveWallpaper === true;
	$: isEcoActive = $tracker.ui.ecoMode === true || ($tracker.ui.ecoMode === undefined && !isExplicitLiveWp && isMobile);
	$: currentWallpaperStr = resolveEffectiveWallpaper(effectiveTheme, $tracker.ui.wallpaper, isFirstTimeOrUnauth);
	$: liveWallpaperEnabled = !isFirstTimeOrUnauth && (isExplicitLiveWp || (themeHasVideo && $tracker.ui.liveWallpaper !== false) || (!isEcoActive && resolveLiveWallpaper($tracker.ui.liveWallpaper)));
	$: activeVideoUrl = (() => {
		if (isFirstTimeOrUnauth || !liveWallpaperEnabled || !currentWallpaperStr) return null;
		if (currentWallpaperStr.startsWith('data:video')) return currentWallpaperStr;
		if (currentWallpaperStr.startsWith('builtin:')) {
			const id = currentWallpaperStr.slice(8);
			const preset = THEME_PRESETS.find(t => t.id === id);
			if (preset && preset.wallpaper && preset.wallpaper.endsWith('.mp4')) {
				return encodeURI(preset.wallpaper);
			}
		}
		if (currentWallpaperStr.endsWith('.mp4') || currentWallpaperStr.endsWith('.webm')) {
			return encodeURI(currentWallpaperStr);
		}
		return null;
	})();

	$: if (typeof document !== 'undefined') {
		if (activeVideoUrl && !isFirstTimeOrUnauth) {
			document.documentElement.setAttribute('data-live-wallpaper', 'true');
		} else {
			document.documentElement.removeAttribute('data-live-wallpaper');
		}
	}

	let bgVideo: HTMLVideoElement;
	let lastLoadedVideoUrl: string | null = null;
	$: if (bgVideo && activeVideoUrl && activeVideoUrl !== lastLoadedVideoUrl) {
		lastLoadedVideoUrl = activeVideoUrl;
		bgVideo.muted = true;
		bgVideo.defaultMuted = true;
		bgVideo.playsInline = true;
		bgVideo.load();
		bgVideo.play().catch(() => {});
	}

	$: if (browser) {
		if (currentWallpaperStr && !activeVideoUrl) {
			const rawUrl = currentWallpaperStr.startsWith('url(')
				? currentWallpaperStr.slice(4, -1).replace(/["']/g, '')
				: currentWallpaperStr;
			if (rawUrl) {
				analyzeWallpaperLuminance(rawUrl);
			}
		} else if (!currentWallpaperStr && !activeVideoUrl) {
			clearWallpaperContrast();
		}
	}

	$: showOnboarding = ((!isAuthRoute && $authReady && $syncStatus !== 'pulling' && !!$currentUser && !$tracker.onboarded)) || $targetsModalOpen;

	const LIGHT_THEMES = new Set(['light', 'notion', 'duolingo', 'anki', 'master']);
	$: defaultThemeColor = LIGHT_THEMES.has(effectiveTheme) ? '#f7f7fb' : '#11101b';
	$: hasActiveWallpaper = Boolean((currentWallpaperStr || activeVideoUrl) && !isFirstTimeOrUnauth);
	$: themeColorMeta = (hasActiveWallpaper && $activeWallpaperColors.bottomHex)
		? $activeWallpaperColors.bottomHex
		: defaultThemeColor;

	$: if (browser && themeColorMeta) {
		const metaThemeTags = document.querySelectorAll('meta[name="theme-color"]');
		metaThemeTags.forEach((tag) => tag.setAttribute('content', themeColorMeta));
	}
</script>

<svelte:head>
	<meta name="theme-color" content={themeColorMeta} />
	{#if activeVideoUrl}
		<link rel="preload" as="video" href={activeVideoUrl} type="video/mp4" fetchpriority="high" />
	{/if}
</svelte:head>

<svelte:window
	on:pointerdown={handleGlobalPointerDown}
	on:touchstart={handleGlobalPointerDown}
	on:pointermove={handleGlobalPointerMove}
	on:pointerout={handleGlobalPointerOut}
	on:keydown={(event) => {
		if (event.key === 'Escape') {
			mobileOpen = false;
			hotkeyModalOpen = false;
		}
		const target = event.target as HTMLElement | null;
		const tag = target?.tagName?.toLowerCase();
		const isEditable = target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
		if (!isEditable && !event.ctrlKey && !event.metaKey && !event.altKey) {
			if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
				event.preventDefault();
				hotkeyModalOpen = !hotkeyModalOpen;
			} else if (event.key === 'f' || event.key === 'F') {
				event.preventDefault();
				formulaVaultOpen.update((v) => !v);
			} else if (event.key === ' ') {
				event.preventDefault();
				$globalTimer.toggle();
			} else if (event.key === '+' || event.key === '=') {
				event.preventDefault();
				$globalTimer.addFive();
			} else if (event.key === '1') {
				goto('/');
			} else if (event.key === '2') {
				goto('/log');
			} else if (event.key === '3') {
				goto('/focus');
			} else if (event.key === '4') {
				goto('/todo');
			} else if (event.key === '5') {
				goto('/settings');
			}
		}
	}}
/>

{#if isAuthRoute}
	<slot />
{:else if $authReady}
	{#if activeVideoUrl}
		<video
			bind:this={bgVideo}
			src={activeVideoUrl}
			autoplay
			loop
			muted
			playsinline
			preload="auto"
			class="live-wallpaper-bg"
			on:loadedmetadata={(e) => { e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
			on:loadeddata={(e) => {
				e.currentTarget.muted = true;
				e.currentTarget.play().catch(() => {});
				sampleVideoFrame(e.currentTarget);
			}}
			on:canplay={(e) => { e.currentTarget.muted = true; e.currentTarget.play().catch(() => {}); }}
			on:ended={(e) => { e.currentTarget.currentTime = 0; e.currentTarget.play().catch(() => {}); }}
		/>
	{/if}
	{#if activeVideoUrl || currentWallpaperStr}
		<div class="wallpaper-adaptive-scrim" aria-hidden="true"></div>
	{/if}
	{@const themeIsCustom = THEME_PRESETS.find(t => t.id === effectiveTheme)?.unlock != null}
	<div class:sidebar-collapsed={collapsed} class:aurora-on={$loadout.aurora || themeIsCustom} class="app-shell">
		{#if ($loadout.aurora || themeIsCustom) && !activeVideoUrl}<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>{/if}
		{#if mobileOpen}<div class="scrim" role="button" tabindex="-1" on:click={() => (mobileOpen = false)} on:keydown={(e) => e.key === 'Escape' && (mobileOpen = false)} aria-label="Close navigation"></div>{/if}
		<AppSidebar bind:collapsed bind:mobileOpen />
		<div class="app-main">
			<header class="topbar">
				<div class="page-heading">
					<button class="mobile-menu" type="button" aria-label="Open navigation" on:click={() => mobileOpen = true}><NavIcon name="menu" size={21} /></button>
					<div><p class="breadcrumb">BTracker <span>/</span> {currentTitle}</p><h2>{currentTitle}</h2></div>
				</div>
				<div class="topbar-center" aria-hidden="true"></div>
				<div class="topbar-actions">
					<span class:error={$saveStatus === 'error'} class="save-state"><i></i>{saveLabel}</span>
					<StreakButton />
					<TriRingsButton />
					<a class="quick-add" href="/plan?new=task"><NavIcon name="plus" size={17} /><span>New task</span></a>
					<AccountMenu />
				</div>
			</header>
			<main on:touchstart={handleTouchStart} on:touchend={handleTouchEnd}>
				<div style="display: {$page.url.pathname === '/focus' ? 'block' : 'none'}; height: 100%;">
					<FocusScreen />
				</div>
				<div style="display: {$page.url.pathname === '/focus' ? 'none' : 'block'}; height: 100%;">
					{#key $page.url.pathname}
						<div in:fly={{ y: 8, duration: 200, delay: 0, opacity: 1 }} style="height: 100%;">
							<slot />
						</div>
					{/key}
				</div>
			</main>
		</div>

		<MobileBottomNav />
		<GlobalOverlays />
		<DynamicIsland />
		<PipFloatingIsland />
		<AIOmentor />
		<FormulaVault bind:open={$formulaVaultOpen} />
		<TestDaySheetModal bind:open={$testDaySheetOpen} />
		<PwaBanner />

		<CommandPalette />
		<FeynmanDuckModal />
		<HotkeyCheatsheetModal bind:open={hotkeyModalOpen} />
		{#if showOnboarding}
			<Onboarding />
		{/if}
	</div>
{:else}
	<div class="auth-loading" aria-live="polite">Checking your session…</div>
{/if}

<style>
	.app-shell { position: relative; z-index: 1; min-height: 100vh; padding-left: 300px; background: transparent; transition: padding-left .24s ease; }
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
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 80px;
		padding: 1.25rem clamp(1.5rem, 4vw, 4rem);
		border-bottom: 1px solid transparent !important;
		background: transparent !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
		box-shadow: none !important;
		position: sticky;
		top: 0;
		z-index: 30;
	}
	.page-heading, .topbar-actions { display: flex; align-items: center; }
	.page-heading { gap: .85rem; }
	.breadcrumb { margin: 0 0 .2rem; color: rgba(255, 255, 255, 0.78); font-size: .72rem; font-weight: 650; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35); }
	.breadcrumb span { margin: 0 .26rem; color: rgba(255, 255, 255, 0.35); }
	h2 { margin: 0; font-size: 1.15rem; line-height: 1.1; letter-spacing: -.035em; font-weight: 800; color: #ffffff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35); }
	.topbar-center {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		min-width: 0;
		padding: 0 1rem;
		position: relative;
	}
	.topbar-actions { display: flex; align-items: center; gap: .65rem; }
	.save-state {
		display: inline-flex;
		align-items: center;
		gap: .42rem;
		height: 36px;
		padding: 0 .85rem;
		border-radius: 999px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, rgba(20, 16, 38, 0.65)), color-mix(in srgb, var(--accent) 18%, rgba(12, 10, 24, 0.78)));
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1.5px solid color-mix(in srgb, var(--accent) 65%, rgba(255, 255, 255, 0.35));
		color: #ffffff;
		font-size: .74rem;
		font-weight: 700;
		box-shadow: 0 4px 18px -2px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 14px -2px color-mix(in srgb, var(--accent) 30%, transparent), inset 0 1px 1px color-mix(in srgb, var(--accent) 45%, rgba(255, 255, 255, 0.5));
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	}
	.save-state i { display: block; width: 7px; height: 7px; border-radius: 99px; background: var(--success); box-shadow: 0 0 6px var(--success); }
	.save-state.error i { background: var(--danger); box-shadow: 0 0 6px var(--danger); }

	.topbar-actions :global(.streak-button),
	.topbar-actions :global(.tri-rings-btn),
	.topbar-actions :global(.signin),
	.topbar-actions :global(.avatar-btn) {
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, rgba(20, 16, 38, 0.65)), color-mix(in srgb, var(--accent) 18%, rgba(12, 10, 24, 0.78))) !important;
		backdrop-filter: blur(16px) !important;
		-webkit-backdrop-filter: blur(16px) !important;
		border: 1.5px solid color-mix(in srgb, var(--accent) 65%, rgba(255, 255, 255, 0.35)) !important;
		color: #ffffff !important;
		box-shadow: 0 4px 18px -2px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 14px -2px color-mix(in srgb, var(--accent) 30%, transparent), inset 0 1px 1px color-mix(in srgb, var(--accent) 45%, rgba(255, 255, 255, 0.5)) !important;
		transition: all 0.2s var(--ease-ios-spring) !important;
	}
	.topbar-actions :global(.streak-button:hover),
	.topbar-actions :global(.tri-rings-btn:hover),
	.topbar-actions :global(.signin:hover),
	.topbar-actions :global(.avatar-btn:hover) {
		border-color: var(--accent) !important;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 40%, rgba(25, 20, 48, 0.70)), color-mix(in srgb, var(--accent) 28%, rgba(15, 12, 28, 0.82))) !important;
		box-shadow: 0 6px 24px -2px color-mix(in srgb, var(--accent) 65%, transparent), 0 0 20px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 1px 1px color-mix(in srgb, var(--accent) 60%, rgba(255, 255, 255, 0.7)) !important;
		transform: translateY(-1px) scale(1.02) !important;
	}
	.topbar-actions :global(.streak-button .flame) {
		color: var(--accent) !important;
		filter: drop-shadow(0 0 7px color-mix(in srgb, var(--accent) 80%, transparent)) !important;
	}
	.topbar-actions :global(.streak-button .count),
	.topbar-actions :global(.tri-rings-btn .count-pill) {
		color: #ffffff !important;
		text-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent), 0 1px 2px rgba(0, 0, 0, 0.6) !important;
		font-weight: 850 !important;
	}
	.topbar-actions :global(.tri-rings-btn .count-pill.complete) {
		color: var(--success, #2af598) !important;
		text-shadow: 0 0 10px rgba(42, 245, 152, 0.6), 0 1px 2px rgba(0, 0, 0, 0.6) !important;
	}
	.topbar-actions :global(.signin) {
		color: #ffffff !important;
	}

	.quick-add {
		display: inline-flex;
		align-items: center;
		gap: .42rem;
		height: 36px;
		padding: 0 1rem;
		border-radius: 12px;
		color: var(--accent-contrast, #ffffff);
		background: var(--accent);
		border: 1px solid rgba(255, 255, 255, 0.25);
		box-shadow: 0 4px 16px color-mix(in srgb, var(--accent), transparent 30%), 0 2px 6px rgba(0, 0, 0, 0.3);
		font-size: .78rem;
		font-weight: 750;
		text-decoration: none;
		transition: all 0.2s var(--ease-ios-spring);
		-webkit-tap-highlight-color: transparent;
	}
	.quick-add:hover {
		transform: translateY(-1px);
		filter: brightness(1.1);
		box-shadow: 0 6px 20px color-mix(in srgb, var(--accent), transparent 20%), 0 3px 8px rgba(0, 0, 0, 0.4);
	}
	.quick-add:active { transform: scale(0.96); }

	main { width: min(100%, 1560px); margin: 0 auto; padding: clamp(1.5rem, 3.5vw, 3.5rem) clamp(1.5rem, 4vw, 4rem) 4rem; }
	.mobile-menu {
		display: none;
		width: 38px;
		height: 38px;
		place-items: center;
		border: 1.5px solid color-mix(in srgb, var(--accent) 65%, rgba(255, 255, 255, 0.35));
		border-radius: 12px;
		color: var(--accent-contrast, #ffffff);
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, rgba(20, 16, 38, 0.65)), color-mix(in srgb, var(--accent) 18%, rgba(12, 10, 24, 0.78)));
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: 0 4px 18px -2px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 14px -2px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.scrim { display: none; }
	.auth-loading { display: grid; min-height: 100vh; place-items: center; background: var(--surface-canvas); color: var(--text-secondary); font-size: .9rem; font-weight: 650; }
	
	@media (max-width: 768px) {
		.app-shell, .app-shell.sidebar-collapsed { padding-left: 0; }
		.topbar-center { display: contents; }
		.topbar {
			min-height: calc(max(env(safe-area-inset-top), 14px) + 56px);
			padding: max(env(safe-area-inset-top), 14px) 1.15rem 0.8rem;
			background: transparent !important;
			backdrop-filter: none !important;
			-webkit-backdrop-filter: none !important;
			position: sticky;
			top: 0;
			z-index: 15;
			border-bottom: 1px solid transparent !important;
			box-shadow: none !important;
		}
		.breadcrumb { display: none; }
		.page-heading { gap: 0.6rem; min-width: 0; flex: 1; }
		.page-heading h2 { font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
		.topbar-actions { gap: 0.35rem; flex-shrink: 0; }
		.mobile-menu {
			display: grid;
			width: 38px;
			height: 38px;
			border-radius: 50%;
			border: 1.5px solid color-mix(in srgb, var(--accent) 65%, rgba(255, 255, 255, 0.35));
			background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, rgba(20, 16, 38, 0.65)), color-mix(in srgb, var(--accent) 18%, rgba(12, 10, 24, 0.78)));
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			color: var(--accent-contrast, #ffffff);
			box-shadow: 0 4px 18px -2px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 14px -2px color-mix(in srgb, var(--accent) 30%, transparent);
		}
		.mobile-menu:active {
			transform: scale(0.92);
		}
		.save-state { display: none; }
		.quick-add span { display: none; }
		.quick-add {
			width: 36px;
			height: 36px;
			border-radius: 50%;
			justify-content: center;
			padding: 0;
			box-shadow: 0 4px 14px color-mix(in srgb, var(--accent), transparent 60%);
		}
		.quick-add:active {
			transform: scale(0.92);
		}
		main { padding: 1rem .85rem calc(max(env(safe-area-inset-bottom), 18px) + 84px); }
		.scrim {
			display: block;
			position: fixed;
			z-index: 19;
			inset: 0;
			border: 0;
			background: rgba(0, 0, 0, 0.60);
			backdrop-filter: blur(28px) saturate(190%);
			-webkit-backdrop-filter: blur(28px) saturate(190%);
			pointer-events: auto;
			cursor: pointer;
		}
	}

	:global(:root[data-theme='light']) .breadcrumb,
	:global(:root[data-theme='notion']) .breadcrumb,
	:global(:root[data-theme='duolingo']) .breadcrumb,
	:global(:root[data-theme='anki']) .breadcrumb,
	:global(:root[data-theme='master']) .breadcrumb,
	:global(:root[data-wallpaper-luminance='bright']) .breadcrumb {
		color: var(--text-secondary) !important;
		text-shadow: none !important;
	}
	:global(:root[data-theme='light']) h2,
	:global(:root[data-theme='notion']) h2,
	:global(:root[data-theme='duolingo']) h2,
	:global(:root[data-theme='anki']) h2,
	:global(:root[data-theme='master']) h2,
	:global(:root[data-wallpaper-luminance='bright']) h2 {
		color: var(--text-primary) !important;
		text-shadow: none !important;
	}
	:global(:root[data-theme='light']) .save-state,
	:global(:root[data-theme='light']) .mobile-menu,
	:global(:root[data-theme='light']) .topbar-actions :global(.streak-button),
	:global(:root[data-theme='light']) .topbar-actions :global(.tri-rings-btn),
	:global(:root[data-theme='light']) .topbar-actions :global(.signin),
	:global(:root[data-theme='light']) .topbar-actions :global(.avatar-btn),
	:global(:root[data-theme='notion']) .save-state,
	:global(:root[data-theme='notion']) .mobile-menu,
	:global(:root[data-theme='notion']) .topbar-actions :global(.streak-button),
	:global(:root[data-theme='notion']) .topbar-actions :global(.tri-rings-btn),
	:global(:root[data-theme='notion']) .topbar-actions :global(.signin),
	:global(:root[data-theme='notion']) .topbar-actions :global(.avatar-btn),
	:global(:root[data-theme='duolingo']) .save-state,
	:global(:root[data-theme='duolingo']) .mobile-menu,
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.streak-button),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.tri-rings-btn),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.signin),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.avatar-btn),
	:global(:root[data-theme='anki']) .save-state,
	:global(:root[data-theme='anki']) .mobile-menu,
	:global(:root[data-theme='anki']) .topbar-actions :global(.streak-button),
	:global(:root[data-theme='anki']) .topbar-actions :global(.tri-rings-btn),
	:global(:root[data-theme='anki']) .topbar-actions :global(.signin),
	:global(:root[data-theme='anki']) .topbar-actions :global(.avatar-btn),
	:global(:root[data-theme='master']) .save-state,
	:global(:root[data-theme='master']) .mobile-menu,
	:global(:root[data-theme='master']) .topbar-actions :global(.streak-button),
	:global(:root[data-theme='master']) .topbar-actions :global(.tri-rings-btn),
	:global(:root[data-theme='master']) .topbar-actions :global(.signin),
	:global(:root[data-theme='master']) .topbar-actions :global(.avatar-btn),
	:global(:root[data-wallpaper-luminance='bright']) .save-state,
	:global(:root[data-wallpaper-luminance='bright']) .mobile-menu,
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.streak-button),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.tri-rings-btn),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.signin),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.avatar-btn) {
		background: color-mix(in srgb, var(--accent) 22%, rgba(255, 255, 255, 0.90)) !important;
		border: 1.5px solid color-mix(in srgb, var(--accent) 55%, rgba(0, 0, 0, 0.14)) !important;
		color: var(--text-primary) !important;
		box-shadow: 0 3px 14px color-mix(in srgb, var(--accent) 28%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
		text-shadow: none !important;
	}
	:global(:root[data-theme='light']) .topbar-actions :global(.streak-button:hover),
	:global(:root[data-theme='light']) .topbar-actions :global(.tri-rings-btn:hover),
	:global(:root[data-theme='light']) .topbar-actions :global(.signin:hover),
	:global(:root[data-theme='light']) .topbar-actions :global(.avatar-btn:hover),
	:global(:root[data-theme='notion']) .topbar-actions :global(.streak-button:hover),
	:global(:root[data-theme='notion']) .topbar-actions :global(.tri-rings-btn:hover),
	:global(:root[data-theme='notion']) .topbar-actions :global(.signin:hover),
	:global(:root[data-theme='notion']) .topbar-actions :global(.avatar-btn:hover),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.streak-button:hover),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.tri-rings-btn:hover),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.signin:hover),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.avatar-btn:hover),
	:global(:root[data-theme='anki']) .topbar-actions :global(.streak-button:hover),
	:global(:root[data-theme='anki']) .topbar-actions :global(.tri-rings-btn:hover),
	:global(:root[data-theme='anki']) .topbar-actions :global(.signin:hover),
	:global(:root[data-theme='anki']) .topbar-actions :global(.avatar-btn:hover),
	:global(:root[data-theme='master']) .topbar-actions :global(.streak-button:hover),
	:global(:root[data-theme='master']) .topbar-actions :global(.tri-rings-btn:hover),
	:global(:root[data-theme='master']) .topbar-actions :global(.signin:hover),
	:global(:root[data-theme='master']) .topbar-actions :global(.avatar-btn:hover),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.streak-button:hover),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.tri-rings-btn:hover),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.signin:hover),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.avatar-btn:hover) {
		border-color: var(--accent) !important;
		background: color-mix(in srgb, var(--accent) 32%, rgba(255, 255, 255, 0.96)) !important;
		box-shadow: 0 4px 18px -2px color-mix(in srgb, var(--accent) 45%, transparent) !important;
	}
	:global(:root[data-theme='light']) .topbar-actions :global(.streak-button .count),
	:global(:root[data-theme='light']) .topbar-actions :global(.tri-rings-btn .count-pill),
	:global(:root[data-theme='notion']) .topbar-actions :global(.streak-button .count),
	:global(:root[data-theme='notion']) .topbar-actions :global(.tri-rings-btn .count-pill),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.streak-button .count),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.tri-rings-btn .count-pill),
	:global(:root[data-theme='anki']) .topbar-actions :global(.streak-button .count),
	:global(:root[data-theme='anki']) .topbar-actions :global(.tri-rings-btn .count-pill),
	:global(:root[data-theme='master']) .topbar-actions :global(.streak-button .count),
	:global(:root[data-theme='master']) .topbar-actions :global(.tri-rings-btn .count-pill),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.streak-button .count),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.tri-rings-btn .count-pill) {
		color: var(--accent) !important;
		font-weight: 850 !important;
	}
	:global(:root[data-theme='light']) .topbar-actions :global(.tri-rings-btn .count-pill.complete),
	:global(:root[data-theme='notion']) .topbar-actions :global(.tri-rings-btn .count-pill.complete),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.tri-rings-btn .count-pill.complete),
	:global(:root[data-theme='anki']) .topbar-actions :global(.tri-rings-btn .count-pill.complete),
	:global(:root[data-theme='master']) .topbar-actions :global(.tri-rings-btn .count-pill.complete),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.tri-rings-btn .count-pill.complete) {
		color: var(--success, #2af598) !important;
	}
	:global(:root[data-theme='light']) .topbar-actions :global(.streak-button .flame),
	:global(:root[data-theme='notion']) .topbar-actions :global(.streak-button .flame),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.streak-button .flame),
	:global(:root[data-theme='anki']) .topbar-actions :global(.streak-button .flame),
	:global(:root[data-theme='master']) .topbar-actions :global(.streak-button .flame),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.streak-button .flame) {
		color: var(--accent) !important;
	}
	:global(:root[data-theme='light']) .topbar-actions :global(.signin),
	:global(:root[data-theme='notion']) .topbar-actions :global(.signin),
	:global(:root[data-theme='duolingo']) .topbar-actions :global(.signin),
	:global(:root[data-theme='anki']) .topbar-actions :global(.signin),
	:global(:root[data-theme='master']) .topbar-actions :global(.signin),
	:global(:root[data-wallpaper-luminance='bright']) .topbar-actions :global(.signin) {
		color: var(--text-primary) !important;
	}

.live-wallpaper-bg { position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: 0; pointer-events: none; opacity: 0.95; -webkit-transform: translateZ(0); transform: translateZ(0); }
:global(:root[data-theme*="-dark"]) .live-wallpaper-bg { opacity: 0.65; }

.wallpaper-adaptive-scrim {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	z-index: 0;
	pointer-events: none;
	background: var(--wallpaper-adaptive-scrim, rgba(0, 0, 0, 0.22));
	transition: background 0.4s ease;
}
</style>

