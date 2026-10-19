<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { JEE_FORMULAS, type FormulaItem } from '$lib/data/formulas';
	import { uiClick } from '$lib/utils/feedback';
	import { formulaVaultFilter } from '$lib/stores/tracker';

	export let open = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	let search = '';
	let selectedSubject: 'ALL' | 'P' | 'C' | 'M' = 'ALL';
	let selectedChapter = 'ALL';
	let starredOnly = false;
	let starredIds: string[] = [];
	let copiedId: string | null = null;
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;
	let collapsedGroups: Record<string, boolean> = {};

	let katexModule: any = null;
	let renderTick = 0;
	async function ensureKatex() {
		if (!katexModule) {
			const mod = await import('katex');
			katexModule = mod.default || mod;
			renderTick++;
		}
	}
	$: if (open && !katexModule) {
		ensureKatex();
	}

	$: if (open && $formulaVaultFilter) {
		const filter = $formulaVaultFilter;
		if (filter.search !== undefined || filter.chapter !== undefined || filter.subject !== undefined) {
			if (filter.search !== undefined) search = filter.search;
			if (filter.chapter !== undefined) selectedChapter = filter.chapter;
			if (filter.subject !== undefined) selectedSubject = filter.subject;
			formulaVaultFilter.set({});
		}
	}

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

	function renderMath(tex: string, _tick = 0): string {
		if (katexModule) {
			try {
				return katexModule.renderToString(tex, {
					displayMode: true,
					throwOnError: false
				});
			} catch {
				return `<code class="math-fallback">${tex}</code>`;
			}
		}
		return `<code class="math-fallback">${tex}</code>`;
	}

	$: availableChapters = Array.from(
		new Set(
			JEE_FORMULAS
				.filter((f) => selectedSubject === 'ALL' || f.subject === selectedSubject)
				.map((f) => f.chapterName)
		)
	).sort();

	interface ChapterInfo {
		chapter: string;
		count: number;
		subject: 'P' | 'C' | 'M';
	}

	$: chapterPills = (() => {
		const list: ChapterInfo[] = [];
		for (const ch of availableChapters) {
			const matching = JEE_FORMULAS.filter((f) => {
				if (selectedSubject !== 'ALL' && f.subject !== selectedSubject) return false;
				return f.chapterName === ch;
			});
			if (matching.length > 0) {
				list.push({
					chapter: ch,
					count: matching.length,
					subject: matching[0].subject
				});
			}
		}
		return list;
	})();

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

	interface ChapterGroup {
		key: string;
		subject: 'P' | 'C' | 'M';
		chapterName: string;
		formulas: FormulaItem[];
	}

	$: chapterGroups = (() => {
		const map = new Map<string, ChapterGroup>();
		for (const f of filteredFormulas) {
			const key = `${f.subject}__${f.chapterName}`;
			if (!map.has(key)) {
				map.set(key, {
					key,
					subject: f.subject,
					chapterName: f.chapterName,
					formulas: []
				});
			}
			map.get(key)!.formulas.push(f);
		}
		return Array.from(map.values());
	})();

	function selectSingleChapter(chapter: string) {
		uiClick();
		selectedChapter = chapter;
	}

	function resetChapter() {
		uiClick();
		selectedChapter = 'ALL';
	}

	function toggleGroupCollapse(key: string) {
		uiClick();
		collapsedGroups[key] = !collapsedGroups[key];
		collapsedGroups = { ...collapsedGroups };
	}

	function close() {
		open = false;
		dispatch('close');
	}
</script>

<svelte:window on:keydown={(e) => { if (open && e.key === 'Escape') close(); }} />

{#if open}
	<!-- Backdrop -->
	<div class="vault-backdrop" transition:fade={{ duration: 180 }} on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="-1"></div>

	<!-- Drawer -->
	<aside class="vault-drawer" transition:fly={{ x: 480, duration: 240 }} aria-label="Formula Vault">
		<header class="vault-header">
			<div class="header-top">
				<div class="title-wrap">
					<div class="vault-icon"><NavIcon name="book" size={17} /></div>
					<div>
						<h3>Formula Vault</h3>
						<p class="sub">Complete JEE Chapter-Wise Formulas <span class="hotkey-pill">F</span></p>
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
					placeholder="Search formulas, chapters, topics, LaTeX..."
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

			<!-- Chapter Quick-Nav Horizontal Rail -->
			<div class="chapter-rail-container">
				<div class="chapter-rail" role="tablist" aria-label="Chapter Filter">
					<button
						type="button"
						class="ch-pill"
						class:active={selectedChapter === 'ALL'}
						on:click={resetChapter}
					>
						<span>All Chapters</span>
						<span class="count-badge">{filteredFormulas.length}</span>
					</button>
					{#each chapterPills as item (item.chapter)}
						<button
							type="button"
							class="ch-pill {item.subject}"
							class:active={selectedChapter === item.chapter}
							on:click={() => selectSingleChapter(item.chapter)}
						>
							<span>{item.chapter}</span>
							<span class="count-badge">{item.count}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Alphabetical Chapter Dropdown Jump -->
			{#if availableChapters.length > 1}
				<div class="chapter-dropdown-row">
					<span class="dropdown-label">Jump to chapter:</span>
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
					<p>Try clearing your search query or choosing another chapter/subject.</p>
					{#if search || selectedChapter !== 'ALL' || starredOnly}
						<button type="button" class="reset-filter-btn" on:click={() => { search = ''; selectedSubject = 'ALL'; selectedChapter = 'ALL'; starredOnly = false; }}>
							Reset all filters
						</button>
					{/if}
				</div>
			{:else if selectedChapter !== 'ALL'}
				<!-- Focused Single Chapter Mode -->
				<div class="focused-chapter-header">
					<div class="hero-info">
						<span class="sub-badge {filteredFormulas[0]?.subject}">
							{filteredFormulas[0]?.subject === 'P' ? 'Physics' : filteredFormulas[0]?.subject === 'C' ? 'Chemistry' : 'Maths'}
						</span>
						<h2 class="focused-title">{selectedChapter}</h2>
						<span class="count-tag">{filteredFormulas.length} Formulas Available</span>
					</div>
					<button type="button" class="all-chapters-btn" on:click={resetChapter}>
						<span>All Chapters</span>
						<NavIcon name="arrow-right" size={13} />
					</button>
				</div>

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
								{@html renderMath(item.latex, renderTick)}
							</div>

							{#if item.description}
								<p class="formula-desc">{item.description}</p>
							{/if}

							{#if item.tags && item.tags.length > 0}
								<div class="formula-tags">
									{#each item.tags as tag}
										<span class="tag-pill">#{tag}</span>
									{/each}
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{:else}
				<!-- Multi-Chapter Grouped Mode -->
				<div class="chapter-groups-container">
					{#each chapterGroups as group (group.key)}
						{@const isCollapsed = collapsedGroups[group.key]}
						<section class="chapter-section {group.subject}">
							<div class="chapter-section-header">
								<button
									type="button"
									class="chapter-header-left"
									on:click={() => toggleGroupCollapse(group.key)}
									title={isCollapsed ? 'Expand Chapter' : 'Collapse Chapter'}
								>
									<span class="ch-indicator-dot {group.subject}"></span>
									<h4 class="chapter-group-title">{group.chapterName}</h4>
									<span class="chapter-count-pill">{group.formulas.length}</span>
								</button>
								<div class="chapter-header-right">
									<button
										type="button"
										class="focus-btn"
										title="View only this chapter"
										on:click={() => selectSingleChapter(group.chapterName)}
									>
										Focus
									</button>
									<button
										type="button"
										class="collapse-btn"
										on:click={() => toggleGroupCollapse(group.key)}
										title={isCollapsed ? 'Expand' : 'Collapse'}
									>
										<NavIcon name={isCollapsed ? 'chevron-down' : 'chevron-right'} size={14} />
									</button>
								</div>
							</div>

							{#if !isCollapsed}
								<div class="formula-grid">
									{#each group.formulas as item (item.id)}
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
												{@html renderMath(item.latex, renderTick)}
											</div>

											{#if item.description}
												<p class="formula-desc">{item.description}</p>
											{/if}

											{#if item.tags && item.tags.length > 0}
												<div class="formula-tags">
													{#each item.tags as tag}
														<span class="tag-pill">#{tag}</span>
													{/each}
												</div>
											{/if}
										</article>
									{/each}
								</div>
							{/if}
						</section>
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
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(28px) saturate(190%);
		-webkit-backdrop-filter: blur(28px) saturate(190%);
		z-index: 9998;
	}

	.vault-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(600px, 95vw);
		background: color-mix(in srgb, var(--surface-panel, #121020) 96%, transparent);
		backdrop-filter: blur(36px) saturate(210%);
		-webkit-backdrop-filter: blur(36px) saturate(210%);
		border-left: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16));
		box-shadow: -16px 0 60px rgba(0, 0, 0, 0.65), inset 1px 0 0 rgba(255, 255, 255, 0.12);
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

	/* Chapter Pill Rail */
	.chapter-rail-container {
		width: 100%;
		overflow: hidden;
	}

	.chapter-rail {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		overflow-x: auto;
		padding-bottom: 0.2rem;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	.chapter-rail::-webkit-scrollbar {
		display: none;
	}

	.ch-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.26rem 0.6rem;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s;
	}

	.ch-pill:hover {
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
		color: var(--text-primary);
	}

	.ch-pill.active {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-canvas));
		color: var(--accent);
		border-color: var(--accent);
		font-weight: 700;
	}

	.ch-pill.P.active {
		background: color-mix(in srgb, #4cc9f0 18%, var(--surface-canvas));
		color: #4cc9f0;
		border-color: #4cc9f0;
	}

	.ch-pill.C.active {
		background: color-mix(in srgb, #ff70a6 18%, var(--surface-canvas));
		color: #ff70a6;
		border-color: #ff70a6;
	}

	.ch-pill.M.active {
		background: color-mix(in srgb, #a78bfa 18%, var(--surface-canvas));
		color: #a78bfa;
		border-color: #a78bfa;
	}

	.count-badge {
		display: inline-block;
		font-size: 0.64rem;
		padding: 0.05rem 0.32rem;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 14%, transparent);
	}

	.chapter-dropdown-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dropdown-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.chapter-select {
		flex: 1;
		height: 30px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-canvas);
		color: var(--text-primary);
		font-size: 0.76rem;
		font-family: inherit;
		padding: 0 0.5rem;
		outline: none;
		cursor: pointer;
	}

	.vault-body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem 2.5rem;
	}

	/* Focused Single Chapter Header Banner */
	.focused-chapter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.15rem;
		background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		margin-bottom: 1rem;
		gap: 0.75rem;
	}

	.hero-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.focused-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.count-tag {
		font-size: 0.72rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.all-chapters-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		background: var(--surface-canvas);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
	}

	.all-chapters-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	/* Chapter Groups */
	.chapter-groups-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.chapter-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.chapter-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.45rem 0.6rem;
		background: color-mix(in srgb, var(--surface-subtle) 90%, transparent);
		border-radius: 9px;
		border: 1px solid var(--border-subtle);
	}

	.chapter-header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.ch-indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.ch-indicator-dot.P { background: #4cc9f0; box-shadow: 0 0 8px rgba(76, 201, 240, 0.5); }
	.ch-indicator-dot.C { background: #ff70a6; box-shadow: 0 0 8px rgba(255, 112, 166, 0.5); }
	.ch-indicator-dot.M { background: #a78bfa; box-shadow: 0 0 8px rgba(167, 139, 250, 0.5); }

	.chapter-group-title {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 750;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.chapter-count-pill {
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-secondary);
		background: var(--surface-canvas);
		padding: 0.08rem 0.4rem;
		border-radius: 999px;
		border: 1px solid var(--border-subtle);
	}

	.chapter-header-right {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.focus-btn {
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-secondary);
		background: var(--surface-canvas);
		border: 1px solid var(--border-subtle);
		padding: 0.2rem 0.55rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.focus-btn:hover {
		color: var(--accent);
		border-color: var(--accent);
	}

	.collapse-btn {
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0;
		border-radius: 4px;
	}

	.collapse-btn:hover {
		color: var(--text-primary);
	}

	/* Formula Cards */
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
		margin: 0 0 0.55rem;
		font-size: 0.76rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.formula-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.tag-pill {
		font-size: 0.65rem;
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--surface-panel) 60%, transparent);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		border: 1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent);
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

	@media (max-width: 768px) {
		.vault-drawer {
			width: 100vw;
			max-width: 100vw;
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
		.focused-chapter-header {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
