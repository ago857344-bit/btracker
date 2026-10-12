<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import katex from 'katex';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { JEE_FORMULAS, type FormulaItem } from '$lib/data/formulas';
	import { uiClick } from '$lib/utils/feedback';

	export let open = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	let search = '';
	let selectedSubject: 'ALL' | 'P' | 'C' | 'M' = 'ALL';
	let selectedChapter = 'ALL';
	let starredOnly = false;
	let starredIds: string[] = [];
	let copiedId: string | null = null;
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		try {
			const saved = localStorage.getItem('btracker_starred_formulas');
			if (saved) starredIds = JSON.parse(saved);
		} catch {}
	});

	function toggleStar(id: string) {
		uiClick();
		if (starredIds.includes(id)) {
			starredIds = starredIds.filter((x) => x !== id);
		} else {
			starredIds = [...starredIds, id];
		}
		try {
			localStorage.setItem('btracker_starred_formulas', JSON.stringify(starredIds));
		} catch {}
	}

	function copyLatex(formula: FormulaItem) {
		uiClick();
		navigator.clipboard.writeText(formula.latex);
		copiedId = formula.id;
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => {
			copiedId = null;
		}, 1800);
	}

	function renderMath(tex: string): string {
		try {
			return katex.renderToString(tex, {
				displayMode: true,
				throwOnError: false
			});
		} catch {
			return `<code class="math-fallback">${tex}</code>`;
		}
	}

	$: availableChapters = Array.from(
		new Set(
			JEE_FORMULAS
				.filter((f) => selectedSubject === 'ALL' || f.subject === selectedSubject)
				.map((f) => f.chapterName)
		)
	).sort();

	$: filteredFormulas = JEE_FORMULAS.filter((f) => {
		if (selectedSubject !== 'ALL' && f.subject !== selectedSubject) return false;
		if (selectedChapter !== 'ALL' && f.chapterName !== selectedChapter) return false;
		if (starredOnly && !starredIds.includes(f.id)) return false;
		if (search.trim()) {
			const q = search.toLowerCase();
			const matchTitle = f.title.toLowerCase().includes(q);
			const matchChapter = f.chapterName.toLowerCase().includes(q);
			const matchDesc = (f.description || '').toLowerCase().includes(q);
			const matchTags = f.tags.some((t) => t.toLowerCase().includes(q));
			const matchLatex = f.latex.toLowerCase().includes(q);
			if (!matchTitle && !matchChapter && !matchDesc && !matchTags && !matchLatex) return false;
		}
		return true;
	});

	function close() {
		open = false;
		dispatch('close');
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div class="vault-backdrop" transition:fade={{ duration: 180 }} on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="-1"></div>

	<!-- Drawer -->
	<aside class="vault-drawer" transition:fly={{ x: 420, duration: 240 }} aria-label="Formula Vault">
		<header class="vault-header">
			<div class="header-top">
				<div class="title-wrap">
					<div class="vault-icon"><NavIcon name="book" size={17} /></div>
					<div>
						<h3>Formula Vault</h3>
						<p class="sub">High-yield JEE quick-sheet <span class="hotkey-pill">F</span></p>
					</div>
				</div>
				<button type="button" class="close-btn" aria-label="Close" on:click={close}>
					<NavIcon name="x" size={18} />
				</button>
			</div>

			<!-- Search -->
			<div class="search-wrap">
				<NavIcon name="search" size={15} />
				<input
					type="search"
					placeholder="Search formulas, chapters, topics..."
					bind:value={search}
				/>
				{#if search}
					<button type="button" class="clear-btn" on:click={() => (search = '')}>
						<NavIcon name="x" size={13} />
					</button>
				{/if}
			</div>

			<!-- Subject Filters -->
			<div class="filter-row">
				<div class="subject-pills">
					<button
						type="button"
						class="pill"
						class:active={selectedSubject === 'ALL'}
						on:click={() => { selectedSubject = 'ALL'; selectedChapter = 'ALL'; }}
					>
						All ({JEE_FORMULAS.length})
					</button>
					<button
						type="button"
						class="pill phy"
						class:active={selectedSubject === 'P'}
						on:click={() => { selectedSubject = 'P'; selectedChapter = 'ALL'; }}
					>
						Physics
					</button>
					<button
						type="button"
						class="pill chem"
						class:active={selectedSubject === 'C'}
						on:click={() => { selectedSubject = 'C'; selectedChapter = 'ALL'; }}
					>
						Chemistry
					</button>
					<button
						type="button"
						class="pill math"
						class:active={selectedSubject === 'M'}
						on:click={() => { selectedSubject = 'M'; selectedChapter = 'ALL'; }}
					>
						Maths
					</button>
				</div>

				<button
					type="button"
					class="star-toggle"
					class:active={starredOnly}
					title="Show Bookmarked Only"
					on:click={() => (starredOnly = !starredOnly)}
				>
					<NavIcon name="bookmark" size={14} />
					<span>{starredIds.length}</span>
				</button>
			</div>

			<!-- Chapter Selector -->
			{#if availableChapters.length > 1}
				<div class="chapter-row">
					<select bind:value={selectedChapter} class="chapter-select">
						<option value="ALL">All Chapters ({availableChapters.length})</option>
						{#each availableChapters as ch}
							<option value={ch}>{ch}</option>
						{/each}
					</select>
				</div>
			{/if}
		</header>

		<!-- Content List -->
		<div class="vault-body">
			{#if filteredFormulas.length === 0}
				<div class="empty-state">
					<div class="empty-icon"><NavIcon name="book" size={28} /></div>
					<h4>No formulas found</h4>
					<p>Try clearing your search or switching subjects.</p>
					{#if search || selectedChapter !== 'ALL' || starredOnly}
						<button type="button" class="reset-filter-btn" on:click={() => { search = ''; selectedSubject = 'ALL'; selectedChapter = 'ALL'; starredOnly = false; }}>
							Reset filters
						</button>
					{/if}
				</div>
			{:else}
				<div class="formula-grid">
					{#each filteredFormulas as item (item.id)}
						{@const isStarred = starredIds.includes(item.id)}
						<article class="formula-card {item.subject}">
							<div class="card-header">
								<div class="badges">
									<span class="sub-badge {item.subject}">
										{item.subject === 'P' ? 'Physics' : item.subject === 'C' ? 'Chemistry' : 'Maths'}
									</span>
									<span class="ch-badge">{item.chapterName}</span>
								</div>
								<div class="card-actions">
									<button
										type="button"
										class="action-btn"
										class:active={isStarred}
										title={isStarred ? 'Remove from bookmarks' : 'Bookmark formula'}
										on:click={() => toggleStar(item.id)}
									>
										<NavIcon name="bookmark" size={14} />
									</button>
									<button
										type="button"
										class="action-btn"
										class:copied={copiedId === item.id}
										title="Copy LaTeX"
										on:click={() => copyLatex(item)}
									>
										{#if copiedId === item.id}
											<NavIcon name="check" size={14} />
										{:else}
											<NavIcon name="copy" size={14} />
										{/if}
									</button>
								</div>
							</div>

							<h4 class="formula-title">{item.title}</h4>

							<div class="math-render">
								{@html renderMath(item.latex)}
							</div>

							{#if item.description}
								<p class="formula-desc">{item.description}</p>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</aside>
{/if}

<style>
	.vault-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(8, 7, 18, 0.55);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 9998;
	}

	.vault-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(540px, 95vw);
		background: var(--surface-panel);
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border-left: 1px solid var(--border-subtle);
		box-shadow: -8px 0 36px rgba(0, 0, 0, 0.45);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.vault-header {
		padding-top: calc(max(env(safe-area-inset-top), 0px) + 1.1rem);
		padding-left: max(env(safe-area-inset-left), 1.25rem);
		padding-right: max(env(safe-area-inset-right), 1.25rem);
		padding-bottom: 0.85rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title-wrap {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.vault-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		display: grid;
		place-items: center;
	}

	h3 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.sub {
		margin: 0.15rem 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.hotkey-pill {
		display: inline-block;
		padding: 0.05rem 0.35rem;
		background: var(--surface-canvas);
		border: 1px solid var(--border-subtle);
		border-radius: 5px;
		font-size: 0.65rem;
		font-weight: 700;
		font-family: inherit;
		color: var(--accent);
	}

	.close-btn {
		width: 36px;
		height: 36px;
		min-width: 36px;
		min-height: 36px;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel) 60%, transparent);
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.15s, color 0.15s, transform 0.1s;
	}

	.close-btn:hover {
		background: var(--surface-panel);
		color: var(--text-primary);
	}

	.close-btn:active {
		transform: scale(0.92);
	}

	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--surface-canvas);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 0 0.75rem;
		gap: 0.5rem;
		color: var(--text-secondary);
	}

	.search-wrap:focus-within {
		border-color: var(--accent);
	}

	.search-wrap input {
		flex: 1;
		height: 38px;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-primary);
		font-size: 0.85rem;
		font-family: inherit;
	}

	.clear-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		display: grid;
		place-items: center;
		padding: 0.2rem;
	}

	.filter-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.subject-pills {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		overflow-x: auto;
	}

	.pill {
		padding: 0.32rem 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
	}

	.pill.active {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
	}

	.pill.phy.active { background: #4cc9f0; border-color: #4cc9f0; color: #071720; }
	.pill.chem.active { background: #ff70a6; border-color: #ff70a6; color: #200713; }
	.pill.math.active { background: #a78bfa; border-color: #a78bfa; color: #140d28; }

	.star-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.32rem 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 700;
		cursor: pointer;
	}

	.star-toggle.active {
		border-color: #f59e0b;
		color: #f59e0b;
		background: color-mix(in srgb, #f59e0b 15%, transparent);
	}

	.chapter-row {
		display: flex;
	}

	.chapter-select {
		width: 100%;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		color: var(--text-primary);
		font-size: 0.78rem;
		font-family: inherit;
		padding: 0 0.6rem;
		outline: none;
		cursor: pointer;
	}

	.vault-body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem 2rem;
	}

	.formula-grid {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.formula-card {
		padding: 1rem 1.15rem;
		border-radius: 14px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		transition: transform 0.15s, border-color 0.15s;
	}

	.formula-card:hover {
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
		transform: translateY(-1px);
	}

	.formula-card.P { border-left: 3px solid #4cc9f0; }
	.formula-card.C { border-left: 3px solid #ff70a6; }
	.formula-card.M { border-left: 3px solid #a78bfa; }

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.45rem;
	}

	.badges {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.sub-badge {
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.12rem 0.45rem;
		border-radius: 5px;
	}

	.sub-badge.P { background: color-mix(in srgb, #4cc9f0 20%, transparent); color: #4cc9f0; }
	.sub-badge.C { background: color-mix(in srgb, #ff70a6 20%, transparent); color: #ff70a6; }
	.sub-badge.M { background: color-mix(in srgb, #a78bfa 20%, transparent); color: #a78bfa; }

	.ch-badge {
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.action-btn {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.action-btn.active {
		color: #f59e0b;
		border-color: #f59e0b;
	}

	.action-btn.copied {
		color: var(--success, #10b981);
		border-color: var(--success, #10b981);
	}

	.formula-title {
		margin: 0 0 0.6rem;
		font-size: 0.94rem;
		font-weight: 750;
		color: var(--text-primary);
	}

	.math-render {
		overflow-x: auto;
		overflow-y: hidden;
		padding: 0.75rem 0.85rem;
		background: var(--surface-canvas);
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
		margin-bottom: 0.55rem;
	}

	.formula-desc {
		margin: 0;
		font-size: 0.76rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--text-secondary);
	}

	.empty-icon {
		margin-bottom: 0.8rem;
		opacity: 0.6;
	}

	.empty-state h4 {
		margin: 0 0 0.35rem;
		color: var(--text-primary);
	}

	.reset-filter-btn {
		margin-top: 1rem;
		padding: 0.45rem 0.9rem;
		border-radius: 8px;
		background: var(--accent);
		color: white;
		border: none;
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
	}

	@media (max-width: 760px) {
		.vault-drawer {
			width: 100vw;
		}
		.vault-header {
			padding-top: calc(max(env(safe-area-inset-top), 24px) + 1.25rem);
			padding-left: 1rem;
			padding-right: 1rem;
			gap: 0.7rem;
		}
		.close-btn {
			width: 42px;
			height: 42px;
			min-width: 42px;
			min-height: 42px;
			border-radius: 12px;
		}
		.vault-body {
			padding: 0.85rem 1rem calc(max(env(safe-area-inset-bottom), 0px) + 2rem);
		}
	}
</style>
