<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { isFlag, resultOf } from '$lib/state/questions';
	import { allChapters, cellKey, questionCount, visibleExercises } from '$lib/state/syllabus';
	import { subjectColor, subjectName } from '$lib/state/subjects';

	interface ReviewQuestion {
		id: string;
		subject: string;
		chapter: string;
		exercise: string;
		number: number;
		retry: boolean;
		stuck: boolean;
	}

	const subjects = [
		{ code: 'P', label: 'Physics' },
		{ code: 'C', label: 'Chemistry' },
		{ code: 'M', label: 'Maths' }
	] as const;

	let activeSubject: (typeof subjects)[number]['code'] = 'P';

	$: questions = (() => {
		const next: ReviewQuestion[] = [];
		for (const subject of ['P', 'C', 'M']) {
			for (const chapter of allChapters(subject)) {
				for (const exercise of visibleExercises($tracker, subject, chapter.no)) {
					const count = questionCount($tracker, subject, chapter.no, exercise.code);
					const cells = $tracker.d[cellKey(subject, chapter.no, exercise.code)] ?? [];
					for (let index = 0; index < count; index++) {
						const value = cells[index] ?? 0;
						const retry = isFlag(value);
						const stuck = resultOf(value) === 3;
						if (retry || stuck) {
							next.push({
								id: `${subject}-${chapter.no}-${exercise.code}-${index}`,
								subject,
								chapter: chapter.name,
								exercise: exercise.name,
								number: index + 1,
								retry,
								stuck
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

<section class="review">
	<header class="hero">
		<div>
			<p class="eyebrow">Question queue</p>
			<h1>Review</h1>
			<p>Questions you marked to retry or could not solve.</p>
		</div>
		<div class="summary" aria-label="Review summary">
			<span><b>{activeQuestions.length}</b> total</span>
			<span class="retry"><b>{retryCount}</b> retry</span>
			<span class="stuck"><b>{stuckCount}</b> stuck</span>
		</div>
	</header>

	<div class="tabs" role="tablist" aria-label="Review subject">
		{#each subjects as subject}
			<button
				type="button"
				role="tab"
				class:active={activeSubject === subject.code}
				aria-selected={activeSubject === subject.code}
				on:click={() => activeSubject = subject.code}
			>
				{subject.label}
				<span>{questions.filter((question) => question.subject === subject.code).length}</span>
			</button>
		{/each}
	</div>

	{#if activeQuestions.length}
		<div class="question-list">
			{#each activeQuestions as question (question.id)}
				<article class="question">
					<span class="number">Q{String(question.number).padStart(3, '0')}</span>
					<div class="copy">
						<span class="subject" style:--subject-color={subjectColor(question.subject)}>{subjectName(question.subject)}</span>
						<strong>{question.chapter}</strong>
						<span>{question.exercise}</span>
					</div>
					<div class="marks" aria-label="Question status">
						{#if question.retry}<span class="retry">Retry</span>{/if}
						{#if question.stuck}<span class="stuck">Stuck</span>{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty">
			<h2>{subjectName(activeSubject)} review queue is clear</h2>
			<p>Mark a question <b>Retry</b> or <b>Stuck</b> from the Question Log to find it here.</p>
		</div>
	{/if}
</section>

<style>
	.review { display: grid; gap: 1.2rem; max-width: 940px; }
	.hero { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding: 1.4rem 1.5rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); }
	.eyebrow { margin: 0 0 .28rem; color: var(--accent); font-size: .67rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
	h1 { margin: 0; font-size: 1.55rem; letter-spacing: -.045em; }
	.hero p:not(.eyebrow) { margin: .4rem 0 0; color: var(--text-secondary); font-size: .84rem; }
	.summary { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .45rem; }
	.summary span, .marks span { display: inline-flex; align-items: center; min-height: 28px; padding: 0 .58rem; border: 1px solid var(--border-subtle); border-radius: 99px; color: var(--text-secondary); background: var(--surface-subtle); font-size: .7rem; font-weight: 750; }
	.summary b { margin-right: .22rem; color: var(--text-primary); }
	.summary .retry, .marks .retry { color: var(--accent); border-color: color-mix(in srgb, var(--accent), transparent 55%); background: var(--accent-soft); }
	.summary .stuck, .marks .stuck { color: var(--warning); border-color: color-mix(in srgb, var(--warning), transparent 55%); background: color-mix(in srgb, var(--warning), transparent 87%); }
	.tabs { display: flex; gap: .35rem; padding: .35rem; width: fit-content; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-panel); }
	.tabs button { display: inline-flex; align-items: center; gap: .45rem; min-height: 34px; padding: 0 .75rem; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; font-size: .76rem; font-weight: 750; }
	.tabs button:hover { color: var(--text-primary); background: var(--surface-subtle); }
	.tabs button.active { color: var(--accent); background: var(--accent-soft); }
	.tabs button span { display: grid; min-width: 18px; height: 18px; place-items: center; padding: 0 .25rem; border-radius: 99px; color: inherit; background: color-mix(in srgb, currentColor, transparent 88%); font-size: .62rem; font-variant-numeric: tabular-nums; }
	.question-list { display: grid; border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; background: var(--surface-panel); }
	.question { display: grid; grid-template-columns: 72px 1fr auto; align-items: center; gap: 1rem; min-height: 76px; padding: .85rem 1rem; border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 45%); }
	.question:first-child { border-top: 0; }
	.number { color: var(--text-secondary); font-size: .76rem; font-weight: 800; font-variant-numeric: tabular-nums; }
	.copy { display: grid; gap: .2rem; min-width: 0; }
	.copy strong { overflow: hidden; color: var(--text-primary); font-size: .86rem; text-overflow: ellipsis; white-space: nowrap; }
	.copy > span:last-child { color: var(--text-secondary); font-size: .74rem; }
	.subject { color: var(--subject-color); font-size: .65rem; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
	.marks { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .35rem; }
	.empty { padding: 3.5rem 1.25rem; border: 1px dashed var(--border-subtle); border-radius: 18px; color: var(--text-secondary); text-align: center; }
	.empty h2 { margin: 0 0 .45rem; color: var(--text-primary); font-size: 1.05rem; }
	.empty p { margin: 0; font-size: .82rem; }
	@media (max-width: 640px) {
		.hero { align-items: start; flex-direction: column; }
		.summary { justify-content: flex-start; }
		.question { grid-template-columns: 58px 1fr; gap: .7rem; }
		.marks { grid-column: 2; justify-content: flex-start; }
	}
</style>
