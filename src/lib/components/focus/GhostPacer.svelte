<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { tracker, dailyProgress } from '$lib/stores/tracker';
	import { todayKey, dayKeyOf, addDaysKey, formatMinutes, focusMinutesOn, sessionDayKey, lastNDays } from '$lib/state/dates';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import type { StudySession } from '$lib/types/tracker';

	export let activeSessionSeconds: number = 0;
	export let accent: string = 'var(--accent)';
	export let compact: boolean = false;

	type GhostMode = 'yesterday' | 'best_day' | 'avg';
	let mode: GhostMode = 'yesterday';

	let now = new Date();
	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timer = setInterval(() => {
			now = new Date();
		}, 10000); // refresh every 10s
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	$: currentMinOfDay = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
	$: currentFormattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

	// Today's completed focus minutes + currently ticking session
	$: activeElapsedMin = Math.max(0, activeSessionSeconds / 60);
	$: completedTodayMin = focusMinutesOn($tracker.log, todayKey());
	$: todayTotalMin = Math.round(completedTodayMin + activeElapsedMin);

	// Daily goal minutes
	$: goalHours = $tracker.goals?.day?.h || 6;
	$: goalMinutes = Math.max(60, goalHours * 60);

	// Helper to calculate paced minutes logged on a specific day key up to currentMinOfDay
	function calculatePacedMinutesForDay(dayKey: string, log: StudySession[], upToMinOfDay: number) {
		const daySessions = log.filter((s) => sessionDayKey(s) === dayKey);
		let paced = 0;
		let fullDay = 0;

		for (const s of daySessions) {
			const dur = Number(s[1]) || 0;
			fullDay += dur;
			const startDate = new Date(s[0] * 60000);
			const startMin = startDate.getHours() * 60 + startDate.getMinutes();
			const endMin = startMin + dur;

			if (upToMinOfDay <= startMin) {
				// Hasn't started yet at this time of day
			} else if (upToMinOfDay >= endMin) {
				// Completely finished by this time of day
				paced += dur;
			} else {
				// In progress at this time of day
				paced += Math.max(0, upToMinOfDay - startMin);
			}
		}

		return { paced: Math.round(paced), fullDay: Math.round(fullDay) };
	}

	// Compute Ghost targets
	$: yesterdayKey = addDaysKey(todayKey(), -1);
	$: yesterdayStats = calculatePacedMinutesForDay(yesterdayKey, $tracker.log, currentMinOfDay);

	// 7-day best day (excluding today)
	$: recentDays = lastNDays(8).filter((k) => k !== todayKey());
	$: bestDayData = (() => {
		let maxKey = yesterdayKey;
		let maxTotal = -1;
		for (const k of recentDays) {
			const total = focusMinutesOn($tracker.log, k);
			if (total > maxTotal) {
				maxTotal = total;
				maxKey = k;
			}
		}
		const stats = calculatePacedMinutesForDay(maxKey, $tracker.log, currentMinOfDay);
		const dayName = new Date(maxKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
		return { key: maxKey, dayName, ...stats };
	})();

	// 7-day average pace
	$: avgData = (() => {
		const validDays = recentDays.filter((k) => focusMinutesOn($tracker.log, k) > 0);
		if (validDays.length === 0) return { paced: 0, fullDay: 0 };
		let sumPaced = 0;
		let sumFull = 0;
		for (const k of validDays) {
			const st = calculatePacedMinutesForDay(k, $tracker.log, currentMinOfDay);
			sumPaced += st.paced;
			sumFull += st.fullDay;
		}
		return {
			paced: Math.round(sumPaced / validDays.length),
			fullDay: Math.round(sumFull / validDays.length)
		};
	})();

	// Effective Ghost based on selected mode (with smart fallback if yesterday was 0)
	$: effectiveMode = (mode === 'yesterday' && yesterdayStats.fullDay === 0 && bestDayData.fullDay > 0)
		? 'best_day'
		: mode;

	$: ghostPaced = effectiveMode === 'yesterday'
		? yesterdayStats.paced
		: effectiveMode === 'best_day'
		? bestDayData.paced
		: avgData.paced;

	$: ghostFullDay = effectiveMode === 'yesterday'
		? yesterdayStats.fullDay
		: effectiveMode === 'best_day'
		? bestDayData.fullDay
		: avgData.fullDay;

	$: ghostLabel = effectiveMode === 'yesterday'
		? 'Yesterday'
		: effectiveMode === 'best_day'
		? `Best Day (${bestDayData.dayName})`
		: '7-Day Avg';

	// Delta calculation
	$: deltaMin = todayTotalMin - ghostPaced;
	$: isLeading = deltaMin > 0;
	$: isTied = deltaMin === 0;
	$: hasBeatenFullDay = ghostFullDay > 0 && todayTotalMin > ghostFullDay;

	// Visual track percentage (relative to max of goal or runners)
	$: trackMax = Math.max(goalMinutes, todayTotalMin + 30, ghostPaced + 30);
	$: userPct = Math.min(100, Math.max(3, (todayTotalMin / trackMax) * 100));
	$: ghostPct = Math.min(100, Math.max(3, (ghostPaced / trackMax) * 100));
	$: goalPct = Math.min(100, (goalMinutes / trackMax) * 100);
</script>

<div class="ghost-pacer card" class:compact>
	<div class="gp-head">
		<div class="gp-title">
			<span class="ghost-badge">
				<span class="ghost-icon">👻</span>
				GHOST PACER
			</span>
			<span class="subtext">Real-time pacing vs past runs at {currentFormattedTime}</span>
		</div>

		<div class="gp-actions">
			<div class="mode-toggles" role="tablist">
				<button
					type="button"
					class="mode-btn"
					class:active={effectiveMode === 'yesterday'}
					on:click={() => (mode = 'yesterday')}
				>
					Yesterday
				</button>
				<button
					type="button"
					class="mode-btn"
					class:active={effectiveMode === 'best_day'}
					on:click={() => (mode = 'best_day')}
				>
					Best Day
				</button>
				<button
					type="button"
					class="mode-btn"
					class:active={effectiveMode === 'avg'}
					on:click={() => (mode = 'avg')}
				>
					7D Avg
				</button>
			</div>

			<button
				type="button"
				class="collapse-btn"
				title={compact ? 'Expand Ghost Pacer' : 'Collapse to compact view'}
				on:click={() => (compact = !compact)}
			>
				<NavIcon name={compact ? 'chevron-down' : 'chevron'} size={14} />
			</button>
		</div>
	</div>

	<!-- Status Callout -->
	<div class="status-banner" class:leading={isLeading} class:trailing={!isLeading && !isTied} class:record={hasBeatenFullDay}>
		{#if hasBeatenFullDay}
			<span class="status-icon">🏆</span>
			<div class="status-text">
				<b>Full-Day Record Beaten!</b>
				<span>You've already surpassed {ghostLabel}'s entire day ({formatMinutes(ghostFullDay)}). You are in unchartered territory!</span>
			</div>
		{:else if isLeading}
			<span class="status-icon">⚡</span>
			<div class="status-text">
				<b>Leading by +{formatMinutes(deltaMin)}</b>
				<span>You are ahead of {ghostLabel} ({formatMinutes(ghostPaced)}) at this exact time of day. Keep the pedal down!</span>
			</div>
		{:else if isTied}
			<span class="status-icon">🤝</span>
			<div class="status-text">
				<b>Neck and Neck!</b>
				<span>Exactly tied with {ghostLabel} at {formatMinutes(todayTotalMin)}. Next block takes the lead.</span>
			</div>
		{:else}
			<span class="status-icon">👻</span>
			<div class="status-text">
				<b>Trailing by {formatMinutes(Math.abs(deltaMin))}</b>
				<span>{ghostLabel} was at {formatMinutes(ghostPaced)} by {currentFormattedTime}. One focused block will close the gap!</span>
			</div>
		{/if}
	</div>

	{#if !compact}
		<!-- Dual Lane Race Track -->
		<div class="race-arena">
			<!-- Track 1: You -->
			<div class="racer-lane you-lane">
				<div class="lane-header">
					<div class="runner-tag">
						<span class="avatar you">🏃</span>
						<span class="racer-name">You (Today)</span>
						{#if activeSessionSeconds > 0}
							<span class="live-pulse"></span>
							<span class="live-pill">Live (+{Math.floor(activeSessionSeconds / 60)}m)</span>
						{/if}
					</div>
					<span class="racer-stat">{formatMinutes(todayTotalMin)}</span>
				</div>
				<div class="track-bar">
					<div class="track-fill user-fill" style="width: {userPct}%; background: {accent};">
						<span class="racer-pin you-pin" style="--c: {accent}">
							⚡
						</span>
					</div>
					{#if goalPct < 100}
						<div class="goal-flag" style="left: {goalPct}%;" title="Daily Goal: {goalHours}h">
							<span class="flag-icon">🏁</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Track 2: The Ghost -->
			<div class="racer-lane ghost-lane">
				<div class="lane-header">
					<div class="runner-tag">
						<span class="avatar ghost">👻</span>
						<span class="racer-name">{ghostLabel}</span>
						<span class="at-time">at {currentFormattedTime}</span>
					</div>
					<span class="racer-stat ghost-stat">{formatMinutes(ghostPaced)}</span>
				</div>
				<div class="track-bar ghost-track">
					<div class="track-fill ghost-fill" style="width: {ghostPct}%;">
						<span class="racer-pin ghost-pin">
							👻
						</span>
					</div>
				</div>
			</div>

			<!-- Quick stats footer -->
			<div class="track-footer">
				<div class="tf-item">
					<span class="tf-k">YOUR RECORD TODAY</span>
					<span class="tf-v">{formatMinutes(todayTotalMin)}</span>
				</div>
				<div class="tf-item">
					<span class="tf-k">{ghostLabel.toUpperCase()} AT THIS HOUR</span>
					<span class="tf-v">{formatMinutes(ghostPaced)}</span>
				</div>
				<div class="tf-item">
					<span class="tf-k">{ghostLabel.toUpperCase()} FULL DAY</span>
					<span class="tf-v">{ghostFullDay > 0 ? formatMinutes(ghostFullDay) : '—'}</span>
				</div>
				<div class="tf-item">
					<span class="tf-k">DAILY GOAL</span>
					<span class="tf-v">{goalHours}h ({formatMinutes(goalMinutes)})</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.ghost-pacer {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1.15rem 1.25rem;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 20px;
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255, 255, 255, 0.06);
		position: relative;
		overflow: hidden;
		transition: all 0.25s ease;
		height: 100%;
		box-sizing: border-box;
	}

	.ghost-pacer.compact {
		padding: 0.85rem 1.1rem;
		gap: 0.55rem;
	}

	.gp-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.gp-title {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.ghost-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		font-weight: 850;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.ghost-icon {
		font-size: 1.1rem;
		filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.45));
		animation: float-ghost 3s ease-in-out infinite;
	}

	@keyframes float-ghost {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-3px); }
	}

	.subtext {
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.gp-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.mode-toggles {
		display: inline-flex;
		background: var(--surface-subtle);
		padding: 2px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
	}

	.mode-btn {
		background: none;
		border: none;
		padding: 0.2rem 0.55rem;
		border-radius: 6px;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mode-btn:hover {
		color: var(--text-primary);
	}

	.mode-btn.active {
		background: var(--surface-panel);
		color: var(--accent);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	}

	.collapse-btn {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		border-radius: 8px;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.collapse-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	/* Status banner */
	.status-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.95rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
		border: 1px solid var(--border-subtle);
		transition: all 0.25s ease;
	}

	.status-banner.leading {
		background: color-mix(in srgb, var(--success, #2f9e6e) 12%, var(--surface-panel));
		border-color: color-mix(in srgb, var(--success, #2f9e6e) 35%, transparent);
	}

	.status-banner.trailing {
		background: color-mix(in srgb, #f59e0b 12%, var(--surface-panel));
		border-color: color-mix(in srgb, #f59e0b 35%, transparent);
	}

	.status-banner.record {
		background: linear-gradient(135deg, color-mix(in srgb, #eab308 18%, var(--surface-panel)), color-mix(in srgb, #a855f7 18%, var(--surface-panel)));
		border-color: rgba(234, 179, 8, 0.4);
	}

	.status-icon {
		font-size: 1.35rem;
		flex-shrink: 0;
	}

	.status-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.status-text b {
		font-size: 0.82rem;
		color: var(--text-primary);
	}

	.status-banner.leading .status-text b {
		color: var(--success, #2f9e6e);
	}

	.status-banner.trailing .status-text b {
		color: #f59e0b;
	}

	.status-banner.record .status-text b {
		color: #eab308;
	}

	.status-text span {
		font-size: 0.73rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	/* Race Arena */
	.race-arena {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding-top: 0.35rem;
	}

	.racer-lane {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.lane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.74rem;
	}

	.runner-tag {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.avatar {
		display: inline-grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		font-size: 0.85rem;
		background: var(--surface-subtle);
	}

	.racer-name {
		font-weight: 750;
		color: var(--text-primary);
	}

	.at-time {
		font-size: 0.68rem;
		color: var(--text-secondary);
		opacity: 0.8;
	}

	.live-pulse {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 6px #10b981;
		animation: pulse-dot 1.5s infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.85); }
	}

	.live-pill {
		font-size: 0.65rem;
		font-weight: 800;
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
	}

	.racer-stat {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
	}

	.ghost-stat {
		color: var(--text-secondary);
	}

	/* Track Bars */
	.track-bar {
		position: relative;
		height: 14px;
		border-radius: 99px;
		background: var(--surface-subtle);
		overflow: visible;
		border: 1px solid var(--border-subtle);
	}

	.track-fill {
		height: 100%;
		border-radius: 99px;
		position: relative;
		transition: width 0.4s ease;
		box-shadow: 0 0 10px -2px currentColor;
	}

	.ghost-fill {
		background: linear-gradient(90deg, rgba(168, 85, 247, 0.35), rgba(168, 85, 247, 0.75));
		box-shadow: 0 0 12px rgba(168, 85, 247, 0.45);
	}

	.racer-pin {
		position: absolute;
		right: -10px;
		top: 50%;
		transform: translateY(-50%);
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--surface-panel);
		border: 2px solid currentColor;
		display: grid;
		place-items: center;
		font-size: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		z-index: 2;
	}

	.ghost-pin {
		border-color: #a855f7;
		background: #231d38;
		box-shadow: 0 0 10px rgba(168, 85, 247, 0.7);
	}

	.goal-flag {
		position: absolute;
		top: -14px;
		transform: translateX(-50%);
		font-size: 0.85rem;
		z-index: 1;
		pointer-events: none;
	}

	/* Footer metrics */
	.track-footer {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-subtle);
	}

	.tf-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.tf-k {
		font-size: 0.64rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.04em;
	}

	.tf-v {
		font-size: 0.84rem;
		font-weight: 800;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 760px) {
		.ghost-pacer {
			padding: 1.15rem 1rem;
		}
		.gp-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.6rem;
		}
		.gp-actions {
			width: 100%;
			justify-content: space-between;
		}
		.track-footer {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}
	}

	@media (max-width: 400px) {
		.track-footer {
			grid-template-columns: 1fr;
		}
		.mode-toggles {
			width: 100%;
		}
		.mode-btn {
			flex: 1;
			text-align: center;
		}
	}
</style>
