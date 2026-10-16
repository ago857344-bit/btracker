<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let open = false;
	export let title = '';
	export let width = '560px';
	export let solid = false;

	const dispatch = createEventDispatcher<{ close: void }>();
	const close = () => {
		triggerHaptic(8);
		open = false;
		dispatch('close');
	};

	function triggerHaptic(pattern: number | number[] = 10) {
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			try {
				navigator.vibrate(pattern);
			} catch {}
		}
	}

	let touchStartY = 0;
	let touchStartX = 0;
	let touchStartTime = 0;
	let currentTranslateY = 0;
	let isSwiping = false;
	let modalCardEl: HTMLElement | null = null;

	$: if (!open) {
		currentTranslateY = 0;
		isSwiping = false;
		touchStartY = 0;
		touchStartX = 0;
		touchStartTime = 0;
	}

	$: if (typeof document !== 'undefined') {
		if (open) {
			document.body.dataset.sheetOpen = 'true';
		} else {
			setTimeout(() => {
				if (!document.querySelector('.modal-backdrop')) {
					delete document.body.dataset.sheetOpen;
				}
			}, 50);
		}
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			setTimeout(() => {
				if (!document.querySelector('.modal-backdrop')) {
					delete document.body.dataset.sheetOpen;
				}
			}, 50);
		}
	});

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 0) return;
		const target = e.target as HTMLElement | null;
		if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable) {
			return;
		}
		const isHeaderOrHandle = Boolean(
			target?.closest('header') ||
			target?.classList.contains('bottom-sheet-handle')
		);

		if (isHeaderOrHandle) {
			touchStartY = e.touches[0].clientY;
			touchStartX = e.touches[0].clientX;
			touchStartTime = Date.now();
			isSwiping = false;
			currentTranslateY = 0;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (touchStartY === 0 || e.touches.length === 0) return;
		const touchY = e.touches[0].clientY;
		const touchX = e.touches[0].clientX;
		const diffY = touchY - touchStartY;
		const diffX = touchX - touchStartX;

		if (!isSwiping) {
			if (Math.abs(diffY) > 8 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
				isSwiping = true;
			}
		}

		if (isSwiping) {
			if (diffY >= 0) {
				currentTranslateY = diffY;
			} else {
				// Rubber-band resistance when pulling upward past sheet top
				currentTranslateY = diffY * 0.22;
			}
			if (e.cancelable && diffY > 0) e.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (isSwiping) {
			const elapsed = Date.now() - touchStartTime;
			const velocity = currentTranslateY / (elapsed || 1);

			// Dismiss if dragged down > 110px OR flicked down with velocity
			if (currentTranslateY > 110 || (currentTranslateY > 38 && velocity > 0.45)) {
				triggerHaptic([10, 20]);
				close();
			}
		}
		touchStartY = 0;
		touchStartX = 0;
		touchStartTime = 0;
		currentTranslateY = 0;
		isSwiping = false;
	}
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && open) close(); }} />

{#if open}
	<div use:portal class="modal-backdrop" transition:fade={{ duration: 180 }} role="presentation" on:click={close} on:keydown={() => {}}>
		<div
			class="modal-card glass specular-card"
			class:solid
			class:swiping={isSwiping}
			bind:this={modalCardEl}
			style="max-width: {width}; {currentTranslateY !== 0 ? `transform: translateY(${currentTranslateY}px);` : ''}"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label={title}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
			on:touchcancel={handleTouchEnd}
			on:click|stopPropagation
			on:keydown={() => {}}
		>
			<header>
				<div class="bottom-sheet-handle" aria-hidden="true"></div>
				<h3>{title}</h3>
				<button type="button" class="modal-x" aria-label="Close" on:click={close}><NavIcon name="x" size={16} /></button>
			</header>
			<div class="modal-body"><slot /></div>
			{#if $$slots.footer}<footer><slot name="footer" /></footer>{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		z-index: 9999;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1.2rem;
		background: rgba(0, 0, 0, 0.60);
		backdrop-filter: blur(28px) saturate(190%);
		-webkit-backdrop-filter: blur(28px) saturate(190%);
		pointer-events: auto;
	}
	.modal-card {
		pointer-events: auto;
		width: 100%;
		max-height: 86vh;
		overflow: hidden auto;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 24px;
		background: color-mix(in srgb, var(--surface-panel, #121020) 96%, transparent);
		backdrop-filter: blur(36px) saturate(210%);
		-webkit-backdrop-filter: blur(36px) saturate(210%);
		box-shadow: var(--shadow-modal), var(--vision-bevel-inner);
		transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
		-webkit-overflow-scrolling: touch;
	}
	.modal-card.swiping {
		transition: none !important;
	}
	header {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.15rem 1.35rem;
		border-bottom: 0.5px solid color-mix(in srgb, var(--border-subtle), transparent 30%);
		background: color-mix(in srgb, var(--surface-panel), transparent 4%);
		backdrop-filter: blur(28px) saturate(190%);
		-webkit-backdrop-filter: blur(28px) saturate(190%);
	}
	h3 {
		margin: 0;
		font-size: .98rem;
		font-weight: 750;
		letter-spacing: -.02em;
	}
	.modal-x {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 0;
		border-radius: 50%;
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--text-primary) 10%, transparent);
		transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
		cursor: pointer;
	}
	.modal-x:hover {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 18%, transparent);
		transform: scale(1.06);
	}
	.modal-x:active {
		transform: scale(0.9);
	}
	.modal-body {
		padding: 1.25rem 1.35rem;
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: .6rem;
		padding: 1rem 1.35rem;
		border-top: 0.5px solid color-mix(in srgb, var(--border-subtle), transparent 30%);
	}

	@media (max-width: 760px) {
		.modal-backdrop {
			padding: 0;
			align-items: flex-end;
		}
		.modal-card { 
			width: 100% !important; 
			max-width: 100% !important; 
			margin: 0; 
			border-radius: 28px 28px 0 0; 
			border-bottom: none; 
			max-height: calc(100dvh - 44px); 
			padding-bottom: max(env(safe-area-inset-bottom), 16px);
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 -16px 48px rgba(0, 0, 0, 0.55);
			animation: sheet-slide-up 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards;
		}
		@keyframes sheet-slide-up {
			from { transform: translateY(100%); }
			to { transform: translateY(0); }
		}
		header {
			padding-top: 1.45rem;
			position: relative;
			border-radius: 28px 28px 0 0;
			touch-action: none;
			cursor: grab;
		}
		header:active {
			cursor: grabbing;
		}
		.bottom-sheet-handle {
			position: absolute;
			top: 8px;
			left: 50%;
			transform: translateX(-50%);
			width: 42px;
			height: 5px;
			border-radius: 9999px;
			background: color-mix(in srgb, var(--text-secondary), transparent 40%);
			touch-action: none;
			transition: background 0.15s ease;
		}
		header:active .bottom-sheet-handle {
			background: color-mix(in srgb, var(--text-primary), transparent 25%);
		}
	}

	.modal-card.solid {
		background: var(--surface-canvas) !important;
		border: 1px solid var(--border-subtle);
		backdrop-filter: none;
	}
	.modal-card.solid header {
		background: var(--surface-canvas) !important;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
	}
</style>
