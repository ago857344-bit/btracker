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

	const pad = 5;
	$: usableWidth = Math.max(0, navWidth - pad * 2);
	$: tabWidth = usableWidth > 0 ? usableWidth / tabs.length : 0;

	// Resting geometry
	$: idlePillWidth = Math.max(0, tabWidth - 2);
	$: idlePillLeft = pad + activeIdx * tabWidth + 1;

	// Dragging geometry (stretches & gets big)
	$: dragPillWidth = Math.max(0, tabWidth * 1.38);
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
			<span class="icon-wrap"><NavIcon name={tab.icon} size={23} /></span>
			<span class="label">{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		display: none;
	}

	@media (max-width: 768px) {
		.bottom-nav {
			display: flex;
			position: fixed;
			bottom: max(env(safe-area-inset-bottom), 18px);
			left: 50%;
			transform: translateX(-50%);
			width: 93%;
			max-width: 430px;
			height: 68px;
			padding: 5px;
			background: var(--surface-popup, rgba(18, 16, 32, 0.96)) !important;
			backdrop-filter: blur(36px) saturate(210%);
			-webkit-backdrop-filter: blur(36px) saturate(210%);
			border-radius: 9999px;
			border: 1px solid var(--surface-popup-border, color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.18)));
			box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.22);
			z-index: 100;
			justify-content: space-around;
			align-items: center;
			user-select: none;
			touch-action: none;
			-webkit-user-select: none;
			overflow: visible;
		}

		:global(:root[data-theme='light']) .bottom-nav,
		:global(:root[data-theme='notion']) .bottom-nav,
		:global(:root[data-theme='duolingo']) .bottom-nav,
		:global(:root[data-theme='anki']) .bottom-nav,
		:global(:root[data-theme='master']) .bottom-nav {
			background: var(--surface-popup, rgba(255, 255, 255, 0.96)) !important;
			border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(0, 0, 0, 0.08));
			box-shadow: 0 24px 64px -8px rgba(44, 37, 92, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.95);
		}

		/* Active Glass Pill Indicator (Apple Music Style) */
		.active-pill {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			height: 56px;
			border-radius: 9999px;
			background: radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--accent) 36%, rgba(255, 255, 255, 0.24)), color-mix(in srgb, var(--accent) 18%, transparent 45%));
			border: 0.5px solid color-mix(in srgb, var(--accent) 55%, rgba(255, 255, 255, 0.45));
			box-shadow: 0 10px 28px -4px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 1px 2px rgba(255, 255, 255, 0.55);
			pointer-events: none;
			z-index: 1;
			transition: left 0.38s cubic-bezier(0.32, 0.72, 0, 1),
						width 0.34s cubic-bezier(0.32, 0.72, 0, 1),
						height 0.25s cubic-bezier(0.32, 0.72, 0, 1),
						transform 0.25s cubic-bezier(0.32, 0.72, 0, 1),
						box-shadow 0.25s ease,
						background 0.25s ease;
		}

		/* Stretches and enlarges with intense reactivity while dragging */
		.active-pill.big {
			height: 62px;
			transform: translateY(-50%) scale(1.06);
			background: radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--accent) 48%, rgba(255, 255, 255, 0.3)), color-mix(in srgb, var(--accent) 26%, transparent 20%));
			border-color: color-mix(in srgb, var(--accent) 75%, rgba(255, 255, 255, 0.6));
			box-shadow: 0 14px 40px color-mix(in srgb, var(--accent) 68%, transparent), inset 0 1.5px 2px rgba(255, 255, 255, 0.72);
			transition: height 0.15s ease-out, transform 0.15s ease-out, box-shadow 0.15s ease, background 0.15s ease;
		}

		.pill-specular {
			position: absolute;
			inset: 1px 5px auto 5px;
			height: 48%;
			border-radius: 9999px 9999px 0 0;
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.08) 65%, transparent 100%);
			pointer-events: none;
		}

		.tab {
			position: relative;
			z-index: 2;
			-webkit-tap-highlight-color: transparent;
			border-radius: 9999px;
			height: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 2px;
			text-decoration: none;
			color: var(--text-secondary);
			flex: 1;
			transition: color 0.18s ease, transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.18s ease;
			cursor: pointer;
		}

		.tab:active {
			transform: scale(0.93);
		}

		.bottom-nav.is-dragging .tab:not(.active) {
			opacity: 0.55;
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
			transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
		}

		.label {
			font-size: 0.68rem;
			font-weight: 650;
			letter-spacing: -0.015em;
			transition: font-weight 0.15s ease, transform 0.2s ease;
		}

		.tab.active .label {
			font-weight: 800;
		}
	}
</style>
