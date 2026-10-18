<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import { globalTimer } from '$lib/stores/timerState';
	import { tracker, dailyProgress, streakDays, updateTracker } from '$lib/stores/tracker';
	import { formatMinutes } from '$lib/state/dates';
	import { getLevelData } from '$lib/state/gamification';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import NavIcon from '$lib/components/NavIcon.svelte';

	let expanded = false;

	$: cutoutStyle = ($tracker?.ui?.cutoutStyle || 'auto') as 'auto' | 'island' | 'notch' | 'dot' | 'dock';

	$: isSessionActive = Boolean($globalTimer.running || $globalTimer.sessionStarted);
	$: subColor = $globalTimer.subject ? subjectColor($globalTimer.subject) : '#6d5dfc';
	$: activeAccent = (isSessionActive && $globalTimer.subject) ? subColor : 'var(--accent, #6d5dfc)';
	$: subLabel = $globalTimer.subject ? subjectName($globalTimer.subject) : 'Focus';

	$: isFocusPage = $page.url.pathname === '/focus';

	$: streak = $streakDays || 0;
	$: todayMins = $dailyProgress?.minutes || 0;
	$: todaySolved = $dailyProgress?.solved || 0;
	$: hourGoal = $dailyProgress?.hourGoal || 3;
	$: questionGoal = $dailyProgress?.questionGoal || 30;
	$: hourPct = Math.min(100, Math.round(($dailyProgress?.hourPct || 0) * 100));
	$: questionPct = Math.min(100, Math.round(($dailyProgress?.questionPct || 0) * 100));

	$: xp = $tracker?.gamification?.xp || 0;
	$: levelData = getLevelData(xp);

	function triggerHaptic(pattern: number | number[] = 10) {
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			try {
				navigator.vibrate(pattern);
			} catch {
				// ignore
			}
		}
	}

	function toggleExpand(e?: MouseEvent) {
		if (e) e.stopPropagation();
		expanded = !expanded;
		triggerHaptic(expanded ? [10, 18, 8] : 8);
	}

	function setCutoutStyle(style: 'auto' | 'island' | 'notch' | 'dot' | 'dock', e?: MouseEvent) {
		if (e) e.stopPropagation();
		triggerHaptic(12);
		updateTracker((draft) => {
			if (!draft.ui) {
				draft.ui = { accent: '#6d5dfc', widgets: [], reducedMotion: false, cutoutStyle: style };
			} else {
				draft.ui.cutoutStyle = style;
			}
		});
	}

	function handleNavigate() {
		expanded = false;
		if ($page.url.pathname !== '/focus') {
			void goto('/focus');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && expanded) {
			expanded = false;
		}
	}

	function startQuickBlock(minutes: number = 25) {
		triggerHaptic(14);
		const targetSub = $globalTimer.subject || 'P';
		$globalTimer.start(targetSub, minutes * 60, $globalTimer.chapter || '');
		expanded = false;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isSessionActive && !isFocusPage}
	<!-- Backdrop scrim when expanded -->
	{#if expanded}
		<div
			class="island-scrim"
			on:click={() => (expanded = false)}
			on:keydown={(e) => { if (e.key === 'Escape') expanded = false; }}
			role="button"
			tabindex="-1"
			aria-label="Close Island Backdrop"
		></div>
	{/if}

	<div
		class="dynamic-island-anchor cutout-{cutoutStyle}"
		in:fly={{ y: -12, duration: 240 }}
		out:fade={{ duration: 180 }}
	>
		<div
			class="dynamic-island"
			class:expanded
			class:running={$globalTimer.running}
			class:paused={!$globalTimer.running && isSessionActive}
			class:idle={!isSessionActive}
			class:dock-mode={cutoutStyle === 'dock'}
			style="--island-accent: {activeAccent};"
			on:click={toggleExpand}
			on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); } }}
			role="button"
			tabindex="0"
			aria-label="Live Activity Focus HUD"
			aria-expanded={expanded}
		>
			<div class="island-stage">
				<!-- COMPACT PILL VIEW -->
				<div class="island-compact" aria-hidden={expanded}>
					{#if isSessionActive}
						<!-- ACTIVE SESSION CONTENT -->
						<div class="island-indicator">
							{#if $globalTimer.running}
								<div class="eq-bars" aria-label="Timer running">
									<span class="bar bar-1"></span>
									<span class="bar bar-2"></span>
									<span class="bar bar-3"></span>
								</div>
							{:else}
								<span class="pause-dot" title="Session Paused"></span>
							{/if}
							<span class="timer-flame">🔥</span>
						</div>

						<div class="island-info">
							<span class="time-readout">{$globalTimer.dialTime || '25:00'}</span>
							{#if $globalTimer.subject}
								<span class="subject-tag" style="color: {subColor}; border-color: {subColor};">
									{$globalTimer.subject}
								</span>
							{:else if !$globalTimer.running}
								<span class="paused-tag">PAUSED</span>
							{/if}
							{#if $globalTimer.chapter}
								<span class="chapter-label">{$globalTimer.chapter}</span>
							{/if}
						</div>

						<div class="island-quick-actions">
							<button
								type="button"
								class="quick-toggle-btn"
								class:on={$globalTimer.running}
								title={$globalTimer.running ? 'Pause Timer' : 'Resume Timer'}
								on:click|stopPropagation={() => $globalTimer.toggle()}
								aria-label={$globalTimer.running ? 'Pause' : 'Resume'}
							>
								{#if $globalTimer.running}
									<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
										<rect x="6" y="5" width="4" height="14" rx="1.5"></rect>
										<rect x="14" y="5" width="4" height="14" rx="1.5"></rect>
									</svg>
								{:else}
									<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
										<polygon points="6 4 20 12 6 20 6 4"></polygon>
									</svg>
								{/if}
							</button>
							<button
								type="button"
								class="quick-expand-btn"
								title="Expand Focus HUD"
								on:click={toggleExpand}
								aria-label="Expand Island"
							>
								<NavIcon name="chevron-down" size={13} />
							</button>
						</div>
					{:else}
						<!-- IDLE / HOME DAILY STATS PILL -->
						<div class="island-indicator home-mode">
							<span class="timer-flame">🔥</span>
							{#if streak > 0}
								<span class="streak-badge" title="{streak} day streak">{streak}d</span>
							{/if}
						</div>

						<div class="island-info home-info">
							<span class="daily-stat-item" title="Today's focus time">
								<span class="stat-icon">⏱️</span>
								<span class="stat-num">{formatMinutes(todayMins)}</span>
							</span>
							<span class="stat-divider">·</span>
							<span class="daily-stat-item" title="Questions solved today">
								<span class="stat-icon">🎯</span>
								<span class="stat-num">{todaySolved} Qs</span>
							</span>
						</div>

						<div class="island-quick-actions">
							<button
								type="button"
								class="quick-toggle-btn start-btn"
								title="Start 25m Focus Block"
								on:click|stopPropagation={() => startQuickBlock(25)}
								aria-label="Start Focus"
							>
								<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
									<polygon points="6 4 20 12 6 20 6 4"></polygon>
								</svg>
							</button>
							<button
								type="button"
								class="quick-expand-btn"
								title="Expand Daily Activity HUD"
								on:click={toggleExpand}
								aria-label="Expand Island"
							>
								<NavIcon name="chevron-down" size={13} />
							</button>
						</div>
					{/if}
				</div>

				<!-- EXPANDED CARD VIEW -->
				<div
					class="island-expanded"
					role="region"
					aria-label="Dynamic Island Expanded HUD"
					on:click|stopPropagation={() => {}}
					on:keydown|stopPropagation={(e) => { if (e.key === 'Escape') expanded = false; }}
					tabindex="-1"
					aria-hidden={!expanded}
				>
					<!-- Header -->
					<div class="expanded-header">
						<div class="expanded-title-group">
							{#if isSessionActive}
								<span class="phase-pill" class:break={$globalTimer.phase === 'break'}>
									{$globalTimer.phase === 'break' ? '☕ RECOVERY BREAK' : '🎯 DEEP FOCUS'}
								</span>
								<span class="subject-full" style="color: {subColor};">
									{subLabel} {#if $globalTimer.chapter}· {$globalTimer.chapter}{/if}
								</span>
							{:else}
								<div class="header-badge-row">
									<span class="phase-pill">⚡ TODAY'S ACTIVITY</span>
									<span class="level-pill">Lv {levelData.level} · {levelData.title}</span>
								</div>
								<span class="subject-full">Daily Command Center</span>
							{/if}
						</div>
						<button
							type="button"
							class="close-island-btn"
							title="Collapse"
							on:click={() => (expanded = false)}
							aria-label="Close"
						>
							✕
						</button>
					</div>

					<!-- Body: Countdown & Progress Line / Presets -->
					<div class="expanded-body">
						{#if isSessionActive}
							<div class="large-time">{$globalTimer.dialTime || '25:00'}</div>
							<div class="progress-bar-bg">
								<div
									class="progress-bar-fill"
									style="width: {Math.min(100, Math.max(0, $globalTimer.ringProgress * 100))}%; background: {subColor};"
								></div>
							</div>
						{:else}
							<!-- IDLE / HOME EXPANDED DAILY HUD -->
							<div class="idle-expanded-dashboard">
								<div class="idle-stat-grid">
									<!-- Focus time card -->
									<div class="idle-stat-card">
										<div class="card-head">
											<span class="card-title">FOCUS</span>
											<span class="card-target">{hourGoal}h goal</span>
										</div>
										<div class="card-main">
											<span class="card-value">{formatMinutes(todayMins)}</span>
										</div>
										<div class="mini-bar">
											<div class="mini-bar-fill" style="width: {hourPct}%; background: var(--accent, #6d5dfc);"></div>
										</div>
									</div>

									<!-- Questions card -->
									<div class="idle-stat-card">
										<div class="card-head">
											<span class="card-title">QUESTIONS</span>
											<span class="card-target">{questionGoal} target</span>
										</div>
										<div class="card-main">
											<span class="card-value">{todaySolved} <small>Qs</small></span>
										</div>
										<div class="mini-bar">
											<div class="mini-bar-fill" style="width: {questionPct}%; background: #22c55e;"></div>
										</div>
									</div>

									<!-- Streak card -->
									<div class="idle-stat-card">
										<div class="card-head">
											<span class="card-title">STREAK</span>
											<span class="card-target">{streak > 0 ? 'ACTIVE' : 'DAY 0'}</span>
										</div>
										<div class="card-main">
											<span class="card-value">🔥 {streak} <small>days</small></span>
										</div>
										<div class="mini-bar">
											<div class="mini-bar-fill" style="width: {streak > 0 ? 100 : 0}%; background: #f59e0b;"></div>
										</div>
									</div>
								</div>

								<!-- Quick Focus Presets -->
								<div class="presets-section">
									<div class="presets-label">
										<span>⚡ QUICK START FOCUS TIMERS</span>
										<small>Tap to start a timer:</small>
									</div>
									<div class="idle-presets">
										<button type="button" class="preset-chip" on:click={() => startQuickBlock(25)} title="Start 25m Pomodoro Focus Block">
											<span class="chip-min">25m</span>
											<span class="chip-tag">Pomodoro</span>
										</button>
										<button type="button" class="preset-chip" on:click={() => startQuickBlock(45)} title="Start 45m Deep Work Focus Block">
											<span class="chip-min">45m</span>
											<span class="chip-tag">Deep Work</span>
										</button>
										<button type="button" class="preset-chip" on:click={() => startQuickBlock(60)} title="Start 60m Sprint Focus Block">
											<span class="chip-min">60m</span>
											<span class="chip-tag">Sprint</span>
										</button>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- HUD Position Placement Selector -->
					<div class="cutout-bar" role="toolbar" aria-label="HUD Position Selector">
						<span class="cutout-label">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
								<rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
								<circle cx="12" cy="6" r="1" fill="currentColor"></circle>
							</svg>
							Position:
						</span>
						<div class="cutout-chips">
							<button
								type="button"
								class="cutout-chip"
								class:active={cutoutStyle === 'auto' || cutoutStyle === 'island' || cutoutStyle === 'dot'}
								on:click={(e) => setCutoutStyle('auto', e)}
								title="Top Bar: Sits cleanly in topbar on desktop, floats below on mobile (never covers menu bar)"
							>
								📍 Top Bar
							</button>
							<button
								type="button"
								class="cutout-chip"
								class:active={cutoutStyle === 'dock'}
								on:click={(e) => setCutoutStyle('dock', e)}
								title="Bottom Dock: Floats right above your thumb at the bottom"
							>
								📱 Bottom Dock
							</button>
							<button
								type="button"
								class="cutout-chip"
								class:active={cutoutStyle === 'notch'}
								on:click={(e) => setCutoutStyle('notch', e)}
								title="Notch Safe: Adds extra safe clearance for large phone notches"
							>
								🛡️ Notch Safe
							</button>
						</div>
					</div>

					<!-- Bottom Action Controls -->
					<div class="expanded-actions">
						{#if isSessionActive}
							<button
								type="button"
								class="island-btn secondary"
								title="Add 5 Minutes"
								on:click={() => $globalTimer.addFive()}
							>
								+5m
							</button>

							<button
								type="button"
								class="island-btn primary"
								class:on={$globalTimer.running}
								on:click={() => $globalTimer.toggle()}
							>
								{#if $globalTimer.running}
									<NavIcon name="pause" size={15} /> Pause
								{:else}
									<NavIcon name="play" size={15} /> Resume
								{/if}
							</button>

							<button
								type="button"
								class="island-btn danger"
								title="Finish & Log Session"
								on:click={() => { $globalTimer.stop(); expanded = false; }}
							>
								End
							</button>
						{:else}
							<button
								type="button"
								class="island-btn primary full-width"
								on:click={() => startQuickBlock(25)}
							>
								<NavIcon name="play" size={15} /> Start 25m Focus Block
							</button>
						{/if}

						<button
							type="button"
							class="island-btn icon-only"
							title="Open Full Focus Dashboard"
							on:click={handleNavigate}
						>
							<NavIcon name="arrow-right" size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.island-scrim {
		position: fixed;
		inset: 0;
		z-index: 9990;
		background: rgba(0, 0, 0, 0.60);
		backdrop-filter: blur(28px) saturate(190%);
		-webkit-backdrop-filter: blur(28px) saturate(190%);
		animation: scrim-in 0.2s ease forwards;
	}

	@keyframes scrim-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.dynamic-island-anchor {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9995;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		pointer-events: none;
		top: 18px;
		bottom: auto;
		width: auto;
		height: auto;
		transition:
			top 0.4s cubic-bezier(0.32, 0.72, 0, 1),
			bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1);
	}

	/* Dock mode floats at bottom of screen */
	.dynamic-island-anchor.cutout-dock {
		top: auto;
		bottom: 24px;
		align-items: flex-end;
	}

	.dynamic-island {
		pointer-events: auto;
		background: color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 6%, rgba(13, 12, 22, 0.94));
		color: #ffffff !important;
		border: 1px solid color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 24%, rgba(255, 255, 255, 0.16));
		backdrop-filter: blur(32px) saturate(210%);
		-webkit-backdrop-filter: blur(32px) saturate(210%);
		border-radius: 9999px;
		cursor: pointer;
		user-select: none;
		box-sizing: border-box;
		overflow: hidden;
		transform-origin: center top;

		/* Apple iOS Spring physics for fluid morphing */
		transition:
			width 0.42s cubic-bezier(0.32, 0.72, 0, 1),
			height 0.42s cubic-bezier(0.32, 0.72, 0, 1),
			border-radius 0.42s cubic-bezier(0.32, 0.72, 0, 1),
			box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
			background 0.3s ease,
			border-color 0.3s ease;
	}

	.dynamic-island.dock-mode {
		transform-origin: center bottom;
	}

	.dynamic-island.dock-mode .quick-expand-btn :global(svg) {
		transform: rotate(180deg);
	}

	/* LIGHT THEME DOCK MODE: Transforms into native Apple translucent frosted dock */
	:global(:root[data-theme='light']) .dynamic-island.dock-mode,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode {
		background: color-mix(in srgb, var(--surface-panel, #ffffff) 96%, transparent) !important;
		color: var(--text-primary, #24213a) !important;
		border: 1px solid color-mix(in srgb, var(--island-accent, var(--accent)) 25%, var(--border-subtle, rgba(0, 0, 0, 0.1))) !important;
		box-shadow:
			0 16px 42px -6px rgba(44, 37, 92, 0.16),
			0 0 20px -2px color-mix(in srgb, var(--island-accent, var(--accent)) 22%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
	}

	:global(:root[data-theme='light']) .dynamic-island.dock-mode .time-readout,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .time-readout,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .time-readout,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .time-readout,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .daily-stat-item,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .daily-stat-item,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .daily-stat-item,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .daily-stat-item,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .card-value,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .card-value,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .card-value,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .card-value,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .subject-full,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .subject-full,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .subject-full,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .subject-full,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .large-time,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .large-time,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .large-time,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .large-time {
		color: var(--text-primary, #24213a) !important;
	}

	:global(:root[data-theme='light']) .dynamic-island.dock-mode .stat-divider,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .stat-divider,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .stat-divider,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .stat-divider,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .quick-expand-btn,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .quick-expand-btn,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .quick-expand-btn,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .quick-expand-btn,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .chapter-label,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .chapter-label,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .chapter-label,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .chapter-label {
		color: var(--text-secondary, #716e86) !important;
	}

	:global(:root[data-theme='light']) .dynamic-island.dock-mode .idle-stat-card,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .idle-stat-card,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .idle-stat-card,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .idle-stat-card,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .cutout-bar,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .cutout-bar,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .cutout-bar,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .cutout-bar {
		background: rgba(0, 0, 0, 0.04) !important;
		border-color: rgba(0, 0, 0, 0.07) !important;
	}

	:global(:root[data-theme='light']) .dynamic-island.dock-mode .card-head,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .card-head,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .card-head,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .card-head,
	:global(:root[data-theme='light']) .dynamic-island.dock-mode .cutout-label,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .cutout-label,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .cutout-label,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .cutout-label {
		color: var(--text-secondary, #716e86) !important;
	}

	:global(:root[data-theme='light']) .dynamic-island.dock-mode .cutout-chip,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .cutout-chip,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .cutout-chip,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .cutout-chip {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.08);
		color: var(--text-secondary);
	}

	:global(:root[data-theme='light']) .dynamic-island.dock-mode .cutout-chip.active,
	:global(:root[data-theme='notion']) .dynamic-island.dock-mode .cutout-chip.active,
	:global(:root[data-theme='duolingo']) .dynamic-island.dock-mode .cutout-chip.active,
	:global(:root[data-theme='anki']) .dynamic-island.dock-mode .cutout-chip.active {
		background: var(--island-accent, var(--accent)) !important;
		color: #ffffff !important;
	}

	.dynamic-island:focus-visible {
		outline: 2px solid var(--accent, #6d5dfc);
		outline-offset: 3px;
	}

	/* COMPACT PILL SIZING */
	.dynamic-island:not(.expanded) {
		width: clamp(230px, 22vw, 300px);
		height: 38px;
		box-shadow:
			0 10px 28px -4px rgba(0, 0, 0, 0.65),
			0 0 16px -2px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 20%, transparent),
			0 0 0 1px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 20%, rgba(255, 255, 255, 0.1)),
			inset 0 1px 0 rgba(255, 255, 255, 0.28);
	}

	.dynamic-island.dock-mode:not(.expanded) {
		width: 325px;
		height: 44px;
	}

	.dynamic-island:not(.expanded):hover {
		transform: scale(1.025);
		box-shadow:
			0 14px 36px -4px rgba(0, 0, 0, 0.8),
			0 0 0 1px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 50%, rgba(255, 255, 255, 0.3)),
			0 0 28px -2px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 45%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.38);
	}

	.dynamic-island:not(.expanded):active {
		transform: scale(0.96);
	}

	/* Running Aura Glow */
	.dynamic-island.running:not(.expanded) {
		animation: island-aura-pulse 2.8s ease-in-out infinite alternate;
	}

	@keyframes island-aura-pulse {
		0% {
			box-shadow:
				0 10px 28px -4px rgba(0, 0, 0, 0.65),
				0 0 0 1px rgba(255, 255, 255, 0.12),
				0 0 18px -2px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 35%, transparent),
				inset 0 1px 0 rgba(255, 255, 255, 0.28);
		}
		100% {
			box-shadow:
				0 14px 38px -4px rgba(0, 0, 0, 0.8),
				0 0 0 1px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 55%, rgba(255, 255, 255, 0.25)),
				0 0 28px 2px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 50%, transparent),
				inset 0 1px 0 rgba(255, 255, 255, 0.38);
		}
	}

	/* EXPANDED SIZING */
	.dynamic-island.expanded {
		position: relative;
		margin: 0 auto;
		z-index: 9996;
		width: min(92vw, 420px);
		height: 350px;
		border-radius: 28px;
		cursor: default;
		box-shadow:
			0 24px 60px -8px rgba(0, 0, 0, 0.88),
			0 0 0 1px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 30%, rgba(255, 255, 255, 0.18)),
			0 0 42px -4px color-mix(in srgb, var(--island-accent, var(--accent, #6d5dfc)) 42%, transparent),
			inset 0 1px 0 rgba(255, 255, 255, 0.32);
	}

	.dynamic-island.expanded:not(.idle) {
		height: 290px;
	}

	.dynamic-island.dock-mode.expanded {
		transform-origin: center bottom;
	}

	/* MORPHING STAGE */
	.island-stage {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	/* COMPACT VIEW CONTENT */
	.island-compact {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
		padding: 0 0.55rem 0 0.85rem;
		box-sizing: border-box;
		opacity: 1;
		transform: scale(1);
		visibility: visible;
		pointer-events: auto;
		transition:
			opacity 0.16s ease,
			transform 0.22s cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0.16s;
	}

	/* EXPANDED VIEW CONTENT */
	.island-expanded {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 1.15rem 1.25rem 1.05rem;
		box-sizing: border-box;
		opacity: 0;
		transform: scale(0.92) translateY(-8px);
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.18s ease,
			transform 0.24s cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0.18s;
	}

	.dynamic-island.dock-mode .island-expanded {
		transform: scale(0.92) translateY(8px);
	}

	/* Cross-fade on expansion */
	.dynamic-island.expanded .island-compact {
		opacity: 0;
		transform: scale(0.9);
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.14s ease,
			transform 0.16s ease,
			visibility 0.14s;
	}

	.dynamic-island.expanded .island-expanded {
		opacity: 1;
		transform: scale(1) translateY(0);
		visibility: visible;
		pointer-events: auto;
		transition:
			opacity 0.26s cubic-bezier(0.16, 1, 0.3, 1) 0.08s,
			transform 0.32s cubic-bezier(0.34, 1.25, 0.64, 1) 0.08s,
			visibility 0.26s 0.08s;
	}

	.island-indicator {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.timer-flame {
		font-size: 1.15rem;
		line-height: 1;
		display: inline-block;
		animation: flame-pulse 2.2s ease-in-out infinite;
		transform-origin: center bottom;
		will-change: transform, filter;
	}

	@keyframes flame-pulse {
		0%, 100% {
			transform: scale(1) rotate(0deg);
			filter: drop-shadow(0 2px 8px rgba(245, 158, 11, 0.65));
		}
		25% {
			transform: scale(1.14) rotate(-4deg);
			filter: drop-shadow(0 2px 12px rgba(245, 158, 11, 0.9));
		}
		75% {
			transform: scale(1.08) rotate(3deg);
			filter: drop-shadow(0 2px 10px rgba(239, 68, 68, 0.8));
		}
	}

	/* Soundwave Equalizer Bars */
	.eq-bars {
		display: flex;
		align-items: flex-end;
		gap: 2.5px;
		height: 14px;
	}

	.eq-bars .bar {
		width: 2.5px;
		background: var(--island-accent, #22c55e);
		border-radius: 2px;
		animation: soundwave 1s ease-in-out infinite alternate;
	}

	.eq-bars .bar-1 { height: 5px; animation-delay: 0.08s; }
	.eq-bars .bar-2 { height: 13px; animation-delay: 0.22s; }
	.eq-bars .bar-3 { height: 8px; animation-delay: 0.36s; }

	@keyframes soundwave {
		0% { height: 4px; }
		100% { height: 14px; }
	}

	.pause-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f59e0b;
		box-shadow: 0 0 10px #f59e0b;
	}

	.island-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		overflow: hidden;
		flex: 1;
	}

	.time-readout {
		font-size: 1rem;
		font-weight: 850;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: #ffffff !important;
	}


	.subject-tag {
		font-size: 0.7rem;
		font-weight: 800;
		padding: 2px 7px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid;
		white-space: nowrap;
	}

	.paused-tag {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 5px;
		background: rgba(245, 158, 11, 0.25);
		border: 1px solid rgba(245, 158, 11, 0.5);
		color: #f59e0b;
	}

	.chapter-label {
		font-size: 0.76rem;
		color: rgba(255, 255, 255, 0.7);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 105px;
	}

	.island-quick-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.quick-toggle-btn {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.25);
		background: rgba(255, 255, 255, 0.15);
		color: #ffffff !important;
		display: grid;
		place-items: center;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.quick-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.28);
		transform: scale(1.08);
	}

	.quick-toggle-btn:active {
		transform: scale(0.92);
	}

	.quick-toggle-btn.on {
		background: var(--island-accent, #6d5dfc);
		border-color: transparent;
		box-shadow: 0 0 14px var(--island-accent);
	}

	.quick-toggle-btn.start-btn {
		background: rgba(109, 93, 252, 0.35);
		border-color: rgba(109, 93, 252, 0.6);
		color: #ffffff !important;
	}

	.quick-toggle-btn.start-btn:hover {
		background: var(--accent, #6d5dfc);
		color: #ffffff !important;
	}

	.quick-expand-btn {
		width: 26px;
		height: 26px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.65);
		display: grid;
		place-items: center;
		cursor: pointer;
		padding: 0;
		transition: color 0.15s ease, transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.quick-expand-btn:hover {
		color: #ffffff;
		transform: translateY(1px);
	}

	.expanded-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.expanded-title-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.phase-pill {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--island-accent, #38bdf8);
	}

	.phase-pill.break {
		color: #22c55e;
	}

	.subject-full {
		font-size: 0.96rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: #ffffff;
	}

	.close-island-btn {
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.85);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		cursor: pointer;
		font-size: 0.78rem;
		transition: all 0.15s ease;
	}

	.close-island-btn:hover {
		background: rgba(255, 255, 255, 0.28);
		color: #ffffff;
		transform: scale(1.06);
	}

	.close-island-btn:active {
		transform: scale(0.92);
	}

	.expanded-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}

	.large-time {
		font-size: 2.85rem;
		font-weight: 850;
		letter-spacing: -0.04em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: #ffffff;
	}

	.progress-bar-bg {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 99px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.3s ease;
		box-shadow: 0 0 12px var(--island-accent);
	}

	.presets-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
	}

	.presets-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.6);
		padding: 0 0.15rem;
	}

	.presets-label small {
		font-size: 0.62rem;
		font-weight: 600;
		opacity: 0.8;
	}

	.idle-presets {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		justify-content: center;
	}

	.preset-chip {
		flex: 1;
		padding: 0.6rem 0.4rem;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		color: #ffffff;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		cursor: pointer;
		transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1);
		font-family: inherit;
	}

	.preset-chip:hover {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 35%, transparent);
		border-color: var(--accent, #6d5dfc);
		transform: translateY(-2px);
	}

	.preset-chip:active {
		transform: scale(0.96);
	}

	.chip-min {
		font-size: 0.95rem;
		font-weight: 800;
	}

	.chip-tag {
		font-size: 0.68rem;
		color: rgba(255, 255, 255, 0.65);
	}

	/* Cutout Adaptation Selector Bar */
	.cutout-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.35rem 0.65rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		width: 100%;
		box-sizing: border-box;
	}

	.cutout-label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.65rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	.cutout-chips {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.cutout-chips::-webkit-scrollbar {
		display: none;
	}

	.cutout-chip {
		appearance: none;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.75);
		padding: 3px 8px;
		border-radius: 7px;
		font-size: 0.67rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1);
		white-space: nowrap;
		font-family: inherit;
	}

	.cutout-chip:hover {
		background: rgba(255, 255, 255, 0.14);
		color: #ffffff;
		transform: scale(1.05);
	}

	.cutout-chip:active {
		transform: scale(0.94);
	}

	.cutout-chip.active {
		background: var(--island-accent, #6d5dfc);
		border-color: var(--island-accent, #6d5dfc);
		color: #ffffff;
		box-shadow: 0 0 12px color-mix(in srgb, var(--island-accent, #6d5dfc) 50%, transparent);
	}

	.expanded-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.island-btn {
		padding: 0.6rem 0.9rem;
		border-radius: 12px;
		font-size: 0.82rem;
		font-weight: 750;
		font-family: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		border: none;
		transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.island-btn:hover {
		transform: translateY(-1px);
	}

	.island-btn:active {
		transform: scale(0.95);
	}

	.island-btn.primary {
		flex: 1;
		background: var(--island-accent, #6d5dfc);
		color: #ffffff;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--island-accent, #6d5dfc) 45%, transparent);
	}

	.island-btn.primary.full-width {
		flex: 1;
	}

	.island-btn.secondary {
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: #ffffff;
	}

	.island-btn.danger {
		background: rgba(239, 68, 68, 0.22);
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: #fca5a5;
	}

	.island-btn.danger:hover {
		background: #ef4444;
		color: #ffffff;
	}

	.island-btn.icon-only {
		width: 38px;
		height: 38px;
		padding: 0;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.85);
	}

	.island-btn.icon-only:hover {
		background: rgba(255, 255, 255, 0.22);
		color: #ffffff;
	}

	.home-mode {
		gap: 0.35rem;
	}

	.streak-badge {
		font-size: 0.68rem;
		font-weight: 850;
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.16);
		border: 1px solid rgba(245, 158, 11, 0.38);
		padding: 1px 5px;
		border-radius: 6px;
		letter-spacing: -0.01em;
	}

	.home-info {
		justify-content: center;
		gap: 0.45rem;
	}

	.daily-stat-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.82rem;
		font-weight: 750;
		color: rgba(255, 255, 255, 0.95);
		letter-spacing: -0.01em;
		white-space: nowrap;
	}

	.stat-icon {
		font-size: 0.82rem;
		line-height: 1;
	}

	.stat-num {
		font-variant-numeric: tabular-nums;
	}

	.stat-divider {
		color: rgba(255, 255, 255, 0.3);
		font-weight: 700;
	}

	.header-badge-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.level-pill {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.75);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.idle-expanded-dashboard {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.idle-stat-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		width: 100%;
	}

	.idle-stat-card {
		padding: 0.55rem 0.65rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.6);
	}

	.card-main {
		display: flex;
		align-items: baseline;
	}

	.card-value {
		font-size: 1.05rem;
		font-weight: 850;
		letter-spacing: -0.02em;
		color: #ffffff;
		font-variant-numeric: tabular-nums;
	}

	.card-value small {
		font-size: 0.7rem;
		font-weight: 650;
		color: rgba(255, 255, 255, 0.6);
		margin-left: 2px;
	}

	.mini-bar {
		width: 100%;
		height: 4px;
		border-radius: 99px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
		margin-top: 2px;
	}

	.mini-bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.4s ease;
	}

	@media (max-width: 768px) {
		.dynamic-island-anchor {
			position: fixed;
			left: 50%;
			transform: translateX(-50%);
			z-index: 9995;
			width: auto;
			height: auto;
		}

		/* Under topbar by default (NEVER covering mobile top menu bar) */
		.dynamic-island-anchor.cutout-auto,
		.dynamic-island-anchor.cutout-island,
		.dynamic-island-anchor.cutout-dot {
			top: calc(max(env(safe-area-inset-top, 0px), 14px) + 64px);
			bottom: auto;
		}

		.dynamic-island-anchor.cutout-notch {
			top: calc(max(env(safe-area-inset-top, 0px), 14px) + 76px);
			bottom: auto;
		}

		/* Bottom Dock mode on mobile: floats above mobile bottom nav */
		.dynamic-island-anchor.cutout-dock {
			top: auto;
			bottom: calc(max(env(safe-area-inset-bottom, 0px), 8px) + 80px);
		}

		.dynamic-island:not(.expanded) {
			width: min(92vw, 310px);
			height: 40px;
		}

		.dynamic-island.expanded {
			position: relative;
			top: auto;
			left: auto;
			transform: none;
			width: min(94vw, 380px);
			height: 355px;
		}

		.dynamic-island.expanded:not(.idle) {
			height: 290px;
		}
	}
</style>
