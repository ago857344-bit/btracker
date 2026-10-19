<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import SubjectHubModal from '$lib/components/widgets/SubjectHubModal.svelte';
	import { globalTimer } from '$lib/stores/timerState';
	import { 
		dailyProgress, streakDays, tracker, updateTracker, 
		toggleTask, subjectSolvedTotals, setExamDate 
	} from '$lib/stores/tracker';
	import { formatMinutes, todayKey } from '$lib/state/dates';
	import { SUBJECTS, subjectName, subjectColor } from '$lib/state/subjects';
	import { QUOTES, quoteForDay } from '$lib/state/quotes';
	import { DEFAULT_POMODORO } from '$lib/state/defaults';

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';

	let activeTab: 'missions' | 'chapters' = 'missions';
	let mobileFocusTab: 'timer' | 'deck' | 'support' = 'timer';
	let hubOpen = false;
	let hubSub = 'P';

	function openHub(code: string) {
		hubSub = code;
		hubOpen = true;
	}

	// Dynamic Exam Countdown
	let now = Date.now();
	let timerInterval: ReturnType<typeof setInterval>;
	onMount(() => {
		timerInterval = setInterval(() => { now = Date.now(); }, 1000);
	});
	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});

	let editingTarget = false;
	let customDateInput = $tracker.meta.exam || '2026-05-24';
	let customTitleInput = 'IIT Entrance Window';

	$: examTarget = $tracker.meta.exam 
		? new Date($tracker.meta.exam.includes('T') ? $tracker.meta.exam : $tracker.meta.exam + 'T09:00:00').getTime() 
		: new Date('2026-05-24T09:00:00').getTime();
	$: diffMs = Math.max(0, examTarget - now);
	$: countdownDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	$: countdownHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
	$: countdownMins = Math.floor((diffMs / (1000 * 60)) % 60);

	function formatExamDisplay(dateStr?: string | null): string {
		if (!dateStr) return 'Sunday, May 24, 2026';
		try {
			const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T09:00:00');
			if (isNaN(d.getTime())) return dateStr;
			return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return dateStr;
		}
	}

	$: customPresetLabel = (() => {
		const ex = $tracker.meta.exam;
		if (!ex) return 'JEE ADVANCED';
		if (ex.startsWith('2026-01') || ex.startsWith('2025-01')) return 'JEE MAIN JAN';
		if (ex.startsWith('2026-04') || ex.startsWith('2025-04')) return 'JEE MAIN APR';
		if (ex.startsWith('2026-05') || ex.startsWith('2025-05')) return 'JEE ADVANCED';
		return 'CUSTOM TARGET';
	})();

	// Quotes Engine
	let quoteIndex = QUOTES.indexOf(quoteForDay());
	if (quoteIndex < 0) quoteIndex = 0;
	$: currentQuote = QUOTES[quoteIndex] || quoteForDay();

	function shuffleQuote() {
		quoteIndex = (quoteIndex + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length;
	}

	// Active Tasks & Missions
	$: today = todayKey();
	$: activeMissions = ($tracker.h || []).filter(task => !task.done);
	$: doneMissions = ($tracker.hd || []).filter(task => task.done);
	$: allMissions = [...activeMissions, ...doneMissions];

	// Active Chapter Checklist
	const fallbackChapters = [
		{ id: 'P7', code: 'P', name: 'System of Particles & Rotational Motion', solved: 48, total: 60, due: 'Today', weight: 'High ROI' },
		{ id: 'C16', code: 'C', name: 'Chemical Kinetics & Radioactivity', solved: 34, total: 45, due: 'Tomorrow', weight: 'Core' },
		{ id: 'M21', code: 'M', name: 'Application of Derivatives (Maxima/Minima)', solved: 22, total: 50, due: 'In 2 days', weight: 'High ROI' },
		{ id: 'P18', code: 'P', name: 'Current Electricity & Circuit Theorems', solved: 55, total: 65, due: 'This Week', weight: 'Core' }
	];

	// Circular Dial SVG geometry (circumference for r=84 is ~527.79)
	const CIRCLE_CIRCUMFERENCE = 527.79;
	$: strokeOffset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * Math.min(100, Math.max(0, $globalTimer.ringProgress || 0)) / 100);

	// Pomodoro Time Editing
	let editingTime = false;
	$: activeMinutes = $globalTimer.activeLen || $tracker?.pom?.focus || 25;
	let customMinutesInput = 25;
	$: if (!editingTime) customMinutesInput = activeMinutes;

	function selectPomodoroPreset(mins: number) {
		if ($globalTimer.running) return;
		customMinutesInput = mins;
		if ($globalTimer.setTime) {
			$globalTimer.setTime(mins);
		}
		updateTracker(s => {
			if (!s.pom) s.pom = { ...DEFAULT_POMODORO };
			s.pom.focus = mins;
		});
		editingTime = false;
	}

	function applyCustomPomodoro() {
		if ($globalTimer.running) return;
		const val = Math.max(1, Math.min(240, Number(customMinutesInput) || 25));
		selectPomodoroPreset(val);
	}

	function stepPomodoro(delta: number) {
		if ($globalTimer.running) return;
		const current = Number(customMinutesInput) || activeMinutes || 25;
		const next = Math.max(1, Math.min(240, current + delta));
		customMinutesInput = next;
		selectPomodoroPreset(next);
	}

	function handleTimerToggle() {
		if ($globalTimer.toggle) {
			$globalTimer.toggle();
		}
	}

	function handleTimerReset() {
		if ($globalTimer.stop) {
			$globalTimer.stop();
		}
	}
</script>

<div
	class="focus-command-view"
	class:mode-tablet={deviceMode === 'tablet'}
	class:mode-mobile={deviceMode === 'mobile'}
	class:mobile-tab-timer={mobileFocusTab === 'timer'}
	class:mobile-tab-deck={mobileFocusTab === 'deck'}
	class:mobile-tab-support={mobileFocusTab === 'support'}
>
	<!-- TOP STATUS BAR: SPRINT & STREAK TELEMETRY -->
	<header class="top-telemetry-bar">
		<div class="telemetry-left">
			<span class="live-status-dot">
				<i class="ping"></i>
				<i class="core"></i>
			</span>
			<span class="eyebrow-tag">JEE ADVANCED 2026 · FOCUS COMMAND CENTER</span>
		</div>
		<div class="telemetry-right font-mono">
			<span class="metric-pill">
				DAILY STREAK: <b class="streak-val">{$streakDays} DAYS 🔥</b>
			</span>
			<span class="divider">|</span>
			<span class="metric-pill">
				OUTPUT: <b class="accuracy-val">{Math.round(($dailyProgress.questionPct || 0) * 100)}% GOAL</b>
			</span>
		</div>
	</header>

	<!-- MOBILE SECTION SWITCHER (Hidden on desktop) -->
	<div class="mobile-focus-nav" role="tablist" aria-label="Focus sections">
		<button
			type="button"
			class="mobile-tab-btn"
			class:active={mobileFocusTab === 'timer'}
			on:click={() => (mobileFocusTab = 'timer')}
			role="tab"
			aria-selected={mobileFocusTab === 'timer'}
		>
			<NavIcon name="focus" size={13} />
			<span>Focus Timer</span>
		</button>
		<button
			type="button"
			class="mobile-tab-btn"
			class:active={mobileFocusTab === 'deck'}
			on:click={() => (mobileFocusTab = 'deck')}
			role="tab"
			aria-selected={mobileFocusTab === 'deck'}
		>
			<NavIcon name="list" size={13} />
			<span>Missions ({activeMissions.length})</span>
		</button>
		<button
			type="button"
			class="mobile-tab-btn"
			class:active={mobileFocusTab === 'support'}
			on:click={() => (mobileFocusTab = 'support')}
			role="tab"
			aria-selected={mobileFocusTab === 'support'}
		>
			<NavIcon name="target" size={13} />
			<span>Target &amp; Hubs</span>
		</button>
	</div>

	<!-- STRICT BENTO GRID: 12-COLUMN ARCHITECTURE -->
	<div class="bento-layout">
		<!-- ========================================================= -->
		<!-- LEFT / CENTER STAGE (8 Columns on Desktop)                -->
		<!-- ========================================================= -->
		<div class="main-column">
			<!-- HERO COMMAND CENTER CARD -->
			<section class="bento-card hero-timer-card">
				<!-- Ambient Glow Flares -->
				<div class="ambient-flare top-left"></div>
				<div class="ambient-flare bottom-right"></div>

				<!-- Header Tag Row -->
				<div class="hero-header-row">
					<span class="active-mode-chip">
						<NavIcon name="focus" size={13} />
						ACTIVE DEEP WORK CORE
					</span>
					<span class="target-subhead font-mono">
						DAILY TARGET: {$dailyProgress.hourGoal || 4}H 00M
					</span>
				</div>

				<!-- Dial & Centerpiece Split -->
				<div class="hero-body-grid">
					<!-- Circular Progress Ring Dial & Interactive Duration Control -->
					<div class="dial-wrapper">
						<div class="dial-container">
							<!-- Soft Ambient Glow behind the dial -->
							<div class="dial-halo"></div>

							<svg class="dial-svg" viewBox="0 0 200 200" width="190" height="190">
								<!-- Track Ring with dark glass lens fill -->
								<circle
									cx="100"
									cy="100"
									r="84"
									class="dial-track"
									stroke-width="9"
								/>
								<!-- Dynamic Glowing Progress Ring -->
								<circle
									cx="100"
									cy="100"
									r="84"
									class="dial-progress"
									stroke-width="9"
									stroke-dasharray={CIRCLE_CIRCUMFERENCE}
									stroke-dashoffset={strokeOffset}
									stroke-linecap="round"
									transform="rotate(-90 100 100)"
								/>
								<!-- Subtle start-cap indicator dot when idle/running -->
								<circle
									cx="100"
									cy="16"
									r="4"
									class="dial-cap-dot"
								/>
							</svg>
							
							<!-- Digital Timer Display -->
							<div class="dial-center-content">
								<div class="dial-label-row">
									<span class="dial-label">SESSION TIME</span>
									{#if !$globalTimer.running}
										<button 
											type="button" 
											class="btn-edit-badge"
											title={editingTime ? 'Close time editor' : 'Edit Pomodoro time'}
											on:click={() => editingTime = !editingTime}
										>
											<NavIcon name="edit" size={11} />
										</button>
									{/if}
								</div>

								<button
									type="button"
									class="dial-digits font-mono"
									class:clickable={!$globalTimer.running}
									title={!$globalTimer.running ? 'Click to change Pomodoro duration' : undefined}
									on:click={() => { if (!$globalTimer.running) editingTime = !editingTime; }}
								>
									{$globalTimer.dialTime || `${activeMinutes}:00`}
								</button>

								<span class="dial-sub-badge font-mono" class:break-phase={$globalTimer.phase === 'break'}>
									<span class="status-pulse-dot"></span>
									<span>{$globalTimer.phase === 'break' ? 'Rest Break' : `${activeMinutes}m Pomodoro Block`}</span>
								</span>
							</div>
						</div>

						<!-- Pomodoro Duration Presets & Quick Stepper -->
						<div class="duration-control-bar">
							<div class="duration-presets rounded-xl">
								{#each [25, 45, 60, 90] as presetMin}
									<button
										type="button"
										class="preset-pill rounded-lg font-mono"
										class:active={activeMinutes === presetMin && !editingTime}
										disabled={$globalTimer.running}
										on:click={() => selectPomodoroPreset(presetMin)}
									>
										{presetMin}m
									</button>
								{/each}
								<button
									type="button"
									class="preset-pill custom-pill rounded-lg font-mono"
									class:active={editingTime || (![25, 45, 60, 90].includes(activeMinutes))}
									disabled={$globalTimer.running}
									on:click={() => editingTime = !editingTime}
								>
									{editingTime ? 'Done' : (![25, 45, 60, 90].includes(activeMinutes) ? `${activeMinutes}m` : 'Custom')}
								</button>
							</div>

							{#if editingTime && !$globalTimer.running}
								<div class="custom-duration-stepper rounded-xl" transition:slide={{ duration: 180 }}>
									<button 
										type="button" 
										class="stepper-btn rounded-lg font-mono" 
										title="Subtract 5 minutes"
										on:click={() => stepPomodoro(-5)}
									>
										-5
									</button>
									<div class="stepper-input-wrap">
										<input
											type="number"
											min="1"
											max="240"
											bind:value={customMinutesInput}
											on:change={applyCustomPomodoro}
											on:keydown={(e) => { if (e.key === 'Enter') applyCustomPomodoro(); }}
											class="stepper-input font-mono"
										/>
										<span class="stepper-unit font-mono">MIN</span>
									</div>
									<button 
										type="button" 
										class="stepper-btn rounded-lg font-mono" 
										title="Add 5 minutes"
										on:click={() => stepPomodoro(5)}
									>
										+5
									</button>
									<button 
										type="button" 
										class="btn-apply-custom rounded-lg font-mono"
										on:click={applyCustomPomodoro}
									>
										Set
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Telemetry & Primary Launch Controls -->
					<div class="hero-controls-panel">
						<div>
							<h2 class="hero-heading">High-Velocity Problem Solving</h2>
							<p class="hero-desc">
								Zero distractions. Calibrate speed and accuracy for JEE Advanced standard problems. Maintain sustained cognitive flow.
							</p>
						</div>

						<!-- Sub-Metric Bento Containers -->
						<div class="telemetry-grid">
							<div class="metric-container rounded-xl">
								<span class="metric-label">QUESTIONS SOLVED</span>
								<div class="metric-value-row font-mono">
									<b class="val">{$dailyProgress.solved}</b>
									<span class="den">/ {$dailyProgress.questionGoal} Qs</span>
								</div>
							</div>
							<div class="metric-container rounded-xl">
								<span class="metric-label">FOCUS OUTPUT</span>
								<div class="metric-value-row font-mono">
									<b class="val">{formatMinutes($dailyProgress.minutes)}</b>
									<span class="den">/ {$dailyProgress.hourGoal}h</span>
								</div>
							</div>
						</div>

						<!-- Primary Action Button Bar -->
						<div class="action-btn-bar">
							<button 
								type="button" 
								class="btn-primary-launch rounded-lg"
								on:click={handleTimerToggle}
							>
								{#if $globalTimer.running}
									<NavIcon name="pause" size={16} />
									<span>PAUSE BLOCK</span>
								{:else}
									<NavIcon name="play" size={16} />
									<span>START FOCUS SESSION</span>
								{/if}
								<kbd class="shortcut-kbd font-mono">⌘ SPACE</kbd>
							</button>
							<button 
								type="button" 
								class="btn-icon-subtle rounded-lg" 
								title="Reset Session"
								on:click={handleTimerReset}
							>
								<NavIcon name="history" size={15} />
							</button>
						</div>
					</div>
				</div>
			</section>

			<!-- UNIFIED ACTION LIST: MISSIONS VS CHAPTERS -->
			<section class="bento-card action-deck-card">
				<!-- Header with Segmented Control Switch -->
				<div class="deck-header">
					<div>
						<h3 class="deck-title">Daily Execution Deck</h3>
						<span class="deck-subtitle">SPRINT BACKLOG &amp; ACTIVE SYLLABUS</span>
					</div>

					<!-- Segmented Control Toggle -->
					<div class="segmented-control rounded-xl">
						<button
							type="button"
							class="segment-btn rounded-lg"
							class:active={activeTab === 'missions'}
							on:click={() => (activeTab = 'missions')}
						>
							Missions ({activeMissions.length})
						</button>
						<button
							type="button"
							class="segment-btn rounded-lg"
							class:active={activeTab === 'chapters'}
							on:click={() => (activeTab = 'chapters')}
						>
							Chapters ({fallbackChapters.length})
						</button>
					</div>
				</div>

				<!-- Deck Content -->
				{#if activeTab === 'missions'}
					<div class="list-flow">
						{#if allMissions.length > 0}
							{#each allMissions as mission (mission.id)}
								<div class="deck-item rounded-xl" class:done={mission.done}>
									<div class="item-left">
										<button 
											type="button" 
											class="checkbox-btn"
											on:click={() => toggleTask(mission.id)}
											aria-label="Toggle task completion"
										>
											<NavIcon name={mission.done ? 'check' : 'circle'} size={18} />
										</button>
										<div class="item-details">
											<p class="item-text" class:crossed={mission.done}>{mission.title}</p>
											<div class="item-meta">
												{#if mission.s}
													<span class="sub-chip" style="color: {subjectColor(mission.s)}">{subjectName(mission.s)}</span>
												{/if}
												<span class="hrs-chip font-mono">· {mission.hrs || 1}h planned</span>
											</div>
										</div>
									</div>
									<span class="priority-badge font-mono rounded-lg">
										{mission.done ? 'COMPLETED' : 'ACTIVE'}
									</span>
								</div>
							{/each}
						{:else}
							<!-- Muted Linear-Style Empty State -->
							<div class="empty-deck-state">
								<div class="empty-icon-wrap rounded-xl">
									<NavIcon name="check" size={24} />
								</div>
								<p class="empty-title">All targets fulfilled</p>
								<p class="empty-desc">
									No active sprint tasks remaining. Queue your next problem set from the planner.
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Active Chapter Checklist -->
					<div class="list-flow">
						{#each fallbackChapters as ch (ch.id)}
							<div class="chapter-deck-item rounded-xl">
								<div class="ch-info">
									<div class="ch-tag-row">
										<span class="ch-subject-tag rounded-lg" style="color: {subjectColor(ch.code)}">
											{subjectName(ch.code)}
										</span>
										<span class="ch-weight-tag font-mono rounded-lg">{ch.weight}</span>
										<h4 class="ch-name">{ch.name}</h4>
									</div>
									<p class="ch-deadline">Target deadline: <span class="font-mono">{ch.due}</span></p>
								</div>

								<div class="ch-progress-wrap">
									<div class="ch-numbers font-mono">
										<b>{ch.solved}</b>
										<span class="tot">/{ch.total} Qs</span>
									</div>
									<div class="progress-bar-track rounded-full">
										<div 
											class="progress-bar-fill rounded-full" 
											style="width: {Math.round((ch.solved / ch.total) * 100)}%; background: {subjectColor(ch.code)}"
										></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<!-- ========================================================= -->
		<!-- RIGHT COLUMN: Mission Support Rail (4 Columns on Desktop) -->
		<!-- ========================================================= -->
		<div class="side-column">
			<!-- TARGET COUNTDOWN: FLIP-CLOCK PILL ARCHITECTURE -->
			<section class="bento-card countdown-card">
				<div class="card-head-row">
					<span class="eyebrow-tag flex-inline">
						<NavIcon name="target" size={13} />
						TARGET COUNTDOWN
					</span>
					<div class="head-actions">
						<button 
							type="button" 
							class="btn-edit-target" 
							on:click={() => (editingTarget = !editingTarget)}
							title="Edit target date"
						>
							<NavIcon name={editingTarget ? "x" : "edit"} size={11} />
							<span>{editingTarget ? "Close" : "Edit"}</span>
						</button>
						<span class="exam-pill font-mono rounded-full">
							{customPresetLabel}
						</span>
					</div>
				</div>

				{#if editingTarget}
					<div class="countdown-editor rounded-xl" in:fade={{ duration: 160 }}>
						<p class="editor-label">SET TARGET EXAM DATE</p>
						<input 
							type="date" 
							class="target-date-input font-mono rounded-lg" 
							value={$tracker.meta.exam || '2026-05-24'} 
							on:change={(e) => {
								if (e.currentTarget.value) {
									setExamDate(e.currentTarget.value);
								}
							}}
						/>
						<div class="preset-chips">
							<button 
								type="button" 
								class="preset-chip rounded-md" 
								class:active={$tracker.meta.exam === '2026-01-24'}
								on:click={() => setExamDate('2026-01-24')}
							>
								Main Jan
							</button>
							<button 
								type="button" 
								class="preset-chip rounded-md" 
								class:active={$tracker.meta.exam === '2026-04-06'}
								on:click={() => setExamDate('2026-04-06')}
							>
								Main Apr
							</button>
							<button 
								type="button" 
								class="preset-chip rounded-md" 
								class:active={$tracker.meta.exam === '2026-05-24' || !$tracker.meta.exam}
								on:click={() => setExamDate('2026-05-24')}
							>
								Advanced
							</button>
						</div>
					</div>
				{:else}
					<div class="countdown-lead" role="button" tabindex="0" on:click={() => (editingTarget = true)} on:keydown={(e) => e.key === 'Enter' && (editingTarget = true)}>
						<div class="title-row">
							<h3 class="exam-title">{customTitleInput}</h3>
							<span class="edit-hint-icon"><NavIcon name="edit" size={12} /></span>
						</div>
						<p class="exam-date font-mono">{formatExamDisplay($tracker.meta.exam)}</p>
					</div>
				{/if}

				<!-- Individual Shaded Time Segment Pills -->
				<div class="time-pills-grid">
					<div class="time-pill rounded-xl">
						<span class="time-digit font-mono">{countdownDays}</span>
						<span class="time-label">DAYS</span>
					</div>
					<div class="time-pill rounded-xl">
						<span class="time-digit font-mono">{countdownHours}</span>
						<span class="time-label">HOURS</span>
					</div>
					<div class="time-pill rounded-xl">
						<span class="time-digit font-mono">{countdownMins}</span>
						<span class="time-label">MINS</span>
					</div>
				</div>

				<div class="countdown-footer">
					<span class="pace-label">Prep Velocity:</span>
					<span class="pace-val font-mono">On Track (+4.2%)</span>
				</div>
			</section>

			<!-- MOTIVATION QUOTE: SERIF CONTRAST & GIANT WATERMARK -->
			<section class="bento-card quote-card">
				<!-- Giant Low-Opacity Watermark Quote Symbol -->
				<span class="giant-watermark font-serif" aria-hidden="true">“</span>

				<div class="quote-content">
					<div class="card-head-row">
						<span class="eyebrow-tag flex-inline">
							<NavIcon name="quote" size={13} />
							MENTAL FRAME
						</span>
						<span class="daily-axiom font-mono">DAILY AXIOM</span>
					</div>

					<!-- Editorial Serif Quote Body -->
					<blockquote class="quote-body font-serif">
						"{currentQuote.text}"
					</blockquote>

					<div class="quote-attribution">
						<div>
							<p class="author-name">{currentQuote.author}</p>
							<p class="author-sub">Core Strategy</p>
						</div>
						<button 
							type="button" 
							class="btn-shuffle rounded-lg"
							on:click={shuffleQuote}
						>
							Another
						</button>
					</div>
				</div>
			</section>

			<!-- QUICK SUBJECT HUBS STRIP -->
			<section class="bento-card subject-strip-card">
				<div class="card-head-row">
					<span class="eyebrow-tag flex-inline">
						<NavIcon name="layers" size={13} />
						SUBJECT HUBS
					</span>
					<span class="hubs-hint">Click to launch</span>
				</div>

				<div class="subjects-quick-stack">
					{#each SUBJECTS as sub (sub.code)}
						<button 
							type="button" 
							class="sub-quick-row rounded-xl"
							on:click={() => openHub(sub.code)}
						>
							<div class="sub-left">
								<span class="sub-dot rounded-full" style="background: {sub.color}"></span>
								<b class="sub-name">{sub.name}</b>
							</div>
							<div class="sub-right font-mono">
								<span>{$subjectSolvedTotals[sub.code] || 0} Qs</span>
								<NavIcon name="arrow-right" size={12} />
							</div>
						</button>
					{/each}
				</div>
			</section>
		</div>
	</div>
</div>

<SubjectHubModal bind:open={hubOpen} sub={hubSub} />

<style>
	/* ========================================================================= */
	/* GLOBAL BENTO ARCHITECTURE & TOKENS                                        */
	/* ========================================================================= */
	.focus-command-view {
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem; /* uniform gap-6 */
		color: var(--text-primary, #f5f5f7);
		font-family: inherit;
	}

	.focus-command-view button {
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		border: none;
		font-family: inherit;
		color: inherit;
		cursor: pointer;
		box-sizing: border-box;
	}

	.font-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
	}

	.font-serif {
		font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
	}

	.mobile-focus-nav {
		display: none;
	}

	/* Top Status Bar */
	.top-telemetry-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle, rgba(255, 255, 255, 0.1)) 40%, transparent);
	}

	.telemetry-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.live-status-dot {
		position: relative;
		display: flex;
		width: 8px;
		height: 8px;
	}
	.live-status-dot .ping {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		background: #10b981;
		opacity: 0.75;
		animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	.live-status-dot .core {
		position: relative;
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: #10b981;
	}
	@keyframes ping {
		75%, 100% { transform: scale(2); opacity: 0; }
	}

	.eyebrow-tag {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-secondary, #a3a3a3);
		opacity: 0.85;
	}

	.flex-inline {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.telemetry-right {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.72rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.streak-val { color: #f59e0b; }
	.accuracy-val { color: var(--text-primary, #ffffff); }
	.divider { opacity: 0.3; }

	/* Bento Grid */
	.bento-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.8fr) minmax(340px, 1fr);
		gap: 1.5rem; /* uniform gap-6 */
		align-items: start;
	}

	.main-column, .side-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem; /* uniform gap-6 */
		min-width: 0;
	}

	/* Card Base: rounded-2xl, p-6, subtle border */
	.bento-card {
		position: relative;
		border-radius: 1rem; /* rounded-2xl */
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		padding: 1.5rem; /* p-6 */
		overflow: hidden;
		transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease, border-color 0.25s ease;
	}
	.bento-card:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.44);
	}

	/* Mathematical Radius Stepping */
	.rounded-xl { border-radius: 0.75rem; }
	.rounded-lg { border-radius: 0.5rem; }
	.rounded-full { border-radius: 9999px; }

	/* HERO COMMAND CENTER CARD */
	.hero-timer-card {
		padding: 1.75rem 2rem;
	}

	.ambient-flare {
		position: absolute;
		width: 240px;
		height: 240px;
		border-radius: 9999px;
		filter: blur(80px);
		pointer-events: none;
		z-index: 0;
		opacity: 0.25;
	}
	.ambient-flare.top-left { top: -60px; left: -60px; background: var(--accent); }
	.ambient-flare.bottom-right { bottom: -60px; right: -60px; background: #10b981; }

	.hero-header-row {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.active-mode-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.3rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.target-subhead {
		font-size: 0.72rem;
		color: var(--text-secondary, #a3a3a3);
		letter-spacing: 0.08em;
	}

	.hero-body-grid {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 2.25rem;
		align-items: center;
	}

	/* Radial Dial Graphic */
	.dial-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.15rem;
		width: 100%;
		max-width: 280px;
		margin: 0 auto;
	}
	.dial-container {
		position: relative;
		width: 200px;
		height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.dial-halo {
		position: absolute;
		width: 170px;
		height: 170px;
		border-radius: 9999px;
		background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 70%);
		filter: blur(14px);
		pointer-events: none;
		z-index: 0;
	}
	.dial-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		z-index: 1;
		pointer-events: none;
	}
	.dial-track {
		stroke: rgba(255, 255, 255, 0.12);
		fill: rgba(10, 10, 18, 0.35);
	}
	.dial-progress {
		stroke: var(--accent);
		fill: transparent;
		transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1);
		filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 75%, transparent));
	}
	.dial-cap-dot {
		fill: var(--accent);
		filter: drop-shadow(0 0 6px var(--accent));
		opacity: 0.85;
	}
	.dial-center-content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		z-index: 2;
		pointer-events: auto;
	}
	.dial-label-row {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.1rem;
	}
	.btn-edit-badge {
		all: unset;
		appearance: none;
		-webkit-appearance: none;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: var(--text-secondary);
		cursor: pointer;
		padding: 2px 5px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		opacity: 0.75;
		transition: all 0.18s ease;
	}
	.btn-edit-badge:hover {
		opacity: 1;
		color: #ffffff;
		background: var(--accent);
		border-color: var(--accent);
		box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 60%, transparent);
	}
	.dial-label {
		font-size: 0.62rem;
		font-weight: 750;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-secondary, #a3a3a3);
	}
	.dial-digits {
		all: unset;
		appearance: none;
		-webkit-appearance: none;
		display: block;
		background: transparent !important;
		border: none !important;
		box-shadow: none !important;
		padding: 0;
		margin: 0.2rem 0;
		font-size: 2.85rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--text-primary);
		text-shadow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);
		box-sizing: border-box;
	}
	.dial-digits.clickable {
		cursor: pointer;
		transition: color 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.dial-digits.clickable:hover {
		color: var(--accent);
		transform: scale(1.05);
	}
	.dial-sub-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #10b981;
		background: color-mix(in srgb, #10b981 12%, transparent);
		border: 1px solid color-mix(in srgb, #10b981 25%, transparent);
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		margin-top: 0.2rem;
	}
	.dial-sub-badge.break-phase {
		color: #f59e0b;
		background: color-mix(in srgb, #f59e0b 12%, transparent);
		border-color: color-mix(in srgb, #f59e0b 25%, transparent);
	}
	.status-pulse-dot {
		width: 5px;
		height: 5px;
		border-radius: 9999px;
		background: currentColor;
		box-shadow: 0 0 6px currentColor;
	}

	/* Duration Presets & Inline Stepper */
	.duration-control-bar {
		width: 100%;
		max-width: 280px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.duration-presets {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 3px;
		background: rgba(0, 0, 0, 0.42);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
		gap: 3px;
		box-sizing: border-box;
	}
	.preset-pill {
		all: unset;
		appearance: none;
		-webkit-appearance: none;
		box-sizing: border-box;
		cursor: pointer;
		flex: 1;
		min-width: 0;
		padding: 0.42rem 0.15rem;
		text-align: center;
		white-space: nowrap;
		font-size: 0.72rem;
		font-weight: 750;
		border-radius: 8px;
		color: var(--text-secondary, #a3a3a3);
		background: transparent;
		border: 1px solid transparent;
		transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.preset-pill:hover:not(:disabled) {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
	}
	.preset-pill.active {
		background: var(--accent) !important;
		color: #ffffff !important;
		font-weight: 800;
		border-color: color-mix(in srgb, var(--accent) 70%, #ffffff) !important;
		box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 55%, transparent) !important;
	}
	.preset-pill:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.custom-duration-stepper {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.5rem;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
		box-sizing: border-box;
	}
	.stepper-btn {
		all: unset;
		appearance: none;
		-webkit-appearance: none;
		box-sizing: border-box;
		cursor: pointer;
		padding: 0.35rem 0.6rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		color: #ffffff;
		font-size: 0.72rem;
		font-weight: 800;
		transition: all 0.15s ease;
	}
	.stepper-btn:hover {
		background: rgba(255, 255, 255, 0.16);
		border-color: var(--accent);
		color: var(--accent);
	}
	.stepper-input-wrap {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}
	.stepper-input {
		all: unset;
		appearance: none;
		-webkit-appearance: none;
		box-sizing: border-box;
		width: 100%;
		padding: 0.35rem 1.6rem 0.35rem 0.45rem;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 8px;
		color: #ffffff;
		font-size: 0.85rem;
		font-weight: 800;
		outline: none;
		text-align: center;
		transition: border-color 0.15s ease;
	}
	.stepper-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.stepper-unit {
		position: absolute;
		right: 0.45rem;
		font-size: 0.55rem;
		font-weight: 800;
		color: var(--text-secondary);
		pointer-events: none;
	}
	.btn-apply-custom {
		all: unset;
		appearance: none;
		-webkit-appearance: none;
		box-sizing: border-box;
		cursor: pointer;
		padding: 0.35rem 0.75rem;
		background: var(--accent);
		color: #ffffff;
		border-radius: 8px;
		font-size: 0.72rem;
		font-weight: 800;
		transition: all 0.15s ease;
	}
	.btn-apply-custom:hover {
		filter: brightness(1.15);
		box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 50%, transparent);
	}

	/* Light mode adjustments */
	:global(:root[data-theme='light']) .dial-track {
		stroke: rgba(0, 0, 0, 0.1);
		fill: rgba(255, 255, 255, 0.55);
	}
	:global(:root[data-theme='light']) .dial-digits {
		color: #1a1827;
		text-shadow: none;
	}
	:global(:root[data-theme='light']) .duration-presets {
		background: rgba(255, 255, 255, 0.8);
		border-color: rgba(0, 0, 0, 0.08);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
	}
	:global(:root[data-theme='light']) .preset-pill {
		color: #4b5563;
	}
	:global(:root[data-theme='light']) .preset-pill:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.05);
		color: #111827;
	}
	:global(:root[data-theme='light']) .preset-pill.active {
		background: var(--accent) !important;
		color: #ffffff !important;
	}
	:global(:root[data-theme='light']) .custom-duration-stepper {
		background: rgba(255, 255, 255, 0.9);
		border-color: rgba(0, 0, 0, 0.08);
	}
	:global(:root[data-theme='light']) .stepper-btn {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.1);
		color: #111827;
	}
	:global(:root[data-theme='light']) .stepper-input {
		background: rgba(255, 255, 255, 0.95);
		border-color: rgba(0, 0, 0, 0.15);
		color: #111827;
	}

	/* Controls Panel */
	.hero-controls-panel {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.hero-heading {
		margin: 0 0 0.4rem;
		font-size: 1.45rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}
	.hero-desc {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.55;
		color: var(--text-secondary, #a3a3a3);
	}

	.telemetry-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.metric-container {
		padding: 0.85rem 1rem;
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		background: color-mix(in srgb, var(--surface-panel, rgba(255, 255, 255, 0.03)) 60%, transparent);
	}
	.metric-label {
		display: block;
		font-size: 0.64rem;
		font-weight: 750;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary, #a3a3a3);
		margin-bottom: 0.3rem;
	}
	.metric-value-row {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}
	.metric-value-row .val {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}
	.metric-value-row .den {
		font-size: 0.76rem;
		color: var(--text-secondary, #a3a3a3);
	}

	.action-btn-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.btn-primary-launch {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		height: 48px;
		padding: 0 1.5rem;
		background: var(--accent);
		color: #ffffff;
		border: none;
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		cursor: pointer;
		box-shadow: 0 8px 24px -4px color-mix(in srgb, var(--accent), transparent 50%);
		transition: transform 0.18s ease, filter 0.18s ease;
	}
	.btn-primary-launch:hover {
		filter: brightness(1.12);
		transform: translateY(-1px);
	}
	.btn-primary-launch:active {
		transform: scale(0.98);
	}
	.shortcut-kbd {
		display: inline-block;
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: #ffffff;
	}
	.btn-icon-subtle {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.18s ease;
	}
	.btn-icon-subtle:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: var(--surface-subtle);
	}

	/* UNIFIED ACTION DECK */
	.deck-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
	}
	.deck-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}
	.deck-subtitle {
		display: block;
		font-size: 0.64rem;
		font-weight: 750;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary, #a3a3a3);
		margin-top: 0.15rem;
	}

	.segmented-control {
		display: inline-flex;
		padding: 3px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}
	.segment-btn {
		padding: 0.35rem 0.95rem;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.18s ease;
	}
	.segment-btn.active {
		background: var(--accent);
		color: #ffffff;
		box-shadow: 0 2px 10px color-mix(in srgb, var(--accent), transparent 50%);
	}

	.list-flow {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.deck-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		transition: all 0.18s ease;
	}
	.deck-item:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
	}
	.deck-item.done {
		opacity: 0.55;
	}
	.item-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}
	.checkbox-btn {
		background: transparent;
		border: none;
		padding: 0;
		color: var(--text-secondary, #a3a3a3);
		cursor: pointer;
	}
	.checkbox-btn:hover { color: #10b981; }
	.item-details { min-width: 0; }
	.item-text {
		margin: 0;
		font-size: 0.86rem;
		font-weight: 650;
		color: var(--text-primary, #ffffff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.item-text.crossed { text-decoration: line-through; color: var(--text-secondary, #a3a3a3); }
	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		font-size: 0.68rem;
	}
	.sub-chip { font-weight: 750; text-transform: uppercase; }
	.hrs-chip { color: var(--text-secondary, #a3a3a3); }
	.priority-badge {
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		padding: 0.25rem 0.55rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--text-secondary, #a3a3a3);
	}

	.empty-deck-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
	}
	.empty-icon-wrap {
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #10b981;
		margin-bottom: 0.75rem;
	}
	.empty-title {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 750;
		color: var(--text-primary);
	}
	.empty-desc {
		margin: 0.25rem 0 0;
		font-size: 0.78rem;
		color: var(--text-secondary, #a3a3a3);
		max-width: 320px;
	}

	/* Chapters Tab Flow */
	.chapter-deck-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		transition: all 0.18s ease;
	}
	.chapter-deck-item:hover {
		border-color: var(--accent);
	}
	.ch-info { min-width: 0; }
	.ch-tag-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}
	.ch-subject-tag {
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.15rem 0.45rem;
		background: rgba(255, 255, 255, 0.05);
	}
	.ch-weight-tag {
		font-size: 0.62rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.ch-name {
		margin: 0;
		font-size: 0.84rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.ch-deadline {
		margin: 0.25rem 0 0;
		font-size: 0.72rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.ch-progress-wrap {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 160px;
	}
	.ch-numbers {
		font-size: 0.78rem;
		color: var(--text-primary);
	}
	.ch-numbers .tot { color: var(--text-secondary, #a3a3a3); font-size: 0.7rem; }
	.progress-bar-track {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.progress-bar-fill {
		height: 100%;
		transition: width 0.6s ease;
	}

	/* RIGHT RAIL: COUNTDOWN CARD */
	.card-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.9rem;
	}
	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.btn-edit-target {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		font-size: 0.65rem;
		font-weight: 750;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.btn-edit-target:hover {
		background: color-mix(in srgb, var(--accent) 24%, transparent);
		transform: scale(1.02);
	}
	.exam-pill {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.2rem 0.55rem;
		color: #f43f5e;
		background: rgba(244, 63, 94, 0.12);
		border: 1px solid rgba(244, 63, 94, 0.25);
	}
	.countdown-lead {
		margin-bottom: 1rem;
		cursor: pointer;
	}
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	.edit-hint-icon {
		opacity: 0.45;
		color: var(--text-secondary);
		transition: opacity 0.16s ease, color 0.16s ease;
	}
	.countdown-lead:hover .edit-hint-icon {
		opacity: 1;
		color: var(--accent);
	}
	.exam-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}
	.exam-date {
		margin: 0.15rem 0 0;
		font-size: 0.74rem;
		color: var(--text-secondary, #a3a3a3);
	}

	.countdown-editor {
		padding: 0.85rem;
		margin-bottom: 1rem;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.editor-label {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
		text-transform: uppercase;
	}
	.target-date-input {
		width: 100%;
		padding: 0.45rem 0.6rem;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 700;
		outline: none;
		transition: border-color 0.18s ease;
		box-sizing: border-box;
	}
	.target-date-input:focus {
		border-color: var(--accent);
	}
	.preset-chips {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
	.preset-chip {
		padding: 0.22rem 0.55rem;
		font-size: 0.66rem;
		font-weight: 700;
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.preset-chip:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}
	.preset-chip.active {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		border-color: var(--accent);
		color: var(--accent);
	}

	.time-pills-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.65rem;
	}
	.time-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 0.5rem;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}
	.time-digit {
		font-size: 1.9rem;
		font-weight: 900;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--text-primary);
	}
	.time-label {
		font-size: 0.58rem;
		font-weight: 750;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-secondary, #a3a3a3);
		margin-top: 0.35rem;
	}

	.countdown-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--border-subtle);
		font-size: 0.74rem;
	}
	.pace-label { color: var(--text-secondary, #a3a3a3); }
	.pace-val { font-weight: 800; color: #10b981; }

	/* MOTIVATION QUOTE CARD */
	.quote-card {
		min-height: 200px;
	}
	.giant-watermark {
		position: absolute;
		right: 0.5rem;
		bottom: -1rem;
		font-size: 9rem;
		line-height: 1;
		opacity: 0.04;
		color: var(--text-primary);
		pointer-events: none;
		user-select: none;
	}
	.quote-content {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		gap: 1rem;
	}
	.daily-axiom {
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		color: var(--text-secondary, #a3a3a3);
	}
	.quote-body {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 400;
		line-height: 1.6;
		color: var(--text-primary);
	}
	.quote-attribution {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
	}
	.author-name {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 750;
		color: var(--text-primary);
	}
	.author-sub {
		margin: 0;
		font-size: 0.65rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.btn-shuffle {
		padding: 0.25rem 0.65rem;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.btn-shuffle:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	/* QUICK SUBJECT HUBS STRIP */
	.hubs-hint {
		font-size: 0.66rem;
		color: var(--text-secondary);
	}
	.subjects-quick-stack {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.sub-quick-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: inherit;
		cursor: pointer;
		transition: all 0.18s ease;
	}
	.sub-quick-row:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
		transform: translateX(2px);
	}
	.sub-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.sub-dot {
		width: 8px;
		height: 8px;
	}
	.sub-name {
		font-size: 0.82rem;
		font-weight: 750;
	}
	.sub-right {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.74rem;
		color: var(--text-secondary, #a3a3a3);
	}

	/* ========================================================================= */
	/* Mode mobile class overrides (when simulated via preview) */
	.mode-mobile .mobile-focus-nav {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
		padding: 0.3rem;
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(16px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 12px;
	}
	.mode-mobile .mobile-tab-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.55rem 0.3rem;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.mode-mobile .mobile-tab-btn.active {
		background: var(--surface-canvas);
		color: var(--accent);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
	.mode-mobile.mobile-tab-timer :global(.action-deck-card),
	.mode-mobile.mobile-tab-timer .side-column {
		display: none !important;
	}
	.mode-mobile.mobile-tab-deck :global(.hero-timer-card),
	.mode-mobile.mobile-tab-deck .side-column {
		display: none !important;
	}
	.mode-mobile.mobile-tab-support .main-column {
		display: none !important;
	}

	.mode-mobile .top-telemetry-bar {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.mode-mobile .telemetry-right {
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.mode-mobile .bento-layout {
		grid-template-columns: 1fr;
	}
	.mode-mobile .hero-body-grid {
		grid-template-columns: 1fr;
		text-align: center;
	}
	.mode-mobile .dial-wrapper {
		margin: 0 auto;
	}
	.mode-mobile .duration-control-bar {
		max-width: 320px;
		width: 100%;
	}
	.mode-mobile .hero-controls-panel {
		align-items: center;
	}
	.mode-mobile .telemetry-grid {
		width: 100%;
	}
	.mode-mobile .action-btn-bar {
		width: 100%;
	}
	.mode-mobile .hero-timer-card {
		padding: 1.25rem 1rem !important;
	}
	.mode-mobile .hero-header-row {
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.mode-mobile .hero-heading {
		font-size: 1.15rem;
	}
	.mode-mobile .hero-desc {
		font-size: 0.78rem;
		line-height: 1.45;
	}
	.mode-mobile .shortcut-kbd {
		display: none;
	}
	.mode-mobile .bento-card {
		padding: 1.15rem 1rem;
	}
	.mode-mobile .preset-chips {
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.mode-mobile .time-digit {
		font-size: 1.55rem;
	}
	.mode-mobile .time-label {
		font-size: 0.52rem;
	}
	.mode-mobile .deck-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.mode-mobile .segmented-control {
		width: 100%;
	}
	.mode-mobile .segment-btn {
		flex: 1;
		padding: 0.5rem;
	}

	/* RESPONSIVE BREAKPOINTS (Viewport based) */
	@media (max-width: 1024px) {
		.bento-layout {
			grid-template-columns: 1fr;
		}
		.hero-body-grid {
			grid-template-columns: 1fr;
			text-align: center;
		}
		.dial-wrapper {
			margin: 0 auto;
		}
		.hero-controls-panel {
			align-items: center;
		}
		.telemetry-grid {
			width: 100%;
		}
		.action-btn-bar {
			width: 100%;
		}
	}

	@media (max-width: 768px) {
		.focus-command-view {
			gap: 1.15rem;
		}
		.mobile-focus-nav {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.35rem;
			padding: 0.3rem;
			background: var(--vision-glass-bg, var(--surface-panel));
			backdrop-filter: var(--vision-glass-blur, blur(16px));
			-webkit-backdrop-filter: var(--vision-glass-blur, blur(16px));
			border: 1px solid var(--vision-bevel-border, var(--border-subtle));
			border-radius: 12px;
		}
		.mobile-tab-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 0.35rem;
			padding: 0.55rem 0.3rem;
			border-radius: 8px;
			border: none;
			background: transparent;
			color: var(--text-secondary);
			font-size: 0.72rem;
			font-weight: 700;
			cursor: pointer;
			transition: all 0.16s ease;
		}
		.mobile-tab-btn.active {
			background: var(--surface-canvas);
			color: var(--accent);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}

		/* Mobile tab filtering */
		.focus-command-view.mobile-tab-timer :global(.action-deck-card),
		.focus-command-view.mobile-tab-timer .side-column {
			display: none !important;
		}
		.focus-command-view.mobile-tab-deck :global(.hero-timer-card),
		.focus-command-view.mobile-tab-deck .side-column {
			display: none !important;
		}
		.focus-command-view.mobile-tab-support .main-column {
			display: none !important;
		}

		.top-telemetry-bar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		.telemetry-right {
			flex-wrap: wrap;
			gap: 0.4rem;
		}
		.hero-timer-card {
			padding: 1.25rem 1rem !important;
		}
		.hero-header-row {
			flex-wrap: wrap;
			gap: 0.5rem;
			margin-bottom: 1rem;
		}
		.hero-heading {
			font-size: 1.15rem;
		}
		.hero-desc {
			font-size: 0.78rem;
			line-height: 1.45;
		}
		.shortcut-kbd {
			display: none;
		}
		.duration-control-bar {
			max-width: 320px;
			width: 100%;
		}
		.deck-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
		.segmented-control {
			width: 100%;
		}
		.segment-btn {
			flex: 1;
			padding: 0.5rem 0.5rem;
			font-size: 0.74rem;
		}
		.bento-card {
			padding: 1.15rem 1rem;
		}
		.preset-chips {
			flex-wrap: wrap;
			gap: 0.35rem;
		}
		.time-pills-grid {
			gap: 0.45rem;
		}
		.time-pill {
			padding: 0.65rem 0.35rem;
		}
		.time-digit {
			font-size: 1.55rem;
		}
		.time-label {
			font-size: 0.52rem;
		}
		.quote-body {
			font-size: 0.95rem;
		}
	}

	@media (max-width: 400px) {
		.telemetry-grid {
			grid-template-columns: 1fr;
		}
		.dial-svg {
			width: 165px;
			height: 165px;
		}
		.dial-digits {
			font-size: 2rem;
		}
		.btn-primary-launch {
			font-size: 0.75rem;
			padding: 0 1rem;
		}
	}
</style>
