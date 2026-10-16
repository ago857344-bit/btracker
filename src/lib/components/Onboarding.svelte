<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { updateTracker, targetsModalOpen, celebration } from '$lib/stores/tracker';
	import { createGoals } from '$lib/state/defaults';
	import { currentUser } from '$lib/stores/auth';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import type { DashboardLayout } from '$lib/types/tracker';
	import DashboardPreviewModal from '$lib/components/dashboard/DashboardPreviewModal.svelte';

	const TOTAL_STEPS = 8;
	let step = 1;
	let direction = 1; // 1 = forward, -1 = backward
	const focusInput = (node: HTMLElement) => { node.focus(); };

	// Step 1: Name
	let userName = $currentUser?.name?.split(' ')[0] || '';

	// Step 2: Year
	let year: '11' | '12' | 'dropper' | '' = '';

	// Step 3: Board
	let board: 'cbse' | 'icse' | 'ib' | 'state' | '' = '';

	// Step 4: Target Exams (multi-select)
	let targetExams: string[] = ['jee-mains', 'jee-advanced'];
	const EXAMS = [
		{ id: 'jee-mains', label: 'JEE Mains', emoji: '🎯' },
		{ id: 'jee-advanced', label: 'JEE Advanced', emoji: '🚀' },
		{ id: 'bitsat', label: 'BITSAT', emoji: '⚡' },
		{ id: 'mht-cet', label: 'MHT-CET', emoji: '🏛️' },
		{ id: 'wbjee', label: 'WBJEE', emoji: '📐' },
		{ id: 'comedk', label: 'COMEDK', emoji: '🔬' },
		{ id: 'viteee', label: 'VITEEE', emoji: '🧪' },
		{ id: 'other', label: 'Other State / Engg', emoji: '✨' },
	];

	function toggleExam(id: string) {
		if (targetExams.includes(id)) {
			if (targetExams.length > 1) {
				targetExams = targetExams.filter(e => e !== id);
			}
		} else {
			targetExams = [...targetExams, id];
		}
	}

	// Step 5: Study Hours & Daily Questions
	let weekdayHours = 6;
	let weekendHours = 8;
	let dailyQuestions = 50;

	// Step 6: Interactive Streak Simulation & Single-Day Freeze Demo
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	// Demo: Mon-Wed studied, Thu missed (isolated single day -> gets freeze), Fri-Sun studied
	let streakDemo = [true, true, true, false, true, true, true];

	function toggleStreakDay(i: number) {
		streakDemo = streakDemo.map((v, idx) => (idx === i ? !v : v));
	}

	function setDemoPreset(preset: 'perfect' | 'freeze' | 'lost') {
		if (preset === 'perfect') {
			streakDemo = [true, true, true, true, true, true, true];
		} else if (preset === 'freeze') {
			// Thursday missed (isolated 1 day miss -> Streak Freeze applied)
			streakDemo = [true, true, true, false, true, true, true];
		} else if (preset === 'lost') {
			// Thu & Fri missed (2+ consecutive missed days -> Streak Lost)
			streakDemo = [true, true, true, false, false, true, true];
		}
	}

	$: streakAnalysis = (() => {
		// Evaluates each day in the 7-day demo:
		// Rule: A missed day gets a streak freeze IF AND ONLY IF it is an isolated single missed day.
		// If 2 or more consecutive days are missed, they lose their streak!
		const statuses: Array<'studied' | 'frozen' | 'lost'> = [];
		for (let i = 0; i < 7; i++) {
			if (streakDemo[i]) {
				statuses.push('studied');
			} else {
				const prevMissed = i > 0 && !streakDemo[i - 1];
				const nextMissed = i < 6 && !streakDemo[i + 1];
				if (prevMissed || nextMissed) {
					statuses.push('lost');
				} else {
					statuses.push('frozen');
				}
			}
		}

		// Calculate the active streak ending at Sunday (index 6):
		// If Sunday has 2+ consecutive missed days ending there -> streak is lost (0)!
		let count = 0;
		let streakIsLost = false;
		let hasFreeze = false;

		if (!streakDemo[6] && !streakDemo[5]) {
			// Sunday and Saturday both missed -> 2+ missed days -> streak lost!
			count = 0;
			streakIsLost = true;
		} else {
			let cur = 6;
			while (cur >= 0) {
				if (streakDemo[cur]) {
					count++;
					cur--;
				} else {
					// Missed day
					const prevMissed = cur > 0 && !streakDemo[cur - 1];
					if (prevMissed) {
						// 2+ consecutive missed days -> streak terminates!
						break;
					} else {
						// Single isolated missed day -> gets Streak Freeze!
						hasFreeze = true;
						count++;
						cur--;
					}
				}
			}
			if (count === 0) streakIsLost = true;
		}

		return {
			statuses,
			count,
			streakIsLost,
			hasFreeze
		};
	})();

	// Step 7: Choose Your Dashboard Structure
	let selectedLayout: DashboardLayout = 'default';
	let previewModalOpen = false;
	let previewLayout: DashboardLayout = 'default';

	function openLayoutPreview(layoutId: DashboardLayout) {
		previewLayout = layoutId;
		previewModalOpen = true;
	}

	function handlePreviewSelect(e: CustomEvent<DashboardLayout>) {
		selectedLayout = e.detail;
	}

	const LAYOUT_OPTIONS: Array<{ id: DashboardLayout; label: string; desc: string; badge: string }> = [
		{
			id: 'default',
			label: 'Default',
			desc: 'Balanced 3-column classic dashboard with full widget coverage.',
			badge: 'Classic'
		},
		{
			id: 'minimalist',
			label: 'Minimalist',
			desc: 'Flat & inline, borderless 2-column flow with thin 1px dividers.',
			badge: 'Ultra Sleek'
		},
		{
			id: 'focus',
			label: 'Focus',
			desc: '70/30 asymmetric split prioritizing timer & active tasks.',
			badge: 'Deep Work'
		}
	];

	// Step 8: Dream Destination & Mission Dossier (Original replacement for commitment)
	let dreamCollege = 'IIT Bombay (CSE)';
	const DREAM_OPTIONS = [
		'IIT Bombay (CSE)',
		'IIT Delhi',
		'IIT Madras',
		'BITS Pilani (CS)',
		'IIT Kanpur',
		'IIT Kharagpur',
		'Top 500 AIR',
		'Top 1000 AIR'
	];
	let isCustomDream = false;
	let customDreamInput = '';

	function selectDream(college: string) {
		isCustomDream = false;
		dreamCollege = college;
	}

	function enableCustomDream() {
		isCustomDream = true;
		if (customDreamInput.trim()) dreamCollege = customDreamInput.trim();
	}

	$: if (isCustomDream && customDreamInput.trim()) {
		dreamCollege = customDreamInput.trim();
	}

	// Navigation
	function canProceed(): boolean {
		switch (step) {
			case 1: return userName.trim().length > 0;
			case 2: return year !== '';
			case 3: return board !== '';
			case 4: return targetExams.length > 0;
			case 5: return weekdayHours > 0 && dailyQuestions > 0;
			case 6: return true;
			case 7: return true;
			case 8: return Boolean(dreamCollege.trim());
			default: return true;
		}
	}

	function next() {
		if (!canProceed()) return;
		if (step < TOTAL_STEPS) {
			direction = 1;
			step++;
		}
	}

	function back() {
		if (step > 1) {
			direction = -1;
			step--;
		}
	}

	function dismiss() {
		targetsModalOpen.set(false);
	}

	function skipSetup() {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('btracker_seen_setup_wizard_v1', 'true');
			} catch {}
		}
		updateTracker(s => {
			s.onboarded = true;
			if (!s.ui.dashboardLayout) s.ui.dashboardLayout = selectedLayout || 'default';
		});
		targetsModalOpen.set(false);
		celebration.set('Setup skipped. You can configure goals & layout anytime in Settings.');
	}

	function formatHours(h: number): string {
		return `${h}h 0m`;
	}

	function finish() {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('btracker_seen_setup_wizard_v1', 'true');
			} catch {}
		}
		const college = dreamCollege.trim() || 'IIT Bombay';
		updateTracker(s => {
			s.meta.name = userName.trim();
			s.meta.board = board;
			s.meta.targetExams = [...targetExams];
			s.meta.year = year;
			s.meta.weekdayHours = weekdayHours;
			s.meta.weekendHours = weekendHours;
			s.meta.dailyQuestions = dailyQuestions;
			s.meta.dreamCollege = college;
			s.meta.weekGoalH = Math.round(weekdayHours * 5 + weekendHours * 2);
			if (!s.goals) s.goals = createGoals();
			s.goals.day.h = weekdayHours;
			s.goals.day.q = dailyQuestions;
			s.goals.week.h = Math.round(weekdayHours * 5 + weekendHours * 2);
			s.goals.week.q = dailyQuestions * 7;
			s.ui.dashboardLayout = selectedLayout;
			s.onboarded = true;
		});
		targetsModalOpen.set(false);
		celebration.set(`🚀 Battle Station Activated for ${userName.trim()} • Target: ${college}!`);
	}

	$: examLabels = targetExams
		.map(id => EXAMS.find(e => e.id === id)?.label)
		.filter(Boolean)
		.join(', ');
</script>

<div class="onboarding-overlay" transition:fade={{ duration: 240 }}>
	<div class="onboarding-container">
		<!-- Header / Progress bar with Dev Exit Button -->
		<header class="wizard-header">
			<div class="dots-track">
				{#each Array(TOTAL_STEPS) as _, i}
					<span
						class="dot"
						class:active={i < step}
						class:current={i === step - 1}
					></span>
				{/each}
			</div>
			<div class="header-right">
				<button type="button" class="btn-skip-header" on:click={skipSetup} title="Skip Setup Wizard">
					<span>Skip</span>
					<NavIcon name="x" size={13} />
				</button>
				<span class="step-counter">Step {step} / {TOTAL_STEPS}</span>
			</div>
		</header>

		<!-- Card Content Area with Ultra-Smooth Overlay Transitions -->
		<div class="wizard-body">
			{#key step}
				<div
					class="wizard-card"
					in:fly={{ x: direction * 28, duration: 280, easing: quintOut, opacity: 0 }}
					out:fly={{ x: direction * -28, duration: 200, easing: quintOut, opacity: 0 }}
				>
					<!-- STEP 1: Name -->
					{#if step === 1}
						<div class="card-header">
							<h1>What should we call you?</h1>
							<p class="subtitle">We'll use this to cheer you on across your dashboard.</p>
						</div>

						<div class="hero-avatar">
							<div class="avatar-disc">
								<span class="avatar-icon">🏛️</span>
							</div>
						</div>

						<div class="input-card">
							<label for="ob-user-name" class="input-label">What's your name?</label>
							<input
								id="ob-user-name"
								type="text"
								bind:value={userName}
								placeholder="e.g. Atharv"
								autocomplete="name"
								use:focusInput
								class="text-input"
								on:keydown={(e) => e.key === 'Enter' && next()}
							/>
						</div>

					<!-- STEP 2: Year -->
					{:else if step === 2}
						<div class="card-header">
							<h1>Which year are you in{userName ? `, ${userName}` : ''}?</h1>
							<p class="subtitle">This shapes your study pacing and JEE target timeline.</p>
						</div>

						<div class="card-options-col">
							<button
								type="button"
								class="option-row"
								class:selected={year === '11'}
								on:click={() => { year = '11'; next(); }}
							>
								<div class="radio-circle" class:checked={year === '11'}></div>
								<div class="option-text">
									<strong>Class 11</strong>
									<span>Starting JEE preparation foundation</span>
								</div>
								<span class="badge-icon">📘</span>
							</button>

							<button
								type="button"
								class="option-row"
								class:selected={year === '12'}
								on:click={() => { year = '12'; next(); }}
							>
								<div class="radio-circle" class:checked={year === '12'}></div>
								<div class="option-text">
									<strong>Class 12</strong>
									<span>Balancing 12th Board exams + JEE</span>
								</div>
								<span class="badge-icon">📕</span>
							</button>

							<button
								type="button"
								class="option-row"
								class:selected={year === 'dropper'}
								on:click={() => { year = 'dropper'; next(); }}
							>
								<div class="radio-circle" class:checked={year === 'dropper'}></div>
								<div class="option-text">
									<strong>Dropper / Repeater</strong>
									<span>Full-time dedicated JEE grind</span>
								</div>
								<span class="badge-icon">⚡</span>
							</button>
						</div>

					<!-- STEP 3: Board -->
					{:else if step === 3}
						<div class="card-header">
							<h1>Which board are you in?</h1>
							<p class="subtitle">You can change this anytime in Settings.</p>
						</div>

						<div class="card-options-grid">
							<button
								type="button"
								class="option-grid-item"
								class:selected={board === 'cbse'}
								on:click={() => { board = 'cbse'; next(); }}
							>
								<div class="radio-circle" class:checked={board === 'cbse'}></div>
								<div class="grid-content">
									<strong>CBSE</strong>
									<span>Central Board</span>
								</div>
								<span class="flag-icon">🇮🇳</span>
							</button>

							<button
								type="button"
								class="option-grid-item"
								class:selected={board === 'icse'}
								on:click={() => { board = 'icse'; next(); }}
							>
								<div class="radio-circle" class:checked={board === 'icse'}></div>
								<div class="grid-content">
									<strong>ICSE / ISC</strong>
									<span>CISCE Board</span>
								</div>
								<span class="flag-icon">📋</span>
							</button>

							<button
								type="button"
								class="option-grid-item"
								class:selected={board === 'state'}
								on:click={() => { board = 'state'; next(); }}
							>
								<div class="radio-circle" class:checked={board === 'state'}></div>
								<div class="grid-content">
									<strong>State Board</strong>
									<span>HSC / PUC / WB etc.</span>
								</div>
								<span class="flag-icon">🏛️</span>
							</button>

							<button
								type="button"
								class="option-grid-item"
								class:selected={board === 'ib'}
								on:click={() => { board = 'ib'; next(); }}
							>
								<div class="radio-circle" class:checked={board === 'ib'}></div>
								<div class="grid-content">
									<strong>IB / Cambridge</strong>
									<span>International Board</span>
								</div>
								<span class="flag-icon">🌍</span>
							</button>
						</div>

					<!-- STEP 4: Target Exams -->
					{:else if step === 4}
						<div class="card-header">
							<h1>What are you working toward?</h1>
							<p class="subtitle">Pick your main exams — BTracker tailors targets to them.</p>
						</div>

						<div class="card-options-grid">
							{#each EXAMS as ex}
								<button
									type="button"
									class="option-grid-item"
									class:selected={targetExams.includes(ex.id)}
									on:click={() => toggleExam(ex.id)}
									on:dblclick={next}
								>
									<div class="radio-circle" class:checked={targetExams.includes(ex.id)}></div>
									<div class="grid-content">
										<strong>{ex.label}</strong>
									</div>
									<span class="flag-icon">{ex.emoji}</span>
								</button>
							{/each}
						</div>

						<div class="step-action-bar">
							<span class="selection-count">{targetExams.length} target exam{targetExams.length > 1 ? 's' : ''} selected</span>
							<button type="button" class="btn-step-continue" on:click={next}>
								Continue <NavIcon name="chevron-right" size={14} />
							</button>
						</div>

					<!-- STEP 5: Study Hours & Daily Questions -->
					{:else if step === 5}
						<div class="card-header">
							<h1>How much will you study?</h1>
							<p class="subtitle">Set your daily targets — we'll hold you accountable.</p>
						</div>

						<div class="targets-form">
							<!-- Daily Hours -->
							<div class="hours-split">
								<div class="target-card">
									<span class="card-tag">WEEKDAYS</span>
									<div class="big-metric">{formatHours(weekdayHours)}</div>
									<input
										type="range"
										min="2"
										max="14"
										step="1"
										bind:value={weekdayHours}
										class="slider"
									/>
									<span class="sub-hint">Mon – Fri</span>
								</div>

								<div class="target-card">
									<span class="card-tag">WEEKENDS</span>
									<div class="big-metric">{formatHours(weekendHours)}</div>
									<input
										type="range"
										min="2"
										max="16"
										step="1"
										bind:value={weekendHours}
										class="slider"
									/>
									<span class="sub-hint">Sat & Sun</span>
								</div>
							</div>

							<!-- Daily Questions Target -->
							<div class="questions-card">
								<div class="questions-card-top">
									<div>
										<strong>Daily Questions Target</strong>
										<p class="sub-hint">Solving speed and consistency target</p>
									</div>
									<span class="pill-badge">{dailyQuestions} Qs / day</span>
								</div>
								<input
									type="range"
									min="10"
									max="120"
									step="5"
									bind:value={dailyQuestions}
									class="slider"
								/>
								<div class="pill-options">
									{#each [30, 50, 75, 100] as q}
										<button
											type="button"
											class="pill-btn"
											class:active={dailyQuestions === q}
											on:click={() => dailyQuestions = q}
										>
											{q} Qs
										</button>
									{/each}
								</div>
							</div>

							<div class="summary-line">
								Weekly: <strong>{weekdayHours * 5 + weekendHours * 2}h study</strong> &bull; <strong>{dailyQuestions * 7} questions solved</strong>
							</div>
						</div>

					<!-- STEP 6: Streak Demo & Single-Day Freeze Simulation -->
					{:else if step === 6}
						<div class="card-header">
							<h1>Keep your flame alive</h1>
							<p class="subtitle">Miss 1 day? You get a <strong>Streak Freeze</strong>. Miss more than 1 day? You <strong>lose your streak</strong>.</p>
						</div>

						<div class="flame-section">
							<!-- Dynamic Animated Icon -->
							<div class="flame-icon-wrap" class:lost={streakAnalysis.streakIsLost} class:frozen={!streakAnalysis.streakIsLost && streakAnalysis.hasFreeze}>
								{#if streakAnalysis.streakIsLost}
									<div class="flame-icon lost" title="Streak lost">💨</div>
								{:else if streakAnalysis.hasFreeze}
									<div class="flame-icon frozen" title="Shielded with Streak Freeze">🛡️</div>
								{:else}
									<div class="flame-icon fiery" title="Flame burning bright">🔥</div>
								{/if}
							</div>

							<div class="flame-counter" class:lost={streakAnalysis.streakIsLost}>
								{#if streakAnalysis.streakIsLost}
									<span class="count-lost">0 Days &bull; Streak Lost!</span>
								{:else}
									<span>{streakAnalysis.count} days in a row</span>
								{/if}
							</div>

							<!-- Dynamic Rule Feedback Banner -->
							{#if streakAnalysis.streakIsLost}
								<div class="streak-status-banner lost">
									<span class="banner-badge lost">💔 STREAK LOST</span>
									<span class="banner-msg">You missed <strong>2 or more consecutive days</strong> without studying. Your streak was broken and reset to 0.</span>
								</div>
							{:else if streakAnalysis.hasFreeze}
								<div class="streak-status-banner frozen">
									<span class="banner-badge frozen">🛡️ STREAK FREEZE APPLIED</span>
									<span class="banner-msg">Single missed day detected! A <strong>Streak Freeze</strong> shielded your streak so your flame stays alive.</span>
								</div>
							{:else}
								<div class="streak-status-banner active">
									<span class="banner-badge active">🔥 ON FIRE</span>
									<span class="banner-msg">Unbroken discipline! Single day skips are shielded by Streak Freeze, but missing 2+ days loses your streak.</span>
								</div>
							{/if}

							<!-- Interactive Week Days -->
							<div class="week-pills">
								{#each DAYS as d, i}
									<button
										type="button"
										class="day-circle {streakAnalysis.statuses[i]}"
										on:click={() => toggleStreakDay(i)}
										title="Tap to toggle {d}: {streakAnalysis.statuses[i]}"
									>
										<span class="day-name">{d}</span>
										<div class="circle-state {streakAnalysis.statuses[i]}">
											{#if streakAnalysis.statuses[i] === 'studied'}
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
													<polyline points="20 6 9 17 4 12"></polyline>
												</svg>
											{:else if streakAnalysis.statuses[i] === 'frozen'}
												<span class="state-emoji">🛡️</span>
											{:else}
												<span class="state-emoji">✕</span>
											{/if}
										</div>
										<span class="day-status-pill {streakAnalysis.statuses[i]}">
											{#if streakAnalysis.statuses[i] === 'studied'}
												Done
											{:else if streakAnalysis.statuses[i] === 'frozen'}
												Freeze
											{:else}
												Lost
											{/if}
										</span>
									</button>
								{/each}
							</div>

							<!-- Quick Presets for Instant Testing -->
							<div class="streak-presets">
								<span class="presets-title">SIMULATE SCENARIOS:</span>
								<div class="presets-btns">
									<button type="button" class="preset-btn" on:click={() => setDemoPreset('perfect')}>🔥 Perfect Week</button>
									<button type="button" class="preset-btn" on:click={() => setDemoPreset('freeze')}>🛡️ 1 Day Missed (Freeze)</button>
									<button type="button" class="preset-btn" on:click={() => setDemoPreset('lost')}>💔 2+ Days Missed (Lost)</button>
								</div>
							</div>
						</div>

					<!-- STEP 7: Choose Your Dashboard Structure -->
					{:else if step === 7}
						<div class="card-header">
							<h1>Choose Your Dashboard Structure</h1>
							<p class="subtitle">Select how your battle station presents timers, missions, and analytics. You can change this anytime in Settings.</p>
						</div>

						<div class="layouts-wizard-grid">
							{#each LAYOUT_OPTIONS as opt}
								<div
									role="button"
									tabindex="0"
									class="layout-wizard-card"
									class:active={selectedLayout === opt.id}
									on:click={() => (selectedLayout = opt.id)}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											selectedLayout = opt.id;
										}
									}}
								>
									<div class="layout-wireframe wireframe-{opt.id}">
										{#if opt.id === 'default'}
											<div class="wf-col wf-col-main"></div>
											<div class="wf-col wf-col-side"></div>
										{:else if opt.id === 'minimalist'}
											<div class="wf-topbar"></div>
											<div class="wf-row">
												<div class="wf-cell"></div>
												<div class="wf-cell"></div>
											</div>
											<div class="wf-bottombar"></div>
										{:else if opt.id === 'focus'}
											<div class="wf-row wf-focus-row">
												<div class="wf-hero"></div>
												<div class="wf-rail">
													<div></div>
													<div></div>
												</div>
											</div>
										{/if}
									</div>
									<div class="layout-wizard-meta">
										<div class="layout-wizard-head">
											<span class="layout-wizard-title">{opt.label}</span>
											<span class="layout-wizard-badge" class:active-badge={selectedLayout === opt.id}>{opt.badge}</span>
										</div>
										<p class="layout-wizard-desc">{opt.desc}</p>
									</div>
									<button
										type="button"
										class="btn-card-preview"
										title="Preview {opt.label} Dashboard"
										on:click|stopPropagation={() => openLayoutPreview(opt.id)}
									>
										<NavIcon name="tv" size={13} />
										<span>Live Preview</span>
									</button>
								</div>
							{/each}
						</div>

					<!-- STEP 8: Original JEE Blueprint & Aspirant Dossier -->
					{:else if step === 8}
						<div class="card-header">
							<h1>{userName || 'Candidate'}, Your JEE Battle Station is Ready</h1>
							<p class="subtitle">Lock in your dream destination and activate your command center.</p>
						</div>

						<div class="dossier-wrapper">
							<!-- Dream Target Selection -->
							<div class="dream-picker">
								<span class="picker-label">🎯 SELECT YOUR DREAM TARGET</span>
								<div class="dream-chips">
									{#each DREAM_OPTIONS as opt}
										<button
											type="button"
											class="dream-chip"
											class:active={!isCustomDream && dreamCollege === opt}
											on:click={() => selectDream(opt)}
										>
											{opt}
										</button>
									{/each}
									<button
										type="button"
										class="dream-chip custom"
										class:active={isCustomDream}
										on:click={enableCustomDream}
									>
										✍️ Custom Goal
									</button>
								</div>

								{#if isCustomDream}
									<div class="custom-input-wrap">
										<input
											type="text"
											bind:value={customDreamInput}
											placeholder="e.g. Top 100 AIR / IIIT Hyderabad CSE"
											class="custom-dream-input"
											use:focusInput
										/>
									</div>
								{/if}
							</div>

							<!-- Holographic Aspirant Dossier Pass -->
							<div class="aspirant-pass">
								<div class="pass-top">
									<div class="pass-tag">
										<span class="pulse-indicator"></span>
										<span>BTRACKER CADET DOSSIER</span>
									</div>
									<span class="pass-cohort">
										{year === 'dropper' ? 'DROPPER BATCH' : `CLASS ${year || '12'} COHORT`}
									</span>
								</div>

								<div class="pass-body">
									<div class="pass-row main">
										<div class="pass-item">
											<small>ASPIRANT</small>
											<b>{userName.toUpperCase() || 'ATHARV'}</b>
										</div>
										<div class="pass-item highlight">
											<small>TARGET DESTINATION</small>
											<b class="destination-text">{dreamCollege || 'IIT BOMBAY'}</b>
										</div>
									</div>

									<div class="pass-row sub">
										<div class="pass-item">
											<small>PRIMARY FOCUS</small>
											<span>{examLabels || 'JEE Mains & Advanced'}</span>
										</div>
										<div class="pass-item">
											<small>BOARD</small>
											<span>{board.toUpperCase() || 'CBSE'}</span>
										</div>
									</div>

									<div class="pass-row stats">
										<div class="pass-item">
											<small>DAILY TARGET</small>
											<span>{weekdayHours}h study &bull; {dailyQuestions} Qs/day</span>
										</div>
										<div class="pass-item">
											<small>WEEKLY COMMITMENT</small>
											<span>{weekdayHours * 5 + weekendHours * 2}h total focus</span>
										</div>
									</div>
								</div>

								<div class="pass-footer">
									<span>● SYSTEM STATUS: INITIALIZED & READY FOR DAY 1</span>
									<span>WAR ROOM</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Footer Navigation -->
		<footer class="wizard-footer">
			<div class="footer-left">
				{#if step > 1}
					<button type="button" class="btn-back" on:click={back}>
						<NavIcon name="chevron-left" size={14} /> Back
					</button>
				{/if}
				<button type="button" class="btn-skip-footer" on:click={skipSetup} title="Skip Setup Wizard">
					Skip Setup
				</button>
			</div>

			{#if step < TOTAL_STEPS}
				<button
					type="button"
					class="btn-continue"
					disabled={step === 1 ? !userName.trim() : step === 2 ? !year : step === 3 ? !board : step === 4 ? targetExams.length === 0 : step === 5 ? (weekdayHours <= 0 || dailyQuestions <= 0) : step === 8 ? !dreamCollege.trim() : false}
					on:click={next}
				>
					Continue <NavIcon name="chevron-right" size={14} />
				</button>
			{:else}
				<button
					type="button"
					class="btn-launch"
					on:click={finish}
				>
					<span>🚀</span>
					Launch Battle Station
				</button>
			{/if}
		</footer>
	</div>
</div>

<DashboardPreviewModal
	bind:open={previewModalOpen}
	layout={previewLayout}
	on:select={handlePreviewSelect}
/>

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--surface-canvas), rgba(0, 0, 0, 0.7) 60%);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		padding: clamp(1rem, 3vw, 2.5rem);
		overflow-y: auto;
	}

	.onboarding-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 660px;
		min-height: 580px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 28px;
		box-shadow: 0 28px 70px -15px rgba(0, 0, 0, 0.5);
		padding: 2.25rem clamp(1.5rem, 4vw, 3rem);
		position: relative;
	}

	/* Header */
	.wizard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.75rem;
	}

	.dots-track {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 99px;
		background: var(--border-subtle);
		transition: all 0.25s ease;
	}

	.dot.active {
		background: var(--accent);
	}

	.dot.current {
		width: 18px;
		background: var(--accent);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.step-counter {
		font-size: 0.78rem;
		font-weight: 650;
		color: var(--text-secondary);
	}

	.close-btn {
		background: transparent;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.close-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.btn-skip-header {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.32rem 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}

	.btn-skip-header:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	/* Body & Card - Overlapping grid cell for 100% smooth, non-jumping transitions */
	.wizard-body {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		position: relative;
		min-height: 420px;
		align-items: center;
		overflow-x: hidden;
	}

	.wizard-card {
		grid-area: 1 / 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.card-header {
		text-align: left;
		margin-bottom: 1.4rem;
	}

	.card-header h1 {
		margin: 0 0 0.35rem;
		font-size: 1.45rem;
		font-weight: 800;
		letter-spacing: -0.035em;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.subtitle {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	/* Hero Avatar for Step 1 */
	.hero-avatar {
		display: flex;
		justify-content: center;
		margin: 1.2rem 0 1.8rem;
	}

	.avatar-disc {
		width: 86px;
		height: 86px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, #9d7bff 0%, #6d5dfc 60%, #4338ca 100%);
		display: grid;
		place-items: center;
		box-shadow: 0 12px 28px -6px rgba(109, 93, 252, 0.45);
	}

	.avatar-icon {
		font-size: 2.3rem;
	}

	/* Input Card */
	.input-card {
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 40%);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		transition: border-color 0.2s;
	}

	.input-card:focus-within {
		border-color: var(--accent);
	}

	.input-label {
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.text-input {
		background: transparent;
		border: none;
		outline: none;
		font-size: 1.05rem;
		font-weight: 650;
		color: var(--text-primary);
		font-family: inherit;
		padding: 0;
	}

	/* Option Lists & Grids */
	.card-options-col {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card-options-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.option-row, .option-grid-item {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.95rem 1.15rem;
		border: 1.5px solid var(--border-subtle);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 20%);
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.option-row:hover, .option-grid-item:hover {
		border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 40%);
		background: color-mix(in srgb, var(--accent), transparent 96%);
		transform: translateY(-1px);
	}

	.option-row:active, .option-grid-item:active {
		transform: scale(0.985);
	}

	.option-row.selected, .option-grid-item.selected {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent), transparent 92%);
		box-shadow: 0 0 0 1px var(--accent);
	}

	.radio-circle {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--border-subtle);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		transition: all 0.18s;
	}

	.radio-circle.checked {
		border-color: var(--accent);
	}

	.radio-circle.checked::after {
		content: '';
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
	}

	.option-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
	}

	.option-text strong {
		font-size: 0.92rem;
		color: var(--text-primary);
	}

	.option-text span {
		font-size: 0.76rem;
		color: var(--text-secondary);
	}

	.badge-icon {
		font-size: 1.3rem;
	}

	.grid-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.grid-content strong {
		font-size: 0.88rem;
		color: var(--text-primary);
	}

	.grid-content span {
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.flag-icon {
		font-size: 1.15rem;
	}

	/* Targets Form (Step 5) */
	.targets-form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.hours-split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.85rem;
	}

	.target-card {
		padding: 1.15rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 20%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
	}

	.card-tag {
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}

	.big-metric {
		font-size: 1.85rem;
		font-weight: 850;
		letter-spacing: -0.04em;
		color: var(--accent);
	}

	.slider {
		width: 100%;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.sub-hint {
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.questions-card {
		padding: 1.15rem 1.25rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 20%);
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.questions-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.questions-card-top strong {
		font-size: 0.88rem;
		color: var(--text-primary);
	}

	.questions-card-top .sub-hint {
		margin: 0.1rem 0 0;
	}

	.pill-badge {
		font-size: 0.78rem;
		font-weight: 750;
		padding: 0.25rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent), transparent 85%);
		color: var(--accent);
	}

	.pill-options {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.2rem;
	}

	.pill-btn {
		flex: 1;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}

	.pill-btn.active {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent), transparent 90%);
	}

	.summary-line {
		text-align: center;
		font-size: 0.82rem;
		color: var(--text-secondary);
		padding: 0.3rem;
	}

	.summary-line strong {
		color: var(--text-primary);
	}

	/* Flame / Streak (Step 6) */
	.flame-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 0.2rem 0;
	}

	.flame-icon-wrap {
		display: grid;
		place-items: center;
		margin-bottom: 0.35rem;
		transition: all 0.25s ease;
	}

	.flame-icon {
		font-size: 3.5rem;
		line-height: 1;
	}

	.flame-icon.fiery {
		filter: drop-shadow(0 6px 14px rgba(245, 158, 11, 0.45));
		animation: pulse-flame 1.5s ease-in-out infinite alternate;
	}

	.flame-icon.frozen {
		filter: drop-shadow(0 6px 14px rgba(56, 189, 248, 0.5));
		animation: pulse-frost 1.8s ease-in-out infinite alternate;
	}

	.flame-icon.lost {
		filter: grayscale(1) opacity(0.5);
		animation: none;
	}

	@keyframes pulse-flame {
		0% { transform: scale(1); }
		100% { transform: scale(1.08) translateY(-3px); }
	}

	@keyframes pulse-frost {
		0% { transform: scale(1); }
		100% { transform: scale(1.06) translateY(-2px); }
	}

	.flame-counter {
		font-size: 1.35rem;
		font-weight: 850;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.flame-counter.lost {
		color: #ef4444;
	}

	.streak-status-banner {
		width: 100%;
		max-width: 440px;
		margin: 0.65rem 0 1.25rem;
		padding: 0.65rem 0.95rem;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.78rem;
		transition: all 0.2s ease;
	}

	.streak-status-banner.active {
		border: 1px solid color-mix(in srgb, #f59e0b 35%, var(--border-subtle));
		background: color-mix(in srgb, #f59e0b 8%, var(--surface-subtle));
	}

	.streak-status-banner.frozen {
		border: 1px solid color-mix(in srgb, #38bdf8 45%, var(--border-subtle));
		background: color-mix(in srgb, #38bdf8 12%, var(--surface-subtle));
	}

	.streak-status-banner.lost {
		border: 1px solid color-mix(in srgb, #ef4444 45%, var(--border-subtle));
		background: color-mix(in srgb, #ef4444 12%, var(--surface-subtle));
	}

	.banner-badge {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		border-radius: 99px;
	}

	.banner-badge.active {
		background: #f59e0b;
		color: #1a0f00;
	}

	.banner-badge.frozen {
		background: #38bdf8;
		color: #071720;
	}

	.banner-badge.lost {
		background: #ef4444;
		color: #ffffff;
	}

	.banner-msg {
		color: var(--text-secondary);
		line-height: 1.35;
		text-align: center;
	}

	.banner-msg strong {
		color: var(--text-primary);
	}

	.week-pills {
		display: flex;
		gap: clamp(0.35rem, 1.4vw, 0.7rem);
		justify-content: center;
		margin-bottom: 1.2rem;
	}

	.day-circle {
		background: none;
		border: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		font-family: inherit;
		padding: 0.2rem;
		transition: transform 0.15s ease;
	}

	.day-circle:hover {
		transform: translateY(-2px);
	}

	.day-circle:active {
		transform: scale(0.94);
	}

	.day-name {
		font-size: 0.72rem;
		font-weight: 650;
		color: var(--text-secondary);
	}

	.circle-state {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1.5px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 40%);
		display: grid;
		place-items: center;
		font-size: 0.85rem;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.circle-state.studied {
		border-color: #22c55e;
		background: #22c55e;
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
	}

	.circle-state.frozen {
		border-color: #38bdf8;
		background: color-mix(in srgb, #38bdf8 22%, var(--surface-panel));
		box-shadow: 0 4px 14px rgba(56, 189, 248, 0.45);
	}

	.circle-state.lost {
		border-color: #ef4444;
		background: color-mix(in srgb, #ef4444 18%, var(--surface-panel));
		color: #ef4444;
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
	}

	.circle-state svg {
		width: 18px;
		height: 18px;
	}

	.state-emoji {
		font-size: 1.05rem;
		line-height: 1;
	}

	.day-status-pill {
		font-size: 0.62rem;
		font-weight: 750;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		border-radius: 4px;
		padding: 1px 5px;
	}

	.day-status-pill.studied {
		color: #22c55e;
		background: color-mix(in srgb, #22c55e 15%, transparent);
	}

	.day-status-pill.frozen {
		color: #38bdf8;
		background: color-mix(in srgb, #38bdf8 18%, transparent);
	}

	.day-status-pill.lost {
		color: #ef4444;
		background: color-mix(in srgb, #ef4444 15%, transparent);
	}

	.streak-presets {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding-top: 0.4rem;
	}

	.presets-title {
		font-size: 0.68rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		color: var(--text-tertiary);
	}

	.presets-btns {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.45rem;
	}

	.preset-btn {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		border-radius: 8px;
		padding: 0.35rem 0.65rem;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.preset-btn:hover {
		border-color: var(--accent);
		color: var(--text-primary);
		transform: translateY(-1px);
	}

	.preset-btn:active {
		transform: scale(0.96);
	}

	/* STEP 7: Original JEE Blueprint & Aspirant Dossier */
	.dossier-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.dream-picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.picker-label {
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}

	.dream-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.dream-chip {
		padding: 0.4rem 0.75rem;
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 30%);
		color: var(--text-secondary);
		font-size: 0.78rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}

	.dream-chip:hover {
		border-color: var(--accent);
		color: var(--text-primary);
	}

	.dream-chip.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent), transparent 88%);
		color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}

	.custom-input-wrap {
		margin-top: 0.25rem;
	}

	.custom-dream-input {
		width: 100%;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--accent);
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-panel), transparent 40%);
		color: var(--text-primary);
		font-size: 0.88rem;
		font-family: inherit;
		outline: none;
	}

	/* Holographic Aspirant Dossier Card */
	.aspirant-pass {
		border-radius: 20px;
		border: 1.5px solid color-mix(in srgb, var(--accent), var(--border-subtle) 40%);
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent), transparent 94%) 0%, color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 20%) 100%);
		padding: 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
		box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.35);
		position: relative;
		overflow: hidden;
	}

	.aspirant-pass::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent), transparent 88%) 0%, transparent 60%);
		pointer-events: none;
	}

	.pass-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle), transparent 40%);
		padding-bottom: 0.6rem;
		font-size: 0.72rem;
		font-weight: 750;
		letter-spacing: 0.06em;
	}

	.pass-tag {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--accent);
	}

	.pulse-indicator {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 8px #22c55e;
	}

	.pass-cohort {
		color: var(--text-secondary);
	}

	.pass-body {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.pass-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.pass-item {
		display: flex;
		flex-direction: column;
		gap: 0.18rem;
	}

	.pass-item small {
		font-size: 0.64rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}

	.pass-item b {
		font-size: 1.05rem;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.destination-text {
		color: var(--accent) !important;
		font-weight: 850 !important;
	}

	.pass-item span {
		font-size: 0.82rem;
		font-weight: 650;
		color: var(--text-primary);
	}

	.pass-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px dashed color-mix(in srgb, var(--border-subtle), transparent 40%);
		padding-top: 0.6rem;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-secondary);
		letter-spacing: 0.04em;
	}

	/* Footer Navigation */
	.wizard-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.8rem;
		padding-top: 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 40%);
	}

	.footer-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.btn-skip-footer {
		display: inline-flex;
		align-items: center;
		padding: 0.65rem 0.95rem;
		border-radius: 12px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.btn-skip-footer:hover {
		color: var(--text-primary);
		border-color: var(--border-subtle);
		background: var(--surface-subtle);
		text-decoration: none;
	}

	.btn-back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.65rem 1.15rem;
		border-radius: 12px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}

	.btn-back:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
	}

	.btn-continue {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.65rem 1.4rem;
		border-radius: 12px;
		border: none;
		background: #0f172a;
		color: #ffffff;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}

	:global(:root[data-theme='light']) .btn-continue {
		background: #0f172a;
		color: #ffffff;
	}

	:global(:root[data-theme='dark']) .btn-continue {
		background: #f8fafc;
		color: #0f172a;
	}

	.btn-continue:hover {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	.btn-continue:disabled {
		opacity: 0.35;
		cursor: not-allowed;
		transform: none;
	}

	.btn-launch {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.65rem;
		border-radius: 14px;
		border: none;
		background: linear-gradient(135deg, #6366f1 0%, var(--accent) 50%, #4338ca 100%);
		color: #ffffff;
		font-size: 0.92rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
		transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
		font-family: inherit;
	}

	.btn-launch:hover {
		filter: brightness(1.1);
		transform: translateY(-2px);
		box-shadow: 0 10px 28px rgba(99, 102, 241, 0.55);
	}

	.btn-launch:active {
		transform: scale(0.98);
	}

	@media (max-width: 600px) {
		.onboarding-container {
			padding: 1.5rem 1.25rem;
			min-height: auto;
			border-radius: 20px;
		}

		.card-header h1 {
			font-size: 1.25rem;
		}

		.card-options-grid {
			grid-template-columns: 1fr;
		}

		.hours-split {
			grid-template-columns: 1fr;
		}

		.pass-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.week-pills {
			gap: 0.3rem;
		}

		.circle-state {
			width: 32px;
			height: 32px;
		}
	}

	/* Step 7 Layout Picker */
	.layouts-wizard-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.85rem;
		margin-top: 0.5rem;
	}
	@media (max-width: 680px) {
		.layouts-wizard-grid {
			grid-template-columns: 1fr;
		}
	}
	.layout-wizard-card {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.9rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		cursor: pointer;
		text-align: left;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		font-family: inherit;
	}
	.layout-wizard-card:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
	}
	.layout-wizard-card.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, var(--surface-subtle));
		box-shadow: 0 0 0 1px var(--accent), 0 8px 24px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.layout-wireframe {
		width: 100%;
		height: 62px;
		border-radius: 10px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-sizing: border-box;
		overflow: hidden;
	}
	/* Default wireframe */
	.wireframe-default {
		display: flex;
		flex-direction: row;
		gap: 4px;
	}
	.wf-col-main {
		flex: 2;
		background: color-mix(in srgb, var(--accent) 30%, var(--surface-subtle));
		border-radius: 4px;
	}
	.wf-col-side {
		flex: 1;
		background: var(--surface-subtle);
		border-radius: 4px;
	}
	/* Minimalist wireframe */
	.wireframe-minimalist {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.wf-topbar {
		height: 10px;
		background: color-mix(in srgb, var(--accent) 40%, var(--surface-subtle));
		border-radius: 3px;
	}
	.wireframe-minimalist .wf-row {
		display: flex;
		gap: 4px;
		flex: 1;
	}
	.wireframe-minimalist .wf-cell {
		flex: 1;
		background: var(--surface-subtle);
		border-radius: 3px;
	}
	.wf-bottombar {
		height: 8px;
		background: var(--surface-subtle);
		border-radius: 2px;
	}
	/* Focus wireframe */
	.wf-focus-row {
		display: flex;
		gap: 4px;
		height: 100%;
	}
	.wf-hero {
		flex: 7;
		background: color-mix(in srgb, var(--accent) 45%, var(--surface-subtle));
		border-radius: 4px;
	}
	.wf-rail {
		flex: 3;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.wf-rail div {
		flex: 1;
		background: var(--surface-subtle);
		border-radius: 3px;
	}
	.layout-wizard-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.layout-wizard-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.layout-wizard-title {
		font-size: 0.88rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	.layout-wizard-badge {
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 7px;
		border-radius: 99px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}
	.layout-wizard-badge.active-badge {
		background: var(--accent);
		border-color: var(--accent);
		color: #ffffff;
	}
	.layout-wizard-desc {
		margin: 0;
		font-size: 0.74rem;
		line-height: 1.4;
		color: var(--text-secondary);
	}

	.btn-card-preview {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.38rem 0.75rem;
		margin-top: 0.4rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-panel));
		color: var(--accent);
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}
	.btn-card-preview:hover {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-panel));
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.btn-card-preview:active {
		transform: scale(0.97);
	}

	.step-action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.25rem;
		padding: 0.75rem 1rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border-subtle));
	}
	.selection-count {
		font-size: 0.8rem;
		font-weight: 750;
		color: var(--text-primary);
	}
	.btn-step-continue {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 1rem;
		border-radius: 10px;
		border: none;
		background: var(--accent);
		color: #ffffff;
		font-size: 0.82rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
	}
	.btn-step-continue:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}
	.btn-step-continue:active {
		transform: scale(0.97);
	}
</style>
