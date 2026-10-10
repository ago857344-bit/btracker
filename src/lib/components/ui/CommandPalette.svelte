<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { isDarkTheme, presetOf, syncThemeWallpaper } from '$lib/state/themes';
	import { updateTracker } from '$lib/stores/tracker';
	import NavIcon from '$lib/components/NavIcon.svelte';

	let open = false;
	let query = '';
	let inputRef: HTMLInputElement;

	type NavIconName = import('svelte').ComponentProps<NavIcon>['name'];

	const STATIC_COMMANDS: Array<{ id: string, label: string, icon: NavIconName, action: () => void }> = [
		{ id: 'home', label: 'Go to Home', icon: 'home', action: () => { goto('/'); open = false; } },
		{ id: 'plan', label: 'Go to Plan', icon: 'plan', action: () => { goto('/plan'); open = false; } },
		{ id: 'review', label: 'Go to Review', icon: 'book', action: () => { goto('/review'); open = false; } },
		{ id: 'focus', label: 'Go to Focus', icon: 'focus', action: () => { goto('/focus'); open = false; } },
		{ id: 'revise', label: 'Go to Revise', icon: 'revise', action: () => { goto('/revise'); open = false; } },
		{ id: 'theme', label: 'Toggle Theme', icon: 'sun', action: () => {
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

	$: filteredCommands = query.trim() === '' 
		? STATIC_COMMANDS 
		: STATIC_COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

	$: showBrainDump = query.trim() !== '' && filteredCommands.length === 0;

	let selectedIndex = 0;

	$: {
		// Reset selection when query changes
		query; 
		selectedIndex = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			open = !open;
			if (open) {
				query = '';
				setTimeout(() => inputRef?.focus(), 50);
			}
			return;
		}

		if (!open) return;

		if (e.key === 'Escape') {
			open = false;
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
					updateTracker((state) => {
						if (!state.todos) state.todos = [];
						state.todos.push({
							id: crypto.randomUUID(),
							title: text,
							done: false,
							created: Date.now()
						});
					});
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
		<div class="backdrop" on:click={() => open = false}></div>
		<div class="modal" transition:scale={{ start: 0.96, duration: 200 }}>
			<div class="input-wrap">
				<NavIcon name="search" size={20} />
				<input
					bind:this={inputRef}
					bind:value={query}
					placeholder="What do you need?"
					spellcheck="false"
					autocomplete="off"
				/>
			</div>
			
			<div class="results">
				{#if showBrainDump}
					<button class="result-item selected" on:click={() => {
						const text = query.trim();
						if (text) {
							updateTracker((state) => {
								if (!state.todos) state.todos = [];
								state.todos.push({
									id: crypto.randomUUID(),
									title: text,
									done: false,
									created: Date.now()
								});
							});
							open = false;
						}
					}}>
						<NavIcon name="plus" size={16} />
						<span>Brain Dump: "{query}"</span>
					</button>
				{:else}
					{#each filteredCommands as cmd, i}
						<button 
							class="result-item" 
							class:selected={i === selectedIndex}
							on:click={cmd.action}
							on:mouseenter={() => selectedIndex = i}
						>
							<NavIcon name={cmd.icon} size={16} />
							<span>{cmd.label}</span>
						</button>
					{/each}
				{/if}
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
		padding-top: 20vh;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.2);
	}
	.modal {
		position: relative;
		width: 100%;
		max-width: 640px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
		border-radius: 16px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		backdrop-filter: var(--glass-filter, blur(10px));
	}
	.input-wrap {
		display: flex;
		align-items: center;
		padding: 1.2rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.2));
		gap: 1rem;
		color: var(--text-secondary);
	}
	input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1.25rem;
		color: var(--text-primary);
		font-weight: 500;
	}
	input::placeholder {
		color: var(--text-secondary);
		opacity: 0.5;
	}
	.results {
		padding: 0.5rem;
		max-height: 400px;
		overflow-y: auto;
	}
	.result-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.8rem 1rem;
		border: none;
		background: transparent;
		border-radius: 8px;
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		transition: all 0.1s;
	}
	.result-item.selected {
		background: var(--accent);
		color: white;
	}
	.result-item.selected :global(svg) {
		color: white;
	}
</style>
