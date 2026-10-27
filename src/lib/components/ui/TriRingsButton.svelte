<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { celebrateConfetti } from '$lib/utils/confetti';
	import { dailyProgress, revisedToday, tracker, updateTracker, setDailyGoal } from '$lib/stores/tracker';

	let open = false;
	let isEditingGoals = false;

	// Daily Progress Metrics
	$: minutes = $dailyProgress.minutes;
	$: hourGoal = $dailyProgress.hourGoal || 4;
	$: hourPct = $dailyProgress.hourPct;

	$: solved = $dailyProgress.solved;
	$: questionGoal = $dailyProgress.questionGoal || 50;
	$: questionPct = $dailyProgress.questionPct;

	$: revised = $revisedToday;
	$: revisionGoal = $tracker.meta?.dailyRevisionGoal ?? 3;
	$: revisionPct = revisionGoal > 0 ? Math.min(1, revised / revisionGoal) : 0;

	// Ring Completion Count (0 to 3)
	$: closedRed = hourPct >= 1;
	$: closedGreen = questionPct >= 1;
	$: closedBlue = revisionPct >= 1;
	$: closedCount = (closedRed ? 1 : 0) + (closedGreen ? 1 : 0) + (closedBlue ? 1 : 0);

	// Miniature SVG geometry (ViewBox 0 0 44 44, Center 22, 22)
	// Outer Red: r=18, C=113.1
	// Middle Green: r=13.5, C=84.82
	// Inner Blue: r=9, C=56.55
	const C_MINI_RED = 113.1;
	const C_MINI_GREEN = 84.82;
	const C_MINI_BLUE = 56.55;

	$: miniOffsetRed = C_MINI_RED * (1 - Math.min(1, Math.max(0, hourPct || 0)));
	$: miniOffsetGreen = C_MINI_GREEN * (1 - Math.min(1, Math.max(0, questionPct || 0)));
	$: miniOffsetBlue = C_MINI_BLUE * (1 - Math.min(1, Math.max(0, revisionPct || 0)));

	// Hero SVG geometry (ViewBox 0 0 160 160, Center 80, 80)
	// Outer Red: r=64, C=402.12
	// Middle Green: r=48, C=301.59
	// Inner Blue: r=32, C=201.06
	const C_HERO_RED = 402.12;
	const C_HERO_GREEN = 301.59;
	const C_HERO_BLUE = 201.06;

	$: heroOffsetRed = C_HERO_RED * (1 - Math.min(1, Math.max(0, hourPct || 0)));
	$: heroOffsetGreen = C_HERO_GREEN * (1 - Math.min(1, Math.max(0, questionPct || 0)));
	$: heroOffsetBlue = C_HERO_BLUE * (1 - Math.min(1, Math.max(0, revisionPct || 0)));

	// Average completion percentage across all 3 rings
	$: overallPct = Math.round(((Math.min(1, hourPct || 0) + Math.min(1, questionPct || 0) + Math.min(1, revisionPct || 0)) / 3) * 100);

	let prevClosedCount = 0;
	$: if (closedCount === 3 && prevClosedCount < 3) {
		prevClosedCount = 3;
		if (typeof window !== 'undefined') celebrateConfetti({ count: 75 });
	} else if (closedCount < 3) {
		prevClosedCount = closedCount;
	}

	// Editable Goal Values
	let editH = hourGoal;
	let editQ = questionGoal;
	let editR = revisionGoal;

	$: if (open && !isEditingGoals) {
		editH = hourGoal;
		editQ = questionGoal;
		editR = revisionGoal;
	}

	function saveGoals() {
		setDailyGoal({ q: Math.max(1, editQ || 50), h: Math.max(1, editH || 4) });
		updateTracker((state) => {
			if (!state.meta) {
				state.meta = {} as any;
			}
			state.meta.dailyRevisionGoal = Math.max(1, editR || 3);
		});
		isEditingGoals = false;
	}

	function formatFocusTime(mins: number): string {
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	}
</script>

<!-- Topbar Micro-Widget Button -->
<button
	type="button"
	class="tri-rings-btn no-tilt"
	class:trifecta={closedCount === 3}
	aria-label="Daily activity rings: {closedCount} of 3 closed"
	title="Activity Rings: Focus ({Math.round(hourPct * 100)}%), Questions ({Math.round(questionPct * 100)}%), Revision ({Math.round(revisionPct * 100)}%)"
	on:click={() => (open = true)}
>
	<svg class="mini-rings" viewBox="0 0 44 44" aria-hidden="true">
		<!-- Outer Red Track & Fill -->
		<circle class="ring-track red-track" cx="22" cy="22" r="18" />
		<circle
			class="ring-fill red-fill"
			cx="22" cy="22" r="18"
			stroke-dasharray={C_MINI_RED}
			stroke-dashoffset={miniOffsetRed}
		/>

		<!-- Middle Green Track & Fill -->
		<circle class="ring-track green-track" cx="22" cy="22" r="13.5" />
		<circle
			class="ring-fill green-fill"
			cx="22" cy="22" r="13.5"
			stroke-dasharray={C_MINI_GREEN}
			stroke-dashoffset={miniOffsetGreen}
		/>

		<!-- Inner Blue Track & Fill -->
		<circle class="ring-track blue-track" cx="22" cy="22" r="9" />
		<circle
			class="ring-fill blue-fill"
			cx="22" cy="22" r="9"
			stroke-dasharray={C_MINI_BLUE}
			stroke-dashoffset={miniOffsetBlue}
		/>
	</svg>
	<span class="count-pill" class:complete={closedCount === 3}>
		{#if closedCount === 3}
			<span class="sparkle">✦</span>
		{/if}
		{closedCount}/3
	</span>
</button>

<!-- Breakdown HUD Modal (iOS Bottom Sheet on Mobile / Vision Acrylic on Desktop) -->
<Modal bind:open title="ACTIVITY RINGS" width="520px">
	<!-- Hero Centerpiece -->
	<div class="rings-hero">
		<div class="hero-svg-wrap">
			<svg class="hero-rings" viewBox="0 0 160 160" aria-label="Concentric activity rings visualization">
				<defs>
					<!-- Neon Ring Gradients -->
					<linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="color-mix(in srgb, var(--accent, #ff6b8b) 70%, white)" />
						<stop offset="100%" stop-color="var(--accent, #ff3366)" />
					</linearGradient>
					<linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#2af598" />
						<stop offset="100%" stop-color="#009efd" />
					</linearGradient>
					<linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="#00f2fe" />
						<stop offset="100%" stop-color="#4facfe" />
					</linearGradient>

					<!-- Glow Filters -->
					<filter id="ringGlowRed" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="var(--accent, #ff3366)" flood-opacity="0.55" />
					</filter>
					<filter id="ringGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#2af598" flood-opacity="0.55" />
					</filter>
					<filter id="ringGlowBlue" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#00f2fe" flood-opacity="0.55" />
					</filter>
				</defs>

				<!-- Red (Outer: Focus) -->
				<circle class="hero-track red-track" cx="80" cy="80" r="64" />
				<circle
					class="hero-fill red-fill"
					cx="80" cy="80" r="64"
					stroke="url(#redGradient)"
					stroke-dasharray={C_HERO_RED}
					stroke-dashoffset={heroOffsetRed}
					filter={closedRed ? 'url(#ringGlowRed)' : undefined}
				/>

				<!-- Green (Middle: Questions) -->
				<circle class="hero-track green-track" cx="80" cy="80" r="48" />
				<circle
					class="hero-fill green-fill"
					cx="80" cy="80" r="48"
					stroke="url(#greenGradient)"
					stroke-dasharray={C_HERO_GREEN}
					stroke-dashoffset={heroOffsetGreen}
					filter={closedGreen ? 'url(#ringGlowGreen)' : undefined}
				/>

				<!-- Blue (Inner: Revision) -->
				<circle class="hero-track blue-track" cx="80" cy="80" r="32" />
				<circle
					class="hero-fill blue-fill"
					cx="80" cy="80" r="32"
					stroke="url(#blueGradient)"
					stroke-dasharray={C_HERO_BLUE}
					stroke-dashoffset={heroOffsetBlue}
					filter={closedBlue ? 'url(#ringGlowBlue)' : undefined}
				/>
			</svg>
			<div class="rings-center-stat">
				<span class="pct-num">{overallPct}%</span>
				<span class="pct-sub">TODAY</span>
			</div>
		</div>

		<!-- Status Banner -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="rings-status-card"
			class:trifecta-done={closedCount === 3}
			on:click={() => closedCount === 3 && celebrateConfetti({ count: 90 })}
			role={closedCount === 3 ? 'button' : undefined}
			tabindex={closedCount === 3 ? 0 : undefined}
			style={closedCount === 3 ? 'cursor: pointer;' : ''}
			title={closedCount === 3 ? 'Click for fireworks celebration!' : undefined}
		>
			{#if closedCount === 3}
				<span class="status-icon">🏆</span>
				<div>
					<b>Trifecta Complete! 🎉</b>
					<small>All 3 daily rings are closed. Incredible dedication and focus today! (Click to celebrate)</small>
				</div>
			{:else if closedCount === 2}
				<span class="status-icon">⚡</span>
				<div>
					<b>2 of 3 Rings Closed</b>
					<small>Almost at the finish line! Close your last ring to complete today's trifecta.</small>
				</div>
			{:else if closedCount === 1}
				<span class="status-icon">🔥</span>
				<div>
					<b>1 of 3 Rings Closed</b>
					<small>Great start! Keep the momentum going across your study targets.</small>
				</div>
			{:else}
				<span class="status-icon">🎯</span>
				<div>
					<b>Close Your Rings Today</b>
					<small>Log focus hours, solve practice problems, and complete spaced revisions.</small>
				</div>
			{/if}
		</div>
	</div>

	<!-- Ring Breakdown Cards -->
	<div class="metrics-grid">
		<!-- Ring 1: Focus Hours (Red) -->
		<div class="metric-card red-card">
			<div class="card-top">
				<div class="card-title-group">
					<span class="ring-dot dot-red"></span>
					<div>
						<h4>Focus Time</h4>
						<small>Outer Ring</small>
					</div>
				</div>
				<span class="badge-status" class:closed={closedRed}>
					{closedRed ? 'CLOSED ✓' : `${Math.round(hourPct * 100)}%`}
				</span>
			</div>
			<div class="card-values">
				<span class="val-big">{formatFocusTime(minutes)}</span>
				<span class="val-goal">/ {hourGoal}h goal</span>
			</div>
			<div class="bar-track">
				<div class="bar-fill fill-red" style="width: {Math.min(100, Math.round(hourPct * 100))}%;"></div>
			</div>
		</div>

		<!-- Ring 2: Questions (Green) -->
		<div class="metric-card green-card">
			<div class="card-top">
				<div class="card-title-group">
					<span class="ring-dot dot-green"></span>
					<div>
						<h4>Questions Solved</h4>
						<small>Middle Ring</small>
					</div>
				</div>
				<span class="badge-status" class:closed={closedGreen}>
					{closedGreen ? 'CLOSED ✓' : `${Math.round(questionPct * 100)}%`}
				</span>
			</div>
			<div class="card-values">
				<span class="val-big">{solved}</span>
				<span class="val-goal">/ {questionGoal} questions</span>
			</div>
			<div class="bar-track">
				<div class="bar-fill fill-green" style="width: {Math.min(100, Math.round(questionPct * 100))}%;"></div>
			</div>
		</div>

		<!-- Ring 3: Revision (Blue) -->
		<div class="metric-card blue-card">
			<div class="card-top">
				<div class="card-title-group">
					<span class="ring-dot dot-blue"></span>
					<div>
						<h4>Spaced Revision</h4>
						<small>Inner Ring</small>
					</div>
				</div>
				<span class="badge-status" class:closed={closedBlue}>
					{closedBlue ? 'CLOSED ✓' : `${Math.round(revisionPct * 100)}%`}
				</span>
			</div>
			<div class="card-values">
				<span class="val-big">{revised}</span>
				<span class="val-goal">/ {revisionGoal} chapters</span>
			</div>
			<div class="bar-track">
				<div class="bar-fill fill-blue" style="width: {Math.min(100, Math.round(revisionPct * 100))}%;"></div>
			</div>
		</div>
	</div>

	<!-- Optional In-Modal Goal Editor -->
	{#if isEditingGoals}
		<div class="goals-drawer no-tilt">
			<div class="drawer-header">
				<h5>Adjust Daily Ring Targets</h5>
				<small>Update daily focus hours, questions, and revision goals.</small>
			</div>
			<div class="drawer-rows">
				<label class="drawer-row">
					<span>Focus Target (Hours)</span>
					<input type="number" min="1" max="24" bind:value={editH} />
				</label>
				<label class="drawer-row">
					<span>Question Target (Count)</span>
					<input type="number" min="1" max="500" bind:value={editQ} />
				</label>
				<label class="drawer-row">
					<span>Revision Target (Chapters)</span>
					<input type="number" min="1" max="20" bind:value={editR} />
				</label>
			</div>
			<div class="drawer-actions">
				<button type="button" class="btn-cancel" on:click={() => (isEditingGoals = false)}>Cancel</button>
				<button type="button" class="btn-save" on:click={saveGoals}>Save Targets</button>
			</div>
		</div>
	{/if}

	<!-- Modal Footer -->
	<svelte:fragment slot="footer">
		<button
			type="button"
			class="btn-toggle-edit"
			on:click={() => (isEditingGoals = !isEditingGoals)}
		>
			<NavIcon name="target" size={15} />
			<span>{isEditingGoals ? 'Close Editor' : 'Edit Targets'}</span>
		</button>
		<button type="button" class="btn-done" on:click={() => (open = false)}>
			Done
		</button>
	</svelte:fragment>
</Modal>

<style>
	/* ========================================================================= */
	/* TOPBAR MICRO-WIDGET BUTTON                                                */
	/* ========================================================================= */
	.tri-rings-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.44rem;
		height: 36px;
		padding: 0 0.65rem 0 0.5rem;
		border: 1.5px solid color-mix(in srgb, var(--accent) 60%, var(--border-subtle));
		border-radius: 11px;
		color: var(--text-primary);
		background: color-mix(in srgb, var(--accent) 24%, var(--surface-panel));
		font-family: inherit;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1),
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.tri-rings-btn:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 34%, var(--surface-panel));
		box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 45%, transparent);
	}
	.tri-rings-btn.trifecta {
		border-color: color-mix(in srgb, #2af598 60%, var(--accent));
		box-shadow: 0 0 18px rgba(42, 245, 152, 0.35);
	}

	.mini-rings {
		width: 25px;
		height: 25px;
		transform: rotate(-90deg);
		flex-shrink: 0;
	}
	.ring-track {
		fill: none;
		stroke-width: 3.2;
		stroke-linecap: round;
	}
	.red-track { stroke: color-mix(in srgb, var(--accent, #ff3366) 36%, transparent); }
	.green-track { stroke: rgba(42, 245, 152, 0.25); }
	.blue-track { stroke: rgba(0, 242, 254, 0.25); }

	.ring-fill {
		fill: none;
		stroke-width: 3.2;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.8s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.red-fill {
		stroke: var(--accent, #ff3366);
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent) 75%, transparent));
	}
	.green-fill { stroke: #2af598; }
	.blue-fill { stroke: #00f2fe; }

	.count-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
		font-size: 0.8rem;
		font-weight: 850;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
		text-shadow: 0 0 8px color-mix(in srgb, var(--accent) 70%, transparent);
	}
	.count-pill.complete {
		color: #2af598;
		font-weight: 850;
		text-shadow: 0 0 8px rgba(42, 245, 152, 0.6);
	}
	.sparkle {
		color: #ffd700;
		font-size: 0.72rem;
		animation: sparkle-pulse 1.8s ease-in-out infinite;
	}
	@keyframes sparkle-pulse {
		0%, 100% { transform: scale(1); opacity: 0.9; }
		50% { transform: scale(1.25); opacity: 1; }
	}

	/* ========================================================================= */
	/* BREAKDOWN MODAL HUD STYLES                                               */
	/* ========================================================================= */
	.rings-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
		padding-bottom: 1.25rem;
		border-bottom: 0.5px solid color-mix(in srgb, var(--border-subtle), transparent 30%);
	}
	.hero-svg-wrap {
		position: relative;
		width: 160px;
		height: 160px;
		display: grid;
		place-items: center;
	}
	.hero-rings {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.hero-track {
		fill: none;
		stroke-width: 11;
		stroke-linecap: round;
	}
	.hero-fill {
		fill: none;
		stroke-width: 11;
		stroke-linecap: round;
		transition: stroke-dashoffset 1s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.rings-center-stat {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}
	.pct-num {
		font-size: 1.6rem;
		font-weight: 850;
		letter-spacing: -0.04em;
		line-height: 1;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	.pct-sub {
		font-size: 0.62rem;
		font-weight: 750;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
		margin-top: 0.15rem;
	}

	.rings-status-card {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		width: 100%;
		padding: 0.8rem 1rem;
		border-radius: 14px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
	}
	.rings-status-card.trifecta-done {
		border-color: color-mix(in srgb, #2af598 45%, var(--border-subtle));
		background: color-mix(in srgb, #2af598 10%, var(--surface-subtle));
		box-shadow: 0 4px 20px rgba(42, 245, 152, 0.15);
	}
	.status-icon {
		font-size: 1.45rem;
		line-height: 1;
		flex-shrink: 0;
	}
	.rings-status-card b {
		display: block;
		font-size: 0.84rem;
		font-weight: 750;
		color: var(--text-primary);
	}
	.rings-status-card small {
		display: block;
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.35;
		margin-top: 0.1rem;
	}

	/* Metrics Cards Grid */
	.metrics-grid {
		display: grid;
		gap: 0.75rem;
		margin-top: 1.15rem;
	}
	.metric-card {
		padding: 0.95rem 1.1rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		display: grid;
		gap: 0.6rem;
	}
	.metric-card.red-card {
		border-color: color-mix(in srgb, #ff3366 25%, var(--border-subtle));
	}
	.metric-card.green-card {
		border-color: color-mix(in srgb, #2af598 25%, var(--border-subtle));
	}
	.metric-card.blue-card {
		border-color: color-mix(in srgb, #00f2fe 25%, var(--border-subtle));
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.card-title-group {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.ring-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.dot-red { background: var(--accent, #ff3366); box-shadow: 0 0 8px color-mix(in srgb, var(--accent, #ff3366) 60%, transparent); }
	.dot-green { background: #2af598; box-shadow: 0 0 8px rgba(42, 245, 152, 0.6); }
	.dot-blue { background: #00f2fe; box-shadow: 0 0 8px rgba(0, 242, 254, 0.6); }

	.card-title-group h4 {
		margin: 0;
		font-size: 0.86rem;
		font-weight: 750;
		letter-spacing: -0.01em;
	}
	.card-title-group small {
		display: block;
		font-size: 0.66rem;
		color: var(--text-secondary);
	}

	.badge-status {
		font-size: 0.7rem;
		font-weight: 800;
		padding: 0.22rem 0.55rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
		color: var(--text-secondary);
		letter-spacing: 0.02em;
	}
	.badge-status.closed {
		background: color-mix(in srgb, #2af598 18%, transparent);
		color: #2af598;
	}

	.card-values {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}
	.val-big {
		font-size: 1.35rem;
		font-weight: 850;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	.val-goal {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.bar-track {
		width: 100%;
		height: 6px;
		border-radius: 99px;
		background: color-mix(in srgb, var(--text-primary) 7%, transparent);
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 0.7s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.fill-red { background: linear-gradient(90deg, color-mix(in srgb, var(--accent, #ff6b8b) 70%, white), var(--accent, #ff3366)); box-shadow: 0 0 10px color-mix(in srgb, var(--accent, #ff3366) 50%, transparent); }
	.fill-green { background: linear-gradient(90deg, #2af598, #009efd); box-shadow: 0 0 10px rgba(42, 245, 152, 0.5); }
	.fill-blue { background: linear-gradient(90deg, #00f2fe, #4facfe); box-shadow: 0 0 10px rgba(0, 242, 254, 0.5); }

	/* Goals Drawer */
	.goals-drawer {
		margin-top: 1rem;
		padding: 1rem 1.15rem;
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		display: grid;
		gap: 0.85rem;
	}
	.drawer-header h5 {
		margin: 0;
		font-size: 0.86rem;
		font-weight: 750;
	}
	.drawer-header small {
		font-size: 0.7rem;
		color: var(--text-secondary);
	}
	.drawer-rows {
		display: grid;
		gap: 0.65rem;
	}
	.drawer-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.8rem;
		font-weight: 650;
	}
	.drawer-row input {
		width: 90px;
		height: 32px;
		padding: 0 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 700;
		text-align: right;
	}
	.drawer-row input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.drawer-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.3rem;
	}
	.btn-cancel {
		height: 32px;
		padding: 0 0.8rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.76rem;
		font-weight: 650;
		cursor: pointer;
	}
	.btn-save {
		height: 32px;
		padding: 0 0.9rem;
		border-radius: 8px;
		border: 0;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
	}

	/* Footer Buttons */
	.btn-toggle-edit {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 36px;
		padding: 0 0.85rem;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.78rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.btn-toggle-edit:hover {
		color: var(--text-primary);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
	}
	.btn-done {
		height: 36px;
		padding: 0 1.15rem;
		border-radius: 10px;
		border: 0;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.8rem;
		font-weight: 750;
		cursor: pointer;
		transition: transform 0.15s ease;
	}
	.btn-done:active {
		transform: scale(0.95);
	}

	@media (max-width: 768px) {
		.hero-svg-wrap {
			width: 140px;
			height: 140px;
		}
		.pct-num {
			font-size: 1.45rem;
		}
		.card-values .val-big {
			font-size: 1.2rem;
		}
	}
</style>
