<script lang="ts">
	import '../app.css';
	import { browser, dev } from '$app/environment';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/stores';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	
	injectAnalytics({
		mode: dev ? 'development' : 'production',
		// The /welcome hero embeds the app with ?preview=1; keep those from counting as visits.
		beforeSend: (event) => (new URL(event.url).searchParams.get('preview') === '1' ? null : event)
	});

	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import MobileBottomNav from '$lib/components/MobileBottomNav.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import GlobalOverlays from '$lib/components/GlobalOverlays.svelte';
	import AIOmentor from '$lib/components/ui/AIOmentor.svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
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
	import { THEME_PRESETS, isDarkTheme, wallpaperCss, resolveLiveWallpaper, resolveEcoMode, isMobileDevice, isBuiltinWallpaper, EXTRA_WALLPAPERS, getActiveWallpaper, isVideoWallpaper } from '$lib/state/themes';
	import { authReady, authConfigured, currentUser, hasSkippedLogin, sessionResolved, syncStatus } from '$lib/stores/auth';
	import { saveStatus, tracker, formulaVaultOpen, testDaySheetOpen, targetsModalOpen, autoCheckStreakFreeze, feynmanDuckOpen, wrappedStoryOpen, commandPaletteOpen } from '$lib/stores/tracker';
	import BTrackerWrappedModal from '$lib/components/stats/BTrackerWrappedModal.svelte';
	import { loadout } from '$lib/stores/cosmetics';
	import { sidebarDragWidth } from '$lib/stores/sidebar';
	import { globalTimer } from '$lib/stores/timerState';
	import HotkeyCheatsheetModal from '$lib/components/ui/HotkeyCheatsheetModal.svelte';
	import { sampleVideoFrame, analyzeWallpaperLuminance, clearWallpaperContrast, activeWallpaperColors } from '$lib/utils/wallpaperContrast';

	let mobileOpen = false;
	let hotkeyModalOpen = false;
	let aiMentorReady = false;

	// Sidebar state lives in tracker.ui so it persists across reloads and syncs across devices.
	$: collapsed = $tracker.ui?.sidebarCollapsed ?? false;
	$: sidebarWidth = collapsed ? 76 : ($sidebarDragWidth ?? $tracker.ui?.sidebarWidth ?? null);

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
	let lastSpecularCard: HTMLElement | null = null;
	function handleGlobalPointerMove(e: PointerEvent) {
		if (e.pointerType === 'touch' || isMobile) return;
		if (pointerRaf) return;
		pointerRaf = requestAnimationFrame(() => {
			pointerRaf = null;

			const el = e.target as HTMLElement | null;
			// Popups, modals, dialogs, drawers, and menus NEVER tilt or capture specular
			if (!el || el.closest('.modal-card, .modal-backdrop, [role="dialog"], .menu, .drawer, .goals-drawer, .no-tilt, header, nav, .bottom-nav')) {
				if (lastTiltedEl) {
					lastTiltedEl.style.removeProperty('--tilt-x');
					lastTiltedEl.style.removeProperty('--tilt-y');
					lastTiltedEl.style.removeProperty('--card-lift');
					lastTiltedEl = null;
				}
				if (lastSpecularCard) {
					lastSpecularCard.style.removeProperty('--mouse-x');
					lastSpecularCard.style.removeProperty('--mouse-y');
					lastSpecularCard = null;
				}
				return;
			}

			// Specular cursor beam tracking across cards (Pillar 2)
			const card = el.closest?.('.widget, .bento-card, .specular-card, .card, .r-card, .test-card, .dump-card') as HTMLElement | null;
			if (lastSpecularCard && lastSpecularCard !== card) {
				lastSpecularCard.style.removeProperty('--mouse-x');
				lastSpecularCard.style.removeProperty('--mouse-y');
			}
			lastSpecularCard = card;

			if (card) {
				const rect = card.getBoundingClientRect();
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;
				card.style.setProperty('--mouse-x', `${mouseX.toFixed(1)}px`);
				card.style.setProperty('--mouse-y', `${mouseY.toFixed(1)}px`);

				// Subtle 3D tilt exclusively on desktop dashboard widgets on '/'
				if ($page.url.pathname === '/' && card.matches('.widget, .bento-card') && !card.closest('.no-tilt, [role="dialog"]')) {
					if (lastTiltedEl && lastTiltedEl !== card) {
						lastTiltedEl.style.removeProperty('--tilt-x');
						lastTiltedEl.style.removeProperty('--tilt-y');
						lastTiltedEl.style.removeProperty('--card-lift');
					}
					lastTiltedEl = card;

					const centerX = rect.width / 2;
					const centerY = rect.height / 2;
					const deltaX = Math.max(-1, Math.min(1, (mouseX - centerX) / (centerX || 1)));
					const deltaY = Math.max(-1, Math.min(1, (mouseY - centerY) / (centerY || 1)));
					const maxTilt = 1.8;
					const tiltX = -deltaY * maxTilt;
					const tiltY = deltaX * maxTilt;
					card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
					card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
					card.style.setProperty('--card-lift', '-2px');
				} else if (lastTiltedEl) {
					lastTiltedEl.style.removeProperty('--tilt-x');
					lastTiltedEl.style.removeProperty('--tilt-y');
					lastTiltedEl.style.removeProperty('--card-lift');
					lastTiltedEl = null;
				}
			} else if (lastTiltedEl) {
				lastTiltedEl.style.removeProperty('--tilt-x');
				lastTiltedEl.style.removeProperty('--tilt-y');
				lastTiltedEl.style.removeProperty('--card-lift');
				lastTiltedEl = null;
			}
		});
	}

	function handleGlobalPointerOut(e: PointerEvent) {
		if (!e.relatedTarget) {
			if (lastTiltedEl) {
				lastTiltedEl.style.removeProperty('--tilt-x');
				lastTiltedEl.style.removeProperty('--tilt-y');
				lastTiltedEl.style.removeProperty('--card-lift');
				lastTiltedEl = null;
			}
			if (lastSpecularCard) {
				lastSpecularCard.style.removeProperty('--mouse-x');
				lastSpecularCard.style.removeProperty('--mouse-y');
				lastSpecularCard = null;
			}
		}
	}

	function handleGlobalPointerDown(e: Event) {
		if (!mobileOpen) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest('aside') || target?.closest('.mobile-menu')) return;
		mobileOpen = false;
	}

	let isPageScrolled = false;
	function handleWindowScroll() {
		if (typeof window !== 'undefined') {
			const scrolled = window.scrollY > 14;
			if (isPageScrolled !== scrolled) {
				isPageScrolled = scrolled;
			}
		}
	}

	beforeNavigate(() => {
		if (mobileOpen) {
			mobileOpen = false;
		}
	});

	afterNavigate(({ to }) => {
		if (isPreview && to?.url && window.parent !== window) {
			window.parent.postMessage({ type: 'btracker-preview-navigated', path: to.url.pathname }, window.location.origin);
		}
	});

	const titles: Record<string, string> = {
		'/': 'Home', '/log': 'Question Log', '/review': 'Review', '/plan': 'Plan', '/focus': 'Focus', '/todo': 'To Do', '/revise': 'Revise',
		'/dump': 'Study Dump', '/tests': 'Tests', '/stats': 'Stats', '/reminders': 'Reminders', '/settings': 'Settings'
	};
	$: isPreview = $page.url.searchParams.get('preview') === '1';
	$: isAuthRoute = $page.url.pathname === '/login' || $page.url.pathname.startsWith('/auth/');
	$: isPublicLanding = !isPreview && $page.url.pathname === '/' && $authConfigured && !$currentUser && !$hasSkippedLogin;
	$: isMarketingLanding =
		$page.url.pathname === '/landing' ||
		$page.url.pathname === '/welcome' ||
		$page.url.pathname === '/download' ||
		$page.url.pathname === '/guides' ||
		$page.url.pathname.startsWith('/guides/') ||
		$page.url.pathname === '/goals' ||
		$page.url.pathname.startsWith('/goals/') ||
		$page.url.pathname === '/playbooks' ||
		$page.url.pathname.startsWith('/playbooks/') ||
		$page.url.pathname === '/stages' ||
		$page.url.pathname === '/system' ||
		$page.url.pathname === '/faq';
	$: currentTitle = $page.url.pathname === '/log' && $tracker.coaching_type === 'GENERIC'
		? 'Study Log'
		: titles[$page.url.pathname] ?? 'BTracker';
	$: saveLabel = $saveStatus === 'saving' ? 'Saving' : $saveStatus === 'error' ? 'Save failed' : 'Saved';
	$: if (browser && $authReady && $sessionResolved) {
		const hasAuth = $authConfigured;
		if (hasAuth) {
			if (isAuthRoute && $currentUser) void goto('/', { replaceState: true });
			else if (!isAuthRoute && !isPublicLanding && !isMarketingLanding && !isPreview && !$currentUser && !$hasSkippedLogin) void goto('/login', { replaceState: true });
		} else {
			// No auth configured, allow access to all routes
			if (isAuthRoute) void goto('/', { replaceState: true });
		}
	}

	function applyTheme(state: { theme: string; ui: { accent: string, wallpaper?: string | null } }) {
		const root = document.documentElement;
		root.setAttribute('data-theme', state.theme);
		try { localStorage.setItem('btracker_theme', state.theme); } catch {}
		root.style.setProperty('--accent', state.ui.accent);
		root.style.setProperty('--accent-strong', `color-mix(in srgb, ${state.ui.accent}, black 14%)`);
		root.style.setProperty('--accent-soft', `color-mix(in srgb, ${state.ui.accent}, transparent ${isDarkTheme(state.theme) ? '82%' : '88%'})`);
		function getAccentContrast(accent: string, theme: string): string {
			const isBrightTheme = theme === 'god-mode' || theme === 'catalyst' || theme === 'initiate' || theme === 'aurora' || theme === 'celestial';
			if (isBrightTheme) return '#070602';
			if (accent && accent.startsWith('#') && (accent.length === 7 || accent.length === 4)) {
				let r = 0, g = 0, b = 0;
				if (accent.length === 7) {
					r = parseInt(accent.slice(1, 3), 16);
					g = parseInt(accent.slice(3, 5), 16);
					b = parseInt(accent.slice(5, 7), 16);
				} else {
					r = parseInt(accent[1] + accent[1], 16);
					g = parseInt(accent[2] + accent[2], 16);
					b = parseInt(accent[3] + accent[3], 16);
				}
				const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
				if (lum > 0.45) return '#070602';
			}
			return '#ffffff';
		}

		root.style.setProperty('--accent-contrast', getAccentContrast(state.ui.accent, state.theme));
		
		if (isDarkTheme(state.theme)) {
			root.style.setProperty('--surface-popup', state.theme === 'catalyst' || state.theme === 'green' ? 'rgba(21, 33, 26, 0.96)' : 'rgba(18, 16, 32, 0.96)');
			root.style.setProperty('--surface-popup-solid', state.theme === 'catalyst' || state.theme === 'green' ? '#15211a' : '#121020');
			root.style.setProperty('--surface-popup-border', 'color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16))');
		} else {
			root.style.setProperty('--surface-popup', 'rgba(255, 255, 255, 0.96)');
			root.style.setProperty('--surface-popup-solid', '#ffffff');
			root.style.setProperty('--surface-popup-border', 'color-mix(in srgb, var(--border-subtle) 80%, rgba(0, 0, 0, 0.08))');
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

		const effectiveWallpaper = isFirstTimeOrUnauth ? null : getActiveWallpaper(state.theme, state.ui.wallpaper);
		
		if (effectiveWallpaper) {
			root.setAttribute('data-wallpaper', 'true');
			if (isVideoWallpaper(effectiveWallpaper)) {
				root.setAttribute('data-live-wallpaper', 'true');
			}
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
					obsidian: '#141320', quizlet: '#0c1128', green: '#061210', red: '#120408'
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

	$: isFirstTimeOrUnauth = isAuthRoute || isMarketingLanding || isPreview;
	$: effectiveTheme = isPreview ? 'light' : (isFirstTimeOrUnauth ? 'light' : ($tracker.theme || 'dark'));
	$: if (browser) {
		applyTheme({
			theme: effectiveTheme,
			ui: isPreview ? { ...$tracker.ui, accent: '#6d5dfc', wallpaper: null } : $tracker.ui
		});
		if (isPreview) {
			document.documentElement.setAttribute('data-fx', 'none');
		}
	}

	let isMobile = false;

	// /?preview=1 renders the real app inside the marketing preview iframe. Only the
	// whitelisted page links navigate; nothing else is focusable or saved.
	const PREVIEW_ROUTES = new Set(['/', '/log', '/review', '/plan', '/tests', '/dump', '/todo', '/focus', '/revise', '/stats', '/reminders', '/settings']);
	function handlePreviewMessage(event: MessageEvent) {
		if (!isPreview || event.origin !== window.location.origin || event.source !== window.parent) return;
		const data = event.data as { type?: string; path?: string } | null;
		if (!data || data.type !== 'btracker-preview-nav') return;
		if (typeof data.path !== 'string' || !PREVIEW_ROUTES.has(data.path)) return;
		if (data.path === $page.url.pathname) return;
		void goto(`${data.path}?preview=1`, { replaceState: true }).then(() => {
			window.parent.postMessage({ type: 'btracker-preview-navigated', path: data.path }, window.location.origin);
		});
	}

	onMount(() => {
		if (isPreview) {
			document.documentElement.classList.add('btracker-preview');
			document.documentElement.setAttribute('data-fx', 'none');
			document.documentElement.removeAttribute('data-wallpaper');
			sessionResolved.set(true);
			void hydrateTracker();
			window.addEventListener('message', handlePreviewMessage);
			void tick().then(() => {
				if (window.parent !== window) {
					window.parent.postMessage({ type: 'btracker-preview-ready', path: $page.url.pathname }, window.location.origin);
				}
			});
		} else {
			void hydrateTracker().then(() => {
				startSync();
				autoCheckStreakFreeze();
			});
		}
		isMobile = isMobileDevice();
		const onResize = () => { isMobile = isMobileDevice(); };
		window.addEventListener('resize', onResize, { passive: true });
		const stopFx = loadout.subscribe((l) => document.documentElement.setAttribute('data-fx', isPreview ? 'none' : l.fx));
		if (!isPreview) {
			if ('requestIdleCallback' in window) {
				(window as any).requestIdleCallback(() => { aiMentorReady = true; }, { timeout: 1200 });
			} else {
				setTimeout(() => { aiMentorReady = true; }, 350);
			}
		}
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
			window.removeEventListener('message', handlePreviewMessage);
			document.documentElement.classList.remove('btracker-preview');
			if (pointerRaf) cancelAnimationFrame(pointerRaf);
			stopFx();
		};
	});
	$: currentThemePreset = THEME_PRESETS.find(t => t.id === effectiveTheme);
	$: currentWallpaperStr = isFirstTimeOrUnauth ? null : getActiveWallpaper(effectiveTheme, $tracker.ui.wallpaper);
	$: isVideoWp = Boolean(currentWallpaperStr && isVideoWallpaper(currentWallpaperStr));
	$: activeVideoUrl = (isVideoWp && $tracker.ui.ecoMode !== true) ? encodeURI(currentWallpaperStr!) : null;

	$: if (typeof document !== 'undefined') {
		if (activeVideoUrl) {
			document.documentElement.setAttribute('data-live-wallpaper', 'true');
			document.documentElement.setAttribute('data-wallpaper', 'true');
		} else if (currentWallpaperStr) {
			document.documentElement.removeAttribute('data-live-wallpaper');
			document.documentElement.setAttribute('data-wallpaper', 'true');
		} else {
			document.documentElement.removeAttribute('data-live-wallpaper');
			document.documentElement.removeAttribute('data-wallpaper');
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

	$: showOnboarding = !isPreview && (((!isAuthRoute && $authReady && $syncStatus !== 'pulling' && !!$currentUser && !$tracker.onboarded)) || $targetsModalOpen);

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
	{#if isMarketingLanding}
		<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
		<link rel="preload" href="/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
	{/if}
	{#if activeVideoUrl}
		<link rel="preload" as="video" href={activeVideoUrl} type="video/mp4" fetchpriority="high" />
	{/if}
</svelte:head>

<svelte:window
	on:scroll={handleWindowScroll}
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

{#if isAuthRoute || isPublicLanding || isMarketingLanding}
	<slot />
{:else}
	{#if activeVideoUrl}
		{#key activeVideoUrl}
			<video
				bind:this={bgVideo}
				src={activeVideoUrl}
				autoplay
				loop
				muted
				playsinline
				preload="auto"
				class="live-wallpaper-bg"
				on:loadedmetadata={(e) => {
					e.currentTarget.muted = true;
					e.currentTarget.defaultMuted = true;
					e.currentTarget.play().catch(() => {});
				}}
				on:loadeddata={(e) => {
					e.currentTarget.muted = true;
					e.currentTarget.defaultMuted = true;
					e.currentTarget.play().catch(() => {});
					sampleVideoFrame(e.currentTarget);
				}}
				on:canplay={(e) => {
					e.currentTarget.muted = true;
					e.currentTarget.play().catch(() => {});
				}}
				on:ended={(e) => {
					e.currentTarget.currentTime = 0;
					e.currentTarget.play().catch(() => {});
				}}
				on:error={(e) => {
					console.warn('[LiveWallpaper] Video decode/load error:', e);
				}}
			>
				<source src={activeVideoUrl} type="video/mp4" />
			</video>
		{/key}
	{/if}
	{#if activeVideoUrl || currentWallpaperStr}
		<div class="wallpaper-adaptive-scrim" aria-hidden="true"></div>
	{/if}
	{@const themeIsCustom = THEME_PRESETS.find(t => t.id === effectiveTheme)?.unlock != null}
	<div
		class:sidebar-collapsed={collapsed}
		class:sidebar-resizing={$sidebarDragWidth !== null}
		class:aurora-on={$loadout.aurora || themeIsCustom}
		style:--sidebar-w={sidebarWidth ? `${sidebarWidth}px` : undefined}
		class="app-shell"
	>
		{#if ($loadout.aurora || themeIsCustom) && !activeVideoUrl}<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>{/if}
		{#if mobileOpen}<div class="scrim" role="button" tabindex="-1" on:click={() => (mobileOpen = false)} on:keydown={(e) => e.key === 'Escape' && (mobileOpen = false)} aria-label="Close navigation"></div>{/if}
		<AppSidebar {collapsed} bind:mobileOpen />
		<div class="app-main">
			<header class="topbar" class:scrolled={isPageScrolled}>
				<div class="page-heading">
					<button class="mobile-menu" type="button" aria-label="Open navigation" on:click={() => mobileOpen = true}><NavIcon name="menu" size={21} /></button>
					<div><p class="breadcrumb">BTracker <span>/</span> {currentTitle}</p><h2>{currentTitle}</h2></div>
				</div>
				<div class="topbar-center">
					<button
						type="button"
						class="topbar-search-pill"
						on:click={() => commandPaletteOpen.set(true)}
						aria-label="Open command palette"
					>
						<NavIcon name="search" size={14} />
						<span class="search-hint">Search syllabus, log, or run a command...</span>
						<kbd>⌘K</kbd>
					</button>
				</div>
				<div class="topbar-actions">
					<div class="telemetry-capsule">
						<span class:error={$saveStatus === 'error'} class="save-state"><i></i>{saveLabel}</span>
						<span class="capsule-sep" aria-hidden="true"></span>
						<StreakButton />
						<span class="capsule-sep" aria-hidden="true"></span>
						<TriRingsButton />
					</div>
					<a class="quick-add" href="/log"><NavIcon name="plus" size={16} /><span>+ Log</span></a>
					<AccountMenu />
				</div>
			</header>
			<main on:touchstart={handleTouchStart} on:touchend={handleTouchEnd}>
				{#key $page.url.pathname}
					<div in:fly={{ y: 8, duration: 200, delay: 0, opacity: 1 }} style="height: 100%;">
						<slot />
					</div>
				{/key}
			</main>
		</div>

		<MobileBottomNav />
		{#if !isPreview}
			<GlobalOverlays />
		{/if}
		<DynamicIsland />
		<PipFloatingIsland />
		{#if !isPreview && aiMentorReady}
			<AIOmentor />
		{/if}
		{#if $formulaVaultOpen}
			<FormulaVault bind:open={$formulaVaultOpen} />
		{/if}
		{#if $testDaySheetOpen}
			<TestDaySheetModal bind:open={$testDaySheetOpen} />
		{/if}
		{#if !isPreview}
			<PwaBanner />
		{/if}

		<CommandPalette />
		{#if $feynmanDuckOpen}
			<FeynmanDuckModal />
		{/if}
		{#if hotkeyModalOpen}
			<HotkeyCheatsheetModal bind:open={hotkeyModalOpen} />
		{/if}
		{#if showOnboarding}
			<Onboarding />
		{/if}
	</div>

	{#if $wrappedStoryOpen}
		<BTrackerWrappedModal bind:open={$wrappedStoryOpen} />
	{/if}
{/if}

<style>
	.app-shell { --sidebar-w: clamp(250px, 22vw, 300px); position: relative; z-index: 1; min-height: 100vh; padding-left: var(--sidebar-w); background: transparent; transition: padding-left .24s ease; }
	.app-shell.sidebar-collapsed { --sidebar-w: 76px; }
	.app-shell.sidebar-resizing { transition: none; }
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
		min-height: 76px;
		padding: 1.15rem clamp(1.5rem, 4vw, 4rem);
		position: sticky;
		top: 0;
		z-index: 30;
		transition: min-height 0.26s var(--ease-ios-spring), padding 0.26s var(--ease-ios-spring), background 0.26s ease, border-color 0.26s ease, box-shadow 0.26s ease;
	}
	.topbar.scrolled {
		min-height: 62px;
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
		background: var(--glass-bg, var(--surface-3));
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border-bottom: 1px solid var(--border-subtle);
		box-shadow: 0 4px 24px -8px rgba(0, 0, 0, 0.18);
	}
	.page-heading, .topbar-actions { display: flex; align-items: center; }
	.page-heading { gap: .85rem; }
	.breadcrumb { margin: 0 0 .2rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.breadcrumb span { margin: 0 .26rem; color: color-mix(in srgb, var(--text-secondary), transparent 45%); }
	h2 { margin: 0; font-size: 1.15rem; line-height: 1.1; letter-spacing: -.035em; font-weight: 800; color: var(--text-primary); }
	
	:global(:root[data-wallpaper='true']:not([data-wallpaper-luminance='bright'])) .topbar:not(.scrolled) .breadcrumb,
	:global(:root[data-live-wallpaper='true']) .topbar:not(.scrolled) .breadcrumb {
		color: rgba(255, 255, 255, 0.85) !important;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55) !important;
	}
	:global(:root[data-wallpaper='true']:not([data-wallpaper-luminance='bright'])) .topbar:not(.scrolled) .breadcrumb span,
	:global(:root[data-live-wallpaper='true']) .topbar:not(.scrolled) .breadcrumb span {
		color: rgba(255, 255, 255, 0.45) !important;
	}
	:global(:root[data-wallpaper='true']:not([data-wallpaper-luminance='bright'])) .topbar:not(.scrolled) h2,
	:global(:root[data-live-wallpaper='true']) .topbar:not(.scrolled) h2 {
		color: #ffffff !important;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55) !important;
	}
	.topbar-center {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		min-width: 0;
		padding: 0 1rem;
		position: relative;
	}
	.topbar-search-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		height: 36px;
		padding: 0 0.95rem;
		border-radius: 999px;
		background: var(--surface-2);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s var(--ease-ios-spring);
		width: clamp(200px, 28vw, 360px);
		box-sizing: border-box;
	}
	.topbar-search-pill:hover {
		border-color: var(--accent);
		color: var(--text-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.topbar-search-pill .search-hint {
		flex: 1;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.76rem;
		color: var(--text-muted);
	}
	.topbar-search-pill kbd {
		display: inline-flex;
		align-items: center;
		padding: 0.12rem 0.4rem;
		border-radius: 6px;
		background: var(--surface-1);
		border: 1px solid var(--border-subtle);
		font-size: 0.68rem;
		font-family: var(--font-mono, monospace);
		color: var(--text-secondary);
		line-height: 1;
		font-weight: 600;
	}
	@media (max-width: 768px) {
		.topbar-center { display: none !important; }
	}
	.topbar-actions { display: flex; align-items: center; gap: .65rem; }

	/* Telemetry Capsule (Pillar 3.1) */
	.telemetry-capsule {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: var(--surface-2);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		padding: 3px 5px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}
	.capsule-sep {
		display: block;
		width: 1px;
		height: 16px;
		background: var(--border-subtle);
		margin: 0 2px;
	}
	.save-state {
		display: inline-flex;
		align-items: center;
		gap: .42rem;
		height: 30px;
		padding: 0 .65rem;
		border-radius: 999px;
		background: transparent;
		color: var(--text-secondary);
		font-size: .74rem;
		font-weight: 600;
		font-family: var(--font-mono, monospace);
		font-variant-numeric: tabular-nums;
		border: none;
	}
	.save-state i { display: block; width: 6px; height: 6px; border-radius: 99px; background: var(--success); box-shadow: 0 0 6px var(--success); }
	.save-state.error i { background: var(--danger); box-shadow: 0 0 6px var(--danger); }

	.telemetry-capsule :global(.streak-button),
	.telemetry-capsule :global(.tri-rings-btn) {
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		height: 30px !important;
		padding: 0 8px !important;
		color: var(--text-primary) !important;
		border-radius: 999px !important;
		transition: background 0.16s ease !important;
	}
	.telemetry-capsule :global(.streak-button:hover),
	.telemetry-capsule :global(.tri-rings-btn:hover) {
		background: color-mix(in srgb, var(--accent) 12%, transparent) !important;
		transform: none !important;
	}
	.telemetry-capsule :global(.streak-button .flame) {
		color: var(--accent) !important;
		filter: none !important;
	}
	.telemetry-capsule :global(.streak-button .count),
	.telemetry-capsule :global(.tri-rings-btn .count-pill) {
		color: var(--text-primary) !important;
		text-shadow: none !important;
		font-weight: 700 !important;
		font-family: var(--font-mono, monospace) !important;
		font-variant-numeric: tabular-nums !important;
	}
	.telemetry-capsule :global(.tri-rings-btn .count-pill.complete) {
		color: var(--success) !important;
		text-shadow: none !important;
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
	
	@media (max-width: 768px) {
		.app-shell { --sidebar-w: 0px !important; padding-left: 0; }
		.app-shell.sidebar-collapsed { padding-left: 0; }
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
		.page-heading > div { min-width: 0; }
		.page-heading h2 { font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: clamp(80px, 22vw, 150px); }
		@media (max-width: 380px) {
			.page-heading h2 { max-width: 85px; }
			.topbar { padding: max(env(safe-area-inset-top), 14px) 0.65rem 0.8rem; }
		}
		@media (max-width: 340px) {
			.page-heading h2 { display: none; }
		}
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
	background: radial-gradient(circle at 50% 28%, transparent 40%, rgba(0, 0, 0, 0.45) 100%), var(--wallpaper-adaptive-scrim, rgba(0, 0, 0, 0.22));
	transition: background 0.4s ease;
}
</style>

