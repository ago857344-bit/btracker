<script lang="ts">
	import { onDestroy } from 'svelte';
	import { tracker, updateTracker, celebration, addTodos } from '$lib/stores/tracker';
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
		// Split by lines, find valid task lines or use entire text if short
		const lines = text
			.split('\n')
			.map((l) => l.replace(/^[-*•]\s*(\[[ xX]\]\s*)?/, '').trim())
			.filter((l) => l.length > 0);

		if (lines.length === 0) return;

		const addedCount = addTodos(lines.map((l) => ({ title: l, source: 'brain-dump' })));

		if (addedCount > 0) {
			celebration.set(`Converted ${addedCount} item${addedCount > 1 ? 's' : ''} to To-Do list!`);
		} else {
			celebration.set('Items already exist in your To-Do list.');
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
				title="Convert items to To-Do tasks"
				on:click={convertToTodo}
				disabled={!text.trim()}
			>
				<NavIcon name="plus" size={12} />
				<span>Send to Tasks</span>
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
			placeholder="Quick scratchpad for formulas, coaching doubts, flash thoughts, or rapid problem notes...&#10;• Type anything — it auto-saves!&#10;• Hit 'Send to Tasks' to turn bullets into To-Dos."
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
