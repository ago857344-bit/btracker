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
		logBulkQuestions, celebration, formulaVaultOpen
	} from '$lib/stores/tracker';
	import { globalTimer } from '$lib/stores/timerState';
	import { SUBJECTS, subjectName, subjectColor } from '$lib/state/subjects';
	import { universalBySubject, universalEntries } from '$lib/state/universal';
	import { subjectStats } from '$lib/state/questions';
	import { getEloRank } from '$lib/state/gamification';
	import { QUOTES, quoteForDay } from '$lib/state/quotes';
	import { formatMinutes, todayKey, lastNDays, focusMinutesOn, weekdayShort } from '$lib/state/dates';

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';

	// Haptic feedback helper
	function haptic(pattern: number | number[] = 15) {
		if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
			try {
				navigator.vibrate(pattern);
			} catch {}
		}
	}

	// Tab navigation & swipe
	const TABS: Array<'tasks' | 'subjects' | 'activity' | 'target'> = ['tasks', 'subjects', 'activity', 'target'];
	let activeTab: 'tasks' | 'subjects' | 'activity' | 'target' = 'tasks';

	function setTab(tab: typeof activeTab) {
		activeTab = tab;
		haptic(10);
	}

	let touchStartX = 0;
	let touchStartY = 0;
	let isSwiping = false;

	function handleTouchStart(e: TouchEvent) {
		const target = e.target as HTMLElement | null;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.closest('button'))) {
			isSwiping = false;
			return;
		}
		isSwiping = true;
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!isSwiping) return;
		isSwiping = false;
		const touchEndX = e.changedTouches[0].clientX;
		const touchEndY = e.changedTouches[0].clientY;
		const dx = touchEndX - touchStartX;
		const dy = touchEndY - touchStartY;

		// Require horizontal swipe > 55px and 1.5x greater than vertical movement
		if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
			const idx = TABS.indexOf(activeTab);
			if (dx < 0 && idx < TABS.length - 1) {
				// Swipe left -> next tab
				setTab(TABS[idx + 1]);
			} else if (dx > 0 && idx > 0) {
				// Swipe right -> prev tab
				setTab(TABS[idx - 1]);
			}
		}
	}

	// Execution view (hero collapsed)
	let collapsedHero = false;

	// Subject Hub Modal
	$: isGeneric = $tracker.coaching_type === 'GENERIC';
	let hubOpen = false;
	let hubSub = 'P';
	function openHub(code: string) {
		if (isGeneric) {
			void goto('/log');
			return;
		}
		hubSub = code;
		hubOpen = true;
		haptic(10);
	}

	// Quick manual time logging
	let logOpen = false;
	let logMinutes = 45;
	let logSubject = 'P';
	function handleSaveLog() {
		logManualMinutes(Math.max(1, Math.round(logMinutes)), logSubject || null);
		celebration.set(`Logged ${logMinutes}m focus session! ⏱️`);
		haptic([15, 30, 20]);
		logOpen = false;
		logMinutes = 45;
	}

	// Rapid Question Counter Modal & Actions
	let quickLogModalOpen = false;
	let quickLogSubject = 'P';

	function handleDirectQuickLog(count: number, subCode?: string) {
		const code = subCode || quickLogSubject || 'P';
		logBulkQuestions(code, 1, count, 'Pocket Quick Log');
		celebration.set(`+${count} questions logged for ${subjectName(code)}! 🎯`);
		haptic([15, 30, 20]);
		quickLogModalOpen = false;
	}

	function handleStartSubjectFocus(code: string) {
		$globalTimer.start(code, 25 * 60, 'Focus Sprint', 'timer');
		celebration.set(`25m focus sprint started for ${subjectName(code)}! ⏱️`);
		haptic(20);
		goto('/focus');
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
		haptic([20, 30]);
		newTaskTitle = '';
	}

	const TASK_PRESETS = [
		{ label: 'HC Verma 15Q', sub: 'P', title: 'HC Verma Mechanics (15 Qs)' },
		{ label: 'Organic Rxns', sub: 'C', title: 'Organic Reaction Mechanisms' },
		{ label: 'Calculus PYQs', sub: 'M', title: 'Integration PYQs 2024' },
		{ label: 'Formula Recall', sub: '', title: 'Formula Flashcards Review' }
	];

	function applyTaskPreset(preset: typeof TASK_PRESETS[0]) {
		newTaskTitle = preset.title;
		newTaskSubject = preset.sub as any;
		haptic(10);
	}

	function handleTaskToggle(taskId: string) {
		toggleTask(taskId);
		haptic([15, 25, 20]);
	}

	// Active Tasks
	$: isClassTask = (t: any) => Boolean(t.isClass === true || t.kind === 'class' || t.locked === true || (t.title && t.title.toLowerCase().startsWith('[class]')));
	$: today = todayKey();
	$: pendingTasks = ($tracker.h || []).filter((t) => !t.done && !isClassTask(t));
	$: completedTasks = ($tracker.hd || []).filter((t) => t.done && !isClassTask(t));
	$: allTasks = (() => {
		const map = new Map<string, any>();
		for (const t of completedTasks) map.set(t.id, t);
		for (const t of pendingTasks) map.set(t.id, t);
		const list = Array.from(map.values());
		return list.sort((a, b) => {
			if (a.done !== b.done) return a.done ? 1 : -1;
			if (a.pri === 'high' && b.pri !== 'high') return -1;
			if (b.pri === 'high' && a.pri !== 'high') return 1;
			const aDue = a.due || '9999-99-99';
			const bDue = b.due || '9999-99-99';
			return aDue.localeCompare(bDue);
		});
	})();

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

	// Contextual Next Best Action Suggestion
	let dismissedTip = false;
	$: nextActionData = (() => {
		if ($globalTimer.running) {
			const sub = $globalTimer.subject ? subjectName($globalTimer.subject) : 'General Focus';
			return {
				text: `Active session: ${sub} (${$globalTimer.dialTime})`,
				cta: 'Go to Timer',
				action: () => { haptic(10); goto('/focus'); }
			};
		}
		if (todaySolved < todayTarget) {
			const rem = todayTarget - todaySolved;
			return {
				text: `⚡ ${rem} more questions to hit your 100% daily goal!`,
				cta: '+10 Qs',
				action: () => handleDirectQuickLog(10)
			};
		}
		if ($streakDays > 0) {
			return {
				text: `🔥 Daily goal cleared! ${$streakDays}d streak locked. Review flashcards?`,
				cta: 'Review',
				action: () => { haptic(10); goto('/revise?view=flashcards'); }
			};
		}
		return {
			text: '🚀 Start a 25m focus sprint to get into today’s flow state.',
			cta: 'Start',
			action: () => { haptic(10); goto('/focus'); }
		};
	})();

	// Subject Summaries
	const SUBJECT_TARGETS: Record<string, number> = { P: 680, C: 720, M: 650 };
	$: genericSubjects = Object.fromEntries(
		universalBySubject(universalEntries($tracker)).map((row) => [row.code, row])
	);
	$: subjectItems = SUBJECTS.map((sub) => {
		const solved = $subjectSolvedTotals[sub.code] || 0;
		const total = Math.max(1, subjectStats($tracker, sub.code).n || SUBJECT_TARGETS[sub.code] || 650);
		const generic = genericSubjects[sub.code];
		const attempts = isGeneric ? (generic?.attempts ?? 0) : total;
		const pct = isGeneric
			? Math.round(generic?.accuracy ?? 0)
			: Math.min(100, Math.round((solved / total) * 100));
		const eloVal = ($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[sub.code as 'P' | 'C' | 'M'] || 300;
		const elo = getEloRank(eloVal);
		return { ...sub, solved, total, attempts, pct, elo, eloVal };
	});

	// Exam Countdown
	let now = Date.now();
	$: examTarget = $tracker.meta.exam
		? new Date($tracker.meta.exam.includes('T') ? $tracker.meta.exam : $tracker.meta.exam + 'T09:00:00').getTime()
		: new Date('2026-05-24T09:00:00').getTime();
	$: diffDays = Math.max(0, Math.floor((examTarget - now) / (1000 * 60 * 60 * 24)));

	// 14-Day Mini Cadence Dots & Interactive Inspector
	$: days14 = lastNDays(14);
	$: dayDots = days14.map((d) => {
		const mins = focusMinutesOn($tracker.log, d);
		const lvl = mins >= 180 ? 4 : mins >= 120 ? 3 : mins >= 60 ? 2 : mins > 0 ? 1 : 0;
		return { d, mins, lvl, short: weekdayShort(d) };
	});
	let selectedCadenceDay: typeof dayDots[0] | null = null;
	$: if (!selectedCadenceDay && dayDots.length > 0) {
		selectedCadenceDay = dayDots[dayDots.length - 1];
	}

	// Rotating Quote
	let quoteIndex = QUOTES.indexOf(quoteForDay());
	if (quoteIndex < 0) quoteIndex = 0;
	$: currentQuote = QUOTES[quoteIndex] || quoteForDay();
	function nextQuote() {
		quoteIndex = (quoteIndex + 1) % QUOTES.length;
		haptic(10);
	}
</script>

<div class="pocket-dashboard" class:mode-mobile={deviceMode === 'mobile'}>
	<!-- ========================================================= -->
	<!-- 1. GLANCEABLE KPI HERO POD (COLLAPSIBLE EXECUTION VIEW)   -->
	<!-- ========================================================= -->
	<section class="kpi-hero-card specular-card" class:compact-strip={collapsedHero}>
		{#if !collapsedHero}
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
					<div class="ring-label">
						<span class="ring-val num-val">{todaySolved}</span>
						<span class="ring-sub num-val">/{todayTarget}</span>
					</div>
				</div>
			</div>

			<div class="telemetry-column">
				<div class="hero-top-row">
					<div class="badge-row">
						<span class="streak-pill" title="Daily Study Streak">
							🔥 <b class="num-val">{$streakDays}</b> d streak
						</span>
						<span class="level-pill" title="Current Level">
							⚡ Lvl <b class="num-val">{$tracker.gamification?.level || 1}</b>
						</span>
					</div>
					<button
						type="button"
						class="btn-toggle-hero"
						on:click={() => { collapsedHero = true; haptic(10); }}
						title="Switch to compact execution view"
						aria-label="Switch to compact execution view"
					>
						<NavIcon name="sliders" size={13} />
					</button>
				</div>

				<div class="metrics-grid">
					<div class="metric-box">
						<span class="m-label">FOCUS TODAY</span>
						<span class="m-val num-val">
							<b>{focusHoursText}</b>h <b>{focusMinsText}</b>m
						</span>
					</div>
					<div class="metric-box">
						<span class="m-label">GOAL PACE</span>
						<span class="m-val num-val" class:good={solvedPct >= 100}>
							<b>{solvedPct}</b>%
						</span>
					</div>
				</div>
			</div>
		{:else}
			<!-- Compact Telemetry Strip Mode -->
			<div class="compact-strip-inner">
				<div class="strip-item">
					<span class="strip-pill">🔥 <b class="num-val">{$streakDays}d</b></span>
					<span class="strip-pill">⚡ Lvl <b class="num-val">{$tracker.gamification?.level || 1}</b></span>
				</div>
				<div class="strip-item num-val">
					<span class="strip-stat">🎯 <b>{todaySolved}</b>/{todayTarget} Qs</span>
					<span class="strip-stat">⏱️ <b>{focusHoursText}h {focusMinsText}m</b></span>
				</div>
				<button
					type="button"
					class="btn-toggle-hero"
					on:click={() => { collapsedHero = false; haptic(10); }}
					title="Expand full KPI ring"
					aria-label="Expand full KPI ring"
				>
					<NavIcon name="expand" size={13} />
				</button>
			</div>
		{/if}
	</section>

	<!-- ========================================================= -->
	<!-- 1.5 CONTEXTUAL NEXT BEST ACTION CHIP                      -->
	<!-- ========================================================= -->
	{#if !dismissedTip}
		<div class="next-action-chip" in:fade={{ duration: 160 }}>
			<div class="chip-content">
				<span class="chip-sparkle">💡</span>
				<span class="chip-text">{nextActionData.text}</span>
			</div>
			<div class="chip-actions">
				<button type="button" class="chip-cta-btn" on:click={nextActionData.action}>
					{nextActionData.cta}
				</button>
				<button
					type="button"
					class="chip-dismiss-btn"
					on:click={() => { dismissedTip = true; haptic(10); }}
					aria-label="Dismiss recommendation"
				>
					<NavIcon name="x" size={12} />
				</button>
			</div>
		</div>
	{/if}

	<!-- ========================================================= -->
	<!-- 2. THUMB-ZONE RAPID ACTION DOCK                           -->
	<!-- ========================================================= -->
	<nav class="action-dock" aria-label="Rapid Quick Actions">
		<button
			type="button"
			class="dock-btn timer-btn"
			class:running={$globalTimer.running}
			on:click={() => { haptic(12); goto('/focus'); }}
		>
			<div class="dock-icon-wrap">
				<NavIcon name={$globalTimer.running ? 'pause' : 'play'} size={15} />
			</div>
			<span>{$globalTimer.running ? 'Focusing' : 'Start Focus'}</span>
		</button>

		<button
			type="button"
			class="dock-btn"
			on:click={() => { haptic(10); quickLogModalOpen = true; }}
		>
			<div class="dock-icon-wrap">
				<NavIcon name="edit" size={15} />
			</div>
			<span>Quick Qs</span>
		</button>

		<button
			type="button"
			class="dock-btn"
			on:click={() => { haptic(10); goto('/revise?view=flashcards'); }}
		>
			<div class="dock-icon-wrap">
				<NavIcon name="layers" size={15} />
			</div>
			<span>Flashcards</span>
		</button>

		<button
			type="button"
			class="dock-btn"
			on:click={() => { haptic(10); formulaVaultOpen.set(true); }}
		>
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
				on:click={() => setTab('tasks')}
			>
				<span>Tasks</span>
				{#if pendingTasks.length > 0}
					<span class="tab-count-badge num-val">{pendingTasks.length}</span>
				{/if}
			</button>

			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'subjects'}
				aria-selected={activeTab === 'subjects'}
				on:click={() => setTab('subjects')}
			>
				<span>Subjects</span>
			</button>

			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'activity'}
				aria-selected={activeTab === 'activity'}
				on:click={() => setTab('activity')}
			>
				<span>Activity</span>
			</button>

			<button
				type="button"
				role="tab"
				class="segment-pill"
				class:active={activeTab === 'target'}
				aria-selected={activeTab === 'target'}
				on:click={() => setTab('target')}
			>
				<span>Cadence</span>
			</button>
		</div>
	</div>

	<!-- ========================================================= -->
	<!-- 4. ACTIVE TAB CONTENT VIEW (WITH SWIPE GESTURE SUPPORT)   -->
	<!-- ========================================================= -->
	<div
		class="tab-content-deck"
		on:touchstart={handleTouchStart}
		on:touchend={handleTouchEnd}
		role="region"
		aria-label="Swipeable tab content"
	>
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

				<!-- Quick Task Preset Pills -->
				<div class="task-preset-chips">
					{#each TASK_PRESETS as preset}
						<button
							type="button"
							class="preset-chip"
							on:click={() => applyTaskPreset(preset)}
						>
							+ {preset.label}
						</button>
					{/each}
				</div>

				<!-- Task List -->
				<div class="task-list">
					{#each allTasks as task (task.id)}
						<div class="task-row" class:done={task.done}>
							<button
								type="button"
								class="task-chk"
								class:on={task.done}
								on:click={() => handleTaskToggle(task.id)}
								aria-label="Toggle task {task.title}"
							>
								{#if task.done}<NavIcon name="check" size={12} />{/if}
							</button>

							<div class="task-info">
								<span class="task-title">{task.title}</span>
								<div class="task-meta">
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
							<p>All clear! Tap a preset above or add a task to build momentum.</p>
						</div>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'subjects'}
			<!-- SUBJECTS VIEW -->
			<div class="tab-panel" in:fade={{ duration: 160 }}>
				<div class="subject-cards-list">
					{#each subjectItems as sub (sub.code)}
						<div
							class="sub-pocket-card specular-card"
							style="--sub-color: {sub.color}"
						>
							<div
								class="sub-card-top clickable"
								on:click={() => openHub(sub.code)}
								role="button"
								tabindex="0"
								on:keydown={(e) => e.key === 'Enter' && openHub(sub.code)}
							>
								<div class="sub-name-group">
									<span class="sub-dot-large" style="background: {sub.color}"></span>
									<h4>{sub.name}</h4>
								</div>
								<span class="elo-badge" style="background: color-mix(in srgb, {sub.elo.color} 15%, transparent); color: {sub.elo.color}; border: 1px solid color-mix(in srgb, {sub.elo.color} 30%, transparent)">
									{sub.elo.name} ({Math.floor(sub.eloVal)})
								</span>
							</div>

							<div class="sub-bar-wrapper">
								<div class="sub-track">
									<div class="sub-fill" style="width: {sub.pct}%; background: {sub.color}"></div>
								</div>
							</div>

							<div class="sub-stats-footer num-val">
								<span><b>{sub.solved}</b> {isGeneric ? 'Solved' : `/ ${sub.total} Solved`}</span>
								<span class="pct-num"><b>{sub.pct}%</b> {isGeneric ? 'Accuracy' : 'Target'}</span>
							</div>

							<!-- 1-Tap Subject Fast Launchers -->
							<div class="sub-card-actions">
								<button
									type="button"
									class="sub-action-btn"
									on:click|stopPropagation={() => handleDirectQuickLog(10, sub.code)}
									title="Log 10 questions for {sub.name}"
								>
									+10 Qs
								</button>
								<button
									type="button"
									class="sub-action-btn"
									on:click|stopPropagation={() => handleStartSubjectFocus(sub.code)}
									title="Start 25m focus sprint for {sub.name}"
								>
									▶ 25m Focus
								</button>
								<button
									type="button"
									class="sub-action-btn hub-btn"
									on:click|stopPropagation={() => openHub(sub.code)}
									title={isGeneric ? `Open ${sub.name} in the study log` : `Open ${sub.name} Hub`}
								>
									{isGeneric ? 'Log ↗' : 'Hub ↗'}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

		{:else if activeTab === 'activity'}
			<!-- ACTIVITY VIEW -->
			<div class="tab-panel" in:fade={{ duration: 160 }}>
				<div class="activity-top-tools">
					<span class="activity-eyebrow">RECENT SESSIONS</span>
					<button type="button" class="btn-log-offline" on:click={() => { haptic(10); logOpen = true; }}>
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
									<span class="stream-time num-val">{item.right}</span>
								</div>
								<span class="stream-sub">{item.meta}</span>
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
				<div class="pocket-exam-card specular-card">
					<div class="exam-header">
						<span class="exam-tag">TARGET EXAM</span>
						<span class="exam-name">{$tracker.meta.exam ? 'JEE Target Window' : 'JEE Advanced'}</span>
					</div>
					<div class="countdown-row">
						<span class="days-num num-val"><b>{diffDays}</b></span>
						<span class="days-label">DAYS TO GO</span>
					</div>
				</div>

				<!-- 14-Day Cadence Heatmap -->
				<div class="cadence-card specular-card">
					<div class="cadence-header">
						<span>14-DAY STUDY CADENCE</span>
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
							<button
								type="button"
								class="dot-col-btn"
								class:selected={selectedCadenceDay?.d === dot.d}
								on:click={() => { selectedCadenceDay = dot; haptic(10); }}
								title="{dot.d}: {dot.mins} mins"
								aria-label="{dot.d}: {dot.mins} mins"
							>
								<span class="cadence-dot lvl-{dot.lvl}"></span>
								<span class="dot-day">{dot.short[0]}</span>
							</button>
						{/each}
					</div>

					<!-- Interactive Day Inspector -->
					{#if selectedCadenceDay}
						<div class="cadence-inspector" in:fade={{ duration: 120 }}>
							<div class="insp-left">
								<span class="insp-date">{selectedCadenceDay.d}</span>
								<span class="insp-val num-val">
									<b>{Math.floor(selectedCadenceDay.mins / 60)}h {selectedCadenceDay.mins % 60}m</b> focused
								</span>
							</div>
							<span class="insp-badge lvl-{selectedCadenceDay.lvl}">
								{selectedCadenceDay.lvl >= 3 ? '🔥 High Focus' : selectedCadenceDay.lvl > 0 ? '⚡ Steady Pace' : '🌱 Rest Day'}
							</span>
						</div>
					{/if}
				</div>

				<!-- Rotating Quote -->
				<div class="pocket-quote-card specular-card">
					<p class="quote-text">“{currentQuote.text}”</p>
					<div class="quote-footer">
						<span class="quote-author">— {currentQuote.author}</span>
						<button type="button" class="quote-shuffle-btn" on:click={nextQuote} title="Next quote">
							<NavIcon name="sparkles" size={13} />
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- ========================================================= -->
<!-- MODALS                                                    -->
<!-- ========================================================= -->
{#if !isGeneric}
	<SubjectHubModal bind:open={hubOpen} sub={hubSub} />
{/if}

<!-- Rapid Question Counter Modal -->
<Modal bind:open={quickLogModalOpen} title="Instant Problem Counter" width="380px">
	<div class="modal-form-body">
		<label class="form-field">
			<span>SELECT SUBJECT</span>
			<select bind:value={quickLogSubject} class="num-input">
				{#each SUBJECTS as s}
					<option value={s.code}>{s.name}</option>
				{/each}
			</select>
		</label>

		<div class="quick-batch-section">
			<span class="batch-title">RAPID LOG (1-TAP)</span>
			<div class="quick-step-grid">
				<button type="button" class="btn-step-count" on:click={() => handleDirectQuickLog(5)}>
					+5 Qs
				</button>
				<button type="button" class="btn-step-count" on:click={() => handleDirectQuickLog(10)}>
					+10 Qs
				</button>
				<button type="button" class="btn-step-count" on:click={() => handleDirectQuickLog(15)}>
					+15 Qs
				</button>
				<button type="button" class="btn-step-count highlight" on:click={() => handleDirectQuickLog(25)}>
					+25 Qs
				</button>
			</div>
		</div>

		<div class="modal-secondary-link">
			<button
				type="button"
				class="text-link"
				on:click={() => { quickLogModalOpen = false; goto('/log'); }}
			>
				Open Detailed Question Sheet →
			</button>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn-cancel" on:click={() => quickLogModalOpen = false}>Close</button>
	</svelte:fragment>
</Modal>

<!-- Manual Offline Time Log Modal -->
<Modal bind:open={logOpen} title="Quick Log Study Session" width="380px">
	<div class="modal-form-body">
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
	.font-mono, .num-val {
		font-family: inherit;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.015em;
	}

	.pocket-dashboard {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
		padding: 0.35rem 0 1.75rem;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, Inter, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* 0. Dynamic Island Live Pill */
	.dynamic-island-pill {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
		padding: 0.55rem 0.95rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--surface-panel) 92%, black);
		border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border-subtle));
		box-shadow: 0 6px 20px -2px color-mix(in srgb, var(--accent) 25%, transparent);
		backdrop-filter: var(--glass-filter, blur(20px));
		-webkit-backdrop-filter: var(--glass-filter, blur(20px));
	}
	.island-main {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border: none;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
		padding: 0;
		flex: 1;
		min-width: 0;
	}
	.live-pulse-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--success);
		box-shadow: 0 0 10px var(--success);
		animation: pulse-ring 1.6s cubic-bezier(0.24, 0, 0.38, 1) infinite;
		flex-shrink: 0;
	}
	@keyframes pulse-ring {
		0% { transform: scale(0.95); opacity: 0.85; }
		50% { transform: scale(1.25); opacity: 1; }
		100% { transform: scale(0.95); opacity: 0.85; }
	}
	.island-text {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		min-width: 0;
	}
	.island-sub {
		font-size: 0.75rem;
		font-weight: 750;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.island-time {
		font-size: 0.68rem;
		color: var(--accent);
		font-weight: 700;
	}
	.island-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.island-action-btn {
		display: grid;
		place-items: center;
		height: 28px;
		padding: 0 0.6rem;
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.7rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.island-action-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.island-action-btn.add-btn {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}

	/* 1. Hero KPI Card */
	.kpi-hero-card {
		display: grid;
		grid-template-columns: 110px 1fr;
		align-items: center;
		gap: 1.2rem;
		padding: 1.25rem 1.4rem;
		border-radius: 22px;
		background: linear-gradient(145deg, color-mix(in srgb, var(--accent) 5%, var(--surface-panel)), var(--surface-panel));
		border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border-subtle));
		box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: var(--glass-filter, blur(20px));
		-webkit-backdrop-filter: var(--glass-filter, blur(20px));
		position: relative;
	}
	.kpi-hero-card.compact-strip {
		display: block;
		padding: 0.85rem 1.15rem;
		border-radius: 18px;
	}
	.compact-strip-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.strip-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.strip-pill {
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--text-primary);
		padding: 0.22rem 0.55rem;
		background: var(--surface-subtle);
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
	}
	.strip-pill b { color: var(--accent); font-weight: 850; }
	.strip-stat {
		font-size: 0.76rem;
		color: var(--text-secondary);
	}
	.strip-stat b {
		color: var(--text-primary);
		font-weight: 800;
	}

	.progress-ring-wrap {
		position: relative;
		width: 100px;
		height: 100px;
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
		transition: stroke-dashoffset 0.5s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.ring-label {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1.05;
	}
	.ring-val {
		font-size: 1.45rem;
		font-weight: 850;
		color: var(--text-primary);
		letter-spacing: -0.03em;
	}
	.ring-sub {
		font-size: 0.68rem;
		color: var(--text-secondary);
		margin-top: 2px;
		font-weight: 650;
	}

	.telemetry-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}
	.hero-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.badge-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.btn-toggle-hero {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.16s ease;
		flex-shrink: 0;
	}
	.btn-toggle-hero:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	.streak-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.22rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--warning) 12%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--warning) 32%, transparent);
		color: var(--text-primary);
		font-size: 0.73rem;
		font-weight: 700;
	}
	.streak-pill b { color: var(--warning); font-weight: 850; }
	.level-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.22rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 12%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
		color: var(--text-primary);
		font-size: 0.73rem;
		font-weight: 700;
	}
	.level-pill b { color: var(--accent); font-weight: 850; }

	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}
	.metric-box {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.55rem 0.75rem;
		border-radius: 13px;
		background: var(--surface-subtle);
		border: 1px solid color-mix(in srgb, var(--border-subtle) 75%, transparent);
	}
	.m-label {
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
	}
	.m-val {
		font-size: 0.88rem;
		color: var(--text-primary);
	}
	.m-val b { font-weight: 850; }
	.m-val.good b { color: var(--success); }

	/* 1.5 Contextual Next Action Chip */
	.next-action-chip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.95rem;
		border-radius: 15px;
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-panel));
		border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border-subtle));
		font-size: 0.78rem;
		box-shadow: 0 2px 10px -2px color-mix(in srgb, var(--accent) 12%, transparent);
	}
	.chip-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}
	.chip-sparkle { font-size: 0.9rem; }
	.chip-text {
		color: var(--text-primary);
		font-weight: 650;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.chip-actions {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-shrink: 0;
	}
	.chip-cta-btn {
		padding: 0.28rem 0.75rem;
		border-radius: 9px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.7rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.chip-cta-btn:hover {
		filter: brightness(1.1);
	}
	.chip-dismiss-btn {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
	}

	/* 2. Rapid Action Dock */
	.action-dock {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.6rem;
	}
	.dock-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 0.85rem 0.45rem;
		border-radius: 18px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
		-webkit-tap-highlight-color: transparent;
	}
	.dock-btn:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
		box-shadow: 0 8px 20px -3px color-mix(in srgb, var(--accent) 22%, transparent);
	}
	.dock-btn:active {
		transform: scale(0.96);
	}
	.dock-icon-wrap {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		background: var(--surface-subtle);
		color: var(--accent);
		transition: all 0.18s ease;
	}
	.timer-btn.running .dock-icon-wrap {
		background: var(--success);
		color: var(--accent-contrast, #fff);
		box-shadow: 0 0 14px color-mix(in srgb, var(--success) 65%, transparent);
	}

	/* 3. Segmented Tabs */
	.tabs-container {
		width: 100%;
	}
	.segmented-control {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.35rem;
		padding: 0.35rem;
		border-radius: 16px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		backdrop-filter: var(--glass-filter, blur(20px));
		-webkit-backdrop-filter: var(--glass-filter, blur(20px));
	}
	.segment-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.6rem 0.35rem;
		border-radius: 12px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.77rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.segment-pill.active {
		background: var(--surface-panel);
		color: var(--text-primary);
		border-color: var(--border-subtle);
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
	}
	.tab-count-badge {
		padding: 0.12rem 0.42rem;
		border-radius: 99px;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.64rem;
		font-weight: 850;
	}

	/* 4. Tab Deck Panels */
	.tab-content-deck {
		min-height: 280px;
		touch-action: pan-y;
	}
	.tab-panel {
		display: flex;
		flex-direction: column;
		gap: 0.95rem;
	}

	/* Tasks Tab */
	.quick-task-bar {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.5rem;
		border-radius: 16px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
	}
	.task-input {
		flex: 1;
		height: 38px;
		padding: 0 0.75rem;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 0.84rem;
		outline: none;
	}
	.subject-select {
		height: 34px;
		padding: 0 0.55rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 700;
	}
	.task-add-btn {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 9px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, white);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.task-add-btn:hover {
		filter: brightness(1.1);
	}

	.task-preset-chips {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		overflow-x: auto;
		padding: 0.1rem 0;
		scrollbar-width: none;
	}
	.task-preset-chips::-webkit-scrollbar { display: none; }
	.preset-chip {
		padding: 0.3rem 0.65rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 700;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.preset-chip:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		touch-action: pan-y;
	}
	.task-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.85rem 1.05rem;
		border-radius: 16px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		transition: opacity 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
		touch-action: pan-y;
	}
	.task-row:hover {
		border-color: color-mix(in srgb, var(--accent) 35%, var(--border-subtle));
	}
	.task-row.done {
		opacity: 0.55;
	}
	.task-chk {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 8px;
		border: 1.5px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--accent-contrast, #fff);
		cursor: pointer;
		transition: all 0.15s ease;
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
		gap: 0.2rem;
	}
	.task-title {
		font-size: 0.86rem;
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
		gap: 0.4rem;
		font-size: 0.7rem;
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
		gap: 0.85rem;
	}
	.sub-pocket-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.05rem 1.25rem;
		border-radius: 18px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		text-align: left;
		transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
	}
	.sub-pocket-card:hover {
		border-color: var(--sub-color);
		box-shadow: 0 6px 20px -4px color-mix(in srgb, var(--sub-color) 25%, transparent);
		transform: translateY(-1px);
	}
	.sub-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.sub-card-top.clickable {
		cursor: pointer;
	}
	.sub-name-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.sub-dot-large {
		width: 11px;
		height: 11px;
		border-radius: 50%;
	}
	.sub-card-top h4 {
		margin: 0;
		font-size: 0.98rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	.elo-badge {
		padding: 0.22rem 0.6rem;
		border-radius: 9px;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.sub-track {
		height: 7px;
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
		font-size: 0.74rem;
		color: var(--text-secondary);
	}
	.sub-stats-footer b {
		color: var(--text-primary);
		font-weight: 800;
	}
	.sub-stats-footer .pct-num b {
		color: var(--sub-color);
	}

	.sub-card-actions {
		display: grid;
		grid-template-columns: 1fr 1.3fr 1fr;
		gap: 0.45rem;
		padding-top: 0.6rem;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
	}
	.sub-action-btn {
		padding: 0.42rem 0.5rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.7rem;
		font-weight: 750;
		cursor: pointer;
		text-align: center;
		transition: all 0.16s ease;
	}
	.sub-action-btn:hover {
		border-color: var(--sub-color);
		color: var(--sub-color);
		background: color-mix(in srgb, var(--sub-color) 12%, var(--surface-subtle));
	}
	.sub-action-btn.hub-btn {
		color: var(--text-secondary);
	}

	/* Activity Tab */
	.activity-top-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.25rem;
	}
	.activity-eyebrow {
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.06em;
	}
	.btn-log-offline {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--accent);
		font-size: 0.73rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.btn-log-offline:hover {
		border-color: var(--accent);
		background: var(--surface-subtle);
	}
	.activity-stream {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.stream-item {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.85rem 1.05rem;
		border-radius: 16px;
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
		gap: 0.15rem;
	}
	.stream-line-one {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.stream-title {
		font-size: 0.84rem;
		font-weight: 700;
		color: var(--text-primary);
	}
	.stream-time {
		font-size: 0.73rem;
		font-weight: 750;
		color: var(--accent);
	}
	.stream-sub {
		font-size: 0.7rem;
		color: var(--text-secondary);
	}

	/* Target & Cadence Tab */
	.pocket-exam-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.4rem;
		border-radius: 20px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--surface-panel)), var(--surface-panel));
		border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-subtle));
		box-shadow: 0 4px 18px -4px color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.exam-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.exam-tag {
		font-size: 0.65rem;
		font-weight: 850;
		color: var(--accent);
		letter-spacing: 0.08em;
	}
	.exam-name {
		font-size: 1.05rem;
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
		font-size: 2.1rem;
		color: var(--accent);
		font-weight: 900;
	}
	.days-label {
		font-size: 0.64rem;
		font-weight: 850;
		color: var(--text-secondary);
		margin-top: 4px;
		letter-spacing: 0.05em;
	}

	.cadence-card {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 1.15rem 1.3rem;
		border-radius: 18px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
	}
	.cadence-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.04em;
	}
	.legend-dots {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.legend-dots i {
		width: 8px;
		height: 8px;
		border-radius: 2px;
	}
	.dots-row {
		display: grid;
		grid-template-columns: repeat(14, 1fr);
		gap: 0.3rem;
	}
	.dot-col-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 3px 0;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.dot-col-btn.selected {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.cadence-dot {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 4px;
	}
	.lvl-0 { background: var(--surface-subtle); }
	.lvl-1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface-subtle)); }
	.lvl-2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface-subtle)); }
	.lvl-3 { background: color-mix(in srgb, var(--accent) 80%, var(--surface-subtle)); }
	.lvl-4 { background: var(--accent); }
	.dot-day {
		font-size: 0.62rem;
		color: var(--text-secondary);
		font-weight: 700;
	}

	.cadence-inspector {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.55rem 0.75rem;
		border-radius: 12px;
		background: var(--surface-subtle);
		border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, transparent);
		font-size: 0.72rem;
	}
	.insp-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.insp-date {
		color: var(--text-secondary);
		font-weight: 700;
	}
	.insp-val {
		color: var(--text-primary);
	}
	.insp-val b {
		color: var(--accent);
		font-weight: 850;
	}
	.insp-badge {
		padding: 0.18rem 0.5rem;
		border-radius: 7px;
		font-size: 0.65rem;
		font-weight: 850;
		color: var(--text-primary);
		background: var(--surface-panel);
	}
	.insp-badge.lvl-4, .insp-badge.lvl-3 {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}

	.pocket-quote-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.15rem 1.3rem;
		border-radius: 18px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
	}
	.quote-text {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.55;
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
		font-size: 0.75rem;
		font-weight: 750;
		color: var(--text-secondary);
	}
	.quote-shuffle-btn {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.quote-shuffle-btn:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 2.8rem 1rem;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.84rem;
	}

	/* Modal Form & Quick Counter */
	.modal-form-body {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.74rem;
		font-weight: 800;
		color: var(--text-secondary);
	}
	.num-input {
		height: 40px;
		padding: 0 0.85rem;
		border-radius: 11px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-primary);
		font-size: 0.92rem;
		font-variant-numeric: tabular-nums;
	}

	.quick-batch-section {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.batch-title {
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.06em;
	}
	.quick-step-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}
	.btn-step-count {
		padding: 0.7rem 0.35rem;
		border-radius: 12px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.85rem;
		font-weight: 850;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.btn-step-count:hover {
		border-color: var(--accent);
		color: var(--accent);
		transform: translateY(-1px);
	}
	.btn-step-count.highlight {
		background: color-mix(in srgb, var(--accent) 15%, var(--surface-subtle));
		border-color: var(--accent);
		color: var(--accent);
	}
	.modal-secondary-link {
		text-align: center;
		padding-top: 0.25rem;
	}
	.text-link {
		border: none;
		background: transparent;
		color: var(--accent);
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
		text-decoration: underline;
	}

	.btn-cancel {
		padding: 0.6rem 1rem;
		border-radius: 11px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
	}
	.btn-save {
		padding: 0.6rem 1.25rem;
		border-radius: 11px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.82rem;
		font-weight: 800;
		cursor: pointer;
	}

	@media (max-width: 480px) {
		.pocket-dashboard {
			gap: 0.85rem;
		}
		.kpi-hero-card {
			grid-template-columns: 88px 1fr;
			gap: 0.95rem;
			padding: 1.05rem 1rem;
		}
		.progress-ring-wrap {
			width: 82px;
			height: 82px;
		}
		.ring-val {
			font-size: 1.2rem;
		}
		.action-dock {
			gap: 0.4rem;
		}
		.dock-btn {
			padding: 0.7rem 0.25rem;
			font-size: 0.7rem;
		}
		.dock-icon-wrap {
			width: 32px;
			height: 32px;
		}
		.segment-pill {
			font-size: 0.72rem;
			padding: 0.52rem 0.2rem;
		}
		.dots-row {
			gap: 0.18rem;
		}
		.dot-col-btn {
			padding: 2px 0;
		}
		.dot-day {
			font-size: 0.54rem;
		}
	}

	@media (max-width: 360px) {
		.sub-card-actions {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}
	}
</style>
