<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import DownloadModal from '$lib/components/DownloadModal.svelte';
	import MacInstallGuideModal from '$lib/components/MacInstallGuideModal.svelte';

	let downloadModalOpen = false;
	let macGuideOpen = false;
	let isWindows = false;

	// Sources for study log
	const sources = ['Coaching module', 'DPP', 'PYQs', 'Reference book', 'Test'];

	// 1. Lenis Smooth Scroll & Pinned Hero Animation State
	let lenis: any = null;
	let heroScrollProgress = 0;
	let heroScale = 1;
	let heroOpacity = 1;

	// 2. Interactive Question Logger Card State
	let solvedCount = 42;
	let dailyTargetPct = 76;
	let isIncrementing = false;
	let lastIncrementTime = 0;
	let floatingParticles: Array<{ id: number; text: string; x: number; y: number }> = [];

	// Progress bar metrics (staggered fill on press)
	let modulePct = 82;
	let dppPct = 90;
	let pyqPct = 74;
	let bookPct = 68;
	let progressFillKey = 0;

	// Circular progress SVG setup (radius: 36, circumference: 2 * Math.PI * 36 = 226.19)
	const CIRCLE_RADIUS = 36;
	const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
	$: circleOffset = CIRCLE_CIRCUMFERENCE * (1 - dailyTargetPct / 100);

	// Audio blip for tactile interaction
	let audioCtx: any = null;
	function playClickSound(freq = 520, duration = 0.05) {
		if (!browser) return;
		try {
			if (!audioCtx) {
				const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
				audioCtx = new AudioClass();
			}
			if (audioCtx.state === 'suspended') audioCtx.resume();
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(freq * 0.4, audioCtx.currentTime + duration);
			gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.start();
			osc.stop(audioCtx.currentTime + duration);
		} catch (e) {
			// Ignore audio policy
		}
	}

	function handleQuestionIncrement(e?: MouseEvent, amount = 1) {
		solvedCount += amount;
		isIncrementing = true;
		lastIncrementTime = Date.now();

		// Advance daily target and staggered progress bars
		dailyTargetPct = Math.min(100, dailyTargetPct + (amount > 1 ? 8 : 3));
		modulePct = Math.min(100, modulePct + (amount > 1 ? 6 : 2));
		dppPct = Math.min(100, dppPct + (amount > 1 ? 5 : 2));
		pyqPct = Math.min(100, pyqPct + (amount > 1 ? 7 : 3));
		bookPct = Math.min(100, bookPct + (amount > 1 ? 8 : 4));

		// Trigger staggered animation re-flow
		progressFillKey += 1;

		// Spawn floating particle
		const id = Date.now() + Math.random();
		const x = e ? (Math.random() * 40 - 20) : (Math.random() * 20 - 10);
		const y = -10;
		floatingParticles = [...floatingParticles, { id, text: `+${amount}`, x, y }];
		setTimeout(() => {
			floatingParticles = floatingParticles.filter(p => p.id !== id);
		}, 900);

		setTimeout(() => {
			if (Date.now() - lastIncrementTime >= 280) {
				isIncrementing = false;
			}
		}, 300);

		playClickSound(amount > 1 ? 680 : 560);
	}

	function resetLoggerDemo() {
		solvedCount = 42;
		dailyTargetPct = 76;
		modulePct = 82;
		dppPct = 90;
		pyqPct = 74;
		bookPct = 68;
		progressFillKey += 1;
		playClickSound(420, 0.08);
	}

	// 3. Interactive Tab Showcase State
	const showcaseTabs = [
		{ id: 'logger', label: 'Universal Logger', icon: 'grid', badge: 'Multi-Source' },
		{ id: 'revision', label: 'Smart Revision', icon: 'revise', badge: 'Spaced Recall' },
		{ id: 'analytics', label: 'Telemetry & Heatmap', icon: 'stats', badge: 'Intelligence' },
		{ id: 'focus', label: 'Focus & Streaks', icon: 'focus', badge: 'Deep Work' }
	];
	let activeTab = 'logger';
	let tabNavContainerEl: HTMLElement | null = null;
	let pillLeft = 0;
	let pillWidth = 140;

	function updatePillPosition() {
		if (!tabNavContainerEl) return;
		const activeBtn = tabNavContainerEl.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement;
		if (activeBtn) {
			pillLeft = activeBtn.offsetLeft;
			pillWidth = activeBtn.offsetWidth;
		}
	}

	function selectTab(tabId: string) {
		activeTab = tabId;
		updatePillPosition();
		playClickSound(600, 0.04);
	}

	// 4. Bento Grid Spotlight Effect
	function handleSpotlightMove(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		if (!target) return;
		const rect = target.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		target.style.setProperty('--mouse-x', `${x}px`);
		target.style.setProperty('--mouse-y', `${y}px`);
	}

	let handleScroll: (() => void) | null = null;

	onMount(() => {
		// Init Lenis smooth scroll
		(async () => {
			try {
				const LenisClass = await new Promise<any>((resolve) => {
					if ((window as any).Lenis) return resolve((window as any).Lenis);
					const script = document.createElement('script');
					script.src = 'https://unpkg.com/lenis@1.1.18/dist/lenis.min.js';
					script.onload = () => resolve((window as any).Lenis);
					script.onerror = () => resolve(null);
					document.head.appendChild(script);
				});

				if (LenisClass) {
					lenis = new LenisClass({
						duration: 1.25,
						easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
						orientation: 'vertical',
						gestureOrientation: 'vertical',
						smoothWheel: true,
						touchMultiplier: 1.15
					});

					const raf = (time: number) => {
						if (lenis) {
							lenis.raf(time);
							requestAnimationFrame(raf);
						}
					};
					requestAnimationFrame(raf);
				}
			} catch (e) {
				console.warn('Lenis smooth scroll skipped, falling back to native');
			}
		})();

		if (browser && navigator.userAgent.toLowerCase().includes('win')) {
			isWindows = true;
		}

		// Track scroll progress for Pinned Hero Animation (Smooth shrink and fade over hero section)
		handleScroll = () => {
			const scrollY = window.scrollY || window.pageYOffset;
			heroScrollProgress = Math.min(Math.max(scrollY / 600, 0), 1);
			heroScale = Math.max(0.88, 1 - Math.min(scrollY / 600, 1) * 0.12);
			heroOpacity = Math.max(0, 1 - Math.max(0, (scrollY - 400) / 400));
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		// Init tab pill position
		setTimeout(updatePillPosition, 100);
		window.addEventListener('resize', updatePillPosition, { passive: true });
	});

	onDestroy(() => {
		if (lenis) {
			lenis.destroy();
			lenis = null;
		}
		if (handleScroll) window.removeEventListener('scroll', handleScroll);
		if (browser) window.removeEventListener('resize', updatePillPosition);
	});
</script>

<svelte:head>
	<title>BTracker // Modern Dark-Mode SaaS Study Command Center</title>
	<meta name="description" content="Every question you solve. Finally in one place. Dark-mode SaaS command center for rigorous study." />
</svelte:head>

<div class="dark-saas-root min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-white relative overflow-x-hidden">
	
	<!-- Ambient Background Glows & Subtle Blueprint Mesh -->
	<div class="fixed inset-0 pointer-events-none z-0">
		<div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[32rem] bg-indigo-600/10 rounded-full blur-[140px] opacity-75"></div>
		<div class="absolute top-[45rem] -left-32 w-[34rem] h-[34rem] bg-emerald-600/5 rounded-full blur-[160px] opacity-60"></div>
		<div class="absolute top-[90rem] -right-32 w-[38rem] h-[38rem] bg-purple-600/5 rounded-full blur-[160px] opacity-60"></div>
		<div class="absolute inset-0 bg-[linear-gradient(to_right,#27272a0f_1px,transparent_1px),linear-gradient(to_bottom,#27272a0f_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
	</div>

	<!-- ========================================================================= -->
	<!-- 1. NAVIGATION & SCROLL: STICKY NAVBAR -->
	<!-- ========================================================================= -->
	<!-- REPLICATED CENTERED LIQUID GLASS FLOATING PILL MENU BAR -->
	<!-- ========================================================================= -->
	<header class="fixed left-0 right-0 z-50 flex justify-center pointer-events-none px-4" style="top: max(env(safe-area-inset-top, 0px) + 8px, 1rem);">
		<div class="pointer-events-auto flex items-center gap-6 sm:gap-7 px-3 py-1.5 rounded-full bg-[#0e0e12]/95 md:bg-[#0e0e12]/75 backdrop-blur-none md:backdrop-blur-2xl border border-white/[0.14] shadow-[0_20px_48px_-10px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.5)] transition-all hover:border-white/25" style="-webkit-transform: translateZ(0); transform: translateZ(0); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
			
			<!-- Brand: Site's Signature Bold B Logo -->
			<a href="/" class="flex items-center gap-2.5 pl-1 group focus:outline-none" aria-label="BTracker — home">
				<div class="w-[30px] h-[30px] rounded-[9px] bg-white border border-white/30 flex items-center justify-center font-extrabold text-black text-base shadow-[0_2px_10px_rgba(0,0,0,0.4)] group-hover:scale-105 group-hover:-rotate-3 transition-transform flex-shrink-0">
					<span class="tracking-tight font-black leading-none pb-[1px]">B</span>
				</div>
				<div class="flex flex-col leading-none">
					<span class="font-extrabold text-white text-[15px] tracking-tight">BTracker</span>
					<span class="text-[7.5px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">JEE Study OS</span>
				</div>
			</a>

			<!-- Navigation Links -->
			<nav class="hidden md:flex items-center gap-5 text-[13px] font-medium text-white/70" aria-label="Main Navigation">
				<a href="#features" class="hover:text-white transition-colors py-1 px-2.5 rounded-full hover:bg-white/10">Features</a>
				<a href="#logger" class="hover:text-white transition-colors py-1 px-2.5 rounded-full hover:bg-white/10">Interactive Logger</a>
				<a href="#showcase" class="hover:text-white transition-colors py-1 px-2.5 rounded-full hover:bg-white/10">Tab Showcase</a>
				<a href="#bento" class="hover:text-white transition-colors py-1 px-2.5 rounded-full hover:bg-white/10">Bento Architecture</a>
				<a href="/guides" class="hover:text-white transition-colors py-1 px-2.5 rounded-full hover:bg-white/10">Study Guides</a>
			</nav>

			<!-- Action Buttons: Apple Style White Download Pill -->
			<div class="flex items-center gap-2.5">
				<a href="/login" class="text-xs font-medium text-white/70 hover:text-white px-2 py-1 transition-colors hidden sm:inline-block">
					Log in
				</a>
				<a 
					href={isWindows ? "/api/download?os=windows" : "/api/download?os=mac"}
					download={isWindows ? "BTracker-Windows.zip" : "BTracker-macOS.zip"}
					title="Direct Download BTracker"
					on:click={() => { if (!isWindows) macGuideOpen = true; }}
					class="inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-950 px-3.5 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98]">
					<svg class="w-3.5 h-3.5" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
						{#if isWindows}
							<path d="M0 24.3l69-9.5v65.6H0V24.3zm69 62.4l.1 65.6L0 142.8V86.7h69.1zm9.6-73.4L160 0v74.2H78.6V13.3zm81.4 73.4V160l-81.4-11.4V86.7H160z"/>
						{:else}
							<path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-6.19-9.57-11.03-20.73-14.53-33.48-3.5-12.74-5.25-24.62-5.25-35.63 0-14.35 3.5-26.39 10.5-36.12 7-9.73 15.84-14.71 26.5-14.94 4.58 0 9.88 1.25 15.89 3.75 6.02 2.5 10.15 3.79 12.4 3.87 2.02-.08 6.27-1.37 12.75-3.87 6.47-2.5 11.58-3.67 15.34-3.5 11.42.63 20.73 4.96 27.92 13 4.18 4.67 7.37 10.08 9.58 16.23-10.42 6.32-15.54 15.11-15.34 26.38.2 8.74 3.54 16.03 10.02 21.87 6.48 5.84 14.15 9.17 23 10-2.19 6.42-4.82 12.87-7.9 19.34zM119.22 31.9c0-6.72 2.37-13.14 7.12-18.25 4.74-5.11 10.7-8.52 17.88-10.22.42 1.58.63 3.09.63 4.54 0 6.64-2.48 13.04-7.44 18.2-4.96 5.16-11.01 8.52-18.15 10.07-.04-1.46-.04-2.9-.04-4.34z"/>
						{/if}
					</svg>
					<span>{isWindows ? 'Download PC' : 'Download'}</span>
				</a>
			</div>

		</div>
	</header>

	<DownloadModal bind:open={downloadModalOpen} onClose={() => (downloadModalOpen = false)} />
	<MacInstallGuideModal bind:open={macGuideOpen} onClose={() => (macGuideOpen = false)} />

	<main class="relative z-10">

		<!-- ===================================================================== -->
		<!-- 1. PINNED HERO ANIMATION SECTION -->
		<!-- Mockup card smoothly shrinks and fades on scroll without overlapping navbar -->
		<!-- ===================================================================== -->
		<section class="hero-pinned-wrapper relative min-h-[145vh] w-full pt-24 sm:pt-32 pb-20 overflow-visible">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				
				<!-- Hero Copy -->
				<div class="text-center max-w-3xl mx-auto mb-14">
					<div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 text-xs font-semibold text-zinc-200 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl">
						<span class="relative flex h-2 w-2">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
						</span>
						<span class="tracking-tight">Engineered for JEE Aspirants · 100% Free Forever</span>
					</div>

					<h1 class="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] mb-6">
						Every question you solve.<br />
						<span class="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
							Finally in one place.
						</span>
					</h1>

					<p class="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-8">
						Log problems from coaching modules, DPPs, reference books and tests. BTracker consolidates your workflow into real-time accuracy telemetry and spaced revision.
					</p>

					<div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
						<a href="/login" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-3 rounded-xl shadow-[0_0_35px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_0_45px_rgba(255,255,255,0.32)] transition-all transform hover:-translate-y-0.5 active:scale-[0.98]">
							<span>Start Tracking Now</span>
							<NavIcon name="arrow-right" size={15} />
						</a>
						<a href="#logger" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 px-6 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-zinc-700 transition-all active:scale-[0.98]">
							<NavIcon name="grid" size={15} />
							<span>Try Live Logger Demo</span>
						</a>
					</div>

					<!-- Trust Chips -->
					<div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-400">
						<span class="inline-flex items-center gap-1.5"><NavIcon name="check-circle" size={14} /> 100% free, no credit card</span>
						<span class="inline-flex items-center gap-1.5"><NavIcon name="shield" size={14} /> Cloud & local offline cache</span>
						<span class="inline-flex items-center gap-1.5"><NavIcon name="sparkles" size={14} /> Native Baktiwal Tutorials sync</span>
					</div>
				</div>

				<!-- PINNED HERO MOCKUP CONTAINER -->
				<!-- Stays pinned smoothly beneath navbar (top-24), shrinking and fading on scroll -->
				<div class="sticky top-24 z-20 w-full flex justify-center will-change-transform pointer-events-none">
					<div 
						class="w-full max-w-5xl rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-[0_25px_80px_rgba(0,0,0,0.85)] p-2 sm:p-3 backdrop-blur-md transition-all duration-75 origin-top pointer-events-auto"
						style="transform: scale({heroScale.toFixed(3)}); opacity: {heroOpacity.toFixed(3)};">
						
						<!-- Browser Mockup Window Bar -->
						<div class="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 mb-2">
							<div class="flex items-center gap-2">
								<span class="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
								<span class="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
								<span class="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
								<span class="ml-2 font-mono text-[11px] text-zinc-500 hidden sm:inline">btracker.app/dashboard</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
									● LIVE DASHBOARD VIEW
								</span>
							</div>
						</div>

						<!-- Dashboard Graphic Screen -->
						<div class="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 aspect-[16/10] sm:aspect-[16/9]">
							<img
								src="/landing/dashboard.jpg"
								alt="BTracker Dark Mode Dashboard Telemetry"
								class="w-full h-full object-cover filter contrast-[1.05]"
								loading="eager"
								decoding="async"
							/>
							<div class="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent pointer-events-none"></div>

							<!-- Floating Stat Badges on Mockup -->
							<div class="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-xl">
								<div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
									₹0
								</div>
								<div>
									<div class="text-xs font-bold text-white">100% Free Forever</div>
									<div class="text-[10px] text-zinc-400">All analytics & sync included</div>
								</div>
							</div>

							<div class="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-xl hidden sm:flex">
								<div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
									<NavIcon name="trend" size={16} />
								</div>
								<div>
									<div class="text-xs font-bold text-white">Scroll to Shrink</div>
									<div class="text-[10px] text-zinc-400">Pinned without navbar overlap</div>
								</div>
							</div>
						</div>

					</div>
				</div>

			</div>
		</section>


		<!-- ===================================================================== -->
		<!-- INSTITUTES LOGO STRIP -->
		<!-- ===================================================================== -->
		<section id="features" class="relative z-10 border-y border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm py-8 px-4 sm:px-6">
			<div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
				<div class="text-xs font-mono text-zinc-400 uppercase tracking-wider text-center sm:text-left">
					Compatible with all coaching formats:
				</div>
				<div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-mono text-xs">
					<span class="px-3 py-1.5 rounded-lg bg-zinc-900 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1.5 shadow-sm">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
						Baktiwal Tutorials [Native Sync]
					</span>
					<span class="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">Allen</span>
					<span class="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">Resonance</span>
					<span class="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">Physics Wallah</span>
					<span class="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">FIITJEE</span>
					<span class="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">Self-Study</span>
				</div>
			</div>
		</section>


		<!-- ===================================================================== -->
		<!-- 3. INTERACTIVE TAB SHOWCASE SECTION -->
		<!-- Active tab pill indicator using Framer Motion layout animations style -->
		<!-- Preview card content cross-fades smoothly (opacity and translateY) on tab switch -->
		<!-- ===================================================================== -->
		<section id="showcase" class="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80">
			<div class="max-w-7xl mx-auto">
				
				<div class="text-center max-w-3xl mx-auto mb-14">
					<span class="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/60 border border-indigo-800/50 px-3 py-1 rounded-full">
						Interactive Tab Showcase
					</span>
					<h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4 mb-4">
						Four interconnected workflows. Zero friction.
					</h2>
					<p class="text-zinc-400 text-sm sm:text-base">
						Switch tabs to preview the cross-fading interface modules with spring layout tab transitions.
					</p>
				</div>

				<!-- TAB NAVIGATION STRIP (Framer Motion style layout pill) -->
				<div class="flex justify-center mb-10">
					<div 
						bind:this={tabNavContainerEl}
						class="relative flex items-center p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 max-w-full overflow-x-auto shadow-xl"
						role="tablist"
					>
						<!-- Sliding Active Tab Pill Indicator -->
						<div 
							class="absolute top-1.5 bottom-1.5 rounded-xl bg-zinc-800 border border-zinc-700/70 shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
							style="left: {pillLeft}px; width: {pillWidth}px;"
							aria-hidden="true"
						></div>

						{#each showcaseTabs as tab}
							<button
								type="button"
								data-tab-id={tab.id}
								role="tab"
								aria-selected={activeTab === tab.id}
								on:click={() => selectTab(tab.id)}
								class="relative z-10 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center gap-2 whitespace-nowrap {activeTab === tab.id ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}"
							>
								<NavIcon name={tab.icon as any} size={15} />
								<span>{tab.label}</span>
								<span class="text-[10px] hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-900/60 text-zinc-400 border border-zinc-800">
									{tab.badge}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- PREVIEW CARD CONTENT (Cross-fades smoothly: opacity & translateY) -->
				<div class="max-w-5xl mx-auto relative min-h-[460px] rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden">
					{#key activeTab}
					{#if activeTab === 'logger'}
						<div class="tab-content-panel space-y-6">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
								<div>
									<span class="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">// WORKFLOW 01</span>
									<h3 class="text-2xl font-bold text-white mt-0.5">Universal Question Logging Engine</h3>
									<p class="text-xs text-zinc-400 mt-1">Record attempted, solved, and doubtful problems across any coaching book.</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-2.5 py-1 rounded-md bg-emerald-950/70 text-emerald-400 text-xs font-mono border border-emerald-800/40">● SYNC READY</span>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-zinc-400 mb-1">SELECTED CHAPTER</div>
									<div class="text-base font-bold text-white font-sans">Rotational Dynamics</div>
									<div class="text-emerald-400 text-[11px] mt-1">Physics · Standard 11</div>
								</div>
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-zinc-400 mb-1">TODAY'S BATCH</div>
									<div class="text-base font-bold text-white font-sans">28 / 32 Solved</div>
									<div class="text-indigo-400 text-[11px] mt-1">87.5% Accuracy</div>
								</div>
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-zinc-400 mb-1">FLAGGED FOR RETRY</div>
									<div class="text-base font-bold text-amber-400 font-sans">4 Doubts Marked</div>
									<div class="text-zinc-500 text-[11px] mt-1">Queued for Sunday</div>
								</div>
							</div>

							<div class="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 font-mono text-xs space-y-2.5">
								<div class="flex items-center justify-between py-1.5 border-b border-zinc-900 text-zinc-300">
									<span class="text-emerald-400 font-bold">[DPP #4]</span>
									<span>Q1 - Q12</span>
									<span class="text-zinc-400">12 Attempted</span>
									<span class="text-white font-bold">10 Solved</span>
									<span class="text-amber-400">2 Doubts</span>
								</div>
								<div class="flex items-center justify-between py-1.5 border-b border-zinc-900 text-zinc-300">
									<span class="text-indigo-400 font-bold">[HC Verma Vol 1]</span>
									<span>Ex 1 - Q8</span>
									<span class="text-zinc-400">8 Attempted</span>
									<span class="text-white font-bold">7 Solved</span>
									<span class="text-amber-400">1 Doubt</span>
								</div>
								<div class="flex items-center justify-between py-1.5 text-zinc-300">
									<span class="text-purple-400 font-bold">[JEE PYQ 2023]</span>
									<span>Shift 2</span>
									<span class="text-zinc-400">10 Attempted</span>
									<span class="text-white font-bold">9 Solved</span>
									<span class="text-emerald-400 font-bold">0 Doubts</span>
								</div>
							</div>
						</div>

					{:else if activeTab === 'revision'}
						<div class="tab-content-panel space-y-6">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
								<div>
									<span class="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">// WORKFLOW 02</span>
									<h3 class="text-2xl font-bold text-white mt-0.5">Spaced Repetition & Mistake Loop</h3>
									<p class="text-xs text-zinc-400 mt-1">Automatic recall intervals (1, 3, 7, 21 days) prevent forgetting curve decay.</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-2.5 py-1 rounded-md bg-purple-950/70 text-purple-400 text-xs font-mono border border-purple-800/40">● 14 DUE TODAY</span>
								</div>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div class="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
									<div class="text-xs font-mono text-zinc-400 uppercase">INTERVAL 1 (DAY 1)</div>
									<div class="text-3xl font-black text-white mt-2">6 Problems</div>
									<div class="text-xs text-zinc-500 mt-2">Fresh concepts flagged yesterday</div>
								</div>
								<div class="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
									<div class="text-xs font-mono text-zinc-400 uppercase">INTERVAL 2 (DAY 3)</div>
									<div class="text-3xl font-black text-purple-400 mt-2">5 Problems</div>
									<div class="text-xs text-zinc-500 mt-2">Thermodynamics & Calculus proofs</div>
								</div>
								<div class="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
									<div class="text-xs font-mono text-zinc-400 uppercase">FORMULA VAULT</div>
									<div class="text-3xl font-black text-emerald-400 mt-2">8 Flashcards</div>
									<div class="text-xs text-zinc-500 mt-2">Active recall memory prompt</div>
								</div>
							</div>

							<div class="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between text-xs font-mono">
								<span class="text-zinc-400">Formula Vault:</span>
								<span class="text-white font-bold">Parallel Axis Theorem: I = I_cm + M·d²</span>
								<button class="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">Test Recall →</button>
							</div>
						</div>

					{:else if activeTab === 'analytics'}
						<div class="tab-content-panel space-y-6">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
								<div>
									<span class="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">// WORKFLOW 03</span>
									<h3 class="text-2xl font-bold text-white mt-0.5">365-Day Consistency & Accuracy Heatmap</h3>
									<p class="text-xs text-zinc-400 mt-1">Every question feeds the daily output graph, accuracy radar, and countdown ticker.</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-2.5 py-1 rounded-md bg-indigo-950/70 text-indigo-400 text-xs font-mono border border-indigo-800/40">● 18 DAY STREAK</span>
								</div>
							</div>

							<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-xs text-zinc-400">JEE MAIN 2027</div>
									<div class="text-2xl font-black text-white mt-1">72 Days</div>
									<div class="text-[10px] text-zinc-500 mt-1">Countdown timer</div>
								</div>
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-xs text-zinc-400">ACCURACY</div>
									<div class="text-2xl font-black text-emerald-400 mt-1">84.2%</div>
									<div class="text-[10px] text-zinc-500 mt-1">First-attempt rate</div>
								</div>
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-xs text-zinc-400">SOLVED TOTAL</div>
									<div class="text-2xl font-black text-white mt-1">1,480</div>
									<div class="text-[10px] text-zinc-500 mt-1">Across 3 subjects</div>
								</div>
								<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
									<div class="text-xs text-zinc-400">DAILY OUTPUT</div>
									<div class="text-2xl font-black text-indigo-400 mt-1">42 / Day</div>
									<div class="text-[10px] text-zinc-500 mt-1">7-day rolling average</div>
								</div>
							</div>

							<div class="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800">
								<div class="text-xs font-mono text-zinc-400 mb-2">// 12-WEEK OUTPUT MATRIX</div>
								<div class="grid grid-cols-12 gap-1.5 h-12 items-end">
									{#each [35, 42, 28, 56, 48, 62, 54, 70, 65, 80, 74, 92] as val}
										<div 
											class="bg-indigo-500/80 hover:bg-indigo-400 rounded-sm transition-all"
											style="height: {val}%;"
											title="{val}% volume"
										></div>
									{/each}
								</div>
							</div>
						</div>

					{:else if activeTab === 'focus'}
						<div class="tab-content-panel space-y-6">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
								<div>
									<span class="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">// WORKFLOW 04</span>
									<h3 class="text-2xl font-bold text-white mt-0.5">Deep Work Pomodoro Engine</h3>
									<p class="text-xs text-zinc-400 mt-1">Distraction-free timers that directly translate focus minutes into study logs.</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-400 text-xs font-mono border border-amber-800/40">● 5.2 HOURS TODAY</span>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
								<div class="p-6 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center flex flex-col items-center">
									<div class="text-xs font-mono text-zinc-400 mb-4">CURRENT INTERVAL</div>
									<div class="text-5xl font-mono font-black text-white tracking-wider mb-2">25:00</div>
									<div class="text-xs text-emerald-400 font-mono mb-6">● PHYSICS WORKOUT ACTIVE</div>
									<div class="flex gap-2">
										<button class="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-colors">Start Focus</button>
										<button class="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors">Reset</button>
									</div>
								</div>

								<div class="space-y-3 font-mono text-xs">
									<div class="p-3.5 rounded-lg bg-zinc-950/90 border border-zinc-800 flex justify-between items-center">
										<span class="text-zinc-400">Total Deep Hours:</span>
										<span class="text-white font-bold">142.5 hrs</span>
									</div>
									<div class="p-3.5 rounded-lg bg-zinc-950/90 border border-zinc-800 flex justify-between items-center">
										<span class="text-zinc-400">Best Daily Streak:</span>
										<span class="text-amber-400 font-bold">24 Days</span>
									</div>
									<div class="p-3.5 rounded-lg bg-zinc-950/90 border border-zinc-800 flex justify-between items-center">
										<span class="text-zinc-400">Distraction Log:</span>
										<span class="text-emerald-400 font-bold">0 Tab Switches</span>
									</div>
								</div>
							</div>
						</div>
					{/if}
					{/key}
				</div>

			</div>
		</section>


		<!-- ===================================================================== -->
		<!-- 4. BENTO GRID AESTHETICS SECTION (WITH SPOTLIGHT EFFECT) -->
		<!-- Cards: bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl -->
		<!-- Spotlight effect: Subtle radial gradient highlight following cursor position on hover -->
		<!-- ===================================================================== -->
		<section id="bento" class="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80">
			<div class="max-w-7xl mx-auto">
				
				<div class="text-center max-w-3xl mx-auto mb-16">
					<span class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full">
						Bento Grid Architecture
					</span>
					<h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4 mb-4">
						Architected for high-performance preparation.
					</h2>
					<p class="text-zinc-400 text-sm sm:text-base">
						Hover any card to experience the dynamic cursor-following spotlight effect and interactive widgets.
					</p>
				</div>

				<!-- BENTO GRID CONTAINER -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

					<!-- ============================================================= -->
					<!-- 2. INTERACTIVE QUESTION LOGGER CARD (Featured 2-Column Bento Card) -->
					<!-- Number increment animation on question counter when clicked -->
					<!-- Animated SVG circle stroke and staggered progress bar fills on button press -->
					<!-- ============================================================= -->
					<div 
						id="logger"
						role="region"
						aria-label="Interactive Question Logger Card"
						on:mousemove={handleSpotlightMove}
						class="bento-card group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-sm transition-all duration-300 md:col-span-2 shadow-xl flex flex-col justify-between"
					>
						<!-- Spotlight Radial Glow -->
						<div 
							class="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							style="background: radial-gradient(600px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(255, 255, 255, 0.08), transparent 40%);"
							aria-hidden="true"
						></div>

						<div>
							<div class="flex items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
								<div class="flex items-center gap-2.5">
									<div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
										<NavIcon name="grid" size={16} />
									</div>
									<div>
										<span class="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">FEATURE 02 // INTERACTIVE WIDGET</span>
										<h3 class="text-xl sm:text-2xl font-bold text-white tracking-tight">Interactive Question Logger</h3>
									</div>
								</div>
								<button 
									type="button"
									on:click={resetLoggerDemo}
									class="text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded transition-colors"
									title="Reset Demo Values"
								>
									↺ Reset
								</button>
							</div>

							<p class="text-xs sm:text-sm text-zinc-400 mt-3 mb-6">
								Click the counter or action buttons below: watch the live number bounce, the radial SVG circle draw in, and the progress bars race forward with staggered delays.
							</p>

							<!-- INTERACTIVE METRICS SHOWCASE ROW -->
							<div class="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 relative">
								
								<!-- QUESTION COUNTER (With Pop Animation and Floating Particles) -->
								<div class="sm:col-span-5 flex flex-col items-center sm:items-start relative">
									<div class="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1">
										QUESTIONS SOLVED TODAY
									</div>

									<div class="relative flex items-center gap-3">
										<button 
											type="button"
											on:click={(e) => handleQuestionIncrement(e, 1)}
											class="group/counter relative text-5xl sm:text-6xl font-black text-white font-mono tracking-tight transition-transform duration-150 active:scale-95 cursor-pointer focus:outline-none"
											title="Click to increment solved counter"
										>
											<span class="inline-block transition-transform duration-200 {isIncrementing ? 'scale-110 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]' : 'text-white'}">
												{solvedCount}
											</span>

											<!-- Floating Particle Spawn -->
											{#each floatingParticles as p (p.id)}
												<span 
													class="floating-plus pointer-events-none absolute -top-4 left-1/2 font-mono text-sm font-bold text-emerald-400"
													style="transform: translate({p.x}px, {p.y}px);"
												>
													{p.text}
												</span>
											{/each}
										</button>

										<div class="text-xs font-mono text-zinc-500 leading-tight">
											<span class="text-emerald-400 font-bold">▲ +12%</span> vs yesterday<br />
											<span class="text-zinc-400 font-medium">Click to log</span>
										</div>
									</div>

									<div class="mt-4 flex flex-wrap gap-2">
										<button 
											type="button"
											on:click={(e) => handleQuestionIncrement(e, 1)}
											class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-sm active:scale-95"
										>
											+1 Solved
										</button>
										<button 
											type="button"
											on:click={(e) => handleQuestionIncrement(e, 5)}
											class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all active:scale-95"
										>
											+5 Batch Log
										</button>
									</div>
								</div>

								<!-- ANIMATED RADIAL SVG CIRCLE STROKE GAUGE -->
								<div class="sm:col-span-7 flex flex-col sm:flex-row items-center gap-6 sm:border-l border-zinc-800 sm:pl-6">
									<div class="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
										<svg class="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
											<!-- Background track -->
											<circle 
												cx="44" 
												cy="44" 
												r={CIRCLE_RADIUS} 
												class="stroke-zinc-800" 
												stroke-width="7" 
												fill="none" 
											/>
											<!-- Animated Foreground Stroke -->
											<circle 
												cx="44" 
												cy="44" 
												r={CIRCLE_RADIUS} 
												class="stroke-emerald-400 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" 
												stroke-width="7" 
												stroke-linecap="round" 
												fill="none"
												stroke-dasharray={CIRCLE_CIRCUMFERENCE}
												stroke-dashoffset={circleOffset}
											/>
										</svg>
										<div class="absolute inset-0 flex flex-col items-center justify-center font-mono">
											<span class="text-base font-bold text-white">{dailyTargetPct}%</span>
											<span class="text-[9px] text-zinc-400 uppercase">Target</span>
										</div>
									</div>

									<div class="text-xs font-mono space-y-1 text-center sm:text-left">
										<div class="text-white font-bold">Daily Goal Convergence</div>
										<div class="text-zinc-400 text-[11px] leading-relaxed">
											SVG strokeDashoffset animates smoothly from {CIRCLE_CIRCUMFERENCE.toFixed(0)}px offset as you record questions.
										</div>
										<div class="text-emerald-400 text-[10px] pt-1">
											● TARGET LOCK: 50 QUESTIONS / DAY
										</div>
									</div>
								</div>

							</div>

							<!-- STAGGERED PROGRESS BAR FILLS -->
							<div class="mt-6 space-y-3 font-mono text-xs">
								<div class="flex items-center justify-between text-zinc-400 mb-1">
									<span class="uppercase tracking-wider">// STAGGERED SOURCE BREAKDOWN</span>
									<span class="text-[11px] text-zinc-500">Staggered transitions: 0ms · 120ms · 240ms · 360ms</span>
								</div>

								<!-- Bar 1: Coaching Module (BT) (delay-0) -->
								<div>
									<div class="flex justify-between text-[11px] mb-1">
										<span class="text-zinc-300 font-medium">Baktiwal Tutorials Modules</span>
										<span class="text-emerald-400 font-bold">{modulePct}%</span>
									</div>
									<div class="h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
										<div 
											class="h-full bg-emerald-400 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
											style="width: {modulePct}%; transition-delay: 0ms;"
										></div>
									</div>
								</div>

								<!-- Bar 2: DPP (delay-120ms) -->
								<div>
									<div class="flex justify-between text-[11px] mb-1">
										<span class="text-zinc-300 font-medium">Daily Practice Problems (DPP)</span>
										<span class="text-indigo-400 font-bold">{dppPct}%</span>
									</div>
									<div class="h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
										<div 
											class="h-full bg-indigo-400 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
											style="width: {dppPct}%; transition-delay: 120ms;"
										></div>
									</div>
								</div>

								<!-- Bar 3: PYQ (delay-240ms) -->
								<div>
									<div class="flex justify-between text-[11px] mb-1">
										<span class="text-zinc-300 font-medium">Previous Year Questions (PYQs)</span>
										<span class="text-purple-400 font-bold">{pyqPct}%</span>
									</div>
									<div class="h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
										<div 
											class="h-full bg-purple-400 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
											style="width: {pyqPct}%; transition-delay: 240ms;"
										></div>
									</div>
								</div>

								<!-- Bar 4: Books (delay-360ms) -->
								<div>
									<div class="flex justify-between text-[11px] mb-1">
										<span class="text-zinc-300 font-medium">Reference Books (HC Verma / Irodov)</span>
										<span class="text-amber-400 font-bold">{bookPct}%</span>
									</div>
									<div class="h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
										<div 
											class="h-full bg-amber-400 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
											style="width: {bookPct}%; transition-delay: 360ms;"
										></div>
									</div>
								</div>
							</div>
						</div>

						<div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
							<span>TAP BUTTONS TO TEST NUMBER INCREMENT & STAGGERED FILLS</span>
							<span class="text-emerald-400">● INTERACTION ACTIVE</span>
						</div>
					</div>


					<!-- ============================================================= -->
					<!-- BENTO CARD 2: NATIVE MODULE SYNC (BAKTIWAL TUTORIALS) -->
					<!-- ============================================================= -->
					<div 
						role="region"
						aria-label="Native Module Sync"
						on:mousemove={handleSpotlightMove}
						class="bento-card group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-sm transition-all duration-300 shadow-xl flex flex-col justify-between"
					>
						<!-- Spotlight Glow -->
						<div 
							class="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							style="background: radial-gradient(500px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(255, 255, 255, 0.08), transparent 40%);"
							aria-hidden="true"
						></div>

						<div>
							<div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
								<NavIcon name="layers" size={16} />
							</div>
							<span class="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">NATIVE SYNC</span>
							<h3 class="text-xl font-bold text-white tracking-tight mt-1 mb-2">Baktiwal Tutorials Wired In</h3>
							<p class="text-xs text-zinc-400 leading-relaxed mb-6">
								Chapter numbers, exercise tables, and question counts come pre-indexed. Tick questions once — review queues update in unison.
							</p>

							<div class="space-y-2 font-mono text-xs">
								<div class="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
									<span class="text-zinc-300">Module Structure:</span>
									<span class="text-emerald-400 font-bold">100% Pre-mapped</span>
								</div>
								<div class="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
									<span class="text-zinc-300">Exercise Tables:</span>
									<span class="text-white font-bold">Ex 1A, 1B, 2, 3</span>
								</div>
								<div class="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
									<span class="text-zinc-300">Doubt Flagging:</span>
									<span class="text-amber-400 font-bold">One-Tap Recall</span>
								</div>
							</div>
						</div>

						<div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
							<span>NATIVE ARCHITECTURE</span>
							<span class="text-indigo-400">BT PROTOCOL</span>
						</div>
					</div>


					<!-- ============================================================= -->
					<!-- BENTO CARD 3: FOCUS & STREAKS (DEEP WORK) -->
					<!-- ============================================================= -->
					<div 
						role="region"
						aria-label="Focus Streaks and Timers"
						on:mousemove={handleSpotlightMove}
						class="bento-card group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-sm transition-all duration-300 shadow-xl flex flex-col justify-between"
					>
						<div 
							class="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							style="background: radial-gradient(500px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(255, 255, 255, 0.08), transparent 40%);"
							aria-hidden="true"
						></div>

						<div>
							<div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
								<NavIcon name="focus" size={16} />
							</div>
							<span class="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">DEEP WORK</span>
							<h3 class="text-xl font-bold text-white tracking-tight mt-1 mb-2">Focus Streaks & Timers</h3>
							<p class="text-xs text-zinc-400 leading-relaxed mb-6">
								Pomodoro sessions directly translate focus minutes into solved questions, daily streaks, and weekly consistency reports.
							</p>

							<div class="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center">
								<div class="text-3xl font-black text-white font-mono">25:00</div>
								<div class="text-[11px] text-amber-400 font-mono mt-1">● 18-DAY ACTIVE STREAK</div>
							</div>
						</div>

						<div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
							<span>HARDWARE TELEMETRY</span>
							<span class="text-amber-400">ZERO FRAME LOSS</span>
						</div>
					</div>


					<!-- ============================================================= -->
					<!-- BENTO CARD 4: ONE BRAIN FOR EVERY CHART -->
					<!-- ============================================================= -->
					<div 
						role="region"
						aria-label="Analytics and Charts"
						on:mousemove={handleSpotlightMove}
						class="bento-card group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-sm transition-all duration-300 shadow-xl flex flex-col justify-between"
					>
						<div 
							class="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							style="background: radial-gradient(500px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(255, 255, 255, 0.08), transparent 40%);"
							aria-hidden="true"
						></div>

						<div>
							<div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
								<NavIcon name="stats" size={16} />
							</div>
							<span class="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">ANALYTICS</span>
							<h3 class="text-xl font-bold text-white tracking-tight mt-1 mb-2">One Brain For Every Chart</h3>
							<p class="text-xs text-zinc-400 leading-relaxed mb-6">
								Daily output, heatmaps, accuracy, subject balance and exam countdowns all read from the same underlying database.
							</p>

							<div class="grid grid-cols-3 gap-2 text-center font-mono text-xs">
								<div class="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
									<div class="text-base font-bold text-white">42</div>
									<div class="text-[10px] text-zinc-500">Today</div>
								</div>
								<div class="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
									<div class="text-base font-bold text-emerald-400">84%</div>
									<div class="text-[10px] text-zinc-500">Accuracy</div>
								</div>
								<div class="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800">
									<div class="text-base font-bold text-indigo-400">18d</div>
									<div class="text-[10px] text-zinc-500">Streak</div>
								</div>
							</div>
						</div>

						<div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
							<span>REAL-TIME AGGREGATION</span>
							<span class="text-purple-400">POSTGRESQL</span>
						</div>
					</div>


					<!-- ============================================================= -->
					<!-- BENTO CARD 5: MULTI-DEVICE CLOUD & LOCAL CACHE -->
					<!-- ============================================================= -->
					<div 
						role="region"
						aria-label="Multi-Device Cloud and Local Cache"
						on:mousemove={handleSpotlightMove}
						class="bento-card group relative bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-sm transition-all duration-300 shadow-xl flex flex-col justify-between"
					>
						<div 
							class="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
							style="background: radial-gradient(500px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(255, 255, 255, 0.08), transparent 40%);"
							aria-hidden="true"
						></div>

						<div>
							<div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
								<NavIcon name="shield" size={16} />
							</div>
							<span class="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">PERSISTENCE</span>
							<h3 class="text-xl font-bold text-white tracking-tight mt-1 mb-2">Offline-First Cloud Sync</h3>
							<p class="text-xs text-zinc-400 leading-relaxed mb-6">
								Start on your phone on the bus. Finish on your laptop at your desk. Instant offline IndexedDB caching with encrypted cloud replication.
							</p>

							<div class="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between font-mono text-xs">
								<div class="flex items-center gap-2 text-zinc-300">
									<NavIcon name="layers" size={14} />
									<span>Local Cache</span>
								</div>
								<span class="text-zinc-600">⇄</span>
								<div class="flex items-center gap-2 text-emerald-400">
									<NavIcon name="check-circle" size={14} />
									<span>Cloud Synced</span>
								</div>
							</div>
						</div>

						<div class="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
							<span>AES-256 ZERO KNOWLEDGE</span>
							<span class="text-cyan-400">ENCRYPTED</span>
						</div>
					</div>

				</div>

			</div>
		</section>


		<!-- ===================================================================== -->
		<!-- HOW IT WORKS: 3 STEPS -->
		<!-- ===================================================================== -->
		<section id="how" class="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80">
			<div class="max-w-7xl mx-auto">
				
				<div class="text-center max-w-3xl mx-auto mb-16">
					<span class="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
						Seamless Onboarding
					</span>
					<h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4 mb-4">
						Three steps. Zero spreadsheets.
					</h2>
					<p class="text-zinc-400 text-sm sm:text-base">
						Start tracking your real preparation velocity in under 60 seconds.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-8 font-mono">
					<div class="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
						<span class="text-3xl font-black text-emerald-400">01</span>
						<h3 class="text-lg font-bold text-white mt-3 mb-2 font-sans">Pick Your Coaching</h3>
						<p class="text-xs text-zinc-400 font-sans leading-relaxed">
							Choose Baktiwal Tutorials for automated native exercise mapping, or select any institute for the universal log.
						</p>
					</div>

					<div class="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
						<span class="text-3xl font-black text-indigo-400">02</span>
						<h3 class="text-lg font-bold text-white mt-3 mb-2 font-sans">Log What You Solve</h3>
						<p class="text-xs text-zinc-400 font-sans leading-relaxed">
							Subject &rarr; chapter &rarr; source. Record attempted, solved, and doubts in two effortless taps without disrupting flow.
						</p>
					</div>

					<div class="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
						<span class="text-3xl font-black text-purple-400">03</span>
						<h3 class="text-lg font-bold text-white mt-3 mb-2 font-sans">Let Telemetry Work</h3>
						<p class="text-xs text-zinc-400 font-sans leading-relaxed">
							Every log instantly powers your daily target, consistency heatmap, accuracy trends, and spaced repetition calendar.
						</p>
					</div>
				</div>

			</div>
		</section>


		<!-- ===================================================================== -->
		<!-- FINAL CALL TO ACTION -->
		<!-- ===================================================================== -->
		<section class="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
			<div class="max-w-4xl mx-auto text-center relative z-10 p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl">
				<span class="inline-block text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full mb-4">
					100% Free · Every Feature Unlocked
				</span>
				<h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
					Your next question counts.
				</h2>
				<p class="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
					Build the clearest, most disciplined picture of your preparation. No credit card, no Pro tier locks.
				</p>
				<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
					<a 
						href="/login" 
						class="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold bg-zinc-100 hover:bg-white text-zinc-950 px-8 py-3.5 rounded-xl shadow-[0_0_35px_rgba(255,255,255,0.2)] transition-all transform hover:-translate-y-0.5">
						<span>Start Tracking Free</span>
						<NavIcon name="arrow-right" size={16} />
					</a>
					<a 
						href="/welcome" 
						class="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 px-6 py-3.5 rounded-xl transition-all">
						<span>Explore Study OS</span>
					</a>
				</div>
			</div>
		</section>

	</main>


	<!-- ========================================================================= -->
	<!-- FOOTER -->
	<!-- ========================================================================= -->
	<footer class="border-t border-white/10 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 text-xs font-mono text-zinc-400">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
			<div class="flex items-center gap-3">
				<div class="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs">
					B
				</div>
				<span class="text-white font-bold text-sm font-sans">BTracker</span>
				<span class="text-zinc-600">|</span>
				<span>Free study command center for JEE aspirants.</span>
			</div>

			<div class="flex flex-wrap items-center justify-center gap-6 text-zinc-400">
				<a href="/guides" class="hover:text-white transition-colors">Study Guides</a>
				<a href="/welcome" class="hover:text-white transition-colors">Welcome</a>
				<a href="/login" class="hover:text-white transition-colors">Sign In</a>
				<span class="text-zinc-600">·</span>
				<span>© 2026 BTracker</span>
			</div>
		</div>
	</footer>

</div>

<style>
	/* Cross-fade and translate animation for Tab Showcase content */
	.tab-content-panel {
		animation: tabCrossFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes tabCrossFade {
		0% {
			opacity: 0;
			transform: translate3d(0, 10px, 0);
		}
		100% {
			opacity: 1;
			transform: translate3d(0, 0, 0);
		}
	}

	/* Floating Particle Animation */
	.floating-plus {
		animation: floatUpFade 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes floatUpFade {
		0% {
			opacity: 1;
			transform: translate(0, 0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(0, -28px) scale(1.3);
		}
	}

	/* Bento card custom spotlight variable fallbacks */
	.bento-card {
		--mouse-x: -500px;
		--mouse-y: -500px;
	}

	/* Smooth momentum scrolling base */
	:global(html.lenis), :global(html.lenis body) {
		height: auto;
	}
	:global(.lenis.lenis-smooth) {
		scroll-behavior: auto !important;
	}
</style>
