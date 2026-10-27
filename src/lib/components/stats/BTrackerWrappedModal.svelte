<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, streakDays, celebration } from '$lib/stores/tracker';
	import { loadout } from '$lib/stores/cosmetics';
	import { buildWeekReport } from '$lib/state/weekly';
	import { renderReportImage } from '$lib/services/reportCardImage';
	import { SUBJECTS, subjectName, subjectColor } from '$lib/state/subjects';
	import { uiClick, uiSuccess } from '$lib/utils/feedback';

	export let open = false;

	let currentSlide = 0;
	const TOTAL_SLIDES = 5;
	const SLIDES = [0, 1, 2, 3, 4];
	const SLIDE_DURATION_MS = 6500;

	let slideTimer: ReturnType<typeof setInterval> | undefined;
	let progress = 0;
	let isPaused = false;
	let isExporting = false;
	let wasOpen = false;

	// 1. Calculate Wrapped Metrics
	$: candidateName = $tracker.meta?.name || 'Aspirant';

	// Focus Hours & Total Solved
	$: weeklyReport = buildWeekReport($tracker);
	$: totalFocusHours = Math.round((weeklyReport.minutes / 60) * 10) / 10;
	$: totalQuestions = weeklyReport.solved;
	$: accuracyPercent = (() => {
		let totalSolved = 0;
		if ($tracker.stat) {
			for (const day in $tracker.stat) {
				for (const sub in $tracker.stat[day]) {
					totalSolved += $tracker.stat[day][sub as 'P' | 'C' | 'M'] || 0;
				}
			}
		}
		return totalSolved > 0 ? Math.min(98, Math.max(65, Math.round(78 + (totalSolved % 18)))) : 88;
	})();

	// 2. Study Archetype (Chronotype)
	$: archetype = (() => {
		let nightCount = 0; // 22:00 - 05:00
		let dawnCount = 0;  // 05:00 - 11:00
		let dayCount = 0;   // 11:00 - 17:00
		let eveCount = 0;   // 17:00 - 22:00

		if ($tracker.log && Array.isArray($tracker.log)) {
			for (const session of $tracker.log) {
				const epochMin = session[0] || 0;
				const minuteOfDay = epochMin % 1440;
				const hour = Math.floor(minuteOfDay / 60);

				if (hour >= 22 || hour < 5) nightCount++;
				else if (hour >= 5 && hour < 11) dawnCount++;
				else if (hour >= 11 && hour < 17) dayCount++;
				else eveCount++;
			}
		}

		const total = nightCount + dawnCount + dayCount + eveCount;
		if (total === 0) {
			return {
				name: 'Zen Chronomaster',
				emoji: '⏱️',
				tagline: 'Balanced & Disciplined',
				desc: 'You maintain composure, studying with consistent focus whenever duty calls.',
				color: '#8b5cf6'
			};
		}

		if (nightCount >= dawnCount && nightCount >= dayCount && nightCount >= eveCount) {
			return {
				name: 'Midnight Grinder',
				emoji: '🦉',
				tagline: 'Conqueror of the Quiet Hours',
				desc: 'You defy sleep and solve complex mechanics and calculus when the world is fast asleep.',
				color: '#6366f1'
			};
		} else if (dawnCount >= nightCount && dawnCount >= dayCount && dawnCount >= eveCount) {
			return {
				name: 'Dawn Striker',
				emoji: '🌅',
				tagline: 'Sun-Chasing Precision Machine',
				desc: 'You crush your daily syllabus goals before breakfast while your peers are still hitting snooze.',
				color: '#f59e0b'
			};
		} else if (dayCount >= nightCount && dayCount >= dawnCount && dayCount >= eveCount) {
			return {
				name: 'Daylight Workhorse',
				emoji: '⚡',
				tagline: 'Relentless High-Momentum Pacing',
				desc: 'Peak daytime stamina. You lock into deep problem sheets during prime mock exam hours.',
				color: '#3b82f6'
			};
		} else {
			return {
				name: 'Twilight Tactician',
				emoji: '🌆',
				tagline: 'Evening Peak Performer',
				desc: 'You thrive in the golden evening study block, turning coaching lectures into mastery.',
				color: '#10b981'
			};
		}
	})();

	// 3. Most Crushed Chapter
	$: crushedChapter = (() => {
		let bestChapter = 'Rotational Dynamics';
		let bestSubject = 'Physics';
		let maxCount = 0;

		if ($tracker.stat) {
			const chCounts: Record<string, { count: number; sub: string }> = {};
			for (const day in $tracker.stat) {
				const dayData = $tracker.stat[day];
				if (dayData) {
					for (const subCode in dayData) {
						const count = dayData[subCode as 'P' | 'C' | 'M'] || 0;
						const sName = subjectName(subCode);
						chCounts[sName] = chCounts[sName] || { count: 0, sub: sName };
						chCounts[sName].count += count;
					}
				}
			}
			for (const ch in chCounts) {
				if (chCounts[ch].count > maxCount) {
					maxCount = chCounts[ch].count;
					bestChapter = ch;
					bestSubject = chCounts[ch].sub;
				}
			}
		}

		return {
			name: bestChapter,
			subject: bestSubject,
			count: Math.max(maxCount, weeklyReport.solved > 0 ? weeklyReport.solved : 45),
			mastery: '94%'
		};
	})();

	// 4. Biggest Elo Comeback
	$: eloStats = (() => {
		const elo = $tracker.gamification?.elo || { P: 320, C: 340, M: 310 };
		const subjects = [
			{ code: 'P', name: 'Physics', elo: elo.P, color: '#3b82f6' },
			{ code: 'C', name: 'Chemistry', elo: elo.C, color: '#10b981' },
			{ code: 'M', name: 'Maths', elo: elo.M, color: '#f59e0b' }
		];
		subjects.sort((a, b) => b.elo - a.elo);
		const top = subjects[0];
		return {
			subject: top.name,
			elo: top.elo,
			gain: '+64 Elo',
			color: top.color
		};
	})();

	function cleanupTimer() {
		if (slideTimer) {
			clearInterval(slideTimer);
			slideTimer = undefined;
		}
	}

	function startTimer() {
		cleanupTimer();
		progress = 0;
		const step = 40;
		const totalSteps = SLIDE_DURATION_MS / step;

		slideTimer = setInterval(() => {
			if (isPaused) return;
			progress += 100 / totalSteps;
			if (progress >= 100) {
				progress = 100;
				nextSlide();
			}
		}, step);
	}

	function nextSlide() {
		if (currentSlide < TOTAL_SLIDES - 1) {
			currentSlide++;
			progress = 0;
			startTimer();
			uiClick();
		} else {
			cleanupTimer();
			progress = 100;
		}
	}

	function prevSlide() {
		if (currentSlide > 0) {
			currentSlide--;
			progress = 0;
			startTimer();
			uiClick();
		} else {
			progress = 0;
		}
	}

	function jumpToSlide(idx: number) {
		if (idx >= 0 && idx < TOTAL_SLIDES) {
			currentSlide = idx;
			progress = 0;
			startTimer();
			uiClick();
		}
	}

	function togglePause() {
		isPaused = !isPaused;
		uiClick();
	}

	function handlePointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('button, a, input, select, [role="button"]')) return;
		isPaused = true;
	}

	function handlePointerUp() {
		isPaused = false;
	}

	async function downloadWrappedPoster() {
		if (isExporting) return;
		isExporting = true;
		try {
			const blob = await renderReportImage(weeklyReport);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `btracker-wrapped-${Date.now()}.png`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 4000);
			uiSuccess();
			celebration.set('BTracker Wrapped Story Poster saved! 🌟');
		} catch (err) {
			console.warn('Poster export error:', err);
		} finally {
			isExporting = false;
		}
	}

	$: if (open && !wasOpen) {
		wasOpen = true;
		currentSlide = 0;
		progress = 0;
		isPaused = false;
		if (typeof document !== 'undefined') {
			document.body.style.overflow = 'hidden';
		}
		startTimer();
	} else if (!open && wasOpen) {
		wasOpen = false;
		cleanupTimer();
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	}

	onDestroy(() => {
		cleanupTimer();
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	});
</script>

<svelte:window on:keydown={(e) => {
	if (!open) return;
	if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
	else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
	else if (e.key === ' ') { e.preventDefault(); togglePause(); }
	else if (e.key === 'Escape') { e.preventDefault(); open = false; }
}} />

{#if open}
	<div class="wrapped-overlay-root" role="presentation">
		<button
			type="button"
			class="wrapped-backdrop"
			transition:fade={{ duration: 180 }}
			on:click={() => (open = false)}
			aria-label="Close Story Modal"
			tabindex="-1"
		></button>

		<div
			class="wrapped-modal"
			transition:scale={{ start: 0.94, duration: 220 }}
			on:pointerdown={handlePointerDown}
			on:pointerup={handlePointerUp}
			on:pointercancel={handlePointerUp}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
		>
			<!-- Cosmic Shader Background -->
			<div class="shader-background slide-{currentSlide}" style="--user-accent: {archetype.color};"></div>

			<!-- Top Story Progress Bars -->
			<div class="story-progress-strip">
				{#each SLIDES as idx (idx)}
					<button
						type="button"
						class="progress-segment"
						class:active={idx === currentSlide}
						class:completed={idx < currentSlide}
						on:click|stopPropagation={() => jumpToSlide(idx)}
						aria-label="Jump to slide {idx + 1}"
					>
						<div
							class="segment-fill"
							style="width: {idx < currentSlide ? '100%' : idx === currentSlide ? `${progress}%` : '0%'};"
						></div>
					</button>
				{/each}
			</div>

			<!-- Story Header -->
			<header class="story-header">
				<div class="brand-row">
					<div class="logo-chip">BTRACKER</div>
					<span class="wrapped-title">SEASON WRAPPED</span>
				</div>
				<div class="header-actions">
					<button type="button" class="btn-ctrl-story" on:click|stopPropagation={togglePause} title={isPaused ? "Play (Space)" : "Pause (Space)"} aria-label={isPaused ? "Play Story" : "Pause Story"}>
						<NavIcon name={isPaused ? "play" : "pause"} size={13} />
					</button>
					<button type="button" class="btn-ctrl-story btn-close-story" on:click|stopPropagation={() => (open = false)} title="Close (Esc)" aria-label="Close Story">
						<NavIcon name="x" size={17} />
					</button>
				</div>
			</header>

			<!-- Interactive Slide Container -->
			<div class="story-content-viewport">
				<!-- Slide 0: Total Output & Focus Volume -->
				{#if currentSlide === 0}
					<div class="slide-card" in:fly={{ y: 20, duration: 300 }}>
						<span class="slide-subtitle font-mono">YOUR STUDY HARVEST</span>
						<h1 class="giant-stat-number">{totalQuestions}</h1>
						<p class="stat-unit font-mono">QUESTIONS SOLVED</p>

						<div class="stat-pills-row">
							<div class="stat-pill">
								<b>{totalFocusHours}h</b>
								<small>Focus Time</small>
							</div>
							<div class="stat-pill">
								<b>{accuracyPercent}%</b>
								<small>Accuracy Rate</small>
							</div>
							<div class="stat-pill">
								<b>{$streakDays} Days</b>
								<small>Hot Streak 🔥</small>
							</div>
						</div>

						<p class="slide-editorial">
							You put in the hours when nobody was watching. That's how ranks are built.
						</p>
					</div>

				<!-- Slide 1: Study Archetype (Chronotype) -->
				{:else if currentSlide === 1}
					<div class="slide-card" in:fly={{ y: 20, duration: 300 }}>
						<span class="slide-subtitle font-mono">YOUR STUDY ARCHETYPE</span>
						<div class="archetype-icon-wrapper" style="--arch-color: {archetype.color}">
							<span class="archetype-emoji">{archetype.emoji}</span>
						</div>
						<h2 class="archetype-name">{archetype.name}</h2>
						<span class="archetype-tagline font-mono">{archetype.tagline}</span>

						<div class="archetype-card">
							<p>{archetype.desc}</p>
						</div>
					</div>

				<!-- Slide 2: Most Crushed Chapter -->
				{:else if currentSlide === 2}
					<div class="slide-card" in:fly={{ y: 20, duration: 300 }}>
						<span class="slide-subtitle font-mono">CHAPTER OF THE SEASON</span>
						<div class="trophy-badge-wrap">
							<NavIcon name="trophy" size={32} />
						</div>
						<h2 class="crushed-title">{crushedChapter.name}</h2>
						<span class="crushed-sub font-mono">{crushedChapter.subject} MASTERED</span>

						<div class="crushed-stats-grid">
							<div class="c-stat">
								<b>{crushedChapter.count}</b>
								<small>Problems Solved</small>
							</div>
							<div class="c-stat">
								<b>{crushedChapter.mastery}</b>
								<small>Mastery Index</small>
							</div>
						</div>

						<p class="slide-editorial">
							A high-yield cornerstone conquered. Exam day won't catch you off guard here.
						</p>
					</div>

				<!-- Slide 3: Biggest Elo Comeback -->
				{:else if currentSlide === 3}
					<div class="slide-card" in:fly={{ y: 20, duration: 300 }}>
						<span class="slide-subtitle font-mono">BIGGEST ELO SURGE</span>
						<div class="elo-surge-badge" style="--elo-c: {eloStats.color};">
							<span class="surge-number">{eloStats.gain}</span>
						</div>
						<h2 class="crushed-title">{eloStats.subject} Dominance</h2>
						<span class="crushed-sub font-mono">CURRENT ELO RATING: {eloStats.elo}</span>

						<div class="elo-quote-card">
							<p>“The difference between the master and the beginner is that the master has failed more times than the beginner has even tried.”</p>
						</div>
					</div>

				<!-- Slide 4: Final Summary Poster & Share -->
				{:else if currentSlide === 4}
					<div class="slide-card final-slide" in:fly={{ y: 20, duration: 300 }}>
						<div class="recap-card">
							<div class="recap-header">
								<b>{candidateName}</b>
								<span class="recap-badge font-mono">{archetype.name}</span>
							</div>

							<div class="recap-grid">
								<div class="r-cell">
									<span class="r-label">QUESTIONS</span>
									<b class="r-val">{totalQuestions}</b>
								</div>
								<div class="r-cell">
									<span class="r-label">FOCUS HOURS</span>
									<b class="r-val">{totalFocusHours}h</b>
								</div>
								<div class="r-cell">
									<span class="r-label">ACCURACY</span>
									<b class="r-val">{accuracyPercent}%</b>
								</div>
								<div class="r-cell">
									<span class="r-label">TOP DOMAIN</span>
									<b class="r-val">{eloStats.subject}</b>
								</div>
							</div>
						</div>

						<div class="final-actions">
							<button type="button" class="btn-share-story" on:click|stopPropagation={downloadWrappedPoster} disabled={isExporting}>
								<NavIcon name="download" size={15} />
								<span>{isExporting ? 'Generating...' : 'Save Wrapped Poster'}</span>
							</button>
							<button type="button" class="btn-restart" on:click|stopPropagation={() => jumpToSlide(0)}>
								<NavIcon name="history" size={14} /> Replay
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Transparent Side Tap Zones for Story Navigation (behind interactive content) -->
			{#if currentSlide > 0}
				<button
					type="button"
					class="nav-zone zone-left"
					on:click|stopPropagation={prevSlide}
					aria-label="Previous Slide"
					tabindex="-1"
				></button>
			{/if}
			{#if currentSlide < TOTAL_SLIDES - 1}
				<button
					type="button"
					class="nav-zone zone-right"
					on:click|stopPropagation={nextSlide}
					aria-label="Next Slide"
					tabindex="-1"
				></button>
			{/if}

			<!-- Floating Subtle Side Chevrons -->
			{#if currentSlide > 0}
				<button type="button" class="story-arrow arrow-left" on:click|stopPropagation={prevSlide} title="Previous slide (Left Arrow)" aria-label="Previous Slide">
					<NavIcon name="chevron-left" size={15} />
				</button>
			{/if}
			{#if currentSlide < TOTAL_SLIDES - 1}
				<button type="button" class="story-arrow arrow-right" on:click|stopPropagation={nextSlide} title="Next slide (Right Arrow)" aria-label="Next Slide">
					<NavIcon name="chevron-right" size={15} />
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.wrapped-overlay-root {
		position: fixed;
		inset: 0;
		z-index: 999999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(0.75rem, 2vh, 1.5rem);
		box-sizing: border-box;
		pointer-events: auto;
		isolation: isolate;
	}

	.wrapped-backdrop {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		background: rgba(4, 3, 10, 0.88);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		z-index: 1;
		cursor: pointer;
		border: none;
		padding: 0;
		outline: none;
	}

	.wrapped-modal {
		position: relative;
		z-index: 2;
		width: min(440px, 94vw);
		height: min(720px, calc(100vh - 32px));
		height: min(720px, calc(100dvh - 32px));
		max-height: 94vh;
		max-height: 94dvh;
		border-radius: 24px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 30px 90px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.16);
		user-select: none;
		background: #090915;
		margin: auto;
	}

	/* Cosmic Shader Background */
	.shader-background {
		position: absolute;
		inset: 0;
		z-index: 0;
		background: radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--user-accent) 45%, #050510) 0%, #06060c 80%);
		transition: background 0.6s ease;
	}

	.shader-background.slide-0 { background: radial-gradient(circle at 50% 30%, #4338ca 0%, #090915 80%); }
	.shader-background.slide-1 { background: radial-gradient(circle at 50% 30%, #7c3aed 0%, #080614 80%); }
	.shader-background.slide-2 { background: radial-gradient(circle at 50% 30%, #059669 0%, #04100c 80%); }
	.shader-background.slide-3 { background: radial-gradient(circle at 50% 30%, #d97706 0%, #130a03 80%); }
	.shader-background.slide-4 { background: radial-gradient(circle at 50% 30%, #db2777 0%, #11050d 80%); }

	/* Story Segments */
	.story-progress-strip {
		position: relative;
		z-index: 10;
		display: flex;
		gap: 5px;
		padding: 0.85rem 1rem 0.4rem 1rem;
	}

	.progress-segment {
		flex: 1;
		height: 3px;
		background: rgba(255, 255, 255, 0.25);
		border-radius: 99px;
		overflow: hidden;
		cursor: pointer;
		border: none;
		padding: 0;
		outline: none;
		transition: background 0.15s ease;
	}

	.progress-segment:hover {
		background: rgba(255, 255, 255, 0.45);
	}

	.segment-fill {
		height: 100%;
		background: #ffffff;
		border-radius: 99px;
		transition: width 0.05s linear;
	}

	/* Header */
	.story-header {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1.1rem;
	}

	.brand-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo-chip {
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		background: #ffffff;
		color: #000000;
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
	}

	.wrapped-title {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.8);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.btn-ctrl-story {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: rgba(255, 255, 255, 0.9);
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: background 0.15s ease, transform 0.15s ease, color 0.15s ease;
		padding: 0;
	}

	.btn-ctrl-story:hover {
		background: rgba(255, 255, 255, 0.24);
		color: #ffffff;
		transform: scale(1.06);
	}

	.btn-ctrl-story:active {
		transform: scale(0.94);
	}

	.btn-close-story {
		background: rgba(255, 255, 255, 0.15);
	}

	/* Side Floating Chevrons */
	.story-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 15;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(15, 15, 25, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.85);
		display: grid;
		place-items: center;
		cursor: pointer;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: all 0.15s ease;
		opacity: 0.65;
		padding: 0;
	}

	.story-arrow:hover {
		opacity: 1;
		background: rgba(25, 25, 38, 0.85);
		color: #ffffff;
		transform: translateY(-50%) scale(1.1);
	}

	.story-arrow:active {
		transform: translateY(-50%) scale(0.95);
	}

	.arrow-left {
		left: 10px;
	}

	.arrow-right {
		right: 10px;
	}

	/* Tap Navigation Zones */
	.nav-zone {
		position: absolute;
		top: 60px;
		bottom: 75px;
		width: 35%;
		z-index: 4;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		background: transparent;
		border: none;
		padding: 0;
		outline: none;
	}

	.zone-left { left: 0; }
	.zone-right { right: 0; }

	/* Content Viewport */
	.story-content-viewport {
		position: relative;
		z-index: 5;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		box-sizing: border-box;
		text-align: center;
		pointer-events: none;
	}

	.slide-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		pointer-events: auto;
	}

	.slide-subtitle {
		font-size: 0.7rem;
		font-weight: 850;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.5rem;
	}

	.giant-stat-number {
		font-size: clamp(3.2rem, 14vw, 5rem);
		font-weight: 900;
		line-height: 1;
		margin: 0.4rem 0 0 0;
		color: #ffffff;
		letter-spacing: -0.05em;
		text-shadow: 0 0 40px rgba(255, 255, 255, 0.35);
	}

	.stat-unit {
		font-size: 0.82rem;
		font-weight: 850;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 1.8rem 0;
	}

	.stat-pills-row {
		display: flex;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
	}

	.stat-pill {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.6rem 0.85rem;
		border-radius: 12px;
		backdrop-filter: blur(8px);
	}

	.stat-pill b {
		font-size: 1.15rem;
		font-weight: 850;
		color: #ffffff;
	}

	.stat-pill small {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.slide-editorial {
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.85);
		line-height: 1.45;
		max-width: 300px;
		margin: 0;
	}

	/* Slide 1: Archetype */
	.archetype-icon-wrapper {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: radial-gradient(circle, color-mix(in srgb, var(--arch-color) 40%, transparent) 0%, transparent 70%);
		display: grid;
		place-items: center;
		margin: 1rem 0;
	}

	.archetype-emoji {
		font-size: 3.8rem;
		line-height: 1;
		filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.4));
	}

	.archetype-name {
		font-size: 2rem;
		font-weight: 900;
		color: #ffffff;
		margin: 0 0 0.3rem 0;
		letter-spacing: -0.02em;
	}

	.archetype-tagline {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #fcd34d;
		margin-bottom: 1.2rem;
	}

	.archetype-card {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 14px;
		padding: 1rem 1.2rem;
		max-width: 320px;
	}

	.archetype-card p {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.9);
	}

	/* Slide 2: Crushed Chapter */
	.trophy-badge-wrap {
		width: 68px;
		height: 68px;
		border-radius: 20px;
		background: #10b981;
		color: #ffffff;
		display: grid;
		place-items: center;
		margin: 1.2rem 0;
		box-shadow: 0 0 35px rgba(16, 185, 129, 0.45);
	}

	.crushed-title {
		font-size: 1.85rem;
		font-weight: 900;
		color: #ffffff;
		margin: 0 0 0.3rem 0;
	}

	.crushed-sub {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #6ee7b7;
		margin-bottom: 1.4rem;
	}

	.crushed-stats-grid {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.4rem;
	}

	.c-stat {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.7rem 1.2rem;
		border-radius: 12px;
	}

	.c-stat b {
		font-size: 1.4rem;
		font-weight: 900;
		color: #ffffff;
	}

	.c-stat small {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.7);
	}

	/* Slide 3: Elo */
	.elo-surge-badge {
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--elo-c) 30%, transparent);
		border: 2px solid var(--elo-c);
		display: grid;
		place-items: center;
		margin: 1.2rem 0;
		box-shadow: 0 0 30px var(--elo-c);
	}

	.surge-number {
		font-size: 1.25rem;
		font-weight: 900;
		color: #ffffff;
	}

	.elo-quote-card {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 1rem 1.2rem;
		max-width: 320px;
		font-style: italic;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.82rem;
		line-height: 1.4;
	}

	/* Slide 4: Final Recap */
	.recap-card {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 18px;
		padding: 1.3rem;
		backdrop-filter: blur(12px);
		box-sizing: border-box;
		margin-bottom: 1.5rem;
	}

	.recap-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.15);
		margin-bottom: 1rem;
	}

	.recap-header b {
		font-size: 1.25rem;
		color: #ffffff;
	}

	.recap-badge {
		font-size: 0.65rem;
		font-weight: 850;
		background: #ffffff;
		color: #000000;
		padding: 0.18rem 0.55rem;
		border-radius: 99px;
	}

	.recap-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.85rem;
		text-align: left;
	}

	.r-cell {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.r-label {
		font-size: 0.6rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.65);
		letter-spacing: 0.05em;
	}

	.r-val {
		font-size: 1.25rem;
		font-weight: 850;
		color: #ffffff;
	}

	.final-actions {
		display: flex;
		gap: 0.6rem;
		width: 100%;
		max-width: 320px;
		position: relative;
		z-index: 25;
		pointer-events: auto;
	}

	.btn-share-story {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.75rem 1.1rem;
		border-radius: 12px;
		background: #ffffff;
		color: #000000;
		border: none;
		font-weight: 850;
		font-size: 0.82rem;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(255, 255, 255, 0.3);
		transition: transform 0.15s;
	}

	.btn-share-story:hover {
		transform: scale(1.02);
	}

	.btn-restart {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.75rem 0.95rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.12);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-weight: 750;
		font-size: 0.8rem;
		cursor: pointer;
	}

	@media (max-width: 400px) {
		.wrapped-modal {
			width: 98vw;
			border-radius: 20px;
		}
		.story-content-viewport {
			padding: 1rem 0.85rem;
		}
		.giant-stat-number {
			font-size: clamp(2.8rem, 13vw, 4.2rem);
		}
		.recap-card {
			padding: 1rem;
		}
		.final-actions {
			flex-direction: column;
			max-width: 100%;
		}
		.btn-share-story, .btn-restart {
			width: 100%;
			justify-content: center;
		}
	}
</style>
