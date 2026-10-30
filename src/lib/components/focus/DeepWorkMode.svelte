<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import StatRing from '$lib/components/StatRing.svelte';
	import { loadout } from '$lib/stores/cosmetics';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import FocusPetCompanion from '$lib/components/focus/FocusPetCompanion.svelte';

	import { tracker, toggleTask, toggleTodo, toggleTodoSubtask } from '$lib/stores/tracker';
	import { todayKey } from '$lib/state/dates';

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
		penalty: { reason?: string } | void;
	}>();

	$: focusPet = $tracker.settings?.focusPet || 'orb';
	let isShattering = false;

	function handleExit() {
		if (running && phase === 'focus') {
			isShattering = true;
			setTimeout(() => {
				dispatch('exit');
			}, 800);
		} else {
			dispatch('exit');
		}
	}

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
				dispatch('penalty', { reason: 'Browser Tab Switch' });
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Native macOS OS-Level Process & Window Blocker via Tauri
		const tauriPoll = setInterval(async () => {
			if (running && phase === 'focus' && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
				try {
					const { invoke } = await import('@tauri-apps/api/core');
					const res = await invoke<{ blocked: boolean; frontmost_app: string; matched_term: string }>('check_distraction_and_refocus');
					if (res && res.blocked) {
						dispatch('penalty', { reason: `${res.frontmost_app || 'App'} (${res.matched_term})` });
					}
				} catch {}
			}
		}, 1800);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			clearInterval(tauriPoll);
		};
	});

	
	// Soundscapes State (Online + Offline Procedural Web Audio API)
	interface SoundscapeItem {
		id: string;
		name: string;
		kind: 'procedural' | 'audio';
		url?: string;
		badge?: string;
	}

	const soundscapes: SoundscapeItem[] = [
		{ id: 'brown', name: 'Brown Noise', kind: 'procedural', badge: 'Offline' },
		{ id: 'pink', name: 'Pink Rain', kind: 'procedural', badge: 'Offline' },
		{ id: 'binaural', name: '40Hz Binaural Focus', kind: 'procedural', badge: 'Offline' },
		{ id: 'rain', name: 'Rain Stream', kind: 'audio', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
		{ id: 'fire', name: 'Fireplace', kind: 'audio', url: 'https://actions.google.com/sounds/v1/foley/fireplace_with_crackling_and_pops.ogg' },
		{ id: 'cafe', name: 'Cafe Ambience', kind: 'audio', url: 'https://actions.google.com/sounds/v1/crowds/cafe_restaurant_medium_crowd.ogg' },
		{ id: 'forest', name: 'Late Night Forest', kind: 'audio', url: 'https://actions.google.com/sounds/v1/ambiences/jungle_ambience_late_night.ogg' }
	];

	let activeSoundId = soundscapes[0].id;
	let isSoundPlaying = false;
	let soundVolume = 0.5;
	let soundMenuOpen = false;
	let audioElem: HTMLAudioElement;

	// Web Audio API Procedural Sound Engine
	let audioCtx: AudioContext | null = null;
	let proceduralGain: GainNode | null = null;
	let proceduralSource: AudioNode | null = null;
	let proceduralOsc1: OscillatorNode | null = null;
	let proceduralOsc2: OscillatorNode | null = null;

	function getAudioContext(): AudioContext {
		if (!audioCtx) {
			const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
			audioCtx = new AudioContextClass();
		}
		if (audioCtx && audioCtx.state === 'suspended') {
			audioCtx.resume();
		}
		return audioCtx!;
	}

	function stopProcedural() {
		try {
			if (proceduralSource) {
				(proceduralSource as any).stop?.();
				proceduralSource.disconnect();
				proceduralSource = null;
			}
			if (proceduralOsc1) {
				proceduralOsc1.stop();
				proceduralOsc1.disconnect();
				proceduralOsc1 = null;
			}
			if (proceduralOsc2) {
				proceduralOsc2.stop();
				proceduralOsc2.disconnect();
				proceduralOsc2 = null;
			}
			if (proceduralGain) {
				proceduralGain.disconnect();
				proceduralGain = null;
			}
		} catch (e) {
			console.warn('Error stopping procedural audio:', e);
		}
	}

	function startProcedural(id: 'brown' | 'pink' | 'binaural') {
		stopProcedural();
		try {
			const ctx = getAudioContext();
			proceduralGain = ctx.createGain();
			proceduralGain.gain.setValueAtTime(soundVolume * 0.7, ctx.currentTime);
			proceduralGain.connect(ctx.destination);

			if (id === 'binaural') {
				// 40Hz Gamma Binaural Beat (Left 200Hz, Right 240Hz)
				const merger = ctx.createChannelMerger(2);
				
				proceduralOsc1 = ctx.createOscillator();
				proceduralOsc1.type = 'sine';
				proceduralOsc1.frequency.setValueAtTime(200, ctx.currentTime);
				
				proceduralOsc2 = ctx.createOscillator();
				proceduralOsc2.type = 'sine';
				proceduralOsc2.frequency.setValueAtTime(240, ctx.currentTime);

				proceduralOsc1.connect(merger, 0, 0);
				proceduralOsc2.connect(merger, 0, 1);
				merger.connect(proceduralGain);

				proceduralOsc1.start();
				proceduralOsc2.start();
			} else {
				// Generate 5-second seamless loop buffer
				const bufferSize = ctx.sampleRate * 5;
				const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
				const left = buffer.getChannelData(0);
				const right = buffer.getChannelData(1);

				if (id === 'brown') {
					// Brownian noise: integration of white noise
					let lastL = 0.0, lastR = 0.0;
					for (let i = 0; i < bufferSize; i++) {
						const whiteL = Math.random() * 2 - 1;
						const whiteR = Math.random() * 2 - 1;
						lastL = (lastL + 0.02 * whiteL) / 1.02;
						lastR = (lastR + 0.02 * whiteR) / 1.02;
						left[i] = lastL * 3.2;
						right[i] = lastR * 3.2;
					}
				} else {
					// Pink Rain: Voss-McCartney approximation filtered for rain sensation
					let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
					for (let i = 0; i < bufferSize; i++) {
						const white = Math.random() * 2 - 1;
						b0 = 0.99886 * b0 + white * 0.0555179;
						b1 = 0.99332 * b1 + white * 0.0750759;
						b2 = 0.96900 * b2 + white * 0.1538520;
						b3 = 0.86650 * b3 + white * 0.3104856;
						b4 = 0.55000 * b4 + white * 0.5329522;
						b5 = -0.7616 * b5 - white * 0.0168980;
						const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
						b6 = white * 0.115926;
						left[i] = pink;
						right[i] = pink * (0.95 + Math.random() * 0.1);
					}
				}

				const bufferSource = ctx.createBufferSource();
				bufferSource.buffer = buffer;
				bufferSource.loop = true;
				bufferSource.connect(proceduralGain);
				bufferSource.start();
				proceduralSource = bufferSource;
			}
		} catch (err) {
			console.warn('Failed to start procedural sound:', err);
		}
	}

	$: activeSoundUrl = soundscapes.find(s => s.id === activeSoundId)?.url;

	function updateSoundPlayback() {
		const track = soundscapes.find(s => s.id === activeSoundId) || soundscapes[0];
		
		if (!isSoundPlaying) {
			if (audioElem) audioElem.pause();
			stopProcedural();
			return;
		}

		if (track.kind === 'procedural') {
			if (audioElem) audioElem.pause();
			startProcedural(track.id as 'brown' | 'pink' | 'binaural');
		} else {
			stopProcedural();
			if (audioElem) {
				audioElem.volume = soundVolume;
				audioElem.play().catch((err) => {
					console.warn('Audio playback failed (offline/network), falling back to procedural Pink Rain:', err);
					activeSoundId = 'pink';
					startProcedural('pink');
				});
			}
		}
	}

	$: {
		if (audioElem) audioElem.volume = soundVolume;
		if (proceduralGain && audioCtx) {
			proceduralGain.gain.setValueAtTime(soundVolume * 0.7, audioCtx.currentTime);
		}
	}

	$: isSoundPlaying, activeSoundId, updateSoundPlayback();
	
	function toggleSoundMenu() {
		soundMenuOpen = !soundMenuOpen;
	}

	// Session Tasks State
	let tasksDrawerOpen = false;

	$: activeSubCode = (() => {
		if (!subject) return null;
		const s = subject.toLowerCase();
		if (s === 'p' || s.startsWith('phys')) return 'P';
		if (s === 'c' || s.startsWith('chem')) return 'C';
		if (s === 'm' || s.startsWith('math')) return 'M';
		return null;
	})();

	$: todayStr = todayKey();

	// Open planner tasks due today
	$: openPlannerTasks = ($tracker.h || []).filter((item) => {
		if (item.done) return false;
		if (item.due && item.due !== todayStr) return false;
		if (activeSubCode && item.s && item.s !== activeSubCode) return false;
		return true;
	});

	// Open To-dos
	$: openTodos = ($tracker.todos || []).filter((item) => {
		if (item.done) return false;
		if (activeSubCode && item.sub && item.sub !== activeSubCode) return false;
		return true;
	});

	$: totalOpenTasksCount = openPlannerTasks.length + openTodos.length;

	onDestroy(() => {
		stopProcedural();
		if (audioCtx) {
			audioCtx.close().catch(() => {});
			audioCtx = null;
		}
	});

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
		<button class="exit-btn" type="button" title="Exit Deep Work" on:click={handleExit}>
			<NavIcon name="x" size={24} />
		</button>
	</div>

	<div class="content">
		<div class="dial-container" class:running style="--dial-color: {phase === 'break' ? 'var(--success, #2f9e6e)' : accent}">
			<StatRing value={ringProgress} size={330} stroke={18} skin={phase === 'break' ? 'classic' : $loadout.timer} color={phase === 'break' ? 'var(--success, #2f9e6e)' : accent}>
				<div class="ring-stack">
					<div class="focus-pet-container" class:shatter={isShattering} style="--pet-scale: {1 + (ringProgress / 100) * 0.3}">
						<FocusPetCompanion {running} size="compact" />
					</div>

					<div class="timer-text-wrap">
						<span class="time font-mono">{dialTime}</span>
						<span class="phase" style="color: {phase === 'break' ? 'var(--success, #2f9e6e)' : accent}">
							{phase === 'break' ? 'BREAK' : 'FOCUS'}
						</span>
					</div>

					{#if subject}
						<div class="subject-line" title="{subject}{chapter ? ` · ${chapter}` : ''}">
							<span class="sub-name">{subject}</span>
							{#if chapter}<span class="chap-dot">·</span><span class="chap-name">{chapter}</span>{/if}
						</div>
					{/if}

					<span class="kind-badge font-mono">{focusKind.toUpperCase()}</span>
				</div>
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
							<span>{sound.name}</span>
							{#if sound.badge}
								<span class="offline-pill font-mono">{sound.badge}</span>
							{/if}
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

	<!-- Session Tasks Collapsible Drawer (Bottom-Left) -->
	<div class="session-tasks-widget">
		{#if tasksDrawerOpen}
			<div class="tasks-drawer-panel" transition:fly={{ y: 20, duration: 200 }}>
				<div class="tasks-panel-header">
					<div class="tasks-panel-title">
						<NavIcon name="check-circle" size={15} />
						<b>Session Tasks</b>
						{#if activeSubCode}
							<span class="sub-filter-pill {activeSubCode}">
								{activeSubCode === 'P' ? 'Physics' : activeSubCode === 'C' ? 'Chemistry' : 'Maths'}
							</span>
						{/if}
					</div>
					<button
						type="button"
						class="tasks-close-btn"
						on:click={() => (tasksDrawerOpen = false)}
						aria-label="Close Tasks"
					>
						<NavIcon name="x" size={14} />
					</button>
				</div>

				<div class="tasks-scroll-list">
					{#if totalOpenTasksCount === 0}
						<div class="empty-tasks font-mono">
							<span>All caught up! Zero open tasks for today 🎉</span>
						</div>
					{:else}
						{#if openPlannerTasks.length > 0}
							<div class="task-section-label font-mono">PLANNER ({openPlannerTasks.length})</div>
							{#each openPlannerTasks as item (item.id)}
								<label class="session-task-item">
									<input
										type="checkbox"
										checked={item.done}
										on:change={() => toggleTask(item.id)}
									/>
									<span class="task-text">{item.title || 'Untitled task'}</span>
								</label>
							{/each}
						{/if}

						{#if openTodos.length > 0}
							<div class="task-section-label font-mono">TO-DOS ({openTodos.length})</div>
							{#each openTodos as todo (todo.id)}
								<div class="todo-item-group">
									<label class="session-task-item">
										<input
											type="checkbox"
											checked={todo.done}
											on:change={() => toggleTodo(todo.id)}
										/>
										<span class="task-text">{todo.title}</span>
									</label>

									{#if todo.subtasks && todo.subtasks.length > 0}
										<div class="subtasks-container">
											{#each todo.subtasks as sub (sub.id)}
												<label class="session-task-item subtask">
													<input
														type="checkbox"
														checked={sub.done}
														on:change={() => toggleTodoSubtask(todo.id, sub.id)}
													/>
													<span class="task-text sub">{sub.title}</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					{/if}
				</div>
			</div>
		{/if}

		<button
			type="button"
			class="tasks-pill-btn"
			class:active={tasksDrawerOpen}
			title="Open Session Tasks"
			on:click={() => (tasksDrawerOpen = !tasksDrawerOpen)}
		>
			<NavIcon name="check-circle" size={16} />
			<span>Tasks {totalOpenTasksCount > 0 ? `(${totalOpenTasksCount})` : ''}</span>
		</button>
	</div>
</div>

<style>
	.overlay {
		--surface-panel: rgba(22, 20, 36, 0.92);
		--surface-subtle: rgba(255, 255, 255, 0.08);
		--text-primary: #f7f5ff;
		--text-secondary: #bbb5d0;
		--border-subtle: rgba(255, 255, 255, 0.12);
		color: #f7f5ff;
		position: fixed;
		inset: 0;
		z-index: 10005;
		background: radial-gradient(circle at center, rgba(10, 10, 16, 0.94), rgba(6, 6, 12, 0.98)) !important;
		backdrop-filter: blur(32px) saturate(180%) !important;
		-webkit-backdrop-filter: blur(32px) saturate(180%) !important;
		display: flex;
		flex-direction: column;
		transition: background-color 0.5s ease;
	}

	.overlay.break {
		background: radial-gradient(circle at center, color-mix(in srgb, var(--success, #2f9e6e) 25%, rgba(10, 10, 16, 0.95)), rgba(6, 6, 12, 0.98)) !important;
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

	.ring-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 250px;
		max-width: 250px;
		text-align: center;
		position: relative;
		pointer-events: auto;
	}

	.time {
		font-size: 3.4rem;
		font-family: var(--font-mono, monospace);
		font-weight: 850;
		line-height: 1;
		letter-spacing: -0.03em;
		color: #ffffff;
	}

	.phase {
		font-size: 0.82rem;
		font-weight: 850;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		margin-top: 0.4rem;
		line-height: 1;
	}

	.subject-line {
		margin: 0.45rem 0 0;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-secondary, #a3a3a3);
		max-width: 230px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.25;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}
	.chap-dot {
		opacity: 0.5;
	}

	.kind-badge {
		margin-top: 0.45rem;
		padding: 0.2rem 0.65rem;
		background: var(--surface-subtle, rgba(255, 255, 255, 0.08));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		border-radius: 999px;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--text-secondary, #d4d4d4);
	}

	.action-btn {
		padding: 1rem 3rem;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		border-radius: 999px;
		border: none;
		color: var(--accent-contrast, white);
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
		z-index: 10010;
	}

	.sound-menu {
		background: var(--surface-panel, rgba(20, 20, 25, 0.7));
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
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

	.offline-pill {
		font-size: 0.58rem;
		font-weight: 800;
		padding: 0.08rem 0.38rem;
		border-radius: 4px;
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		color: var(--accent);
		letter-spacing: 0.05em;
	}

	/* Session Tasks Drawer Styles */
	.session-tasks-widget {
		position: absolute;
		bottom: 2rem;
		left: 2rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		z-index: 10010;
	}

	.tasks-pill-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--surface-panel, rgba(20, 20, 25, 0.7));
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
		border: 1px solid color-mix(in srgb, var(--accent), transparent 80%);
		border-radius: 999px;
		padding: 0.55rem 1rem;
		color: var(--text-secondary);
		font-size: 0.78rem;
		font-weight: 750;
		cursor: pointer;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
		transition: all 0.2s ease;
	}

	.tasks-pill-btn:hover {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--surface-panel) 90%, var(--accent) 10%);
		border-color: var(--accent);
	}

	.tasks-pill-btn.active {
		color: var(--accent);
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, var(--surface-panel));
	}

	.tasks-drawer-panel {
		background: var(--surface-panel, rgba(20, 20, 25, 0.85));
		backdrop-filter: blur(28px) saturate(180%);
		-webkit-backdrop-filter: blur(28px) saturate(180%);
		border: 1px solid color-mix(in srgb, var(--accent), transparent 75%);
		border-radius: 16px;
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 280px;
		max-width: 340px;
		max-height: 380px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
	}

	.tasks-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.tasks-panel-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.82rem;
		color: var(--text-primary);
	}

	.sub-filter-pill {
		font-size: 0.6rem;
		font-weight: 800;
		padding: 0.1rem 0.4rem;
		border-radius: 99px;
	}

	.sub-filter-pill.P { background: color-mix(in srgb, #3b82f6 20%, transparent); color: #3b82f6; }
	.sub-filter-pill.C { background: color-mix(in srgb, #10b981 20%, transparent); color: #10b981; }
	.sub-filter-pill.M { background: color-mix(in srgb, #f59e0b 20%, transparent); color: #f59e0b; }

	.tasks-close-btn {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	.tasks-close-btn:hover {
		background: var(--surface-subtle);
		color: var(--text-primary);
	}

	.tasks-scroll-list {
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 280px;
		padding-right: 0.25rem;
	}

	.empty-tasks {
		font-size: 0.72rem;
		color: var(--text-secondary);
		text-align: center;
		padding: 1.5rem 0.5rem;
	}

	.task-section-label {
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
		margin-top: 0.35rem;
	}

	.session-task-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		color: var(--text-primary);
		cursor: pointer;
		padding: 0.25rem 0.35rem;
		border-radius: 6px;
		transition: background 0.12s;
	}

	.session-task-item:hover {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.session-task-item input {
		width: 15px;
		height: 15px;
		accent-color: var(--accent);
		cursor: pointer;
		flex-shrink: 0;
	}

	.task-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.subtasks-container {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-left: 1.25rem;
	}

	.session-task-item.subtask {
		font-size: 0.72rem;
		color: var(--text-secondary);
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
		backdrop-filter: var(--glass-filter);
		-webkit-backdrop-filter: var(--glass-filter);
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

	/* Pet Styles */
	.timer-text-wrap {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transform: none;
	}

	.focus-pet-container {
		position: relative;
		height: 48px;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 0.25rem;
		transform: scale(var(--pet-scale, 1));
		transform-origin: center bottom;
		transition: transform 0.3s ease;
		pointer-events: none;
		z-index: 3;
	}

	@keyframes orb-spin {
		100% { transform: rotate(360deg); }
	}
	@keyframes crystal-float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-12px); }
	}
	@keyframes crystal-shadow {
		0%, 100% { transform: scale(1); opacity: 0.7; }
		50% { transform: scale(0.6); opacity: 0.2; }
	}
	@keyframes flicker-outer {
		0% { transform: scale(1) skewX(2deg); }
		100% { transform: scale(1.05) skewX(-2deg); }
	}
	@keyframes flicker-inner {
		0% { transform: scale(1) skewX(-1deg); }
		100% { transform: scale(0.9) skewX(3deg); }
	}

	@keyframes shatter-anim {
		0% { transform: translate(-50%, -50%) scale(var(--pet-scale, 1)) rotate(0); opacity: 1; filter: brightness(1); }
		20% { transform: translate(-50%, -50%) scale(calc(var(--pet-scale, 1) * 1.2)) rotate(15deg); filter: brightness(2); }
		100% { transform: translate(-50%, -50%) scale(0) rotate(-45deg); opacity: 0; filter: brightness(0); }
	}

	.focus-pet-container.shatter {
		animation: shatter-anim 0.8s forwards ease-in;
	}

	@media (max-width: 768px) {
		.header {
			padding: max(env(safe-area-inset-top, 0px), 1.25rem) 1.25rem 0.5rem;
		}
		.content {
			gap: 1.5rem;
		}
		.dial-container {
			transform: scale(0.88);
			transform-origin: center center;
		}
		.action-btn {
			padding: 0.85rem 2.2rem;
			font-size: 1.1rem;
			min-height: 48px;
		}
		.soundscapes-widget {
			bottom: calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 0.5rem);
			right: 1rem;
		}
		.session-tasks-widget {
			bottom: calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 0.5rem);
			left: 1rem;
		}
		.tasks-drawer-panel {
			max-width: calc(100vw - 2rem);
			min-width: 250px;
		}
		.sound-menu {
			min-width: 180px;
			max-width: calc(100vw - 2rem);
		}
		.quote-container {
			padding: 1rem;
			min-height: 60px;
		}
		.quote {
			font-size: 0.92rem;
		}
	}

	@media (max-width: 360px) {
		.dial-container {
			transform: scale(0.78);
		}
	}
</style>
