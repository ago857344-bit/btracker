<svelte:head><title>Stats · BTracker</title></svelte:head>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import InfoTip from '$lib/components/ui/InfoTip.svelte';
	import { tracker, intelligence, momentum, streakDays, peakProductivity, analysisSummary } from '$lib/stores/tracker';
	import { dayKeyOf, focusMinutesOn, formatMinutes, shortDateKey, startOfWeek } from '$lib/state/dates';
	import { getLevelData, getEloRank } from '$lib/state/gamification';
	import { SUBJECTS } from '$lib/state/subjects';
	import { getWeaknessAnalysis } from '$lib/services/ai';
	import { marked } from 'marked';

	const RANK_COLORS: Record<string, string> = { ELITE: '#d99a2b', ADVANCED: '#8b7bff', INTERMEDIATE: '#2b8ba6', NOVICE: '#8b87a0' };

	let open: Record<string, boolean> = { ai: true, rank: true, momentum: false, quick: true, identity: true, deep: false, portfolio: false, academic: false, dna: false, velocity: false };
	const toggle = (key: string) => (open = { ...open, [key]: !open[key] });

	let aiLoading = false;
	let aiReportHtml = '';
	let aiError = '';

	async function handleGenerateAIReport() {
		aiLoading = true;
		aiError = '';
		try {
			const md = await getWeaknessAnalysis($tracker);
			aiReportHtml = await marked.parse(md);
		} catch (e: any) {
			aiError = e.message || 'Failed to generate report.';
		} finally {
			aiLoading = false;
		}
	}

	function weekMinutes(offset: number) {
		const start = startOfWeek();
		start.setDate(start.getDate() + offset * 7);
		let sum = 0;
		for (let i = 0; i < 7; i++) {
			const d = new Date(start); d.setDate(start.getDate() + i);
			if (d > new Date()) break;
			sum += focusMinutesOn($tracker.log, dayKeyOf(d));
		}
		return sum;
	}

	$: hourBuckets = (() => {
		const out = Array.from({ length: 24 }, () => 0);
		for (const session of $tracker.log) out[new Date(session[0] * 60000).getHours()] += session[1];
		return out;
	})();
	$: hourMax = Math.max(1, ...hourBuckets);
	$: dayBuckets = (() => {
		const out = Array.from({ length: 7 }, () => 0);
		for (const session of $tracker.log) out[new Date(session[0] * 60000).getDay()] += session[1];
		return out;
	})();
	$: dayMax = Math.max(1, ...dayBuckets);
	$: portfolio = analysisSummary($tracker, 'yearly', 0).bySubject;
	$: portfolioMax = Math.max(1, ...portfolio.map((entry) => entry.minutes));
	$: solvedTotals = (() => {
		const out: Record<string, number> = {};
		for (const day of Object.values($tracker.stat)) for (const [code, value] of Object.entries(day ?? {})) out[code] = (out[code] ?? 0) + (Number(value) || 0);
		return out;
	})();
	$: thisWeek = weekMinutes(0);
	$: lastWeek = weekMinutes(-1);
	$: velocityMax = Math.max(1, thisWeek, lastWeek);
	$: deltaPct = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek ? 100 : 0;
	$: curTable = $tracker.marks.tables.find((table) => table.id === $tracker.marks.cur) ?? $tracker.marks.tables[0];
	$: testRows = curTable?.rows.map((row) => {
		const tot = Number(row.v['tot']) || 0; const sc = Number(row.v['sc']) || 0;
		return { name: row.v['name'] || 'Untitled', pct: tot ? Math.round((sc / tot) * 100) : null };
	}).filter((row) => row.pct !== null) ?? [];
	$: avgPct = testRows.length ? Math.round(testRows.reduce((sum, row) => sum + (row.pct ?? 0), 0) / testRows.length) : null;
	$: bestTest = testRows.length ? testRows.reduce((best, row) => ((row.pct ?? 0) > (best.pct ?? 0) ? row : best)) : null;
</script>

<section class="stats">
	<header>
		<h1>Intelligence</h1>
		<p>YOUR PERSONAL COGNITIVE DASHBOARD</p>
	</header>

	<div class="accordion">
		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.ai} on:click={() => toggle('ai')}>
				<span class="dot" style="background: var(--accent)"></span> AI WEAKNESS ANALYZER
				<NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.ai}
				<div class="sec-body ai-body">
					{#if !aiReportHtml && !aiLoading}
						<div class="ai-empty">
							<span class="ai-icon"><NavIcon name="sparkles" size={36} /></span>
							<h3>Gemini Mentor</h3>
							<p>Analyze your Elo and recent mistake logs to instantly discover your critical weak points and get a strategic gameplan for the week.</p>
							{#if aiError}<p class="ai-error">{aiError}</p>{/if}
							<button type="button" class="btn solid ai-btn" on:click={handleGenerateAIReport}>
								<NavIcon name="bolt" size={14} /> Generate Insights
							</button>
						</div>
					{:else if aiLoading}
						<div class="ai-loading">
							<div class="ai-pulse"></div>
							<p>Gemini is analyzing your stats...</p>
						</div>
					{:else}
						<div class="ai-report markdown-body">
							{@html aiReportHtml}
							<button type="button" class="btn ghost ai-refresh" on:click={handleGenerateAIReport}>
								<NavIcon name="history" size={13} /> Regenerate Report
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.rank} on:click={() => toggle('rank')}>
				<span class="dot" style="background: var(--accent)"></span> PLAYER RANK & ELO
				<NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.rank}
				{@const lvl = getLevelData($tracker.gamification?.xp || 0)}
				<div class="sec-body rank-body">
					<div class="level-box">
						<span class="lv-label">CURRENT RANK</span>
						<b class="lv-title">{lvl.title}</b>
						<span class="lv-number">Level {lvl.level}</span>
						<div class="lv-prog-wrap">
							<div class="lv-prog-fill" style="width: {lvl.progress}%"></div>
						</div>
						<span class="lv-xp-text">{Math.floor($tracker.gamification?.xp || 0)} / {lvl.nextTierXp} XP</span>
					</div>
					<div class="elo-box">
						<span class="lv-label">SUBJECT ELO RATINGS</span>
						<div class="elo-grid">
							{#each SUBJECTS as sub (sub.code)}
								{@const elo = getEloRank(($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[sub.code as "P" | "C" | "M"] || 300)}
								<div class="elo-item" style="--sub: {sub.color}; --elo: {elo.color}">
									<span class="elo-sub">{sub.name}</span>
									<span class="elo-rank"><NavIcon name={elo.icon as any} size={13} /> {elo.name}</span>
									<b class="elo-score">{Math.floor(($tracker.gamification?.elo || { P: 300, C: 300, M: 300 })[sub.code as "P" | "C" | "M"] || 300)}</b>
								</div>
							{/each}
						</div>
					</div>
					<div class="gamification-manual">
						<p class="guide-label">GAMIFICATION MANUAL</p>
						<div class="manual-grid">
							<div class="manual-card">
								<span class="m-icon"><NavIcon name="trend" size={16} /></span>
								<div class="m-text">
									<b>How to earn XP</b>
									<span>XP is automatically earned during Focus Sessions. Every 1 minute of deep work = <b>10 XP</b>. The more consistent you are, the faster you'll reach <i>JEE Conqueror</i>.</span>
								</div>
							</div>
							<div class="manual-card">
								<span class="m-icon"><NavIcon name="target" size={16} /></span>
								<div class="m-text">
									<b>How Elo Works</b>
									<span>Elo dynamically tracks your subject proficiency. When you score well in mock tests or questions, your Elo increases. Base Elo starts at 300 (Bronze). Reach 1600+ to become a Grandmaster!</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.momentum} on:click={() => toggle('momentum')}>
				<span class="dot" style="background: {$momentum.color}"></span> MOMENTUM STATUS
				<NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.momentum}
				<div class="sec-body">
					<b class="word" style="color: {$momentum.color}; text-shadow: 0 0 26px {$momentum.color}66;">{$momentum.word}</b>
					<p class="sentence">{$momentum.sentence}</p>
					<p class="guide-label">STATUS GUIDE</p>
					<ul class="guide">
						{#each $momentum.guide as entry (entry.id)}
							<li class:active={entry.id === $momentum.id}>
								<b style="color: {entry.color}">{entry.word}</b>
								<span>{entry.sentence}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.quick} on:click={() => toggle('quick')}>
				<span class="dot acc"></span> QUICK STATS <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.quick}
				<div class="sec-body grid4">
					<div class="cell">
						<span class="k">THIS MONTH <InfoTip text="STUDY DAYS LOGGED THIS MONTH OUT OF TOTAL DAYS." /></span>
						<b>{$intelligence.monthDays} <small>/ {$intelligence.daysInMonth}</small></b>
					</div>
					<div class="cell">
						<span class="k">CURRENT</span>
						<b>{$streakDays}<small>Day streak</small></b>
					</div>
					<div class="cell">
						<span class="k">AVG. DAILY</span>
						<b>{formatMinutes($intelligence.avgDaily)}</b>
					</div>
					<div class="cell">
						<span class="k">BEST DAY</span>
						<b>{$intelligence.bestKey ? shortDateKey($intelligence.bestKey) : '—'}<small>{$intelligence.bestMinutes ? formatMinutes($intelligence.bestMinutes) : ''}</small></b>
						<div class="mini"><div class="fill" style="width: {Math.min(100, ($intelligence.bestMinutes / 720) * 100)}%"></div></div>
					</div>
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.identity} on:click={() => toggle('identity')}>
				<span class="dot" style="background: {RANK_COLORS[$intelligence.rank] ?? 'var(--accent)'}"></span> IDENTITY &amp; MILESTONES <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.identity}
				<div class="sec-body">
					<span class="rank" style="--r: {RANK_COLORS[$intelligence.rank] ?? 'var(--accent)'}">● {$intelligence.rank}</span>
					<div class="grid4">
						<div class="cell"><span class="k">LIFETIME FOCUS</span><b>{$intelligence.lifetimeHours}<small>Hrs</small></b></div>
						<div class="cell"><span class="k">FOCUS SESSIONS</span><b>{$intelligence.sessions}</b></div>
						<div class="cell"><span class="k">CHAPTERS HIT</span><b>{$intelligence.chaptersHit}</b></div>
						<div class="cell hl"><span class="k">MAX STREAK</span><b>{$intelligence.maxStreak}<small>Days</small></b></div>
					</div>
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.deep} on:click={() => toggle('deep')}>
				<span class="dot" style="background: #d99a2b"></span> DEEP WORK INSIGHTS <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.deep}
				<div class="sec-body">
					<div class="peakrow">
						<span class="picon"><NavIcon name="sunrise" size={16} /></span>
						<div>
							<span class="k">PEAK PRODUCTIVITY</span>
							<b>{$peakProductivity.has ? $peakProductivity.label : '—'}</b>
							{#if $peakProductivity.has}<span class="dim">{$peakProductivity.pct}% OF FOCUS</span>{/if}
						</div>
					</div>
					<div class="strip">
						{#each hourBuckets as minutes, hour}
							<div class="hcol" title="{hour}:00 — {minutes}m">
								<div class="hbar" class:on={minutes > 0} style="height: {minutes ? Math.max(6, (minutes / hourMax) * 100) : 3}%"></div>
							</div>
						{/each}
					</div>
					<div class="axis"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.portfolio} on:click={() => toggle('portfolio')}>
				<span class="dot" style="background: #2b8ba6"></span> SUBJECT PORTFOLIO <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.portfolio}
				<div class="sec-body">
					{#each portfolio as entry (entry.code)}
						<div class="prow">
							<span class="pdot" style="background: {entry.color}"></span>
							<b>{entry.name}</b>
							<div class="pbar"><div class="pfill" style="width: {(entry.minutes / portfolioMax) * 100}%; background: {entry.color}"></div></div>
							<span class="ptime">{formatMinutes(entry.minutes)}</span>
							<span class="psolved">{solvedTotals[entry.code] ?? 0} solved</span>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.academic} on:click={() => toggle('academic')}>
				<span class="dot" style="background: #2f9e6e"></span> ACADEMIC PERFORMANCE <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.academic}
				<div class="sec-body">
					{#if testRows.length}
						<div class="grid4">
							<div class="cell"><span class="k">TESTS LOGGED</span><b>{testRows.length}</b></div>
							<div class="cell"><span class="k">AVERAGE</span><b>{avgPct}%</b></div>
							<div class="cell hl"><span class="k">BEST</span><b>{bestTest?.pct}%<small>{bestTest?.name}</small></b></div>
							<div class="cell"><span class="k">SERIES</span><b class="series">{curTable?.n}</b></div>
						</div>
					{:else}
						<p class="dim">No test data yet — log a test score to see academic trends here.</p>
					{/if}
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.dna} on:click={() => toggle('dna')}>
				<span class="dot" style="background: #8b7bff"></span> BEHAVIORAL DNA <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.dna}
				<div class="sec-body">
					<div class="dna">
						{#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as label, i (i)}
							<div class="dcol">
								<div class="dbar" class:on={dayBuckets[i] > 0} style="height: {dayBuckets[i] ? Math.max(8, (dayBuckets[i] / dayMax) * 100) : 4}%" title="{formatMinutes(dayBuckets[i])}"></div>
								<span>{label}</span>
							</div>
						{/each}
					</div>
					<p class="dim">Lifetime focus minutes by weekday. Your heaviest day is where discipline lives.</p>
				</div>
			{/if}
		</section>

		<section class="sec">
			<button type="button" class="sec-head" aria-expanded={open.velocity} on:click={() => toggle('velocity')}>
				<span class="dot" style="background: #e0455a"></span> WEEKLY VELOCITY <NavIcon name="chevron-down" size={15} />
			</button>
			{#if open.velocity}
				<div class="sec-body">
					<div class="velocity">
						<div class="vrow">
							<span>LAST WEEK</span>
							<div class="vbar"><div class="vfill" style="width: {(lastWeek / velocityMax) * 100}%"></div></div>
							<b>{formatMinutes(lastWeek)}</b>
						</div>
						<div class="vrow">
							<span>THIS WEEK</span>
							<div class="vbar"><div class="vfill acc" style="width: {(thisWeek / velocityMax) * 100}%"></div></div>
							<b>{formatMinutes(thisWeek)}</b>
						</div>
					</div>
					<p class="dim" class:up={deltaPct >= 0}>{deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct)}% vs last week</p>
				</div>
			{/if}
		</section>
	</div>

</section>

<style>
	.stats { display: grid; gap: 1.2rem; }
	header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .3rem 0 0; color: var(--text-secondary); font-size: .66rem; font-weight: 800; letter-spacing: .14em; }

	.accordion { display: grid; gap: .8rem; }
	.sec { border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); overflow: hidden; }
	.sec-head { display: flex; align-items: center; gap: .6rem; width: 100%; padding: 1rem 1.2rem; border: 0; background: transparent; color: var(--text-primary); font-size: .78rem; font-weight: 800; letter-spacing: .1em; text-align: left; }
	.sec-head :global(svg) { margin-left: auto; color: var(--text-secondary); transition: transform .2s ease; }
	.sec-head[aria-expanded="true"] :global(svg) { transform: rotate(180deg); }
	.dot { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 99px; background: var(--text-secondary); }
	.dot.acc { background: var(--accent); }
	.sec-body { padding: 0 1.2rem 1.2rem; }
	
	.rank-body { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1rem; }
	@media (max-width: 600px) { .rank-body { grid-template-columns: 1fr; } }
	.level-box, .elo-box { padding: 1.2rem; border-radius: 16px; background: var(--surface-subtle); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: center; }
	.lv-label { color: var(--text-secondary); font-size: .65rem; font-weight: 800; letter-spacing: .12em; margin-bottom: .4rem; }
	.lv-title { font-size: 1.8rem; font-weight: 850; letter-spacing: -.03em; color: var(--accent); line-height: 1.1; margin-bottom: .2rem; }
	.lv-number { font-size: .85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; }
	.lv-prog-wrap { height: 8px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); margin-bottom: .4rem; }
	.lv-prog-fill { height: 100%; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, white)); border-radius: 99px; }
	.lv-xp-text { font-size: .7rem; font-weight: 700; color: var(--text-secondary); text-align: right; }
	.elo-grid { display: grid; gap: .5rem; margin-top: .4rem; }
	.elo-item { display: flex; align-items: center; justify-content: space-between; padding: .6rem .8rem; background: var(--surface-subtle); border-radius: 10px; border-left: 4px solid var(--elo); }
	.elo-sub { font-size: .8rem; font-weight: 800; color: var(--text-primary); flex: 1; }
	.elo-rank { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .5rem; border-radius: 6px; background: color-mix(in srgb, var(--elo), transparent 85%); color: var(--elo); font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; margin-right: .8rem; }
	.elo-score { font-size: 1.1rem; font-weight: 850; color: var(--elo); }

	.gamification-manual { grid-column: 1 / -1; margin-top: .4rem; }
	.manual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	@media (max-width: 600px) { .manual-grid { grid-template-columns: 1fr; } }
	.manual-card { display: flex; gap: .8rem; padding: 1.2rem; border-radius: 14px; background: var(--surface-subtle); border: 1px dashed var(--border-subtle); }
	.m-icon { flex: 0 0 32px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 8px; color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); }
	.m-text { display: flex; flex-direction: column; gap: .3rem; }
	.m-text b { font-size: .85rem; font-weight: 800; color: var(--text-primary); letter-spacing: -.02em; }
	.m-text span { font-size: .75rem; color: var(--text-secondary); line-height: 1.45; }
	.m-text span b { color: var(--text-primary); font-size: inherit; font-weight: 750; }
	.m-text span i { color: var(--accent); font-style: normal; font-weight: 700; }

	.ai-body { padding: 1.5rem; background: var(--surface-subtle); border-radius: 16px; border: 1px dashed var(--border-subtle); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; }
	.ai-empty { text-align: center; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: .5rem; }
	.ai-icon { color: var(--accent); margin-bottom: .5rem; }
	.ai-empty h3 { font-size: 1.4rem; font-weight: 850; color: var(--text-primary); margin: 0; }
	.ai-empty p { font-size: .85rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 1rem; }
	.ai-error { color: var(--danger) !important; font-weight: 700; background: color-mix(in srgb, var(--danger) 15%, transparent); padding: .4rem .8rem; border-radius: 6px; }
	.ai-btn { gap: .4rem; padding: .6rem 1.2rem; font-weight: 750; letter-spacing: .02em; }
	
	.ai-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--text-secondary); font-weight: 700; font-size: .85rem; letter-spacing: .05em; text-transform: uppercase; }
	.ai-pulse { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); animation: pulse 1.5s infinite; }
	@keyframes pulse { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.8); opacity: 0.5; } }

	.ai-report { width: 100%; text-align: left; font-size: .9rem; line-height: 1.6; color: var(--text-secondary); }
	.ai-report :global(h3) { font-size: 1.1rem; color: var(--text-primary); margin: 1.5rem 0 .5rem; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; }
	.ai-report :global(h3:first-child) { margin-top: 0; }
	.ai-report :global(strong) { color: var(--text-primary); font-weight: 750; }
	.ai-report :global(ul) { padding-left: 1.5rem; margin-bottom: 1rem; }
	.ai-report :global(li) { margin-bottom: .4rem; }
	.ai-refresh { margin-top: 1.5rem; display: inline-flex; align-items: center; gap: .4rem; font-size: .8rem; color: var(--text-secondary); }

	.word { display: block; font-size: clamp(2.2rem, 7vw, 3.4rem); font-style: italic; font-weight: 900; letter-spacing: -.04em; line-height: 1.05; }
	.sentence { margin: .5rem 0 1.2rem; color: var(--text-secondary); font-size: .88rem; }
	.guide-label { margin: 0 0 .5rem; color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .12em; }
	.guide { display: grid; gap: .45rem; margin: 0; padding: 0; list-style: none; }
	.guide li { display: grid; gap: .1rem; padding: .6rem .8rem; border: 1px solid var(--border-subtle); border-radius: 11px; }
	.guide li.active { border-color: var(--accent); background: var(--accent-soft); }
	.guide b { font-size: .74rem; font-weight: 900; letter-spacing: .08em; }
	.guide span { color: var(--text-secondary); font-size: .74rem; }

	.grid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .7rem; }
	.cell { display: grid; gap: .25rem; padding: .85rem .95rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.cell.hl { border-color: var(--accent); background: var(--accent-soft); }
	.k { display: flex; align-items: center; gap: .35rem; color: var(--text-secondary); font-size: .58rem; font-weight: 800; letter-spacing: .1em; }
	.cell b { font-size: 1.4rem; font-weight: 800; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
	.cell b small { display: inline-block; margin-left: .3rem; color: var(--text-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .02em; }
	.cell b.series { font-size: 1rem; }
	.mini { height: 5px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.mini .fill { height: 100%; border-radius: 99px; background: var(--accent); }

	.rank { display: inline-flex; align-items: center; gap: .4rem; width: fit-content; margin-bottom: .8rem; padding: .4rem .9rem; border: 1px solid var(--r); border-radius: 999px; color: var(--r); background: color-mix(in srgb, var(--r), transparent 88%); font-size: .74rem; font-weight: 900; letter-spacing: .12em; }

	.peakrow { display: flex; align-items: center; gap: .8rem; margin-bottom: .9rem; }
	.picon { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 40px; border-radius: 13px; color: #d99a2b; background: color-mix(in srgb, #d99a2b, transparent 86%); }
	.peakrow b { display: block; font-size: 1.05rem; letter-spacing: -.03em; }
	.dim { color: var(--text-secondary); font-size: .72rem; }
	.strip { display: flex; align-items: flex-end; gap: 3px; height: 90px; padding: .5rem .6rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.hcol { flex: 1; display: flex; align-items: flex-end; height: 100%; }
	.hbar { width: 100%; border-radius: 3px 3px 1px 1px; background: var(--surface-subtle); }
	.hbar.on { background: #d99a2b; }
	.axis { display: flex; justify-content: space-between; margin-top: .3rem; color: var(--text-secondary); font-size: .58rem; font-weight: 700; }

	.prow { display: flex; align-items: center; gap: .6rem; padding: .55rem 0; }
	.pdot { width: 10px; height: 10px; flex: 0 0 10px; border-radius: 99px; }
	.prow b { min-width: 84px; font-size: .82rem; }
	.pbar { flex: 1; height: 8px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.pfill { height: 100%; border-radius: 99px; }
	.ptime { color: var(--text-secondary); font-size: .74rem; font-weight: 750; font-variant-numeric: tabular-nums; }
	.psolved { min-width: 70px; text-align: right; color: var(--text-secondary); font-size: .68rem; font-weight: 700; }

	.dna { display: flex; align-items: flex-end; gap: .6rem; height: 120px; padding: .6rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); }
	.dcol { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: .3rem; height: 100%; }
	.dbar { width: 100%; max-width: 30px; border-radius: 5px 5px 2px 2px; background: var(--surface-subtle); }
	.dbar.on { background: #8b7bff; }
	.dcol span { color: var(--text-secondary); font-size: .64rem; font-weight: 800; }

	.velocity { display: grid; gap: .6rem; }
	.vrow { display: flex; align-items: center; gap: .7rem; }
	.vrow span { min-width: 78px; color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .08em; }
	.vbar { flex: 1; height: 10px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.vfill { height: 100%; border-radius: 99px; background: var(--text-secondary); }
	.vfill.acc { background: var(--accent); }
	.vrow b { font-size: .82rem; font-variant-numeric: tabular-nums; }
	.up { color: var(--success, #2f9e6e); font-weight: 750; }
</style>
