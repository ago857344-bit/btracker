<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { globalTimer } from '$lib/stores/timerState';
	import { tracker, celebration } from '$lib/stores/tracker';
	import { pipIslandOpen, pipPosition, pipExpanded, closePipIsland } from '$lib/stores/pip';
	import { openNativePip, nativePipActive } from '$lib/services/pip';
	import { subjectColor, subjectName } from '$lib/state/subjects';
	import NavIcon from '$lib/components/NavIcon.svelte';

	let el: HTMLElement;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let initialLeft = 0;
	let initialTop = 0;
	let hasMoved = false;

	// Coords on screen
	let posX = 0;
	let posY = 0;

	$: isSessionActive = Boolean($globalTimer.running || $globalTimer.sessionStarted);
	$: subColor = $globalTimer.subject ? subjectColor($globalTimer.subject) : 'var(--accent, #6d5dfc)';
	$: subLabel = $globalTimer.subject ? subjectName($globalTimer.subject) : 'Focus';

	// Should it be visible?
	$: isVisible = $pipIslandOpen || ($tracker?.ui?.cutoutStyle === 'pip' && isSessionActive);

	function updateDefaultCornerPosition() {
		if (typeof window === 'undefined') return;
		const isMobile = window.innerWidth <= 768;
		const width = $pipExpanded ? Math.min(310, window.innerWidth - 24) : 220;
		const height = $pipExpanded ? 210 : 46;
		const bottomMargin = isMobile ? 96 : 32;
		const topMargin = isMobile ? 74 : 24;

		if ($pipPosition.x === -1 || $pipPosition.y === -1) {
			// On mobile, default to bottom-left so it never blocks the AI Mentor orb at bottom-right
			posX = isMobile ? 16 : window.innerWidth - width - 24;
			posY = window.innerHeight - height - bottomMargin;
			pipPosition.set({ x: posX, y: posY, corner: isMobile ? 'bottom-left' : 'bottom-right' });
		} else {
			// Clamp to ensure it stays strictly within safe viewport on resize
			posX = Math.max(12, Math.min(window.innerWidth - width - 12, $pipPosition.x));
			posY = Math.max(topMargin, Math.min(window.innerHeight - height - bottomMargin, $pipPosition.y));
		}
	}

	onMount(() => {
		updateDefaultCornerPosition();
		const handleResize = () => updateDefaultCornerPosition();
		window.addEventListener('resize', handleResize, { passive: true });
		return () => window.removeEventListener('resize', handleResize);
	});

	$: if ($pipExpanded !== undefined) {
		// Reclamp whenever expanded size changes
		if (typeof window !== 'undefined' && posX > 0) {
			const isMobile = window.innerWidth <= 768;
			const width = $pipExpanded ? Math.min(310, window.innerWidth - 24) : 220;
			const height = $pipExpanded ? 210 : 46;
			const bottomMargin = isMobile ? 96 : 24;
			const topMargin = isMobile ? 74 : 24;
			posX = Math.max(12, Math.min(window.innerWidth - width - 12, posX));
			posY = Math.max(topMargin, Math.min(window.innerHeight - height - bottomMargin, posY));
		}
	}

	function handlePointerDown(e: PointerEvent) {
		// Ignore clicks on buttons/inputs inside
		const target = e.target as HTMLElement | null;
		if (target?.closest('button') || target?.closest('a')) return;

		isDragging = true;
		hasMoved = false;
		startX = e.clientX;
		startY = e.clientY;
		initialLeft = posX;
		initialTop = posY;

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		window.addEventListener('pointercancel', handlePointerUp);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;

		// 8px movement threshold to distinguish deliberate drag from mobile screen taps
		if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
			hasMoved = true;
		}

		const isMobile = window.innerWidth <= 768;
		const width = $pipExpanded ? Math.min(310, window.innerWidth - 24) : 220;
		const height = $pipExpanded ? 210 : 46;
		const bottomMargin = isMobile ? 96 : 24;
		const topMargin = isMobile ? 74 : 24;

		const nextX = initialLeft + dx;
		const nextY = initialTop + dy;

		posX = Math.max(12, Math.min(window.innerWidth - width - 12, nextX));
		posY = Math.max(topMargin, Math.min(window.innerHeight - height - bottomMargin, nextY));
	}

	function handlePointerUp() {
		if (!isDragging) return;
		isDragging = false;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		window.removeEventListener('pointercancel', handlePointerUp);

		// Snap to nearest corner if dragged near edges
		if (typeof window !== 'undefined') {
			const width = $pipExpanded ? 310 : 220;
			const height = $pipExpanded ? 210 : 46;
			const midX = window.innerWidth / 2;
			const midY = window.innerHeight / 2;

			let corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
			if (posX + width / 2 < midX) {
				corner = posY + height / 2 < midY ? 'top-left' : 'bottom-left';
			} else {
				corner = posY + height / 2 < midY ? 'top-right' : 'bottom-right';
			}

			pipPosition.set({ x: posX, y: posY, corner });
		}
	}

	function toggleExpand(e?: MouseEvent) {
		if (e) e.stopPropagation();
		if (hasMoved) return;
		pipExpanded.update((v) => !v);
	}

	async function handlePopOutOS(e: MouseEvent) {
		e.stopPropagation();
		const success = await openNativePip();
		if (success) {
			celebration.set('Popped out to OS Picture-in-Picture window!');
		}
	}

	function handleNavigateFocus() {
		closePipIsland();
		void goto('/focus');
	}
</script>

{#if isVisible}
	<aside
		bind:this={el}
		class="pip-floating-island"
		class:expanded={$pipExpanded}
		class:dragging={isDragging}
		class:native-active={$nativePipActive}
		style="left: {posX}px; top: {posY}px; --pip-accent: {subColor};"
		on:pointerdown={handlePointerDown}
		in:scale={{ start: 0.85, duration: 220 }}
		out:fade={{ duration: 160 }}
		aria-label="Floating Focus Island HUD"
		role="region"
	>
		<!-- Specular sheen surface -->
		<div class="pip-specular-glow" aria-hidden="true"></div>

		{#if $nativePipActive}
			<!-- STATE: POPPED OUT TO OS WINDOW -->
			<div class="pip-compact-deck popped-deck">
				<div class="pip-flame-wrap">
					<NavIcon name="pip" size={15} />
				</div>
				<div class="pip-info">
					<span class="pip-clock">OS PiP Active</span>
					<span class="pip-sub-label">Floating over system</span>
				</div>
				<button
					type="button"
					class="pip-btn-mini icon-only"
					title="Close Floating Island"
					on:click={() => closePipIsland()}
				>
					<NavIcon name="x" size={13} />
				</button>
			</div>
		{:else if !$pipExpanded}
			<!-- 1. COMPACT MINI ISLAND PILL -->
			<div class="pip-compact-deck">
				<!-- Drag handle indicator -->
				<div class="drag-dots" title="Drag to move">
					<span></span><span></span>
				</div>

				<div class="pip-flame-wrap">
					{#if $globalTimer.running}
						<div class="mini-eq" aria-label="Timer running">
							<span class="eq-b b1"></span>
							<span class="eq-b b2"></span>
							<span class="eq-b b3"></span>
						</div>
					{:else}
						<span class="mini-flame">🔥</span>
					{/if}
				</div>

				<div class="pip-info" on:click={toggleExpand} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleExpand()}>
					<span class="pip-clock">{$globalTimer.dialTime || '25:00'}</span>
					{#if $globalTimer.subject}
						<span class="pip-sub-badge" style="color: {subColor}; border-color: {subColor};">
							{$globalTimer.subject}
						</span>
					{/if}
				</div>

				<div class="pip-actions">
					<button
						type="button"
						class="pip-btn-mini toggle-btn"
						class:running={$globalTimer.running}
						title={$globalTimer.running ? 'Pause Timer' : 'Start / Resume Timer'}
						on:click|stopPropagation={() => {
							if (!$globalTimer.running && !$globalTimer.sessionStarted) {
								$globalTimer.start($globalTimer.subject || 'P', 25 * 60, $globalTimer.chapter || '');
							} else {
								$globalTimer.toggle();
							}
						}}
					>
						{#if $globalTimer.running}
							<NavIcon name="pause" size={12} />
						{:else}
							<NavIcon name="play" size={12} />
						{/if}
					</button>

					<button
						type="button"
						class="pip-btn-mini icon-only expand-btn"
						title="Expand Floating HUD"
						on:click={toggleExpand}
					>
						<NavIcon name="expand" size={12} />
					</button>
				</div>
			</div>
		{:else}
			<!-- 2. EXPANDED PICTURE-IN-PICTURE DECK -->
			<div class="pip-expanded-deck" in:fly={{ y: 6, duration: 180 }}>
				<!-- Header -->
				<div class="expanded-top">
					<div class="top-meta">
						<span class="sub-pill-large" style="color: {subColor}; border-color: {subColor};">
							{subLabel}
						</span>
						{#if $globalTimer.chapter}
							<span class="chapter-text" title={$globalTimer.chapter}>{$globalTimer.chapter}</span>
						{/if}
					</div>
					<div class="top-controls">
						<button
							type="button"
							class="icon-btn-ctrl popout-os-btn"
							title="Pop out into native OS Picture-in-Picture window"
							on:click={handlePopOutOS}
						>
							<NavIcon name="pip" size={14} />
						</button>
						<button
							type="button"
							class="icon-btn-ctrl"
							title="Collapse to mini pill"
							on:click={toggleExpand}
						>
							<NavIcon name="minus" size={14} />
						</button>
						<button
							type="button"
							class="icon-btn-ctrl"
							title="Close Floating Island"
							on:click={() => closePipIsland()}
						>
							<NavIcon name="x" size={14} />
						</button>
					</div>
				</div>

				<!-- Center: Time & Ring -->
				<div class="expanded-center">
					<div class="ring-wrap">
						<svg class="progress-dial-svg" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="42" class="dial-bg"></circle>
							<circle
								cx="50"
								cy="50"
								r="42"
								class="dial-fill"
								style="stroke: {subColor}; stroke-dasharray: 264; stroke-dashoffset: {264 - 264 * Math.min(1, Math.max(0, $globalTimer.ringProgress))};"
							></circle>
						</svg>
						<div class="clock-display">
							<span class="big-time font-mono">{$globalTimer.dialTime || '25:00'}</span>
							<span class="phase-tag" class:break={$globalTimer.phase === 'break'}>
								{$globalTimer.phase === 'break' ? 'COOLDOWN' : 'FOCUS'}
							</span>
						</div>
					</div>
				</div>

				<!-- Footer Controls -->
				<div class="expanded-bottom">
					<button
						type="button"
						class="deck-action-btn secondary"
						title="Add 5 minutes"
						on:click|stopPropagation={() => $globalTimer.addFive()}
					>
						+5m
					</button>

					<button
						type="button"
						class="deck-action-btn primary"
						class:running={$globalTimer.running}
						on:click|stopPropagation={() => {
							if (!$globalTimer.running && !$globalTimer.sessionStarted) {
								$globalTimer.start($globalTimer.subject || 'P', 25 * 60, $globalTimer.chapter || '');
							} else {
								$globalTimer.toggle();
							}
						}}
					>
						{#if $globalTimer.running}
							<NavIcon name="pause" size={14} /> Pause
						{:else}
							<NavIcon name="play" size={14} /> Resume
						{/if}
					</button>

					{#if isSessionActive}
						<button
							type="button"
							class="deck-action-btn danger"
							title="End and log focus session"
							on:click|stopPropagation={() => {
								$globalTimer.stop();
								closePipIsland();
							}}
						>
							Done
						</button>
					{/if}

					<button
						type="button"
						class="deck-action-btn icon-only"
						title="Open Focus Dashboard"
						on:click={handleNavigateFocus}
					>
						<NavIcon name="arrow-right" size={14} />
					</button>
				</div>
			</div>
		{/if}
	</aside>
{/if}

<style>
	.pip-floating-island {
		position: fixed;
		z-index: 9998;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--wallpaper-bottom-color, var(--surface-panel, #121020)) 50%, rgba(10, 8, 22, 0.65)) !important;
		backdrop-filter: blur(36px) saturate(220%);
		-webkit-backdrop-filter: blur(36px) saturate(220%);
		border: 1px solid color-mix(in srgb, var(--pip-accent, var(--accent, #6d5dfc)) 40%, rgba(255, 255, 255, 0.22));
		box-shadow:
			0 18px 48px -6px rgba(0, 0, 0, 0.7),
			0 0 24px -2px color-mix(in srgb, var(--pip-accent, var(--accent)) 30%, transparent),
			inset 0 1px 1.5px rgba(255, 255, 255, 0.35);
		color: #ffffff;
		user-select: none;
		touch-action: none;
		cursor: grab;
		transition:
			box-shadow 0.25s ease,
			border-color 0.25s ease,
			transform 0.15s ease,
			border-radius 0.25s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.pip-floating-island.dragging {
		cursor: grabbing;
		transform: scale(1.04);
		box-shadow:
			0 24px 64px -4px rgba(0, 0, 0, 0.85),
			0 0 36px 4px color-mix(in srgb, var(--pip-accent, var(--accent)) 50%, transparent),
			inset 0 1.5px 2px rgba(255, 255, 255, 0.5);
	}

	.pip-floating-island.expanded {
		border-radius: 24px;
		width: min(310px, calc(100vw - 24px));
		height: 210px;
	}

	/* Specular Glint Top Edge */
	.pip-specular-glow {
		position: absolute;
		inset: 1px 12px auto 12px;
		height: 40%;
		border-radius: 9999px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.32) 0%, transparent 100%);
		pointer-events: none;
	}

	/* 1. Compact Pill Deck */
	.pip-compact-deck {
		display: flex;
		align-items: center;
		height: 46px;
		padding: 4px 8px 4px 10px;
		gap: 8px;
		min-width: 210px;
	}

	.drag-dots {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 2px 2px;
		opacity: 0.35;
	}

	.drag-dots span {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #ffffff;
	}

	.pip-flame-wrap {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
	}

	.mini-flame {
		font-size: 14px;
		animation: pulse-flame 2s infinite ease-in-out;
	}

	.mini-eq {
		display: flex;
		align-items: flex-end;
		gap: 2.5px;
		height: 14px;
	}

	.eq-b {
		width: 3px;
		border-radius: 999px;
		background: var(--pip-accent, #6d5dfc);
		animation: eq-bounce 1.2s infinite ease-in-out alternate;
	}
	.b1 { height: 60%; animation-delay: 0.1s; }
	.b2 { height: 100%; animation-delay: 0.3s; }
	.b3 { height: 75%; animation-delay: 0.2s; }

	@keyframes eq-bounce {
		0% { transform: scaleY(0.4); }
		100% { transform: scaleY(1); }
	}

	@keyframes pulse-flame {
		0%, 100% { transform: scale(0.95); opacity: 0.85; }
		50% { transform: scale(1.1); opacity: 1; }
	}

	.pip-info {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		cursor: pointer;
	}

	.pip-clock {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.95rem;
		font-weight: 750;
		letter-spacing: -0.02em;
	}

	.pip-sub-badge {
		font-size: 0.68rem;
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 999px;
		border: 1px solid currentColor;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.pip-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.pip-btn-mini {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.18);
		color: #ffffff;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background 0.15s ease, transform 0.12s ease;
	}

	.pip-btn-mini:hover {
		background: rgba(255, 255, 255, 0.22);
	}

	.pip-btn-mini:active {
		transform: scale(0.92);
	}

	.pip-btn-mini.toggle-btn.running {
		background: var(--pip-accent, #6d5dfc);
		border-color: var(--pip-accent, #6d5dfc);
		color: var(--accent-contrast, #ffffff);
		box-shadow: 0 0 12px color-mix(in srgb, var(--pip-accent) 60%, transparent);
	}

	.popped-deck {
		padding-right: 12px;
	}

	.pip-sub-label {
		font-size: 0.68rem;
		color: rgba(255, 255, 255, 0.6);
	}

	/* 2. Expanded Deck View */
	.pip-expanded-deck {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		padding: 12px 14px;
		cursor: default;
	}

	.expanded-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.top-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow: hidden;
	}

	.sub-pill-large {
		font-size: 0.72rem;
		font-weight: 800;
		padding: 2px 8px;
		border-radius: 999px;
		border: 1px solid currentColor;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.chapter-text {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.65);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 130px;
	}

	.top-controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.icon-btn-ctrl {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.75);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}

	.icon-btn-ctrl:hover {
		background: rgba(255, 255, 255, 0.18);
		color: #ffffff;
	}

	.icon-btn-ctrl.popout-os-btn {
		color: var(--pip-accent, #6d5dfc);
		border-color: color-mix(in srgb, var(--pip-accent) 40%, transparent);
	}

	.expanded-center {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 6px 0;
	}

	.ring-wrap {
		position: relative;
		width: 104px;
		height: 104px;
		display: grid;
		place-items: center;
	}

	.progress-dial-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.dial-bg {
		fill: none;
		stroke: rgba(255, 255, 255, 0.12);
		stroke-width: 6;
	}

	.dial-fill {
		fill: none;
		stroke-width: 6;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.35s ease;
	}

	.clock-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
	}

	.big-time {
		font-size: 1.45rem;
		font-weight: 850;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.phase-tag {
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		color: #38bdf8;
	}

	.phase-tag.break {
		color: #4ade80;
	}

	.expanded-bottom {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.deck-action-btn {
		height: 32px;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.16);
		transition: transform 0.1s ease, background 0.15s ease, box-shadow 0.15s ease;
	}

	.deck-action-btn:active {
		transform: scale(0.95);
	}

	.deck-action-btn.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		padding: 0 12px;
	}

	.deck-action-btn.primary {
		flex: 1;
		background: var(--pip-accent, #6d5dfc);
		border-color: var(--pip-accent, #6d5dfc);
		color: var(--accent-contrast, #ffffff);
		box-shadow: 0 4px 14px color-mix(in srgb, var(--pip-accent) 45%, transparent);
	}

	.deck-action-btn.danger {
		background: rgba(239, 68, 68, 0.22);
		border-color: rgba(239, 68, 68, 0.45);
		color: #fca5a5;
		padding: 0 12px;
	}

	.deck-action-btn.icon-only {
		width: 32px;
		padding: 0;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.8);
	}
</style>
