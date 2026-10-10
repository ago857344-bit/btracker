<svelte:head><title>Revise · BTracker</title></svelte:head>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import AddChapterModal from '$lib/components/revise/AddChapterModal.svelte';
	import ReviseModal from '$lib/components/revise/ReviseModal.svelte';
	import ReviseManualModal from '$lib/components/revise/ReviseManualModal.svelte';
	import AICrashCourseModal from '$lib/components/revise/AICrashCourseModal.svelte';
	import Heatmap from '$lib/components/recall/Heatmap.svelte';
	import ChapterCard from '$lib/components/recall/ChapterCard.svelte';
	import { tracker, revisedToday, completeRevision, deleteRevision, celebration } from '$lib/stores/tracker';
	import { addDaysKey, dayKeyOf, shortDateKey, todayKey } from '$lib/state/dates';
	import { SUBJECTS, SPACING_METHODS, subjectColor, subjectName } from '$lib/state/subjects';
	import { chaptersByPriority, chaptersDueToday, criticalChapters, heatmapData } from '$lib/stores/recall-selectors';
	import { removeChapterFromRecall } from '$lib/stores/recall-actions';
	import { createRevision } from '$lib/state/defaults';
	import { calculateCurrentScore, calculatePriorityScore } from '$lib/state/decay';
	import type { ChapterRecallData } from '$lib/types/tracker';

	type RevTab = 'due' | 'critical' | 'all';
	const RATINGS: [number, string][] = [[1, 'Again'], [3, 'Hard'], [4, 'Good'], [5, 'Easy']];
	import FlashcardsPanel from '$lib/components/revise/FlashcardsPanel.svelte';
	let viewMode: 'topic' | 'flashcards' = 'topic';
	let tab: RevTab = "due";
	let query = '';
	let subFilter = '';
	let methodFilter = '';
	let addOpen = false;
	let manualOpen = false;
	let reviseOpen = false;
	let activeChapterKey = '';
	let crashCourseKey = '';
	let ratingFor: string | null = null;

	$: today = todayKey();
	$: horizon = addDaysKey(today, 7);
	$: entries = Object.entries($tracker.rev.items).map(([key, item]) => ({
		key,
		sub: item.sub ?? key.split(':')[0],
		ch: item.ch ?? key.split(':').slice(1).join(':'),
		method: item.method ?? 'steady',
		step: item.step ?? 1,
		last: item.last ?? null,
		remindDate: item.remindDate ?? '',
		remindDone: Boolean(item.remindDone)
	}));
	$: isDue = (e: { remindDate: string; remindDone: boolean }) => Boolean(e.remindDate) && e.remindDate <= today && !e.remindDone;
	$: isNext7 = (e: { remindDate: string; remindDone: boolean }) => Boolean(e.remindDate) && e.remindDate <= horizon && !e.remindDone;
	$: dueCount = entries.filter(isDue).length;
	$: next7Count = entries.filter(isNext7).length;
	$: methodMeta = (id: string) => SPACING_METHODS.find((m) => m.id === id);
	$: filtered = entries
		.filter((e) => (tab === 'due' ? isDue(e) : true))
		.filter((e) => !subFilter || e.sub === subFilter)
		.filter((e) => !methodFilter || e.method === methodFilter)
		.filter((e) => !query.trim() || e.ch.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((a, b) => (a.remindDate || '9999').localeCompare(b.remindDate || '9999'));

	// Active Recall Hub data
	$: recallChapters = Object.values($tracker.rev.chapters);
	$: dueChapters = $chaptersDueToday;
	$: criticalChaptersList = $criticalChapters;
	$: heatmap = $heatmapData;

	$: displayedRecallChapters = recallChapters
		.filter((chapter) => {
			const [subCode, ...restParts] = chapter.chapterKey.split(/[-:]/);
			const chTitle = restParts.join(' ').trim() || chapter.chapterKey;
			if (subFilter && subCode !== subFilter) return false;
			if (query.trim() && !chTitle.toLowerCase().includes(query.trim().toLowerCase())) return false;
			if (tab === 'due') return dueChapters.some((c) => c.chapterKey === chapter.chapterKey);
			if (tab === 'critical') return criticalChaptersList.some((c) => c.chapterKey === chapter.chapterKey);
			return true;
		})
		.sort((a, b) => {
			const prioA = calculatePriorityScore(a.weightage, calculateCurrentScore(a.decay));
			const prioB = calculatePriorityScore(b.weightage, calculateCurrentScore(b.decay));
			return prioB - prioA;
		});

	function dueLabel(e: { remindDate: string }) {
		if (!e.remindDate) return 'No schedule';
		if (e.remindDate < today) return 'Overdue';
		if (e.remindDate === today) return 'Due today';
		return `Due ${shortDateKey(e.remindDate)}`;
	}

	function formatLastRevised(last: number | null): string {
		if (!last) return 'Never revised';
		return `Last ${shortDateKey(dayKeyOf(new Date(last)))}`;
	}

	function markDone(key: string, method: string) {
		if (method === 'smart') { ratingFor = key; return; }
		completeRevision(key);
		celebration.set('Revision complete!');
	}

	function rate(key: string, rating: number) {
		completeRevision(key, rating);
		ratingFor = null;
		celebration.set('Revision complete!');
	}

	function remove(key: string) {
		deleteRevision(key);
	}

	let activeChapter: ChapterRecallData | null = null;

	function handleRevise(chapterKey: string) {
		console.log('Revise clicked for', chapterKey);
		activeChapterKey = chapterKey;
		activeChapter = $tracker.rev.chapters[chapterKey] ?? recallChapters.find((c) => c.chapterKey === chapterKey) ?? null;
		reviseOpen = true;
		console.log('reviseOpen set to', reviseOpen);
	}

	function handleDeleteChapter(chapterKey: string) {
		if (confirm('Remove this chapter from recall tracking?')) {
			removeChapterFromRecall(chapterKey);
		}
	}

</script>

<section class="revise">
	<header>
		<div>
			<h1>ACTIVE RECALL HUB</h1>
			<p>Spaced repetition planner.</p>
		</div>
		<div class="actions" style="display: flex; gap: 0.8rem; align-items: center;"><button type="button" class="btn-icon" on:click={() => (manualOpen = true)} title="How this works" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;"><NavIcon name="info" size={16} /></button><button type="button" class="add" on:click={() => (addOpen = true)}><NavIcon name="plus" size={15} /> Add Chapter</button></div>
	</header>

	<div class="view-toggle">
		<button class:active={viewMode === 'topic'} on:click={() => viewMode = 'topic'}>Topic Decay</button>
		<button class:active={viewMode === 'flashcards'} on:click={() => viewMode = 'flashcards'}>Flashcards</button>
	</div>

	{#if viewMode === 'topic'}

	<!-- Consistency Heatmap -->
	<div class="heatmap-section">
		<div class="heatmap-header">
			<span class="heatmap-title">Consistency Heatmap</span>
			<span class="heatmap-subtitle">Last 90 days</span>
		</div>
		<Heatmap data={heatmap} days={90} cellSize={11} />
	</div>

	<div class="kpis">
		<div class="kpi"><b>{Object.keys(recallChapters).length}</b><span>CHAPTERS TRACKED</span></div>
		<div class="kpi due"><b>{dueChapters.length}</b><span>DUE TODAY</span></div>
		<div class="kpi"><b>{$revisedToday}</b><span>REVISED TODAY</span></div>
	</div>

	<div class="tabs" role="tablist">
		<button type="button" role="tab" class:active={tab === 'due'} on:click={() => (tab = 'due')}>Due ({dueChapters.length})</button>
		<button type="button" role="tab" class:active={tab === 'critical'} on:click={() => (tab = 'critical')}>Critical ({criticalChaptersList.length})</button>
		<button type="button" role="tab" class:active={tab === 'all'} on:click={() => (tab = 'all')}>All ({Object.keys(recallChapters).length})</button>
	</div>

	<div class="filters">
		<span class="search"><NavIcon name="search" size={14} /><input type="search" placeholder="Search chapters..." bind:value={query} /></span>
		<select class="subsel" bind:value={subFilter} aria-label="Subject filter">
			<option value="">All Subjects</option>
			{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
		</select>
		<div class="mchips">
			{#each SPACING_METHODS as m}
				<button type="button" class="mchip" class:on={methodFilter === m.id} style="--m: {m.color}" on:click={() => (methodFilter = methodFilter === m.id ? '' : m.id)}>{m.emoji} {m.name}</button>
			{/each}
		</div>
	</div>

	<!-- Active Recall Hub Chapter Cards -->
	{#if displayedRecallChapters.length > 0}
		<div class="cards">
			{#each displayedRecallChapters as chapter (chapter.chapterKey)}
				<ChapterCard
					{chapter}
					on:revise={(e: any) => handleRevise(e.detail)}
					on:delete={(e: any) => handleDeleteChapter(e.detail)}
					on:crashcourse={(e: any) => { crashCourseKey = e.detail; }}
				/>
			{/each}
		</div>
	{:else}
		<div class="empty">
			{#if tab === 'due'}
				<b>No chapters due today 🎉</b>
				<span>All your scheduled revisions are currently above fading threshold.</span>
			{:else if tab === 'critical'}
				<b>No critical chapters 🎉</b>
				<span>Your memory retention is healthy across all tracked topics!</span>
			{:else if recallChapters.length === 0}
				<b>No chapters in Active Recall Hub yet</b>
				<span>Add a chapter to start tracking memory decay, or load sample JEE topics.</span>
			{:else}
				<b>No matching chapters</b>
				<span>Try clearing the subject filter or search query.</span>
			{/if}

			<div class="empty-actions">
				{#if subFilter || query.trim()}
					<button type="button" class="sample-btn" on:click={() => { subFilter = ''; query = ''; }}>
						<span>Clear Filters</span>
					</button>
				{/if}
				<button type="button" class="sample-btn primary" on:click={() => (addOpen = true)}>
					<NavIcon name="plus" size={14} />
					<span>Add Chapter</span>
				</button>
			</div>
		</div>
	{/if}
	{:else}
		<FlashcardsPanel />
	{/if}
</section>

<ReviseModal open={reviseOpen} chapter={activeChapter} chapterKey={activeChapterKey} on:close={() => (reviseOpen = false)} />
<AddChapterModal open={addOpen} on:close={() => (addOpen = false)} />
	<ReviseManualModal open={manualOpen} on:close={() => (manualOpen = false)} />

	<AICrashCourseModal 
		chapterKey={crashCourseKey || null}
		on:close={() => (crashCourseKey = '')}
	/>

<style>
	.revise { display: grid; gap: 1.2rem; }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .3rem 0 0; color: var(--text-secondary); font-size: .82rem; }
	.add { display: inline-flex; align-items: center; gap: .45rem; padding: .65rem 1.15rem; border: 0; border-radius: 12px; color: #fff; background: var(--accent); font-size: .84rem; font-weight: 750; box-shadow: 0 8px 18px color-mix(in srgb, var(--accent), transparent 66%); }

	.heatmap-section {
		padding: 1rem 1.1rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-card);
		background: var(--surface-panel);
		box-shadow: var(--shadow-card);
	}

	.heatmap-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.8rem;
	}

	.heatmap-title {
		font-size: 0.85rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.heatmap-subtitle {
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; }
	.kpi { display: grid; gap: .2rem; padding: 1rem 1.1rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.kpi b { font-size: 1.7rem; font-weight: 800; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
	.kpi.due b { color: var(--danger, #e0455a); }
	.kpi span { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .1em; }

	.tabs { display: inline-flex; gap: .25rem; padding: .3rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); width: fit-content; }
	.tabs button { padding: .5rem 1.05rem; border: 0; border-radius: 999px; background: transparent; color: var(--text-secondary); font-size: .78rem; font-weight: 750; }
	.tabs button.active { color: #fff; background: var(--accent); }

	.filters { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
	.search { display: inline-flex; align-items: center; gap: .5rem; flex: 1; min-width: 190px; padding: .55rem .8rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-secondary); }
	.search input { flex: 1; border: 0; background: transparent; color: var(--text-primary); font-size: .82rem; outline: none; }
	.subsel { padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-primary); font-size: .8rem; }
	.mchips { display: flex; gap: .4rem; flex-wrap: wrap; }
	.mchip { padding: .45rem .8rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); color: var(--text-secondary); font-size: .72rem; font-weight: 700; }
	.mchip.on { color: #fff; border-color: var(--m); background: var(--m); }

	.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: .9rem; }

	.empty { display: grid; gap: .6rem; justify-items: center; padding: 2.4rem 1rem; border: 1px dashed var(--border-subtle); border-radius: var(--radius-card); text-align: center; }
	.empty b { font-size: 1rem; }
	.empty > span { color: var(--text-secondary); font-size: .8rem; }
	.empty-actions { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center; }
	.sample-btn {
		display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem;
		border-radius: 9px; border: 1px solid var(--border-subtle); background: var(--surface-panel);
		color: var(--text-primary); font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease;
	}
	.sample-btn:hover { border-color: var(--accent); color: var(--accent); }
	.sample-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
	@media (max-width: 760px) { .kpis { grid-template-columns: 1fr; } }

	.view-toggle { display: flex; gap: 0.5rem; margin-bottom: 2rem; background: var(--surface-subtle); padding: 0.4rem; border-radius: 12px; width: fit-content; border: 1px solid var(--border-subtle); }
	.view-toggle button { padding: 0.6rem 1.2rem; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
	.view-toggle button:hover { color: var(--text-primary); }
	.view-toggle button.active { background: var(--surface-panel); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
</style>
