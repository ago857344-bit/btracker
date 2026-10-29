<script lang="ts">
	import { tracker, updateTracker, celebration, triggerToast, setQuestionResult, toggleQuestionFlag, setQuestionNote, setQuestionReasons, addWrongTag } from '$lib/stores/tracker';
	import { isFlag, resultOf } from '$lib/state/questions';
	import { allChaptersWithCustom, cellKey, questionCount, visibleExercises, questionKey } from '$lib/state/syllabus';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { Flashcard } from '$lib/types/tracker';

	interface ReviewQuestion {
		id: string;
		subject: string;
		chapterNo: number;
		chapter: string;
		exerciseCode: string;
		exercise: string;
		index: number;
		number: number;
		retry: boolean;
		stuck: boolean;
		qk: string;
		note?: string;
		reasonTags: string[];
	}

	const subjects = [
		{ code: 'P', label: 'Physics' },
		{ code: 'C', label: 'Chemistry' },
		{ code: 'M', label: 'Maths' }
	] as const;

	let activeSubject: (typeof subjects)[number]['code'] = 'P';

	function cardFront(q: ReviewQuestion) {
		return `${q.chapter} · ${q.exercise} (Q${q.number})`;
	}

	function isCardSaved(q: ReviewQuestion) {
		const target = cardFront(q);
		return ($tracker.flashcards || []).some(c => c.front === target);
	}

	function convertToFlashcard(q: ReviewQuestion) {
		const front = cardFront(q);
		const reason = q.stuck ? 'Stuck question' : 'Marked for retry';
		const back = `${reason} in ${q.chapter} (${q.exercise}).\nKey step: Recall the core formula, boundary conditions, and the critical step where mistakes occurred.`;
		
		updateTracker(s => {
			if (!s.flashcards) s.flashcards = [];
			if (s.flashcards.some(c => c.front === front)) return;
			const card: Flashcard = {
				id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
				front,
				back,
				subject: q.subject,
				chapter: q.chapter,
				interval: 1,
				repetition: 0,
				efactor: 2.5,
				nextReviewAt: Date.now()
			};
			s.flashcards.push(card);
		});
		triggerToast('Added to Active Recall Flashcards! 🗂️');
	}

	function markSolvedAndCorrect(q: ReviewQuestion) {
		const loc = { sc: q.subject, ch: q.chapterNo, ex: q.exerciseCode };
		setQuestionResult(loc, q.index, 1);
		const cells = $tracker.d?.[cellKey(q.subject, q.chapterNo, q.exerciseCode)] ?? [];
		if (isFlag(cells[q.index] || 0)) {
			toggleQuestionFlag(loc, q.index);
		}
		triggerToast(`Q${q.number} marked solved & correct! 🎉`);
	}

	let editingQuestion: ReviewQuestion | null = null;
	let noteDraft = '';
	let selectedTagsDraft: string[] = [];
	let newCustomTag = '';

	function openEditNoteModal(q: ReviewQuestion) {
		editingQuestion = q;
		noteDraft = $tracker.n?.[q.qk] || '';
		selectedTagsDraft = [...($tracker.r?.[q.qk]?.t || [])];
		newCustomTag = '';
	}

	function toggleTagDraft(tagId: string) {
		if (selectedTagsDraft.includes(tagId)) {
			selectedTagsDraft = selectedTagsDraft.filter(id => id !== tagId);
		} else {
			selectedTagsDraft = [...selectedTagsDraft, tagId];
		}
	}

	function handleAddNewTag() {
		const trimmed = newCustomTag.trim();
		if (!trimmed) return;
		const id = addWrongTag(trimmed);
		selectedTagsDraft = [...selectedTagsDraft, id];
		newCustomTag = '';
	}

	function saveQuestionAnnotations() {
		if (!editingQuestion) return;
		const loc = { sc: editingQuestion.subject, ch: editingQuestion.chapterNo, ex: editingQuestion.exerciseCode };
		setQuestionNote(loc, editingQuestion.index, noteDraft);
		setQuestionReasons(loc, editingQuestion.index, selectedTagsDraft);
		triggerToast('Notes & mistake tags updated');
		editingQuestion = null;
	}

	$: questions = (() => {
		const next: ReviewQuestion[] = [];
		const tagMap = new Map(($tracker.x?.tags ?? []).map(t => [t.id, t.n]));

		for (const subject of ['P', 'C', 'M']) {
			for (const chapter of allChaptersWithCustom($tracker, subject)) {
				for (const exercise of visibleExercises($tracker, subject, chapter.no)) {
					const count = questionCount($tracker, subject, chapter.no, exercise.code);
					const cells = $tracker.d?.[cellKey(subject, chapter.no, exercise.code)] ?? [];
					for (let index = 0; index < count; index++) {
						const value = cells[index] ?? 0;
						const retry = isFlag(value);
						const stuck = resultOf(value) === 3;
						if (retry || stuck) {
							const qk = questionKey(subject, chapter.no, exercise.code, index);
							const note = $tracker.n?.[qk];
							const reasonRecord = $tracker.r?.[qk];
							const tagIds = reasonRecord?.t ?? [];
							const reasonTags = tagIds.map(tid => tagMap.get(tid) || tid);

							next.push({
								id: `${subject}-${chapter.no}-${exercise.code}-${index}`,
								subject,
								chapterNo: chapter.no,
								chapter: chapter.name,
								exerciseCode: exercise.code,
								exercise: exercise.name,
								index,
								number: index + 1,
								retry,
								stuck,
								qk,
								note,
								reasonTags
							});
						}
					}
				}
			}
		}
		return next;
	})();
	$: activeQuestions = questions.filter((question) => question.subject === activeSubject);
	$: retryCount = activeQuestions.filter((question) => question.retry).length;
	$: stuckCount = activeQuestions.filter((question) => question.stuck).length;
</script>

<svelte:head><title>Review · BTracker</title></svelte:head>

{#if $tracker.coaching_type === 'GENERIC'}
	<section class="review">
		<header class="page-header">
			<div class="page-header-copy">
				<span class="page-eyebrow">Universal Study Log</span>
				<h1 class="page-title">Review</h1>
				<p class="page-subtitle">Doubts and retries are captured with every session you log.</p>
			</div>
		</header>
		<div class="empty-state generic-empty">
			<div class="empty-state-icon">
				<NavIcon name="layers" size={24} />
			</div>
			<h2 class="empty-state-title">Question-level review is built for BT modules</h2>
			<p class="empty-state-desc">Your universal log tracks attempted, solved and doubt counts per chapter instead. Revisit those chapters from the Study Log.</p>
			<a class="btn-log" href="/log"><NavIcon name="layers" size={14} /> Open Study Log</a>
		</div>
	</section>
{:else}
<section class="review">
	<header class="page-header">
		<div class="page-header-copy">
			<span class="page-eyebrow">Smart Doubt Queue</span>
			<h1 class="page-title">Review</h1>
			<p class="page-subtitle">Questions you marked to retry or could not solve across physics, chemistry, and mathematics.</p>
		</div>
		<div class="page-header-actions summary" aria-label="Review summary">
			<span class="kpi-pill"><b>{activeQuestions.length}</b> total</span>
			<span class="kpi-pill retry"><b>{retryCount}</b> retry</span>
			<span class="kpi-pill stuck"><b>{stuckCount}</b> stuck</span>
		</div>
	</header>

	<div class="segmented-control" role="tablist" aria-label="Review subject" style="margin-bottom: 1rem;">
		{#each subjects as subject}
			<button
				type="button"
				role="tab"
				class:active={activeSubject === subject.code}
				aria-selected={activeSubject === subject.code}
				on:click={() => activeSubject = subject.code}
			>
				{subject.label}
				<span class="due-badge" style="margin-left: 4px;">{questions.filter((question) => question.subject === subject.code).length}</span>
			</button>
		{/each}
	</div>

	{#if activeQuestions.length}
		<div class="question-list">
			{#each activeQuestions as question (question.id)}
				<article class="question">
					<span class="number">Q{String(question.number).padStart(3, '0')}</span>
					<div class="copy">
						<div class="copy-head">
							<span class="subject" style:--subject-color={subjectColor(question.subject)}>{subjectName(question.subject)}</span>
							<strong>{question.chapter}</strong>
							<span class="ex-name">{question.exercise}</span>
						</div>
						{#if question.reasonTags.length || question.note}
							<div class="q-annotations">
								{#if question.reasonTags.length}
									<div class="tag-row">
										{#each question.reasonTags as tag}
											<span class="reason-tag">{tag}</span>
										{/each}
									</div>
								{/if}
								{#if question.note}
									<p class="q-note"><NavIcon name="edit" size={11} /> <span>{question.note}</span></p>
								{/if}
							</div>
						{/if}
					</div>
					<div class="marks" aria-label="Question status and quick actions">
						{#if question.retry}<span class="badge retry">Retry</span>{/if}
						{#if question.stuck}<span class="badge stuck">Stuck</span>{/if}

						<button type="button" class="action-btn solve-btn" on:click={() => markSolvedAndCorrect(question)} title="Mark Solved and Correct">
							<NavIcon name="check" size={12} />
							<span>Solve</span>
						</button>

						<button type="button" class="action-btn note-btn" on:click={() => openEditNoteModal(question)} title="Edit Note & Mistake Reasons">
							<NavIcon name="edit" size={12} />
							<span>{question.note || question.reasonTags.length ? 'Edit Note' : '+ Note'}</span>
						</button>

						<a href="/log?s={question.subject}&c={question.chapterNo}&e={question.exerciseCode}" class="action-btn open-btn" title="Open in Exercise Sheet">
							<NavIcon name="arrow-right" size={12} />
							<span>Sheet</span>
						</a>

						{#if isCardSaved(question)}
							<span class="flashcard-badge saved" title="Already added to Active Recall Flashcards">
								<NavIcon name="check" size={11} /> Flashcard
							</span>
						{:else}
							<button
								type="button"
								class="flashcard-btn"
								title="Convert to Active Recall Flashcard"
								on:click={() => convertToFlashcard(question)}
							>
								<NavIcon name="layers" size={12} /> + Flashcard
							</button>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<div class="empty-state-icon">
				<NavIcon name="target" size={24} />
			</div>
			<h3 class="empty-state-title">{subjectName(activeSubject)} review queue is clear</h3>
			<p class="empty-state-desc">Mark a question as <b>Retry</b> or <b>Stuck</b> from the Question Log to review it here.</p>
		</div>
	{/if}
</section>

{#if editingQuestion}
	<Modal open={true} title="Why did this go wrong? · Q{editingQuestion.number}" width="480px" on:close={() => (editingQuestion = null)}>
		<div class="note-modal-body">
			<p class="target-sub">{editingQuestion.chapter} · {editingQuestion.exercise} (Q{editingQuestion.number})</p>
			
			<div class="modal-sec">
				<label for="reviewNoteArea"><b>Notes / Key Takeaway</b></label>
				<textarea id="reviewNoteArea" rows="3" bind:value={noteDraft} placeholder="What formula was missed or where did the calculation slip?"></textarea>
			</div>

			<div class="modal-sec">
				<b>Mistake Reason Tags</b>
				<div class="tag-selector">
					{#each ($tracker.x?.tags || []) as tag}
						{@const isSelected = selectedTagsDraft.includes(tag.id)}
						<button type="button" class="tag-chip" class:selected={isSelected} on:click={() => toggleTagDraft(tag.id)}>
							{tag.n}
						</button>
					{/each}
				</div>
				<div class="add-tag-row">
					<input type="text" bind:value={newCustomTag} placeholder="Add new reason tag..." on:keydown={(e) => { if (e.key === 'Enter') handleAddNewTag(); }} />
					<button type="button" class="btn-add-tag" on:click={handleAddNewTag} disabled={!newCustomTag.trim()}>+ Add</button>
				</div>
			</div>
		</div>

		<svelte:fragment slot="footer">
			<button type="button" class="btn-ghost" on:click={() => (editingQuestion = null)}>Cancel</button>
			<button type="button" class="btn-solid" on:click={saveQuestionAnnotations}>Save Changes</button>
		</svelte:fragment>
	</Modal>
{/if}
{/if}

<style>
	.review { display: grid; gap: 1.2rem; max-width: 940px; }
	.summary { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .45rem; }
	.summary span { display: inline-flex; align-items: center; gap: .35rem; min-height: 28px; padding: 0 .58rem; border: 1px solid var(--border-subtle); border-radius: 99px; color: var(--text-secondary); background: var(--surface-subtle); font-size: .7rem; font-weight: 750; }
	.summary b { margin-right: .22rem; color: var(--text-primary); }
	.summary .retry { color: color-mix(in srgb, var(--accent) 60%, var(--text-primary)); border-color: color-mix(in srgb, var(--accent), transparent 55%); background: var(--accent-soft); }
	.summary .stuck { color: color-mix(in srgb, var(--warning) 45%, var(--text-primary)); border-color: color-mix(in srgb, var(--warning), transparent 55%); background: color-mix(in srgb, var(--warning), transparent 87%); }
	.flashcard-btn { display: inline-flex; align-items: center; gap: .35rem; min-height: 28px; padding: 0 .58rem; border: 1px solid var(--border-subtle); border-radius: 99px; background: var(--surface-subtle); font-size: .7rem; font-weight: 750; cursor: pointer; color: var(--text-primary); transition: all .15s ease; font-family: inherit; }
	.flashcard-btn:hover { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent), transparent 85%); }
	.flashcard-badge.saved { display: inline-flex; align-items: center; gap: .35rem; min-height: 28px; padding: 0 .58rem; border-radius: 99px; font-size: .7rem; font-weight: 750; color: color-mix(in srgb, var(--success) 45%, var(--text-primary)); border: 1px solid color-mix(in srgb, var(--success), transparent 55%); background: color-mix(in srgb, var(--success), transparent 88%); }

	.question-list {
		display: grid;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 20px;
		overflow: hidden;
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(20px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(20px));
		box-shadow: var(--shadow-card), var(--vision-bevel-inner);
	}
	.question {
		position: relative;
		z-index: 3;
		display: grid;
		grid-template-columns: 72px 1fr auto;
		align-items: center;
		gap: 1rem;
		min-height: 76px;
		padding: .85rem 1.15rem;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 45%);
		transition: background 0.18s ease;
	}
	.question:hover {
		background: color-mix(in srgb, var(--accent) 6%, transparent);
	}
	.question:first-child { border-top: 0; }
	.number { color: var(--text-secondary); font-size: .76rem; font-weight: 800; font-variant-numeric: tabular-nums; }
	.copy { display: grid; gap: .25rem; min-width: 0; }
	.copy-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.copy strong { overflow: hidden; color: var(--text-primary); font-size: .86rem; text-overflow: ellipsis; white-space: nowrap; }
	.ex-name { color: var(--text-secondary); font-size: .74rem; }
	.subject { color: var(--subject-color); font-size: .65rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }

	.q-annotations { display: grid; gap: 0.3rem; margin-top: 0.15rem; }
	.tag-row { display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.reason-tag {
		padding: 0.12rem 0.45rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--danger, #ef4444) 15%, transparent);
		color: color-mix(in srgb, var(--danger, #ef4444) 75%, var(--text-primary));
		border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
		font-size: 0.65rem;
		font-weight: 750;
		letter-spacing: 0.02em;
	}
	.q-note {
		margin: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-secondary);
		font-size: 0.72rem;
		background: var(--surface-subtle);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		border: 1px dashed var(--border-subtle);
		max-width: 100%;
		word-break: break-word;
	}

	.marks { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: .35rem; }
	.badge { display: inline-flex; align-items: center; min-height: 28px; padding: 0 .58rem; border: 1px solid var(--border-subtle); border-radius: 99px; font-size: .7rem; font-weight: 750; }
	.badge.retry { color: color-mix(in srgb, var(--accent) 60%, var(--text-primary)); border-color: color-mix(in srgb, var(--accent), transparent 55%); background: var(--accent-soft); }
	.badge.stuck { color: color-mix(in srgb, var(--warning) 45%, var(--text-primary)); border-color: color-mix(in srgb, var(--warning), transparent 55%); background: color-mix(in srgb, var(--warning), transparent 87%); }

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 28px;
		padding: 0 0.65rem;
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 750;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.15s ease;
		font-family: inherit;
	}
	.action-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: var(--surface-panel);
	}
	.action-btn.solve-btn {
		color: var(--success, #10b981);
		border-color: color-mix(in srgb, var(--success, #10b981), transparent 60%);
		background: color-mix(in srgb, var(--success, #10b981), transparent 90%);
	}
	.action-btn.solve-btn:hover {
		background: color-mix(in srgb, var(--success, #10b981), transparent 80%);
		border-color: var(--success, #10b981);
	}
	.action-btn.note-btn:hover {
		color: var(--accent);
		border-color: var(--accent);
		background: var(--accent-soft);
	}
	.action-btn.open-btn:hover {
		color: var(--text-primary);
		border-color: var(--text-primary);
	}

	/* Modal body styling */
	.note-modal-body { display: grid; gap: 1rem; }
	.target-sub { margin: 0; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; }
	.modal-sec { display: grid; gap: 0.4rem; }
	.modal-sec b { font-size: 0.78rem; color: var(--text-primary); }
	.modal-sec textarea {
		width: 100%;
		padding: 0.65rem;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.86rem;
		resize: vertical;
	}
	.modal-sec textarea:focus { outline: none; border-color: var(--accent); }
	.tag-selector { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.tag-chip {
		padding: 0.3rem 0.7rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}
	.tag-chip.selected {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-panel));
		border-color: var(--accent);
		color: var(--accent);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent), transparent 75%);
	}
	.add-tag-row { display: flex; gap: 0.4rem; margin-top: 0.2rem; }
	.add-tag-row input {
		flex: 1;
		padding: 0.45rem 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.78rem;
		font-family: inherit;
	}
	.btn-add-tag {
		padding: 0 0.85rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 750;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-add-tag:disabled { opacity: 0.45; cursor: default; }
	.btn-ghost, .btn-solid {
		height: 36px;
		padding: 0 1rem;
		border-radius: 10px;
		font-size: 0.78rem;
		font-weight: 750;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-ghost { border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); }
	.btn-ghost:hover { color: var(--text-primary); border-color: var(--accent); }
	.btn-solid { border: 0; background: var(--accent); color: var(--accent-contrast, #fff); }

	.generic-empty { display: flex; flex-direction: column; align-items: center; gap: .55rem; padding: 3rem 1.25rem; }
	.generic-empty p { max-width: 48ch; line-height: 1.55; }
	.btn-log { display: inline-flex; align-items: center; gap: .4rem; margin-top: .6rem; padding: .6rem 1rem; border-radius: 11px; background: var(--accent); color: var(--accent-contrast, #fff); font-size: .8rem; font-weight: 750; text-decoration: none; }
	@media (max-width: 768px) {
		.summary { justify-content: flex-start; }
		.question-list { touch-action: pan-y; }
		.question { grid-template-columns: 58px 1fr; gap: .7rem; padding: 1rem 0.9rem; touch-action: pan-y; }
		.marks { grid-column: 2; justify-content: flex-start; }
		.marks span, .marks button, .marks a { min-height: 32px; padding: 0 0.65rem; }
	}
</style>
