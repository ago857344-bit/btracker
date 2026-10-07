<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import HealthBar from '$lib/components/recall/HealthBar.svelte';
	import { tracker, celebration } from '$lib/stores/tracker';
	import { recordChapterRevision } from '$lib/stores/recall-actions';
	import { calculateCurrentScore, calculateHealthStatus } from '$lib/state/decay';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import { createChapterRecallData } from '$lib/state/defaults';
	import type { ChapterRecallData, ConfidenceRating, ModalityTag } from '$lib/types/tracker';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let open = false;
	export let chapterKey = '';
	export let chapter: ChapterRecallData | null = null;

	// Timer State (Phase 4)
	let mode: 'timer' | 'evaluate' = 'timer';
	let timerMinutes = 10;
	let secondsLeft = timerMinutes * 60;
	let timerInterval: any;
	
	// Evaluation State
	let confidence: ConfidenceRating = 'good';
	let selectedModalities: ModalityTag[] = ['blank-page'];
	let timeSpentMinutes = 10;

	$: resolvedChapter = chapter ?? $tracker.rev.chapters[chapterKey] ?? (chapterKey ? createChapterRecallData(chapterKey, 2) : null);
	$: [subCode, ...restParts] = (chapterKey || resolvedChapter?.chapterKey || 'P-Chapter').split(/[-:]/);
	$: subject = subCode || 'P';
	$: chapterTitle = restParts.join('-').trim() || resolvedChapter?.chapterKey || chapterKey || 'Chapter';
	$: color = subjectColor(subject);
	$: name = subjectName(subject);
	
	$: currentScore = calculateCurrentScore(resolvedChapter?.decay || { r0: 100, halfLife: 7, lastRevisionAt: null, currentScore: 100, history: [] });
	$: health = calculateHealthStatus(currentScore);
	$: halfLife = resolvedChapter?.decay?.halfLife ?? 7;
	$: weightage = resolvedChapter?.weightage ?? 2;

	const MODALITY_OPTIONS: { id: ModalityTag; label: string; icon: string }[] = [
		{ id: 'blank-page', label: 'Blank Page Recall', icon: '📄' },
		{ id: 'timed-pyqs', label: 'Timed PYQs', icon: '⏱️' },
		{ id: 'formula-sheet', label: 'Formula Sheet', icon: '📐' },
		{ id: 'error-log', label: 'Error Log Review', icon: '❌' },
		{ id: 'derivations', label: 'Derivations', icon: '✏️' }
	];

	const RATINGS: { id: ConfidenceRating; label: string; desc: string; score: number; color: string }[] = [
		{ id: 'again', label: '1 · Again', desc: 'Forgot completely (Score: 60%, τ halved)', score: 60, color: 'var(--danger)' },
		{ id: 'hard', label: '3 · Hard', desc: 'Recalled with effort (Score: 75%, τ ×0.8)', score: 75, color: 'var(--warning)' },
		{ id: 'good', label: '4 · Good', desc: 'Recalled smoothly (Score: 85%, τ ×1.2)', score: 85, color: 'var(--success)' },
		{ id: 'easy', label: '5 · Easy', desc: 'Instant mastery (Score: 95%, τ ×2.0)', score: 95, color: 'var(--accent)' }
	];

	function toggleModality(mod: ModalityTag) {
		if (selectedModalities.includes(mod)) {
			if (selectedModalities.length > 1) {
				selectedModalities = selectedModalities.filter((m) => m !== mod);
			}
		} else {
			selectedModalities = [...selectedModalities, mod];
		}
	}

	function handleClose() {
		clearInterval(timerInterval);
		open = false;
		dispatch('close');
	}

	function finishTimer() {
		clearInterval(timerInterval);
		timeSpentMinutes = Math.max(1, timerMinutes - Math.floor(secondsLeft / 60));
		mode = 'evaluate';
	}

	function submit() {
		const key = chapterKey || resolvedChapter?.chapterKey;
		if (!key) return;
		recordChapterRevision(key, confidence, selectedModalities, timeSpentMinutes);
		celebration.set(`Revision logged! ${chapterTitle} memory restored.`);
		handleClose();
	}

	$: if (open && mode === 'timer' && !timerInterval) {
		secondsLeft = timerMinutes * 60;
		timerInterval = setInterval(() => {
			if (secondsLeft > 0) secondsLeft--;
			else finishTimer();
		}, 1000);
	}

	onDestroy(() => clearInterval(timerInterval));
</script>

<Modal open={open} title={mode === 'timer' ? "BRAIN DUMP: FOCUS MODE" : "ACTIVE RECALL EVALUATION"} width={mode === 'timer' ? "500px" : "620px"} on:close={handleClose}>
	{#if mode === 'timer'}
		<div class="timer-dialog">
			<h3 style="color: {color}">{chapterTitle}</h3>
			<p class="timer-desc">Write down everything you remember on a blank sheet of paper.</p>
			
			<div class="timer-display" style="--c: {color}">
				{Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
			</div>

			<div class="actions center">
				<button type="button" class="btn ghost" on:click={finishTimer}>
					<span>Skip Timer</span>
				</button>
				<button type="button" class="btn solid" on:click={finishTimer}>
					<NavIcon name="check" size={14} />
					<span>Finish & Evaluate</span>
				</button>
			</div>
		</div>
	{:else}
		<div class="recall-dialog">
			<!-- Header summary -->
			<div class="ch-head" style="--c: {color}">
				<div class="badges">
					<span class="sub-badge" style="color: {color}; background: color-mix(in srgb, {color}, transparent 88%)">
						{name.toUpperCase()}
					</span>
					<span class="stars">{'★'.repeat(weightage)} High Yield</span>
				</div>
				<h3>{chapterTitle}</h3>
				<div class="current-state">
					<div class="score-line">
						<span>Current Memory Retention: <b>{Math.round(currentScore)}%</b> ({health.toUpperCase()})</span>
						<span>Half-life: <b>{halfLife} days</b></span>
					</div>
					<HealthBar score={currentScore} size="sm" showLabel={false} showScore={false} />
				</div>
			</div>

			<!-- Modalities -->
			<div class="section">
				<p class="sec-label">RECALL MODALITIES USED</p>
				<div class="mod-grid">
					{#each MODALITY_OPTIONS as opt}
						<button
							type="button"
							class="mod-chip"
							class:active={selectedModalities.includes(opt.id)}
							on:click={() => toggleModality(opt.id)}
						>
							<span>{opt.icon}</span>
							<span>{opt.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Confidence Rating -->
			<div class="section">
				<p class="sec-label">SELF-EVALUATION (SPACED REPETITION CONFIDENCE)</p>
				<div class="ratings-grid">
					{#each RATINGS as r}
						<button
							type="button"
							class="rate-card"
							class:selected={confidence === r.id}
							style="--rc: {r.color}"
							on:click={() => (confidence = r.id)}
						>
							<div class="rate-top">
								<b>{r.label}</b>
								{#if confidence === r.id}<span class="check">✓</span>{/if}
							</div>
							<p>{r.desc}</p>
						</button>
					{/each}
				</div>
			</div>

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn ghost" on:click={handleClose}>Cancel</button>
				<button type="button" class="btn solid" on:click={submit}>
					<NavIcon name="check" size={14} />
					<span>Save Revision</span>
				</button>
			</div>
		</div>
	{/if}
</Modal>

<style>
	/* Timer styles */
	.timer-dialog { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1rem; padding: 1rem 0; }
	.timer-dialog h3 { font-size: 1.4rem; font-weight: 800; margin: 0; }
	.timer-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }
	.timer-display { font-size: 4.5rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--c); background: color-mix(in srgb, var(--c), transparent 90%); padding: 1rem 2.5rem; border-radius: 20px; border: 2px dashed color-mix(in srgb, var(--c), transparent 70%); margin: 1rem 0; }
	.actions.center { justify-content: center; width: 100%; border: none; padding-top: 0; margin-top: 0; }

	/* Recall styles */
	.recall-dialog { display: grid; gap: 1.1rem; }
	.ch-head { display: grid; gap: 0.4rem; padding: 0.9rem; background: var(--surface-subtle); border-radius: 12px; border: 1px solid var(--border-subtle); }
	.badges { display: flex; align-items: center; gap: 0.6rem; }
	.sub-badge { padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; }
	.stars { font-size: 0.72rem; color: #f59e0b; font-weight: 700; }
	h3 { margin: 0; font-size: 1.15rem; font-weight: 800; }
	.current-state { display: grid; gap: 0.35rem; margin-top: 0.2rem; }
	.score-line { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); }
	.score-line b { color: var(--text-primary); }

	.sec-label { margin: 0 0 0.5rem; font-size: 0.7rem; font-weight: 800; color: var(--text-secondary); letter-spacing: 0.06em; }
	.mod-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.mod-chip {
		display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.8rem;
		border-radius: 9px; border: 1px solid var(--border-subtle); background: var(--surface-panel);
		color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
	}
	.mod-chip:hover { border-color: var(--accent); color: var(--text-primary); }
	.mod-chip.active { background: color-mix(in srgb, var(--accent), transparent 85%); border-color: var(--accent); color: var(--accent); font-weight: 750; }

	.ratings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
	.rate-card {
		display: grid; gap: 0.25rem; text-align: left; padding: 0.75rem 0.9rem;
		border-radius: 11px; border: 1px solid var(--border-subtle); background: var(--surface-panel);
		cursor: pointer; transition: all 0.15s ease;
	}
	.rate-card:hover { border-color: var(--rc); }
	.rate-card.selected { border-color: var(--rc); background: color-mix(in srgb, var(--rc), transparent 90%); box-shadow: 0 0 0 1px var(--rc); }
	.rate-top { display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: var(--rc); }
	.rate-card p { margin: 0; font-size: 0.72rem; color: var(--text-secondary); line-height: 1.35; }
	.check { font-size: 0.8rem; font-weight: 800; }

	.actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.4rem; padding-top: 0.8rem; border-top: 1px solid var(--border-subtle); }
	.btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.1rem; border-radius: 10px; font-size: 0.82rem; font-weight: 750; cursor: pointer; border: 0; }
	.btn.ghost { background: transparent; color: var(--text-secondary); }
	.btn.ghost:hover { color: var(--text-primary); }
	.btn.solid { background: var(--accent); color: #fff; box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%); }
</style>
