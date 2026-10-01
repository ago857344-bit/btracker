<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import HealthBar from './HealthBar.svelte';
	import Sparkline from './Sparkline.svelte';
	import type { ChapterRecallData } from '$lib/types/tracker';
	import { calculateCurrentScore, calculateHealthStatus, daysUntilThreshold } from '$lib/state/decay';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import { shortDateKey, dayKeyOf } from '$lib/state/dates';

	const dispatch = createEventDispatcher<{ revise: string; delete: string }>();

	export let chapter: ChapterRecallData;
	export let onRevise: ((chapterKey: string) => void) | undefined = undefined;
	export let onDelete: ((chapterKey: string) => void) | undefined = undefined;

	function triggerRevise(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (typeof onRevise === 'function') {
			try { onRevise(chapter.chapterKey); } catch (err) { console.error(err); }
		}
		dispatch('revise', chapter.chapterKey);
	}

	function triggerDelete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (typeof onDelete === 'function') {
			try { onDelete(chapter.chapterKey); } catch (err) { console.error(err); }
		}
		dispatch('delete', chapter.chapterKey);
	}

	$: currentScore = calculateCurrentScore(chapter.decay || { r0: 100, halfLife: 7, lastRevisionAt: null });
	$: health = calculateHealthStatus(currentScore);
	$: daysUntilCritical = daysUntilThreshold(chapter.decay || { r0: 100, halfLife: 7, lastRevisionAt: null });
	$: [subCode, ...restParts] = chapter.chapterKey.split(/[-:]/);
	$: subjectCode = subCode || 'P';
	$: chapterNumber = restParts.join('-').trim() || chapter.chapterKey;
	$: subColor = subjectColor(subjectCode);
	$: subName = subjectName(subjectCode);

	$: dueLabel = daysUntilCritical <= 0
		? 'Overdue'
		: daysUntilCritical <= 1
			? 'Due today'
			: daysUntilCritical <= 7
				? `Due in ${Math.round(daysUntilCritical)} days`
				: 'Not urgent';

	$: weightageLabel = chapter.weightage === 3 ? 'High' : chapter.weightage === 2 ? 'Medium' : 'Low';
	$: weightageColor = chapter.weightage === 3 ? '#ef4444' : chapter.weightage === 2 ? '#f59e0b' : '#10b981';
</script>

<article class="chapter-card" in:fly={{ y: 8, duration: 220 }} style="--c: {subColor}">
	<div class="card-header">
		<div class="badges">
			<span class="badge subject" style="color: {subColor}; background: color-mix(in srgb, {subColor}, transparent 88%)">
				{subName.toUpperCase()}
			</span>
			<span class="badge weightage" style="color: {weightageColor}; background: color-mix(in srgb, {weightageColor}, transparent 88%)">
				{weightageLabel} Yield
			</span>
			{#if health === 'critical'}
				<span class="badge urgent">Critical</span>
			{:else if health === 'fading'}
				<span class="badge warning">Fading</span>
			{/if}
		</div>
	</div>

	<h3 class="chapter-title">{chapterNumber}</h3>

	<div class="health-section">
		<HealthBar score={currentScore} size="sm" showLabel={false} showScore={false} />
		<span class="score-text">{Math.round(currentScore)}%</span>
	</div>

	<div class="sparkline-section">
		<Sparkline decay={chapter.decay} width={140} height={35} showTooltip={false} />
	</div>

	<div class="meta">
		<span class="meta-item">
			<NavIcon name="clock" size={11} />
			{dueLabel}
		</span>
		<span class="meta-item">
			<NavIcon name="check" size={11} />
			{Object.keys(chapter.subtopics || {}).length} subtopics
		</span>
		<span class="meta-item">
			<NavIcon name="trend" size={11} />
			{chapter.decay.lastRevisionAt
				? `Last ${shortDateKey(dayKeyOf(new Date(chapter.decay.lastRevisionAt)))}`
				: 'Never revised'}
		</span>
	</div>

	{#if (chapter.modalities || []).length > 0}
		<div class="modalities">
			{#each (chapter.modalities || []).slice(0, 3) as modality}
				<span class="modality-tag">{modality}</span>
			{/each}
			{#if (chapter.modalities || []).length > 3}
				<span class="modality-tag">+{(chapter.modalities || []).length - 3}</span>
			{/if}
		</div>
	{/if}

	<div class="actions">
		<button type="button" class="revise-btn" on:click={triggerRevise}>
			<NavIcon name="bolt" size={13} />
			Revise
		</button>
		<button type="button" class="delete-btn" title="Remove chapter" on:click={triggerDelete}>
			<NavIcon name="trash" size={13} />
		</button>
	</div>
</article>

<style>
	.chapter-card {
		position: relative;
		display: grid;
		gap: 0.6rem;
		padding: 1rem 1.1rem 1rem 1.2rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-card);
		background: var(--surface-panel);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.chapter-card::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		background: var(--c);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.badges {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.badge {
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.07em;
	}

	.badge.urgent {
		color: #fff;
		background: var(--danger, #e0455a);
	}

	.badge.warning {
		color: #fff;
		background: #f59e0b;
	}

	.chapter-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.3;
	}

	.health-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.score-text {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.sparkline-section {
		display: flex;
		justify-content: center;
		padding: 0.2rem 0;
	}

	.meta {
		display: grid;
		gap: 0.25rem;
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 650;
	}

	.modalities {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.modality-tag {
		padding: 0.15rem 0.4rem;
		background: var(--surface-subtle);
		border-radius: 6px;
		font-size: 0.6rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: capitalize;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.2rem;
	}

	.revise-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		flex: 1;
		justify-content: center;
		padding: 0.5rem;
		border: 0;
		border-radius: 10px;
		color: #fff;
		background: var(--accent);
		font-size: 0.75rem;
		font-weight: 750;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 66%);
		transition: transform 0.1s ease, box-shadow 0.1s ease;
	}

	.revise-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--accent), transparent 55%);
	}

	.revise-btn:active {
		transform: translateY(0);
	}

	.delete-btn {
		display: grid;
		place-items: center;
		width: 36px;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		color: var(--text-secondary);
		background: var(--surface-panel);
		transition: color 0.2s ease, border-color 0.2s ease;
	}

	.delete-btn:hover {
		color: var(--danger, #e0455a);
		border-color: var(--danger, #e0455a);
	}
</style>
