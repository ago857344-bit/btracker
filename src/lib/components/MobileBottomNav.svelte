<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { ComponentProps } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { uiClick, uiPop } from '$lib/utils/feedback';
	import { onMount } from 'svelte';
	import { tracker } from '$lib/stores/tracker';

	type NavIconName = ComponentProps<NavIcon>['name'];
	interface BottomTab {
		href: string;
		label: string;
		icon: NavIconName;
	}

	$: flowMode = $tracker.ui?.studyFlowMode || 'all-features';

	let tabs: readonly BottomTab[] = [];
	$: tabs = (() => {
		if (flowMode === 'focus-log') {
			return [
				{ href: '/', label: 'Home', icon: 'home' },
				{ href: '/focus', label: 'Focus', icon: 'focus' },
				{ href: '/log', label: 'Log', icon: 'grid' },
				{ href: '/todo', label: 'To Do', icon: 'list' },
				{ href: '/settings', label: 'Settings', icon: 'settings' }
			] as const;
		}
		if (flowMode === 'planner-routine') {
			return [
				{ href: '/', label: 'Home', icon: 'home' },
				{ href: '/plan', label: 'Plan', icon: 'plan' },
				{ href: '/todo', label: 'To Do', icon: 'list' },
				{ href: '/focus', label: 'Focus', icon: 'focus' },
				{ href: '/settings', label: 'Settings', icon: 'settings' }
			] as const;
		}
		if (flowMode === 'revision-mocks') {
			return [
				{ href: '/', label: 'Home', icon: 'home' },
				{ href: '/revise', label: 'Revise', icon: 'revise' },
				{ href: '/tests', label: 'Tests', icon: 'tests' },
				{ href: '/stats', label: 'Stats', icon: 'stats' },
				{ href: '/settings', label: 'Settings', icon: 'settings' }
			] as const;
		}
		return [
			{ href: '/', label: 'Home', icon: 'home' },
			{ href: '/log', label: 'Log', icon: 'grid' },
			{ href: '/focus', label: 'Focus', icon: 'focus' },
			{ href: '/todo', label: 'To Do', icon: 'list' },
			{ href: '/settings', label: 'Settings', icon: 'settings' }
		] as const;
	})();

	$: activeIdx = tabs.findIndex((t) => t.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(t.href));

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

	let lastValidIdx = 0;
	$: if (activeIdx !== -1) {
		lastValidIdx = activeIdx;
	}

	// Resting geometry
	$: idlePillWidth = Math.max(0, tabWidth - 2);
	$: idlePillLeft = pad + (activeIdx !== -1 ? activeIdx : lastValidIdx) * tabWidth + 1;

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
			class:hidden-pill={activeIdx === -1 && !isDragging}
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
			background: color-mix(in srgb, var(--surface-panel, #121020) 86%, transparent) !important;
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
			background: color-mix(in srgb, var(--surface-panel, #ffffff) 88%, transparent) !important;
			border: 1px solid color-mix(in srgb, var(--border-subtle) 85%, rgba(0, 0, 0, 0.08));
			box-shadow: 0 16px 48px -8px rgba(44, 37, 92, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.95);
		}

		/* Wallpaper Mode: Bottom Navigation adapts to custom wallpaper bottom & accent */
		:global(:root[data-wallpaper='true']) .bottom-nav,
		:global(:root[data-live-wallpaper='true']) .bottom-nav {
			background: color-mix(in srgb, var(--wallpaper-bottom-color, var(--surface-panel)) 48%, rgba(10, 8, 20, 0.48)) !important;
			backdrop-filter: blur(36px) saturate(220%);
			-webkit-backdrop-filter: blur(36px) saturate(220%);
			border: 1px solid color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 32%, rgba(255, 255, 255, 0.22)) !important;
			box-shadow: 0 20px 56px -8px color-mix(in srgb, var(--wallpaper-bottom-color, #000000) 65%, rgba(0, 0, 0, 0.7)),
						inset 0 1px 1.5px rgba(255, 255, 255, 0.28) !important;
		}

		:global(:root[data-wallpaper='true'][data-wallpaper-bottom-bright='true']) .bottom-nav,
		:global(:root[data-wallpaper='true'][data-wallpaper-luminance='bright']) .bottom-nav,
		:global(:root[data-live-wallpaper='true'][data-wallpaper-bottom-bright='true']) .bottom-nav {
			background: color-mix(in srgb, var(--wallpaper-bottom-color, #ffffff) 65%, rgba(255, 255, 255, 0.62)) !important;
			backdrop-filter: blur(36px) saturate(220%);
			-webkit-backdrop-filter: blur(36px) saturate(220%);
			border: 1px solid color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 32%, rgba(0, 0, 0, 0.12)) !important;
			box-shadow: 0 16px 44px -8px color-mix(in srgb, var(--wallpaper-bottom-color, #1a1a2e) 25%, rgba(0, 0, 0, 0.15)),
						inset 0 1px 1px rgba(255, 255, 255, 0.95) !important;
		}

		:global(:root[data-theme='light']) .active-pill,
		:global(:root[data-theme='notion']) .active-pill,
		:global(:root[data-theme='duolingo']) .active-pill,
		:global(:root[data-theme='anki']) .active-pill,
		:global(:root[data-theme='master']) .active-pill {
			background: color-mix(in srgb, var(--accent) 14%, #ffffff) !important;
			border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent) !important;
			box-shadow: 0 6px 20px -2px color-mix(in srgb, var(--accent) 26%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
		}

		:global(:root[data-theme='light']) .active-pill.big,
		:global(:root[data-theme='notion']) .active-pill.big,
		:global(:root[data-theme='duolingo']) .active-pill.big,
		:global(:root[data-theme='anki']) .active-pill.big,
		:global(:root[data-theme='master']) .active-pill.big {
			background: color-mix(in srgb, var(--accent) 22%, #ffffff) !important;
			border-color: color-mix(in srgb, var(--accent) 45%, transparent) !important;
			box-shadow: 0 10px 28px -2px color-mix(in srgb, var(--accent) 38%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
		}

		/* Wallpaper Mode: Active Pill glow and accents */
		:global(:root[data-wallpaper='true']) .active-pill,
		:global(:root[data-live-wallpaper='true']) .active-pill {
			background: radial-gradient(
				circle at 50% 20%,
				color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 45%, rgba(255, 255, 255, 0.28)),
				color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 20%, transparent 45%)
			) !important;
			border: 0.5px solid color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 65%, rgba(255, 255, 255, 0.45)) !important;
			box-shadow: 0 10px 28px -4px color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 50%, transparent),
						inset 0 1px 2px rgba(255, 255, 255, 0.55) !important;
		}

		:global(:root[data-wallpaper='true']) .active-pill.big,
		:global(:root[data-live-wallpaper='true']) .active-pill.big {
			background: radial-gradient(
				circle at 50% 18%,
				color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 58%, rgba(255, 255, 255, 0.35)),
				color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 30%, transparent 20%)
			) !important;
			border-color: color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 85%, rgba(255, 255, 255, 0.65)) !important;
			box-shadow: 0 14px 40px color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 72%, transparent),
						inset 0 1.5px 2px rgba(255, 255, 255, 0.72) !important;
		}

		:global(:root[data-wallpaper='true'][data-wallpaper-bottom-bright='true']) .active-pill,
		:global(:root[data-wallpaper='true'][data-wallpaper-luminance='bright']) .active-pill,
		:global(:root[data-live-wallpaper='true'][data-wallpaper-bottom-bright='true']) .active-pill {
			background: color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 18%, #ffffff) !important;
			border: 1px solid color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 40%, transparent) !important;
			box-shadow: 0 6px 20px -2px color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 30%, transparent),
						inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
		}

		:global(:root[data-wallpaper='true'][data-wallpaper-bottom-bright='true']) .active-pill.big,
		:global(:root[data-wallpaper='true'][data-wallpaper-luminance='bright']) .active-pill.big,
		:global(:root[data-live-wallpaper='true'][data-wallpaper-bottom-bright='true']) .active-pill.big {
			background: color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 28%, #ffffff) !important;
			border-color: color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 55%, transparent) !important;
			box-shadow: 0 10px 28px -2px color-mix(in srgb, var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) 42%, transparent),
						inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
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
						opacity 0.22s ease,
						box-shadow 0.25s ease,
						background 0.25s ease;
		}

		.active-pill.hidden-pill {
			opacity: 0 !important;
			transform: translateY(-50%) scale(0.72) !important;
			pointer-events: none;
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

		/* Wallpaper Mode: tab icons and labels adapt to wallpaper */
		:global(:root[data-wallpaper='true']) .tab.active,
		:global(:root[data-live-wallpaper='true']) .tab.active {
			color: var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) !important;
			text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		}

		:global(:root[data-wallpaper='true']) .tab:not(.active),
		:global(:root[data-live-wallpaper='true']) .tab:not(.active) {
			color: rgba(255, 255, 255, 0.76);
		}

		:global(:root[data-wallpaper='true'][data-wallpaper-bottom-bright='true']) .tab:not(.active),
		:global(:root[data-wallpaper='true'][data-wallpaper-luminance='bright']) .tab:not(.active),
		:global(:root[data-live-wallpaper='true'][data-wallpaper-bottom-bright='true']) .tab:not(.active) {
			color: rgba(20, 20, 32, 0.68) !important;
		}

		:global(:root[data-wallpaper='true'][data-wallpaper-bottom-bright='true']) .tab.active,
		:global(:root[data-wallpaper='true'][data-wallpaper-luminance='bright']) .tab.active,
		:global(:root[data-live-wallpaper='true'][data-wallpaper-bottom-bright='true']) .tab.active {
			color: var(--wallpaper-bottom-accent, var(--wallpaper-accent, var(--accent))) !important;
			text-shadow: none;
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
