<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let open = false;

	interface ShortcutItem {
		keys: string[];
		description: string;
		context?: string;
	}

	interface ShortcutGroup {
		title: string;
		icon: import('svelte').ComponentProps<NavIcon>['name'];
		shortcuts: ShortcutItem[];
	}

	const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
	const cmdKey = isMac ? '⌘' : 'Ctrl';

	$: GROUPS = [
		{
			title: 'Global Essentials',
			icon: 'sparkles' as const,
			shortcuts: [
				{ keys: [cmdKey, 'K'], description: 'Open Command Palette & Quick Search' },
				{ keys: ['F'], description: 'Toggle Formula Vault & Quick Math Lookup' },
				{ keys: ['?'], description: 'Show Keyboard Shortcuts (this cheatsheet)' },
				{ keys: ['Esc'], description: 'Close any active modal, drawer, or palette' }
			]
		},
		{
			title: 'Focus & Timers',
			icon: 'focus' as const,
			shortcuts: [
				{ keys: ['Space'], description: 'Start / Pause active Pomodoro or Stopwatch' },
				{ keys: ['+'], description: 'Add 5 minutes to active study block' },
				{ keys: ['S'], description: 'Stop and save current session' }
			]
		},
		{
			title: 'Quick App Navigation',
			icon: 'layers' as const,
			shortcuts: [
				{ keys: ['1'], description: 'Go to Home Command Center', context: 'Nav' },
				{ keys: ['2'], description: 'Go to Question Log', context: 'Nav' },
				{ keys: ['3'], description: 'Go to Focus & Stopwatch', context: 'Nav' },
				{ keys: ['4'], description: 'Go to Tasks & Brain Dump', context: 'Nav' },
				{ keys: ['5'], description: 'Go to Settings & Cosmetics', context: 'Nav' }
			]
		}
	];
</script>

<Modal bind:open title="Keyboard Shortcuts" width="520px">
	<div class="cheatsheet">
		<p class="intro">
			Speed through BTracker without touching your mouse. Use these power-user shortcuts anywhere in the application.
		</p>

		{#each GROUPS as group}
			<div class="shortcut-group">
				<div class="group-header">
					<NavIcon name={group.icon} size={15} />
					<h4>{group.title}</h4>
				</div>
				<div class="shortcut-list">
					{#each group.shortcuts as item}
						<div class="shortcut-row">
							<span class="desc">{item.description}</span>
							<div class="keys">
								{#each item.keys as k}
									<kbd>{k}</kbd>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<svelte:fragment slot="footer">
		<button type="button" class="btn-done" on:click={() => (open = false)}>
			Got it
		</button>
	</svelte:fragment>
</Modal>

<style>
	.cheatsheet {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.intro {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.shortcut-group {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.85rem 1rem;
		border-radius: 14px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--accent);
	}

	.group-header h4 {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.shortcut-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.35rem 0.2rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 40%, transparent);
	}

	.shortcut-row:last-child {
		border-bottom: none;
	}

	.desc {
		font-size: 0.82rem;
		color: var(--text-primary);
		font-weight: 600;
	}

	.keys {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}

	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 24px;
		padding: 0 0.45rem;
		border-radius: 6px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 2px 0 var(--border-subtle), 0 1px 3px rgba(0, 0, 0, 0.2);
		color: var(--accent);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.74rem;
		font-weight: 800;
		user-select: none;
	}

	.btn-done {
		height: 38px;
		padding: 0 1.25rem;
		border-radius: 10px;
		border: none;
		background: var(--accent);
		color: var(--accent-contrast, white);
		font-size: 0.82rem;
		font-weight: 750;
		cursor: pointer;
		transition: opacity 0.15s;
		font-family: inherit;
	}

	.btn-done:hover {
		opacity: 0.9;
	}
</style>
