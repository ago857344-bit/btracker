<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';

	export let open = false;
	export let title = '';
	export let width = '560px';
	export let solid = false;

	const dispatch = createEventDispatcher<{ close: void }>();
	const close = () => { open = false; dispatch('close'); };

	let touchStartY = 0;
	let touchStartX = 0;
	let currentTranslateY = 0;
	let isSwiping = false;
	let modalCardEl: HTMLElement | null = null;

	$: if (!open) {
		currentTranslateY = 0;
		isSwiping = false;
		touchStartY = 0;
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 0) return;
		const target = e.target as HTMLElement | null;
		const isHeaderOrHandle = Boolean(
			target?.closest('header') ||
			target?.classList.contains('bottom-sheet-handle') ||
			(modalCardEl && (e.touches[0].clientY - modalCardEl.getBoundingClientRect().top < 56))
		);

		if (isHeaderOrHandle) {
			touchStartY = e.touches[0].clientY;
			touchStartX = e.touches[0].clientX;
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
			if (diffY > 6 && diffY > Math.abs(diffX) * 1.1) {
				isSwiping = true;
			}
		}

		if (isSwiping && diffY > 0) {
			currentTranslateY = diffY;
			if (e.cancelable) e.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (isSwiping && currentTranslateY > 60) {
			close();
		}
		touchStartY = 0;
		touchStartX = 0;
		currentTranslateY = 0;
		isSwiping = false;
	}
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && open) close(); }} />

{#if open}
	<div class="modal-backdrop" transition:fade={{ duration: 160 }} role="presentation" on:click={close} on:keydown={() => {}}>
		<div
			class="modal-card glass"
			class:solid
			class:swiping={isSwiping}
			bind:this={modalCardEl}
			style="max-width: {width}; {currentTranslateY > 0 ? `transform: translateY(${currentTranslateY}px);` : ''}"
			transition:fly={{ y: 14, duration: 200 }}
			role="dialog"
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
	.modal-backdrop { position: fixed; z-index: 120; inset: 0; display: grid; place-items: center; padding: 1.2rem; background: rgb(14 12 28 / 62%); backdrop-filter: var(--glass-filter); }
	.modal-card { width: 100%; max-height: 86vh; overflow: hidden auto; border: 1px solid var(--border-subtle); border-radius: 20px; background: var(--surface-panel); box-shadow: var(--shadow-modal); transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1); }
	.modal-card.swiping { transition: none !important; }
	header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.05rem 1.3rem; border-bottom: 1px solid var(--border-subtle); background: var(--surface-panel); backdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter); }
	h3 { margin: 0; font-size: .98rem; font-weight: 800; letter-spacing: -.02em; }
	.modal-x { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; }
	.modal-x:hover { color: var(--text-primary); background: var(--surface-subtle); }
	.modal-body { padding: 1.2rem 1.3rem; }
	footer { display: flex; justify-content: flex-end; gap: .6rem; padding: 1rem 1.3rem; border-top: 1px solid var(--border-subtle); }

	@media (max-width: 760px) {
		.modal-backdrop { padding: 0; align-items: flex-end; }
		.modal-card { 
			width: 100% !important; 
			max-width: 100% !important; 
			margin: 0; 
			border-radius: 28px 28px 0 0; 
			border-bottom: none; 
			max-height: calc(100vh - 40px); 
		}
		header { padding-top: 1.4rem; position: relative; border-radius: 28px 28px 0 0; touch-action: none; cursor: grab; }
		.bottom-sheet-handle {
			position: absolute;
			top: 8px;
			left: 50%;
			transform: translateX(-50%);
			width: 42px;
			height: 5px;
			border-radius: 99px;
			background: var(--text-secondary);
			opacity: 0.38;
			touch-action: none;
		}
	}

	.modal-card.solid { background: var(--surface-canvas) !important; border: 1px solid var(--border-subtle); backdrop-filter: none; }
	.modal-card.solid header { background: var(--surface-canvas) !important; backdrop-filter: none; -webkit-backdrop-filter: none; }

</style>
