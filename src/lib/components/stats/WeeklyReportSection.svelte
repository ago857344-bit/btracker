<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import WeeklyDoubleGraph from '$lib/components/charts/WeeklyDoubleGraph.svelte';
	import { hydration, tracker, updateTracker, wrappedStoryOpen, openWrappedStory } from '$lib/stores/tracker';
	import { buildWeekReport, currentWeekStartKey, rolloverWeekSnapshot } from '$lib/state/weekly';
	import { buildDailyReport } from '$lib/state/dailyReport';
	import { renderReportImage, renderDailyReportImage } from '$lib/services/reportCardImage';
	import { loadout } from '$lib/stores/cosmetics';
	import { todayKey, lastNDays, shortDateKey, weekdayShort, formatMinutes } from '$lib/state/dates';

	// If a new week started while the app was open, capture the fresh baseline.
	$: if ($hydration === 'ready' && $tracker.gamification?.week?.start !== currentWeekStartKey()) {
		updateTracker(rolloverWeekSnapshot);
	}

	// Dropdown timeframe: 'daily' is default!
	let timeframe: 'daily' | 'weekly' = 'daily';
	let selectedDayKey = todayKey();

	// Past 7 days list for daily selector
	$: pastDays = lastNDays(7).reverse().map((key) => {
		const isToday = key === todayKey();
		const dayName = weekdayShort(key);
		const shortDate = shortDateKey(key);
		return {
			key,
			label: isToday ? `Today (${dayName}, ${shortDate})` : `${dayName}, ${shortDate}`
		};
	});

	$: weeklyReport = {
		...buildWeekReport($tracker),
		flairTitle: $loadout.title,
		frameColors: $loadout.frame?.colors ?? null
	};

	$: dailyReport = {
		...buildDailyReport($tracker, selectedDayKey),
		flairTitle: $loadout.title,
		frameColors: $loadout.frame?.colors ?? null
	};

	let busy = false;
	let notice = '';

	async function download() {
		if (busy) return;
		busy = true;
		notice = '';
		try {
			let blob: Blob;
			let filename: string;

			if (timeframe === 'daily') {
				blob = await renderDailyReportImage(dailyReport);
				filename = `btracker-daily-${dailyReport.key}.png`;
			} else {
				blob = await renderReportImage(weeklyReport);
				filename = `btracker-week-${weeklyReport.startKey}.png`;
			}

			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = filename;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 5000);
			notice = `${timeframe === 'daily' ? 'Daily' : 'Weekly'} image downloaded as PNG.`;
		} catch {
			notice = 'Export failed — please try again.';
		} finally {
			busy = false;
		}
	}

	async function copyImage() {
		if (busy) return;
		busy = true;
		notice = '';
		try {
			const blob = timeframe === 'daily'
				? await renderDailyReportImage(dailyReport)
				: await renderReportImage(weeklyReport);
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			notice = `${timeframe === 'daily' ? 'Daily' : 'Weekly'} card copied — paste it anywhere.`;
		} catch {
			notice = 'Clipboard is not available here — use Download.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="report-section">
	<!-- Top Bar: Selector Controls & Action Buttons -->
	<div class="top-bar">
		<div class="header-group">
			<h3><NavIcon name="trophy" size={16} /> Shareable Performance Report</h3>
			<p>
				Export a shareable image with your study hours, questions solved, and graphs.
			</p>
		</div>

		<div class="controls-group">
			<!-- Dropdown Selector (Daily by default, click for Weekly) -->
			<div class="select-box">
				<label for="timeframe-select">TIMEFRAME</label>
				<div class="custom-select">
					<select id="timeframe-select" bind:value={timeframe}>
						<option value="daily">Daily Report (Default)</option>
						<option value="weekly">Weekly Report</option>
					</select>
					<span class="select-arrow"><NavIcon name="chevron-down" size={13} /></span>
				</div>
			</div>

			{#if timeframe === 'daily'}
				<div class="select-box">
					<label for="day-select">SELECT DAY</label>
					<div class="custom-select">
						<select id="day-select" bind:value={selectedDayKey}>
							{#each pastDays as d}
								<option value={d.key}>{d.label}</option>
							{/each}
						</select>
						<span class="select-arrow"><NavIcon name="chevron-down" size={13} /></span>
					</div>
				</div>
			{/if}

			<div class="actions">
				<button type="button" class="btn wrapped-btn" on:click={openWrappedStory} title="Play Spotify-Wrapped style animated season recap">
					<NavIcon name="sparkles" size={14} /> Wrapped Story
				</button>
				<button type="button" class="btn solid" on:click={download} disabled={busy}>
					<NavIcon name="download" size={14} /> Download PNG
				</button>
				<button type="button" class="btn ghost" on:click={copyImage} disabled={busy}>
					<NavIcon name="share" size={14} /> Copy Image
				</button>
			</div>
		</div>
	</div>

	{#if notice}<p class="notice">{notice}</p>{/if}

	<!-- ─── DAILY REPORT VIEW (DEFAULT) ─── -->
	{#if timeframe === 'daily'}
		<div class="card-preview">
			<div class="preview-meta">
				<span class="badge">DAILY REPORT</span>
				<span class="date-str"><b>{dailyReport.dayName}</b>, {dailyReport.dateLabel}</span>
			</div>

			<!-- Prominent Evident Numbers (Perfect for Telegram Bot) -->
			<div class="hero-stats">
				<div class="hero-stat hours">
					<div class="stat-top">
						<span class="stat-icon"><NavIcon name="clock" size={15} /></span>
						<span class="stat-label">HOURS FOCUSED TODAY</span>
					</div>
					<div class="stat-number">{dailyReport.hours}h</div>
					<div class="stat-sub">{formatMinutes(dailyReport.minutes)} ({dailyReport.sessions} sessions)</div>
				</div>

				<div class="hero-stat questions">
					<div class="stat-top">
						<span class="stat-icon"><NavIcon name="target" size={15} /></span>
						<span class="stat-label">QUESTIONS SOLVED TODAY</span>
					</div>
					<div class="stat-number">{dailyReport.solved}</div>
					<div class="stat-sub">Across Physics, Chem &amp; Maths</div>
				</div>
			</div>

			<!-- Daily Graph: 24h Distribution -->
			<div class="graph-card">
				<div class="graph-card-head">
					<span class="graph-card-title">24-HOUR FOCUS TIMELINE</span>
					<span class="graph-card-info">Peak: {dailyReport.peakHour} · Total: {dailyReport.hours}h</span>
				</div>
				<div class="hourly-strip">
					{#each dailyReport.hourDist as m, h}
						{@const pct = dailyReport.maxHourMinutes ? Math.max(8, (m / dailyReport.maxHourMinutes) * 100) : 0}
						<div class="hour-col" title="{h}:00 — {m}m">
							<div class="hour-bar-wrap">
								<div class="hour-bar" class:active={m > 0} style="height: {m > 0 ? pct : 4}%"></div>
							</div>
							{#if h % 3 === 0 || h === 23}
								<span class="hour-label">{h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Subject Breakdown -->
			<div class="subjects-row">
				{#each dailyReport.subjects as sub}
					<div class="subject-box" style="--sub: {sub.color}">
						<div class="sub-head">
							<span class="sub-dot" style="background: {sub.color}"></span>
							<span class="sub-name">{sub.name}</span>
						</div>
						<div class="sub-stat">
							<span>Focus:</span>
							<b>{formatMinutes(sub.minutes)}</b>
						</div>
						<div class="sub-stat">
							<span>Questions:</span>
							<b style="color: #10b981">{sub.questions} Qs</b>
						</div>
					</div>
				{/each}
			</div>
		</div>

	<!-- ─── WEEKLY REPORT VIEW (WHEN DROPDOWN SELECTS WEEKLY) ─── -->
	{:else}
		<div class="card-preview">
			<div class="preview-meta">
				<span class="badge weekly">WEEKLY REPORT</span>
				<span class="date-str"><b>{weeklyReport.label}</b> (Mon – Sun)</span>
			</div>

			<!-- Prominent Evident Numbers (Perfect for Telegram Bot) -->
			<div class="hero-stats">
				<div class="hero-stat hours">
					<div class="stat-top">
						<span class="stat-icon"><NavIcon name="clock" size={15} /></span>
						<span class="stat-label">HOURS FOCUSED THIS WEEK</span>
					</div>
					<div class="stat-number">{(weeklyReport.minutes / 60).toFixed(1)}h</div>
					<div class="stat-sub">{formatMinutes(weeklyReport.minutes)} ({weeklyReport.sessions} sessions)</div>
				</div>

				<div class="hero-stat questions">
					<div class="stat-top">
						<span class="stat-icon"><NavIcon name="target" size={15} /></span>
						<span class="stat-label">QUESTIONS SOLVED THIS WEEK</span>
					</div>
					<div class="stat-number">{weeklyReport.solved}</div>
					<div class="stat-sub">Active on {weeklyReport.activeDays} of 7 days</div>
				</div>
			</div>

			<!-- 7-Day Double Graph -->
			<div class="graph-box">
				<WeeklyDoubleGraph daily={weeklyReport.daily} />
			</div>
		</div>
	{/if}
</div>

<style>
	.report-section {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		padding: 0.2rem 0;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1.1rem;
	}

	.header-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.header-group h3 {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.header-group h3 :global(svg) {
		color: var(--accent);
	}

	.header-group p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.86rem;
		line-height: 1.5;
	}

	.controls-group {
		display: flex;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.select-box {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.select-box label {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.custom-select {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.custom-select select {
		appearance: none;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 750;
		padding: 0.62rem 2.2rem 0.62rem 0.9rem;
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.custom-select select:hover,
	.custom-select select:focus {
		border-color: var(--accent);
		background: var(--surface-panel);
	}

	.select-arrow {
		position: absolute;
		right: 0.8rem;
		pointer-events: none;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.62rem 1.15rem;
		border: 1px solid transparent;
		border-radius: 10px;
		font-size: 0.82rem;
		font-weight: 750;
		cursor: pointer;
		transition: filter 0.15s ease, color 0.15s ease;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: progress;
	}

	.btn.solid {
		color: var(--accent-contrast, #fff);
		background: var(--accent);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%);
	}

	.btn.solid:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	.btn.wrapped-btn {
		background: linear-gradient(135deg, #7c3aed, #db2777);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.25);
		box-shadow: 0 4px 14px -2px rgba(124, 58, 237, 0.4);
	}

	.btn.wrapped-btn:hover:not(:disabled) {
		filter: brightness(1.15);
		transform: translateY(-1px);
	}

	.btn.ghost {
		color: var(--text-secondary);
		border-color: var(--border-subtle);
		background: var(--surface-subtle);
	}

	.btn.ghost:hover:not(:disabled) {
		color: var(--text-primary);
	}

	.notice {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--success, #2f9e6e);
	}

	/* Card Preview Container */
	.card-preview {
		background: var(--surface-panel, #181828);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.preview-meta {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.badge {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 850;
		letter-spacing: 0.05em;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.badge.weekly {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	.date-str {
		font-size: 0.86rem;
		color: var(--text-secondary);
	}

	.date-str b {
		color: var(--text-primary);
	}

	/* Evident Hero Stats */
	.hero-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 14px;
	}

	.hero-stat {
		padding: 16px 18px;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		position: relative;
	}

	.hero-stat.hours {
		background: color-mix(in srgb, var(--accent) 10%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.hero-stat.questions {
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.28);
	}

	.stat-top {
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.hero-stat.hours .stat-icon,
	.hero-stat.hours .stat-label {
		color: var(--accent);
	}

	.hero-stat.questions .stat-icon,
	.hero-stat.questions .stat-label {
		color: #10b981;
	}

	.stat-label {
		font-size: 0.72rem;
		font-weight: 850;
		letter-spacing: 0.05em;
	}

	.stat-number {
		font-size: 2.4rem;
		font-weight: 900;
		line-height: 1.1;
		color: var(--text-primary);
		font-family: ui-monospace, monospace;
	}

	.stat-sub {
		font-size: 0.78rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	/* Daily Graph */
	.graph-card {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.graph-card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.graph-card-title {
		font-size: 0.72rem;
		font-weight: 850;
		letter-spacing: 0.05em;
		color: var(--text-primary);
	}

	.graph-card-info {
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.hourly-strip {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		gap: 4px;
		height: 90px;
		align-items: flex-end;
		padding-top: 10px;
	}

	.hour-col {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
	}

	.hour-bar-wrap {
		width: 100%;
		height: 65px;
		display: flex;
		align-items: flex-end;
	}

	.hour-bar {
		width: 100%;
		border-radius: 3px 3px 1px 1px;
		background: var(--border-subtle, rgba(255, 255, 255, 0.08));
		transition: height 0.3s ease;
	}

	.hour-bar.active {
		background: linear-gradient(180deg, var(--accent), #4e3fe0);
	}

	.hour-label {
		font-size: 0.62rem;
		color: var(--text-secondary);
		font-weight: 700;
	}

	/* Subjects Row */
	.subjects-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.subject-box {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.sub-head {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 2px;
	}

	.sub-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.sub-name {
		font-size: 0.84rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.sub-stat {
		display: flex;
		justify-content: space-between;
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.sub-stat b {
		color: var(--text-primary);
	}

	.graph-box {
		width: 100%;
	}

	@media (max-width: 768px) {
		.hero-stats {
			grid-template-columns: 1fr;
		}
		.subjects-row {
			grid-template-columns: 1fr;
		}
		.controls-group {
			width: 100%;
			flex-direction: column;
			align-items: stretch;
		}
		.select-box,
		.custom-select,
		.custom-select select {
			width: 100%;
		}
		.actions {
			width: 100%;
		}
		.btn {
			flex: 1;
			justify-content: center;
		}
	}
</style>
