<script lang="ts">
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { setReflection, tracker } from '$lib/stores/tracker';
	import { timeOf } from '$lib/state/dates';

	export let day: string;
	export let open = false;

	let tab: 'post' | 'mistakes' = 'post';
	let text = '';
	let textarea: HTMLTextAreaElement;
	let saveTimer: ReturnType<typeof setTimeout>;

	$: entry = $tracker.refl[day];
	$: {
		// reload when day or tab changes (skip while user is typing the same field)
		if (document.activeElement !== textarea) text = (tab === 'post' ? entry?.post : entry?.mistakes) ?? '';
	}

	function onInput() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => setReflection(day, tab, text), 600);
	}

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
				<button type="button" role="tab" aria-selected={tab === 'post'} class:selected={tab === 'post'} on:click={() => { text = entry?.post ?? ''; tab = 'post'; }}>Post</button>
				<button type="button" role="tab" aria-selected={tab === 'mistakes'} class:selected={tab === 'mistakes'} on:click={() => { text = entry?.mistakes ?? ''; tab = 'mistakes'; }}>Mistakes</button>
				<span class="badge">Visual mode</span>
			</div>

			<div class="toolbar">
				{#each tools as tool}
					<button type="button" title={tool.label} aria-label={tool.label} on:click={tool.run}>{tool.icon}</button>
				{/each}
				<span class="count">{text.length} chars</span>
				<button type="button" class="clear" on:click={() => { text = ''; onInput(); }}>Clear</button>
			</div>

			<textarea
				bind:this={textarea}
				bind:value={text}
				on:input={onInput}
				rows={6}
				placeholder={tab === 'post' ? 'What are your thoughts for today?' : 'Log any mistakes to avoid tomorrow...'}
				aria-label={tab === 'post' ? 'Post reflection' : 'Mistakes log'}
			></textarea>
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
	.tabs button { height: 30px; padding: 0 .8rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 750; letter-spacing: .05em; text-transform: uppercase; cursor: pointer; }
	.tabs button.selected { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	.badge { margin-left: auto; padding: .22rem .55rem; border-radius: 99px; background: var(--accent-soft); color: var(--accent); font-size: .6rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
	.toolbar { display: flex; align-items: center; gap: .25rem; flex-wrap: wrap; }
	.toolbar button { min-width: 28px; height: 28px; padding: 0 .35rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 700; font-family: inherit; cursor: pointer; }
	.toolbar button:hover { color: var(--text-primary); background: var(--surface-subtle); }
	.count { margin-left: auto; color: var(--text-secondary); font-size: .64rem; }
	.clear { color: var(--danger, #e0455a) !important; }
	textarea { width: 100%; padding: .75rem .85rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); color: var(--text-primary); font-size: .82rem; font-family: inherit; line-height: 1.55; resize: vertical; }
	textarea:focus { outline: none; border-color: var(--accent); }
</style>
