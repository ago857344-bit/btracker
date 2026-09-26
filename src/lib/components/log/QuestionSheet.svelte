<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ReasonsModal from '$lib/components/log/ReasonsModal.svelte';
	import {
		applyQuestionAction, bulkExercise, setQuestionNote, setQuestionReasons, setQuestionResult,
		setQuestionStars, toggleQuestionDone, toggleQuestionFlag, tracker, type QuestionAction, type QuestionLoc
	} from '$lib/stores/tracker';
	import { cellKey, questionCount, questionKey } from '$lib/state/syllabus';
	import { accuracyOf, exerciseStats, isDone, isFlag, parseRange, pctOf, resultOf, starsOf } from '$lib/state/questions';

	export let loc: QuestionLoc;
	export let exName = '';
	export let exTag = '';

	let status: 'all' | 'todo' | 'done' | 'correct' | 'wrong' | 'cant' | 'flag' = 'all';
	let star: 'all' | '0' | '1' | '2' | '3' = 'all';
	let sort: 'num' | 'starDesc' | 'starAsc' = 'num';
	let sel = new Set<number>();
	let rangeText = '';
	let rangeMsg: { text: string; ok: boolean } | null = null;
	let reasonIndex: number | null = null;
	let confirm: 'done' | 'correct' | 'clear' | null = null;

	let anchor: number | null = null;
	let lastClicked: number | null = null;
	let dragging = false;
	let startX = 0;
	let startY = 0;
	let rowRects: { i: number; top: number; bottom: number }[] = [];

	$: n = questionCount($tracker, loc.sc, loc.ch, loc.ex);
	$: cells = $tracker.d[cellKey(loc.sc, loc.ch, loc.ex)] ?? [];
	$: stats = exerciseStats($tracker, loc.sc, loc.ch, loc.ex);
	$: acc = accuracyOf(stats);

	$: order = (() => {
		let idx: number[] = [];
		for (let i = 0; i < n; i++) idx.push(i);
		idx = idx.filter((i) => {
			const v = cells[i] || 0;
			const r = resultOf(v);
			if (status === 'todo' && isDone(v)) return false;
			if (status === 'done' && !isDone(v)) return false;
			if (status === 'correct' && r !== 1) return false;
			if (status === 'wrong' && r !== 2) return false;
			if (status === 'cant' && r !== 3) return false;
			if (status === 'flag' && !isFlag(v)) return false;
			if (star !== 'all' && starsOf(v) !== Number(star)) return false;
			return true;
		});
		if (sort === 'starDesc') idx.sort((x, y) => starsOf(cells[y] || 0) - starsOf(cells[x] || 0) || x - y);
		if (sort === 'starAsc') idx.sort((x, y) => starsOf(cells[x] || 0) - starsOf(cells[y] || 0) || x - y);
		return idx;
	})();

	const reasonsOf = (i: number) => $tracker.r[questionKey(loc.sc, loc.ch, loc.ex, i)]?.t ?? [];

	$: allSelected = order.length > 0 && order.every((i) => sel.has(i));

	function clearSel() { sel = new Set(); }
	function toggleSelectAll() { sel = allSelected ? new Set() : new Set(order); }

	const posOf = (q: number) => order.indexOf(q);
	function selectRange(fromQ: number, toQ: number) {
		const a = posOf(fromQ), b = posOf(toQ);
		if (a < 0 || b < 0) return;
		sel = new Set(order.slice(Math.min(a, b), Math.max(a, b) + 1));
	}
	/** Snapshot row geometry once per gesture so drag hit-testing avoids layout thrash. */
	function cacheRects() {
		rowRects = [...document.querySelectorAll<HTMLElement>('.qrow[data-i]')].map((el) => {
			const r = el.getBoundingClientRect();
			return { i: Number(el.dataset.i), top: r.top, bottom: r.bottom };
		});
	}
	function rowAtY(y: number): number | null {
		if (!rowRects.length) return null;
		for (const rr of rowRects) if (y >= rr.top && y <= rr.bottom) return rr.i;
		let best = rowRects[0], bd = Infinity;
		for (const rr of rowRects) { const d = y < rr.top ? rr.top - y : y - rr.bottom; if (d < bd) { bd = d; best = rr; } }
		return best.i;
	}

	function onRowPointerDown(event: PointerEvent, i: number) {
		if ((event.target as HTMLElement).closest('button,input,select,a')) return;
		if (event.button !== undefined && event.button !== 0) return;
		anchor = i; dragging = false; startX = event.clientX; startY = event.clientY;
		cacheRects();
		if (event.shiftKey && lastClicked !== null) selectRange(lastClicked, i);
	}
	function onMove(event: PointerEvent) {
		if (anchor === null) return;
		if (!dragging) {
			if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) < 5) return;
			dragging = true;
			sel = new Set([anchor]);
		}
		if (event.cancelable) event.preventDefault();
		const target = rowAtY(event.clientY);
		if (target !== null) selectRange(anchor, target);
	}
	function onUp(event: PointerEvent) {
		if (anchor === null) return;
		if (!dragging && !event.shiftKey) {
			const next = new Set(sel);
			if (next.has(anchor)) next.delete(anchor); else next.add(anchor);
			sel = next;
		}
		lastClicked = anchor;
		anchor = null; dragging = false;
	}

	function markWrong(i: number) {
		setQuestionResult(loc, i, 2);
		if (!reasonsOf(i).length) reasonIndex = i;
	}

	function applyRange() {
		const parsed = parseRange(rangeText, n);
		if (parsed.error) { rangeMsg = { text: parsed.error, ok: false }; return; }
		const what = (document.getElementById('rng-what') as HTMLSelectElement).value as QuestionAction;
		applyQuestionAction(loc, parsed.list, what);
		rangeMsg = { text: `${parsed.list.length} question${parsed.list.length === 1 ? '' : 's'} updated.`, ok: true };
		rangeText = '';
		clearSel();
	}

	function selectionAction(action: QuestionAction) {
		applyQuestionAction(loc, [...sel].sort((a, b) => a - b), action);
		clearSel();
	}

	function runBulk(kind: 'done' | 'correct' | 'clear') {
		bulkExercise(loc, kind);
		confirm = null;
		clearSel();
	}

	const CONFIRM_COPY: Record<'done' | 'correct' | 'clear', { title: string; body: string; cta: string }> = {
		done: { title: 'Mark all solved?', body: `This ticks all ${n} questions in ${exName} as solved. Questions already marked keep their result.`, cta: 'Mark all solved' },
		correct: { title: 'Mark all correct?', body: `This marks all ${n} questions in ${exName} as solved and correct. Anything recorded as wrong will be overwritten.`, cta: 'Mark all correct' },
		clear: { title: 'Clear this exercise?', body: `This erases every tick, result, star and note in ${exName}.`, cta: 'Clear exercise' }
	};
</script>

<svelte:window on:pointermove={onMove} on:pointerup={onUp} />

<div class="sheet-head">
	<div>
		<p class="eyebrow">{exTag}</p>
		<h2>{exName}</h2>
	</div>
	<div class="statline" aria-label="Exercise totals">
		<span class="pct">{pctOf(stats)}%</span>
		<span><b>{stats.done}</b>/{stats.n} solved</span>
		<span class="ok"><b>{stats.correct}</b> correct</span>
		<span class="no"><b>{stats.wrong}</b> wrong</span>
		<span class="cant"><b>{stats.cant}</b> stuck</span>
		{#if stats.flag}<span class="flag"><b>{stats.flag}</b> review</span>{/if}
		{#if acc !== null}<span class="acc"><b>{acc}%</b> accuracy</span>{/if}
	</div>
</div>

<div class="toolbar">
	<label class="field">Show
		<select bind:value={status} on:change={() => clearSel()}>
			<option value="all">Everything</option>
			<option value="todo">Not solved</option>
			<option value="done">Solved</option>
			<option value="correct">Correct</option>
			<option value="wrong">Wrong</option>
			<option value="cant">Could not solve</option>
			<option value="flag">Marked for review</option>
		</select>
	</label>
	<label class="field">Stars
		<select bind:value={star} on:change={() => clearSel()}>
			<option value="all">Any</option>
			<option value="3">3 stars</option>
			<option value="2">2 stars</option>
			<option value="1">1 star</option>
			<option value="0">No stars</option>
		</select>
	</label>
	<label class="field">Order
		<select bind:value={sort}>
			<option value="num">Question number</option>
			<option value="starDesc">Stars, high to low</option>
			<option value="starAsc">Stars, low to high</option>
		</select>
	</label>
	<span class="spacer"></span>
	<button type="button" class="tbtn warn" on:click={() => (confirm = 'done')}>Mark all solved</button>
	<button type="button" class="tbtn warn" on:click={() => (confirm = 'correct')}>Mark all correct</button>
	<button type="button" class="tbtn warn" on:click={() => (confirm = 'clear')}>Clear exercise</button>
</div>

<div class="rangebar">
	<span class="blabel">Apply to questions</span>
	<input bind:value={rangeText} placeholder="4, 7, 8-9, 45-60" aria-label="Question range" on:keydown={(e) => { if (e.key === 'Enter') applyRange(); }} />
	<select id="rng-what">
		<option value="done">Mark solved</option>
		<option value="correct">Mark correct</option>
		<option value="wrong">Mark wrong</option>
		<option value="cant">Could not solve</option>
		<option value="flag">Mark for review</option>
		<option value="unflag">Remove review</option>
		<option value="undone">Mark not solved</option>
		<option value="s3">Give 3 stars</option>
		<option value="s2">Give 2 stars</option>
		<option value="s1">Give 1 star</option>
		<option value="s0">Remove stars</option>
	</select>
	<button type="button" class="apply" on:click={applyRange}>Apply</button>
	{#if rangeMsg}<span class="msg" class:ok={rangeMsg.ok}>{rangeMsg.text}</span>{/if}
</div>

<div class="sheet" class:dragging>
	<div class="qrow head">
		<span class="qn-head">
			<button type="button" class="selall" aria-label={allSelected ? 'Clear selection' : 'Select all visible'} aria-pressed={allSelected} on:click={toggleSelectAll}><NavIcon name="check" size={12} /></button>
			Q.no
		</span>
		<span>Solved</span><span>Result</span><span>Your note</span><span>Review</span><span>Rating</span>
	</div>
	{#each order as i (i)}
		{@const v = cells[i] || 0}
		{@const r = resultOf(v)}
		{@const qk = questionKey(loc.sc, loc.ch, loc.ex, i)}
		{@const reasons = $tracker.r[qk]?.t ?? []}
		{@const note = $tracker.n[qk] ?? ''}
		<div
			class="qrow"
			role="group"
			aria-label="Question {i + 1}"
			class:done={isDone(v)}
			class:cant={r === 3}
			class:sel={sel.has(i)}
			data-i={i}
			on:pointerdown={(e) => onRowPointerDown(e, i)}
		>
			<span class="qn" class:qsel={sel.has(i)} title="Drag to select a run · shift-click to extend">{String(i + 1).padStart(3, '0')}</span>
			<span class="c-chk">
				<button type="button" class="check" class:on={isDone(v)} aria-pressed={isDone(v)} aria-label="Question {i + 1} solved" on:click={() => toggleQuestionDone(loc, i)}>
					<NavIcon name="check" size={13} />
				</button>
			</span>
			<span class="c-bub">
				<button type="button" class="bub c" class:on={r === 1} aria-label="Correct" on:click={() => setQuestionResult(loc, i, 1)}><NavIcon name="check" size={12} /></button>
				<button type="button" class="bub w" class:on={r === 2} aria-label="Wrong" on:click={() => markWrong(i)}><NavIcon name="x" size={12} /></button>
				{#if r === 2}
					<button type="button" class="why" title={reasons.length ? 'Edit what went wrong' : 'Say what went wrong'} on:click={() => (reasonIndex = i)}>
						{reasons.length ? `${reasons.length} TAG${reasons.length > 1 ? 'S' : ''}` : 'WHY?'}
					</button>
				{/if}
			</span>
			<span class="c-note">
				<input value={note} placeholder="Add a note" aria-label="Note for question {i + 1}" on:change={(e) => setQuestionNote(loc, i, e.currentTarget.value)} />
			</span>
			<span class="c-marks">
				<button type="button" class="flag" class:on={isFlag(v)} aria-pressed={isFlag(v)} on:click={() => toggleQuestionFlag(loc, i)}>RETRY</button>
				<button type="button" class="stuck" class:on={r === 3} aria-pressed={r === 3} title="Could not solve" on:click={() => setQuestionResult(loc, i, 3)}>STUCK</button>
			</span>
			<span class="c-stars">
				{#each [1, 2, 3] as k}
					<button type="button" class="star" class:on={starsOf(v) >= k} aria-label="{k} star" on:click={() => setQuestionStars(loc, i, k)}>★</button>
				{/each}
			</span>
		</div>
	{:else}
		<div class="empty">No questions match this filter. Change <b>Show</b> or <b>Stars</b> above.</div>
	{/each}
</div>
<p class="hint">Click a row to select it · drag down the numbers or shift-click to select a run · tick the header box to select all — then mark them together below.</p>

{#if sel.size}
	<div class="selbar" role="toolbar" aria-label="Selection actions">
		<span class="n">{sel.size} selected</span>
		<button type="button" class="tbtn" on:click={() => selectionAction('done')}>Mark solved</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('correct')}>Correct</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('wrong')}>Wrong</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('cant')}>Stuck</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('flag')}>Review</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('clear')}>Clear</button>
		<button type="button" class="tbtn ghost" on:click={clearSel}>Cancel</button>
	</div>
{/if}

{#if reasonIndex !== null}
	<ReasonsModal
		open={true}
		questionLabel="Q{reasonIndex + 1}"
		selected={reasonsOf(reasonIndex)}
		on:save={(e) => { setQuestionReasons(loc, reasonIndex!, e.detail); reasonIndex = null; }}
	/>
{/if}

{#if confirm}
	<Modal open={true} title={CONFIRM_COPY[confirm].title} width="440px" on:close={() => (confirm = null)}>
		<p class="confirm-body">{CONFIRM_COPY[confirm].body}</p>
		<svelte:fragment slot="footer">
			<button type="button" class="ghostbtn" on:click={() => (confirm = null)}>Cancel</button>
			<button type="button" class="dangerbtn" on:click={() => runBulk(confirm!)}>{CONFIRM_COPY[confirm].cta}</button>
		</svelte:fragment>
	</Modal>
{/if}

<style>
	.sheet-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: .8rem; margin-bottom: 1rem; }
	h2 { margin: 0; font-size: 1.3rem; letter-spacing: -.03em; }
	.eyebrow { margin: 0 0 .2rem; color: var(--text-secondary); font-size: .68rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
	.statline { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem; color: var(--text-secondary); font-size: .76rem; font-weight: 650; }
	.statline b { color: var(--text-primary); }
	.statline .pct { padding: .2rem .55rem; border-radius: 99px; background: var(--accent); color: white; font-weight: 800; }
	.statline .ok b { color: var(--success); }
	.statline .no b { color: var(--danger); }
	.statline .cant b { color: var(--warning); }
	.statline .flag b { color: var(--accent); }
	.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; margin-bottom: .7rem; }
	.field { display: grid; gap: .25rem; color: var(--text-secondary); font-size: .68rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.field select { height: 34px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); color: var(--text-primary); font-size: .8rem; font-weight: 600; padding: 0 .5rem; }
	.spacer { flex: 1; }
	.tbtn { height: 32px; padding: 0 .7rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); color: var(--text-secondary); font-size: .74rem; font-weight: 700; }
	.tbtn:hover { color: var(--accent); border-color: var(--accent); }
	.tbtn.warn:hover { color: var(--danger); border-color: var(--danger); }
	.tbtn.ghost { background: transparent; }
	.rangebar { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; padding: .7rem .8rem; margin-bottom: .9rem; border: 1px dashed var(--border-subtle); border-radius: 14px; background: var(--surface-subtle); }
	.blabel { color: var(--text-secondary); font-size: .7rem; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
	.rangebar input { flex: 1; min-width: 150px; height: 34px; padding: 0 .65rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); color: var(--text-primary); font-size: .82rem; }
	.rangebar select { height: 34px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); color: var(--text-primary); font-size: .8rem; padding: 0 .5rem; }
	.apply { height: 34px; padding: 0 .9rem; border: 0; border-radius: 10px; background: var(--accent); color: white; font-size: .78rem; font-weight: 750; }
	.msg { font-size: .74rem; font-weight: 650; color: var(--danger); }
	.msg.ok { color: var(--success); }
	.sheet { border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; background: var(--surface-panel); }
	.sheet.dragging { user-select: none; }
	.qrow { display: grid; grid-template-columns: 64px 54px 118px 1fr 132px 84px; align-items: center; gap: .4rem; padding: .38rem .7rem; border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 45%); }
	.qrow.head { border-top: 0; background: var(--surface-subtle); color: var(--text-secondary); font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.qrow:not(.head):hover { background: var(--surface-subtle); }
	.qrow.sel { background: var(--accent-soft); }
	.qn { color: var(--text-secondary); font-size: .78rem; font-weight: 750; font-variant-numeric: tabular-nums; cursor: grab; touch-action: none; user-select: none; }
	.qn.qsel { color: var(--accent); }
	.sheet.dragging .qn { cursor: grabbing; }
	.qrow.head .qn-head { display: flex; align-items: center; gap: .4rem; }
	.selall { display: grid; place-items: center; width: 20px; height: 20px; border: 1.5px solid var(--border-subtle); border-radius: 6px; color: transparent; background: var(--surface-panel); }
	.selall[aria-pressed="true"] { border-color: var(--accent); background: var(--accent); color: white; }
	.qrow.done .qn { color: var(--text-primary); }
	.check { display: grid; place-items: center; width: 26px; height: 26px; border: 1.5px solid var(--border-subtle); border-radius: 8px; color: transparent; background: var(--surface-panel); }
	.check.on { border-color: var(--success); background: var(--success); color: white; }
	.c-bub { display: flex; align-items: center; gap: .3rem; }
	.bub { display: grid; place-items: center; width: 26px; height: 26px; border: 1.5px solid var(--border-subtle); border-radius: 99px; color: var(--text-secondary); background: var(--surface-panel); }
	.bub.c.on { border-color: var(--success); background: var(--success); color: white; }
	.bub.w.on { border-color: var(--danger); background: var(--danger); color: white; }
	.why { height: 22px; padding: 0 .45rem; border: 1px solid var(--danger); border-radius: 99px; background: transparent; color: var(--danger); font-size: .6rem; font-weight: 800; letter-spacing: .04em; }
	.c-note input { width: 100%; height: 30px; padding: 0 .55rem; border: 1px solid transparent; border-radius: 9px; background: transparent; color: var(--text-primary); font-size: .8rem; }
	.c-note input:hover, .c-note input:focus { border-color: var(--border-subtle); background: var(--surface-panel); outline: none; }
	.c-marks { display: flex; gap: .3rem; }
	.flag, .stuck { height: 24px; padding: 0 .5rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .05em; }
	.flag.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
	.stuck.on { border-color: var(--warning); background: color-mix(in srgb, var(--warning), transparent 84%); color: var(--warning); }
	.c-stars { display: flex; gap: .1rem; }
	.star { border: 0; background: transparent; color: var(--border-subtle); font-size: 1rem; line-height: 1; padding: .1rem; }
	.star.on { color: var(--warning); }
	.empty { padding: 2rem 1rem; text-align: center; color: var(--text-secondary); font-size: .84rem; }
	.hint { margin: .7rem 0 0; color: var(--text-secondary); font-size: .74rem; }
	.selbar { position: fixed; z-index: 60; left: 50%; transform: translateX(-50%); bottom: 1.2rem; display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; padding: .6rem .8rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.selbar .n { color: var(--accent); font-size: .78rem; font-weight: 800; }
	.confirm-body { margin: 0; color: var(--text-secondary); font-size: .86rem; line-height: 1.55; }
	.ghostbtn { height: 36px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .8rem; font-weight: 700; }
	.dangerbtn { height: 36px; padding: 0 1rem; border: 0; border-radius: 10px; background: var(--danger); color: white; font-size: .8rem; font-weight: 750; }
	@media (max-width: 860px) {
		.qrow { grid-template-columns: 48px 40px 96px 108px 70px; padding-inline: .45rem; }
		.c-note { display: none; }
		.qrow.head span:nth-child(4) { display: none; }
	}
</style>
