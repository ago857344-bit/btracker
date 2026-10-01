<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import TimelineStrip from './TimelineStrip.svelte';
	import EvaluationModal from './EvaluationModal.svelte';
	import { tracker, updateTracker } from '$lib/stores/tracker';
	import { subjectColor } from '$lib/state/subjects';
	import { createChapterRecallData } from '$lib/state/defaults';
	import { todayKey } from '$lib/state/dates';
	import { cellKey, EXERCISE_DEFS } from '$lib/state/syllabus';
	import { isFlag, resultOf } from '$lib/state/questions';
	import type { ChapterRecallData } from '$lib/types/tracker';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let open = false;
	export let chapterKey = '';
	export let chapter: ChapterRecallData | null = null;

	$: resolvedChapter = chapter ?? $tracker.rev.chapters[chapterKey] ?? (chapterKey ? createChapterRecallData(chapterKey, 2) : null);
	$: [subCode, ...restParts] = (chapterKey || resolvedChapter?.chapterKey || 'P-Chapter').split(/[-:]/);
	$: subject = subCode || 'P';
	$: chapterTitle = restParts.join('-').trim() || resolvedChapter?.chapterKey || chapterKey || 'Chapter';
	$: color = subjectColor(subject);

	// Error Log Sync
	$: chNo = extractChapterNumber(chapterTitle);
	$: errorLog = analyzeErrors($tracker, subject, chNo);

	function extractChapterNumber(title: string) {
		// Mock mapping. In reality, we'd lookup from syllabus.ts
		const match = title.match(/(\d+)/);
		return match ? parseInt(match[1], 10) : 1;
	}

	function analyzeErrors(state: any, sub: string, ch: number) {
		let flagged = 0;
		let mistakes = 0;
		EXERCISE_DEFS.forEach(ex => {
			const cKey = cellKey(sub, ch, ex.code);
			const cells = state.d[cKey];
			if (cells) {
				cells.forEach((v: number) => {
					if (isFlag(v)) flagged++;
					const r = resultOf(v);
					if (r === 2 || r === 3) mistakes++;
				});
			}
		});
		return { flagged, mistakes };
	}

	// Timeline Scheduling
	$: todayBlocks = $tracker.rev.studyBlocks.filter(b => b.start.startsWith(todayKey()));
	
	let evalOpen = false;

	function handleClose() {
		open = false;
		dispatch('close');
	}

	function handleSchedule(e: CustomEvent<{ time: string }>) {
		// Create a new study block for this revision
		const d = new Date(e.detail.time);
		const dEnd = new Date(d.getTime() + 45 * 60000);
		updateTracker(t => {
			t.rev.studyBlocks.push({
				id: 'blk-' + Date.now(),
				subject: subject as any,
				start: d.toISOString(),
				end: dEnd.toISOString(),
				title: `Revision: ${chapterTitle}`,
				nestedRevisions: [{
					chapterKey: chapterKey,
					start: d.toISOString(),
					end: dEnd.toISOString()
				}]
			});
		});
		handleClose();
	}

	function handleNest(e: CustomEvent<{ blockId: string }>) {
		updateTracker(t => {
			const block = t.rev.studyBlocks.find(b => b.id === e.detail.blockId);
			if (block) {
				block.nestedRevisions.push({
					chapterKey: chapterKey,
					start: block.start,
					end: block.end
				});
			}
		});
		handleClose();
	}

	function startFocusMode() {
		// Go to evaluation (or redirect to focus page)
		evalOpen = true;
	}
</script>

<Modal open={open} title="SCHEDULE REVISION" width="700px" on:close={handleClose}>
	{#if evalOpen}
		<EvaluationModal open={true} {chapterKey} {chapter} on:close={() => { evalOpen = false; handleClose(); }} />
	{:else}
		<div class="scheduler">
			<!-- Header -->
			<div class="header">
				<h3 style="color: {color}">{chapterTitle}</h3>
				<p>When would you like to review this chapter?</p>
			</div>

			<!-- Error Log (Micro-Revisions) -->
			<div class="error-log">
				<div class="log-stat flag">
					<NavIcon name="target" size={16} />
					<span><b>{errorLog.flagged}</b> Flagged Questions</span>
				</div>
				<div class="log-stat error">
					<NavIcon name="x" size={16} />
					<span><b>{errorLog.mistakes}</b> Past Mistakes</span>
				</div>
				<div class="log-desc">
					We recommend targeting these specific weaknesses during your focus session.
				</div>
			</div>

			<!-- Timeline Strip -->
			<div class="timeline-section">
				<div class="sec-label">TODAY'S PLAN (CARVING & SLOTTING)</div>
				<p class="help">Click an empty space to schedule a new block, or click an existing study block to nest this revision inside it.</p>
				<TimelineStrip blocks={todayBlocks} on:schedule={handleSchedule} on:nest={handleNest} />
			</div>

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn ghost" on:click={handleClose}>Cancel</button>
				<button type="button" class="btn solid" on:click={startFocusMode}>
					<NavIcon name="focus" size={14} />
					<span>Start Session Now</span>
				</button>
			</div>
		</div>
	{/if}
</Modal>

<style>
	.scheduler { display: grid; gap: 1.5rem; }
	.scheduler > * { min-width: 0; }
	.header h3 { margin: 0 0 0.2rem; font-size: 1.3rem; font-weight: 800; }
	.header p { margin: 0; color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; }
	
	.error-log { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; background: var(--surface-panel); border: 1px dashed var(--border-subtle); padding: 1rem; border-radius: 12px; }
	.log-stat { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; font-weight: 600; padding: 0.6rem; border-radius: 8px; }
	.log-stat.flag { color: var(--warning); background: color-mix(in srgb, var(--warning), transparent 90%); }
	.log-stat.error { color: var(--danger); background: color-mix(in srgb, var(--danger), transparent 90%); }
	.log-desc { grid-column: 1 / -1; font-size: 0.75rem; color: var(--text-secondary); text-align: center; }

	.sec-label { font-size: 0.7rem; font-weight: 800; color: var(--text-secondary); letter-spacing: 0.08em; margin-bottom: 0.4rem; }
	.help { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.8rem; }
	
	.actions { display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
	.btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.2rem; border-radius: 10px; font-size: 0.85rem; font-weight: 750; cursor: pointer; border: 0; }
	.btn.ghost { background: transparent; color: var(--text-secondary); }
	.btn.ghost:hover { color: var(--text-primary); background: var(--surface-subtle); }
	.btn.solid { background: var(--accent); color: #fff; box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%); }
</style>
