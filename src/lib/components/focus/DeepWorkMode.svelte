<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import StatRing from '$lib/components/StatRing.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let running: boolean = false;
	export let dialTime: string = '00:00';
	export let ringProgress: number = 0;
	export let phase: 'focus' | 'break' = 'focus';
	export let subject: string | null = null;
	export let chapter: string = '';
	export let focusKind: 'questions' | 'theory' | 'revision' = 'questions';
	export let accent: string = 'var(--accent)';

	const dispatch = createEventDispatcher<{
		start: void;
		pause: void;
		exit: void;
	}>();

	const quotes = [
		"Work hard in silence, let your success be your noise.",
		"The difference between ordinary and extraordinary is that little extra.",
		"Don't stop when you're tired. Stop when you're done.",
		"Focus on the process, not the outcome.",
		"Discipline is choosing between what you want now and what you want most."
	];

	let quoteIndex = 0;
	
	onMount(() => {
		document.body.dataset.deepWork = 'true';
		const interval = setInterval(() => {
			quoteIndex = (quoteIndex + 1) % quotes.length;
		}, 30000);

		return () => {
			clearInterval(interval);
			delete document.body.dataset.deepWork;
		};
	});
</script>

<div class="overlay" class:break={phase === 'break'} transition:fade={{ duration: 300 }}>
	<div class="header">
		<div class="label">
			<NavIcon name="brain" size={20} />
			DEEP WORK MODE
		</div>
		<button class="exit-btn" type="button" title="Exit Deep Work" on:click={() => dispatch('exit')}>
			<NavIcon name="x" size={24} />
		</button>
	</div>

	<div class="content">
		<div class="dial-container" class:running style="--dial-color: {phase === 'break' ? 'var(--success, #2f9e6e)' : accent}">
			<StatRing value={ringProgress} size={320} stroke={18} color={phase === 'break' ? 'var(--success, #2f9e6e)' : accent}>
				<span class="time">{dialTime}</span>
				<span class="phase" style="color: {phase === 'break' ? 'var(--success, #2f9e6e)' : accent}">
					{phase === 'break' ? 'BREAK' : 'FOCUS'}
				</span>
				{#if subject}
					<span class="subject-line">{subject}{chapter ? ` · ${chapter}` : ''}</span>
				{/if}
				<span class="kind-badge">{focusKind.toUpperCase()}</span>
			</StatRing>
		</div>

		<button type="button" class="action-btn" on:click={() => running ? dispatch('pause') : dispatch('start')} style="--btn: {phase === 'break' ? 'var(--success, #2f9e6e)' : accent}">
			{running ? 'PAUSE' : 'START'}
		</button>
	</div>

	<div class="quote-container">
		{#key quoteIndex}
			<p class="quote" in:fade={{ duration: 1000 }}>"{quotes[quoteIndex]}"</p>
		{/key}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: var(--surface-canvas, #000);
		display: flex;
		flex-direction: column;
		transition: background-color 0.5s ease;
	}

	.overlay.break {
		background: color-mix(in srgb, var(--success, #2f9e6e), var(--surface-canvas, #000) 85%);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 2rem;
	}

	.label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--text-secondary);
	}

	.exit-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		transition: color 0.2s, background 0.2s;
	}

	.exit-btn:hover {
		color: var(--text-primary);
		background: var(--surface-panel);
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3rem;
	}

	.dial-container {
		position: relative;
		border-radius: 50%;
	}

	@keyframes pulse-glow {
		0% { box-shadow: 0 0 0px 0px color-mix(in srgb, var(--dial-color), transparent 70%); }
		50% { box-shadow: 0 0 40px 10px color-mix(in srgb, var(--dial-color), transparent 90%); }
		100% { box-shadow: 0 0 0px 0px color-mix(in srgb, var(--dial-color), transparent 70%); }
	}

	.dial-container.running {
		animation: pulse-glow 3s infinite ease-in-out;
	}

	.time {
		font-size: 3.5rem;
		font-family: monospace;
		font-weight: bold;
		line-height: 1;
	}

	.phase {
		font-size: 1.2rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		margin-top: 0.5rem;
	}

	.subject-line {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.kind-badge {
		margin-top: 0.75rem;
		padding: 0.2rem 0.6rem;
		background: var(--surface-subtle);
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--text-secondary);
	}

	.action-btn {
		padding: 1rem 3rem;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		border-radius: 999px;
		border: none;
		color: white;
		background: var(--btn, var(--accent));
		cursor: pointer;
		box-shadow: 0 8px 24px color-mix(in srgb, var(--btn, var(--accent)), transparent 60%);
		transition: transform 0.1s, box-shadow 0.2s;
	}

	.action-btn:active {
		transform: scale(0.95);
	}

	.quote-container {
		padding: 2rem;
		text-align: center;
		min-height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.quote {
		font-size: 1.1rem;
		color: var(--text-secondary);
		font-style: italic;
		max-width: 600px;
		line-height: 1.5;
	}
</style>
