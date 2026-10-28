<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { isDarkTheme, presetOf, syncThemeWallpaper } from '$lib/state/themes';
	import { tracker, updateTracker, addTodo, openFormulaVault, formulaVaultOpen, customizingHome, openFeynmanDuck, openTestDaySheet, openWrappedStory, commandPaletteOpen } from '$lib/stores/tracker';
	import { JEE_FORMULAS } from '$lib/data/formulas';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import { allChaptersWithCustom } from '$lib/state/syllabus';
	import NavIcon from '$lib/components/NavIcon.svelte';

	let open = false;
	const close = () => {
		open = false;
		commandPaletteOpen.set(false);
	};
	$: if ($commandPaletteOpen) {
		open = true;
		query = '';
		setTimeout(() => inputRef?.focus(), 50);
	} else {
		open = false;
	}
	let query = '';
	let inputRef: HTMLInputElement;

	type NavIconName = import('svelte').ComponentProps<NavIcon>['name'];

	interface CommandItem {
		id: string;
		label: string;
		icon: NavIconName;
		category: 'navigation' | 'formula-chapter' | 'formula';
		subtitle?: string;
		badge?: string;
		badgeColor?: string;
		action: () => void;
	}

	const STATIC_COMMANDS: CommandItem[] = [
		{ id: 'home', label: 'Go to Home', icon: 'home', category: 'navigation', badge: 'Nav', action: () => { goto('/'); open = false; } },
		{ id: 'formula', label: 'Open Formula Vault (F)', icon: 'book', category: 'navigation', badge: 'Vault', badgeColor: 'var(--accent)', action: () => { openFormulaVault(); open = false; } },
		{ id: 'test-day-sheet', label: 'Test Day Paper Sheet: Print Mistakes & Starred Formulas', icon: 'printer', category: 'navigation', badge: 'Exam Day', badgeColor: '#10b981', action: () => { openTestDaySheet(); open = false; } },
		{ id: 'feynman', label: '🦆 Feynman Duck: Teach to Learn (Socratic AI)', icon: 'bulb', category: 'navigation', badge: 'Socratic', badgeColor: '#f59e0b', action: () => { openFeynmanDuck(); open = false; } },
		{ id: 'wrapped', label: '🌟 BTracker Season Wrapped Story (Recap)', icon: 'sparkles', category: 'navigation', badge: 'Story', badgeColor: '#8b5cf6', action: () => { openWrappedStory(); open = false; } },
		{ id: 'customize', label: 'Customize Home Dashboard', icon: 'settings', category: 'navigation', badge: 'Home', action: () => { goto('/'); customizingHome.set(true); open = false; } },
		{ id: 'log', label: 'Go to Question Log', icon: 'grid', category: 'navigation', badge: 'Nav', action: () => { goto('/log'); open = false; } },
		{ id: 'tests', label: 'Go to Tests & Mistake Log', icon: 'tests', category: 'navigation', badge: 'Nav', action: () => { goto('/tests'); open = false; } },
		{ id: 'mocks', label: 'Go to Mock Tests Dashboard', icon: 'trophy', category: 'navigation', badge: 'Tests', badgeColor: '#e17055', action: () => { goto('/tests'); open = false; } },
		{ id: 'flashcards', label: 'Go to Active Recall Flashcards', icon: 'layers', category: 'navigation', badge: 'Recall', badgeColor: '#6c5ce7', action: () => { goto('/revise?view=flashcards'); open = false; } },
		{ id: 'todo', label: 'Go to To Do / Brain Dumps', icon: 'list', category: 'navigation', badge: 'Tasks', action: () => { goto('/todo'); open = false; } },
		{ id: 'plan', label: 'Go to Plan', icon: 'plan', category: 'navigation', badge: 'Nav', action: () => { goto('/plan'); open = false; } },
		{ id: 'review', label: 'Go to Review', icon: 'target', category: 'navigation', badge: 'Nav', action: () => { goto('/review'); open = false; } },
		{ id: 'focus', label: 'Go to Focus & Pomodoro', icon: 'focus', category: 'navigation', badge: 'Focus', badgeColor: '#00b894', action: () => { goto('/focus'); open = false; } },
		{ id: 'revise', label: 'Go to Revise (Active Recall Hub)', icon: 'revise', category: 'navigation', badge: 'Recall', badgeColor: 'var(--accent)', action: () => { goto('/revise'); open = false; } },
		{ id: 'stats', label: 'Go to Stats & JEE Weightage Matrix', icon: 'stats', category: 'navigation', badge: 'Stats', action: () => { goto('/stats'); open = false; } },
		{ id: 'reminders', label: 'Go to Reminders', icon: 'reminders', category: 'navigation', badge: 'Alerts', action: () => { goto('/reminders'); open = false; } },
		{ id: 'settings', label: 'Go to Settings / Snapshot Vault', icon: 'settings', category: 'navigation', badge: 'Config', action: () => { goto('/settings'); open = false; } },
		{ id: 'theme', label: 'Toggle Dark / Light Theme', icon: 'sun', category: 'navigation', badge: 'Theme', action: () => {
			updateTracker((state) => {
				const goingDark = !isDarkTheme(state.theme);
				const target = goingDark ? 'dark' : 'light';
				state.theme = target;
				state.ui.accent = presetOf(target).accent;
				syncThemeWallpaper(state);
			});
			open = false;
		} }
	];

	interface ChapterMeta {
		name: string;
		subject: 'P' | 'C' | 'M';
		count: number;
	}

	const CHAPTERS_LIST: ChapterMeta[] = (() => {
		const map = new Map<string, { subject: 'P' | 'C' | 'M'; count: number }>();
		for (const f of JEE_FORMULAS) {
			const existing = map.get(f.chapterName);
			if (existing) {
				existing.count++;
			} else {
				map.set(f.chapterName, { subject: f.subject, count: 1 });
			}
		}
		return Array.from(map.entries()).map(([name, meta]) => ({
			name,
			subject: meta.subject,
			count: meta.count
		}));
	})();

	$: isGeneric = $tracker.coaching_type === 'GENERIC';
	$: navigationCommands = isGeneric
		? STATIC_COMMANDS
			.filter((command) => command.id !== 'review')
			.map((command) => command.id === 'log' ? { ...command, label: 'Go to Universal Study Log' } : command)
		: STATIC_COMMANDS;

	$: cleanQuery = query.trim().toLowerCase();
	$: isExplicitFormulaSearch = /^(form(ula)?(\s+hub)?|formulae|vault)\b/i.test(cleanQuery);
	$: searchKeyword = cleanQuery.replace(/^(form(ula)?(\s+hub)?|formulae|vault)\s*/i, '').trim();

	$: filteredCommands = (() => {
		if (cleanQuery === '') {
			return navigationCommands;
		}

		const items: CommandItem[] = [];

		if (!isExplicitFormulaSearch) {
			for (const cmd of navigationCommands) {
				if (cmd.label.toLowerCase().includes(cleanQuery)) {
					items.push(cmd);
				}
			}
		} else if (searchKeyword === '') {
			items.push({
				id: 'formula-vault-all',
				label: 'Open Complete Formula Vault',
				icon: 'book',
				category: 'navigation',
				subtitle: 'Browse all JEE Physics, Chemistry & Maths chapter formulas',
				badge: 'Vault',
				badgeColor: 'var(--accent)',
				action: () => { openFormulaVault(); open = false; }
			});
		}

		const kw = isExplicitFormulaSearch ? searchKeyword : cleanQuery;

		if (kw) {
			// Match chapters
			const matchedChapters = CHAPTERS_LIST.filter(c => c.name.toLowerCase().includes(kw));
			for (const ch of matchedChapters.slice(0, 5)) {
				const sName = subjectName(ch.subject) || ch.subject;
				const color = subjectColor(ch.subject);
				items.push({
					id: `ch-${ch.name}`,
					label: `${ch.name}`,
					icon: 'sigma',
					category: 'formula-chapter',
					subtitle: `${ch.count} formulas · Jump to chapter`,
					badge: sName,
					badgeColor: color,
					action: () => {
						openFormulaVault({ chapter: ch.name, subject: ch.subject });
						open = false;
					}
				});
			}

			// Match specific formulas
			let count = 0;
			for (const f of JEE_FORMULAS) {
				if (count >= 6) break;
				const matchTitle = f.title.toLowerCase().includes(kw);
				const matchTags = f.tags && f.tags.some(t => t.toLowerCase().includes(kw));
				const matchDesc = f.description && f.description.toLowerCase().includes(kw);

				if (matchTitle || matchTags || matchDesc) {
					const sName = subjectName(f.subject) || f.subject;
					const color = subjectColor(f.subject);
					items.push({
						id: `formula-${f.id}`,
						label: f.title,
						icon: 'calculator',
						category: 'formula',
						subtitle: `${f.chapterName} · ${sName}`,
						badge: 'Formula',
						badgeColor: color,
						action: () => {
							openFormulaVault({ chapter: f.chapterName, search: f.title, subject: f.subject });
							open = false;
						}
					});
					count++;
				}
			}

			// Match Syllabus Chapters (Question Log)
			for (const sub of ['P', 'C', 'M'] as const) {
				const sName = subjectName(sub) || sub;
				const chs = allChaptersWithCustom($tracker, sub);
				for (const ch of chs) {
					if (ch.name.toLowerCase().includes(kw)) {
						items.push({
							id: `syl-${sub}-${ch.no}`,
							label: `${ch.name}`,
							icon: 'grid',
							category: 'navigation',
							subtitle: `${sName} · Chapter ${ch.no} · Jump to Question Log`,
							badge: `${sName} Ch.${ch.no}`,
							badgeColor: subjectColor(sub),
							action: () => {
								goto(`/log?s=${sub}&c=${ch.no}`);
								commandPaletteOpen.set(false);
							}
						});
					}
				}
			}

			// Match Open To-Do Items
			for (const todo of ($tracker.todos || []).filter((t) => !t.done)) {
				if (todo.title.toLowerCase().includes(kw)) {
					items.push({
						id: `todo-${todo.id}`,
						label: todo.title,
						icon: 'list',
						category: 'navigation',
						subtitle: 'Open task in To-Do Checklist',
						badge: todo.roiTag || 'To-Do',
						badgeColor: '#3b82f6',
						action: () => {
							goto('/todo');
							commandPaletteOpen.set(false);
						}
					});
				}
			}

			// Match Study Dump Files
			for (const file of ($tracker.studyDump?.files || [])) {
				if (file.name.toLowerCase().includes(kw)) {
					items.push({
						id: `dump-${file.id}`,
						label: file.name,
						icon: 'download',
						category: 'navigation',
						subtitle: `Study Dump · ${file.section.toUpperCase()} (${(file.size / 1024).toFixed(0)} KB)`,
						badge: 'Dump',
						badgeColor: '#10b981',
						action: () => {
							goto(`/dump?q=${encodeURIComponent(file.name)}`);
							commandPaletteOpen.set(false);
						}
					});
				}
			}

			// Match Logged Mistakes
			for (const mistake of ($tracker.mistakes || [])) {
				if (mistake.description.toLowerCase().includes(kw) || (mistake.testName && mistake.testName.toLowerCase().includes(kw))) {
					items.push({
						id: `mistake-${mistake.id}`,
						label: mistake.description,
						icon: 'tests',
						category: 'navigation',
						subtitle: `${mistake.subject} · ${mistake.errorType}${mistake.testName ? ` in ${mistake.testName}` : ''}`,
						badge: mistake.errorType,
						badgeColor: '#ef4444',
						action: () => {
							goto('/tests?view=mistakes');
							commandPaletteOpen.set(false);
						}
					});
				}
			}
		} else if (isExplicitFormulaSearch && searchKeyword === '') {
			for (const ch of CHAPTERS_LIST.slice(0, 6)) {
				const sName = subjectName(ch.subject) || ch.subject;
				const color = subjectColor(ch.subject);
				items.push({
					id: `ch-${ch.name}`,
					label: `${ch.name}`,
					icon: 'sigma',
					category: 'formula-chapter',
					subtitle: `${ch.count} formulas in Formula Vault`,
					badge: sName,
					badgeColor: color,
					action: () => {
						openFormulaVault({ chapter: ch.name, subject: ch.subject });
						open = false;
					}
				});
			}
		}

		return items;
	})();

	$: showBrainDump = query.trim() !== '' && filteredCommands.length === 0;

	let selectedIndex = 0;

	$: {
		query; 
		selectedIndex = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			commandPaletteOpen.update((v) => !v);
			return;
		}

		if (!open) return;

		if (e.key === 'Escape') {
			close();
			return;
		}

		const totalOptions = showBrainDump ? 1 : filteredCommands.length;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % totalOptions;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + totalOptions) % totalOptions;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (showBrainDump) {
				const text = query.trim();
				if (text) {
					addTodo({ title: text, source: 'brain-dump' });
					open = false;
				}
			} else if (filteredCommands.length > 0) {
				filteredCommands[selectedIndex].action();
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div class="overlay" transition:fade={{ duration: 150 }}>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div class="backdrop" on:click={close}></div>
		<div class="modal" transition:scale={{ start: 0.96, duration: 200 }}>
			<div class="input-wrap">
				<NavIcon name="search" size={20} />
				<input
					bind:this={inputRef}
					bind:value={query}
					placeholder="What do you need? (e.g. 'form rotational', 'focus', 'maths')..."
					spellcheck="false"
					autocomplete="off"
				/>
				{#if query}
					<button type="button" class="clear-query" on:click={() => (query = '')} title="Clear search">
						<NavIcon name="x" size={14} />
					</button>
				{/if}
			</div>
			
			<div class="results">
				{#if showBrainDump}
					<button class="result-item selected" on:click={() => {
						const text = query.trim();
						if (text) {
							addTodo({ title: text, source: 'brain-dump' });
							close();
						}
					}}>
						<div class="item-icon-wrap" style="color: var(--accent);">
							<NavIcon name="plus" size={16} />
						</div>
						<div class="item-text">
							<span class="item-label">Brain Dump: "{query}"</span>
							<span class="item-subtitle">Press Enter to save this as a task in To Do</span>
						</div>
						<span class="item-badge" style="--b-color: var(--accent);">Brain Dump</span>
					</button>
				{:else}
					{#each filteredCommands as cmd, i (cmd.id)}
						<button 
							class="result-item" 
							class:selected={i === selectedIndex}
							on:click={cmd.action}
							on:mouseenter={() => selectedIndex = i}
						>
							<div class="item-icon-wrap" style="color: {cmd.badgeColor || 'var(--accent)'};">
								<NavIcon name={cmd.icon} size={16} />
							</div>
							<div class="item-text">
								<span class="item-label">{cmd.label}</span>
								{#if cmd.subtitle}
									<span class="item-subtitle">{cmd.subtitle}</span>
								{/if}
							</div>
							{#if cmd.badge}
								<span class="item-badge" style="--b-color: {cmd.badgeColor || 'var(--accent)'};">
									{cmd.badge}
								</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
			
			<div class="palette-footer">
				<span class="keys"><kbd>↵</kbd> Select / Open</span>
				<span class="keys"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
				<span class="keys"><kbd>esc</kbd> Close</span>
				<span class="tip"><kbd>form &lt;chapter&gt;</kbd> to search formulas</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: grid;
		place-items: center;
		align-items: start;
		padding-top: 15vh;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.60);
		backdrop-filter: blur(28px) saturate(190%);
		-webkit-backdrop-filter: blur(28px) saturate(190%);
	}
	.modal {
		position: relative;
		width: 100%;
		max-width: 660px;
		background: var(--surface-popup-solid, var(--surface-popup, #121020)) !important;
		border: 1px solid var(--surface-popup-border, color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16)));
		border-radius: 20px;
		box-shadow:
			0 24px 64px -8px rgba(0, 0, 0, 0.65),
			inset 0 1px 0 rgba(255, 255, 255, 0.14),
			inset 0 0 0 1px rgba(255, 255, 255, 0.04);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(36px) saturate(210%);
		-webkit-backdrop-filter: blur(36px) saturate(210%);
	}
	.input-wrap {
		display: flex;
		align-items: center;
		padding: 1.1rem 1.4rem;
		border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
		gap: 0.9rem;
		color: var(--text-secondary);
	}
	input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1.15rem;
		color: var(--text-primary);
		font-weight: 500;
	}
	input::placeholder {
		color: var(--text-secondary);
		opacity: 0.55;
		font-size: 1.05rem;
	}
	.clear-query {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.2rem;
		display: grid;
		place-items: center;
		border-radius: 4px;
	}
	.clear-query:hover {
		color: var(--text-primary);
	}
	.results {
		padding: 0.45rem;
		max-height: 420px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.result-item {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		padding: 0.65rem 0.85rem;
		border: none;
		background: transparent;
		border-radius: 10px;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: all 0.12s ease;
	}
	.result-item.selected {
		background: var(--accent);
		color: var(--accent-contrast, white);
	}
	.result-item.selected :global(svg) {
		color: var(--accent-contrast, white) !important;
	}
	.item-icon-wrap {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, currentColor 14%, transparent);
		flex-shrink: 0;
	}
	.result-item.selected .item-icon-wrap {
		background: color-mix(in srgb, var(--accent-contrast, white) 22%, transparent);
		color: var(--accent-contrast, white) !important;
	}
	.item-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}
	.item-label {
		font-size: 0.95rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.item-subtitle {
		font-size: 0.76rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		opacity: 0.85;
	}
	.result-item.selected .item-subtitle {
		color: color-mix(in srgb, var(--accent-contrast, white) 85%, transparent);
		opacity: 1;
	}
	.item-badge {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--b-color) 16%, transparent);
		color: var(--b-color);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		flex-shrink: 0;
	}
	.result-item.selected .item-badge {
		background: rgba(255, 255, 255, 0.25);
		color: var(--accent-contrast, #fff);
	}
	.palette-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.55rem 1.1rem;
		border-top: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.15));
		background: var(--surface-subtle);
		font-size: 0.72rem;
		color: var(--text-secondary);
	}
	.keys { display: inline-flex; align-items: center; gap: 0.3rem; }
	kbd {
		padding: 0.15rem 0.35rem;
		border-radius: 4px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		font-family: inherit;
		font-size: 0.68rem;
	}
	.tip { margin-left: auto; display: inline-flex; align-items: center; gap: 0.3rem; }

	@media (max-width: 768px) {
		.overlay {
			padding: max(env(safe-area-inset-top, 0px), 1rem) 0.75rem calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 0.5rem);
			align-items: flex-start;
		}
		.modal {
			max-height: calc(100dvh - max(env(safe-area-inset-top, 0px), 1rem) - 2rem);
			border-radius: 16px;
		}
		.input-wrap {
			padding: 0.85rem 1rem;
		}
		input {
			font-size: 1rem;
		}
		.palette-footer {
			display: none;
		}
		.results {
			max-height: 55vh;
			-webkit-overflow-scrolling: touch;
			touch-action: pan-y;
		}
		.result-item {
			padding: 0.75rem 0.85rem;
			min-height: 48px;
		}
	}

	:global(:root[data-theme='light']) .modal,
	:global(:root[data-theme='notion']) .modal,
	:global(:root[data-theme='duolingo']) .modal,
	:global(:root[data-theme='anki']) .modal,
	:global(:root[data-theme='master']) .modal {
		background: #ffffff !important;
		border: 1px solid var(--border-subtle) !important;
		box-shadow: 0 24px 64px -8px rgba(44, 37, 92, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.95) !important;
	}
	:global(:root[data-theme='light']) .palette-footer,
	:global(:root[data-theme='notion']) .palette-footer,
	:global(:root[data-theme='duolingo']) .palette-footer,
	:global(:root[data-theme='anki']) .palette-footer,
	:global(:root[data-theme='master']) .palette-footer {
		background: #f7f7fb !important;
		border-top-color: var(--border-subtle) !important;
	}
	:global(:root[data-theme='light']) kbd,
	:global(:root[data-theme='notion']) kbd,
	:global(:root[data-theme='duolingo']) kbd,
	:global(:root[data-theme='anki']) kbd,
	:global(:root[data-theme='master']) kbd {
		background: #ffffff !important;
		border-color: var(--border-subtle) !important;
		color: var(--text-primary) !important;
	}
</style>
