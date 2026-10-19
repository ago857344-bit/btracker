<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import SubjectHubModal from '$lib/components/widgets/SubjectHubModal.svelte';
	import {
		tracker, streakDays, dailyProgress, subjectSolvedTotals,
		recentActivity, toggleTask, updateTracker, logManualMinutes,
		celebration, formulaVaultOpen
	} from '$lib/stores/tracker';
	import { globalTimer } from '$lib/stores/timerState';
	import { SUBJECTS, subjectName, subjectColor } from '$lib/state/subjects';
	import { getEloRank } from '$lib/state/gamification';
	import { QUOTES, quoteForDay } from '$lib/state/quotes';
	import { formatMinutes, todayKey, lastNDays, focusMinutesOn, weekdayShort } from '$lib/state/dates';

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';

	let activeTab: 'tasks' | 'subjects' | 'activity' | 'target' = 'tasks';

	// Subject Hub Modal
	let hubOpen = false;
	let hubSub = 'P';
	function openHub(code: string) {
		hubSub = code;
		hubOpen = true;
	}

	// Quick manual time logging
	let logOpen = false;
	let logMinutes = 45;
	let logSubject = 'P';
	function handleSaveLog() {
		logManualMinutes(Math.max(1, Math.round(logMinutes)), logSubject || null);
		celebration.set(`Logged ${logMinutes}m focus session! ⏱️`);
		logOpen = false;
		logMinutes = 45;
	}

	// Quick task creator
	let newTaskTitle = '';
	let newTaskSubject: 'P' | 'C' | 'M' | '' = '';
	function handleQuickAddTask() {
		const title = newTaskTitle.trim();
		if (!title) return;
		updateTracker((state) => {
			if (!state.h) state.h = [];
			state.h.unshift({
				id: crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`,
				title,
				s: (newTaskSubject || undefined) as any,
				due: todayKey(),
				pri: 'med' as any,
				done: false
			});
		});
		celebration.set('Task added to today! 🎯');
		newTaskTitle = '';
	}

	// Active Tasks
	$: today = todayKey();
	$: pendingTasks = ($tracker.h || []).filter((t) => !t.done);
	$: completedTasks = ($tracker.hd || []).filter((t) => t.done);
	$: allTasks = [...pendingTasks, ...completedTasks];

	// Focus Today
	$: todayFocusMinutes = focusMinutesOn($tracker.log, today);
	$: todayTargetMinutes = ($tracker.meta?.weekdayHours ?? 6) * 60;
	$: focusHoursText = Math.floor(todayFocusMinutes / 60);
	$: focusMinsText = todayFocusMinutes % 60;

	// Solved Today
	$: todaySolved = $dailyProgress?.solved ?? 0;
	$: todayTarget = $dailyProgress?.questionGoal ?? ($tracker.meta?.dailyQuestions ?? 50);
	$: solvedPct = Math.min(100, Math.round((todaySolved / Math.max(1, todayTarget)) * 100));

	// Circular Progress Ring Geometry (r = 40, circum = 251.32)
	const RING_R = 40;
	const RING_CIRCUM = 2 * Math.PI * RING_R;
	$: strokeOffset = RING_CIRCUM - (RING_CIRCUM * (solvedPct / 100));

	// Subject Summaries
	const SUBJECT_TARGETS: Record<string, number> = { P: 680, C: 720, M: 650 };
	$: subjectItems = SUBJECTS.map((sub) => {
		const solved = $subjectSolvedTotals[sub.code] || 0;
		const total = SUBJECT_TARGETS[sub.code] || 650;
		const pct = Math.min(100, Math.round((solved / total) * 100));
		const eloVal = ($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[sub.code as 'P' | 'C' | 'M'] || 300;
		const elo = getEloRank(eloVal);
		return { ...sub, solved, total, pct, elo, eloVal };
	});

	// Exam Countdown
	let now = Date.now();
	$: examTarget = $tracker.meta.exam
		? new Date($tracker.meta.exam.includes('T') ? $tracker.meta.exam : $tracker.meta.exam + 'T09:00:00').getTime()
		: new Date('2026-05-24T09:00:00').getTime();
	$: diffDays = Math.max(0, Math.floor((examTarget - now) / (1000 * 60 * 60 * 24)));

	// 14-Day Mini Cadence Dots
	$: days14 = lastNDays(14);
	$: dayDots = days14.map((d) => {
		const mins = focusMinutesOn($tracker.log, d);
		const lvl = mins >= 180 ? 4 : mins >= 120 ? 3 : mins >= 60 ? 2 : mins > 0 ? 1 : 0;
		return { d, mins, lvl, short: weekdayShort(d) };
	});

	// Rotating Quote
	let quoteIndex = QUOTES.indexOf(quoteForDay());
	if (quoteIndex < 0) quoteIndex = 0;
	$: currentQuote = QUOTES[quoteIndex] || quoteForDay();
	function nextQuote() {
		quoteIndex = (quoteIndex + 1) % QUOTES.length;
	}
</script>

<div class="pocket-dashboard" class:mode-mobile={deviceMode === 'mobile'}>
	<!-- ========================================================= -->
	<!-- 1. GLANCEABLE KPI HERO POD                                -->
	<!-- ========================================================= -->
	<section class="kpi-hero-card">
		<div class="ring-column">
			<div class="progress-ring-wrap" title="{solvedPct}% daily question target completed">
				<svg class="progress-svg" viewBox="0 0 100 100" aria-hidden="true">
					<circle
						class="ring-bg"
						cx="50"
						cy="50"
						r={RING_R}
						stroke-width="9"
					/>
					<circle
						class="ring-fill"
						cx="50"
						cy="50"
						r={RING_R}
						stroke-width="9"
						stroke-dasharray={RING_CIRCUM}
						stroke-dashoffset={strokeOffset}
					/>
				</svg>
				<div class="ring-label font-mono">
					<span class="ring-val">{todaySolved}</span>
					<span class="ring-sub">/{todayTarget}</span>
				</div>
			</div>
		</div>

		<div class="telemetry-column">
			<div class="badge-row">
				<span class="streak-pill" title="Daily Study Streak">
					🔥 <b>{$streakDays}</b> d streak
				</span>
				<span class="level-pill" title="Current Level">
					⚡ Lvl <b>{$tracker.gamification?.level || 1}</b>
				</span>
			</div>

			<div class="metrics-grid">
				<div class="metric-box">
					<span class="m-label font-mono">FOCUS TODAY</span>
					<span class="m-val font-mono">
						<b>{focusHoursText}</b>h <b>{focusMinsText}</b>m
					</span>
				</div>
				<div class="metric-box">
					<span class="m-label font-mono">GOAL PACE</span>
					<span class="m-val font-mono" class:good={solvedPct >= 100}>
						<b>{solvedPct}</b>%
					</span>
				</div>
			</div>
		</div>
	</section>

	<!-- ========================================================= -->
	<!-- 2. THUMB-ZONE RAPID ACTION DOCK                           -->
	<!-- ========================================================= -->
	<nav class="action-dock" aria-label="Rapid Quick Actions">
		<button
			type="button"
			class="dock-btn timer-btn"
			class:running={$globalTimer.running}
			on:click={() => goto('/focus')}
		>
			<div class="dock-icon-wrap">
				<NavIcon name={$globalTimer.running ? 'pause' : 'play'} size={15} />
			</div>
			<span>{$globalTimer.running ? 'Focusing' : 'Start Focus'}</span>
		</button>

		<button type="button" class="dock-btn" on:click={() => goto('/log')}>
			<div class="dock-icon-wrap">
				<NavIcon name="edit" size={15} />
			</div>
			<span>Log Qs</span>
		</button>

		<button type="button" class="dock-btn" on:click={() => goto('/flashcards')}>
			<div class="dock-icon-wrap">
				<NavIcon name="layers" size={15} />
			</div>
			<span>Flashcards</span>
		</button>

		<button type="button" class="dock-btn" on:click={() => formulaVaultOpen.set(true)}>
			<div class="dock-icon-wrap">
				<NavIcon name="book" size={15} />
			</div>
			<span>Formulas</span>
		</button>
	</nav>

	<!-- ========================================================= -->
	<!-- 3. SEGMENTED MOBILE TABS                                  -->
	<!-- ========================================================= -->
	<div class="tabs-container">
		<div class="segmented-control" role="tablist">
			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'tasks'}
				aria-selected={activeTab === 'tasks'}
				on:click={() => activeTab = 'tasks'}
			>
				<span>Tasks</span>
				{#if pendingTasks.length > 0}
					<span class="tab-count-badge font-mono">{pendingTasks.length}</span>
				{/if}
			</button>

			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'subjects'}
				aria-selected={activeTab === 'subjects'}
				on:click={() => activeTab = 'subjects'}
			>
				<span>Subjects</span>
			</button>

			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'activity'}
				aria-selected={activeTab === 'activity'}
				on:click={() => activeTab = 'activity'}
			>
				<span>Activity</span>
			</button>

			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'target'}
				aria-selected={activeTab === 'target'}
				on:click={() => activeTab = 'target'}
			>
				<span>Cadence</span>
			</button>
		</div>
	</div>

	<!-- ========================================================= -->
	<!-- 4. ACTIVE TAB CONTENT VIEW                                -->
	<!-- ========================================================= -->
	<div class="tab-content-deck">
		{#if activeTab === 'tasks'}
			<!-- TASKS VIEW -->
			<div class="tab-panel" in:fade={{ duration: 160 }}>
				<!-- Inline Task Creator -->
				<form class="quick-task-bar" on:submit|preventDefault={handleQuickAddTask}>
					<input
						type="text"
						bind:value={newTaskTitle}
						placeholder="Add today's task or topic..."
						aria-label="New task title"
						class="task-input"
					/>
					<select bind:value={newTaskSubject} class="subject-select" aria-label="Subject">
						<option value="">All</option>
						<option value="P">Phys</option>
						<option value="C">Chem</option>
						<option value="M">Math</option>
					</select>
					<button type="submit" class="task-add-btn" aria-label="Add task">
						<NavIcon name="plus" size={14} />
					</button>
				</form>

				<!-- Task List -->
				<div class="task-list">
					{#each allTasks as task (task.id)}
						<div class="task-row" class:done={task.done}>
							<button
								type="button"
								class="task-chk"
								class:on={task.done}
								on:click={() => toggleTask(task.id)}
								aria-label="Toggle task {task.title}"
							>
								{#if task.done}<NavIcon name="check" size={12} />{/if}
							</button>

							<div class="task-info">
								<span class="task-title">{task.title}</span>
								<div class="task-meta font-mono">
									{#if task.s}
										<span class="sub-dot" style="background: {subjectColor(task.s)}"></span>
										<span>{subjectName(task.s)}</span>
									{/if}
									{#if task.due}
										<span class="due-txt">• Due {task.due === today ? 'Today' : task.due}</span>
									{/if}
								</div>
							</div>

							{#if task.pri === 'high'}
								<span class="pri-badge">Urgent</span>
							{/if}
						</div>
					{:else}
						<div class="empty-state">
							<NavIcon name="check-circle" size={24} />
							<p>All clear! Add a task above to keep your momentum going.</p>
						</div>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'subjects'}
			<!-- SUBJECTS VIEW -->
			<div class="tab-panel" in:fade={{ duration: 160 }}>
				<div class="subject-cards-list">
					{#each subjectItems as sub (sub.code)}
						<button
							type="button"
							class="sub-pocket-card"
							style="--sub-color: {sub.color}"
							on:click={() => openHub(sub.code)}
						>
							<div class="sub-card-top">
								<div class="sub-name-group">
									<span class="sub-dot-large" style="background: {sub.color}"></span>
									<h4>{sub.name}</h4>
								</div>
								<span class="elo-badge font-mono" style="background: color-mix(in srgb, {sub.elo.color} 15%, transparent); color: {sub.elo.color}; border: 1px solid color-mix(in srgb, {sub.elo.color} 30%, transparent)">
									{sub.elo.name} ({Math.floor(sub.eloVal)})
								</span>
							</div>

							<div class="sub-bar-wrapper">
								<div class="sub-track">
									<div class="sub-fill" style="width: {sub.pct}%; background: {sub.color}"></div>
								</div>
							</div>

							<div class="sub-stats-footer font-mono">
								<span><b>{sub.solved}</b> / {sub.total} Solved</span>
								<span class="pct-num"><b>{sub.pct}%</b> Target</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'activity'}
			<!-- ACTIVITY VIEW -->
			<div class="tab-panel" in:fade={{ duration: 160 }}>
				<div class="activity-top-tools">
					<span class="activity-eyebrow font-mono">RECENT SESSIONS</span>
					<button type="button" class="btn-log-offline font-mono" on:click={() => logOpen = true}>
						<NavIcon name="plus" size={12} /> Log Offline Study
					</button>
				</div>

				<div class="activity-stream">
					{#each $recentActivity.slice(0, 6) as item (item.id)}
						<div class="stream-item">
							<span class="stream-bullet" style="background: {item.color}"></span>
							<div class="stream-body">
								<div class="stream-line-one">
									<span class="stream-title">{item.title}</span>
									<span class="stream-time font-mono">{item.right}</span>
								</div>
								<span class="stream-sub font-mono">{item.meta}</span>
							</div>
						</div>
					{:else}
						<div class="empty-state">
							<NavIcon name="history" size={24} />
							<p>No recent activity logged yet today.</p>
						</div>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'target'}
			<!-- CADENCE & TARGET VIEW -->
			<div class="tab-panel" in:fade={{ duration: 160 }}>
				<!-- Exam Countdown Card -->
				<div class="pocket-exam-card">
					<div class="exam-header">
						<span class="exam-tag font-mono">TARGET EXAM</span>
						<span class="exam-name">{$tracker.meta.exam ? 'JEE Target Window' : 'JEE Advanced'}</span>
					</div>
					<div class="countdown-row font-mono">
						<span class="days-num"><b>{diffDays}</b></span>
						<span class="days-label">DAYS TO GO</span>
					</div>
				</div>

				<!-- 14-Day Cadence Heatmap -->
				<div class="cadence-card">
					<div class="cadence-header">
						<span class="font-mono">14-DAY STUDY CADENCE</span>
						<span class="legend-dots">
							<i class="lvl-0"></i>
							<i class="lvl-1"></i>
							<i class="lvl-2"></i>
							<i class="lvl-3"></i>
							<i class="lvl-4"></i>
						</span>
					</div>
					<div class="dots-row">
						{#each dayDots as dot}
							<div class="dot-col" title="{dot.d}: {dot.mins} mins">
								<span class="cadence-dot lvl-{dot.lvl}"></span>
								<span class="dot-day font-mono">{dot.short[0]}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Rotating Quote -->
				<div class="pocket-quote-card">
					<p class="quote-text">“{currentQuote.text}”</p>
					<div class="quote-footer">
						<span class="quote-author font-mono">— {currentQuote.author}</span>
						<button type="button" class="quote-shuffle-btn" on:click={nextQuote} title="Next quote">
							<NavIcon name="sparkles" size={13} />
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
<SubjectHubModal bind:open={hubOpen} sub={hubSub} />

<Modal bind:open={logOpen} title="Quick Log Study Session" width="380px">
	<div class="modal-form-body font-mono">
		<label class="form-field">
			<span>MINUTES STUDIED</span>
			<input type="number" min="1" max="960" bind:value={logMinutes} class="num-input" />
		</label>
		<label class="form-field">
			<span>SUBJECT</span>
			<select bind:value={logSubject} class="num-input">
				{#each SUBJECTS as s}
					<option value={s.code}>{s.name}</option>
				{/each}
			</select>
		</label>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn-cancel" on:click={() => logOpen = false}>Cancel</button>
		<button type="button" class="btn-save" on:click={handleSaveLog}>Save Session</button>
	</svelte:fragment>
</Modal>

<style>
	.font-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
	}

	.pocket-dashboard {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
		padding: 0.25rem 0 1.5rem;
		box-sizing: border-box;
	}

	/* 1. Hero KPI Card */
	.kpi-hero-card {
		display: grid;
		grid-template-columns: 110px 1fr;
		align-items: center;
		gap: 1.1rem;
		padding: 1.15rem 1.25rem;
		border-radius: 20px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.08);
		backdrop-filter: var(--glass-filter, blur(20px));
		-webkit-backdrop-filter: var(--glass-filter, blur(20px));
	}

	.progress-ring-wrap {
		position: relative;
		width: 95px;
		height: 95px;
		display: grid;
		place-items: center;
	}
	.progress-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.ring-bg {
		fill: none;
		stroke: color-mix(in srgb, var(--border-subtle) 80%, transparent);
	}
	.ring-fill {
		fill: none;
		stroke: var(--accent);
		stroke-linecap: round;
		transition: stroke-dashoffset 0.5s ease;
	}
	.ring-label {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.ring-val {
		font-size: 1.25rem;
		font-weight: 850;
		color: var(--text-primary);
	}
	.ring-sub {
		font-size: 0.65rem;
		color: var(--text-secondary);
		margin-top: 1px;
	}

	.telemetry-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	.badge-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.streak-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.22rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--warning) 14%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
		color: var(--text-primary);
		font-size: 0.72rem;
		font-weight: 700;
	}
	.streak-pill b { color: var(--warning); }
	.level-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.22rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 14%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		color: var(--text-primary);
		font-size: 0.72rem;
		font-weight: 700;
	}
	.level-pill b { color: var(--accent); }

	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}
	.metric-box {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.55rem 0.7rem;
		border-radius: 12px;
		background: var(--surface-subtle);
		border: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
	}
	.m-label {
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.04em;
	}
	.m-val {
		font-size: 0.88rem;
		color: var(--text-primary);
	}
	.m-val b { font-weight: 800; }
	.m-val.good b { color: var(--success); }

	/* 2. Rapid Action Dock */
	.action-dock {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.dock-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.75rem 0.4rem;
		border-radius: 16px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 0.73rem;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1);
		-webkit-tap-highlight-color: transparent;
	}
	.dock-btn:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 6px 16px -2px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.dock-btn:active {
		transform: scale(0.95);
	}
	.dock-icon-wrap {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: var(--surface-subtle);
		color: var(--accent);
		transition: all 0.18s ease;
	}
	.timer-btn.running .dock-icon-wrap {
		background: var(--success);
		color: white;
		box-shadow: 0 0 12px color-mix(in srgb, var(--success) 60%, transparent);
	}

	/* 3. Segmented Tabs */
	.tabs-container {
		width: 100%;
	}
	.segmented-control {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.35rem;
		padding: 0.3rem;
		border-radius: 14px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}
	.segment-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.55rem 0.3rem;
		border-radius: 10px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.segment-pill.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		border-color: var(--border-subtle);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}
	.tab-count-badge {
		padding: 0.1rem 0.35rem;
		border-radius: 99px;
		background: var(--accent);
		color: white;
		font-size: 0.62rem;
		font-weight: 800;
	}

	/* 4. Tab Deck Panels */
	.tab-content-deck {
		min-height: 280px;
	}
	.tab-panel {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	/* Tasks Tab */
	.quick-task-bar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.4rem;
		border-radius: 14px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
	}
	.task-input {
		flex: 1;
		height: 36px;
		padding: 0 0.65rem;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 0.82rem;
		outline: none;
	}
	.subject-select {
		height: 32px;
		padding: 0 0.4rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 700;
	}
	.task-add-btn {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: white;
		cursor: pointer;
	}
	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.task-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.95rem;
		border-radius: 14px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		transition: opacity 0.2s ease, border-color 0.2s ease;
	}
	.task-row.done {
		opacity: 0.55;
	}
	.task-chk {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 7px;
		border: 1.5px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: white;
		cursor: pointer;
	}
	.task-chk.on {
		background: var(--success);
		border-color: var(--success);
	}
	.task-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.task-title {
		font-size: 0.84rem;
		font-weight: 650;
		color: var(--text-primary);
		word-break: break-word;
	}
	.task-row.done .task-title {
		text-decoration: line-through;
	}
	.task-meta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.68rem;
		color: var(--text-secondary);
	}
	.sub-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}
	.pri-badge {
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--danger) 15%, transparent);
		color: var(--danger);
		font-size: 0.65rem;
		font-weight: 800;
	}

	/* Subjects Tab */
	.subject-cards-list {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.sub-pocket-card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.95rem 1.15rem;
		border-radius: 16px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		text-align: left;
		transition: all 0.18s ease;
	}
	.sub-pocket-card:hover {
		border-color: var(--sub-color);
		transform: translateY(-1px);
		box-shadow: 0 6px 18px -4px color-mix(in srgb, var(--sub-color) 20%, transparent);
	}
	.sub-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.sub-name-group {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.sub-dot-large {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.sub-card-top h4 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	.elo-badge {
		padding: 0.2rem 0.55rem;
		border-radius: 8px;
		font-size: 0.68rem;
		font-weight: 800;
	}
	.sub-track {
		height: 6px;
		border-radius: 99px;
		background: var(--surface-subtle);
		overflow: hidden;
	}
	.sub-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.4s ease;
	}
	.sub-stats-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.72rem;
		color: var(--text-secondary);
	}
	.sub-stats-footer b {
		color: var(--text-primary);
	}
	.sub-stats-footer .pct-num b {
		color: var(--sub-color);
	}

	/* Activity Tab */
	.activity-top-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.2rem;
	}
	.activity-eyebrow {
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
	}
	.btn-log-offline {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
	}
	.activity-stream {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.stream-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.95rem;
		border-radius: 14px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
	}
	.stream-bullet {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.stream-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.stream-line-one {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.stream-title {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.stream-time {
		font-size: 0.72rem;
		font-weight: 750;
		color: var(--accent);
	}
	.stream-sub {
		font-size: 0.68rem;
		color: var(--text-secondary);
	}

	/* Target & Cadence Tab */
	.pocket-exam-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.15rem 1.25rem;
		border-radius: 18px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, var(--surface-panel)), var(--surface-panel));
		border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border-subtle));
	}
	.exam-header {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.exam-tag {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--accent);
		letter-spacing: 0.08em;
	}
	.exam-name {
		font-size: 1rem;
		font-weight: 850;
		color: var(--text-primary);
	}
	.countdown-row {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1;
	}
	.days-num {
		font-size: 1.85rem;
		color: var(--accent);
		font-weight: 900;
	}
	.days-label {
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--text-secondary);
		margin-top: 3px;
	}

	.cadence-card {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem 1.15rem;
		border-radius: 16px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
	}
	.cadence-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--text-secondary);
	}
	.legend-dots {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.legend-dots i {
		width: 7px;
		height: 7px;
		border-radius: 2px;
	}
	.dots-row {
		display: grid;
		grid-template-columns: repeat(14, 1fr);
		gap: 0.25rem;
	}
	.dot-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
	}
	.cadence-dot {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 3px;
	}
	.lvl-0 { background: var(--surface-subtle); }
	.lvl-1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface-subtle)); }
	.lvl-2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface-subtle)); }
	.lvl-3 { background: color-mix(in srgb, var(--accent) 80%, var(--surface-subtle)); }
	.lvl-4 { background: var(--accent); }
	.dot-day {
		font-size: 0.58rem;
		color: var(--text-secondary);
	}

	.pocket-quote-card {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 1rem 1.15rem;
		border-radius: 16px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
	}
	.quote-text {
		margin: 0;
		font-size: 0.86rem;
		line-height: 1.5;
		color: var(--text-primary);
		font-style: italic;
	}
	.quote-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.quote-author {
		font-size: 0.72rem;
		font-weight: 750;
		color: var(--text-secondary);
	}
	.quote-shuffle-btn {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.82rem;
	}

	/* Modal Form */
	.modal-form-body {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--text-secondary);
	}
	.num-input {
		height: 38px;
		padding: 0 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-primary);
		font-size: 0.9rem;
	}
	.btn-cancel {
		padding: 0.55rem 0.95rem;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
	}
	.btn-save {
		padding: 0.55rem 1.15rem;
		border-radius: 10px;
		border: none;
		background: var(--accent);
		color: white;
		font-size: 0.8rem;
		font-weight: 800;
		cursor: pointer;
	}

	@media (max-width: 480px) {
		.pocket-dashboard {
			gap: 0.85rem;
		}
		.kpi-hero-card {
			grid-template-columns: 88px 1fr;
			gap: 0.85rem;
			padding: 1rem 0.95rem;
		}
		.progress-ring-wrap {
			width: 80px;
			height: 80px;
		}
		.ring-val {
			font-size: 1.1rem;
		}
		.action-dock {
			gap: 0.35rem;
		}
		.dock-btn {
			padding: 0.65rem 0.25rem;
			font-size: 0.68rem;
		}
		.dock-icon-wrap {
			width: 30px;
			height: 30px;
		}
		.segment-pill {
			font-size: 0.7rem;
			padding: 0.5rem 0.2rem;
		}
	}
</style>
