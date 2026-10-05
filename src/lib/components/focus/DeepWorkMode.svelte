<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
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
  penalty: void;
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
    const handleVisibilityChange = () => {
      if (document.hidden && running && phase === 'focus') {
        dispatch('penalty');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

	
	// Soundscapes State
	const soundscapes = [
		{ id: 'rain', name: 'Rain', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
		{ id: 'fire', name: 'Fireplace', url: 'https://actions.google.com/sounds/v1/foley/fireplace_with_crackling_and_pops.ogg' },
		{ id: 'cafe', name: 'Cafe', url: 'https://actions.google.com/sounds/v1/crowds/cafe_restaurant_medium_crowd.ogg' },
		{ id: 'forest', name: 'Forest', url: 'https://actions.google.com/sounds/v1/ambiences/jungle_ambience_late_night.ogg' }
	];
	let activeSoundId = soundscapes[0].id;
	let isSoundPlaying = false;
	let soundVolume = 0.5;
	let soundMenuOpen = false;
	let audioElem: HTMLAudioElement;

	$: activeSoundUrl = soundscapes.find(s => s.id === activeSoundId)?.url;

	$: {
		if (audioElem) {
			audioElem.volume = soundVolume;
			if (isSoundPlaying) {
				audioElem.play().catch(e => console.error('Audio playback failed:', e));
			} else {
				audioElem.pause();
			}
		}
	}
	
	function toggleSoundMenu() {
		soundMenuOpen = !soundMenuOpen;
	}

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

	<!-- Soundscapes Component -->
	<audio bind:this={audioElem} src={activeSoundUrl} loop preload="none"></audio>
	
	<div class="soundscapes-widget">
		{#if soundMenuOpen}
			<div class="sound-menu" transition:fly={{ y: 20, duration: 250 }}>
				<div class="track-list">
					{#each soundscapes as sound}
						<button 
							type="button" 
							class="track-btn" 
							class:active={activeSoundId === sound.id}
							on:click={() => { activeSoundId = sound.id; isSoundPlaying = true; }}
						>
							{sound.name}
						</button>
					{/each}
				</div>
				<div class="volume-control">
					<NavIcon name="minus" size={16} />
					<input type="range" min="0" max="1" step="0.05" bind:value={soundVolume} class="vol-slider" />
					<NavIcon name="plus" size={16} />
				</div>
			</div>
		{/if}

		<div class="sound-controls">
			<button class="sound-toggle" class:active={soundMenuOpen} on:click={toggleSoundMenu} title="Soundscapes">
				<NavIcon name="headphones" size={24} />
			</button>
			{#if isSoundPlaying}
				<button class="play-btn active" on:click={() => isSoundPlaying = false} transition:fade={{ duration: 150 }}>
					<NavIcon name="pause" size={20} />
				</button>
			{:else}
				<button class="play-btn" on:click={() => isSoundPlaying = true} transition:fade={{ duration: 150 }}>
					<NavIcon name="play" size={20} />
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(10, 10, 16, 0.3) !important;
		backdrop-filter: blur(12px) saturate(180%) !important;
		-webkit-backdrop-filter: blur(12px) saturate(180%) !important;
		display: flex;
		flex-direction: column;
		transition: background-color 0.5s ease;
	}

	.overlay.break {
		background: color-mix(in srgb, var(--success, #2f9e6e), rgba(10, 10, 16, 0.3) 85%) !important;
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

	/* Soundscapes Styles */
	.soundscapes-widget {
		position: absolute;
		bottom: 2rem;
		right: 2rem;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1rem;
		z-index: 10;
	}

	.sound-menu {
		background: var(--surface-panel, rgba(20, 20, 25, 0.7));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid color-mix(in srgb, var(--accent), transparent 80%);
		border-radius: 16px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		min-width: 200px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.5);
	}

	.track-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.track-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		text-align: left;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.track-btn:hover {
		background: color-mix(in srgb, var(--accent), transparent 90%);
		color: var(--text-primary);
	}

	.track-btn.active {
		background: color-mix(in srgb, var(--accent), transparent 85%);
		color: var(--accent);
		font-weight: 600;
	}

	.volume-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--text-secondary);
	}

	.vol-slider {
		flex: 1;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.sound-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: var(--surface-panel, rgba(20, 20, 25, 0.7));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		padding: 0.5rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent), transparent 80%);
		box-shadow: 0 4px 15px rgba(0,0,0,0.3);
	}

	.sound-toggle, .play-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.sound-toggle:hover, .play-btn:hover {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--text-secondary), transparent 90%);
	}

	.sound-toggle.active {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent), transparent 85%);
	}

	.play-btn.active {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent), transparent 85%);
	}
</style>
