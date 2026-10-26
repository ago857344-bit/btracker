<script lang="ts">
	import { onDestroy } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import UniversalLogEntryModal from '$lib/components/log/UniversalLogEntryModal.svelte';
	import { SUBJECTS, subjectColor, subjectName } from '$lib/state/subjects';
	import { coachingNameOf, universalSourceLabel } from '$lib/state/coaching';
	import {
		universalBySubject, universalChapters, universalEntries, universalTotals,
		type UniversalSubjectTotals
	} from '$lib/state/universal';
	import { deleteUniversalSession, tracker, celebration } from '$lib/stores/tracker';
	import { todayKey } from '$lib/state/dates';
	import { uiClick } from '$lib/utils/feedback';

	type SubjectFilter = 'all' | 'P' | 'C' | 'M';

	let filter: SubjectFilter = 'all';
	let entryOpen = false;
	let entrySubject = 'P';
	let confirmId: string | null = null;
	let confirmTimer: ReturnType<typeof setTimeout> | undefined;

	$: entries = universalEntries($tracker).slice().sort((a, b) => b.at - a.at);
	$: totals = universalTotals(entries);
	$: today = todayKey();
	$: todayTotals = universalTotals(entries.filter((entry) => entry.day === today));
	$: subjects = universalBySubject(entries);
	$: subjectMap = Object.fromEntries(subjects.map((row) => [row.code, row])) as Record<string, UniversalSubjectTotals>;
	$: chapters = universalChapters(entries);
	$: topChapters = chapters.slice(0, 8);
	$: maxChapterSolved = Math.max(1, ...topChapters.map((chapter) => chapter.solved));
	$: recent = (filter === 'all' ? entries : entries.filter((entry) => entry.sub === filter)).slice(0, 20);
	$: coaching = coachingNameOf($tracker);

	function openEntry(subject: string) {
		entrySubject = subject;
		entryOpen = true;
		uiClick();
	}

	function requestDelete(id: string) {
		if (confirmId === id) {
			clearTimeout(confirmTimer);
			confirmId = null;
			deleteUniversalSession(id);
			celebration.set('Session removed · daily solved counts adjusted');
			uiClick();
			return;
		}
		confirmId = id;
		clearTimeout(confirmTimer);
		confirmTimer = setTimeout(() => {
			if (confirmId === id) confirmId = null;
		}, 3500);
	}

	const formatDay = (at: number) =>
		new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const formatTime = (at: number) =>
		new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

	onDestroy(() => clearTimeout(confirmTimer));
</script>

<section class="universal">
	<header class="head">
		<div>
			<p class="eyebrow">Study log · {coaching}</p>
			<h1>Every question counts.</h1>
			<p class="sub">Log modules, DPPs, PYQs, books and tests by chapter. No module codes, no missing exercises.</p>
		</div>
		<button type="button" class="log-btn" on:click={() => openEntry('P')}>
			<NavIcon name="plus" size={16} />
			<span>Log session</span>
		</button>
	</header>

	<div class="summary-grid">
		<div class="summary-card accent">
			<span class="summary-icon"><NavIcon name="check-circle" size={16} /></span>
			<div>
				<b>{totals.solved.toLocaleString()}</b>
				<span>Solved all time</span>
				<small>{totals.sessions} session{totals.sessions === 1 ? '' : 's'} logged</small>
			</div>
		</div>
		<div class="summary-card">
			<span class="summary-icon"><NavIcon name="target" size={16} /></span>
			<div>
				<b>{totals.accuracy}%</b>
				<span>Accuracy</span>
				<small>{totals.attempts.toLocaleString()} attempted</small>
			</div>
		</div>
		<div class="summary-card">
			<span class="summary-icon"><NavIcon name="pulse" size={16} /></span>
			<div>
				<b>{todayTotals.solved}</b>
				<span>Solved today</span>
				<small>{todayTotals.attempts} attempted today</small>
			</div>
		</div>
		<div class="summary-card">
			<span class="summary-icon"><NavIcon name="bulb" size={16} /></span>
			<div>
				<b>{totals.doubts}</b>
				<span>Doubts flagged</span>
				<small>Questions to revisit</small>
			</div>
		</div>
	</div>

	<div class="subject-grid">
		{#each SUBJECTS as sub (sub.code)}
			{@const row = subjectMap[sub.code]}
			<button
				type="button"
				class="subject-card"
				style="--c: {sub.color}"
				on:click={() => openEntry(sub.code)}
			>
				<div class="subject-top">
					<span class="subject-icon"><NavIcon name={sub.icon} size={17} /></span>
					<span class="subject-add"><NavIcon name="plus" size={14} /></span>
				</div>
				<span class="subject-name">{sub.name}</span>
				<div class="subject-solved">
					<b>{row?.solved ?? 0}</b>
					<span>solved</span>
				</div>
				<div class="subject-rail"><i style="width: {row?.accuracy ?? 0}%"></i></div>
				<div class="subject-meta">
					<span>{row?.attempts ?? 0} attempted</span>
					<span>{row?.accuracy ?? 0}%</span>
				</div>
			</button>
		{/each}
	</div>

	<div class="recent-layout">
		<div class="panel recent-panel">
			<div class="panel-head">
				<div>
					<h2>Recent sessions</h2>
					<p>Latest practice across every source</p>
				</div>
				<div class="filters" role="tablist" aria-label="Filter sessions by subject">
					<button type="button" class="filter-chip" class:active={filter === 'all'} on:click={() => (filter = 'all')}>All</button>
					{#each SUBJECTS as sub (sub.code)}
						<button type="button" class="filter-chip" class:active={filter === sub.code} on:click={() => (filter = sub.code as SubjectFilter)}>
							{sub.name}
						</button>
					{/each}
				</div>
			</div>

			{#if recent.length === 0}
				<div class="empty">
					<span class="empty-icon"><NavIcon name="layers" size={22} /></span>
					<b>No sessions {filter === 'all' ? 'yet' : `in ${subjectName(filter)}`}.</b>
					<p>Log your first module, DPP or PYQ set and it will appear here instantly.</p>
					<button type="button" class="empty-btn" on:click={() => openEntry(filter === 'all' ? 'P' : filter)}>
						<NavIcon name="plus" size={14} /> Log a session
					</button>
				</div>
			{:else}
				<div class="session-list">
					{#each recent as entry (entry.id)}
						<div class="session-row">
							<span class="subj-dot" style="--c: {subjectColor(entry.sub)}"></span>
							<div class="session-main">
								<div class="session-title">
									<b>{entry.ch}</b>
									<span class="src {entry.source ?? 'coaching'}">{universalSourceLabel(entry.source)}</span>
									{#if entry.label}<span class="session-label">{entry.label}</span>{/if}
								</div>
								<div class="session-sub">
									<span>{subjectName(entry.sub)}</span>
									{#if entry.sourceName}<span>{entry.sourceName}</span>{/if}
									<span>{formatDay(entry.at)} · {formatTime(entry.at)}</span>
								</div>
							</div>
							<div class="session-stats">
								<span><b>{entry.cor}</b>/{entry.att}</span>
								<small>{entry.att ? Math.round((entry.cor / entry.att) * 100) : 0}%</small>
							</div>
							{#if entry.doubt}
								<span class="doubt-pill" title="Doubts flagged">{entry.doubt} doubt{entry.doubt === 1 ? '' : 's'}</span>
							{/if}
							<button
								type="button"
								class="delete-btn"
								class:confirming={confirmId === entry.id}
								title={confirmId === entry.id ? 'Click again to delete' : 'Delete session'}
								aria-label="Delete session"
								on:click={() => requestDelete(entry.id)}
							>
								{#if confirmId === entry.id}
									<span>Delete</span>
								{:else}
									<NavIcon name="trash" size={14} />
								{/if}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="panel chapters-panel">
			<div class="panel-head">
				<div>
					<h2>Chapters touched</h2>
					<p>Where your practice is landing</p>
				</div>
			</div>
			{#if topChapters.length === 0}
				<p class="side-empty">Your chapter map fills up as you log sessions.</p>
			{:else}
				<div class="chapter-list">
					{#each topChapters as chapter (chapter.sub + ':' + chapter.ch)}
						<div class="chapter-row">
							<div class="chapter-top">
								<span class="subj-dot small" style="--c: {subjectColor(chapter.sub)}"></span>
								<span class="chapter-name" title={chapter.ch}>{chapter.ch}</span>
								<b>{chapter.solved}</b>
							</div>
							<div class="chapter-rail">
								<i style="width: {Math.max(6, Math.round((chapter.solved / maxChapterSolved) * 100))}%; --c: {subjectColor(chapter.sub)}"></i>
							</div>
							<span class="chapter-meta">{chapter.accuracy}% accuracy · {chapter.sessions} session{chapter.sessions === 1 ? '' : 's'}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<p class="bridge-note">
		<NavIcon name="pulse" size={13} />
		Solved counts flow into your dashboard heatmap, streak charts and subject totals automatically.
	</p>
</section>

<UniversalLogEntryModal bind:open={entryOpen} initialSubject={entrySubject} />

<style>
	.universal { display: grid; gap: 1.15rem; }
	.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.2rem; flex-wrap: wrap; }
	.eyebrow { margin: 0 0 .3rem; color: var(--accent); font-size: .68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
	h1 { margin: 0 0 .35rem; font-size: clamp(1.5rem, 3vw, 2.1rem); letter-spacing: -.04em; }
	.sub { margin: 0; max-width: 62ch; color: var(--text-secondary); font-size: .88rem; line-height: 1.55; }
	.log-btn {
		display: inline-flex; align-items: center; gap: .45rem; padding: .68rem 1.05rem;
		border: 1px solid var(--accent); border-radius: 13px; background: var(--accent);
		color: var(--accent-contrast, #fff); font-family: inherit; font-size: .84rem; font-weight: 750;
		cursor: pointer; box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 35%, transparent);
		transition: all .18s var(--ease-ios-spring);
	}
	.log-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
	.log-btn:active { transform: scale(.97); }

	.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; }
	.summary-card {
		display: flex; align-items: center; gap: .7rem; padding: .9rem 1rem;
		border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel);
		box-shadow: var(--shadow-card);
	}
	.summary-card.accent { border-color: color-mix(in srgb, var(--accent) 35%, var(--border-subtle)); background: color-mix(in srgb, var(--accent) 7%, var(--surface-panel)); }
	.summary-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--surface-subtle); color: var(--accent); flex-shrink: 0; }
	.summary-card b { display: block; font-size: 1.25rem; letter-spacing: -.035em; line-height: 1.1; }
	.summary-card span { display: block; color: var(--text-secondary); font-size: .7rem; font-weight: 750; }
	.summary-card small { display: block; margin-top: .12rem; color: var(--text-secondary); font-size: .64rem; opacity: .85; }

	.subject-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; }
	.subject-card {
		display: flex; flex-direction: column; gap: .35rem; padding: .95rem 1.05rem;
		border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel);
		box-shadow: var(--shadow-card); text-align: left; color: var(--text-primary); font-family: inherit;
		cursor: pointer; transition: transform .16s ease, border-color .16s ease;
	}
	.subject-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 55%, var(--border-subtle)); }
	.subject-top { display: flex; align-items: center; justify-content: space-between; }
	.subject-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: color-mix(in srgb, var(--c) 15%, transparent); color: var(--c); }
	.subject-add { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--surface-subtle); color: var(--text-secondary); }
	.subject-card:hover .subject-add { background: var(--c); color: #fff; }
	.subject-name { font-size: .8rem; font-weight: 750; color: var(--text-secondary); }
	.subject-solved { display: flex; align-items: baseline; gap: .35rem; }
	.subject-solved b { font-size: 1.7rem; letter-spacing: -.05em; line-height: 1; }
	.subject-solved span { color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.subject-rail { height: 5px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; margin-top: .15rem; }
	.subject-rail i { display: block; height: 100%; border-radius: 99px; background: var(--c); transition: width .3s ease; }
	.subject-meta { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: .68rem; font-weight: 650; }

	.recent-layout { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(260px, 1fr); gap: .9rem; align-items: start; }
	.panel { border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); box-shadow: var(--shadow-card); padding: 1.05rem 1.1rem; }
	.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; flex-wrap: wrap; margin-bottom: .8rem; }
	.panel-head h2 { margin: 0; font-size: .98rem; letter-spacing: -.02em; }
	.panel-head p { margin: .15rem 0 0; color: var(--text-secondary); font-size: .72rem; }
	.filters { display: flex; flex-wrap: wrap; gap: .3rem; }
	.filter-chip {
		padding: .32rem .62rem; border-radius: 99px; border: 1px solid var(--border-subtle);
		background: transparent; color: var(--text-secondary); font-family: inherit; font-size: .7rem;
		font-weight: 700; cursor: pointer; transition: all .15s ease;
	}
	.filter-chip:hover { border-color: var(--accent); color: var(--text-primary); }
	.filter-chip.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--accent); }

	.session-list { display: flex; flex-direction: column; }
	.session-row { display: flex; align-items: center; gap: .65rem; padding: .7rem .15rem; border-top: 1px solid color-mix(in srgb, var(--border-subtle) 65%, transparent); }
	.session-row:first-child { border-top: 0; }
	.subj-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
	.subj-dot.small { width: 7px; height: 7px; }
	.session-main { flex: 1; min-width: 0; display: grid; gap: .18rem; }
	.session-title { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; min-width: 0; }
	.session-title b { font-size: .82rem; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
	.src { font-size: .56rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: .14rem .42rem; border-radius: 99px; border: 1px solid currentColor; }
	.src.coaching { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
	.src.dpp { color: #8b7bff; background: color-mix(in srgb, #8b7bff 12%, transparent); }
	.src.pyq { color: #2f9e6e; background: color-mix(in srgb, #2f9e6e 12%, transparent); }
	.src.book { color: #d99a2b; background: color-mix(in srgb, #d99a2b 14%, transparent); }
	.src.test { color: #e0455a; background: color-mix(in srgb, #e0455a 12%, transparent); }
	.session-label { font-size: .64rem; font-weight: 650; color: var(--text-secondary); background: var(--surface-subtle); padding: .1rem .38rem; border-radius: 5px; }
	.session-sub { display: flex; flex-wrap: wrap; gap: .45rem; color: var(--text-secondary); font-size: .66rem; font-weight: 600; }
	.session-sub span + span::before { content: '·'; margin-right: .45rem; opacity: .6; }
	.session-stats { display: grid; gap: .05rem; text-align: right; flex-shrink: 0; }
	.session-stats span { font-size: .78rem; font-weight: 750; }
	.session-stats small { color: var(--text-secondary); font-size: .64rem; font-weight: 650; }
	.doubt-pill { flex-shrink: 0; font-size: .6rem; font-weight: 750; color: var(--warning, #d99a2b); background: color-mix(in srgb, var(--warning, #d99a2b) 12%, transparent); padding: .18rem .45rem; border-radius: 99px; }
	.delete-btn {
		display: grid; place-items: center; min-width: 28px; height: 28px; padding: 0 .35rem;
		border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--text-secondary);
		font-family: inherit; font-size: .66rem; font-weight: 750; cursor: pointer; flex-shrink: 0; transition: all .15s ease;
	}
	.delete-btn:hover { color: var(--danger, #e0455a); border-color: color-mix(in srgb, var(--danger, #e0455a) 45%, transparent); background: color-mix(in srgb, var(--danger, #e0455a) 8%, transparent); }
	.delete-btn.confirming { color: #fff; background: var(--danger, #e0455a); border-color: var(--danger, #e0455a); }

	.chapter-list { display: grid; gap: .75rem; }
	.chapter-row { display: grid; gap: .28rem; }
	.chapter-top { display: flex; align-items: center; gap: .4rem; }
	.chapter-name { flex: 1; min-width: 0; font-size: .76rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.chapter-top b { font-size: .76rem; color: var(--text-secondary); }
	.chapter-rail { height: 4px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.chapter-rail i { display: block; height: 100%; border-radius: 99px; background: var(--c); }
	.chapter-meta { color: var(--text-secondary); font-size: .64rem; font-weight: 600; }
	.side-empty { margin: .3rem 0 0; color: var(--text-secondary); font-size: .76rem; line-height: 1.5; }

	.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: .35rem; padding: 1.8rem 1rem; }
	.empty-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: var(--surface-subtle); color: var(--accent); margin-bottom: .2rem; }
	.empty b { font-size: .9rem; }
	.empty p { margin: 0; max-width: 36ch; color: var(--text-secondary); font-size: .76rem; line-height: 1.5; }
	.empty-btn { display: inline-flex; align-items: center; gap: .35rem; margin-top: .45rem; padding: .5rem .85rem; border-radius: 10px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-contrast, #fff); font-family: inherit; font-size: .76rem; font-weight: 750; cursor: pointer; }

	.bridge-note { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--text-secondary); font-size: .7rem; font-weight: 600; }
	.bridge-note :global(svg) { color: var(--accent); flex-shrink: 0; }

	@media (max-width: 980px) {
		.summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.recent-layout { grid-template-columns: 1fr; }
	}
	@media (max-width: 768px) {
		.subject-grid { grid-template-columns: 1fr; }
		.head { align-items: flex-start; }
		.log-btn { width: 100%; justify-content: center; min-height: 44px; }
		.session-row { flex-wrap: wrap; }
		.session-main { flex-basis: calc(100% - 70px); }
		.doubt-pill { order: 3; }
		.delete-btn { order: 4; margin-left: auto; }
		.panel-head { flex-direction: column; }
	}
	@media (max-width: 420px) {
		.summary-card { padding: .75rem .8rem; }
	}
</style>
