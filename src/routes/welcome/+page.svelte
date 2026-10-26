<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import DownloadModal from '$lib/components/DownloadModal.svelte';
	import GetStartedModal from '$lib/components/GetStartedModal.svelte';

	type Mode = 'tracker' | 'mock';
	type Stage = 'mains' | 'advanced' | 'olympiad';
	type PreviewTab = 'home' | 'log' | 'review' | 'plan' | 'tests' | 'stats';
	type PreviewDevice = 'laptop' | 'mobile';
	type PreviewSpot = { key: string; href: string; label: string; x: number; y: number; w: number; h: number };

	const PREVIEW_VIEWPORTS: Record<PreviewDevice, { w: number; h: number }> = {
		laptop: { w: 1440, h: 900 },
		mobile: { w: 390, h: 844 }
	};

	const previewTabs: readonly { id: PreviewTab; label: string }[] = [
		{ id: 'home', label: 'Home' },
		{ id: 'log', label: 'Log' },
		{ id: 'review', label: 'Review' },
		{ id: 'plan', label: 'Plan' },
		{ id: 'tests', label: 'Tests' },
		{ id: 'stats', label: 'Stats' }
	];

	const PREVIEW_ROUTES: Record<PreviewTab, string> = {
		home: '/',
		log: '/log',
		review: '/review',
		plan: '/plan',
		tests: '/tests',
		stats: '/stats'
	};
	const PREVIEW_PATHS = new Set(['/', '/log', '/review', '/plan', '/tests', '/dump', '/todo', '/focus', '/revise', '/stats', '/reminders', '/settings']);

	const TELEMETRY_ALERTS = [
		'[Physics: Mechanics] Q14 logged in 6s',
		'[Tests] BTest 12 logged → rank updated',
		'[Revision] 14 cards due → queue set'
	];

	type SubjectSignal = {
		id: string;
		label: string;
		retention: number;
		recall: number;
	};

	const subjectSignals: SubjectSignal[] = [
		{ id: 'physics', label: 'Physics', retention: 82, recall: 74 },
		{ id: 'chemistry', label: 'Chemistry', retention: 76, recall: 69 },
		{ id: 'maths', label: 'Maths', retention: 88, recall: 71 }
	];

	let activeSubject = 'physics';
	$: signal = subjectSignals.find((subject) => subject.id === activeSubject) ?? subjectSignals[0];

	const navLinks = [
		{ label: 'Method', href: '/welcome#method' },
		{ label: 'System', href: '/system' },
		{ label: 'Stages', href: '/stages' },
		{ label: 'Playbooks', href: '/playbooks' },
		{ label: 'FAQ', href: '/faq' }
	];

	const pinSteps = [
		{
			kicker: '01',
			title: 'Instant log',
			line: 'Catch the question while the thinking is fresh.',
			long:
				'Subject, chapter, marks — under ten seconds. The timer starts only if you want it; the log never waits for the perfect moment.',
			foot: 'Input: one attempt'
		},
		{
			kicker: '02',
			title: 'Spaced deck',
			line: 'Wrong or slow questions come back on schedule.',
			long:
				'Every miss becomes a card. Intervals decide what returns today, so revision is a system instead of a mood.',
			foot: 'Output: active recall'
		},
		{
			kicker: '03',
			title: 'Test post-mortem',
			line: 'Every mock lands in one ledger.',
			long:
				'Score, accuracy and the subject split sit next to every past paper. The leak is visible without opening a notebook.',
			foot: 'Output: an honest scoreline'
		}
	] as const;

	const stageOrder: Stage[] = ['mains', 'advanced', 'olympiad'];

	const stages: Record<
		Stage,
		{
			label: string;
			tag: string;
			marks: string;
			question: string;
			topics: string[];
			difficulty: number;
			time: string;
			note: string;
		}
	> = {
		mains: {
			label: 'JEE Mains',
			tag: 'Objective · single correct',
			marks: '+4 / −1',
			question:
				'A block of mass 2 kg is pulled up a 30° incline by a force of 20 N. If the coefficient of friction is 0.2, find the acceleration of the block.',
			topics: ['Laws of motion', 'Friction', 'Inclines'],
			difficulty: 3,
			time: 'Suggested: 90s',
			note: 'Speed and elimination'
		},
		advanced: {
			label: 'JEE Advanced',
			tag: 'Numerical · multi-concept',
			marks: '+4 / 0',
			question:
				'A uniform rod of length L and mass M is hinged at one end and released from rest at 60° from the vertical. Find its angular velocity as it passes through the vertical.',
			topics: ['Rotational mechanics', 'Energy', 'Moment of inertia'],
			difficulty: 4,
			time: 'Suggested: 3 min',
			note: 'Depth and connection'
		},
		olympiad: {
			label: 'Olympiad',
			tag: 'Proof · multi-step',
			marks: '6 marks',
			question:
				'A particle moves in a central potential V(r) = −k/r². Show that circular orbits are unstable for every nonzero angular momentum.',
			topics: ['Central forces', 'Stability', 'Effective potential'],
			difficulty: 5,
			time: 'Suggested: 12 min',
			note: 'Proof and rigor'
		}
	};

	const notes = [
		{
			quote: 'The 25-minute post-mortem after every mock.',
			copy: 'A guided debrief that turns a bad test into next week’s plan instead of a bad mood.',
			tag: 'Mock debrief',
			pill: 'Free playbook',
			href: '/playbooks/mock-post-mortem',
			tone: 'peach'
		},
		{
			quote: 'Use PYQs three times, not once.',
			copy: 'First pass for exposure, second for pattern, third for speed. The cycle most toppers actually run.',
			tag: 'PYQ cycle',
			pill: 'Open library',
			href: '/guides/pyq-strategy',
			tone: 'lav'
		},
		{
			quote: 'Choose your exam-day attempt order in advance.',
			copy: 'Decide the order of sections before the hall, not inside it. A calm plan beats a heroic one.',
			tag: 'Exam day',
			pill: 'No card needed',
			href: '/playbooks/attempt-order',
			tone: 'sage'
		},
		{
			quote: 'Build a revision system that survives a busy week.',
			copy: 'Spaced repetition only works if it survives your worst week, not your best one.',
			tag: 'Revision',
			pill: 'Read free',
			href: '/playbooks/spaced-revision-engine',
			tone: 'butter'
		}
	];

	const faqs = [
		{
			q: 'Is BTracker really free?',
			tag: 'Pricing',
			a: 'Yes. Every feature — question log, focus timer, spaced decks, mock analytics and the AI mentor — is included. No card, no trial clock, no locked tier.',
			href: '/login',
			link: 'Start free'
		},
		{
			q: 'Do I have to change my coaching or study material?',
			tag: 'Workflow',
			a: 'No. Log questions from any module, DPP, PYQ set or reference book. BTracker sits beside your routine; it does not replace it.',
			href: '/playbooks',
			link: 'Browse the playbooks'
		},
		{
			q: 'Which exams and stages does it support?',
			tag: 'Coverage',
			a: 'JEE Main, JEE Advanced and Olympiad-style practice. Goals are organised by stage, from early Class 11 through a dropper year.',
			href: '/stages',
			link: 'Compare stage strategies'
		},
		{
			q: 'What happens to my data if I switch devices?',
			tag: 'Sync',
			a: 'Sign in and your tracker syncs to the cloud, so the same log, decks and analytics follow you. The local copy is a cache, never the source of truth.',
			href: '/login',
			link: 'Sign in with Google'
		},
		{
			q: 'How do mock tests fit in?',
			tag: 'Tests',
			a: 'Log a test with subject scores and your mistakes. BTracker keeps the score history, accuracy and marks lost next to your question log, so the next study block starts from evidence.',
			href: '/playbooks/mock-post-mortem',
			link: 'Read the post-mortem method'
		},
		{
			q: 'Can I try it without signing in?',
			tag: 'Getting started',
			a: 'You can open the app and start logging without an account. Signing in with Google turns on cloud sync, so your work follows you to another device.',
			href: '/login',
			link: 'Continue with Google'
		}
	];

	const schema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'BTracker',
		alternateName: 'BTracker — JEE Study Tracker & Question Log',
		url: 'https://btracker.app/welcome',
		applicationCategory: 'EducationalApplication',
		applicationSubCategory: 'Study Tracker',
		operatingSystem: 'Web, Android, iOS',
		inLanguage: 'en-IN',
		description:
			'BTracker is a completely free JEE study tracker for logging questions, focus sessions and mock tests. Turn your preparation into spaced revision, rank analytics and a plan that updates itself — no card, no trial, every feature included.',
		image: 'https://btracker.app/landing/og-welcome.jpg',
		screenshot: 'https://btracker.app/landing/dashboard.jpg',
		isAccessibleForFree: true,
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'INR',
			availability: 'https://schema.org/InStock'
		},
		featureList: [
			'JEE question logging from modules, DPPs, PYQs and tests',
			'Focus timer with subject and chapter tagging',
			'Spaced revision, flashcards and Teach Duck explanations',
			'Mock test analysis with Elo, percentile and rank trends',
			'AI Mentor and Behavioral DNA study insights',
			'Cloud sync and installable progressive web app'
		],
		publisher: {
			'@type': 'Organization',
			name: 'BTracker',
			url: 'https://btracker.app'
		}
	};

	const jsonLd = JSON.stringify(schema);

	let mode: Mode = 'tracker';
	let stage: Stage = 'mains';
	let previewPath = '/';
	let mobileOpen = false;
	let reduced = false;

	let previewInitialSrc = '/?preview=1';
	let previewDevice: PreviewDevice = 'laptop';
	let previewIframeEl: HTMLIFrameElement | undefined;
	let previewFrameEl: HTMLElement | undefined;
	let previewSpots: PreviewSpot[] = [];
	let previewLoading = false;
	let previewReady = false;
	let previewLoadTimer: ReturnType<typeof setTimeout> | undefined;
	let previewMeasureTimer: ReturnType<typeof setTimeout> | undefined;
	let previewResizeTimer: ReturnType<typeof setTimeout> | undefined;
	let previewResizeObserver: ResizeObserver | undefined;
	let previewContentObserver: ResizeObserver | undefined;

	let ribbonShown = TELEMETRY_ALERTS[0];
	let ribbonIndex = 0;
	let ribbonTimer: ReturnType<typeof setTimeout> | undefined;
	let ribbonRun = 0;

	let heroArtEl: HTMLElement;
	let pinEl: HTMLElement;
	let pinFill = 0;
	let pinStage = 0;

	let revealIO: IntersectionObserver | undefined;

	let faqEl: HTMLElement | null = null;
	let faqActive = 0;
	let faqPillY = 0;
	let faqPillH = 0;
	let faqReady = false;

	let tickRaf = 0;
	let downloadModalOpen = false;
	let getStartedModalOpen = false;

	$: stageData = stages[stage];
	$: activePin = pinSteps[pinStage];

	function setMode(next: Mode) {
		if (mode === next) return;
		mode = next;
		previewSpots = [];
		previewReady = false;
		if (previewLoadTimer) clearTimeout(previewLoadTimer);
		if (next === 'mock') {
			previewPath = '/tests';
			previewInitialSrc = '/tests?preview=1';
			previewIframeEl = undefined;
			previewLoading = true;
			previewLoadTimer = setTimeout(() => (previewLoading = false), 15000);
			if (typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' });
				if (window.history?.replaceState) {
					const url = new URL(window.location.href);
					url.searchParams.set('mode', 'mock');
					window.history.replaceState({}, '', url.toString());
				}
			}
		} else {
			previewPath = '/';
			previewInitialSrc = '/?preview=1';
			previewLoading = false;
			previewIframeEl = undefined;
			if (typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' });
				if (window.history?.replaceState) {
					const url = new URL(window.location.href);
					url.searchParams.delete('mode');
					window.history.replaceState({}, '', url.toString());
				}
				setTimeout(() => {
					startReveals();
					measureFaq();
					updatePin();
					updateHero();
				}, 60);
			}
		}
		startRibbon();
	}

	function postPreviewNav(path: string) {
		previewIframeEl?.contentWindow?.postMessage({ type: 'btracker-preview-nav', path }, window.location.origin);
	}

	function selectPreviewTab(tab: PreviewTab) {
		const path = PREVIEW_ROUTES[tab];
		if (previewPath === path && previewReady) return;
		previewPath = path;
		if (previewReady) {
			postPreviewNav(path);
			scheduleSpotMeasure();
		} else {
			previewInitialSrc = `${path}?preview=1`;
		}
	}

	function goPreview(href: string) {
		if (previewPath === href && previewReady) return;
		previewPath = href;
		if (previewReady) {
			postPreviewNav(href);
			scheduleSpotMeasure();
		} else {
			previewInitialSrc = `${href}?preview=1`;
		}
	}

	function resizePreview() {
		const iframe = previewIframeEl;
		const frame = previewFrameEl;
		if (!iframe || !frame) return;
		const stage = frame.parentElement;
		const frameW = (stage?.clientWidth ?? frame.clientWidth) || 1;
		const frameH = (stage?.clientHeight ?? frame.clientHeight) || 430;
		const narrow = frameW <= 760;
		if (narrow) {
			iframe.style.width = `${Math.round(frameW)}px`;
			iframe.style.height = `${Math.max(360, Math.round(frameH))}px`;
			iframe.style.transform = 'none';
			frame.style.width = '';
			frame.style.height = '';
		} else if (previewDevice === 'mobile') {
			const { w, h } = PREVIEW_VIEWPORTS.mobile;
			const scale = Math.min((frameW - 96) / w, (frameH - 56) / h);
			frame.style.width = `${w * scale}px`;
			frame.style.height = `${h * scale}px`;
			iframe.style.width = `${w}px`;
			iframe.style.height = `${h}px`;
			iframe.style.transform = `scale(${scale})`;
		} else {
			frame.style.width = '';
			frame.style.height = '';
			iframe.style.width = `${PREVIEW_VIEWPORTS.laptop.w}px`;
			iframe.style.height = `${PREVIEW_VIEWPORTS.laptop.h}px`;
			iframe.style.transform = `scale(${frameW / PREVIEW_VIEWPORTS.laptop.w})`;
		}
		scheduleSpotMeasure();
	}

	function setPreviewDevice(device: PreviewDevice) {
		if (previewDevice === device) return;
		previewDevice = device;
		if (mode !== 'mock') return;
		previewReady = false;
		previewLoading = true;
		previewSpots = [];
		previewInitialSrc = `${previewPath}?preview=1&device=${device}`;
		resizePreview();
		if (previewLoadTimer) clearTimeout(previewLoadTimer);
		previewLoadTimer = setTimeout(() => (previewLoading = false), 15000);
	}

	function scheduleSpotMeasure() {
		if (previewMeasureTimer) clearTimeout(previewMeasureTimer);
		previewMeasureTimer = setTimeout(measurePreviewSpots, 120);
	}

	/** Chrome inside the iframe finishes hydrating — and webfonts load — after `load`; re-measure when it settles. */
	function watchPreviewContent() {
		const iframe = previewIframeEl;
		const doc = iframe?.contentDocument;
		if (!iframe || !doc) return;
		previewContentObserver?.disconnect();
		previewContentObserver = new ResizeObserver(() => scheduleSpotMeasure());
		for (const el of doc.querySelectorAll('.bottom-nav, aside[aria-label="Primary navigation"]')) {
			previewContentObserver.observe(el);
		}
		doc.fonts?.ready.then(() => {
			if (iframe.contentDocument === doc) scheduleSpotMeasure();
		});
		for (const delay of [300, 1000, 2200]) {
			setTimeout(() => {
				if (iframe.contentDocument === doc) scheduleSpotMeasure();
			}, delay);
		}
	}

	/** Mirror the app's own sidebar/mobile-nav links as clickable, scaled hotspots over the inert iframe. */
	function measurePreviewSpots() {
		const iframe = previewIframeEl;
		const frame = previewFrameEl;
		if (!iframe || !frame) {
			previewSpots = [];
			return;
		}
		const doc = iframe.contentDocument;
		if (!doc) {
			previewSpots = [];
			return;
		}
		const iframeW = iframe.clientWidth || frame.clientWidth || 1;
		const scale = (frame.clientWidth || iframeW) / iframeW;
		const anchors = Array.from(
			doc.querySelectorAll<HTMLAnchorElement>('aside[aria-label="Primary navigation"] a[href], .bottom-nav a[href]')
		);
		const spots: PreviewSpot[] = [];
		const seen = new Set<string>();
		for (const anchor of anchors) {
			const href = anchor.getAttribute('href');
			if (!href || !PREVIEW_PATHS.has(href)) continue;
			const rect = anchor.getBoundingClientRect();
			if (rect.width < 8 || rect.height < 8 || rect.left < -1 || rect.top < -1) continue;
			const label = (anchor.textContent || '').trim() || anchor.getAttribute('aria-label') || href;
			const key = `${href}:${Math.round(rect.left)}:${Math.round(rect.top)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			spots.push({ key, href, label, x: rect.left * scale, y: rect.top * scale, w: rect.width * scale, h: rect.height * scale });
		}
		previewSpots = spots;
	}

	function previewFrame(node: HTMLElement) {
		previewFrameEl = node;
		previewResizeObserver?.disconnect();
		previewResizeObserver = new ResizeObserver(() => {
			if (previewResizeTimer) clearTimeout(previewResizeTimer);
			previewResizeTimer = setTimeout(resizePreview, 80);
		});
		previewResizeObserver.observe(node);
		return {
			destroy() {
				previewResizeObserver?.disconnect();
				previewResizeObserver = undefined;
				previewContentObserver?.disconnect();
				previewContentObserver = undefined;
				previewFrameEl = undefined;
				if (previewResizeTimer) clearTimeout(previewResizeTimer);
			}
		};
	}

	function handlePreviewFrameLoad() {
		resizePreview();
		scheduleSpotMeasure();
		watchPreviewContent();
	}

	function handlePreviewMessage(event: MessageEvent) {
		if (event.origin !== window.location.origin) return;
		const iframe = previewIframeEl;
		if (!iframe || event.source !== iframe.contentWindow) return;
		const data = event.data as { type?: string; path?: string } | null;
		if (!data) return;
		if (data.type === 'btracker-preview-ready') {
			const loadedPath = typeof data.path === 'string' ? data.path : '/';
			previewReady = true;
			previewLoading = false;
			if (previewLoadTimer) clearTimeout(previewLoadTimer);
			if (loadedPath !== previewPath) postPreviewNav(previewPath);
			resizePreview();
			watchPreviewContent();
			setTimeout(measurePreviewSpots, 220);
		} else if (data.type === 'btracker-preview-navigated' && typeof data.path === 'string') {
			previewPath = data.path;
			scheduleSpotMeasure();
		}
	}

	function stopRibbon() {
		if (ribbonTimer) clearTimeout(ribbonTimer);
		ribbonTimer = undefined;
	}

	function startRibbon() {
		stopRibbon();
		ribbonRun += 1;
		const run = ribbonRun;
		const full = TELEMETRY_ALERTS[ribbonIndex % TELEMETRY_ALERTS.length];
		ribbonIndex = (ribbonIndex + 1) % TELEMETRY_ALERTS.length;
		if (reduced) {
			ribbonShown = full;
			return;
		}
		ribbonShown = '';
		let i = 0;
		const step = () => {
			if (run !== ribbonRun) return;
			ribbonShown = full.slice(0, i);
			i += 1;
			if (i <= full.length) ribbonTimer = setTimeout(step, 22);
			else ribbonTimer = setTimeout(startRibbon, 3800);
		};
		ribbonTimer = setTimeout(step, 420);
	}

	function updateHero() {
		if (!heroArtEl) return;
		if (reduced || window.innerWidth < 761) {
			heroArtEl.style.transform = '';
			return;
		}
		const drift = Math.min(window.scrollY * 0.03, 26);
		heroArtEl.style.transform = `translate3d(0, ${drift}px, 0)`;
	}

	function heroTilt(node: HTMLElement) {
		const frame = node.querySelector<HTMLElement>('.wx-hero-frame');
		if (!frame) return;

		let raf = 0;
		let targetX = 0;
		let targetY = 0;
		let currentX = 0;
		let currentY = 0;

		const allowed = () => window.innerWidth > 1080 && !reduced;

		const paint = () => {
			currentX += (targetX - currentX) * 0.16;
			currentY += (targetY - currentY) * 0.16;
			const settled = Math.abs(targetX - currentX) < 0.03 && Math.abs(targetY - currentY) < 0.03;
			if (settled) {
				currentX = targetX;
				currentY = targetY;
			}
			frame.style.transform = `perspective(1500px) rotateY(${(-6 + currentY).toFixed(3)}deg) rotateX(${(4 + currentX).toFixed(3)}deg)`;
			raf = settled ? 0 : requestAnimationFrame(paint);
		};

		const kick = () => {
			if (!raf) raf = requestAnimationFrame(paint);
		};

		const onMove = (event: PointerEvent) => {
			if (event.pointerType !== 'mouse' || !allowed()) return;
			const rect = node.getBoundingClientRect();
			const relX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
			const relY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
			targetY = -relX * 6;
			targetX = relY * 4.5;
			kick();
		};

		const onLeave = () => {
			if (!frame.style.transform) return;
			targetX = 0;
			targetY = 0;
			kick();
		};

		const onResize = () => {
			if (allowed()) return;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
			targetX = 0;
			targetY = 0;
			currentX = 0;
			currentY = 0;
			frame.style.transform = '';
		};

		node.addEventListener('pointermove', onMove, { passive: true });
		node.addEventListener('pointerleave', onLeave);
		window.addEventListener('resize', onResize);

		return {
			destroy() {
				node.removeEventListener('pointermove', onMove);
				node.removeEventListener('pointerleave', onLeave);
				window.removeEventListener('resize', onResize);
				if (raf) cancelAnimationFrame(raf);
			}
		};
	}

	function updatePin() {
		if (!pinEl) return;
		if (reduced || window.innerWidth < 901) {
			pinFill = 1;
			return;
		}
		const total = Math.max(1, pinEl.offsetHeight - window.innerHeight);
		const p = Math.min(1, Math.max(0, -pinEl.getBoundingClientRect().top / total));
		const fill = Math.round(p * 1000) / 1000;
		if (fill !== pinFill) pinFill = fill;
		const next = Math.min(2, Math.floor(p * 3));
		if (next !== pinStage) pinStage = next;
	}

	function goPin(i: number) {
		if (!pinEl) return;
		if (reduced || window.innerWidth < 901) {
			pinStage = i;
			return;
		}
		const total = Math.max(1, pinEl.offsetHeight - window.innerHeight);
		const top = window.scrollY + pinEl.getBoundingClientRect().top;
		window.scrollTo({ top: top + total * ((i + 0.5) / 3), behavior: 'smooth' });
	}

	function measureFaq() {
		if (!faqEl) return;
		const buttons = Array.from(faqEl.querySelectorAll<HTMLButtonElement>('.wx-faq-q'));
		const btn = buttons[faqActive];
		if (!btn) return;
		faqPillY = btn.offsetTop;
		faqPillH = btn.offsetHeight;
		faqReady = true;
	}

	function selectFaq(i: number) {
		faqActive = i;
		measureFaq();
	}

	function onScroll() {
		if (tickRaf) return;
		tickRaf = requestAnimationFrame(() => {
			tickRaf = 0;
			updateHero();
			updatePin();
		});
	}

	function onResize() {
		if (window.innerWidth > 820) mobileOpen = false;
		measureFaq();
		updatePin();
		updateHero();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') mobileOpen = false;
	}

	function startReveals() {
		const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
		if (reduced || !('IntersectionObserver' in window)) {
			els.forEach((el) => el.classList.add('in'));
			return;
		}
		revealIO = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						entry.target.classList.add('in');
						revealIO?.unobserve(entry.target);
					}
				}
			},
			{ rootMargin: '-60px 0px' }
		);
		els.forEach((el) => revealIO?.observe(el));
	}

	onMount(() => {
		// overflow-x: hidden makes body a scroll container and kills the pinned method
		const htmlEl = document.documentElement;
		const bodyEl = document.body;
		const prevHtmlOverflow = htmlEl.style.overflowX;
		const prevBodyOverflow = bodyEl.style.overflowX;
		htmlEl.style.overflowX = 'clip';
		bodyEl.style.overflowX = 'clip';
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.addEventListener('message', handlePreviewMessage);
		
		const params = new URLSearchParams(window.location.search);
		if (params.get('mode') === 'mock') {
			setMode('mock');
		} else {
			startRibbon();
			startReveals();
			measureFaq();
			updatePin();
			updateHero();
			if (document.fonts?.ready) void document.fonts.ready.then(measureFaq);
		}
		return () => {
			htmlEl.style.overflowX = prevHtmlOverflow;
			bodyEl.style.overflowX = prevBodyOverflow;
			window.removeEventListener('message', handlePreviewMessage);
			if (previewLoadTimer) clearTimeout(previewLoadTimer);
			if (previewMeasureTimer) clearTimeout(previewMeasureTimer);
			if (previewResizeTimer) clearTimeout(previewResizeTimer);
			stopRibbon();
			revealIO?.disconnect();
			if (tickRaf) cancelAnimationFrame(tickRaf);
		};
	});
</script>

<svelte:head>
	<title>BTracker — JEE Study Tracker, Question Log & Mock Test Analytics</title>
	<meta
		name="description"
		content="Track every JEE question, focus session and mock test in one place. Turn your prep into spaced revision, rank analytics and a plan that updates itself. 100% free — no card, no trial."
	/>
	<meta name="robots" content="index, follow, max-image-preview:large" />
	<link rel="canonical" href="https://btracker.app/welcome" />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
		rel="stylesheet"
	/>

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:locale" content="en_IN" />
	<meta property="og:url" content="https://btracker.app/welcome" />
	<meta property="og:title" content="BTracker — don’t just study, master the curve" />
	<meta
		property="og:description"
		content="Log questions, focus sessions and mock tests in one place. Spaced revision, rank analytics and an AI mentor for JEE aspirants. Entirely free — every feature, no card."
	/>
	<meta property="og:image" content="https://btracker.app/landing/og-welcome.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="685" />
	<meta property="og:image:alt" content="The BTracker dashboard with daily progress and study analytics" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="BTracker — Free JEE Study Tracker & Question Log" />
	<meta
		name="twitter:description"
		content="Turn every JEE question into spaced revision, rank analytics and a plan that updates itself. 100% free, no card required."
	/>
	<meta name="twitter:image" content="https://btracker.app/landing/og-welcome.jpg" />

	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<svelte:window on:scroll={onScroll} on:resize={onResize} on:keydown={onKeydown} />

<div class="wx-page" id="top">
	<a class="wx-skip" href="#wx-main">Skip to content</a>

	<header class="wx-nav">
		<div class="wx-nav-pill">
			<BrandLogo href="#top" size="sm" label="BTracker — home" />

			<nav class="wx-links" aria-label="Main navigation">
				{#each navLinks as link}
					<a href={link.href}>{link.label}</a>
				{/each}
			</nav>

			<div class="wx-seg" role="group" aria-label="Preview mode">
				<span class="wx-seg-pill" class:mock={mode === 'mock'} aria-hidden="true"></span>
				<button
					type="button"
					class:on={mode === 'tracker'}
					aria-pressed={mode === 'tracker'}
					on:click={() => setMode('tracker')}
				>
					Study Tracker
				</button>
				<button
					type="button"
					class:on={mode === 'mock'}
					aria-pressed={mode === 'mock'}
					on:click={() => setMode('mock')}
				>
					Mock Engine
				</button>
			</div>

			<div class="wx-nav-actions">
				<a class="wx-login" href="/login">Log in</a>
				<button
					type="button"
					class="wx-btn wx-btn-dark wx-nav-cta"
					on:click={() => (getStartedModalOpen = true)}
				>
					Get started
				</button>
				<button
					type="button"
					class="wx-burger"
					aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={mobileOpen}
					aria-controls="wx-mobile-menu"
					on:click={() => (mobileOpen = !mobileOpen)}
				>
					<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
						{#if mobileOpen}
							<path
								d="M4 4l12 12M16 4L4 16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
						{:else}
							<path
								d="M3 6h14M3 10h14M3 14h14"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
						{/if}
					</svg>
				</button>
			</div>
		</div>
	</header>

	{#if mobileOpen}
		<button
			type="button"
			class="wx-sheet-scrim"
			aria-label="Close menu"
			on:click={() => (mobileOpen = false)}
		></button>
		<nav class="wx-sheet" id="wx-mobile-menu" aria-label="Mobile navigation">
			<div class="wx-sheet-seg" role="group" aria-label="Preview mode">
				<button
					type="button"
					class:on={mode === 'tracker'}
					aria-pressed={mode === 'tracker'}
					on:click={() => {
						setMode('tracker');
						mobileOpen = false;
					}}
				>
					Study Tracker
				</button>
				<button
					type="button"
					class:on={mode === 'mock'}
					aria-pressed={mode === 'mock'}
					on:click={() => {
						setMode('mock');
						mobileOpen = false;
					}}
				>
					Mock Engine
				</button>
			</div>
			{#each navLinks as link}
				<a href={link.href} on:click={() => (mobileOpen = false)}>{link.label}</a>
			{/each}
			<div class="wx-sheet-actions">
				<button
					type="button"
					class="wx-btn wx-btn-dark"
					style="width: 100%; justify-content: center;"
					on:click={() => {
						mobileOpen = false;
						getStartedModalOpen = true;
					}}
				>
					Get started
				</button>
				<a class="wx-sheet-login" href="/login">Log in</a>
			</div>
		</nav>
	{/if}

	<main id="wx-main">
		{#if mode === 'mock'}
			<!-- FOCUSED MOCK ENGINE VIEW (Clean: Text + Mock Engine Preview) -->
			<div class="wx-mock-focus" in:fade={{ duration: 220 }}>
				<div class="wx-wrap">
					<!-- Headline & Intro text -->
					<div class="wx-mock-hero">
						<h1 class="wx-serif wx-mock-title">
							Simulate the exam. <br />
							<em>Audit every lost mark.</em>
						</h1>

						<p class="wx-mock-lede">
							The dedicated test cockpit built for serious JEE aspirants. Track timed papers across BTest, Alt, and CET categories, diagnose root-cause mark leaks, and automatically push every flawed question into spaced active recall before test day.
						</p>
					</div>

					<!-- The Mock Engine Preview -->
					<div class="wx-mock-preview-wrap">
						<div class="wx-preview mock focused">
							<div class="wx-browser-bar">
								<span class="wx-browser-dots" aria-hidden="true"><i></i><i></i><i></i></span>
								<span class="wx-browser-url">app.btracker.app{previewPath}</span>
								<span class="wx-browser-tag">Mock Engine · Live Interactive Sandbox</span>
							</div>

							<div class="wx-preview-toolbar">
								<div class="wx-page-tabs" role="group" aria-label="Mock Engine views">
									{#each previewTabs as tab}
										<button
											type="button"
											class:on={previewPath === PREVIEW_ROUTES[tab.id]}
											aria-pressed={previewPath === PREVIEW_ROUTES[tab.id]}
											on:click={() => selectPreviewTab(tab.id)}
										>
											{#if tab.id === 'tests'}🎯 {/if}
											{tab.label}
										</button>
									{/each}
								</div>
								<div class="wx-device-toggle" role="group" aria-label="Preview device">
									<button
										type="button"
										class:on={previewDevice === 'laptop'}
										aria-pressed={previewDevice === 'laptop'}
										on:click={() => setPreviewDevice('laptop')}
									>
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<rect x="2.5" y="3" width="11" height="7.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.4" />
											<path d="M1 12.5h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
										</svg>
										Laptop
									</button>
									<button
										type="button"
										class:on={previewDevice === 'mobile'}
										aria-pressed={previewDevice === 'mobile'}
										on:click={() => setPreviewDevice('mobile')}
									>
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<rect x="5" y="1.8" width="6" height="12.4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.4" />
											<path d="M7.2 12.3h1.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
										</svg>
										Mobile
									</button>
								</div>
							</div>

							<p class="wx-preview-disclaimer">
								<span class="wx-preview-disclaimer-dot" aria-hidden="true"></span>
								<span><strong>Live Interactive Preview.</strong> Click tabs above to inspect mock test logging, mistake diagnostics, and spaced review. Everything is pre-loaded with realistic mock test data.</span>
							</p>

							<div class="wx-preview-stage live" class:mobile-frame={previewDevice === 'mobile'}>
								<div class="wx-real" class:phone={previewDevice === 'mobile'} use:previewFrame>
									<iframe
										bind:this={previewIframeEl}
										src={previewInitialSrc}
										title="BTracker Mock Engine — view only"
										tabindex="-1"
										aria-hidden="true"
										inert
										on:load={handlePreviewFrameLoad}
									></iframe>
									{#each previewSpots as spot (spot.key)}
										<button
											type="button"
											class="wx-hotspot"
											style:left={`${spot.x}px`}
											style:top={`${spot.y}px`}
											style:width={`${spot.w}px`}
											style:height={`${spot.h}px`}
											aria-label={`Open ${spot.label} in preview`}
											title={`${spot.label} · view only`}
											on:click={() => goPreview(spot.href)}
										></button>
									{/each}
									{#if previewLoading}
										<div class="wx-preview-loading" aria-live="polite">
											<span class="wx-preview-spinner" aria-hidden="true"></span>
											<span>Loading Mock Engine interface…</span>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<div class="wx-mock-preview-footer">
							<ul class="wx-preview-chips">
								<li>Real BTracker Mock Engine</li>
								<li>NTA & JEE Marking Formats</li>
								<li>100% Free Forever · No Card Required</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- STUDY TRACKER OVERVIEW LANDING -->
			<section class="wx-hero" aria-labelledby="wx-hero-title">
				<div class="wx-wrap">
					<div class="wx-hero-grid">
						<div class="wx-hero-copy">
							<span class="wx-hero-stamp" aria-hidden="true">
								<span class="wx-orbit">
									<svg viewBox="0 0 160 160" width="160" height="160">
										<defs>
											<path
												id="wx-orbit-path"
												d="M80,80 m-60,0 a60,60 0 1,1 120,0 a60,60 0 1,1 -120,0"
											/>
										</defs>
										<circle cx="80" cy="80" r="79" class="wx-orbit-ring" />
										<circle cx="80" cy="80" r="72" class="wx-orbit-dash" />
										<text class="wx-orbit-text">
											<textPath href="#wx-orbit-path" startOffset="0"
												>TURN RAW EFFORT INTO RANK • JEE PREP • </textPath
											>
										</text>
										<path
											d="M80 54v52M54 80h52M61.6 61.6l36.8 36.8M98.4 61.6L61.6 98.4"
											class="wx-orbit-star"
										/>
									</svg>
								</span>
							</span>

							<p class="wx-live-chip">
								<span class="wx-live-chip-dot" aria-hidden="true"></span>
								LIVE JEE PREP ENGINE // 2026–27
							</p>

							<h1 id="wx-hero-title" class="wx-serif">
								<span class="wx-h1-line">Don’t just study,</span>
								<span class="wx-h1-line"><em>master the curve.</em></span>
							</h1>
							<p class="wx-lede">
								Every question you attempt becomes a log, a revision card and a signal for what to fix next.
								So effort compounds — instead of evaporating between tests. Completely free, with no card
								and no trial clock.
							</p>

							<div class="wx-hero-cta">
								<div class="wx-hero-actions">
									<button
										type="button"
										class="wx-btn wx-btn-dark"
										on:click={() => (getStartedModalOpen = true)}
									>
										Get started
										<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
											<path
												d="M2 8h11M9 4l4 4-4 4"
												fill="none"
												stroke="currentColor"
												stroke-width="1.6"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</button>
									<a class="wx-btn wx-btn-ghost" href="#method">See the method</a>
								</div>

								<p class="wx-hero-proof">
									<span class="wx-proof-count">1,280+</span>
									<span class="wx-proof-label">questions logged today</span>
									<span class="wx-proof-free">No card · No trial clock · 100% free</span>
								</p>
							</div>
						</div>

						<div class="wx-hero-art" bind:this={heroArtEl}>
							<span class="wx-hero-glow" aria-hidden="true"></span>

							<div class="wx-hero-stage" use:heroTilt>
								<div class="wx-hero-frame">
									<div class="wx-hero-screen">
										<div class="wx-browser-bar">
											<span class="wx-browser-dots" aria-hidden="true"><i></i><i></i><i></i></span>
											<span class="wx-browser-url">app.btracker.app</span>
											<span class="wx-browser-tag">Actual screen</span>
										</div>
										<div class="wx-preview-stage">
											<img
												class="wx-shot wx-shot-dash"
												src="/landing/dashboard.jpg"
												alt="The real BTracker dashboard showing daily progress, focus time, a seven-day consistency chart and exam countdown"
												width="2000"
												height="1556"
												fetchpriority="high"
												decoding="async"
											/>
											<span class="wx-shot-note">Actual BTracker dashboard · demo data</span>
										</div>
									</div>

									<div class="wx-signal-card">
										<div class="wx-signal-controls">
											<div class="wx-signal-row">
												<span class="wx-signal-dot" aria-hidden="true"></span>
												<span class="wx-signal-q">[Physics: Mechanics] Q14 logged in 6s</span>
											</div>

											<div class="wx-signal-tabs" role="group" aria-label="Subject signal">
												{#each subjectSignals as subject}
													<button
														type="button"
														class:on={activeSubject === subject.id}
														aria-pressed={activeSubject === subject.id}
														on:mouseenter={() => (activeSubject = subject.id)}
														on:focus={() => (activeSubject = subject.id)}
														on:click={() => (activeSubject = subject.id)}
													>
														{subject.label}
													</button>
												{/each}
											</div>
										</div>

										<div class="wx-signal-meters">
											<div class="wx-signal-meter">
												<div class="wx-signal-meter-head">
													<span>Retention</span><b>{signal.retention}%</b>
												</div>
												<span class="wx-signal-bar">
													<i style:transform={`scaleX(${signal.retention / 100})`}></i>
												</span>
											</div>
											<div class="wx-signal-meter">
												<div class="wx-signal-meter-head">
													<span>Active recall</span><b>{signal.recall}%</b>
												</div>
												<span class="wx-signal-bar">
													<i style:transform={`scaleX(${signal.recall / 100})`}></i>
												</span>
											</div>
										</div>
									</div>
								</div>

								<div class="wx-telemetry" aria-hidden="true">
									<span class="wx-telemetry-live"><i></i> LIVE FLOW</span>
									<svg class="wx-wave" viewBox="0 0 128 24" width="80" height="15">
										{#each [8, 15, 22, 11, 18, 6, 16, 21, 9, 14, 20, 7, 17, 12, 23, 10, 19, 8, 16, 13, 21, 9, 15, 21, 11, 18] as h, i}
											<rect x={i * 4.9} y={12 - h / 2} width="1.8" height={h} rx="0.9" />
										{/each}
									</svg>
									<p class="wx-telemetry-type">
										<span>{ribbonShown}</span><span class="wx-caret"></span>
									</p>
									<span class="wx-telemetry-stamp">BT / 001</span>
								</div>
							</div>

							<ul class="wx-preview-chips" aria-label="Preview notes">
								<li>Actual dashboard</li>
								<li>Demo data labelled</li>
								<li>₹0 to use all of it</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

		<!-- wx:sections -->
		<section class="wx-scoop" aria-labelledby="wx-bench-title">
			<div class="wx-wrap">
				<div class="wx-scoop-head" data-reveal>
					<p class="wx-eyebrow wx-eyebrow-light">
						<span class="wx-eyebrow-dot" aria-hidden="true"></span>
						The honest comparison
					</p>
					<h2 id="wx-bench-title" class="wx-serif">
						Most prep is tracked <em>in your head.</em>
						<br />That is where it leaks.
					</h2>
					<p class="wx-scoop-sub">
						A side-by-side of the default routine and the one BTracker is built for. No invented numbers —
						just the mechanics of keeping a real record.
					</p>
				</div>

				<div class="wx-bench-grid">
					<article class="wx-bench wx-bench-manual" data-reveal>
						<div class="wx-bench-top">
							<span class="wx-bench-kicker">Default routine</span>
							<span class="wx-bench-index wx-mono">A</span>
						</div>
						<h3 class="wx-serif">The manual diary</h3>
						<p class="wx-bench-copy">A notebook, a spreadsheet, and memory doing the scheduling.</p>
						<ul class="wx-metrics">
							<li>
								<div class="wx-metric-head"><span>Admin time</span><b>45 min/day</b></div>
								<div class="wx-meter"><i style="--pct: 78%"></i></div>
								<span class="wx-metric-note">Copying questions between sources</span>
							</li>
							<li>
								<div class="wx-metric-head"><span>Retention forecast</span><b>0% scheduled</b></div>
								<div class="wx-meter"><i style="--pct: 0%"></i></div>
								<span class="wx-metric-note">Nothing brings a question back</span>
							</li>
							<li>
								<div class="wx-metric-head"><span>Evidence later</span><b>Very little</b></div>
								<div class="wx-meter"><i style="--pct: 2%"></i></div>
								<span class="wx-metric-note">Hard to prove what you actually covered</span>
							</li>
						</ul>
						<p class="wx-bench-foot">Effort is real. The evidence disappears.</p>
					</article>

					<article class="wx-bench wx-bench-live" data-reveal>
						<div class="wx-bench-top">
							<span class="wx-bench-kicker">The BTracker flow</span>
							<span class="wx-bench-badge">Free, actually</span>
						</div>
						<h3 class="wx-serif">The live flow</h3>
						<p class="wx-bench-copy">One log, then the system does the scheduling and the remembering.</p>
						<ul class="wx-metrics">
							<li>
								<div class="wx-metric-head"><span>Tap to log</span><b>&lt; 10 s</b></div>
								<div class="wx-meter"><i style="--pct: 96%"></i></div>
								<span class="wx-metric-note">Question, chapter, marks — done</span>
							</li>
							<li>
								<div class="wx-metric-head"><span>Spaced recall</span><b>3 × passes</b></div>
								<div class="wx-meter"><i style="--pct: 76%"></i></div>
								<span class="wx-metric-note">Before the next test, not after it</span>
							</li>
							<li>
								<div class="wx-metric-head"><span>Cost to unlock everything</span><b>₹0</b></div>
								<div class="wx-meter"><i style="--pct: 100%"></i></div>
								<span class="wx-metric-note">No tier above you</span>
							</li>
						</ul>
						<div class="wx-schedule">
							<span class="wx-schedule-label wx-mono">NEXT IN THE FLOW</span>
							<div class="wx-schedule-row">
								<span class="wx-schedule-day">Today</span>
								<span>Rotational mechanics · 6 cards</span>
								<i class="wx-schedule-dot on"></i>
							</div>
							<div class="wx-schedule-row">
								<span class="wx-schedule-day">Tomorrow</span>
								<span>Electrochemistry · 4 cards</span>
								<i class="wx-schedule-dot"></i>
							</div>
							<div class="wx-schedule-row">
								<span class="wx-schedule-day">Day 3</span>
								<span>Definite integrals · 3 cards</span>
								<i class="wx-schedule-dot"></i>
							</div>
						</div>
						<p class="wx-bench-foot">Same effort. A record that compounds.</p>
					</article>
				</div>
			</div>
		</section>

		<section class="wx-method" id="method" aria-labelledby="wx-method-title" bind:this={pinEl}>
			<div class="wx-pin-hold">
				<div class="wx-wrap wx-pin-inner">
					<div class="wx-pin-head" data-reveal>
						<p class="wx-eyebrow">
							<span class="wx-eyebrow-dot" aria-hidden="true"></span>
							The method
						</p>
						<h2 id="wx-method-title" class="wx-serif">
							From a logged question to <em>a plan that holds.</em>
						</h2>
					</div>

					<div class="wx-pin-grid">
						<div class="wx-steps">
							<span class="wx-steps-track" aria-hidden="true">
								<i class="wx-steps-fill" style="transform: scaleY({pinFill})"></i>
							</span>
							{#each pinSteps as step, i}
								<button
									type="button"
									class="wx-step"
									class:on={pinStage === i}
									aria-current={pinStage === i ? 'step' : undefined}
									on:click={() => goPin(i)}
								>
									<span class="wx-step-kicker wx-mono">{step.kicker}</span>
									<span class="wx-step-main">
										<b>{step.title}</b>
										<span class="wx-step-line">{step.line}</span>
										<span class="wx-step-long">{step.long}</span>
									</span>
								</button>
							{/each}
						</div>

						<div class="wx-phone-wrap">
							<div class="wx-phone" aria-hidden="true">
								<div class="wx-phone-bar">
									<span class="wx-phone-brand">BTracker</span>
									<span class="wx-phone-demo">Demo data</span>
								</div>
								<div class="wx-phone-screen">
									<div class="wx-screen" class:on={pinStage === 0} aria-hidden={pinStage !== 0}>
										<img
											class="wx-screen-shot"
											src="/landing/app-log.jpg"
											alt="The real BTracker Question Log open on Rotational Dynamics, showing solved counts and per-exercise progress"
											width="780"
											height="1548"
											loading="eager"
											decoding="async"
										/>
									</div>

									<div class="wx-screen" class:on={pinStage === 1} aria-hidden={pinStage !== 1}>
										<img
											class="wx-screen-shot"
											src="/landing/app-review.jpg"
											alt="The real BTracker Review queue listing Rotational Dynamics questions marked Retry or Stuck"
											width="780"
											height="1548"
											loading="lazy"
											decoding="async"
										/>
									</div>

									<div class="wx-screen" class:on={pinStage === 2} aria-hidden={pinStage !== 2}>
										<img
											class="wx-screen-shot"
											src="/landing/app-tests.jpg"
											alt="The real BTracker Tests screen listing past BTest papers with scores and subject-wise marks"
											width="780"
											height="1548"
											loading="lazy"
											decoding="async"
										/>
									</div>
								</div>
							</div>
							<p class="wx-phone-caption">Actual BTracker screens · demo data</p>
						</div>

						<div class="wx-copy">
							{#each pinSteps as step, i}
								<div class="wx-copy-pane" class:on={pinStage === i} aria-hidden={pinStage !== i}>
									<span class="wx-copy-kicker wx-mono">{step.kicker} / THE LOOP</span>
									<h3 class="wx-serif">{step.title}</h3>
									<p>{step.long}</p>
									<div class="wx-copy-foot">
										<span>{step.foot}</span>
										<span class="wx-mono">0{i + 1} — 03</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="wx-stages" id="stages" aria-labelledby="wx-stages-title">
			<div class="wx-wrap">
				<div class="wx-sec-head" data-reveal>
					<p class="wx-eyebrow">
						<span class="wx-eyebrow-dot" aria-hidden="true"></span>
						Stage bento
					</p>
					<h2 id="wx-stages-title" class="wx-serif">Every stage asks <em>a different question.</em></h2>
					<p class="wx-sec-sub">
						Switch the paper, not the system. The same log and the same decks hold all three.
					</p>
				</div>

				<div class="wx-stage-card" data-reveal>
					<div class="wx-stage-side">
						<span class="wx-kicker wx-mono">CHOOSE THE PAPER</span>
						{#each stageOrder as s}
							<button
								type="button"
								class="wx-stage-tab"
								class:on={stage === s}
								aria-pressed={stage === s}
								on:click={() => (stage = s)}
							>
								<span>{stages[s].label}</span>
								<small>{stages[s].note}</small>
							</button>
						{/each}
						<p class="wx-stage-aside">
							The sample morphs in place. Your log, decks and analytics stay exactly where they are.
						</p>
					</div>

					<div class="wx-stage-paper">
						<div class="wx-stage-meta">
							<span class="wx-stage-tag">{stageData.tag}</span>
							<span class="wx-stage-marks wx-mono">{stageData.marks}</span>
						</div>
						{#key stage}
							<div class="wx-stage-content" in:fade={{ duration: 220 }}>
								<p class="wx-stage-q">{stageData.question}</p>
								<div class="wx-stage-topics">
									{#each stageData.topics as topic}
										<span>{topic}</span>
									{/each}
								</div>
								<div class="wx-stage-bottom">
									<div class="wx-diff">
										<span class="wx-kicker wx-mono">DIFFICULTY</span>
										<div class="wx-diff-dots" aria-label="Difficulty {stageData.difficulty} of 5">
											{#each [1, 2, 3, 4, 5] as d}
												<i class:on={d <= stageData.difficulty}></i>
											{/each}
										</div>
									</div>
									<span class="wx-stage-time wx-mono">{stageData.time}</span>
								</div>
							</div>
						{/key}
						<div class="wx-stage-footer">
							<span class="wx-mono">PREVIEW</span>
							<span>Tap a stage to morph the paper</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="wx-notes" id="notes" aria-labelledby="wx-notes-title">
			<div class="wx-wrap">
				<div class="wx-sec-head wx-notes-head" data-reveal>
					<p class="wx-eyebrow">
						<span class="wx-eyebrow-dot" aria-hidden="true"></span>
						From the free library
					</p>
					<h2 id="wx-notes-title" class="wx-serif">The quiet parts of <em>a good prep week.</em></h2>
					<p class="wx-sec-sub">
						Notes from the BTracker playbooks. No testimonials, no invented numbers — just the methods we
						actually use.
					</p>
				</div>

				<div class="wx-masonry">
					{#each notes as note}
						<a class="wx-note wx-note-{note.tone}" href={note.href} data-reveal>
							<div class="wx-note-top">
								<span class="wx-note-tag">{note.tag}</span>
								<span class="wx-note-pill">{note.pill}</span>
							</div>
							<p class="wx-note-quote wx-serif">“{note.quote}”</p>
							<p class="wx-note-copy">{note.copy}</p>
							<span class="wx-note-link">Read the playbook <span aria-hidden="true">→</span></span>
						</a>
					{/each}
					<a class="wx-note wx-note-free" href="/login" data-reveal>
						<div class="wx-note-top">
							<span class="wx-note-tag">Pricing</span>
							<span class="wx-note-pill">No card</span>
						</div>
						<p class="wx-free-num wx-serif">₹0</p>
						<p class="wx-note-copy">
							Every feature, every stage, every plan. No trial clock and no shelf held back.
						</p>
						<span class="wx-note-link">Start free <span aria-hidden="true">→</span></span>
					</a>
					<a class="wx-note wx-note-library" href="/playbooks" data-reveal>
						<div class="wx-note-top">
							<span class="wx-note-tag">Library</span>
							<span class="wx-note-pill">Open now</span>
						</div>
						<p class="wx-free-num wx-serif">9 + 6</p>
						<p class="wx-note-copy">
							Free study playbooks and stage-based goal plans — readable without an account.
						</p>
						<span class="wx-note-link">Open the library <span aria-hidden="true">→</span></span>
					</a>
				</div>
			</div>
		</section>

		<section class="wx-faq" id="faq" aria-labelledby="wx-faq-title">
			<div class="wx-wrap wx-faq-grid">
				<div class="wx-faq-left" data-reveal>
					<p class="wx-eyebrow">
						<span class="wx-eyebrow-dot" aria-hidden="true"></span>
						FAQ
					</p>
					<h2 id="wx-faq-title" class="wx-serif">Questions, <em>answered.</em></h2>
					<p class="wx-faq-intro">
						Short answers to the things students ask before they trust a tracker with their week.
					</p>

					<div class="wx-faq-bubble" aria-live="polite">
						{#each faqs as f, i}
							<div class="wx-faq-pane" class:on={faqActive === i} aria-hidden={faqActive !== i}>
								<span class="wx-faq-tag wx-mono">{f.tag}</span>
								<p>{f.a}</p>
								<a class="wx-faq-link" href={f.href}>{f.link} <span aria-hidden="true">→</span></a>
							</div>
						{/each}
					</div>
				</div>

				<div class="wx-faq-list" bind:this={faqEl} data-reveal>
					<span
						class="wx-faq-pill"
						class:ready={faqReady}
						style="--fy: {faqPillY}px; --fh: {faqPillH}px"
						aria-hidden="true"
					></span>
					{#each faqs as f, i}
						<div>
							<button
								type="button"
								class="wx-faq-q"
								class:on={faqActive === i}
								aria-expanded={faqActive === i}
								aria-controls="wx-faq-pane-{i}"
								on:click={() => selectFaq(i)}
							>
								<span>{f.q}</span>
								<span class="wx-faq-plus" aria-hidden="true">+</span>
							</button>
							<div
								class="wx-faq-inline"
								class:on={faqActive === i}
								id="wx-faq-pane-{i}"
								aria-hidden={faqActive !== i}
							>
								<p>{f.a}</p>
								<a class="wx-faq-link" href={f.href}>{f.link} <span aria-hidden="true">→</span></a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- wx:footer -->
		<footer class="wx-footer" id="free">
			<div class="wx-wrap">
				<div class="wx-cta" data-reveal>
					<p class="wx-eyebrow wx-eyebrow-light">
						<span class="wx-eyebrow-dot" aria-hidden="true"></span>
						Pricing
					</p>
					<h2 class="wx-serif">Entirely free.<br /><em>Genuinely.</em></h2>
					<p class="wx-cta-sub">
						No Pro plan, no upsell, no card. Sign in with Google and the whole tracker unlocks — the log,
						the decks, the analytics and the mentor.
					</p>
					<div class="wx-cta-actions">
						<button
							type="button"
							class="wx-btn wx-btn-cream"
							on:click={() => (getStartedModalOpen = true)}
						>
							Get started
							<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
								<path
									d="M2 8h11M9 4l4 4-4 4"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
						<a class="wx-cta-link" href="/playbooks">Browse the free library</a>
					</div>
					<ul class="wx-guarantees">
						<li>Unlimited question logging</li>
						<li>Spaced revision and flashcards</li>
						<li>Mock analytics and AI mentor</li>
						<li>Cloud sync and installable PWA</li>
					</ul>
				</div>

				<div class="wx-footer-mid">
					<BrandLogo href="#top" size="md" subtitle="JEE Study OS" label="BTracker — back to top" />
					<nav class="wx-footer-links" aria-label="Footer">
						<a href="/welcome#method">Method</a>
						<a href="/system">System</a>
						<a href="/stages">Stages</a>
						<a href="/playbooks">Playbooks</a>
						<a href="/faq">FAQ</a>
						<a href="/guides">Guides</a>
						<a href="/goals">Goals</a>
						<a href="/login">Log in</a>
					</nav>
					<p class="wx-footer-note">100% free · No card · No trial clock</p>
				</div>

				<div class="wx-wordmark" data-reveal aria-hidden="true">
					<span class="wx-wordmark-inner">BTRACKER</span>
				</div>

				<div class="wx-base">
					<span>Built for JEE aspirants</span>
					<span>Made to be used daily</span>
				</div>
			</div>
		</footer>
		{/if}
	</main>
	<DownloadModal bind:open={downloadModalOpen} onClose={() => (downloadModalOpen = false)} />
	<GetStartedModal bind:open={getStartedModalOpen} onClose={() => (getStartedModalOpen = false)} />
</div>

<style>
	.wx-page {
		--cream: #fbf8f3;
		--cream-2: #f4eee3;
		--cream-3: #efe8dc;
		--forest: #0f2e20;
		--forest-2: #143a29;
		--ink: #141413;
		--muted: #62665c;
		--line: rgba(20, 20, 19, 0.12);
		--mint: #dff0e4;
		--peach: #f8e2cf;
		--lav: #e9e3f7;
		--sage: #e6ecd8;
		--butter: #f6efd9;
		--serif: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;
		--sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--mono: ui-monospace, 'SFMono-Regular', Menlo, monospace;
		background: var(--cream);
		color: var(--ink);
		font-family: var(--sans);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		overflow-x: clip;
		position: relative;
	}

	.wx-page :global(*),
	.wx-page :global(*::before),
	.wx-page :global(*::after) {
		box-sizing: border-box;
	}

	.wx-wrap {
		width: min(1180px, 92vw);
		margin-inline: auto;
	}

	.wx-page :global(a) {
		color: inherit;
		text-decoration: none;
	}

	.wx-serif {
		font-family: var(--serif);
		font-weight: 400;
		letter-spacing: -0.025em;
		line-height: 0.98;
		margin: 0;
	}

	.wx-page :global(p) {
		margin: 0;
	}

	.wx-mono {
		font-family: var(--mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--muted);
	}

	.wx-skip {
		position: absolute;
		left: 16px;
		top: -60px;
		z-index: 200;
		background: var(--forest);
		color: var(--cream);
		padding: 10px 16px;
		border-radius: 99px;
		font-size: 13px;
	}
	.wx-skip:focus {
		top: 14px;
	}

	.wx-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.wx-eyebrow-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--forest);
		display: inline-block;
	}

	.wx-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		font-family: var(--sans);
		font-size: 14px;
		font-weight: 600;
		line-height: 1;
		min-height: 46px;
		padding: 0 20px;
		border-radius: 999px;
		border: 1px solid transparent;
		cursor: pointer;
		white-space: nowrap;
		transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1), background 0.2s ease,
			border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.wx-btn-dark {
		background: var(--forest);
		color: var(--cream);
		border-color: var(--forest);
	}
	.wx-page .wx-btn-dark {
		color: var(--cream);
	}
	.wx-btn-dark:hover {
		background: #0a2418;
		transform: translateY(-1px);
		box-shadow: 0 10px 24px -14px rgba(15, 46, 32, 0.7);
	}
	.wx-btn-ghost {
		background: transparent;
		color: var(--ink);
		border-color: var(--line);
	}
	.wx-page .wx-btn-ghost {
		color: var(--ink);
	}
	.wx-btn-ghost:hover {
		background: rgba(20, 20, 19, 0.04);
		border-color: rgba(20, 20, 19, 0.22);
	}

	/* ---------- Nav ---------- */
	.wx-nav {
		position: fixed;
		top: 16px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		z-index: 80;
		pointer-events: none;
		padding: 0 14px;
	}
	.wx-nav-pill {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 22px;
		max-width: calc(100vw - 28px);
		padding: 8px 10px 8px 14px;
		background: rgba(251, 248, 243, 0.9);
		backdrop-filter: blur(18px) saturate(160%);
		-webkit-backdrop-filter: blur(18px) saturate(160%);
		border: 1px solid rgba(20, 20, 19, 0.12);
		border-radius: 999px;
		box-shadow: 0 1px 2px rgba(20, 20, 19, 0.04), 0 10px 30px -18px rgba(20, 20, 19, 0.3);
	}
	.wx-nav-pill :global(.brand-logo) {
		--brand-ink: var(--ink);
		--brand-muted: var(--muted);
		flex: none;
	}
	.wx-nav-pill :global(.brand-logo .mark) {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		font-size: 15px;
	}
	.wx-links {
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.wx-links a {
		font-size: 12.5px;
		font-weight: 500;
		color: var(--muted);
		padding: 7px 11px;
		border-radius: 99px;
		transition: color 0.16s ease, background 0.16s ease;
	}
	.wx-links a:hover {
		color: var(--ink);
		background: rgba(20, 20, 19, 0.05);
	}
	.wx-seg {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 236px;
		padding: 3px;
		border-radius: 99px;
		background: var(--cream-2);
		border: 1px solid rgba(20, 20, 19, 0.08);
		flex: none;
	}
	.wx-seg-pill {
		position: absolute;
		top: 3px;
		left: 3px;
		width: calc(50% - 3px);
		height: calc(100% - 6px);
		border-radius: 99px;
		background: var(--cream);
		border: 1px solid rgba(20, 20, 19, 0.09);
		box-shadow: 0 1px 3px rgba(20, 20, 19, 0.08);
		transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.wx-seg-pill.mock {
		transform: translateX(100%);
	}
	.wx-seg button {
		position: relative;
		z-index: 1;
		font-family: var(--sans);
		font-size: 11.5px;
		font-weight: 600;
		color: var(--muted);
		background: transparent;
		border: 0;
		border-radius: 99px;
		padding: 8px 4px;
		min-height: 32px;
		cursor: pointer;
		transition: color 0.2s ease;
		white-space: nowrap;
	}
	.wx-seg button.on {
		color: var(--ink);
	}
	.wx-nav-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}
	.wx-btn-download {
		background: rgba(15, 46, 32, 0.06);
		border-color: var(--line);
		color: var(--ink);
		min-height: 38px;
		padding: 0 14px;
		font-size: 12.5px;
	}
	.wx-btn-download:hover {
		background: rgba(15, 46, 32, 0.12);
		transform: translateY(-1px);
	}
	.wx-login {
		font-size: 12.5px;
		font-weight: 500;
		color: var(--muted);
		padding: 8px 10px;
		border-radius: 99px;
	}
	.wx-login:hover {
		color: var(--ink);
	}
	.wx-nav-cta {
		min-height: 38px;
		padding: 0 16px;
		font-size: 12.5px;
	}
	.wx-burger {
		display: none;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
	}

	.wx-sheet-scrim {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: rgba(15, 46, 32, 0.24);
		backdrop-filter: blur(3px);
		border: 0;
		cursor: pointer;
	}
	.wx-sheet {
		position: fixed;
		top: 74px;
		left: 50%;
		transform: translateX(-50%);
		width: min(440px, calc(100vw - 28px));
		z-index: 90;
		background: var(--cream);
		border: 1px solid var(--line);
		border-radius: 24px;
		padding: 14px;
		box-shadow: 0 30px 60px -20px rgba(20, 20, 19, 0.35);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.wx-sheet-seg {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		background: var(--cream-2);
		border-radius: 14px;
		padding: 4px;
		margin-bottom: 8px;
	}
	.wx-sheet-seg button {
		font-family: var(--sans);
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		background: transparent;
		border: 0;
		border-radius: 10px;
		padding: 10px;
		cursor: pointer;
	}
	.wx-sheet-seg button.on {
		background: var(--cream);
		color: var(--ink);
		box-shadow: 0 1px 3px rgba(20, 20, 19, 0.08);
	}
	.wx-sheet > a {
		padding: 12px 10px;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 500;
		color: var(--ink);
	}
	.wx-sheet > a:hover {
		background: rgba(20, 20, 19, 0.04);
	}
	.wx-sheet-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 10px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}
	.wx-sheet-actions .wx-btn {
		flex: 1;
		font-size: 13px;
	}
	.wx-sheet-login {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
		padding: 10px 14px !important;
	}

	/* ---------- Hero ---------- */
	.wx-hero {
		position: relative;
		padding: clamp(122px, 13vw, 168px) 0 clamp(64px, 7vw, 88px);
		background:
			radial-gradient(980px 540px at 86% 10%, rgba(223, 240, 228, 0.78), transparent 66%),
			radial-gradient(800px 420px at 3% 4%, rgba(248, 226, 207, 0.42), transparent 66%),
			var(--cream);
		overflow: visible;
	}
	.wx-hero::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		opacity: 0.5;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.16'/%3E%3C/svg%3E");
		background-size: 160px 160px;
	}
	.wx-hero > .wx-wrap {
		position: relative;
		z-index: 1;
	}
	.wx-hero :global(*) {
		min-width: 0;
	}
	.wx-hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
		gap: clamp(30px, 4.4vw, 68px);
		align-items: center;
	}
	.wx-hero-copy {
		position: relative;
		padding-top: 8px;
	}
	.wx-hero-stamp {
		position: absolute;
		top: -18px;
		right: 4px;
		width: 118px;
		height: 118px;
		opacity: 0.5;
		pointer-events: none;
		z-index: 0;
	}
	.wx-hero-stamp .wx-orbit {
		width: 118px;
		height: 118px;
	}
	.wx-hero-stamp svg {
		width: 100%;
		height: 100%;
	}
	.wx-orbit {
		animation: wx-spin 34s linear infinite;
	}
	.wx-orbit svg {
		display: block;
		overflow: visible;
	}
	.wx-orbit-ring {
		fill: none;
		stroke: rgba(20, 20, 19, 0.16);
		stroke-width: 0.8;
	}
	.wx-orbit-dash {
		fill: none;
		stroke: rgba(20, 20, 19, 0.1);
		stroke-width: 0.8;
		stroke-dasharray: 2 6;
	}
	.wx-orbit-text {
		fill: var(--ink);
		font-family: var(--mono);
		font-size: 10px;
		letter-spacing: 2.4px;
	}
	.wx-orbit-star {
		fill: none;
		stroke: var(--forest);
		stroke-width: 1.1;
		stroke-linecap: round;
		opacity: 0.6;
	}
	@keyframes wx-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.wx-live-chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		z-index: 1;
		font-family: var(--mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--forest);
		background: rgba(251, 248, 243, 0.72);
		border: 1px solid rgba(15, 46, 32, 0.18);
		border-radius: 99px;
		padding: 7px 13px;
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
		backdrop-filter: blur(8px);
	}
	.wx-live-chip-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #2f9e63;
		box-shadow: 0 0 0 0 rgba(47, 158, 99, 0.45);
		animation: wx-pulse 2.2s ease-out infinite;
	}
	.wx-hero-copy h1 {
		font-size: clamp(2.95rem, 5.1vw, 4.7rem);
		line-height: 0.94;
		letter-spacing: -0.035em;
		margin: 24px 0 0;
		color: var(--ink);
	}
	.wx-hero-copy h1 em {
		font-style: italic;
		color: var(--forest);
	}
	.wx-h1-line {
		display: block;
	}
	.wx-lede {
		max-width: 46ch;
		margin-top: 24px;
		font-size: clamp(0.96rem, 1.1vw, 1.03rem);
		line-height: 1.65;
		color: var(--muted);
	}
	.wx-hero-cta {
		margin-top: 28px;
	}
	.wx-hero-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.wx-hero-proof {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px !important;
		font-family: var(--mono);
		font-size: 10.5px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.wx-proof-count {
		font-weight: 700;
		color: var(--ink);
	}
	.wx-proof-free {
		padding-left: 10px;
		border-left: 1px solid var(--line);
	}
	.wx-hero-art {
		position: relative;
		padding-top: 6px;
		will-change: transform;
	}
	.wx-hero-glow {
		position: absolute;
		inset: 2% -4% 8% -2%;
		background: radial-gradient(
			closest-side,
			rgba(6, 78, 59, 0.22),
			rgba(6, 78, 59, 0.08) 58%,
			transparent 78%
		);
		filter: blur(48px);
		pointer-events: none;
		z-index: 0;
	}
	.wx-hero-stage {
		position: relative;
		z-index: 1;
	}
	.wx-hero-frame {
		position: relative;
		transform: perspective(1500px) rotateY(-6deg) rotateX(4deg);
		transform-style: preserve-3d;
		padding: 9px;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.7);
		background: rgba(251, 248, 243, 0.68);
		backdrop-filter: blur(14px);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.9) inset,
			0 40px 70px -34px rgba(20, 20, 19, 0.4),
			0 12px 26px -18px rgba(15, 46, 32, 0.35);
	}
	@media (hover: hover) and (pointer: fine) and (min-width: 1081px) {
		.wx-hero-frame {
			will-change: transform;
		}
	}
	.wx-hero-screen {
		position: relative;
		overflow: hidden;
		border-radius: 12px;
		border: 1px solid rgba(20, 20, 19, 0.12);
		background: var(--cream);
	}
	.wx-hero-screen .wx-browser-bar {
		padding: 8px 12px;
	}
	.wx-hero-screen .wx-preview-stage {
		aspect-ratio: 2000 / 1250;
	}
	.wx-signal-card {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
		gap: 16px;
		align-items: center;
		margin-top: 8px;
		padding: 12px 14px 13px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(15, 46, 32, 0.9);
		backdrop-filter: blur(16px);
		box-shadow: 0 14px 28px -22px rgba(20, 20, 19, 0.5);
		color: #f4f1e8;
	}
	.wx-signal-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.wx-signal-dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #9ddfb3;
		box-shadow: 0 0 0 0 rgba(157, 223, 179, 0.5);
		animation: wx-pulse 2s ease-out infinite;
	}
	.wx-signal-q {
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.02em;
		color: rgba(244, 241, 232, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.wx-signal-tabs {
		display: flex;
		gap: 5px;
		margin-top: 9px;
	}
	.wx-signal-tabs button {
		flex: 1 1 0;
		padding: 5px 6px;
		border-radius: 7px;
		border: 1px solid rgba(244, 241, 232, 0.14);
		background: transparent;
		color: rgba(244, 241, 232, 0.62);
		font-family: var(--mono);
		font-size: 8.5px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	}
	.wx-signal-tabs button:hover:not(:disabled),
	.wx-signal-tabs button.on {
		color: #d8f3e1;
		background: rgba(157, 223, 179, 0.16);
		border-color: rgba(157, 223, 179, 0.4);
	}
	.wx-page .wx-hero .wx-signal-card .wx-signal-tabs button:hover:not(:disabled) {
		box-shadow: none !important;
	}
	.wx-signal-tabs button:focus-visible {
		outline: 2px solid #9ddfb3;
		outline-offset: 1px;
	}
	.wx-signal-meters {
		display: grid;
		gap: 9px;
	}
	.wx-signal-meter-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(244, 241, 232, 0.55);
	}
	.wx-signal-meter-head b {
		font-size: 10px;
		font-weight: 700;
		color: #d8f3e1;
		letter-spacing: 0.02em;
	}
	.wx-signal-bar {
		display: block;
		height: 4px;
		margin-top: 5px;
		border-radius: 99px;
		background: rgba(244, 241, 232, 0.14);
		overflow: hidden;
	}
	.wx-signal-bar i {
		display: block;
		height: 100%;
		width: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #4caf7d, #9ddfb3);
		transform-origin: left center;
		transition: transform 0.55s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.wx-hero-art > .wx-preview-chips {
		margin-top: 26px;
	}
	.wx-preview {
		position: relative;
		border-radius: 22px;
		overflow: hidden;
		background: var(--cream);
		border: 1px solid rgba(20, 20, 19, 0.14);
		box-shadow: 0 2px 4px rgba(20, 20, 19, 0.04), 0 40px 80px -36px rgba(20, 20, 19, 0.38);
	}
	.wx-browser-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		border-bottom: 1px solid rgba(20, 20, 19, 0.09);
		background: #f6f1e8;
	}
	.wx-browser-dots {
		display: inline-flex;
		gap: 5px;
	}
	.wx-browser-dots i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(20, 20, 19, 0.16);
	}
	.wx-browser-url {
		font-family: var(--mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--muted);
		background: rgba(20, 20, 19, 0.05);
		padding: 4px 12px;
		border-radius: 99px;
	}
	.wx-browser-tag {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--forest);
		background: var(--mint);
		padding: 4px 10px;
		border-radius: 99px;
	}
	.wx-preview-stage {
		position: relative;
		width: 100%;
		overflow: hidden;
		background: var(--cream-2);
		aspect-ratio: 2000 / 1250;
	}
	.wx-preview-stage.live {
		aspect-ratio: 1440 / 900;
		background: #f4f2ed;
	}
	.wx-preview-stage.live.mobile-frame {
		background: radial-gradient(circle at 50% 48%, #fbf8f1 0%, #ece7dd 100%);
	}
	.wx-shot {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
		transition: opacity 0.55s ease, transform 0.9s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.wx-preview-toolbar {
		display: flex;
		align-items: stretch;
		background: #f6f1e8;
		border-bottom: 1px solid rgba(20, 20, 19, 0.09);
	}
	.wx-page-tabs {
		display: flex;
		align-items: center;
		gap: 2px;
		flex: 1 1 auto;
		min-width: 0;
		padding: 0 10px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.wx-page-tabs::-webkit-scrollbar {
		display: none;
	}
	.wx-page-tabs button {
		flex: 0 0 auto;
		padding: 9px 12px 8px;
		border: 0;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--muted);
		font-family: var(--mono);
		font-size: 10px;
		font-weight: 650;
		line-height: 1;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.wx-page-tabs button:hover {
		color: var(--ink);
	}
	.wx-page-tabs button.on {
		color: var(--forest);
		border-bottom-color: var(--forest);
	}
	.wx-page-tabs button:focus-visible {
		outline: 2px solid var(--forest);
		outline-offset: -2px;
	}
	.wx-device-toggle {
		display: flex;
		align-items: center;
		gap: 2px;
		flex: 0 0 auto;
		margin: 5px 6px 5px 8px;
		padding-left: 8px;
		border-left: 1px solid rgba(20, 20, 19, 0.09);
	}
	.wx-device-toggle button {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 8px;
		border: 1px solid transparent;
		border-radius: 7px;
		background: transparent;
		color: var(--muted);
		font-family: var(--mono);
		font-size: 9px;
		font-weight: 650;
		line-height: 1;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
	}
	.wx-device-toggle button:hover {
		color: var(--ink);
	}
	.wx-device-toggle button.on {
		color: var(--forest);
		background: var(--mint);
		border-color: rgba(15, 46, 32, 0.12);
	}
	.wx-device-toggle button:focus-visible {
		outline: 2px solid var(--forest);
		outline-offset: 1px;
	}
	.wx-device-toggle svg {
		width: 12px;
		height: 12px;
		flex: 0 0 auto;
	}
	.wx-preview-disclaimer {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: 0;
		padding: 8px 14px 9px;
		background: #fbf8f1;
		border-bottom: 1px solid rgba(20, 20, 19, 0.08);
		color: var(--muted);
		font-size: 11px;
		line-height: 1.45;
	}
	.wx-preview-disclaimer strong {
		color: var(--ink);
		font-weight: 700;
	}
	.wx-preview-disclaimer-dot {
		flex: 0 0 auto;
		width: 6px;
		height: 6px;
		margin-top: 5px;
		border-radius: 50%;
		background: var(--forest);
	}
	.wx-real {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: #f4f2ed;
	}
	.wx-real iframe {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
		width: 1440px;
		height: 900px;
		border: 0;
		background: #f4f2ed;
		transform-origin: top left;
		pointer-events: none;
	}
	@media (min-width: 761px) {
		.wx-real.phone {
			inset: auto;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			border-radius: 30px;
			box-shadow: 0 0 0 7px #1f1f1d, 0 30px 64px -20px rgba(20, 20, 19, 0.42);
		}
	}
	.wx-hotspot {
		position: absolute;
		z-index: 2;
		border: 0;
		border-radius: 9px;
		background: transparent;
		cursor: pointer;
		transition: background 0.15s ease, box-shadow 0.15s ease;
	}
	.wx-hotspot:hover,
	.wx-hotspot:focus-visible {
		background: rgba(47, 107, 246, 0.14);
		box-shadow: inset 0 0 0 1px rgba(47, 107, 246, 0.45);
		outline: none;
	}
	.wx-preview-loading {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 0 12px;
		text-align: center;
		background: rgba(246, 241, 232, 0.92);
		color: var(--muted);
		font-family: var(--mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.wx-preview-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(20, 20, 19, 0.16);
		border-top-color: var(--forest);
		border-radius: 50%;
		animation: wx-spin 0.8s linear infinite;
	}
	@media (max-width: 760px) {
		.wx-preview-stage.live {
			aspect-ratio: auto;
			height: 430px;
		}
		.wx-page-tabs {
			padding: 0 8px;
		}
		.wx-page-tabs button {
			padding: 9px 9px 8px;
			font-size: 9px;
		}
		.wx-device-toggle {
			display: none;
		}
		.wx-browser-tag {
			display: none;
		}
		.wx-preview-disclaimer {
			padding: 7px 12px 8px;
			font-size: 10px;
		}
	}
	.wx-shot-note {
		position: absolute;
		left: 14px;
		bottom: 14px;
		z-index: 2;
		font-family: var(--mono);
		font-size: 9px;
		letter-spacing: 0.06em;
		color: rgba(251, 248, 243, 0.85);
		background: rgba(20, 20, 19, 0.62);
		backdrop-filter: blur(8px);
		padding: 6px 10px;
		border-radius: 99px;
	}
	.wx-preview-chips {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
	}
	.wx-preview-chips li {
		font-family: var(--mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		border: 1px solid var(--line);
		border-radius: 99px;
		padding: 6px 11px;
		background: rgba(251, 248, 243, 0.6);
	}

	/* ---------- Telemetry tape ---------- */
	.wx-telemetry {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 28px 2px 0;
		padding: 11px 16px;
		border-radius: 12px;
		background: var(--ink);
		color: var(--cream);
		transform: rotate(-2deg);
		box-shadow: 0 22px 44px -24px rgba(20, 20, 19, 0.7);
		overflow: hidden;
		pointer-events: none;
	}
	.wx-telemetry-live {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.18em;
		color: rgba(251, 248, 243, 0.6);
		white-space: nowrap;
	}
	.wx-telemetry-live i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #9ddfb3;
		box-shadow: 0 0 0 0 rgba(157, 223, 179, 0.5);
		animation: wx-pulse 2s ease-out infinite;
	}
	@keyframes wx-pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(157, 223, 179, 0.45);
		}
		70% {
			box-shadow: 0 0 0 7px rgba(157, 223, 179, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(157, 223, 179, 0);
		}
	}
	.wx-wave {
		flex: none;
		fill: #9ddfb3;
		opacity: 0.9;
	}
	.wx-wave rect {
		animation: wx-eq 1.1s ease-in-out infinite alternate;
		transform-box: fill-box;
		transform-origin: center;
	}
	.wx-wave rect:nth-child(3n) {
		animation-delay: 0.18s;
	}
	.wx-wave rect:nth-child(3n + 1) {
		animation-delay: 0.36s;
	}
	.wx-wave rect:nth-child(4n) {
		animation-delay: 0.52s;
	}
	@keyframes wx-eq {
		from {
			transform: scaleY(0.5);
		}
		to {
			transform: scaleY(1.15);
		}
	}
	.wx-telemetry-type {
		flex: 1 1 auto;
		min-width: 0;
		font-family: var(--mono);
		font-size: 10px;
		letter-spacing: 0.01em;
		color: var(--cream);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.wx-caret {
		display: inline-block;
		width: 7px;
		height: 1.05em;
		background: #9ddfb3;
		margin-left: 4px;
		vertical-align: -0.15em;
		animation: wx-blink 1s steps(2, start) infinite;
	}
	@keyframes wx-blink {
		50% {
			opacity: 0;
		}
	}
	.wx-telemetry-stamp {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.18em;
		color: rgba(251, 248, 243, 0.45);
		white-space: nowrap;
	}

	@media (max-width: 1220px) {
		.wx-links {
			display: none;
		}
	}
	@media (max-width: 900px) {
		.wx-seg {
			display: none;
		}
		.wx-burger {
			display: flex;
		}
		.wx-nav-cta {
			display: none;
		}
	}
	@media (max-width: 1080px) {
		.wx-hero-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 44px;
		}
		.wx-hero-copy {
			text-align: center;
			max-width: 720px;
			margin-inline: auto;
			padding-top: 0;
		}
		.wx-hero-stamp {
			display: none;
		}
		.wx-hero-copy h1 {
			font-size: clamp(3rem, 8vw, 5.2rem);
		}
		.wx-lede {
			margin-inline: auto;
		}
		.wx-hero-actions,
		.wx-hero-proof {
			justify-content: center;
		}
		.wx-hero-art {
			width: min(720px, 100%);
			margin-inline: auto;
			padding-top: 0;
		}
		.wx-hero-frame {
			transform: none;
		}
		.wx-hero-art > .wx-preview-chips {
			justify-content: center;
		}
	}
	@media (max-width: 760px) {
		.wx-nav-pill {
			width: 100%;
			justify-content: space-between;
		}
		.wx-btn-download {
			display: none;
		}
		.wx-login {
			display: none;
		}
		.wx-hero {
			padding-top: 112px;
			padding-bottom: 52px;
		}
		.wx-hero-grid {
			gap: 34px;
		}
		.wx-hero-copy h1 {
			font-size: clamp(2.7rem, 11.4vw, 3.9rem);
		}
		.wx-live-chip {
			font-size: 9px;
			letter-spacing: 0.1em;
			padding: 6px 11px;
		}
		.wx-lede {
			font-size: 0.95rem;
		}
		.wx-hero-proof {
			font-size: 9.5px;
			gap: 6px;
		}
		.wx-proof-free {
			flex-basis: 100%;
			padding-left: 0;
			border-left: 0;
		}
		.wx-signal-card {
			width: auto;
			margin: 8px;
			padding: 11px 12px 12px;
		}
		.wx-signal-q {
			font-size: 8.5px;
		}
		.wx-telemetry {
			gap: 9px;
			margin: 16px 0 0;
			padding: 9px 12px;
		}
		.wx-telemetry-live {
			font-size: 8px;
			letter-spacing: 0.12em;
		}
		.wx-telemetry-type {
			font-size: 9px;
		}
		.wx-telemetry .wx-wave,
		.wx-telemetry-stamp {
			display: none;
		}
		.wx-hero-art > .wx-preview-chips {
			margin-top: 24px;
		}
	}
	@media (max-width: 640px) {
		.wx-signal-card {
			grid-template-columns: minmax(0, 1fr);
			gap: 12px;
		}
	}
	@media (max-width: 480px) {
		.wx-preview-chips li:nth-child(3) {
			display: none;
		}
		.wx-preview-stage {
			min-height: 260px;
		}
	}
	@media (max-width: 360px) {
		.wx-preview-stage {
			min-height: 272px;
		}
		.wx-stage-card .wx-stage-paper {
			min-height: 435px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wx-orbit,
		.wx-wave rect,
		.wx-caret,
		.wx-live-chip-dot,
		.wx-signal-dot,
		.wx-telemetry-live i {
			animation: none !important;
		}
		.wx-signal-bar i {
			transition: none !important;
		}
	}
	/* ---------- Forest benchmark scoop ---------- */
	.wx-scoop {
		position: relative;
		z-index: 5;
		margin-top: -22px;
		padding: clamp(78px, 10vw, 120px) 0 clamp(80px, 10vw, 118px);
		background: var(--forest);
		color: #f4f1e8;
		border-radius: 48px 48px 0 0;
		overflow: clip;
	}
	.wx-scoop::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(900px 420px at 82% 0%, rgba(157, 223, 179, 0.14), transparent 62%),
			radial-gradient(620px 320px at 6% 100%, rgba(248, 226, 207, 0.09), transparent 65%);
		pointer-events: none;
	}
	.wx-scoop > .wx-wrap {
		position: relative;
	}
	.wx-scoop-head {
		max-width: 780px;
		margin-bottom: clamp(34px, 5vw, 54px);
	}
	.wx-eyebrow-light {
		color: rgba(244, 241, 232, 0.58);
	}
	.wx-eyebrow-light .wx-eyebrow-dot {
		background: #9ddfb3;
	}
	.wx-scoop-head h2 {
		margin-top: 16px;
		font-size: clamp(2.4rem, 5vw, 4.4rem);
		color: #f4f1e8;
	}
	.wx-scoop-head h2 em {
		font-style: italic;
		color: #9ddfb3;
	}
	.wx-scoop-sub {
		margin-top: 18px;
		max-width: 54ch;
		font-size: 0.98rem;
		line-height: 1.65;
		color: rgba(244, 241, 232, 0.65);
	}
	.wx-bench-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.wx-bench {
		display: flex;
		flex-direction: column;
		border-radius: 24px;
		padding: clamp(22px, 3vw, 32px);
		border: 1px solid transparent;
	}
	.wx-bench-manual {
		background: #e8e2d4;
		color: var(--ink);
		border-color: rgba(20, 20, 19, 0.06);
	}
	.wx-bench-live {
		background: #f4f7ed;
		color: var(--ink);
		border-color: rgba(157, 223, 179, 0.5);
		box-shadow: 0 30px 60px -34px rgba(0, 0, 0, 0.5);
	}
	.wx-bench-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.wx-bench-kicker {
		font-family: var(--mono);
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.wx-bench-badge {
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--mint);
		background: var(--forest);
		padding: 5px 10px;
		border-radius: 99px;
		white-space: nowrap;
	}
	.wx-bench-index {
		font-size: 10px;
		color: var(--muted);
	}
	.wx-bench h3 {
		margin: 16px 0 8px;
		font-size: clamp(1.9rem, 3vw, 2.7rem);
	}
	.wx-bench-copy {
		font-size: 0.86rem;
		line-height: 1.55;
		color: var(--muted);
		max-width: 40ch;
	}
	.wx-metrics {
		list-style: none;
		margin: 24px 0 0;
		padding: 0;
		display: grid;
		gap: 17px;
	}
	.wx-metric-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 14px;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.wx-metric-head b {
		font-family: var(--serif);
		font-weight: 400;
		font-size: 1.25rem;
		letter-spacing: -0.02em;
		color: var(--ink);
		white-space: nowrap;
	}
	.wx-meter {
		height: 5px;
		margin: 8px 0 6px;
		border-radius: 99px;
		background: rgba(20, 20, 19, 0.1);
		overflow: hidden;
	}
	.wx-meter i {
		display: block;
		width: 0;
		height: 100%;
		border-radius: inherit;
		background: var(--forest);
		transition: width 1.15s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.wx-bench-manual .wx-meter i {
		background: #918a79;
	}
	.wx-bench:global(.in) .wx-meter i {
		width: var(--pct);
	}
	.wx-bench:global(.in) .wx-metrics li:nth-child(2) .wx-meter i {
		transition-delay: 0.1s;
	}
	.wx-bench:global(.in) .wx-metrics li:nth-child(3) .wx-meter i {
		transition-delay: 0.2s;
	}
	.wx-metric-note {
		display: block;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--muted);
	}
	.wx-bench-foot {
		margin-top: auto !important;
		padding-top: 22px;
		font-family: var(--serif);
		font-size: 1.1rem;
		line-height: 1.3;
		color: var(--ink);
	}
	.wx-bench-live .wx-bench-foot {
		color: var(--forest);
	}
	.wx-schedule {
		margin-top: 22px;
		padding: 13px 15px;
		border-radius: 16px;
		background: rgba(15, 46, 32, 0.05);
		border: 1px solid rgba(15, 46, 32, 0.1);
	}
	.wx-schedule-label {
		display: block;
		font-size: 8px;
		color: var(--forest);
		margin-bottom: 4px;
	}
	.wx-schedule-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 0;
		font-size: 0.76rem;
		color: var(--muted);
	}
	.wx-schedule-row + .wx-schedule-row {
		border-top: 1px solid rgba(20, 20, 19, 0.07);
	}
	.wx-schedule-day {
		width: 66px;
		flex: none;
		font-weight: 600;
		color: var(--ink);
	}
	.wx-schedule-dot {
		width: 7px;
		height: 7px;
		margin-left: auto;
		border-radius: 50%;
		background: rgba(20, 20, 19, 0.16);
		flex: none;
	}
	.wx-schedule-dot.on {
		background: var(--forest);
	}

	/* ---------- Pinned method ---------- */
	.wx-method {
		position: relative;
		height: 320vh;
		background: var(--cream);
	}
	.wx-pin-hold {
		position: sticky;
		top: 0;
		height: 100vh;
		display: flex;
		align-items: center;
		padding-top: 82px;
		overflow: hidden;
	}
	.wx-pin-head {
		max-width: 760px;
		margin-bottom: clamp(18px, 3vw, 30px);
	}
	.wx-pin-head h2 {
		margin-top: 12px;
		font-size: clamp(2.1rem, 4.2vw, 3.6rem);
	}
	.wx-pin-head h2 em {
		font-style: italic;
		color: var(--forest);
	}
	.wx-pin-grid {
		display: grid;
		grid-template-columns: 236px minmax(0, 1fr) 278px;
		gap: clamp(16px, 3vw, 44px);
		align-items: center;
	}
	.wx-steps {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-left: 26px;
	}
	.wx-steps-track {
		position: absolute;
		left: 9px;
		top: 18px;
		bottom: 18px;
		width: 1px;
		background: rgba(20, 20, 19, 0.14);
		overflow: hidden;
	}
	.wx-steps-fill {
		position: absolute;
		inset: 0;
		background: var(--forest);
		transform-origin: top center;
		transition: transform 0.12s linear;
	}
	.wx-step {
		position: relative;
		display: flex;
		gap: 12px;
		width: 100%;
		text-align: left;
		font-family: var(--sans);
		color: var(--muted);
		background: transparent;
		border: 0;
		border-radius: 14px;
		padding: 13px 8px 14px 10px;
		cursor: pointer;
		transition: background 0.3s ease, color 0.3s ease;
	}
	.wx-step::before {
		content: '';
		position: absolute;
		left: -21px;
		top: 20px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--cream);
		border: 1px solid rgba(20, 20, 19, 0.24);
		transition: background 0.25s ease, border-color 0.25s ease;
	}
	.wx-step.on {
		color: var(--ink);
		background: rgba(20, 20, 19, 0.035);
	}
	.wx-step.on::before {
		background: var(--forest);
		border-color: var(--forest);
	}
	.wx-step-kicker {
		flex: none;
		padding-top: 3px;
		font-size: 9px;
		color: var(--muted);
	}
	.wx-step.on .wx-step-kicker {
		color: var(--forest);
	}
	.wx-step-main b {
		display: block;
		font-size: 0.98rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.wx-step-line {
		display: block;
		margin-top: 4px;
		font-size: 0.76rem;
		line-height: 1.45;
		color: var(--muted);
	}
	.wx-step-long {
		display: none;
		margin-top: 7px;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--muted);
	}
	.wx-phone-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}
	.wx-phone {
		position: relative;
		width: 258px;
		height: 506px;
		padding: 8px;
		border-radius: 40px;
		background: #161614;
		box-shadow: 0 44px 80px -36px rgba(20, 20, 19, 0.55),
			inset 0 0 0 1px rgba(255, 255, 255, 0.16);
	}
	.wx-phone-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 14px 8px;
		gap: 8px;
	}
	.wx-phone-brand {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: rgba(251, 248, 243, 0.85);
	}
	.wx-phone-demo {
		font-family: var(--mono);
		font-size: 7px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(251, 248, 243, 0.42);
	}
	.wx-phone-screen {
		position: relative;
		height: calc(100% - 26px);
		border-radius: 33px;
		overflow: hidden;
		background: var(--cream);
	}
	.wx-screen {
		position: absolute;
		inset: 0;
		opacity: 0;
		visibility: hidden;
		transform: translateY(14px) scale(0.985);
		transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
			visibility 0s linear 0.4s;
	}
	.wx-screen.on {
		opacity: 1;
		visibility: visible;
		transform: none;
		transition-delay: 0.05s;
	}
	.wx-screen-shot {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
	}
	.wx-phone-caption {
		font-family: var(--mono);
		font-size: 8px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.wx-copy {
		position: relative;
		min-height: 320px;
	}
	.wx-copy-pane {
		position: absolute;
		inset: 0;
		opacity: 0;
		visibility: hidden;
		transform: translateY(12px);
		transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
			visibility 0s linear 0.4s;
	}
	.wx-copy-pane.on {
		opacity: 1;
		visibility: visible;
		transform: none;
		transition-delay: 0.06s;
	}
	.wx-copy-kicker {
		color: var(--muted);
		font-size: 9px;
	}
	.wx-copy h3 {
		margin: 14px 0 12px;
		font-size: clamp(2rem, 3vw, 2.6rem);
	}
	.wx-copy p {
		font-size: 0.88rem;
		line-height: 1.65;
		color: var(--muted);
		max-width: 34ch;
	}
	.wx-copy-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 24px;
		padding-top: 13px;
		border-top: 1px solid var(--line);
		font-size: 9.5px;
		color: var(--muted);
	}

	/* ---------- Stage bento ---------- */
	.wx-stages {
		padding: clamp(76px, 9vw, 118px) 0;
		background: var(--cream-2);
	}
	.wx-sec-head {
		max-width: 740px;
		margin-bottom: clamp(30px, 4vw, 48px);
	}
	.wx-sec-head h2 {
		margin-top: 14px;
		font-size: clamp(2.2rem, 4.4vw, 3.8rem);
	}
	.wx-sec-head h2 em {
		font-style: italic;
		color: var(--forest);
	}
	.wx-sec-sub {
		margin-top: 16px;
		max-width: 54ch;
		font-size: 0.96rem;
		line-height: 1.65;
		color: var(--muted);
	}
	.wx-stage-card {
		display: grid;
		grid-template-columns: 300px minmax(0, 1fr);
		background: var(--cream);
		border: 1px solid var(--line);
		border-radius: 28px;
		overflow: hidden;
		box-shadow: 0 30px 60px -46px rgba(20, 20, 19, 0.45);
	}
	.wx-stage-side {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: clamp(22px, 3vw, 32px);
		border-right: 1px solid var(--line);
		background: rgba(244, 238, 227, 0.45);
	}
	.wx-kicker {
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.wx-stage-tab {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 13px 14px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: transparent;
		font-family: var(--sans);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--muted);
		text-align: left;
		cursor: pointer;
		transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
	}
	.wx-stage-tab > span:first-child {
		white-space: nowrap;
	}
	.wx-stage-tab small {
		font-family: var(--mono);
		font-size: 7.5px;
		font-weight: 400;
		letter-spacing: 0.03em;
		color: var(--muted);
		white-space: nowrap;
	}
	.wx-stage-tab.on {
		background: var(--cream);
		color: var(--ink);
		border-color: var(--line);
		box-shadow: 0 2px 6px rgba(20, 20, 19, 0.05);
	}
	.wx-stage-tab.on small {
		color: var(--forest);
	}
	.wx-stage-aside {
		margin-top: auto !important;
		padding-top: 22px;
		font-size: 0.76rem;
		line-height: 1.55;
		color: var(--muted);
	}
	.wx-stage-paper {
		display: flex;
		flex-direction: column;
		min-height: 356px;
		padding: clamp(26px, 4vw, 46px);
	}
	.wx-stage-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.wx-stage-tag {
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--forest);
		background: var(--mint);
		padding: 6px 10px;
		border-radius: 99px;
	}
	.wx-stage-marks {
		font-size: 9px;
		color: var(--muted);
	}
	.wx-stage-content {
		display: flex;
		flex: 1;
		flex-direction: column;
		margin-top: 26px;
	}
	.wx-stage-q {
		max-width: 46ch;
		font-family: var(--serif);
		font-size: clamp(1.5rem, 2.6vw, 2.2rem);
		line-height: 1.28;
		letter-spacing: -0.015em;
		color: var(--ink);
	}
	.wx-stage-topics {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 22px;
	}
	.wx-stage-topics span {
		font-size: 10.5px;
		color: var(--muted);
		border: 1px solid var(--line);
		padding: 5px 10px;
		border-radius: 99px;
	}
	.wx-stage-bottom {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-top: auto;
		padding-top: 30px;
	}
	.wx-diff {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.wx-diff-dots {
		display: flex;
		gap: 5px;
	}
	.wx-diff-dots i {
		width: 22px;
		height: 4px;
		border-radius: 99px;
		background: rgba(20, 20, 19, 0.12);
		transition: background 0.25s ease;
	}
	.wx-diff-dots i.on {
		background: var(--forest);
	}
	.wx-stage-time {
		font-size: 8.5px;
		color: var(--muted);
		white-space: nowrap;
	}
	.wx-stage-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 26px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
		font-size: 9.5px;
		color: var(--muted);
	}

	@media (max-width: 1080px) {
		.wx-pin-grid {
			grid-template-columns: 210px minmax(0, 1fr) 230px;
			gap: 22px;
		}
		.wx-phone {
			width: 236px;
			height: 462px;
		}
		.wx-copy {
			min-height: 290px;
		}
		.wx-stage-card {
			grid-template-columns: 260px minmax(0, 1fr);
		}
	}
	@media (max-width: 960px) {
		.wx-bench-grid {
			grid-template-columns: 1fr;
		}
		.wx-stage-card {
			grid-template-columns: 1fr;
		}
		.wx-stage-side {
			border-right: 0;
			border-bottom: 1px solid var(--line);
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			gap: 6px;
			align-items: center;
		}
		.wx-stage-side .wx-kicker,
		.wx-stage-aside {
			grid-column: 1 / -1;
		}
		.wx-stage-tab {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}
		.wx-stage-tab small {
			white-space: normal;
		}
	}
	@media (max-width: 900px) {
		.wx-stage-paper {
			min-height: 374px;
		}
		.wx-method {
			height: auto;
		}
		.wx-pin-hold {
			position: static;
			height: auto;
			padding: 86px 0 70px;
			overflow: visible;
		}
		.wx-pin-head {
			margin-bottom: 26px;
		}
		.wx-pin-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 30px;
		}
		.wx-steps {
			order: 1;
			padding-left: 0;
		}
		.wx-steps-track,
		.wx-step::before {
			display: none;
		}
		.wx-step {
			padding: 14px 4px;
			border-top: 1px solid var(--line);
		}
		.wx-step:last-child {
			border-bottom: 1px solid var(--line);
		}
		.wx-step-long {
			display: block;
		}
		.wx-phone-wrap {
			order: 2;
		}
		.wx-copy {
			display: none;
		}
	}
	@media (max-width: 700px) {
		.wx-scoop {
			border-radius: 32px 32px 0 0;
			padding-top: 64px;
		}
		.wx-bench-grid {
			gap: 12px;
		}
		.wx-bench {
			padding: 22px;
			border-radius: 20px;
		}
		.wx-stage-paper {
			min-height: 374px;
			padding: 22px;
		}
		.wx-stage-q {
			font-size: 1.4rem;
		}
		.wx-stage-bottom {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}
		.wx-stage-side {
			grid-template-columns: 1fr;
			padding: 18px;
		}
		.wx-stage-tab {
			flex-direction: row;
			align-items: center;
		}
	}
	@media (max-width: 560px) {
		.wx-scoop {
			padding-top: 56px;
			padding-bottom: 64px;
		}
		.wx-scoop-head h2 {
			font-size: 2.05rem;
		}
		.wx-bench h3 {
			font-size: 1.75rem;
		}
		.wx-phone {
			width: 244px;
			height: 478px;
		}
		.wx-metric-head b {
			font-size: 1.12rem;
		}
		.wx-schedule-row {
			font-size: 0.7rem;
			gap: 8px;
		}
		.wx-schedule-day {
			width: 56px;
		}
		.wx-stage-paper {
			padding: 18px;
		}
		.wx-stage-footer {
			font-size: 8.5px;
		}
	}
	@media (max-height: 800px) and (min-width: 901px) {
		.wx-pin-hold {
			padding-top: 74px;
		}
		.wx-pin-head {
			margin-bottom: 10px;
		}
		.wx-pin-head h2 {
			font-size: 2.4rem;
		}
		.wx-phone {
			width: 232px;
			height: 440px;
		}
		.wx-screen {
			padding: 14px 13px;
			gap: 8px;
		}
		.wx-copy {
			min-height: 280px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wx-screen,
		.wx-copy-pane {
			transition: none;
		}
		.wx-meter i {
			transition: none;
		}
		.wx-method {
			height: auto;
		}
		.wx-pin-hold {
			position: static;
			height: auto;
			padding: 96px 0 74px;
			overflow: visible;
		}
		.wx-pin-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 30px;
		}
		.wx-steps {
			order: 1;
			padding-left: 0;
		}
		.wx-steps-track,
		.wx-step::before {
			display: none;
		}
		.wx-step {
			padding: 14px 4px;
			border-top: 1px solid var(--line);
		}
		.wx-step:last-child {
			border-bottom: 1px solid var(--line);
		}
		.wx-step-long {
			display: block;
		}
		.wx-phone-wrap {
			order: 2;
		}
		.wx-copy {
			display: none;
		}
	}
	/* ---------- Playbook masonry ---------- */
	.wx-notes {
		padding: clamp(76px, 9vw, 118px) 0;
		background: var(--cream);
	}
	.wx-notes-head {
		max-width: 720px;
	}
	.wx-masonry {
		columns: 3;
		column-gap: 16px;
	}
	.wx-note {
		display: flex;
		flex-direction: column;
		min-height: 208px;
		margin: 0 0 16px;
		padding: 24px;
		break-inside: avoid;
		border-radius: 22px;
		border: 1px solid rgba(20, 20, 19, 0.07);
		color: var(--ink);
		box-shadow: 0 2px 5px rgba(20, 20, 19, 0.03);
		transition: box-shadow 0.25s ease;
	}
	.wx-note:hover {
		box-shadow: 0 18px 40px -24px rgba(20, 20, 19, 0.35);
	}
	.wx-note-peach {
		background: var(--peach);
	}
	.wx-note-lav {
		background: var(--lav);
	}
	.wx-note-sage {
		background: var(--sage);
	}
	.wx-note-butter {
		background: var(--butter);
	}
	.wx-note-free {
		background: var(--forest);
		color: var(--cream);
		border-color: rgba(15, 46, 32, 0.4);
	}
	.wx-note-library {
		background: var(--cream-3);
	}
	.wx-note-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.wx-note-tag {
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(20, 20, 19, 0.55);
	}
	.wx-note-free .wx-note-tag {
		color: rgba(251, 248, 243, 0.55);
	}
	.wx-note-pill {
		font-family: var(--mono);
		font-size: 8px;
		letter-spacing: 0.04em;
		padding: 5px 9px;
		border-radius: 99px;
		background: rgba(255, 255, 255, 0.55);
		border: 1px solid rgba(20, 20, 19, 0.1);
		white-space: nowrap;
	}
	.wx-note-free .wx-note-pill {
		background: rgba(251, 248, 243, 0.1);
		border-color: rgba(251, 248, 243, 0.18);
		color: rgba(251, 248, 243, 0.8);
	}
	.wx-note-quote {
		margin-top: 22px;
		font-size: clamp(1.35rem, 2vw, 1.65rem);
		line-height: 1.14;
		letter-spacing: -0.02em;
	}
	.wx-note-copy {
		margin-top: 11px;
		font-size: 0.8rem;
		line-height: 1.55;
		color: rgba(20, 20, 19, 0.62);
	}
	.wx-note-free .wx-note-copy {
		color: rgba(251, 248, 243, 0.62);
	}
	.wx-note-link {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-top: auto;
		padding-top: 22px;
		font-size: 11px;
		font-weight: 600;
		color: var(--forest);
	}
	.wx-note-link span {
		transition: transform 0.25s ease;
	}
	.wx-note:hover .wx-note-link span {
		transform: translateX(3px);
	}
	.wx-note-free .wx-note-link {
		color: #9ddfb3;
	}
	.wx-free-num {
		margin-top: 20px;
		font-size: clamp(3.1rem, 5vw, 4.4rem);
		line-height: 0.9;
	}
	.wx-note-free .wx-free-num {
		color: #9ddfb3;
	}

	/* ---------- FAQ ---------- */
	.wx-faq {
		padding: clamp(76px, 9vw, 118px) 0;
		background: var(--cream);
		border-top: 1px solid var(--line);
	}
	.wx-faq-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		gap: clamp(30px, 5vw, 72px);
		align-items: start;
	}
	.wx-faq-left {
		position: sticky;
		top: 110px;
	}
	.wx-faq-left h2 {
		margin-top: 14px;
		font-size: clamp(2.4rem, 4.6vw, 4rem);
	}
	.wx-faq-left h2 em {
		font-style: italic;
		color: var(--forest);
	}
	.wx-faq-intro {
		margin-top: 18px;
		max-width: 40ch;
		font-size: 0.94rem;
		line-height: 1.65;
		color: var(--muted);
	}
	.wx-faq-bubble {
		position: relative;
		margin-top: 30px;
		height: 246px;
		border-radius: 22px;
		background: var(--cream-2);
		border: 1px solid var(--line);
		overflow: hidden;
	}
	.wx-faq-pane {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		gap: 11px;
		padding: 24px;
		opacity: 0;
		visibility: hidden;
		transform: translateY(10px);
		transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
			visibility 0s linear 0.35s;
	}
	.wx-faq-pane.on {
		opacity: 1;
		visibility: visible;
		transform: none;
		transition-delay: 0.04s;
	}
	.wx-faq-tag {
		align-self: flex-start;
		font-size: 8px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--forest);
		background: var(--mint);
		padding: 5px 9px;
		border-radius: 99px;
	}
	.wx-faq-pane p {
		font-size: 0.9rem;
		line-height: 1.6;
		color: var(--ink);
		max-width: 44ch;
	}
	.wx-faq-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: auto;
		font-size: 11px;
		font-weight: 600;
		color: var(--forest);
	}
	.wx-faq-list {
		position: relative;
		display: flex;
		flex-direction: column;
	}
	.wx-faq-pill {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 0;
		border-radius: 14px;
		background: var(--cream-2);
		opacity: 0;
		transform: translateY(var(--fy, 0px));
		transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), height 0.35s ease,
			opacity 0.25s ease;
		pointer-events: none;
	}
	.wx-faq-pill.ready {
		height: var(--fh, 64px);
		opacity: 1;
	}
	.wx-faq-list > div:first-of-type .wx-faq-q {
		border-top: 1px solid var(--line);
	}
	.wx-faq-q {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		width: 100%;
		min-height: 64px;
		padding: 18px;
		text-align: left;
		font-family: var(--sans);
		font-size: clamp(0.95rem, 1.4vw, 1.06rem);
		font-weight: 500;
		line-height: 1.35;
		color: var(--ink);
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--line);
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.wx-faq-q > span:first-child {
		max-width: 42ch;
	}
	.wx-faq-q.on {
		color: var(--forest);
	}
	.wx-faq-plus {
		flex: none;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 1px solid var(--line);
		border-radius: 50%;
		font-size: 14px;
		line-height: 1;
		color: var(--muted);
		transition: transform 0.3s ease, background 0.2s ease, color 0.2s ease,
			border-color 0.2s ease;
	}
	.wx-faq-q.on .wx-faq-plus {
		transform: rotate(45deg);
		background: var(--forest);
		border-color: var(--forest);
		color: var(--cream);
	}
	.wx-faq-inline {
		display: none;
	}

	/* ---------- Footer ---------- */
	.wx-footer {
		position: relative;
		padding: clamp(38px, 6vw, 70px) 0 0;
		background: var(--cream-3);
		overflow: clip;
	}
	.wx-cta {
		position: relative;
		padding: clamp(32px, 6vw, 66px);
		border-radius: 32px;
		background: var(--forest);
		color: var(--cream);
		overflow: hidden;
	}
	.wx-cta::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(700px 360px at 88% 0%, rgba(157, 223, 179, 0.16), transparent 60%),
			radial-gradient(480px 260px at 0% 100%, rgba(248, 226, 207, 0.1), transparent 65%);
		pointer-events: none;
	}
	.wx-cta > * {
		position: relative;
	}
	.wx-cta h2 {
		margin-top: 16px;
		font-size: clamp(2.9rem, 6.4vw, 5.6rem);
		color: #f4f1e8;
	}
	.wx-cta h2 em {
		font-style: italic;
		color: #9ddfb3;
	}
	.wx-cta-sub {
		margin-top: 18px;
		max-width: 50ch;
		font-size: 0.98rem;
		line-height: 1.65;
		color: rgba(244, 241, 232, 0.68);
	}
	.wx-cta-actions {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
		margin-top: 30px;
	}
	.wx-page .wx-btn-cream {
		color: var(--forest);
	}
	.wx-btn-cream {
		background: var(--cream);
		color: var(--forest);
		border-color: var(--cream);
	}
	.wx-btn-cream:hover {
		background: #fff;
		transform: translateY(-1px);
		box-shadow: 0 12px 26px -16px rgba(0, 0, 0, 0.6);
	}
	.wx-btn-ghost-light {
		background: transparent;
		color: var(--cream);
		border-color: rgba(251, 248, 243, 0.3);
	}
	.wx-page .wx-btn-ghost-light {
		color: var(--cream);
	}
	.wx-btn-ghost-light:hover {
		background: rgba(251, 248, 243, 0.12);
		border-color: rgba(251, 248, 243, 0.6);
		transform: translateY(-1px);
	}
	.wx-cta-link {
		font-size: 12.5px;
		color: rgba(244, 241, 232, 0.8);
		border-bottom: 1px solid rgba(244, 241, 232, 0.28);
		padding-bottom: 3px;
		transition: color 0.2s ease, border-color 0.2s ease;
	}
	.wx-cta-link:hover {
		color: #f4f1e8;
		border-color: rgba(244, 241, 232, 0.6);
	}
	.wx-guarantees {
		list-style: none;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px 24px;
		max-width: 620px;
		margin: 34px 0 0;
		padding: 24px 0 0;
		border-top: 1px solid rgba(244, 241, 232, 0.14);
		font-size: 11.5px;
		color: rgba(244, 241, 232, 0.62);
	}
	.wx-guarantees li::before {
		content: '+';
		margin-right: 8px;
		font-family: var(--mono);
		color: #9ddfb3;
	}
	.wx-footer-mid {
		display: flex;
		align-items: center;
		gap: 24px;
		flex-wrap: wrap;
		padding: 40px 0 28px;
	}
	.wx-footer-mid :global(.brand-logo) {
		--brand-ink: var(--ink);
		--brand-muted: var(--muted);
	}
	.wx-footer-links {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 2px;
		margin-inline: auto;
	}
	.wx-footer-links a {
		font-size: 12px;
		color: var(--muted);
		padding: 7px 10px;
		border-radius: 99px;
		transition: color 0.15s ease, background 0.15s ease;
	}
	.wx-footer-links a:hover {
		color: var(--ink);
		background: rgba(20, 20, 19, 0.05);
	}
	.wx-footer-note {
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.wx-wordmark {
		width: 100vw;
		margin: 8px 0 0 calc(50% - 50vw);
		overflow: hidden;
		line-height: 0.72;
	}
	.wx-wordmark-inner {
		display: block;
		padding-top: 0.06em;
		font-family: var(--serif);
		font-size: clamp(5.2rem, 18.5vw, 19rem);
		line-height: 0.78;
		letter-spacing: -0.045em;
		text-align: center;
		white-space: nowrap;
		color: var(--forest);
		transform: translateY(108%);
		transition: transform 1.1s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.wx-wordmark:global(.in) .wx-wordmark-inner {
		transform: translateY(0);
	}
	.wx-base {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-top: 16px;
		padding: 20px 0 26px;
		border-top: 1px solid rgba(20, 20, 19, 0.12);
		font-family: var(--mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.wx-page :global(a:focus-visible),
	.wx-page :global(button:focus-visible) {
		outline: 2px solid var(--forest);
		outline-offset: 3px;
	}

	/* ---------- Scroll reveals ---------- */
	@media (prefers-reduced-motion: no-preference) {
		[data-reveal] {
			opacity: 0;
			translate: 0 26px;
			transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1),
				translate 0.8s cubic-bezier(0.22, 1, 0.36, 1);
			transition-delay: var(--d, 0s);
		}
		[data-reveal]:global(.in) {
			opacity: 1;
			translate: 0 0;
		}
		.wx-bench-grid > [data-reveal]:nth-child(2) {
			transition-delay: 0.1s;
		}
		.wx-masonry > [data-reveal]:nth-child(2) {
			transition-delay: 0.05s;
		}
		.wx-masonry > [data-reveal]:nth-child(3) {
			transition-delay: 0.1s;
		}
		.wx-masonry > [data-reveal]:nth-child(4) {
			transition-delay: 0.15s;
		}
		.wx-masonry > [data-reveal]:nth-child(5) {
			transition-delay: 0.2s;
		}
		.wx-masonry > [data-reveal]:nth-child(6) {
			transition-delay: 0.25s;
		}
	}

	@media (max-width: 900px) {
		.wx-masonry {
			columns: 2;
		}
		.wx-faq-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 28px;
		}
		.wx-faq-left {
			position: static;
		}
		.wx-faq-bubble {
			display: none;
		}
		.wx-faq-pill {
			display: none;
		}
		.wx-faq-inline {
			display: block;
			max-height: 0;
			opacity: 0;
			overflow: hidden;
			padding: 0 18px;
			transition: max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease;
		}
		.wx-faq-inline.on {
			max-height: 340px;
			opacity: 1;
			padding-bottom: 18px;
		}
		.wx-faq-inline p {
			font-size: 0.9rem;
			line-height: 1.6;
			color: var(--muted);
			max-width: 52ch;
		}
		.wx-faq-inline .wx-faq-link {
			display: inline-flex;
			margin-top: 10px;
		}
		.wx-faq-q.on {
			border-bottom-color: transparent;
		}
		.wx-footer-mid {
			align-items: flex-start;
			flex-direction: column;
			gap: 16px;
		}
		.wx-footer-links {
			margin-inline: 0;
		}
	}
	@media (max-width: 720px) {
		.wx-sec-head h2 {
			font-size: 2.05rem;
		}
		.wx-note {
			padding: 21px;
		}
		.wx-cta {
			border-radius: 24px;
		}
		.wx-cta-actions {
			gap: 14px;
		}
		.wx-wordmark-inner {
			font-size: clamp(4.4rem, 17vw, 8rem);
		}
		.wx-base {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
		}
	}
	@media (max-width: 620px) {
		.wx-masonry {
			columns: 1;
		}
		.wx-guarantees {
			grid-template-columns: 1fr;
		}
		.wx-faq-q {
			padding: 16px 12px;
		}
		.wx-faq-inline {
			padding-left: 12px;
			padding-right: 12px;
		}
		.wx-footer {
			padding-top: 26px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wx-page :global(html) {
			scroll-behavior: auto;
		}
		.wx-screen,
		.wx-copy-pane,
		.wx-faq-pane,
		.wx-faq-pill,
		.wx-faq-inline,
		.wx-seg-pill,
		.wx-wordmark-inner {
			transition: none !important;
		}
		.wx-wordmark-inner {
			transform: none;
		}
		.wx-note:hover .wx-note-link span {
			transform: none;
		}
	}

	/* =========================================================
	   FOCUSED MOCK ENGINE VIEW
	========================================================= */
	.wx-mock-focus {
		padding-top: clamp(100px, 12vw, 125px);
		padding-bottom: 70px;
		background: var(--cream);
		position: relative;
	}

	.wx-mock-hero {
		text-align: center;
		max-width: 820px;
		margin: 0 auto;
	}

	.wx-mock-title {
		font-size: clamp(2.6rem, 5.5vw, 4.2rem);
		line-height: 1.08;
		font-weight: 400;
		letter-spacing: -0.025em;
		color: var(--ink);
		margin: 0 0 18px;
	}

	.wx-mock-title em {
		font-style: italic;
		color: var(--forest);
	}

	.wx-mock-lede {
		font-size: clamp(1.05rem, 1.8vw, 1.25rem);
		line-height: 1.55;
		color: var(--muted);
		max-width: 720px;
		margin: 0 auto 36px;
	}

	.wx-mock-preview-wrap {
		margin: 0 auto 50px;
		max-width: 1180px;
	}

	.wx-preview.focused {
		border-radius: 24px;
		box-shadow:
			0 4px 12px rgba(15, 46, 32, 0.06),
			0 36px 84px -28px rgba(15, 46, 32, 0.3);
	}

	.wx-mock-preview-footer {
		margin-top: 14px;
	}
</style>
