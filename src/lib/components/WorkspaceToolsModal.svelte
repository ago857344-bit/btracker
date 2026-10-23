<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, togglePinnedNavTool, resetPinnedNavToDefault, celebration } from '$lib/stores/tracker';
	import { getDefaultNavForMode } from '$lib/state/defaults';

	export let open = false;

	type NavIconName = ComponentProps<NavIcon>['name'];

	interface ToolItem {
		href: string;
		label: string;
		icon: NavIconName;
		category: 'Core' | 'Focus & Daily' | 'Planning' | 'Revision & Tests' | 'Knowledge';
		desc: string;
		badge?: string;
	}

	const TOOLS: ToolItem[] = [
		{
			href: '/',
			label: 'Home',
			icon: 'home',
			category: 'Core',
			desc: 'Personalized command center with your live bento widgets, daily standing, and exam countdown.'
		},
		{
			href: '/focus',
			label: 'Focus & Deep Work',
			icon: 'focus',
			category: 'Focus & Daily',
			desc: 'Distraction-free Pomodoro dial, stopwatch, ambient audio soundscapes, and focus pet visualizer.'
		},
		{
			href: '/log',
			label: 'Question Log',
			icon: 'grid',
			category: 'Focus & Daily',
			desc: 'Chapter-wise practice problem tracker with accuracy ratings, timer intervals, and solve targets.'
		},
		{
			href: '/plan',
			label: 'Daily Planner',
			icon: 'plan',
			category: 'Planning',
			desc: 'Day & week agenda, coaching timetable lectures, study routines, and smart auto-plan balancing.'
		},
		{
			href: '/todo',
			label: 'To Do & Checklist',
			icon: 'list',
			category: 'Planning',
			desc: 'Chapter completion checklists, standard substeps (Ex 1 & Ex 2), and BTest syllabus scanner.'
		},
		{
			href: '/revise',
			label: 'Spaced Revision',
			icon: 'revise',
			category: 'Revision & Tests',
			desc: 'Active recall engine tracking memory decay curves and organizing daily revision queues.'
		},
		{
			href: '/tests',
			label: 'Tests & Mock Analytics',
			icon: 'tests',
			category: 'Revision & Tests',
			desc: 'Track full mock exam scores, negative marking penalty analysis, and test performance trends.'
		},
		{
			href: '/review',
			label: 'Review & Mistakes',
			icon: 'target',
			category: 'Revision & Tests',
			desc: 'Mistakes log, starred questions, reasons breakdown, and high-priority revision book.'
		},
		{
			href: '/dump',
			label: 'Study Dump & AI',
			icon: 'layers',
			category: 'Knowledge',
			desc: 'Rapid voice and PDF note ingestion with Gemini AI concept synthesis and crash courses.'
		},
		{
			href: '/stats',
			label: 'Stats & Weightage',
			icon: 'stats',
			category: 'Knowledge',
			desc: '365-day study matrix heatmap, subject Elo rating, and JEE Chapter Weightage ROI matrix.'
		},
		{
			href: '/reminders',
			label: 'Reminders & Deadlines',
			icon: 'reminders',
			category: 'Planning',
			desc: 'Homework alerts, revision milestones, and countdown timers for upcoming exam dates.'
		}
	];

	let query = '';
	let activeCategory = 'all';

	const CATEGORIES = ['all', 'Focus & Daily', 'Planning', 'Revision & Tests', 'Knowledge'] as const;

	$: flowMode = $tracker.ui?.studyFlowMode || 'all-features';
	$: pinnedHrefs = flowMode === 'all-features'
		? new Set(TOOLS.map((t) => t.href))
		: new Set($tracker.ui?.pinnedNav || getDefaultNavForMode(flowMode));

	$: filteredTools = TOOLS.filter((t) => {
		if (activeCategory !== 'all' && t.category !== activeCategory) return false;
		if (!query.trim()) return true;
		const q = query.toLowerCase().trim();
		return t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
	});

	function handleTogglePin(href: string, label: string) {
		togglePinnedNavTool(href);
		const willBePinned = !pinnedHrefs.has(href);
		if (navigator.vibrate) {
			try { navigator.vibrate(10); } catch {}
		}
		celebration.set(willBePinned ? `📌 Pinned "${label}" to sidebar` : `Unpinned "${label}" from sidebar`);
	}

	function handleNavigate(href: string) {
		open = false;
		void goto(href);
	}

	function handleResetDefaults() {
		resetPinnedNavToDefault();
		celebration.set('Reset sidebar navigation to mode defaults 🚀');
	}
</script>

<Modal bind:open title="Workspace Tools & Directory" width="640px">
	<div class="tools-modal">
		<header class="modal-subhead">
			<p class="subtitle">
				Pin the tools you use most to your sidebar, or jump straight to any page directly.
			</p>

			<!-- Search & Category Filters -->
			<div class="search-row">
				<div class="search-input-wrap">
					<span class="search-icon"><NavIcon name="search" size={14} /></span>
					<input
						type="text"
						placeholder="Search any tool or feature…"
						bind:value={query}
						class="search-input"
					/>
					{#if query}
						<button type="button" class="btn-clear" on:click={() => (query = '')}>
							<NavIcon name="x" size={13} />
						</button>
					{/if}
				</div>
			</div>

			<div class="cat-chips" role="tablist">
				{#each CATEGORIES as cat}
					<button
						type="button"
						class="cat-chip"
						class:active={activeCategory === cat}
						on:click={() => (activeCategory = cat)}
					>
						{cat === 'all' ? 'All Modules' : cat}
					</button>
				{/each}
			</div>
		</header>

		<!-- Tool Grid -->
		<div class="tools-list">
			{#if filteredTools.length > 0}
				{#each filteredTools as tool (tool.href)}
					{@const isPinned = pinnedHrefs.has(tool.href)}
					{@const isCore = tool.href === '/'}
					<div class="tool-card" class:pinned={isPinned}>
						<div class="tool-info" on:click={() => handleNavigate(tool.href)} role="button" tabindex="0" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNavigate(tool.href)}>
							<span class="tool-icon-wrap" class:pinned-icon={isPinned}>
								<NavIcon name={tool.icon} size={20} />
							</span>
							<div class="tool-meta">
								<div class="tool-name-row">
									<b class="tool-name">{tool.label}</b>
									<span class="tool-cat-badge">{tool.category}</span>
								</div>
								<p class="tool-desc">{tool.desc}</p>
							</div>
						</div>

						<div class="tool-actions">
							<button
								type="button"
								class="btn-open"
								title="Open {tool.label}"
								on:click={() => handleNavigate(tool.href)}
							>
								<span>Open</span>
								<NavIcon name="arrow-right" size={12} />
							</button>

							{#if isCore}
								<span class="core-pill" title="Home is always active in navigation">
									Always Active
								</span>
							{:else}
								<button
									type="button"
									class="btn-pin"
									class:is-pinned={isPinned}
									title={isPinned ? 'Remove from sidebar' : 'Pin to sidebar'}
									on:click={() => handleTogglePin(tool.href, tool.label)}
								>
									{#if isPinned}
										<NavIcon name="check" size={12} />
										<span>In Sidebar</span>
									{:else}
										<NavIcon name="plus" size={12} />
										<span>Add to Sidebar</span>
									{/if}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			{:else}
				<div class="empty-results">
					<NavIcon name="search" size={24} />
					<p>No tools match "{query}"</p>
					<button type="button" class="btn-reset-search" on:click={() => { query = ''; activeCategory = 'all'; }}>
						Show All Tools
					</button>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<footer class="modal-foot">
			<button type="button" class="btn-reset" on:click={handleResetDefaults} title="Reset pinned tools back to active study flow defaults">
				<NavIcon name="history" size={13} />
				<span>Reset to Mode Defaults</span>
			</button>
			<button type="button" class="btn-done" on:click={() => (open = false)}>
				Done
			</button>
		</footer>
	</div>
</Modal>

<style>
	.tools-modal {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.modal-subhead {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.subtitle {
		margin: 0;
		font-size: 0.76rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.search-row {
		display: flex;
		gap: 0.5rem;
	}

	.search-input-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		padding: 0.45rem 0.75rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface-subtle) 80%, transparent);
		border: 1px solid var(--border-subtle);
		transition: border-color 0.18s ease;
	}

	.search-input-wrap:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}

	.search-icon {
		color: var(--text-secondary);
		display: grid;
		place-items: center;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.82rem;
		color: var(--text-primary);
		font-family: inherit;
	}

	.btn-clear {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 2px;
		display: grid;
		place-items: center;
	}

	.btn-clear:hover {
		color: var(--text-primary);
	}

	.cat-chips {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
		padding-bottom: 2px;
		-webkit-overflow-scrolling: touch;
	}

	.cat-chip {
		font-size: 0.66rem;
		font-weight: 750;
		padding: 0.25rem 0.65rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--surface-subtle) 85%, transparent);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.cat-chip:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.cat-chip.active {
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		border-color: var(--accent);
	}

	.tools-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 48vh;
		overflow-y: auto;
		padding-right: 4px;
	}

	.tool-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0.85rem;
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface-subtle) 60%, transparent);
		border: 1px solid var(--border-subtle);
		transition: all 0.18s ease;
	}

	.tool-card:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--border-subtle));
		background: var(--surface-panel);
		transform: translateY(-1px);
	}

	.tool-card.pinned {
		border-color: color-mix(in srgb, var(--accent) 30%, var(--border-subtle));
	}

	.tool-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
		cursor: pointer;
		text-align: left;
	}

	.tool-icon-wrap {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--surface-panel) 90%, transparent);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		flex: 0 0 36px;
		transition: all 0.18s ease;
	}

	.tool-card:hover .tool-icon-wrap,
	.tool-icon-wrap.pinned-icon {
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.tool-meta {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}

	.tool-name-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.tool-name {
		font-size: 0.86rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.tool-cat-badge {
		font-size: 0.58rem;
		font-weight: 750;
		padding: 0.1rem 0.4rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--surface-subtle) 90%, transparent);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tool-desc {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.35;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tool-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: 0 0 auto;
	}

	.btn-open {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.35rem 0.6rem;
		border-radius: 8px;
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-open:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
		background: var(--surface-subtle);
	}

	.btn-pin {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border-radius: 8px;
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
		background: color-mix(in srgb, var(--surface-subtle) 85%, transparent);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.btn-pin:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.btn-pin.is-pinned {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
		color: var(--accent);
	}

	.core-pill {
		font-size: 0.66rem;
		font-weight: 800;
		padding: 0.35rem 0.65rem;
		border-radius: 8px;
		background: color-mix(in srgb, var(--surface-subtle) 90%, transparent);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.empty-results {
		display: grid;
		gap: 0.4rem;
		place-items: center;
		padding: 2.5rem 1rem;
		color: var(--text-secondary);
		text-align: center;
	}

	.btn-reset-search {
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		border: none;
		border-radius: 8px;
		padding: 0.4rem 0.8rem;
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
		margin-top: 0.3rem;
	}

	.modal-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-subtle);
	}

	.btn-reset {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		padding: 0.35rem 0.5rem;
		border-radius: 6px;
		transition: all 0.15s ease;
	}

	.btn-reset:hover {
		color: var(--accent);
		background: var(--surface-subtle);
	}

	.btn-done {
		padding: 0.45rem 1.25rem;
		border-radius: 9px;
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		border: none;
		font-size: 0.8rem;
		font-weight: 750;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.btn-done:hover {
		opacity: 0.92;
	}

	@media (max-width: 600px) {
		.tools-modal {
			gap: 0.75rem;
		}

		.tools-list {
			max-height: 52vh;
			padding-right: 0;
			gap: 0.55rem;
		}

		.tool-card {
			flex-direction: column;
			align-items: stretch;
			gap: 0.65rem;
			padding: 0.75rem;
		}

		.tool-actions {
			display: flex;
			align-items: center;
			gap: 0.45rem;
			width: 100%;
		}

		.btn-open,
		.btn-pin,
		.core-pill {
			flex: 1;
			justify-content: center;
			text-align: center;
			min-height: 38px;
			padding: 0.45rem 0.65rem;
			font-size: 0.74rem;
		}

		.modal-foot {
			flex-direction: column;
			gap: 0.5rem;
		}

		.modal-foot .btn-reset,
		.modal-foot .btn-done {
			width: 100%;
			justify-content: center;
			text-align: center;
			min-height: 38px;
		}
	}
</style>
