<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { updateTracker } from '$lib/stores/tracker';
	import { createGoals } from '$lib/state/defaults';
	import { currentUser } from '$lib/stores/auth';
	import NavIcon from '$lib/components/NavIcon.svelte';

	const TOTAL_STEPS = 7;
	let step = 1;
	let direction = 1; // 1 = forward, -1 = backward

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
			// keep at least 1 exam
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

	// Step 6: Streak Demo
	const DAYS = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
	let streakDays = [true, true, true, false, true, true, false];
	function toggleStreakDay(i: number) {
		streakDays = streakDays.map((v, idx) => idx === i ? !v : v);
	}
	$: streakCount = streakDays.filter(Boolean).length;

	// Step 7: Commitment
	let signed = false;

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

	function formatHours(h: number): string {
		return `${h}h 0m`;
	}

	function finish() {
		signed = true;
		updateTracker(s => {
			s.meta.name = userName.trim();
			s.meta.board = board;
			s.meta.targetExams = [...targetExams];
			s.meta.year = year;
			s.meta.weekdayHours = weekdayHours;
			s.meta.weekendHours = weekendHours;
			s.meta.dailyQuestions = dailyQuestions;
			s.meta.weekGoalH = Math.round(weekdayHours * 5 + weekendHours * 2);
			if (!s.goals) s.goals = createGoals();
			s.goals.day.h = weekdayHours;
			s.goals.day.q = dailyQuestions;
			s.goals.week.h = Math.round(weekdayHours * 5 + weekendHours * 2);
			s.goals.week.q = dailyQuestions * 7;
			s.onboarded = true;
		});
	}

	$: examLabels = targetExams
		.map(id => EXAMS.find(e => e.id === id)?.label)
		.filter(Boolean)
		.join(', ');

	$: todayFormatted = new Date().toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
</script>

<div class="onboarding-overlay" transition:fade={{ duration: 250 }}>
	<div class="onboarding-container">
		<!-- Header / Progress bar -->
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
			<span class="step-counter">Step {step} / {TOTAL_STEPS}</span>
		</header>

		<!-- Card Content area with transitions -->
		<div class="wizard-body">
			{#key step}
				<div
					class="wizard-card"
					in:fly={{ x: direction * 50, duration: 280, easing: quintOut, opacity: 0 }}
					out:fly={{ x: direction * -50, duration: 200, easing: quintOut, opacity: 0 }}
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
								autofocus
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
								>
									<div class="radio-circle" class:checked={targetExams.includes(ex.id)}></div>
									<div class="grid-content">
										<strong>{ex.label}</strong>
									</div>
									<span class="flag-icon">{ex.emoji}</span>
								</button>
							{/each}
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

					<!-- STEP 6: Streak Demo -->
					{:else if step === 6}
						<div class="card-header">
							<h1>Keep your flame alive</h1>
							<p class="subtitle">Each day with a session makes your streak grow. Rest days keep it safe.</p>
						</div>

						<div class="flame-section">
							<div class="flame-icon">🔥</div>
							<div class="flame-counter">{streakCount} days in a row</div>
							<p class="flame-sub">Tap a day and watch how your streak changes.</p>

							<div class="week-pills">
								{#each DAYS as d, i}
									<button
										type="button"
										class="day-circle"
										class:active={streakDays[i]}
										on:click={() => toggleStreakDay(i)}
									>
										<span class="day-name">{d}</span>
										<div class="circle-state" class:on={streakDays[i]}>
											{#if streakDays[i]}
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
													<polyline points="20 6 9 17 4 12"></polyline>
												</svg>
											{:else}
												<span>☕</span>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						</div>

					<!-- STEP 7: Commitment -->
					{:else if step === 7}
						<div class="card-header">
							<h1>{userName || 'Atharv'}, lock in your commitment</h1>
							<p class="subtitle">Your signature turns this plan into your goal.</p>
						</div>

						<div class="promise-box">
							<div class="promise-badge">
								<span class="badge-owl">🦉</span>
								<span class="badge-title">My Study Promise</span>
							</div>

							<p class="promise-statement">
								I, <strong>{userName || 'Atharv'}</strong>, promise myself: I will study
								<strong>{formatHours(weekdayHours)}</strong> on <strong>weekdays</strong> and
								<strong>{formatHours(weekendHours)}</strong> on <strong>weekends</strong>,
								solving <strong>{dailyQuestions} questions daily</strong>,
								working toward <strong>{examLabels || 'JEE'}</strong>.
							</p>

							<!-- Signature Box -->
							<button
								type="button"
								class="signature-box"
								class:signed
								on:click={() => signed = !signed}
							>
								{#if signed}
									<span class="handwritten-signature" in:scale={{ start: 0.8, duration: 250 }}>
										{userName || 'Atharv'}
									</span>
								{:else}
									<span class="sign-cue">Sign here</span>
								{/if}
							</button>

							<div class="signature-footer">
								<span class="signer-name">{userName || 'Atharv'}</span>
								<span class="sign-date">{todayFormatted}</span>
							</div>
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<!-- Footer navigation -->
		<footer class="wizard-footer">
			{#if step > 1}
				<button type="button" class="btn-back" on:click={back}>
					<NavIcon name="chevron-left" size={14} /> Back
				</button>
			{:else}
				<div></div>
			{/if}

			{#if step < TOTAL_STEPS}
				<button
					type="button"
					class="btn-continue"
					disabled={!canProceed()}
					on:click={next}
				>
					Continue <NavIcon name="chevron-right" size={14} />
				</button>
			{:else}
				<button
					type="button"
					class="btn-commit"
					on:click={finish}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					I commit
				</button>
			{/if}
		</footer>
	</div>
</div>

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-canvas);
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
		box-shadow: 0 24px 60px -15px rgba(0, 0, 0, 0.4);
		padding: 2.25rem clamp(1.5rem, 4vw, 3rem);
		position: relative;
	}

	/* Header */
	.wizard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
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

	.step-counter {
		font-size: 0.78rem;
		font-weight: 650;
		color: var(--text-secondary);
	}

	/* Body & Card */
	.wizard-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: relative;
		min-height: 380px;
	}

	.wizard-card {
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	.card-header {
		text-align: left;
		margin-bottom: 1.5rem;
	}

	.card-header h1 {
		margin: 0 0 0.4rem;
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
		transition: all 0.16s ease;
	}

	.option-row:hover, .option-grid-item:hover {
		border-color: color-mix(in srgb, var(--accent), var(--border-subtle) 40%);
		background: color-mix(in srgb, var(--accent), transparent 96%);
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
		gap: 1rem;
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
		padding: 0.4rem;
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
		padding: 0.5rem 0;
	}

	.flame-icon {
		font-size: 3.5rem;
		line-height: 1;
		margin-bottom: 0.5rem;
		filter: drop-shadow(0 6px 12px rgba(245, 158, 11, 0.35));
		animation: pulse-flame 1.5s ease-in-out infinite alternate;
	}

	@keyframes pulse-flame {
		0% { transform: scale(1); }
		100% { transform: scale(1.08) translateY(-2px); }
	}

	.flame-counter {
		font-size: 1.35rem;
		font-weight: 850;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.flame-sub {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0.2rem 0 1.5rem;
	}

	.week-pills {
		display: flex;
		gap: clamp(0.4rem, 1.5vw, 0.75rem);
		justify-content: center;
	}

	.day-circle {
		background: none;
		border: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		font-family: inherit;
		padding: 0.2rem;
	}

	.day-name {
		font-size: 0.72rem;
		font-weight: 650;
		color: var(--text-secondary);
	}

	.circle-state {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1.5px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 40%);
		display: grid;
		place-items: center;
		color: var(--text-secondary);
		font-size: 0.85rem;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.circle-state.on {
		border-color: #22c55e;
		background: #22c55e;
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
	}

	.circle-state svg {
		width: 18px;
		height: 18px;
	}

	/* Promise & Commitment (Step 7) */
	.promise-box {
		border: 1px solid var(--border-subtle);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-panel), var(--surface-canvas) 25%);
		padding: 1.5rem clamp(1.2rem, 3vw, 2rem);
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.promise-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.badge-owl {
		font-size: 1.2rem;
	}

	.badge-title {
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.promise-statement {
		font-size: 0.88rem;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0;
		text-align: center;
	}

	.promise-statement strong {
		color: var(--text-primary);
		font-weight: 750;
	}

	.signature-box {
		height: 84px;
		border: 1.5px dashed var(--border-subtle);
		border-radius: 14px;
		background: color-mix(in srgb, var(--surface-panel), transparent 40%);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: all 0.2s ease;
		outline: none;
		padding: 0;
		font-family: inherit;
	}

	.signature-box:hover {
		border-color: var(--accent);
	}

	.signature-box.signed {
		border-style: solid;
		border-color: color-mix(in srgb, var(--accent), transparent 50%);
		background: color-mix(in srgb, var(--accent), transparent 94%);
	}

	.sign-cue {
		font-size: 1.1rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--accent), var(--text-secondary) 40%);
	}

	.handwritten-signature {
		font-family: 'Brush Script MT', 'Caveat', cursive, sans-serif;
		font-size: 2.2rem;
		color: var(--accent);
		letter-spacing: 0.04em;
	}

	.signature-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.74rem;
		font-weight: 650;
		color: var(--text-secondary);
		border-top: 1px dotted var(--border-subtle);
		padding-top: 0.6rem;
	}

	/* Footer Navigation */
	.wizard-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 2rem;
		padding-top: 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 40%);
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

	.btn-commit {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.7rem 1.6rem;
		border-radius: 12px;
		border: none;
		background: #22c55e;
		color: #ffffff;
		font-size: 0.88rem;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
		transition: all 0.16s ease;
		font-family: inherit;
	}

	.btn-commit:hover {
		background: #16a34a;
		transform: translateY(-1px);
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

		.week-pills {
			gap: 0.3rem;
		}

		.circle-state {
			width: 32px;
			height: 32px;
		}
	}
</style>
