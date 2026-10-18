<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import SubjectHubModal from '$lib/components/widgets/SubjectHubModal.svelte';
	import { 
		tracker, streakDays, subjectSolvedTotals, 
		recentActivity, logManualMinutes 
	} from '$lib/stores/tracker';
	import { SUBJECTS, subjectName, subjectColor } from '$lib/state/subjects';
	import { getEloRank } from '$lib/state/gamification';
	import { lastNDays, focusMinutesOn, formatMinutes, weekdayShort } from '$lib/state/dates';

	export let deviceMode: 'auto' | 'desktop' | 'tablet' | 'mobile' = 'auto';

	let hubOpen = false;
	let hubSub = 'P';
	function openHub(code: string) {
		hubSub = code;
		hubOpen = true;
	}

	// Manual Time Log Modal State
	let logOpen = false;
	let logMinutes = 45;
	let logSubject = 'P';
	function handleSaveLog() {
		logManualMinutes(Math.max(1, Math.round(logMinutes)), logSubject || null);
		logOpen = false;
		logMinutes = 45;
	}

	// Timeline filter
	let timelineFilter: 'all' | 'focus' | 'questions' = 'all';
	$: filteredTimeline = timelineFilter === 'all'
		? $recentActivity.slice(0, 8)
		: $recentActivity.filter(e => e.kind === timelineFilter).slice(0, 8);

	// Unified Subject Hub Data
	const SUBJECT_TOTALS: Record<string, number> = { P: 680, C: 720, M: 650 };
	$: subjectRows = SUBJECTS.map(sub => {
		const solved = $subjectSolvedTotals[sub.code] || 0;
		const total = SUBJECT_TOTALS[sub.code] || 650;
		const pct = Math.min(100, Math.round((solved / total) * 100));
		const eloVal = ($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[sub.code as "P" | "C" | "M"] || 300;
		const elo = getEloRank(eloVal);
		return { ...sub, solved, total, pct, elo, eloVal };
	});
	$: totalSolved = subjectRows.reduce((sum, s) => sum + s.solved, 0);
	$: totalTarget = subjectRows.reduce((sum, s) => sum + s.total, 0);
	$: aggregatePct = Math.round((totalSolved / totalTarget) * 100) || 0;

	// 7-Day Velocity Spline Calculation
	$: days7 = lastNDays(7);
	$: dailyMinutes = days7.map(d => focusMinutesOn($tracker.log, d));
	$: maxMins = Math.max(60, ...dailyMinutes);
	$: peakIndex = dailyMinutes.indexOf(Math.max(...dailyMinutes));

	// Generates smooth SVG Cubic Bezier Spline Path across (500x160)
	function generateSpline(values: number[], max: number): { linePath: string; areaPath: string; peakCoords: { x: number; y: number } } {
		const width = 500;
		const height = 150;
		const bottom = 145;
		const top = 25;
		const range = bottom - top;

		const points = values.map((val, i) => {
			const x = (i / (values.length - 1)) * width;
			const ratio = max > 0 ? val / max : 0;
			const y = bottom - ratio * range;
			return { x, y };
		});

		if (points.length < 2) {
			return { linePath: '', areaPath: '', peakCoords: { x: 0, y: 0 } };
		}

		let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i];
			const p1 = points[i + 1];
			const cp1x = (p0.x + (p1.x - p0.x) / 2).toFixed(1);
			const cp1y = p0.y.toFixed(1);
			const cp2x = (p0.x + (p1.x - p0.x) / 2).toFixed(1);
			const cp2y = p1.y.toFixed(1);
			d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
		}

		const areaPath = `${d} L ${width},160 L 0,160 Z`;
		const peakCoords = points[peakIndex] || points[0];

		return { linePath: d, areaPath, peakCoords };
	}

	$: spline = generateSpline(dailyMinutes, maxMins);

	// 360-Day Matrix (52 weeks x 7 days = 364 days)
	$: days364 = lastNDays(364);
	$: matrixWeeks = Array.from({ length: 52 }, (_, w) => {
		return Array.from({ length: 7 }, (_, d) => {
			const dayKey = days364[w * 7 + d];
			const mins = dayKey ? focusMinutesOn($tracker.log, dayKey) : 0;
			let level = 0;
			if (mins >= 180) level = 4;
			else if (mins >= 120) level = 3;
			else if (mins >= 60) level = 2;
			else if (mins > 0) level = 1;
			return { dayKey, mins, level };
		});
	});

	$: activeDaysCount = days364.filter(d => focusMinutesOn($tracker.log, d) > 0).length;
	$: totalLogMins = $tracker.log.reduce((acc, s) => acc + (Number(s[1]) || 0), 0);
	$: dailyAvgHours = (totalLogMins / (Math.max(1, activeDaysCount) * 60)).toFixed(1);
</script>

<div class="minimalist-analytics-view" class:mode-tablet={deviceMode === 'tablet'} class:mode-mobile={deviceMode === 'mobile'}>
	<!-- VIEW HEADER -->
	<header class="analytics-head-bar">
		<div>
			<span class="eyebrow-tag">PERFORMANCE INTELLIGENCE</span>
			<h1 class="view-title">Syllabus Mastery &amp; Output</h1>
		</div>
		<div class="head-metrics font-mono">
			<span class="metric-pill rounded-full">
				TOTAL SOLVED: <b class="metric-highlight">{totalSolved.toLocaleString()} Qs</b>
			</span>
			<span class="metric-pill rounded-full">
				AGGREGATE: <b class="metric-highlight">{aggregatePct}%</b>
			</span>
		</div>
	</header>

	<!-- STRICT BENTO GRID -->
	<div class="analytics-bento-grid">
		<!-- ========================================================= -->
		<!-- UNIFIED SUBJECT HUB: SYLLABUS COVERAGE (Full Width 12-Col) -->
		<!-- ========================================================= -->
		<section class="bento-card subject-hub-card">
			<div class="card-head-row">
				<div>
					<span class="eyebrow-tag">SYLLABUS COVERAGE</span>
					<h3 class="card-title">Core Subject Distribution</h3>
				</div>
				<span class="coverage-subhead font-mono">
					Progress: <b class="text-white">{aggregatePct}% Complete</b>
				</span>
			</div>

			<!-- Three Sleek Stacked Rows -->
			<div class="subjects-stack">
				{#each subjectRows as sub (sub.code)}
					<button 
						type="button" 
						class="subject-row-item rounded-xl"
						on:click={() => openHub(sub.code)}
					>
						<!-- Left: Subject Details & Icon -->
						<div class="sub-lead">
							<div class="sub-icon-box rounded-xl" style="background: color-mix(in srgb, {sub.color} 15%, transparent); border: 1px solid color-mix(in srgb, {sub.color} 35%, transparent)">
								<NavIcon name={sub.icon as any} size={18} />
							</div>
							<div>
								<div class="sub-title-row">
									<h4 class="sub-name">{sub.name}</h4>
									<span class="elo-chip font-mono rounded-lg" style="color: {sub.elo.color}; background: color-mix(in srgb, {sub.elo.color} 12%, transparent); border: 1px solid color-mix(in srgb, {sub.elo.color} 30%, transparent)">
										{sub.elo.name} ({Math.floor(sub.eloVal)})
									</span>
								</div>
								<span class="sub-meta font-mono">Target: {sub.total} Standard JEE Problems</span>
							</div>
						</div>

						<!-- Center: Thick Fully Rounded Progress Bar -->
						<div class="sub-bar-container">
							<div class="bar-labels font-mono">
								<span class="bar-tag">Coverage</span>
								<b class="bar-pct">{sub.pct}%</b>
							</div>
							<div class="progress-track rounded-full">
								<div 
									class="progress-fill rounded-full"
									style="width: {sub.pct}%; background: {sub.color}; box-shadow: 0 0 14px color-mix(in srgb, {sub.color} 50%, transparent)"
								></div>
							</div>
						</div>

						<!-- Right: Numerics & Hub Trigger -->
						<div class="sub-numerics font-mono">
							<div class="solved-count">
								<b class="num">{sub.solved}</b>
								<span class="den">/ {sub.total} Qs</span>
							</div>
							<span class="open-link font-mono">
								Hub <NavIcon name="arrow-right" size={11} />
							</span>
						</div>
					</button>
				{/each}
			</div>
		</section>

		<!-- ========================================================= -->
		<!-- MIDDLE ROW: 7-DAY VELOCITY SPLINE (7 Cols on Desktop)     -->
		<!-- ========================================================= -->
		<section class="bento-card velocity-chart-card">
			<div class="card-head-row">
				<div>
					<span class="eyebrow-tag">WEEKLY VELOCITY</span>
					<h3 class="card-title">Effort Trend (Last 7 Days)</h3>
				</div>
				<div class="chart-badge font-mono rounded-lg">
					Peak: {formatMinutes(maxMins)}
				</div>
			</div>

			<!-- Smooth Curvature Spline Area Chart (No clunky gridlines) -->
			<div class="spline-chart-wrap">
				<svg class="spline-svg" viewBox="0 0 500 160" preserveAspectRatio="none">
					<defs>
						<linearGradient id="splineGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.38" />
							<stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
						</linearGradient>
					</defs>

					<!-- Area fill below curve -->
					{#if spline.areaPath}
						<path d={spline.areaPath} fill="url(#splineGradient)" />
						<!-- Smooth Spline Stroke Line -->
						<path 
							d={spline.linePath} 
							fill="transparent" 
							stroke="var(--accent)" 
							stroke-width="3.5" 
							stroke-linecap="round" 
						/>
						<!-- Glowing High-Point Marker Node -->
						<circle cx={spline.peakCoords.x} cy={spline.peakCoords.y} r="5" fill="#ffffff" />
						<circle cx={spline.peakCoords.x} cy={spline.peakCoords.y} r="11" fill="var(--accent)" opacity="0.4" class="pulse-marker" />
					{/if}
				</svg>
			</div>

			<!-- Minimal Monospace Day Labels -->
			<div class="chart-days-row font-mono">
				{#each days7 as d, idx}
					<span class="day-label" class:peak={idx === peakIndex}>
						{weekdayShort(d)} {idx === peakIndex ? '★' : ''}
					</span>
				{/each}
			</div>
		</section>

		<!-- ========================================================= -->
		<!-- MIDDLE ROW: VERTICAL TIMELINE AUDIT (5 Cols on Desktop)   -->
		<!-- ========================================================= -->
		<section class="bento-card activity-timeline-card">
			<div class="card-head-row">
				<div>
					<span class="eyebrow-tag">AUDIT TRAIL</span>
					<h3 class="card-title">Activity Stream</h3>
				</div>
				<div class="timeline-tools">
					<!-- Filter Pills -->
					<div class="filter-pills rounded-lg">
						<button 
							type="button" 
							class="pill-btn" 
							class:active={timelineFilter === 'all'} 
							on:click={() => timelineFilter = 'all'}
						>
							All
						</button>
						<button 
							type="button" 
							class="pill-btn" 
							class:active={timelineFilter === 'focus'} 
							on:click={() => timelineFilter = 'focus'}
						>
							Focus
						</button>
						<button 
							type="button" 
							class="pill-btn" 
							class:active={timelineFilter === 'questions'} 
							on:click={() => timelineFilter = 'questions'}
						>
							Practice
						</button>
					</div>
					<button 
						type="button" 
						class="btn-log-trigger rounded-lg"
						on:click={() => logOpen = true}
						title="Log time manually"
					>
						<NavIcon name="plus" size={13} />
					</button>
				</div>
			</div>

			<!-- Vertical Timeline Structure with Left Connecting Line -->
			<div class="timeline-container">
				{#if filteredTimeline.length > 0}
					<div class="timeline-rail">
						{#each filteredTimeline as evt (evt.id)}
							<div class="timeline-node-item">
								<!-- Glowing Node Marker -->
								<span 
									class="node-marker rounded-full" 
									style="background: {evt.color}; box-shadow: 0 0 10px color-mix(in srgb, {evt.color} 60%, transparent)"
								></span>

								<!-- Node Body -->
								<div class="node-content rounded-xl">
									<div class="node-top-row">
										<h5 class="node-title">{evt.title}</h5>
										<span class="node-metric font-mono rounded-lg">
											{evt.right}
										</span>
									</div>
									<div class="node-meta-row font-mono">
										<span>{evt.meta}</span>
										{#if evt.badge}
											<span class="badge-chip rounded-md">{evt.badge}</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="timeline-empty">
						<NavIcon name="history" size={20} />
						<p>No logged sessions in this category yet.</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- ========================================================= -->
		<!-- 360-DAY CONSISTENCY MATRIX: Bottom Anchor (Full Width)    -->
		<!-- ========================================================= -->
		<section class="bento-card heatmap-anchor-card">
			<div class="card-head-row">
				<div>
					<span class="eyebrow-tag">ANNUAL CADENCE</span>
					<h3 class="card-title">360-Day Problem-Solving Matrix</h3>
				</div>
				
				<!-- Matrix Legend -->
				<div class="matrix-legend font-mono">
					<span>Less</span>
					<div class="legend-swatches">
						<span class="swatch lvl-0 rounded-sm"></span>
						<span class="swatch lvl-1 rounded-sm"></span>
						<span class="swatch lvl-2 rounded-sm"></span>
						<span class="swatch lvl-3 rounded-sm"></span>
						<span class="swatch lvl-4 rounded-sm"></span>
					</div>
					<span>More</span>
				</div>
			</div>

			<!-- Full-Width Edge-to-Edge Grid -->
			<div class="matrix-scroll-wrapper">
				<div class="matrix-grid">
					{#each matrixWeeks as week, wIdx}
						<div class="matrix-column">
							{#each week as day}
								<div 
									class="matrix-cell rounded-sm lvl-{day.level}"
									title="{day.dayKey}: {day.mins} minutes studied"
								></div>
							{/each}
						</div>
					{/each}
				</div>
			</div>

			<!-- Heatmap Bottom Telemetry Bar -->
			<footer class="matrix-telemetry-bar font-mono">
				<div class="telemetry-item">
					<span class="k">TOTAL ACTIVE DAYS:</span>
					<b class="v text-white">{activeDaysCount} / 360</b>
				</div>
				<div class="telemetry-item">
					<span class="k">CURRENT STREAK:</span>
					<b class="v text-amber">{$streakDays} DAYS 🔥</b>
				</div>
				<div class="telemetry-item">
					<span class="k">AVG DAILY PACE:</span>
					<b class="v text-emerald">{dailyAvgHours} HRS / DAY</b>
				</div>
			</footer>
		</section>
	</div>
</div>

<!-- Modals -->
<SubjectHubModal bind:open={hubOpen} sub={hubSub} />

<Modal bind:open={logOpen} title="Quick Log Study Session" width="420px">
	<div class="log-form-body">
		<label class="form-label font-mono">
			<span>MINUTES STUDIED</span>
			<input type="number" min="1" max="960" bind:value={logMinutes} class="form-input rounded-xl" />
		</label>
		<label class="form-label font-mono">
			<span>SUBJECT</span>
			<select bind:value={logSubject} class="form-input rounded-xl">
				{#each SUBJECTS as s}
					<option value={s.code}>{s.name}</option>
				{/each}
			</select>
		</label>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn-subtle rounded-lg" on:click={() => logOpen = false}>Cancel</button>
		<button type="button" class="btn-solid rounded-lg font-mono" on:click={handleSaveLog}>Save Session</button>
	</svelte:fragment>
</Modal>

<style>
	/* ========================================================================= */
	/* GLOBAL BENTO ARCHITECTURE & TOKENS                                        */
	/* ========================================================================= */
	.minimalist-analytics-view {
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem; /* uniform gap-6 */
		color: var(--text-primary, #f5f5f7);
		font-family: inherit;
	}

	.font-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
	}

	.analytics-head-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle, rgba(255, 255, 255, 0.1)) 40%, transparent);
	}
	.view-title {
		margin: 0.2rem 0 0;
		font-size: 1.5rem;
		font-weight: 850;
		letter-spacing: -0.035em;
		color: #ffffff;
	}
	.head-metrics {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.metric-pill {
		font-size: 0.68rem;
		padding: 0.25rem 0.65rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		color: var(--text-secondary, #a3a3a3);
	}
	.metric-highlight {
		color: #ffffff;
	}

	.eyebrow-tag {
		font-size: 0.66rem;
		font-weight: 750;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-secondary, #a3a3a3);
	}

	/* 12-Column Grid Layout */
	.analytics-bento-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 1.5rem; /* uniform gap-6 */
		align-items: stretch;
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
	.rounded-sm { border-radius: 2px; }
	.rounded-full { border-radius: 9999px; }

	.card-head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.card-title {
		margin: 0.15rem 0 0;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: #ffffff;
	}

	/* UNIFIED SUBJECT HUB (Full Width: 12 Cols) */
	.subject-hub-card {
		grid-column: span 12;
	}
	.coverage-subhead {
		font-size: 0.76rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.subjects-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.subject-row-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1rem 1.25rem;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: inherit;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s var(--ease-ios-spring, cubic-bezier(0.16, 1, 0.3, 1));
	}
	.subject-row-item:hover {
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
		border-color: var(--accent);
		transform: translateY(-1px);
	}

	.sub-lead {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 220px;
	}
	.sub-icon-box {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.sub-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.sub-name {
		margin: 0;
		font-size: 0.96rem;
		font-weight: 800;
		color: #ffffff;
	}
	.elo-chip {
		font-size: 0.6rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.12rem 0.45rem;
	}
	.sub-meta {
		display: block;
		font-size: 0.68rem;
		color: var(--text-secondary, #a3a3a3);
		margin-top: 0.15rem;
	}

	.sub-bar-container {
		flex: 1;
		max-width: 580px;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.bar-labels {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.68rem;
	}
	.bar-tag { color: var(--text-secondary, #a3a3a3); }
	.bar-pct { color: #ffffff; }
	.progress-track {
		width: 100%;
		height: 10px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 1px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.sub-numerics {
		min-width: 140px;
		text-align: right;
	}
	.solved-count .num {
		font-size: 0.95rem;
		font-weight: 850;
		color: #ffffff;
	}
	.solved-count .den {
		font-size: 0.72rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.open-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.66rem;
		color: var(--accent, #818cf8);
		margin-top: 0.15rem;
	}

	/* VELOCITY SPLINE CHART (7 Cols) */
	.velocity-chart-card {
		grid-column: span 7;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
	.chart-badge {
		font-size: 0.68rem;
		font-weight: 750;
		padding: 0.2rem 0.55rem;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.25);
		color: #10b981;
	}
	.spline-chart-wrap {
		position: relative;
		width: 100%;
		height: 160px;
		margin: 0.75rem 0;
	}
	.spline-svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.pulse-marker {
		animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	.chart-days-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.65rem;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		font-size: 0.68rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.day-label.peak {
		color: var(--accent, #818cf8);
		font-weight: 800;
	}

	/* TIMELINE ACTIVITY STREAM (5 Cols) */
	.activity-timeline-card {
		grid-column: span 5;
	}
	.timeline-tools {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.filter-pills {
		display: inline-flex;
		padding: 2px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}
	.pill-btn {
		padding: 0.2rem 0.5rem;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.65rem;
		font-weight: 750;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.16s ease;
	}
	.pill-btn.active {
		background: var(--accent);
		color: #ffffff;
	}
	.btn-log-trigger {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		color: var(--text-secondary, #a3a3a3);
		cursor: pointer;
	}
	.btn-log-trigger:hover {
		color: #ffffff;
		border-color: rgba(255, 255, 255, 0.25);
	}

	.timeline-container {
		position: relative;
		max-height: 230px;
		overflow-y: auto;
		padding-right: 4px;
		scrollbar-width: thin;
	}
	.timeline-rail {
		position: relative;
		padding-left: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.timeline-rail::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 6px;
		bottom: 6px;
		width: 1px;
		background: rgba(255, 255, 255, 0.12);
	}
	.timeline-node-item {
		position: relative;
	}
	.node-marker {
		position: absolute;
		left: -1.5rem;
		top: 6px;
		width: 9px;
		height: 9px;
		outline: 3px solid #0d0c16;
	}
	.node-content {
		padding: 0.65rem 0.85rem;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		transition: border-color 0.16s ease;
	}
	.node-content:hover {
		border-color: var(--accent);
	}
	.node-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.node-title {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 750;
		color: #ffffff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.node-metric {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.1rem 0.4rem;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-primary, #ffffff);
	}
	.node-meta-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.66rem;
		color: var(--text-secondary, #a3a3a3);
		margin-top: 0.15rem;
	}
	.badge-chip {
		font-size: 0.54rem;
		font-weight: 800;
		padding: 0.05rem 0.35rem;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
	}
	.timeline-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1rem;
		color: var(--text-secondary, #a3a3a3);
		font-size: 0.78rem;
	}

	/* 360-DAY MATRIX (12 Cols Anchor) */
	.heatmap-anchor-card {
		grid-column: span 12;
	}
	.matrix-legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.64rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.legend-swatches {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.swatch {
		width: 10px;
		height: 10px;
	}
	.lvl-0 { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.04); }
	.lvl-1 { background: color-mix(in srgb, var(--accent) 30%, transparent); }
	.lvl-2 { background: color-mix(in srgb, var(--accent) 60%, transparent); }
	.lvl-3 { background: var(--accent); }
	.lvl-4 { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }

	.matrix-scroll-wrapper {
		width: 100%;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		scrollbar-width: thin;
	}
	.matrix-grid {
		display: flex;
		gap: 3px;
		min-width: 780px;
		width: 100%;
	}
	.matrix-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.matrix-cell {
		width: 100%;
		aspect-ratio: 1;
		cursor: pointer;
		transition: transform 0.12s ease;
	}
	.matrix-cell:hover {
		transform: scale(1.3);
		outline: 1.5px solid #ffffff;
		z-index: 5;
	}

	.matrix-telemetry-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		font-size: 0.72rem;
		flex-wrap: wrap;
	}
	.telemetry-item .k {
		color: var(--text-secondary, #a3a3a3);
		margin-right: 0.35rem;
	}
	.telemetry-item .v { font-weight: 800; }
	.text-amber { color: #f59e0b; }
	.text-emerald { color: #10b981; }

	/* Form Modal */
	.log-form-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.form-label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.68rem;
		color: var(--text-secondary, #a3a3a3);
	}
	.form-input {
		height: 42px;
		padding: 0 0.85rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
		color: #ffffff;
		font-family: inherit;
		font-size: 0.85rem;
	}
	.btn-subtle {
		padding: 0.45rem 1rem;
		background: transparent;
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
		color: var(--text-secondary, #a3a3a3);
		font-size: 0.76rem;
		cursor: pointer;
	}
	.btn-solid {
		padding: 0.45rem 1.25rem;
		background: var(--accent);
		color: #ffffff;
		border: none;
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
	}

	/* Mode mobile class overrides (when simulated via preview) */
	.mode-mobile .analytics-bento-grid {
		grid-template-columns: 1fr !important;
		gap: 1rem !important;
	}
	.mode-mobile .bento-card {
		grid-column: span 1 !important;
		padding: 1.15rem 0.95rem;
	}
	.mode-mobile .subject-row-item {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.85rem;
		padding: 0.95rem 0.85rem;
		width: 100%;
		box-sizing: border-box;
	}
	.mode-mobile .sub-lead {
		min-width: 0 !important;
		width: 100%;
	}
	.mode-mobile .sub-title-row {
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.mode-mobile .sub-bar-container {
		width: 100%;
		max-width: none;
	}
	.mode-mobile .sub-numerics {
		min-width: 0 !important;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		text-align: left;
	}
	.mode-mobile .analytics-head-bar {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
	}
	.mode-mobile .head-metrics {
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.mode-mobile .card-head-row {
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.mode-mobile .timeline-tools {
		width: 100%;
		justify-content: space-between;
	}
	.mode-mobile .matrix-telemetry-bar {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
	}
	.mode-mobile .spline-chart-wrap {
		height: 130px;
	}
	.mode-mobile .chart-days-row {
		font-size: 0.62rem;
	}

	/* Viewport based Responsive */
	@media (max-width: 1024px) {
		.velocity-chart-card {
			grid-column: span 12;
		}
		.activity-timeline-card {
			grid-column: span 12;
		}
		.subject-row-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		.sub-bar-container {
			width: 100%;
			max-width: none;
		}
		.sub-numerics {
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: space-between;
			text-align: left;
		}
	}

	@media (max-width: 768px) {
		.minimalist-analytics-view {
			gap: 1.15rem;
		}
		.analytics-bento-grid {
			grid-template-columns: 1fr !important;
			gap: 1rem !important;
		}
		.bento-card {
			grid-column: span 1 !important;
			padding: 1.15rem 0.95rem;
		}
		.subject-row-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.85rem;
			padding: 0.95rem 0.85rem;
			width: 100%;
			box-sizing: border-box;
		}
		.sub-lead {
			min-width: 0 !important;
			width: 100%;
		}
		.sub-title-row {
			flex-wrap: wrap;
			gap: 0.35rem;
		}
		.sub-bar-container {
			width: 100%;
			max-width: none;
		}
		.sub-numerics {
			min-width: 0 !important;
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: space-between;
			text-align: left;
		}
		.analytics-head-bar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.6rem;
		}
		.head-metrics {
			flex-wrap: wrap;
			gap: 0.4rem;
		}
		.card-head-row {
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.timeline-tools {
			width: 100%;
			justify-content: space-between;
		}
		.matrix-telemetry-bar {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
		.spline-chart-wrap {
			height: 130px;
		}
		.chart-days-row {
			font-size: 0.62rem;
		}
	}
</style>
