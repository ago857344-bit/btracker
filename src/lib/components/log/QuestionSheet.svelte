<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { uiClick, uiPop } from '$lib/utils/feedback';
	import { fly } from 'svelte/transition';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ReasonsModal from '$lib/components/log/ReasonsModal.svelte';
	import {
		applyQuestionAction, bulkExercise, setQuestionCount, setQuestionNote, setQuestionReasons, setQuestionResult,
		setQuestionStars, toggleQuestionDone, toggleQuestionFlag, tracker, updateTracker, celebration, triggerToast,
		type QuestionAction, type QuestionLoc
	} from '$lib/stores/tracker';
	import { boostChapterFromPractice } from '$lib/stores/recall-actions';
	import { cellKey, questionCount, questionKey, syllabusChapter } from '$lib/state/syllabus';
	import { subjectName } from '$lib/state/subjects';
	import type { Flashcard, MistakeLog } from '$lib/types/tracker';
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
	let showEditCount = false;
	let editCountVal = 1;

	let anchor: number | null = null;
	let lastClicked: number | null = null;
	let dragging = false;
	let startX = 0;
	let startY = 0;
	let rowRects: { i: number; top: number; bottom: number }[] = [];
	let paintAction: 'flag' | 'cant' | null = null;
	let painted = new Set<number>();
	let focusedRowIndex: number | null = null;

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

	function determineErrorType(reasons: string[]): MistakeLog['errorType'] {
		const lower = reasons.join(' ').toLowerCase();
		if (lower.includes('calc') || lower.includes('silly')) return 'Silly';
		if (lower.includes('form') || lower.includes('theo') || lower.includes('meth')) return 'Formula';
		if (lower.includes('time')) return 'Time';
		return 'Conceptual';
	}

	$: syncedCardFronts = new Set(($tracker.flashcards || []).map((c) => c.front));

	function isSynced(i: number): boolean {
		const chObj = syllabusChapter(loc.sc, loc.ch);
		const chName = chObj?.name ?? `Chapter ${loc.ch}`;
		const front = `${chName} · ${exName} (Q${i + 1})`;
		return syncedCardFronts.has(front);
	}

	function syncMistakes(indices?: number[]) {
		const targetIndices = indices ?? order.filter((i) => {
			const v = cells[i] || 0;
			const r = resultOf(v);
			return r === 2 || r === 3;
		});

		if (!targetIndices.length) return;

		const chObj = syllabusChapter(loc.sc, loc.ch);
		const chName = chObj?.name ?? `Chapter ${loc.ch}`;
		const subName = subjectName(loc.sc);

		let addedCards = 0;
		let addedMistakes = 0;

		updateTracker((t) => {
			if (!t.flashcards) t.flashcards = [];
			if (!t.mistakes) t.mistakes = [];

			for (const i of targetIndices) {
				const v = cells[i] || 0;
				const r = resultOf(v);
				const qk = questionKey(loc.sc, loc.ch, loc.ex, i);
				const note = t.n?.[qk] ?? '';
				const reasons = t.r?.[qk]?.t ?? [];
				const front = `${chName} · ${exName} (Q${i + 1})`;
				const testName = `${chName} · ${exName}`;
				const desc = `Q${i + 1}: ${note || (r === 3 ? 'Stuck / Could not solve' : 'Wrong answer')} ${reasons.length ? `[${reasons.join(', ')}]` : ''}`;

				if (!t.flashcards.some((c) => c.front === front)) {
					const reasonText = reasons.length ? reasons.join(', ') : (r === 3 ? 'Stuck question' : 'Incorrect attempt');
					const back = `${reasonText} in ${chName} (${exName}).\n${note ? `Note: ${note}\n` : ''}Key focus: Re-derive core formulas, note boundary conditions, and fix mistake trap.`;
					t.flashcards.push({
						id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
						front,
						back,
						subject: subName,
						chapter: chName,
						interval: 1,
						repetition: 0,
						efactor: 2.5,
						nextReviewAt: Date.now()
					});
					addedCards++;
				}

				if (!t.mistakes.some((m) => m.testName === testName && m.description.startsWith(`Q${i + 1}:`))) {
					t.mistakes.push({
						id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
						date: Date.now(),
						subject: subName,
						errorType: determineErrorType(reasons),
						description: desc,
						testName
					});
					addedMistakes++;
				}
			}
		});

		uiPop();
		if (addedCards > 0 || addedMistakes > 0) {
			celebration.set(`Synced ${targetIndices.length} question(s) to Flashcards & Mistake Vault! 🎯`);
		} else {
			celebration.set(`Selected questions are already synced to Flashcards & Vault! ✨`);
		}
	}

	$: allSelected = order.length > 0 && order.every((i) => sel.has(i));

	function saveCount() {
		const val = parseInt(editCountVal as any, 10);
		if (!isNaN(val) && val >= 1) {
			setQuestionCount(loc, val);
		}
		showEditCount = false;
	}

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
	function beginMarkPaint(event: PointerEvent, i: number, action: 'flag' | 'cant') {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		paintAction = action;
		painted = new Set([i]);
	}
	function paintAt(event: PointerEvent) {
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const row = target?.closest('.qrow[data-i]') as HTMLElement | null;
		const i = Number(row?.dataset.i);
		if (!Number.isInteger(i) || painted.has(i)) return;
		painted = new Set([...painted, i]);
	}
	function finishMarkPaint() {
		if (!paintAction) return;
		const indices = [...painted];
		if (indices.length === 1) {
			if (paintAction === 'flag') toggleQuestionFlag(loc, indices[0]);
			else setQuestionResult(loc, indices[0], 3);
		} else {
			applyQuestionAction(loc, indices, paintAction);
		}
		paintAction = null;
		painted = new Set();
	}
	function onMarkClick(event: MouseEvent, i: number, action: 'flag' | 'cant') {
		if (event.detail !== 0) return;
		if (action === 'flag') toggleQuestionFlag(loc, i);
		else setQuestionResult(loc, i, 3);
	}
	function onMove(event: PointerEvent) {
		if (paintAction) { paintAt(event); return; }
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
		if (paintAction) { finishMarkPaint(); return; }
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
		if (kind === 'clear') {
			const ck = cellKey(loc.sc, loc.ch, loc.ex);
			const backup = [...($tracker.d?.[ck] ?? [])];
			bulkExercise(loc, kind);
			triggerToast({
				text: `Cleared ${exName}`,
				actionLabel: 'Undo',
				onAction: () => {
					updateTracker((s) => {
						if (!s.d) s.d = {};
						s.d[ck] = [...backup];
					});
				}
			});
		} else {
			bulkExercise(loc, kind);
		}
		confirm = null;
		clearSel();
	}

	const CONFIRM_COPY: Record<'done' | 'correct' | 'clear', { title: string; body: string; cta: string }> = {
		done: { title: 'Mark all solved?', body: `This ticks all ${n} questions in ${exName} as solved. Questions already marked keep their result.`, cta: 'Mark all solved' },
		correct: { title: 'Mark all correct?', body: `This marks all ${n} questions in ${exName} as solved and correct. Anything recorded as wrong will be overwritten.`, cta: 'Mark all correct' },
		clear: { title: 'Clear this exercise?', body: `This erases every tick, result, star and note in ${exName}.`, cta: 'Clear exercise' }
	};

	function scrollFocusedRow() {
		if (focusedRowIndex === null) return;
		const row = document.querySelector(`.qrow[data-i="${focusedRowIndex}"]`);
		row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}

	function handleSheetKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		const tag = target?.tagName?.toLowerCase();
		if (target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
		if (reasonIndex !== null || confirm !== null || showEditCount) return;
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		if (e.key === 'j' || e.key === 'J') {
			e.preventDefault();
			if (!order.length) return;
			if (focusedRowIndex === null) {
				focusedRowIndex = order[0];
			} else {
				const currentPos = order.indexOf(focusedRowIndex);
				if (currentPos === -1 || currentPos >= order.length - 1) {
					focusedRowIndex = order[0];
				} else {
					focusedRowIndex = order[currentPos + 1];
				}
			}
			scrollFocusedRow();
		} else if (e.key === 'k' || e.key === 'K') {
			e.preventDefault();
			if (!order.length) return;
			if (focusedRowIndex === null) {
				focusedRowIndex = order[order.length - 1];
			} else {
				const currentPos = order.indexOf(focusedRowIndex);
				if (currentPos <= 0) {
					focusedRowIndex = order[order.length - 1];
				} else {
					focusedRowIndex = order[currentPos - 1];
				}
			}
			scrollFocusedRow();
		} else if (focusedRowIndex !== null) {
			if (e.key === 'x' || e.key === 'X') {
				e.preventDefault();
				toggleQuestionDone(loc, focusedRowIndex);
			} else if (e.key === 'c' || e.key === 'C') {
				e.preventDefault();
				setQuestionResult(loc, focusedRowIndex, 1);
			} else if (e.key === 'w' || e.key === 'W') {
				e.preventDefault();
				markWrong(focusedRowIndex);
			} else if (e.key === 's' || e.key === 'S') {
				e.preventDefault();
				setQuestionResult(loc, focusedRowIndex, 3);
			} else if (e.key === 'r' || e.key === 'R') {
				e.preventDefault();
				toggleQuestionFlag(loc, focusedRowIndex);
			}
		}
	}
</script>

<svelte:window on:pointermove={onMove} on:pointerup={onUp} on:keydown={handleSheetKeydown} />

<div class="sheet-head">
	<div>
		<p class="eyebrow">{exTag}</p>
		<h2 style="display: flex; align-items: center; gap: 0.5rem;">
			{exName}
			<button type="button" class="btn-ghost" on:click={() => { editCountVal = n; showEditCount = true; }} style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-secondary); cursor: pointer;"><NavIcon name="edit" size={13} /></button>
		</h2>
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

{#if stats.wrong + stats.cant > 0}
	<div class="mistake-sync-banner" transition:fly={{ y: -6, duration: 200 }}>
		<div class="ms-left">
			<div class="ms-badge"><NavIcon name="bolt" size={15} /></div>
			<div class="ms-text">
				<span class="ms-title"><b>{stats.wrong + stats.cant}</b> Questions Need Spaced Recall</span>
				<span class="ms-sub">1-Click pipeline into Mistake Book & Active Recall Flashcards</span>
			</div>
		</div>
		<button type="button" class="sync-banner-btn" on:click={() => syncMistakes()}>
			<NavIcon name="layers" size={13} />
			<span>Sync to Deck & Vault</span>
		</button>
	</div>
{/if}

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

<div class="sheet" class:dragging={dragging || paintAction !== null}>
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
			class:kb-focus={focusedRowIndex === i}
			data-i={i}
			on:pointerdown={(e) => { focusedRowIndex = i; onRowPointerDown(e, i); }}
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
				<button
					type="button"
					class="flag"
					class:on={isFlag(v)}
					aria-pressed={isFlag(v)}
					on:pointerdown={(e) => beginMarkPaint(e, i, 'flag')}
					on:click={(e) => onMarkClick(e, i, 'flag')}
				>RETRY</button>
				<button
					type="button"
					class="stuck"
					class:on={r === 3}
					aria-pressed={r === 3}
					title="Could not solve"
					on:pointerdown={(e) => beginMarkPaint(e, i, 'cant')}
					on:click={(e) => onMarkClick(e, i, 'cant')}
				>STUCK</button>
				{#if r === 2 || r === 3}
					<button
						type="button"
						class="sync-pill"
						class:synced={isSynced(i)}
						title={isSynced(i) ? 'Already saved in Flashcards & Mistake Vault' : 'Sync to Flashcards & Mistake Vault'}
						on:click|stopPropagation={() => syncMistakes([i])}
					>
						<NavIcon name={isSynced(i) ? 'check' : 'layers'} size={11} />
						<span>{isSynced(i) ? 'SYNCED' : '+DECK'}</span>
					</button>
				{/if}
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
	<div class="selbar" transition:fly={{ y: 20, duration: 200 }} role="toolbar" aria-label="Selection actions">
		<span class="n">{sel.size} selected</span>
		<button type="button" class="tbtn" on:click={() => selectionAction('done')}>Mark solved</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('correct')}>Correct</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('wrong')}>Wrong</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('cant')}>Stuck</button>
		<button type="button" class="tbtn" on:click={() => selectionAction('flag')}>Review</button>
		<button type="button" class="tbtn" on:click={() => { syncMistakes([...sel]); clearSel(); }}>+ Vault & Deck</button>
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

{#if showEditCount}
	<Modal open={true} title="Edit Question Count" width="360px" on:close={() => (showEditCount = false)}>
		<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">Change the number of questions in {exName}.</p>
		<label style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.5rem;">
			<span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Number of Questions</span>
			<input type="number" min="1" max="2000" bind:value={editCountVal} style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-primary); font-size: 1rem;" />
		</label>
		<div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
			<button type="button" on:click={() => (showEditCount = false)} style="padding: 0.5rem 1rem; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-weight: 600;">Cancel</button>
			<button type="button" on:click={saveCount} style="padding: 0.5rem 1rem; background: var(--accent); color: var(--accent-contrast, white); border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">Save</button>
		</div>
	</Modal>
{/if}

<style>
	.sheet-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: .8rem; margin-bottom: 1rem; }
	h2 { margin: 0; font-size: 1.3rem; letter-spacing: -.03em; }
	.eyebrow { margin: 0 0 .2rem; color: var(--text-secondary); font-size: .68rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
	.statline { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem; color: var(--text-secondary); font-size: .76rem; font-weight: 650; }
	.statline b { color: var(--text-primary); }
	.statline .pct { padding: .2rem .55rem; border-radius: 99px; background: var(--accent); color: var(--accent-contrast, white); font-weight: 800; }
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
	.apply { height: 34px; padding: 0 .9rem; border: 0; border-radius: 10px; background: var(--accent); color: var(--accent-contrast, white); font-size: .78rem; font-weight: 750; }
	.msg { font-size: .74rem; font-weight: 650; color: var(--danger); }
	.msg.ok { color: var(--success); }
	.mistake-sync-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.7rem 1rem;
		margin-bottom: 0.85rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--surface-panel) 82%, var(--accent) 7%);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-subtle));
		box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.12);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
	.ms-left { display: flex; align-items: center; gap: 0.75rem; }
	.ms-badge {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 9px;
		background: var(--accent);
		color: #ffffff;
		flex-shrink: 0;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 40%, transparent);
	}
	.ms-text { display: flex; flex-direction: column; gap: 0.1rem; }
	.ms-title { font-size: 0.82rem; color: var(--text-primary); }
	.ms-title b { color: var(--accent); }
	.ms-sub { font-size: 0.72rem; color: var(--text-secondary); }
	.sync-banner-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		height: 32px;
		padding: 0 0.85rem;
		border-radius: 9px;
		border: 1px solid var(--accent);
		background: var(--accent);
		color: #ffffff;
		font-size: 0.75rem;
		font-weight: 750;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent);
	}
	.sync-banner-btn:hover {
		transform: translateY(-1px);
		filter: brightness(1.1);
	}
	.sync-banner-btn:active {
		transform: translateY(0);
	}
	.sync-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 24px;
		padding: 0 0.45rem;
		border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border-subtle));
		border-radius: 8px;
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
		color: var(--accent);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}
	.sync-pill:hover {
		background: var(--accent);
		color: #ffffff;
	}
	.sync-pill.synced {
		border-color: var(--success);
		background: color-mix(in srgb, var(--success) 12%, var(--surface-subtle));
		color: var(--success);
	}
	.sheet {
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		overflow: hidden;
		background: var(--surface-panel);
		touch-action: pan-y;
		-webkit-overflow-scrolling: touch;
		box-shadow: var(--shadow-card), var(--inner-glow);
	}
	.sheet.dragging { user-select: none; }
	.qrow {
		display: grid;
		grid-template-columns: 68px 54px 118px 1fr auto 84px;
		align-items: center;
		gap: .45rem;
		padding: .38rem .75rem;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 45%);
		touch-action: pan-y;
		transition: background 0.12s ease;
	}
	.qrow.head {
		position: sticky;
		top: 0;
		z-index: 5;
		border-top: 0;
		background: color-mix(in srgb, var(--surface-panel) 92%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--border-strong);
		color: var(--text-secondary);
		font-size: .66rem;
		font-weight: 800;
		letter-spacing: .08em;
		text-transform: uppercase;
	}
	.qrow:not(.head):hover {
		background: color-mix(in srgb, var(--surface-subtle) 75%, transparent);
	}
	.qrow.sel {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}
	.qrow.kb-focus {
		box-shadow: inset 3px 0 0 var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}
	.qn {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-variant-numeric: tabular-nums;
		font-size: 0.74rem;
		font-weight: 700;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 0.15rem 0.35rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		cursor: grab;
		touch-action: none;
		user-select: none;
		transition: all 0.14s ease;
	}
	.qn.qsel {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 45%, var(--border-subtle));
		background: color-mix(in srgb, var(--accent) 15%, var(--surface-subtle));
	}
	.sheet.dragging .qn { cursor: grabbing; }
	.qrow.head .qn-head { display: flex; align-items: center; gap: .4rem; }
	.selall { display: grid; place-items: center; width: 20px; height: 20px; border: 1.5px solid var(--border-subtle); border-radius: 6px; color: transparent; background: var(--surface-panel); cursor: pointer; transition: all 0.14s ease; }
	.selall[aria-pressed="true"] { border-color: var(--accent); background: var(--accent); color: var(--accent-contrast, white); }
	.qrow.done .qn { color: var(--text-primary); border-color: color-mix(in srgb, var(--border-subtle) 80%, var(--text-primary) 20%); }
	.check { display: grid; place-items: center; width: 26px; height: 26px; border: 1.5px solid var(--border-subtle); border-radius: 8px; color: transparent; background: var(--surface-panel); cursor: pointer; transition: all 0.14s ease; }
	.check:active { transform: scale(0.92); }
	.check.on { border-color: var(--success); background: var(--success); color: var(--accent-contrast, #fff); }
	.c-bub { display: flex; align-items: center; gap: .35rem; }
	.bub {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border: 1.5px solid var(--border-subtle);
		border-radius: 99px;
		color: var(--text-secondary);
		background: var(--surface-panel);
		cursor: pointer;
		transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
	}
	.bub:active { transform: scale(0.92); }
	.bub.c.on {
		border-color: var(--success);
		background: var(--success);
		color: var(--accent-contrast, #fff);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--success) 35%, transparent);
	}
	.bub.w.on {
		border-color: var(--danger);
		background: var(--danger);
		color: var(--accent-contrast, #fff);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--danger) 35%, transparent);
	}
	.why { height: 22px; padding: 0 .45rem; border: 1px solid var(--danger); border-radius: 99px; background: transparent; color: var(--danger); font-size: .6rem; font-weight: 800; letter-spacing: .04em; cursor: pointer; transition: all 0.14s ease; }
	.why:hover { background: color-mix(in srgb, var(--danger) 12%, transparent); }
	.c-note input { width: 100%; height: 30px; padding: 0 .55rem; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--text-primary); font-size: .8rem; transition: border-color 0.14s ease, background 0.14s ease; }
	.c-note input:hover, .c-note input:focus { border-color: var(--border-subtle); background: var(--surface-panel); outline: none; }
	.c-marks { display: flex; align-items: center; gap: .3rem; flex-wrap: nowrap; }
	.flag, .stuck { height: 24px; padding: 0 .5rem; border: 1px solid var(--border-subtle); border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .05em; white-space: nowrap; cursor: pointer; transition: all 0.14s ease; }
	.flag:active, .stuck:active { transform: scale(0.94); }
	.flag.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
	.stuck.on { border-color: var(--warning); background: color-mix(in srgb, var(--warning), transparent 84%); color: var(--warning); }
	.c-stars { display: flex; gap: .1rem; }
	.star { border: 0; background: transparent; color: var(--border-subtle); font-size: 1.15rem; line-height: 1; padding: .2rem; min-width: 20px; min-height: 20px; cursor: pointer; transition: transform 0.14s ease, color 0.14s ease; }
	.star:hover { transform: scale(1.18); }
	.star.on { color: var(--warning); }
	.empty { padding: 2rem 1rem; text-align: center; color: var(--text-secondary); font-size: .84rem; }
	.hint { margin: .7rem 0 0; color: var(--text-secondary); font-size: .74rem; }
	.selbar {
		position: fixed;
		bottom: calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 90;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 0.85rem;
		border-radius: 16px;
		background: var(--surface-popup, rgba(18, 16, 32, 0.94));
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid var(--border-strong);
		box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5), var(--inner-glow);
		max-width: calc(100vw - 2rem);
		overflow-x: auto;
	}
	.selbar .n {
		font-variant-numeric: tabular-nums;
		font-size: .75rem;
		font-weight: 800;
		background: var(--accent-soft);
		color: var(--accent);
		border-radius: 9999px;
		padding: 0.2rem 0.65rem;
	}
	.selbar .tbtn {
		border-radius: 9999px;
		height: 32px;
		padding: 0 0.85rem;
		font-weight: 650;
		cursor: pointer;
		transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
	}
	.selbar .tbtn:active {
		transform: scale(0.95);
	}
	.confirm-body { margin: 0; color: var(--text-secondary); font-size: .86rem; line-height: 1.55; }
	.ghostbtn { height: 36px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .8rem; font-weight: 700; }
	.dangerbtn { height: 36px; padding: 0 1rem; border: 0; border-radius: 10px; background: var(--danger); color: var(--accent-contrast, #fff); font-size: .8rem; font-weight: 750; }
	@media (max-width: 860px) {
		.qrow { grid-template-columns: 42px 36px 80px 1fr auto 72px; padding-inline: .35rem; gap: .25rem; }
		.c-note { display: none; }
		.qrow.head span:nth-child(4) { display: none; }
	}
	@media (max-width: 768px) {
		.sheet { margin-bottom: 4rem; }
		.selbar {
			bottom: calc(max(env(safe-area-inset-bottom, 0px), 12px) + 74px);
			width: calc(100% - 1.5rem);
			max-width: 440px;
			justify-content: center;
			box-shadow: 0 8px 30px rgba(0, 0, 0, 0.28);
		}
		.rangebar {
			flex-direction: column;
			align-items: stretch;
			gap: 0.45rem;
		}
		.rangebar input, .rangebar select, .rangebar .apply {
			width: 100%;
			min-width: 0;
		}
	}
	@media (max-width: 580px) {
		.mistake-sync-banner { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
		.sync-banner-btn { width: 100%; justify-content: center; }
	}
	@media (max-width: 480px) {
		.qrow { grid-template-columns: 36px 32px 72px 1fr auto; padding-inline: .25rem; gap: .2rem; }
		.c-note { display: none; }
		.c-stars { display: none; }
		.qrow.head span:nth-child(4) { display: none; }
		.qrow.head span:nth-child(6) { display: none; }
		.sync-pill span { display: none; }
	}
</style>
