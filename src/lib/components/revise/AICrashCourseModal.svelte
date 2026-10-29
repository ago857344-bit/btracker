<script lang="ts">
	import { renderMarkdown } from '$lib/services/markdown';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { getAICrashCourse } from '$lib/services/ai';
	import { tracker, updateTracker, celebration } from '$lib/stores/tracker';
	import { sendToAiMentor } from '$lib/stores/aiMentor';
	import { subjectName } from '$lib/state/subjects';
	import { buildAcademicConstraintPrompt } from '$lib/services/aiContext';
	import { createChapterRecallData, createRevision } from '$lib/state/defaults';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let chapterKey: string | null = null;
	
	let loading = false;
	let error = '';
	let html = '';
	let rawMarkdown = '';
	let copied = false;

	let lastLoadedKey = '';
	$: if (chapterKey && chapterKey !== lastLoadedKey) {
		lastLoadedKey = chapterKey;
		initCourse(chapterKey);
	}
	$: if (!chapterKey) {
		lastLoadedKey = '';
	}

	$: subCode = (chapterKey || 'P').split(/[-:]/)[0] || 'P';
	$: chapterTitle = (chapterKey || '').split(/[-:]/).slice(1).join('-').trim() || chapterKey || 'Chapter';

	async function initCourse(key: string) {
		const cached = $tracker.rev?.chapters?.[key]?.crashCourseMd;
		if (cached) {
			loading = false;
			error = '';
			rawMarkdown = cached;
			html = await renderMarkdown(cached);
			return;
		}
		await generateCourse(key);
	}

	async function generateCourse(key: string) {
		loading = true;
		error = '';
		html = '';
		rawMarkdown = '';
		try {
			const sCode = key.split(/[-:]/)[0] || 'P';
			const sName = subjectName(sCode) || 'Physics';
			const elo = $tracker.gamification?.elo?.[sCode as 'P'|'C'|'M'] || 300;
			const chName = key.split(/[-:]/).slice(1).join('-').trim() || key;
			const constraint = buildAcademicConstraintPrompt($tracker);
			
			const md = await getAICrashCourse(chName, sName, elo, constraint);
			rawMarkdown = md;
			html = await renderMarkdown(md);

			// Cache back into tracker
			updateTracker(t => {
				if (!t.rev) t.rev = createRevision();
				if (!t.rev.chapters) t.rev.chapters = {};
				if (!t.rev.chapters[key]) {
					t.rev.chapters[key] = createChapterRecallData(key, 2);
				}
				t.rev.chapters[key].crashCourseMd = md;
				t.rev.chapters[key].crashCourseUpdatedAt = Date.now();
			});
		} catch (err: any) {
			error = err.message || 'Failed to generate crash course.';
		} finally {
			loading = false;
		}
	}

	function handleRegenerate() {
		if (chapterKey) {
			generateCourse(chapterKey);
		}
	}

	function handleSendToMentor() {
		if (!rawMarkdown) return;
		sendToAiMentor({
			prompt: `Generate active recall flashcards based on this crash course for ${chapterTitle}:\n\n` + rawMarkdown,
			initialMessage: `Generating active recall flashcards for ${chapterTitle}...`,
			autoSend: true
		});
		celebration.set('Sent crash course to AI Mentor for flashcards! ⚡');
		dispatch('close');
	}

	async function handleCopyNotes() {
		if (!rawMarkdown) return;
		try {
			await navigator.clipboard.writeText(rawMarkdown);
			copied = true;
			celebration.set('Copied crash course notes to clipboard! 📋');
			setTimeout(() => { copied = false; }, 2000);
		} catch {
			celebration.set('Failed to copy to clipboard.');
		}
	}
</script>

{#if chapterKey}
<Modal title="✨ AI Crash Course: {chapterTitle}" open={true} width="700px" on:close={() => dispatch('close')}>
	<div class="course-container" class:gemini-glow-box={loading}>
		{#if loading}
			<div class="gemini-loader-container">
				<div class="gemini-orb"></div>
				<p class="gemini-shimmer-text">AI is preparing your 2-minute crash course...</p>
			</div>
		{:else if error}
			<div class="ai-error">{error}</div>
		{:else}
			<div class="markdown-body ai-report">
				{@html html}
			</div>
		{/if}
	</div>
	<svelte:fragment slot="footer">
		<div class="footer-actions">
			<button type="button" class="btn ghost" on:click={() => dispatch('close')}>Dismiss</button>
			{#if rawMarkdown && !loading}
				<button type="button" class="btn secondary" on:click={handleRegenerate} title="Regenerate crash course">
					<NavIcon name="history" size={13} />
					<span>🔄 Regenerate</span>
				</button>
				<button type="button" class="btn secondary" on:click={handleCopyNotes} title="Copy notes to clipboard">
					<NavIcon name="copy" size={13} />
					<span>{copied ? '✓ Copied' : '📋 Copy Notes'}</span>
				</button>
				<button type="button" class="btn solid mentor-btn" on:click={handleSendToMentor} title="Generate flashcards with AI Mentor">
					<NavIcon name="sparkles" size={13} />
					<span>⚡ Send to AI Mentor</span>
				</button>
			{/if}
		</div>
	</svelte:fragment>
</Modal>
{/if}

<style>
	.course-container { padding: 1.5rem 1rem; min-height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
	.ai-error { color: var(--danger, #e0455a); font-weight: 700; background: color-mix(in srgb, var(--danger) 15%, transparent); padding: .6rem 1rem; border-radius: 8px; text-align: center; }
	
	.ai-report { width: 100%; text-align: left; font-size: .95rem; line-height: 1.6; color: var(--text-secondary); padding: 1.2rem; border-radius: 16px; }
	.ai-report :global(h3) { font-size: 1.1rem; color: var(--text-primary); margin: 1.5rem 0 .5rem; font-weight: 800; text-transform: uppercase; letter-spacing: .02em; }
	.ai-report :global(h3:first-child) { margin-top: 0; }
	.ai-report :global(strong) { color: var(--text-primary); font-weight: 750; }
	.ai-report :global(ul) { padding-left: 1.5rem; margin-bottom: 1rem; }
	.ai-report :global(li) { margin-bottom: .4rem; }

	.footer-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		width: 100%;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.55rem 0.95rem;
		border-radius: 9px;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		border: 0;
		transition: all 0.15s ease;
	}

	.btn.ghost {
		background: transparent;
		color: var(--text-secondary);
	}
	.btn.ghost:hover {
		color: var(--text-primary);
		background: var(--surface-subtle);
	}

	.btn.secondary {
		background: color-mix(in srgb, var(--surface) 80%, transparent);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
	}
	.btn.secondary:hover {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
		color: var(--accent);
	}

	.btn.solid.mentor-btn {
		background: var(--accent);
		color: var(--accent-contrast, #fff);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%);
	}
	.btn.solid.mentor-btn:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}
</style>