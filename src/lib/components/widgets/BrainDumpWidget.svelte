<script lang="ts">
	import { onDestroy } from 'svelte';
	import { tracker, updateTracker, celebration, addTodos, addFlashcard } from '$lib/stores/tracker';
	import type { MistakeLog } from '$lib/types/tracker';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { uiClick } from '$lib/utils/feedback';

	let text = $tracker.brainDump ?? '';
	let textareaEl: HTMLTextAreaElement;
	let copied = false;
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;
	let saveDebounce: ReturnType<typeof setTimeout> | undefined;
	let isFocused = false;

	// Keep local text in sync with store only when not actively typing/focused
	$: if (!isFocused && $tracker.brainDump !== undefined && $tracker.brainDump !== text) {
		text = $tracker.brainDump;
	}

	function commitToStore(val: string) {
		clearTimeout(saveDebounce);
		updateTracker((draft) => {
			draft.brainDump = val;
		});
	}

	function handleInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
		text = e.currentTarget.value;
		clearTimeout(saveDebounce);
		saveDebounce = setTimeout(() => {
			commitToStore(text);
		}, 300);
	}

	function handleBlur() {
		isFocused = false;
		commitToStore(text);
	}

	onDestroy(() => {
		clearTimeout(saveDebounce);
		clearTimeout(copyTimeout);
		commitToStore(text);
	});

	function insertSnippet(snippet: string) {
		uiClick();
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const before = text.substring(0, start);
		const after = text.substring(end);
		
		const needsNewline = before.length > 0 && !before.endsWith('\n');
		const prefix = needsNewline ? '\n' : '';
		
		text = before + prefix + snippet + after;
		commitToStore(text);
		
		setTimeout(() => {
			textareaEl.focus();
			const newPos = start + prefix.length + snippet.length;
			textareaEl.setSelectionRange(newPos, newPos);
		}, 10);
	}

	function copyText() {
		uiClick();
		if (!text.trim()) return;
		navigator.clipboard.writeText(text);
		copied = true;
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => {
			copied = false;
		}, 1600);
		celebration.set('Copied notes to clipboard.');
	}

	function clearNotes() {
		uiClick();
		if (!text.trim()) return;
		if (window.confirm('Clear all scratchpad notes?')) {
			text = '';
			updateTracker((draft) => {
				draft.brainDump = '';
			});
			celebration.set('Scratchpad cleared.');
		}
	}

	function convertToTodo() {
		uiClick();
		if (!text.trim()) return;

		const rawLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
		if (rawLines.length === 0) return;

		let mistakesCount = 0;
		let flashcardsCount = 0;
		const todoLines: string[] = [];
		const newMistakes: MistakeLog[] = [];

		for (const rawLine of rawLines) {
			if (rawLine.startsWith('⚠️ Mistake:') || rawLine.startsWith('Mistake:')) {
				let content = rawLine.replace(/^(⚠️\s*)?Mistake:\s*/i, '').trim();
				let subject = 'Physics';
				if (/^(P:|\[P\]|Physics:)/i.test(content)) {
					subject = 'Physics';
					content = content.replace(/^(P:|\[P\]|Physics:)\s*/i, '').trim();
				} else if (/^(C:|\[C\]|Chemistry:)/i.test(content)) {
					subject = 'Chemistry';
					content = content.replace(/^(C:|\[C\]|Chemistry:)\s*/i, '').trim();
				} else if (/^(M:|\[M\]|Maths?:)/i.test(content)) {
					subject = 'Maths';
					content = content.replace(/^(M:|\[M\]|Maths?:)\s*/i, '').trim();
				}

				if (content) {
					newMistakes.push({
						id: `mistake_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
						date: Date.now(),
						subject,
						errorType: 'Conceptual',
						description: content,
						testName: 'Brain Dump'
					});
					mistakesCount++;
				}
			} else if (rawLine.startsWith('⚡ Formula:') || rawLine.startsWith('Formula:')) {
				let content = rawLine.replace(/^(⚡\s*)?Formula:\s*/i, '').trim();
				let subject = 'P';
				if (/^(P:|\[P\]|Physics:)/i.test(content)) {
					subject = 'P';
					content = content.replace(/^(P:|\[P\]|Physics:)\s*/i, '').trim();
				} else if (/^(C:|\[C\]|Chemistry:)/i.test(content)) {
					subject = 'C';
					content = content.replace(/^(C:|\[C\]|Chemistry:)\s*/i, '').trim();
				} else if (/^(M:|\[M\]|Maths?:)/i.test(content)) {
					subject = 'M';
					content = content.replace(/^(M:|\[M\]|Maths?:)\s*/i, '').trim();
				}

				if (content) {
					addFlashcard({
						front: content,
						back: 'Review formula & conditions',
						subject,
						chapter: 'Brain Dump'
					});
					flashcardsCount++;
				}
			} else {
				const cleaned = rawLine.replace(/^[-*•]\s*(\[[ xX]\]\s*)?/, '').trim();
				if (cleaned) {
					todoLines.push(cleaned);
				}
			}
		}

		if (newMistakes.length > 0) {
			updateTracker((s) => {
				s.mistakes = [...(s.mistakes || []), ...newMistakes];
			});
		}

		let tasksAdded = 0;
		if (todoLines.length > 0) {
			tasksAdded = addTodos(todoLines.map((l) => ({ title: l, source: 'brain-dump' })));
		}

		const parts: string[] = [];
		if (tasksAdded > 0) parts.push(`${tasksAdded} Task${tasksAdded > 1 ? 's' : ''}`);
		if (mistakesCount > 0) parts.push(`${mistakesCount} Mistake${mistakesCount > 1 ? 's' : ''}`);
		if (flashcardsCount > 0) parts.push(`${flashcardsCount} Flashcard${flashcardsCount > 1 ? 's' : ''}`);

		if (parts.length > 0) {
			celebration.set(`Routed ${parts.join(', ')}! 🚀`);
		} else {
			celebration.set('Notes processed (items already exist).');
		}
	}

	$: charCount = text.length;
	$: lineCount = text ? text.split('\n').length : 0;
</script>

<div class="brain-dump-widget">
	<!-- Quick Snippet Pill Toolbar -->
	<div class="snippet-bar">
		<button type="button" class="snippet-pill" on:click={() => insertSnippet('- [ ] ')} title="Add Todo Checkbox">
			<NavIcon name="check" size={11} />
			<span>Todo</span>
		</button>
		<button type="button" class="snippet-pill" on:click={() => insertSnippet('⚡ Formula: ')} title="Add Formula Note">
			<NavIcon name="book" size={11} />
			<span>Formula</span>
		</button>
		<button type="button" class="snippet-pill" on:click={() => insertSnippet('❓ Doubt: ')} title="Add Coaching Doubt">
			<NavIcon name="help" size={11} />
			<span>Doubt</span>
		</button>
		<button type="button" class="snippet-pill" on:click={() => insertSnippet('⚠️ Mistake: ')} title="Add Mistake Alert">
			<NavIcon name="alert" size={11} />
			<span>Mistake</span>
		</button>
		
		<div class="toolbar-actions">
			<button
				type="button"
				class="action-icon-btn"
				class:copied
				title="Copy All"
				on:click={copyText}
				disabled={!text.trim()}
			>
				<NavIcon name={copied ? 'check' : 'copy'} size={12} />
			</button>
			<button
				type="button"
				class="action-icon-btn"
				title="Clear Notes"
				on:click={clearNotes}
				disabled={!text.trim()}
			>
				<NavIcon name="trash" size={12} />
			</button>
			<button
				type="button"
				class="btn-send-todo"
				title="Smart Tag Routing: Routes Tasks to To-Do, '⚡ Formula:' to Flashcards, and '⚠️ Mistake:' to Mistake Log"
				on:click={convertToTodo}
				disabled={!text.trim()}
			>
				<NavIcon name="sparkles" size={12} />
				<span>Process Notes</span>
			</button>
		</div>
	</div>

	<!-- Textarea Area -->
	<div class="textarea-wrapper">
		<textarea
			bind:this={textareaEl}
			value={text}
			on:input={handleInput}
			on:focus={() => (isFocused = true)}
			on:blur={handleBlur}
			placeholder="Quick scratchpad for formulas, coaching doubts, flash thoughts, or rapid problem notes...&#10;• Type anything — it auto-saves!&#10;• Hit 'Process Notes' to smart route Tasks, Formulas & Mistakes."
			spellcheck="false"
			rows="4"
		></textarea>
	</div>

	<!-- Widget Bottom Status Footer -->
	<div class="dump-footer">
		<div class="meta-stats">
			<span>{lineCount} line{lineCount === 1 ? '' : 's'}</span>
			<span class="sep">•</span>
			<span>{charCount} char{charCount === 1 ? '' : 's'}</span>
		</div>
		<span class="autosave-tag">
			<i class="dot"></i> Auto-saved
		</span>
	</div>
</div>

<style>
	.brain-dump-widget {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 0.65rem;
	}

	.snippet-bar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.snippet-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		padding: 0.22rem 0.55rem;
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-subtle) 70%, transparent);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.16s ease;
	}

	.snippet-pill:hover {
		color: var(--text-primary);
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-left: auto;
	}

	.action-icon-btn {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.16s ease;
	}

	.action-icon-btn:hover:not(:disabled) {
		color: var(--text-primary);
		border-color: var(--text-secondary);
		background: var(--surface-subtle);
	}

	.action-icon-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.action-icon-btn.copied {
		color: #10b981;
		border-color: #10b981;
	}

	.btn-send-todo {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		padding: 0.22rem 0.6rem;
		border-radius: 7px;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
	}

	.btn-send-todo:hover:not(:disabled) {
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
	}

	.btn-send-todo:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.textarea-wrapper {
		flex: 1;
		min-height: 110px;
		display: flex;
	}

	textarea {
		width: 100%;
		height: 100%;
		min-height: 110px;
		resize: none;
		background: color-mix(in srgb, var(--surface-subtle) 50%, transparent);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.65rem 0.8rem;
		color: var(--text-primary);
		font-family: inherit;
		font-size: 0.83rem;
		line-height: 1.5;
		outline: none;
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	textarea:focus {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--surface-subtle) 90%, transparent);
	}

	textarea::placeholder {
		color: color-mix(in srgb, var(--text-secondary) 70%, transparent);
		font-size: 0.78rem;
		line-height: 1.45;
	}

	.dump-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.7rem;
		color: var(--text-secondary);
		padding: 0 0.15rem;
	}

	.meta-stats {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.sep {
		opacity: 0.5;
	}

	.autosave-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.68rem;
		color: color-mix(in srgb, var(--text-secondary) 80%, transparent);
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #10b981;
		display: inline-block;
	}

	@media (max-width: 480px) {
		.snippet-bar {
			gap: 0.3rem;
		}
		.snippet-pill {
			font-size: 0.68rem;
			padding: 0.2rem 0.45rem;
		}
		.toolbar-actions {
			width: 100%;
			justify-content: space-between;
			margin-top: 0.2rem;
		}
	}

	:global(.mode-mobile) .snippet-bar,
	:global(.is-phone) .snippet-bar {
		gap: 0.3rem;
	}
	:global(.mode-mobile) .snippet-pill,
	:global(.is-phone) .snippet-pill {
		font-size: 0.68rem;
		padding: 0.2rem 0.45rem;
	}
	:global(.mode-mobile) .toolbar-actions,
	:global(.is-phone) .toolbar-actions {
		width: 100%;
		justify-content: space-between;
		margin-top: 0.2rem;
	}

	@container (max-width: 420px) {
		.snippet-bar {
			gap: 0.3rem;
		}
		.snippet-pill {
			font-size: 0.68rem;
			padding: 0.2rem 0.45rem;
		}
		.toolbar-actions {
			width: 100%;
			justify-content: space-between;
			margin-top: 0.2rem;
		}
	}
</style>
