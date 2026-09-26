<svelte:head><title>Revise · BTracker</title></svelte:head>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import AddChapterModal from '$lib/components/revise/AddChapterModal.svelte';
	import { tracker, revisedToday, completeRevision, deleteRevision, celebration } from '$lib/stores/tracker';
	import { addDaysKey, dayKeyOf, shortDateKey, todayKey } from '$lib/state/dates';
	import { SUBJECTS, SPACING_METHODS, subjectColor, subjectName } from '$lib/state/subjects';

	type RevTab = 'due' | 'next7' | 'all';
	const RATINGS: [number, string][] = [[1, 'Again'], [3, 'Hard'], [4, 'Good'], [5, 'Easy']];
	let tab: RevTab = 'due';
	let query = '';
	let subFilter = '';
	let methodFilter = '';
	let addOpen = false;
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
		.filter((e) => (tab === 'due' ? isDue(e) : tab === 'next7' ? isNext7(e) : true))
		.filter((e) => !subFilter || e.sub === subFilter)
		.filter((e) => !methodFilter || e.method === methodFilter)
		.filter((e) => !query.trim() || e.ch.toLowerCase().includes(query.trim().toLowerCase()))
		.sort((a, b) => (a.remindDate || '9999').localeCompare(b.remindDate || '9999'));

	function dueLabel(e: { remindDate: string }) {
		if (!e.remindDate) return 'No schedule';
		if (e.remindDate < today) return 'Overdue';
		if (e.remindDate === today) return 'Due today';
		return `Due ${shortDateKey(e.remindDate)}`;
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
</script>

<section class="revise" in:fade={{ duration: 260 }}>
	<header>
		<div>
			<h1>ACTIVE RECALL HUB</h1>
			<p>Spaced repetition planner.</p>
		</div>
		<button type="button" class="add" on:click={() => (addOpen = true)}><NavIcon name="plus" size={15} /> Add Chapter</button>
	</header>

	<div class="kpis">
		<div class="kpi"><b>{entries.length}</b><span>CHAPTERS TRACKED</span></div>
		<div class="kpi due"><b>{dueCount}</b><span>DUE TODAY</span></div>
		<div class="kpi"><b>{$revisedToday}</b><span>REVISED TODAY</span></div>
	</div>

	<div class="tabs" role="tablist">
		<button type="button" role="tab" class:active={tab === 'due'} on:click={() => (tab = 'due')}>Due ({dueCount})</button>
		<button type="button" role="tab" class:active={tab === 'next7'} on:click={() => (tab = 'next7')}>Next 7 Days ({next7Count})</button>
		<button type="button" role="tab" class:active={tab === 'all'} on:click={() => (tab = 'all')}>All ({entries.length})</button>
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

	{#if filtered.length}
		<div class="cards">
			{#each filtered as entry (entry.key)}
				<article class="rcard" in:fly={{ y: 8, duration: 220 }} style="--c: {subjectColor(entry.sub)}; --m: {methodMeta(entry.method)?.color ?? 'var(--accent)'}">
					<div class="top">
						<span class="badge sub">{subjectName(entry.sub).toUpperCase()}</span>
						<span class="badge method">{methodMeta(entry.method)?.emoji} {methodMeta(entry.method)?.name}</span>
						{#if isDue(entry)}<span class="badge now">Due now</span>{/if}
					</div>
					<h3>{entry.ch}</h3>
					<div class="meta">
						<span><NavIcon name="clock" size={12} /> {dueLabel(entry)}</span>
						<span><NavIcon name="check" size={12} /> Rev #{Math.max(0, entry.step - 1)}</span>
						<span><NavIcon name="trend" size={12} /> {entry.last ? `Last ${shortDateKey(dayKeyOf(new Date(entry.last)))}` : 'Never revised'}</span>
					</div>
					{#if ratingFor === entry.key}
						<div class="ratings" in:fly={{ y: 4, duration: 180 }}>
							<span>Rate your recall:</span>
							{#each RATINGS as [value, label]}
								<button type="button" class="rate" on:click={() => rate(entry.key, value)}>{label}</button>
							{/each}
						</div>
					{/if}
					<div class="actions">
						<button type="button" class="done" on:click={() => markDone(entry.key, entry.method)}><NavIcon name="check" size={14} /> Done</button>
						<button type="button" class="trash" title="Remove from planner" on:click={() => remove(entry.key)}><NavIcon name="trash" size={14} /></button>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty">
			{#if tab === 'due'}
				<b>Nothing due today 🎉</b>
				<span>Switch to "All" to see all your chapters.</span>
			{:else if entries.length === 0}
				<b>No chapters tracked yet</b>
				<span>Add a chapter to start your spaced repetition plan.</span>
			{:else}
				<b>No matches</b>
				<span>Try clearing the search or filters.</span>
			{/if}
		</div>
	{/if}
</section>

<AddChapterModal bind:open={addOpen} />

<style>
	.revise { display: grid; gap: 1.2rem; }
	header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .3rem 0 0; color: var(--text-secondary); font-size: .82rem; }
	.add { display: inline-flex; align-items: center; gap: .45rem; padding: .65rem 1.15rem; border: 0; border-radius: 12px; color: #fff; background: var(--accent); font-size: .84rem; font-weight: 750; box-shadow: 0 8px 18px color-mix(in srgb, var(--accent), transparent 66%); }

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
	.rcard { position: relative; display: grid; gap: .6rem; padding: 1rem 1.15rem 1rem 1.3rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); overflow: hidden; }
	.rcard::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--c); }
	.top { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
	.badge { padding: .2rem .55rem; border-radius: 999px; font-size: .58rem; font-weight: 800; letter-spacing: .07em; }
	.badge.sub { color: var(--c); background: color-mix(in srgb, var(--c), transparent 88%); }
	.badge.method { color: var(--m); background: color-mix(in srgb, var(--m), transparent 88%); }
	.badge.now { margin-left: auto; color: #fff; background: var(--danger, #e0455a); }
	.rcard h3 { margin: 0; font-size: 1rem; font-weight: 800; letter-spacing: -.03em; }
	.meta { display: grid; gap: .3rem; }
	.meta span { display: inline-flex; align-items: center; gap: .4rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.ratings { display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; padding: .5rem .6rem; border: 1px dashed var(--m); border-radius: 11px; }
	.ratings span { color: var(--text-secondary); font-size: .68rem; font-weight: 750; margin-right: .2rem; }
	.rate { padding: .32rem .65rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-panel); color: var(--text-primary); font-size: .68rem; font-weight: 750; }
	.rate:hover { border-color: var(--m); color: var(--m); }
	.actions { display: flex; gap: .5rem; }
	.done { display: inline-flex; align-items: center; gap: .4rem; flex: 1; justify-content: center; padding: .55rem; border: 0; border-radius: 11px; color: #fff; background: var(--success, #2f9e6e); font-size: .8rem; font-weight: 750; }
	.trash { display: grid; place-items: center; width: 38px; border: 1px solid var(--border-subtle); border-radius: 11px; color: var(--text-secondary); background: var(--surface-panel); }
	.trash:hover { color: var(--danger, #e0455a); border-color: var(--danger, #e0455a); }

	.empty { display: grid; gap: .3rem; justify-items: center; padding: 2.4rem 1rem; border: 1px dashed var(--border-subtle); border-radius: var(--radius-card); text-align: center; }
	.empty b { font-size: 1rem; }
	.empty span { color: var(--text-secondary); font-size: .8rem; }
	@media (max-width: 640px) { .kpis { grid-template-columns: 1fr; } }
</style>
