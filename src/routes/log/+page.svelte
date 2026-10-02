<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import QuestionSheet from '$lib/components/log/QuestionSheet.svelte';
	import { setQuestionCount, tracker } from '$lib/stores/tracker';
	import {
		allChapters, questionCount, syllabusChapter, syllabusModule, syllabusSubject, SYLLABUS, visibleExercises,
		type SyllabusExercise
	} from '$lib/state/syllabus';
	import {
		accuracyOf, cellClasses, chapterStats, exerciseStats, logTotals, moduleStats, pctOf, subjectStats,
		type QuestionStats
	} from '$lib/state/questions';

	interface View { s: string | null; m: number | null; c: number | null; e: string | null }
	let view: View = { s: null, m: null, c: null, e: null };
	let newCount = '';
	let countMsg = '';

	$: subject = view.s ? syllabusSubject(view.s) : null;
	$: module = view.s !== null && view.m !== null ? syllabusModule(view.s, view.m) : null;
	$: chapter = view.s !== null && view.c !== null ? syllabusChapter(view.s, view.c) : null;
	$: exercise = chapter?.exs.find((ex) => ex.code === view.e) ?? null;
	$: exCount = view.s !== null && view.c !== null && view.e !== null ? questionCount($tracker, view.s, view.c, view.e) : 0;
	$: total = logTotals($tracker);

	function open(next: Partial<View>) {
		view = { s: null, m: null, c: null, e: null, ...next };
		newCount = ''; countMsg = '';
	}
	function createTable() {
		const value = parseInt(newCount, 10);
		if (!(value > 0 && value <= 2000)) { countMsg = 'Type a number between 1 and 2000.'; return; }
		setQuestionCount({ sc: view.s!, ch: view.c!, ex: view.e! }, value);
	}

	const bits = (st: QuestionStats) => [
		{ cls: 'ok', label: 'correct', value: st.correct },
		{ cls: 'no', label: 'wrong', value: st.wrong },
		{ cls: 'cant', label: 'stuck', value: st.cant },
		{ cls: 'flag', label: 'review', value: st.flag }
	].filter((b) => b.value > 0);
</script>

<nav class="crumbs" aria-label="Breadcrumb">
	<button type="button" class:here={!view.s} on:click={() => open({})}>Question log</button>
	{#if subject}
		<span>/</span><button type="button" class:here={view.m === null} on:click={() => open({ s: subject.code })}>{subject.short}</button>
	{/if}
	{#if module}
		<span>/</span><button type="button" class:here={view.c === null} on:click={() => open({ s: view.s, m: module.id })}>{module.name}</button>
	{/if}
	{#if chapter}
		<span>/</span><button type="button" class:here={view.e === null} on:click={() => open({ s: view.s, m: view.m, c: chapter.no })}>{chapter.no}. {chapter.name}</button>
	{/if}
	{#if exercise}
		<span>/</span><button type="button" class="here">{exercise.name}</button>
	{/if}
</nav>

{#if !subject}
	<header class="pagehead">
		<p class="eyebrow">Question log</p>
		<h1>Every question you have solved, in one place.</h1>
		<p class="sub">Tick questions as you solve them, mark the ones that went wrong and why, and watch each chapter fill in.</p>
	</header>
	<div class="totalcard">
		<span class="pct">{pctOf(total)}%</span>
		<div>
			<b>{total.done.toLocaleString()}</b> of {total.n.toLocaleString()} questions solved
			<small>{total.correct.toLocaleString()} correct · {total.wrong.toLocaleString()} wrong · {total.cant.toLocaleString()} stuck</small>
		</div>
	</div>
	<div class="grid g3">
		{#each SYLLABUS as sub (sub.code)}
			{@const st = subjectStats($tracker, sub.code)}
			<button type="button" class="card subj" style="--c: {sub.accent}" on:click={() => open({ s: sub.code })}>
				<span class="bar"></span>
				<div class="card-top"><h2>{sub.name}</h2><span class="pct" class:zero={!pctOf(st)}>{pctOf(st)}%</span></div>
				<p class="meta">{allChapters(sub.code).length} chapters · {st.n.toLocaleString()} questions</p>
				<div class="rail"><i style="width:{pctOf(st)}%"></i></div>
				<div class="statline">
					{#each bits(st) as b}<span class={b.cls}><b>{b.value}</b> {b.label}</span>{/each}
				</div>
			</button>
		{/each}
	</div>
	<div class="legend">
		<span><i class="c"></i> correct</span>
		<span><i class="w"></i> wrong</span>
		<span><i class="x"></i> could not solve</span>
		<span><i class="d"></i> solved, not marked</span>
		<span><i class="f"></i> review</span>
	</div>
{:else if !module}
	<header class="pagehead">
		<p class="eyebrow" style="color:{subject.accent}">{subject.name}</p>
		<h1>{subject.name}</h1>
		<p class="sub">{subjectStats($tracker, subject.code).done.toLocaleString()} solved · {pctOf(subjectStats($tracker, subject.code))}% of the syllabus</p>
	</header>
	<div class="grid g2">
		{#each subject.modules as mo (mo.id)}
			{@const st = moduleStats($tracker, subject.code, mo.id)}
			<button type="button" class="card" on:click={() => open({ s: subject.code, m: mo.id })}>
				<div class="card-top"><h3>{mo.name}</h3>{#if mo.chapters.length}<span class="pct" class:zero={!pctOf(st)}>{pctOf(st)}%</span>{/if}</div>
				{#if mo.chapters.length}
					<div class="rail"><i style="width:{pctOf(st)}%"></i></div>
					<p class="note">{mo.chapters.map((c) => `${c.no}. ${c.name}`).join(' · ')}</p>
				{:else}
					<p class="note">No chapters here yet.</p>
				{/if}
			</button>
		{/each}
	</div>
{:else if !chapter}
	<header class="pagehead">
		<p class="eyebrow" style="color:{subject.accent}">{subject.name}</p>
		<h1>{module.name}</h1>
	</header>
	<div class="grid g2">
		{#each module.chapters as ch (ch.no)}
			{@const st = chapterStats($tracker, subject.code, ch.no)}
			<button type="button" class="card" on:click={() => open({ s: subject.code, m: module.id, c: ch.no })}>
				<div class="card-top"><h3>{ch.no}. {ch.name}</h3><span class="pct" class:zero={!pctOf(st)}>{pctOf(st)}%</span></div>
				<div class="rail"><i style="width:{pctOf(st)}%"></i></div>
				<div class="statline">
					<span><b>{st.done}</b>/{st.n} solved</span>
					{#each bits(st) as b}<span class={b.cls}><b>{b.value}</b> {b.label}</span>{/each}
				</div>
			</button>
		{/each}
	</div>
{:else if !exercise}
	<header class="pagehead">
		<p class="eyebrow" style="color:{subject.accent}">{subject.name} · {module.name}</p>
		<h1>{chapter.no}. {chapter.name}</h1>
	</header>
	<div class="grid g2">
		{#each visibleExercises($tracker, subject.code, chapter.no) as ex (ex.code)}
			{@const st = exerciseStats($tracker, subject.code, chapter.no, ex.code)}
			{@const mosaic = cellClasses($tracker, subject.code, chapter.no, ex.code)}
			<button type="button" class="card ex" on:click={() => open({ s: subject.code, m: module.id, c: chapter.no, e: ex.code })}>
				<div class="card-top">
					<div>
						<h3>{ex.name}</h3>
						<p class="exsub">{ex.tag} · {st.n ? `${st.n} questions` : 'no questions set'}</p>
					</div>
					{#if st.n}<span class="pct" class:zero={!pctOf(st)}>{pctOf(st)}%</span>{/if}
				</div>
				{#if st.n}
					<div class="mosaic">{#each mosaic as cls}<i class="cell {cls}"></i>{/each}</div>
					<div class="statline">
						<span><b>{st.done}</b>/{st.n} solved</span>
						{#each bits(st) as b}<span class={b.cls}><b>{b.value}</b> {b.label}</span>{/each}
					</div>
				{:else}
					<p class="note">Open it to say how many questions it has.</p>
				{/if}
			</button>
		{:else}
			<p class="emptywide">No exercises here yet.</p>
		{/each}
	</div>
{:else if exCount === 0}
	<header class="pagehead">
		<p class="eyebrow" style="color:{subject.accent}">{chapter.no}. {chapter.name}</p>
		<h1>{exercise.name}</h1>
		<p class="sub">This exercise has no questions yet.</p>
	</header>
	<div class="panel">
		<p class="blabel">How many questions are in this exercise?</p>
		<div class="row">
			<input bind:value={newCount} type="number" min="1" max="2000" placeholder="e.g. 56" aria-label="Question count" on:keydown={(e) => { if (e.key === 'Enter') createTable(); }} />
			<button type="button" class="primary" on:click={createTable}>Create the table</button>
		</div>
		{#if countMsg}<p class="msg">{countMsg}</p>{/if}
	</div>
{:else}
	<QuestionSheet loc={{ sc: subject.code, ch: chapter.no, ex: exercise.code }} exName={exercise.name} exTag={`${chapter.no}. ${chapter.name} · ${exercise.tag}`} />
{/if}

<style>
	.crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; margin-bottom: 1.1rem; color: var(--border-subtle); font-size: .76rem; font-weight: 700; }
	.crumbs button { border: 0; background: transparent; color: var(--text-secondary); font-size: .76rem; font-weight: 700; padding: .15rem .3rem; border-radius: 7px; }
	.crumbs button:hover { color: var(--accent); background: var(--accent-soft); }
	.crumbs button.here { color: var(--text-primary); }
	.pagehead { margin-bottom: 1.3rem; }
	.eyebrow { margin: 0 0 .3rem; color: var(--accent); font-size: .68rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
	h1 { margin: 0 0 .35rem; font-size: clamp(1.5rem, 3vw, 2.1rem); letter-spacing: -.04em; }
	.sub { margin: 0; max-width: 62ch; color: var(--text-secondary); font-size: .88rem; line-height: 1.55; }
	.totalcard { display: flex; align-items: center; gap: .9rem; padding: .95rem 1.1rem; margin-bottom: 1.1rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.totalcard .pct { padding: .3rem .7rem; border-radius: 99px; background: var(--accent); color: white; font-size: .9rem; font-weight: 800; }
	.totalcard b { font-size: 1.05rem; }
	.totalcard small { display: block; color: var(--text-secondary); font-size: .74rem; }
	.grid { display: grid; gap: .9rem; }
	.g3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
	.g2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
	.card { position: relative; display: grid; gap: .55rem; padding: 1.05rem 1.15rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); box-shadow: var(--shadow-card); text-align: left; color: var(--text-primary); transition: transform .16s ease, border-color .16s ease; }
	.card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent), transparent 55%); }
	.card .bar { position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px; border-radius: 99px; background: var(--c, var(--accent)); }
	.card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; }
	h2 { margin: 0; font-size: 1.05rem; letter-spacing: -.03em; }
	h3 { margin: 0; font-size: .95rem; letter-spacing: -.02em; }
	.pct { padding: .18rem .55rem; border-radius: 99px; background: var(--accent); color: white; font-size: .74rem; font-weight: 800; }
	.pct.zero { background: var(--surface-subtle); color: var(--text-secondary); }
	.meta, .note, .exsub { margin: 0; color: var(--text-secondary); font-size: .76rem; line-height: 1.5; }
	.rail { height: 6px; border-radius: 99px; background: var(--surface-subtle); overflow: hidden; }
	.rail i { display: block; height: 100%; border-radius: 99px; background: var(--c, var(--accent)); transition: width .3s ease; }
	.statline { display: flex; flex-wrap: wrap; gap: .7rem; color: var(--text-secondary); font-size: .72rem; font-weight: 650; }
	.statline b { color: var(--text-primary); }
	.statline .ok b { color: var(--success); }
	.statline .no b { color: var(--danger); }
	.statline .cant b { color: var(--warning); }
	.statline .flag b { color: var(--accent); }
	.mosaic { display: flex; flex-wrap: wrap; gap: 3px; }
	.cell { width: 9px; height: 9px; border-radius: 3px; background: var(--surface-subtle); }
	.cell.c { background: var(--success); }
	.cell.w { background: var(--danger); }
	.cell.x { background: var(--warning); }
	.cell.d { background: var(--text-secondary); }
	.cell.f { box-shadow: inset 0 0 0 1.5px var(--accent); background: var(--surface-subtle); }
	.legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.2rem; color: var(--text-secondary); font-size: .74rem; font-weight: 650; }
	.legend span { display: inline-flex; align-items: center; gap: .4rem; }
	.legend i { width: 11px; height: 11px; border-radius: 4px; background: var(--surface-subtle); }
	.legend i.c { background: var(--success); }
	.legend i.w { background: var(--danger); }
	.legend i.x { background: var(--warning); }
	.legend i.d { background: var(--text-secondary); }
	.legend i.f { box-shadow: inset 0 0 0 1.5px var(--accent); }
	.panel { max-width: 460px; padding: 1.1rem 1.2rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); }
	.blabel { margin: 0 0 .6rem; color: var(--text-secondary); font-size: .72rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.row { display: flex; gap: .55rem; }
	.row input { width: 140px; height: 44px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-size: .9rem; }
	.primary { height: 44px; padding: 0 1rem; border: 0; border-radius: 11px; background: var(--accent); color: white; font-size: .82rem; font-weight: 750; }
	.msg { margin: .6rem 0 0; color: var(--danger); font-size: .78rem; font-weight: 650; }
	.emptywide { color: var(--text-secondary); font-size: .86rem; }
</style>
