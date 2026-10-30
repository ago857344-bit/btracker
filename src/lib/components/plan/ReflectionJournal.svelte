<script lang="ts">
	import { onDestroy } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { setReflection, tracker, updateTracker, triggerToast } from '$lib/stores/tracker';
	import { timeOf } from '$lib/state/dates';
	import { renderMarkdownSync } from '$lib/services/markdown';

	export let day: string;
	export let open = false;

	let tab: 'post' | 'mistakes' = 'post';
	let text = '';
	let textarea: HTMLTextAreaElement;
	let saveTimer: ReturnType<typeof setTimeout>;
	let previewMode = false;

	let currentLoadedDay = '';
	let currentLoadedTab: 'post' | 'mistakes' = 'post';

	function flushPendingSave() {
		clearTimeout(saveTimer);
		if (currentLoadedDay && text !== undefined) {
			setReflection(currentLoadedDay, currentLoadedTab, text);
		}
	}

	$: entry = $tracker.refl[day];

	$: {
		// When day or tab changes: flush pending save for the previous day/tab first!
		if (day !== currentLoadedDay || tab !== currentLoadedTab) {
			flushPendingSave();
			currentLoadedDay = day;
			currentLoadedTab = tab;
			text = (tab === 'post' ? entry?.post : entry?.mistakes) ?? '';
		} else if (typeof document !== 'undefined' && document.activeElement !== textarea) {
			// External store update
			text = (tab === 'post' ? entry?.post : entry?.mistakes) ?? '';
		}
	}

	function onInput() {
		clearTimeout(saveTimer);
		const targetDay = day;
		const targetTab = tab;
		const targetText = text;
		saveTimer = setTimeout(() => {
			setReflection(targetDay, targetTab, targetText);
		}, 600);
	}

	function switchTab(newTab: 'post' | 'mistakes') {
		if (tab === newTab) return;
		flushPendingSave();
		tab = newTab;
	}

	onDestroy(() => {
		flushPendingSave();
	});

	function wrap(before: string, after = before) {
		const el = textarea;
		if (!el) return;
		const start = el.selectionStart;
		const end = el.selectionEnd;
		const sel = text.slice(start, end) || 'text';
		text = text.slice(0, start) + before + sel + after + text.slice(end);
		onInput();
		requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + sel.length); });
	}
	function prefixLine(marker: string) {
		const el = textarea;
		if (!el) return;
		const start = el.selectionStart;
		const lineStart = text.lastIndexOf('\n', start - 1) + 1;
		text = text.slice(0, lineStart) + marker + text.slice(lineStart);
		onInput();
		requestAnimationFrame(() => el.focus());
	}

	function syncToMistakeBook() {
		if (!text.trim()) return;
		const lines = text
			.split('\n')
			.map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
			.filter(l => l.length > 0);

		if (lines.length === 0) return;

		let addedCount = 0;
		updateTracker(s => {
			if (!s.mistakes) s.mistakes = [];
			const existingDescs = new Set(s.mistakes.map(m => m.description.trim().toLowerCase()));

			for (const rawLine of lines) {
				let line = rawLine;
				let subject: 'Physics' | 'Chemistry' | 'Maths' = 'Physics';

				// Match and strip optional subject prefixes: [Chem] or Chem: or C: etc.
				const chemMatch = line.match(/^\[?(?:chem|chemistry|c)\]?:?\s*/i);
				const mathMatch = line.match(/^\[?(?:math|maths|m)\]?:?\s*/i);
				const phyMatch = line.match(/^\[?(?:phy|physics|p)\]?:?\s*/i);

				if (chemMatch) {
					subject = 'Chemistry';
					line = line.slice(chemMatch[0].length).trim();
				} else if (mathMatch) {
					subject = 'Maths';
					line = line.slice(mathMatch[0].length).trim();
				} else if (phyMatch) {
					subject = 'Physics';
					line = line.slice(phyMatch[0].length).trim();
				}

				// Match error-type tags: silly -> 'Silly', formula -> 'Formula', time -> 'Time', default 'Conceptual'
				let errorType: 'Conceptual' | 'Silly' | 'Formula' | 'Time' = 'Conceptual';
				if (/\b(?:silly|calculation)\b|\[?(?:silly|calculation)\]?/i.test(line)) {
					errorType = 'Silly';
				} else if (/\bformula\b|\[?formula\]?/i.test(line)) {
					errorType = 'Formula';
				} else if (/\b(?:time|speed)\b|\[?(?:time|speed)\]?/i.test(line)) {
					errorType = 'Time';
				}

				const finalDesc = line || rawLine;
				if (!existingDescs.has(finalDesc.toLowerCase())) {
					s.mistakes.push({
						id: crypto.randomUUID ? crypto.randomUUID() : `mst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
						date: Date.now(),
						subject,
						errorType,
						description: finalDesc,
						testName: `Journal ${day}`,
						resolved: false
					});
					addedCount++;
				}
			}
		});

		if (addedCount > 0) {
			triggerToast(`Synced ${addedCount} ${addedCount === 1 ? 'mistake' : 'mistakes'} to Mistake Book! ⚡`);
		} else {
			triggerToast('All mistakes already synced to Mistake Book.');
		}
	}

	const tools = [
		{ label: 'Bold', icon: 'B', run: () => wrap('**') },
		{ label: 'Italic', icon: 'I', run: () => wrap('*') },
		{ label: 'Link', icon: '🔗', run: () => wrap('[', '](url)') },
		{ label: 'Strike', icon: 'S', run: () => wrap('~~') },
		{ label: 'Code', icon: '<>', run: () => wrap('`') },
		{ label: 'Heading', icon: 'H2', run: () => prefixLine('## ') },
		{ label: 'List', icon: '•', run: () => prefixLine('- ') },
		{ label: 'Quote', icon: '❝', run: () => prefixLine('> ') }
	];

	$: savedAt = entry?.savedAt ? `Saved ${timeOf(new Date(entry.savedAt))}` : '';
</script>

<section class="reflection" class:open>
	<button type="button" class="head" aria-expanded={open} on:click={() => open = !open}>
		<span class="chev" class:rotated={open}><NavIcon name="chevron" size={15} /></span>
		<b>Daily Reflection</b>
		<small>{day}</small>
		{#if savedAt}<span class="saved">{savedAt}</span>{/if}
	</button>

	{#if open}
		<div class="body">
			<div class="tabs" role="tablist">
				<button type="button" role="tab" aria-selected={tab === 'post'} class:selected={tab === 'post'} on:click={() => switchTab('post')}>Post</button>
				<button type="button" role="tab" aria-selected={tab === 'mistakes'} class:selected={tab === 'mistakes'} on:click={() => switchTab('mistakes')}>Mistakes</button>
				<button
					type="button"
					class="toggle-preview-btn"
					class:active={previewMode}
					on:click={() => (previewMode = !previewMode)}
					title="Toggle Markdown Preview"
				>
					{previewMode ? 'Edit Raw' : 'Preview'}
				</button>
			</div>

			<div class="toolbar">
				{#each tools as tool}
					<button type="button" title={tool.label} aria-label={tool.label} on:click={tool.run}>{tool.icon}</button>
				{/each}
				{#if tab === 'mistakes' && text.trim().length > 0}
					<button type="button" class="btn-sync-mistakes" on:click={syncToMistakeBook} title="Sync bullet lines to Mistake Book">
						⚡ Sync to Mistake Book
					</button>
				{/if}
				<span class="count">{text.length} chars</span>
				<button type="button" class="clear" on:click={() => { text = ''; onInput(); }}>Clear</button>
			</div>

			{#if previewMode}
				<div class="markdown-preview markdown-body">
					{@html renderMarkdownSync(text || '_Nothing written yet._')}
				</div>
			{:else}
				<textarea
					bind:this={textarea}
					bind:value={text}
					on:input={onInput}
					rows={6}
					placeholder={tab === 'post' ? 'What are your thoughts for today?' : 'Log any mistakes to avoid tomorrow...'}
					aria-label={tab === 'post' ? 'Post reflection' : 'Mistakes log'}
				></textarea>
			{/if}
		</div>
	{/if}
</section>

<style>
	.reflection { border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel); overflow: hidden; }
	.head { display: flex; align-items: center; gap: .6rem; width: 100%; padding: .85rem 1rem; border: 0; background: transparent; color: var(--text-primary); font-size: .82rem; font-weight: 750; cursor: pointer; }
	.head small { color: var(--text-secondary); font-size: .68rem; font-weight: 600; }
	.chev { display: grid; place-items: center; color: var(--text-secondary); transition: transform .18s ease; }
	.chev.rotated { transform: rotate(90deg); }
	.saved { margin-left: auto; color: var(--success, #2f9e6e); font-size: .64rem; font-weight: 700; }
	.body { display: grid; gap: .6rem; padding: 0 1rem 1rem; }
	.tabs { display: flex; align-items: center; gap: .4rem; }
	.tabs button[role="tab"] { height: 30px; padding: 0 .8rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 750; letter-spacing: .05em; text-transform: uppercase; cursor: pointer; }
	.tabs button[role="tab"].selected { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	
	.toggle-preview-btn {
		margin-left: auto;
		padding: .25rem .65rem;
		border-radius: 99px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: .62rem;
		font-weight: 800;
		letter-spacing: .05em;
		text-transform: uppercase;
		cursor: pointer;
		transition: all .15s ease;
	}
	.toggle-preview-btn:hover {
		border-color: var(--accent);
		color: var(--text-primary);
	}
	.toggle-preview-btn.active {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent);
	}

	.toolbar { display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
	.toolbar button { min-width: 28px; height: 28px; padding: 0 .35rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 700; font-family: inherit; cursor: pointer; }
	.toolbar button:hover { color: var(--text-primary); background: var(--surface-subtle); }
	
	.btn-sync-mistakes {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 26px !important;
		padding: 0 0.6rem !important;
		border-radius: 7px !important;
		background: color-mix(in srgb, var(--accent) 15%, transparent) !important;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent) !important;
		color: var(--accent) !important;
		font-size: 0.68rem !important;
		font-weight: 750 !important;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.btn-sync-mistakes:hover {
		background: var(--accent) !important;
		color: var(--accent-contrast, #fff) !important;
	}

	.count { margin-left: auto; color: var(--text-secondary); font-size: .64rem; }
	.clear { color: var(--danger, #e0455a) !important; }
	
	textarea { width: 100%; padding: .75rem .85rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); color: var(--text-primary); font-size: .82rem; font-family: inherit; line-height: 1.55; resize: vertical; box-sizing: border-box; }
	textarea:focus { outline: none; border-color: var(--accent); }

	.markdown-preview {
		width: 100%;
		min-height: 140px;
		max-height: 320px;
		overflow-y: auto;
		padding: .75rem .85rem;
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: .82rem;
		line-height: 1.55;
		box-sizing: border-box;
	}
</style>