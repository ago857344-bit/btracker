<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { uiClick, uiPop } from '$lib/utils/feedback';
	import { onMount } from 'svelte';

	const tabs = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/log', label: 'Log', icon: 'grid' },
		{ href: '/focus', label: 'Focus', icon: 'focus' },
		{ href: '/todo', label: 'To Do', icon: 'list' },
		{ href: '/settings', label: 'Settings', icon: 'settings' }
	] as const;

	$: activeIdx = Math.max(0, tabs.findIndex((t) => t.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(t.href)));

	let navEl: HTMLElement;
	let navWidth = 0;
	let isDragging = false;
	let isTouching = false;
	let dragIndex = -1;
	let dragX = 0;
	let touchStartX = 0;
	let touchStartY = 0;
	let hasMoved = false;

	const pad = 6;
	$: usableWidth = Math.max(0, navWidth - pad * 2);
	$: tabWidth = usableWidth > 0 ? usableWidth / tabs.length : 0;

	// Resting geometry
	$: idlePillWidth = Math.max(0, tabWidth - 4);
	$: idlePillLeft = pad + activeIdx * tabWidth + 2;

	// Dragging geometry (stretches & gets big)
	$: dragPillWidth = Math.max(0, tabWidth * 1.32);
	$: dragPillLeft = Math.max(pad, Math.min(navWidth - pad - dragPillWidth, dragX - dragPillWidth / 2));

	$: pillLeft = isDragging ? dragPillLeft : idlePillLeft;
	$: pillWidth = isDragging ? dragPillWidth : idlePillWidth;

	function updateDimensions() {
		if (navEl) {
			navWidth = navEl.clientWidth;
		}
	}

	onMount(() => {
		updateDimensions();
		const ro = new ResizeObserver(() => updateDimensions());
		if (navEl) ro.observe(navEl);
		return () => ro.disconnect();
	});

	function handleTouchStart(e: TouchEvent) {
		if (!navEl || e.touches.length === 0) return;
		const touch = e.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		hasMoved = false;
		isTouching = true;

		const rect = navEl.getBoundingClientRect();
		dragX = touch.clientX - rect.left;
		const idx = Math.max(0, Math.min(tabs.length - 1, Math.floor((dragX - pad) / (tabWidth || 1))));
		dragIndex = idx;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isTouching || !navEl || e.touches.length === 0) return;
		const touch = e.touches[0];
		const dx = touch.clientX - touchStartX;
		const dy = touch.clientY - touchStartY;

		if (!hasMoved) {
			if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
				hasMoved = true;
				isDragging = true;
				uiClick();
			} else if (Math.abs(dy) > 12) {
				isTouching = false;
				return;
			}
		}

		if (isDragging) {
			if (e.cancelable) e.preventDefault();
			const rect = navEl.getBoundingClientRect();
			dragX = touch.clientX - rect.left;

			const newIdx = Math.max(0, Math.min(tabs.length - 1, Math.floor((dragX - pad) / (tabWidth || 1))));
			if (newIdx !== dragIndex) {
				dragIndex = newIdx;
				uiClick();
				if (navigator.vibrate) {
					try { navigator.vibrate(10); } catch {}
				}
			}
		}
	}

	function handleTouchEnd() {
		if (!isTouching) return;
		const wasDragging = isDragging;
		const targetIdx = dragIndex;
		isTouching = false;
		isDragging = false;
		dragIndex = -1;

		if (wasDragging && targetIdx !== -1 && targetIdx !== activeIdx) {
			uiPop();
			void goto(tabs[targetIdx].href);
		}
	}

	function handleTabClick(index: number, href: string) {
		if (index !== activeIdx) {
			uiClick();
			void goto(href);
		}
	}
</script>

<nav
	class="bottom-nav"
	class:is-dragging={isDragging}
	bind:this={navEl}
	on:touchstart={handleTouchStart}
	on:touchmove={handleTouchMove}
	on:touchend={handleTouchEnd}
	on:touchcancel={handleTouchEnd}
	aria-label="Mobile Navigation"
>
	<!-- Apple Music Liquid Glass Active Pill -->
	{#if navWidth > 0}
		<div
			class="active-pill"
			class:big={isDragging}
			style="left: {pillLeft}px; width: {pillWidth}px;"
		>
			<div class="pill-specular" aria-hidden="true"></div>
		</div>
	{/if}

	{#each tabs as tab, i (tab.href)}
		{@const isHovered = isDragging && dragIndex === i}
		{@const isCurrent = !isDragging && activeIdx === i}
		<a
			href={tab.href}
			class="tab"
			class:active={isCurrent || isHovered}
			class:drag-target={isHovered}
			on:click|preventDefault={() => handleTabClick(i, tab.href)}
		>
			<span class="icon-wrap"><NavIcon name={tab.icon} size={22} /></span>
			<span class="label">{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		display: none;
	}

	@media (max-width: 760px) {
		.bottom-nav {
			display: flex;
			position: fixed;
			bottom: max(env(safe-area-inset-bottom), 18px);
			left: 50%;
			transform: translateX(-50%);
			width: 94%;
			max-width: 440px;
			height: 64px;
			padding: 6px;
			background: color-mix(in srgb, var(--surface-panel), transparent 45%);
			backdrop-filter: var(--glass-filter, blur(28px) saturate(200%));
			-webkit-backdrop-filter: var(--glass-filter, blur(28px) saturate(200%));
			border-radius: 999px;
			border: 1px solid color-mix(in srgb, rgba(255, 255, 255, 0.25), var(--border-subtle) 80%);
			box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28), inset 0 1px 1.5px rgba(255, 255, 255, 0.25);
			z-index: 100;
			justify-content: space-around;
			align-items: center;
			user-select: none;
			touch-action: none;
			-webkit-user-select: none;
			overflow: visible;
		}

		/* Active Glass Pill Indicator (Apple Music Style) */
		.active-pill {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			height: 48px;
			border-radius: 999px;
			background: radial-gradient(circle at 50% 25%, color-mix(in srgb, var(--accent) 30%, rgba(255, 255, 255, 0.18)), color-mix(in srgb, var(--accent) 18%, transparent 40%));
			border: 1px solid color-mix(in srgb, var(--accent) 45%, rgba(255, 255, 255, 0.35));
			box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 35%, transparent), inset 0 1px 1.5px rgba(255, 255, 255, 0.45);
			pointer-events: none;
			z-index: 1;
			transition: left 0.36s cubic-bezier(0.34, 1.56, 0.64, 1),
						width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
						height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
						transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
						box-shadow 0.25s ease,
						background 0.25s ease;
		}

		/* Stretches and enlarges with intense reactivity while dragging */
		.active-pill.big {
			height: 54px;
			transform: translateY(-50%) scale(1.05);
			background: radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--accent) 44%, rgba(255, 255, 255, 0.25)), color-mix(in srgb, var(--accent) 26%, transparent 20%));
			border-color: color-mix(in srgb, var(--accent) 70%, rgba(255, 255, 255, 0.5));
			box-shadow: 0 10px 32px color-mix(in srgb, var(--accent) 60%, transparent), inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
			transition: height 0.15s ease-out, transform 0.15s ease-out, box-shadow 0.15s ease, background 0.15s ease;
		}

		.pill-specular {
			position: absolute;
			inset: 1px 4px auto 4px;
			height: 50%;
			border-radius: 999px 999px 0 0;
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 100%);
			pointer-events: none;
		}

		.tab {
			position: relative;
			z-index: 2;
			-webkit-tap-highlight-color: transparent;
			border-radius: 999px;
			height: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 3px;
			text-decoration: none;
			color: var(--text-secondary);
			flex: 1;
			transition: color 0.18s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease;
			cursor: pointer;
		}

		.tab:active {
			transform: scale(0.92);
		}

		.bottom-nav.is-dragging .tab:not(.active) {
			opacity: 0.6;
			transform: scale(0.95);
		}

		.tab.active {
			color: var(--accent);
			opacity: 1 !important;
		}

		.tab.drag-target .icon-wrap {
			transform: translateY(-3px) scale(1.18);
		}

		.tab.active .icon-wrap {
			transform: translateY(-2px);
		}

		.icon-wrap {
			display: grid;
			place-items: center;
			transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
		}

		.label {
			font-size: 0.63rem;
			font-weight: 750;
			letter-spacing: 0.02em;
			transition: font-weight 0.15s ease, transform 0.2s ease;
		}

		.tab.active .label {
			font-weight: 850;
		}
	}
</style>
