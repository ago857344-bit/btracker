<script lang="ts">
	import { onDestroy } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { setExamDate, tracker } from '$lib/stores/tracker';
	import { longDateKey } from '$lib/state/dates';
	import { getExamPresets, findMatchingPreset, getExamMilestone, type ExamPreset } from '$lib/state/exam-presets';
	import { uiClick } from '$lib/utils/feedback';

	let examInput = '';
	let showCustomInput = false;
	let now = Date.now();
	const tick = setInterval(() => (now = Date.now()), 1000);
	onDestroy(() => clearInterval(tick));

	const presets = getExamPresets();

	$: exam = $tracker.meta.exam;
	$: matchedPreset = findMatchingPreset(exam, presets);
	$: remaining = exam ? Math.max(0, new Date(`${exam}T09:00:00`).getTime() - now) : 0;
	$: dd = Math.floor(remaining / 86400000);
	$: hh = Math.floor((remaining % 86400000) / 3600000);
	$: mm = Math.floor((remaining % 3600000) / 60000);
	$: ss = Math.floor((remaining % 60000) / 1000);
	$: weeksLeft = Math.ceil(dd / 7);
	$: milestone = getExamMilestone(dd);

	const pad = (n: number) => String(n).padStart(2, '0');

	function selectPreset(preset: ExamPreset) {
		uiClick();
		setExamDate(preset.date);
		showCustomInput = false;
	}

	function setCustomTarget() {
		uiClick();
		if (!examInput) return;
		setExamDate(examInput);
		examInput = '';
		showCustomInput = false;
	}

	function clearTarget() {
		uiClick();
		setExamDate(null);
		showCustomInput = false;
	}
</script>

<div class="target-widget">
	{#if exam}
		<!-- Header with Matched Preset or Custom Date -->
		<div class="target-header">
			<div class="target-meta">
				<div class="exam-title-row">
					<span class="exam-badge" style="--badge-color: {matchedPreset?.badgeColor ?? 'var(--accent)'}">
						<NavIcon name="target" size={12} />
						<b>{matchedPreset ? matchedPreset.name : 'Target Exam'}</b>
					</span>
					<span class="exam-date-str">{longDateKey(exam)}</span>
				</div>
				<!-- Milestone Phase Indicator -->
				<div class="milestone-pill {milestone.tone}">
					<NavIcon name={milestone.icon} size={11} />
					<span>{weeksLeft > 0 ? `${weeksLeft}w left · ` : ''}{milestone.label}</span>
				</div>
			</div>
			<button type="button" class="clear-btn" on:click={clearTarget} title="Clear target exam">
				<NavIcon name="x" size={13} />
			</button>
		</div>

		<!-- Live Digital Countdown -->
		<div class="countdown-grid" aria-live="off">
			{#each [[dd, 'Days'], [hh, 'Hours'], [mm, 'Mins'], [ss, 'Secs']] as [value, label]}
				<div class="unit-tile">
					<span class="unit-val">{pad(Number(value))}</span>
					<span class="unit-lbl">{label}</span>
				</div>
			{/each}
		</div>

		<!-- 1-Click Quick Presets Bar -->
		<div class="presets-bar">
			<div class="presets-scroll">
				{#each presets as p (p.id)}
					<button
						type="button"
						class="preset-pill"
						class:active={exam === p.date}
						on:click={() => selectPreset(p)}
						title={`Set target to ${p.name}`}
					>
						<span class="preset-name">{p.shortName}</span>
						<span class="preset-season">{p.season}</span>
					</button>
				{/each}
				<button
					type="button"
					class="preset-pill custom"
					class:active={showCustomInput || (!matchedPreset && !!exam)}
					on:click={() => (showCustomInput = !showCustomInput)}
					title="Set custom date"
				>
					<span>Custom</span>
				</button>
			</div>
		</div>

		<!-- Optional Custom Date Input Drawer -->
		{#if showCustomInput}
			<div class="custom-row">
				<input type="date" bind:value={examInput} aria-label="New exam date" />
				<button type="button" class="btn-set" on:click={setCustomTarget} disabled={!examInput}>
					Update Date
				</button>
			</div>
		{/if}
	{:else}
		<!-- Empty / Setup Mode -->
		<div class="configure-box">
			<div class="configure-hero">
				<div class="target-icon-wrap">
					<NavIcon name="target" size={20} />
				</div>
				<div class="configure-text">
					<h4>Select Your Target Exam</h4>
					<p>Pick your upcoming exam target to activate the countdown &amp; study milestones.</p>
				</div>
			</div>

			<!-- Preset Selection Cards Grid -->
			<div class="preset-cards-grid">
				{#each presets as p (p.id)}
					<button type="button" class="preset-card" on:click={() => selectPreset(p)}>
						<div class="card-top">
							<span class="card-dot" style="background: {p.badgeColor ?? 'var(--accent)'}"></span>
							<span class="card-season">{p.season}</span>
						</div>
						<b class="card-name">{p.shortName}</b>
						<span class="card-date">{longDateKey(p.date)}</span>
					</button>
				{/each}
			</div>

			<!-- Custom Date Fallback -->
			<div class="custom-row fallback">
				<input type="date" bind:value={examInput} aria-label="Exam date" />
				<button type="button" class="btn-set" on:click={setCustomTarget} disabled={!examInput}>
					Set Custom Date
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.target-widget {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		height: 100%;
		justify-content: space-between;
	}

	.target-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.target-meta {
		display: flex;
		flex-direction: column;
		gap: 0.28rem;
	}

	.exam-title-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.exam-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--badge-color, var(--accent));
		background: color-mix(in srgb, var(--badge-color, var(--accent)) 12%, transparent);
		padding: 0.12rem 0.45rem;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--badge-color, var(--accent)) 30%, transparent);
	}

	.exam-date-str {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.milestone-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		width: fit-content;
	}

	.milestone-pill.danger {
		background: color-mix(in srgb, var(--danger, #ef4444) 15%, transparent);
		color: var(--danger, #ef4444);
		border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
	}

	.milestone-pill.warning {
		background: color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent);
		color: var(--warning, #f59e0b);
		border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent);
	}

	.milestone-pill.accent {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.milestone-pill.success {
		background: color-mix(in srgb, var(--success, #10b981) 15%, transparent);
		color: var(--success, #10b981);
		border: 1px solid color-mix(in srgb, var(--success, #10b981) 30%, transparent);
	}

	.milestone-pill.default {
		background: var(--surface-subtle);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.clear-btn {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border: 1px solid var(--border-subtle);
		border-radius: 7px;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.clear-btn:hover {
		color: var(--danger, #ef4444);
		border-color: var(--danger, #ef4444);
	}

	/* Countdown Tiles Grid */
	.countdown-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.45rem;
	}

	.unit-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.55rem 0.2rem;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-subtle);
		gap: 0.1rem;
	}

	.unit-val {
		font-size: 1.35rem;
		font-weight: 850;
		letter-spacing: -0.04em;
		line-height: 1;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}

	.unit-lbl {
		color: var(--text-secondary);
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* Presets bar */
	.presets-bar {
		width: 100%;
		overflow: hidden;
	}

	.presets-scroll {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 0.15rem;
	}

	.presets-scroll::-webkit-scrollbar {
		display: none;
	}

	.preset-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.22rem 0.55rem;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 700;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}

	.preset-pill:hover {
		color: var(--text-primary);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
	}

	.preset-pill.active {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-subtle));
		color: var(--accent);
		border-color: var(--accent);
	}

	.preset-season {
		font-size: 0.6rem;
		padding: 0.04rem 0.28rem;
		border-radius: 4px;
		background: color-mix(in srgb, currentColor 14%, transparent);
	}

	.custom-row {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.custom-row input[type='date'] {
		flex: 1 1 130px;
		min-width: 0;
		height: 32px;
		padding: 0 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.74rem;
		font-family: inherit;
	}

	.btn-set {
		height: 32px;
		padding: 0 0.75rem;
		border: none;
		border-radius: 8px;
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		white-space: nowrap;
		font-family: inherit;
		transition: opacity 0.15s;
	}

	.btn-set:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* Configure Empty Box */
	.configure-box {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.85rem;
		border: 1.5px dashed var(--border-subtle);
		border-radius: 14px;
		background: color-mix(in srgb, var(--surface-subtle) 40%, transparent);
	}

	.configure-hero {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.target-icon-wrap {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.configure-text h4 {
		margin: 0;
		font-size: 0.84rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.configure-text p {
		margin: 0.1rem 0 0;
		font-size: 0.7rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.preset-cards-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.45rem;
	}

	.preset-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.45rem 0.55rem;
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		cursor: pointer;
		text-align: left;
		transition: all 0.15s;
		font-family: inherit;
		gap: 0.12rem;
		min-width: 0;
		overflow: hidden;
	}

	.preset-card:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.card-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.card-season {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.card-name {
		font-size: 0.74rem;
		color: var(--text-primary);
		font-weight: 750;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.card-date {
		font-size: 0.62rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	@media (max-width: 500px) {
		.countdown-grid {
			gap: 0.35rem;
		}
		.unit-tile {
			padding: 0.5rem 0.15rem;
			border-radius: 10px;
		}
		.unit-val {
			font-size: 1.15rem;
		}
		.unit-lbl {
			font-size: 0.52rem;
		}
		.preset-cards-grid {
			grid-template-columns: 1fr;
		}
	}

	:global(.mode-mobile) .countdown-grid,
	:global(.is-phone) .countdown-grid {
		gap: 0.35rem;
	}
	:global(.mode-mobile) .unit-tile,
	:global(.is-phone) .unit-tile {
		padding: 0.5rem 0.15rem;
		border-radius: 10px;
	}
	:global(.mode-mobile) .unit-val,
	:global(.is-phone) .unit-val {
		font-size: 1.15rem;
	}
	:global(.mode-mobile) .unit-lbl,
	:global(.is-phone) .unit-lbl {
		font-size: 0.52rem;
	}
	:global(.mode-mobile) .preset-cards-grid,
	:global(.is-phone) .preset-cards-grid {
		grid-template-columns: 1fr;
	}

	@container (max-width: 420px) {
		.countdown-grid {
			gap: 0.35rem;
		}
		.unit-tile {
			padding: 0.5rem 0.15rem;
			border-radius: 10px;
		}
		.unit-val {
			font-size: 1.15rem;
		}
		.unit-lbl {
			font-size: 0.52rem;
		}
		.preset-cards-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
