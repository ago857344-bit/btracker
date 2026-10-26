<script lang="ts">
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import WorkspaceToolsModal from '$lib/components/WorkspaceToolsModal.svelte';
	import { tracker, updateTracker } from '$lib/stores/tracker';
	import { sidebarDragWidth, sidebarResizeMode } from '$lib/stores/sidebar';
	import { chaptersDueToday } from '$lib/stores/recall-selectors';
	import { currentUser } from '$lib/stores/auth';
	import { getLevelData, tierEloOf } from '$lib/state/gamification';
	import { eloTier } from '$lib/state/weekly';
	import { loadout } from '$lib/stores/cosmetics';
	import { getDefaultNavForMode } from '$lib/state/defaults';

	export let collapsed = false;
	export let mobileOpen = false;

	$: isPreview = $page.url.searchParams.get('preview') === '1';
	$: tierElo = isPreview ? 300 : Math.round(tierEloOf($tracker.gamification));
	$: tier = eloTier(tierElo);
	$: stars = isPreview ? 0 : ($tracker.gamification?.prestige?.count ?? 0);
	$: frame = isPreview ? null : $loadout.frame;

	$: xp = isPreview ? 0 : ($tracker.gamification?.xp || 0);
	$: levelData = getLevelData(xp);

	type NavIconName = ComponentProps<NavIcon>['name'];
	interface NavItem {
		href: string;
		label: string;
		icon: NavIconName;
	}

	let toolsModalOpen = false;
	$: flowMode = $tracker.ui?.studyFlowMode || 'all-features';

	const ALL_TOOLS: readonly NavItem[] = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/log', label: 'Log', icon: 'grid' },
		{ href: '/review', label: 'Review', icon: 'target' },
		{ href: '/plan', label: 'Plan', icon: 'plan' },
		{ href: '/tests', label: 'Tests', icon: 'tests' },
		{ href: '/dump', label: 'Study Dump', icon: 'layers' },
		{ href: '/todo', label: 'To Do', icon: 'list' },
		{ href: '/focus', label: 'Focus', icon: 'focus' },
		{ href: '/revise', label: 'Revise', icon: 'revise' },
		{ href: '/stats', label: 'Stats', icon: 'stats' },
		{ href: '/reminders', label: 'Reminders', icon: 'reminders' }
	] as const;

	$: isGeneric = $tracker.coaching_type === 'GENERIC';
	$: availableTools = isGeneric ? ALL_TOOLS.filter((tool) => tool.href !== '/review') : ALL_TOOLS;
	$: pinnedHrefs = ((flowMode === 'all-features')
		? ALL_TOOLS.map((t) => t.href)
		: ($tracker.ui?.pinnedNav || getDefaultNavForMode(flowMode)))
		.filter((href) => availableTools.some((tool) => tool.href === href));
	$: primary = (() => {
		const visible = Array.from(new Set(pinnedHrefs));
		const ordered = ($tracker.ui?.navOrder ?? []).filter((href) => visible.includes(href));
		const hrefs = [...ordered, ...visible.filter((href) => !ordered.includes(href))];
		return hrefs.map((href) => availableTools.find((tool) => tool.href === href)).filter((tool): tool is NavItem => Boolean(tool));
	})();
	const ALL_SECONDARY: readonly NavItem[] = [
		{ href: '/stats', label: 'Stats', icon: 'stats' },
		{ href: '/reminders', label: 'Reminders', icon: 'reminders' }
	] as const;

	$: secondary = ALL_SECONDARY.filter((s) => !primary.some((p) => p.href === s.href));

	const isActive = (href: string) => href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
	const closeMobile = () => mobileOpen = false;

	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length > 0) {
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (e.changedTouches.length > 0) {
			const deltaX = e.changedTouches[0].clientX - touchStartX;
			const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
			if (deltaX < -40 && deltaY < 80) {
				closeMobile();
			}
		}
	}

	function handleToggle() {
		if (typeof window !== 'undefined' && window.innerWidth <= 760) {
			mobileOpen = false;
		} else {
			updateTracker((s) => { s.ui.sidebarCollapsed = !collapsed; });
		}
	}

	/* ---- Drag-to-resize (desktop) ---- */
	const MIN_WIDTH = 200;
	const MAX_WIDTH = 420;
	let asideEl: HTMLElement;
	let resizing = false;
	let resizeStartX = 0;
	let resizeStartWidth = 0;

	const clampWidth = (w: number) => Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w)));

	function startResize(e: PointerEvent) {
		if (e.button !== undefined && e.button !== 0) return;
		resizing = true;
		resizeStartX = e.clientX;
		resizeStartWidth = asideEl?.getBoundingClientRect().width ?? 280;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		document.body.classList.add('sidebar-resizing');
		e.preventDefault();
	}

	function moveResize(e: PointerEvent) {
		if (!resizing) return;
		sidebarDragWidth.set(clampWidth(resizeStartWidth + e.clientX - resizeStartX));
	}

	function endResize() {
		if (!resizing) return;
		resizing = false;
		document.body.classList.remove('sidebar-resizing');
		const width = get(sidebarDragWidth);
		sidebarDragWidth.set(null);
		if (width != null) updateTracker((s) => { s.ui.sidebarWidth = width; });
		sidebarResizeMode.set(false);
	}

	function nudgeResize(delta: number) {
		const current = asideEl?.getBoundingClientRect().width ?? resizeStartWidth ?? 280;
		updateTracker((s) => { s.ui.sidebarWidth = clampWidth(current + delta); });
	}

	/* ---- Drag-to-reorder nav items (desktop) ---- */
	let dragEnabled = false;
	let dragHref: string | null = null;
	let dropHref: string | null = null;

	onMount(() => {
		const mq = window.matchMedia('(min-width: 761px)');
		const sync = () => { dragEnabled = mq.matches; };
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

	function onItemDragStart(e: DragEvent, href: string) {
		dragHref = href;
		dropHref = null;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', href);
		}
	}

	function onItemDragOver(e: DragEvent, href: string) {
		if (!dragHref) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropHref = href;
	}

	function onItemDrop(e: DragEvent, href: string) {
		e.preventDefault();
		const from = dragHref;
		dragHref = null;
		dropHref = null;
		if (!from || from === href) return;
		const hrefs = primary.map((item) => item.href).filter((h) => h !== from);
		const to = hrefs.indexOf(href);
		if (to < 0) return;
		hrefs.splice(to, 0, from);
		const hidden = ($tracker.ui?.navOrder ?? []).filter((h) => !hrefs.includes(h));
		updateTracker((s) => { s.ui.navOrder = [...hrefs, ...hidden]; });
	}

	function onItemDragEnd() {
		dragHref = null;
		dropHref = null;
	}
</script>

<aside
	bind:this={asideEl}
	class="glass"
	class:collapsed
	class:resizing
	class:resize-mode={$sidebarResizeMode}
	class:mobile-open={mobileOpen}
	aria-label="Primary navigation"
	on:touchstart={handleTouchStart}
	on:touchend={handleTouchEnd}
>
	{#if !collapsed && $sidebarResizeMode}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="resize-handle"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize sidebar"
			title="Drag to resize"
			tabindex="0"
			on:pointerdown={startResize}
			on:pointermove={moveResize}
			on:pointerup={endResize}
			on:pointercancel={endResize}
			on:keydown={(e) => {
				if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeResize(-16); }
				else if (e.key === 'ArrowRight') { e.preventDefault(); nudgeResize(16); }
				else if (e.key === 'Escape') { sidebarResizeMode.set(false); }
			}}
		></div>
	{/if}
	<div class="brand-row">
		<a class="brand" href="/" aria-label="BTracker home" on:click={closeMobile}>
			<span class="brand-mark">B</span>
			<span class="brand-name">btracker</span>
		</a>
		{#if mobileOpen}
			<button class="close-mobile-btn" type="button" on:click={closeMobile} aria-label="Close menu">
				<NavIcon name="x" size={18} />
			</button>
		{:else}
			<button class="collapse" type="button" on:click={handleToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
				<NavIcon name="chevron" size={18} />
			</button>
		{/if}
	</div>

	<nav>
		<p class="nav-label">Workspace</p>
		{#each primary as item (item.href)}
			<a
				class:active={isActive(item.href)}
				class:dragging={dragHref === item.href}
				class:drop-target={dropHref === item.href && dragHref !== item.href}
				href={item.href}
				draggable={dragEnabled}
				title={dragEnabled ? 'Drag to reorder' : undefined}
				on:click={closeMobile}
				on:dragstart={(e) => onItemDragStart(e, item.href)}
				on:dragover={(e) => onItemDragOver(e, item.href)}
				on:drop={(e) => onItemDrop(e, item.href)}
				on:dragend={onItemDragEnd}
			>
				<span class="nav-icon"><NavIcon name={item.icon} size={22} /></span><span class="nav-text">{item.href === '/log' && isGeneric ? 'Study Log' : item.label}</span>
				{#if dragEnabled}
					<span class="nav-grip" aria-hidden="true"><NavIcon name="drag" size={13} /></span>
				{/if}
				{#if item.href === '/revise' && $chaptersDueToday.length}
					<span class="due-badge" title="{$chaptersDueToday.length} chapter(s) due">{$chaptersDueToday.length}</span>
				{/if}
			</a>
		{/each}

		{#if flowMode !== 'all-features'}
			<button
				type="button"
				class="btn-tools-modal-open"
				title="Customize tools in sidebar"
				on:click={() => {
					closeMobile();
					toolsModalOpen = true;
				}}
			>
				<span class="nav-icon"><NavIcon name="plus" size={15} /></span>
				<span class="nav-text">Add / Edit Tools</span>
			</button>
		{/if}

		{#if secondary.length > 0}
			<div class="nav-divider"></div>
			<p class="nav-label">Insights</p>
			{#each secondary as item (item.href)}
				<a class:active={isActive(item.href)} href={item.href} on:click={closeMobile}>
					<span class="nav-icon"><NavIcon name={item.icon} size={22} /></span><span class="nav-text">{item.label}</span>
					{#if item.href === '/reminders' && $chaptersDueToday.length}
						<span class="due-badge" title="{$chaptersDueToday.length} revision(s) due">{$chaptersDueToday.length}</span>
					{/if}
				</a>
			{/each}
		{/if}
	</nav>

	<div class="sidebar-bottom">
		<a class="settings-link" href="/settings" on:click={closeMobile}>
			<span class="nav-icon"><NavIcon name="settings" size={22} /></span><span class="nav-text">Settings</span>
		</a>
		<div class="profile-container gamer-card">
			<div class="avatar-ring" class:active={frame} class:animated={frame?.id === 'flame' || frame?.id === 'celestial'} style={frame ? `--ring-bg: linear-gradient(135deg, ${frame.colors?.join(', ')})` : undefined}>
				<AccountMenu showSignIn={false} />
			</div>
			<span class="profile-copy">
				<div class="user-level-row">
					<b>{isPreview ? 'Student Aspirant' : ($tracker.meta.name || 'My Account')}</b>
					<span class="elo-badge {tier.cls}" title="{tierElo} {stars ? 'season ' : ''}Elo{stars ? ` · Prestige ${stars}` : ''}">{tier.icon} {tier.name}{#if stars}<i class="stars">{stars > 3 ? `★${stars}` : '★'.repeat(stars)}</i>{/if}</span>
				</div>
				<small class="rank-name" class:gradient-text={frame} style={frame ? `--frame: linear-gradient(135deg, ${frame.colors?.join(', ')})` : undefined}>Lv {levelData.level} · {isPreview ? 'Aspirant' : ($loadout.title ?? levelData.title)}</small>
				<div class="xp-bar" title="{xp} XP / {levelData.nextTierXp} XP">
					<div class="xp-fill" style="width: {levelData.progress}%"></div>
				</div>
			</span>
		</div>
	</div>

	<WorkspaceToolsModal bind:open={toolsModalOpen} />
</aside>

<style>
	aside {
		position: fixed;
		z-index: 20;
		inset: 0 auto 0 0;
		display: flex;
		flex-direction: column;
		width: var(--sidebar-w, clamp(250px, 22vw, 300px));
		padding: 1.2rem 1rem 1rem;
		background: var(--surface-panel);
		backdrop-filter: var(--glass-filter, blur(36px) saturate(210%));
		-webkit-backdrop-filter: var(--glass-filter, blur(36px) saturate(210%));
		border-right: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16));
		box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.08);
		transition: width 0.28s var(--ease-ios-spring, cubic-bezier(0.32, 0.72, 0, 1)), transform 0.28s var(--ease-ios-spring, cubic-bezier(0.32, 0.72, 0, 1));
		overflow-y: auto;
		overflow-x: hidden;
	}
	aside::-webkit-scrollbar { display: none; }
	aside { -ms-overflow-style: none; scrollbar-width: none; }
	aside.resizing { transition: none; }
	.resize-handle {
		position: absolute;
		top: 0;
		right: 0;
		width: 7px;
		height: 100%;
		cursor: col-resize;
		z-index: 40;
		touch-action: none;
	}
	.resize-handle::after {
		content: '';
		position: absolute;
		top: 50%;
		right: 2px;
		width: 2px;
		height: 44px;
		transform: translateY(-50%);
		border-radius: 99px;
		background: var(--accent);
		opacity: 0;
		transition: opacity .15s ease;
	}
	.resize-handle:hover::after,
	.resize-handle:focus-visible::after,
	aside.resizing .resize-handle::after { opacity: .6; }
	aside.resize-mode .resize-handle::after { opacity: .65; }
	.resize-handle:focus-visible { outline: none; }
	:global(body.sidebar-resizing),
	:global(body.sidebar-resizing *) { cursor: col-resize !important; user-select: none !important; }
	.brand-row { display: flex; align-items: center; gap: .45rem; min-height: 42px; padding: 0 .25rem .8rem; }
	.brand {
		display: inline-flex;
		align-items: center;
		gap: .65rem;
		min-width: 0;
		color: var(--text-primary);
		text-decoration: none !important;
		font-weight: 800;
		letter-spacing: -.055em;
		font-size: 1.24rem;
	}
	.brand:hover, .brand:focus, .brand:active {
		text-decoration: none !important;
		color: var(--text-primary);
	}
	.brand-mark {
		display: grid;
		place-items: center;
		flex: 0 0 31px;
		width: 31px;
		height: 31px;
		border-radius: 9px;
		background: var(--surface-popup-solid, var(--surface-panel)) !important;
		color: var(--text-primary) !important;
		border: 1px solid var(--border-subtle);
		font-size: 1.05rem;
		font-weight: 900;
		letter-spacing: -.05em;
		line-height: 1;
		text-decoration: none !important;
		box-shadow: 0 2px 7px rgba(0, 0, 0, 0.16), 0 1px 2px rgba(0, 0, 0, 0.08), inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
		transition: transform 0.2s var(--ease-ios-spring, cubic-bezier(0.32, 0.72, 0, 1));
	}
	.brand-mark:active { transform: scale(0.93); }
	.brand-name {
		color: var(--text-primary);
		text-decoration: none !important;
		white-space: nowrap;
		overflow: hidden;
		transition: opacity .18s ease;
	}
	.nav-text, .nav-label, .profile-copy { white-space: nowrap; overflow: hidden; transition: opacity .18s ease; }
	.collapse { display: grid; place-items: center; margin-left: auto; width: 30px; height: 30px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; transform: rotate(180deg); cursor: pointer; transition: all 0.2s var(--ease-ios-spring); } /* Points Left (<) when open */
	.collapse:hover { color: var(--accent); background: var(--accent-soft); }
	.collapse:active { transform: rotate(180deg) scale(0.9); }
	nav { display: grid; gap: clamp(0.15rem, 0.4vh, 0.3rem); margin-top: clamp(0.5rem, 1.5vh, 1.15rem); }
	.nav-label { margin: clamp(0.4rem, 1vh, 0.8rem) .65rem clamp(0.2rem, 0.5vh, 0.45rem); color: var(--text-secondary); font-size: .67rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
	nav a, .settings-link {
		display: flex;
		align-items: center;
		gap: clamp(0.6rem, 1vw, 1rem);
		height: clamp(40px, 6vh, 52px);
		padding: 0 .75rem;
		border-radius: 12px;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: clamp(0.85rem, 1.2vh, 1rem);
		font-weight: 650;
		transition: all 0.2s var(--ease-ios-spring, cubic-bezier(0.32, 0.72, 0, 1));
		-webkit-tap-highlight-color: transparent;
	}
	.btn-tools-modal-open {
		display: flex;
		align-items: center;
		gap: clamp(0.6rem, 1vw, 1rem);
		height: clamp(34px, 5vh, 40px);
		padding: 0 .75rem;
		border-radius: 10px;
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--surface-subtle) 60%, transparent);
		border: 1px dashed var(--border-subtle);
		font-size: clamp(0.78rem, 1.1vh, 0.88rem);
		font-weight: 700;
		cursor: pointer;
		margin: 0.35rem 0 0.15rem;
		transition: all 0.2s ease;
		font-family: inherit;
		text-align: left;
		width: 100%;
	}
	.btn-tools-modal-open:hover {
		color: var(--accent);
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		transform: translateY(-1px);
	}
	.btn-tools-modal-open:active {
		transform: scale(0.97);
	}
	aside.collapsed .btn-tools-modal-open {
		justify-content: center;
		padding: 0;
	}
	nav a:hover, .settings-link:hover { color: var(--text-primary); background: var(--surface-subtle); }
	nav a:active, .settings-link:active { transform: scale(0.975); }
	nav a.active {
		color: var(--accent);
		background: var(--accent-soft);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
		font-weight: 700;
	}
	nav a[draggable='true'] { cursor: grab; }
	nav a.dragging { opacity: .35; cursor: grabbing; }
	nav a.drop-target { box-shadow: inset 0 2px 0 0 var(--accent); }
	.nav-grip {
		margin-left: auto;
		display: grid;
		place-items: center;
		color: var(--text-secondary);
		opacity: 0;
		transition: opacity .15s ease;
	}
	nav a:hover .nav-grip { opacity: .6; }
	.nav-grip + .due-badge { margin-left: 6px; }
	.nav-icon { display: grid; flex: 0 0 24px; place-items: center; }
	.due-badge { margin-left: auto; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 99px; display: grid; place-items: center; background: var(--accent); color: var(--accent-contrast, white); font-size: .62rem; font-weight: 800; }
	.nav-divider { height: 1px; margin: clamp(0.5rem, 1.5vh, 1rem) .65rem clamp(0.1rem, 0.3vh, 0.2rem); background: var(--border-subtle); }
	.sidebar-bottom { display: grid; gap: .55rem; margin-top: auto; min-width: 0; position: relative; }
	.profile-container {
		min-width: 0;
		max-width: 100%;
		padding: .7rem .65rem;
		border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16));
		border-radius: 16px;
		display: flex;
		align-items: center;
		gap: .55rem;
		background: var(--surface-panel);
		backdrop-filter: var(--glass-filter, blur(36px) saturate(210%));
		-webkit-backdrop-filter: var(--glass-filter, blur(36px) saturate(210%));
		margin-top: .3rem;
		box-shadow:
			0 12px 32px -4px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.14),
			inset 0 0 0 1px rgba(255, 255, 255, 0.04);
		transition: all 0.2s var(--ease-ios-spring, cubic-bezier(0.32, 0.72, 0, 1));
	}
	:global(:root[data-theme='light']) .profile-container,
	:global(:root[data-theme='notion']) .profile-container,
	:global(:root[data-theme='duolingo']) .profile-container,
	:global(:root[data-theme='anki']) .profile-container,
	:global(:root[data-theme='master']) .profile-container {
		border-color: color-mix(in srgb, var(--border-subtle) 80%, rgba(0, 0, 0, 0.08));
		box-shadow:
			0 12px 32px -4px rgba(44, 37, 92, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.95);
	}
	:global(:root[data-theme='light']) .brand-mark,
	:global(:root[data-theme='notion']) .brand-mark,
	:global(:root[data-theme='duolingo']) .brand-mark,
	:global(:root[data-theme='anki']) .brand-mark,
	:global(:root[data-theme='master']) .brand-mark {
		background: var(--accent) !important;
		color: var(--accent-contrast, #ffffff) !important;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
	}
	:global(:root[data-theme='light']) aside,
	:global(:root[data-theme='notion']) aside,
	:global(:root[data-theme='duolingo']) aside,
	:global(:root[data-theme='anki']) aside,
	:global(:root[data-theme='master']) aside {
		border-right: 1px solid var(--border-subtle);
		box-shadow: 4px 0 24px -4px rgba(44, 37, 92, 0.06);
	}
	.profile-copy { display: grid; gap: .1rem; min-width: 0; flex: 1; font-size: .77rem; }
	.user-level-row { display: flex; align-items: center; gap: .35rem; min-width: 0; }
	.user-level-row b { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.rank-name { color: var(--accent); font-weight: 800; font-size: .62rem; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .2rem; }
	.xp-bar { height: 6px; background: color-mix(in srgb, var(--text-primary), transparent 90%); border-radius: 99px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); width: 100%; }
	.xp-fill { height: 100%; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 80%, white)); transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
	
	aside.collapsed { width: 76px; }
	aside.collapsed .brand-name, aside.collapsed .nav-text, aside.collapsed .nav-label, aside.collapsed .profile-copy { width: 0; opacity: 0; }
	aside.collapsed .brand-row { justify-content: center; padding-inline: 0; }
	aside.collapsed .brand { gap: 0; }
	aside.collapsed .collapse { position: absolute; right: -12px; top: 24px; width: 24px; height: 24px; border: 1px solid var(--border-subtle); background: var(--surface-panel); transform: rotate(0deg); } /* Points Right (>) when closed */
	aside.collapsed nav a, aside.collapsed .settings-link { justify-content: center; padding-inline: 0; gap: 0; }
	aside.collapsed .nav-divider { margin-inline: .3rem; }
	aside.collapsed .profile-container { justify-content: center; padding-inline: 0; }
	aside.collapsed .nav-grip { display: none; }
	aside.collapsed :global(.signin span) { width: 0; opacity: 0; overflow: hidden; display: none; }
	aside.collapsed :global(.signin) { justify-content: center; width: 36px; height: 36px; padding: 0; }
	aside.collapsed :global(.signin svg) { margin: 0; }

	
	.close-mobile-btn { display: none; }

	@media (max-width: 760px) {
		.resize-handle { display: none; }
		aside {
			width: min(290px, calc(100vw - 44px));
			transform: translateX(-102%);
			box-shadow: 18px 0 48px -6px rgba(0, 0, 0, 0.45);
			padding-top: calc(max(env(safe-area-inset-top), 24px) + 0.9rem);
			padding-bottom: calc(max(env(safe-area-inset-bottom), 16px) + 1.25rem);
			border-radius: 0 26px 26px 0;
			border-right: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16));
			background: var(--surface-popup, rgba(18, 16, 32, 0.96)) !important;
			backdrop-filter: blur(36px) saturate(210%);
			-webkit-backdrop-filter: blur(36px) saturate(210%);
			box-shadow: 20px 0 64px -8px rgba(0, 0, 0, 0.65), inset -1px 0 0 rgba(255, 255, 255, 0.12);
			transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
		}
		aside.mobile-open {
			transform: translateX(0);
			z-index: 120;
			background: var(--surface-popup, rgba(18, 16, 32, 0.96)) !important;
		}
		aside.collapsed {
			width: min(290px, calc(100vw - 44px));
			padding-top: calc(max(env(safe-area-inset-top), 24px) + 0.9rem);
			padding-bottom: calc(max(env(safe-area-inset-bottom), 16px) + 1.25rem);
			border-radius: 0 26px 26px 0;
		}
		aside.collapsed .brand-name, aside.collapsed .nav-text, aside.collapsed .nav-label, aside.collapsed .profile-copy { width: auto; opacity: 1; }
		aside.collapsed .collapse { position: static; transform: none; border: 0; background: transparent; }
		aside.collapsed nav a, aside.collapsed .settings-link, aside.collapsed .profile-container { justify-content: flex-start; padding-inline: .75rem; }
		.close-mobile-btn {
			display: grid;
			place-items: center;
			margin-left: auto;
			width: 36px;
			height: 36px;
			min-width: 36px;
			min-height: 36px;
			border: 0;
			border-radius: 50%;
			background: color-mix(in srgb, var(--text-primary) 10%, transparent);
			color: var(--text-secondary);
			cursor: pointer;
			touch-action: manipulation;
			-webkit-tap-highlight-color: transparent;
			transition: background 0.15s, color 0.15s, transform 0.15s;
		}
		.close-mobile-btn:hover {
			color: var(--text-primary);
			background: color-mix(in srgb, var(--text-primary) 18%, transparent);
		}
		.close-mobile-btn:active {
			transform: scale(0.9);
		}
	}

.elo-badge { flex: none; max-width: 62%; overflow: hidden; text-overflow: ellipsis; font-size: 0.6rem; padding: 2px 5px; border-radius: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; }
.elo-badge.god { background: linear-gradient(135deg, #ffd700, #b8860b); color: #000; box-shadow: 0 0 8px rgba(255,215,0,0.5); }
.elo-badge.chal { background: linear-gradient(135deg, #ff4500, #8b0000); color: #fff; box-shadow: 0 0 8px rgba(255,69,0,0.4); }
.elo-badge.master { background: linear-gradient(135deg, #4dabf7, #1864ab); color: #fff; box-shadow: 0 0 8px rgba(77,171,247,0.4); }
.elo-badge.initiate { background: linear-gradient(135deg, #00e5ff, #00838f); color: #000; box-shadow: 0 0 8px rgba(0,229,255,0.4); }
.elo-badge.bronze { background: linear-gradient(135deg, #cd7f32, #7a4a1d); color: #fff; box-shadow: 0 0 8px rgba(205,127,50,0.4); }
.stars { margin-left: 3px; font-style: normal; letter-spacing: -1px; }

/* Gradient border via padding-box/border-box layering, so the card keeps its own background. */
.avatar-ring { border-radius: 99px; padding: 0; transition: padding 0.3s ease; }
.avatar-ring.active { padding: 2px; background: var(--ring-bg); background-size: 220% 220%; box-shadow: 0 4px 12px color-mix(in srgb, var(--text-primary) 8%, transparent); }
.avatar-ring.animated { animation: ring-flow 4s linear infinite; }
.rank-name.gradient-text { background: var(--frame); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; background-size: 220% 220%; }
.avatar-ring.animated + .profile-copy .gradient-text { animation: ring-flow 4s linear infinite; }
@keyframes ring-flow {
	0% { background-position: 0% 50%; }
	50% { background-position: 100% 50%; }
	100% { background-position: 0% 50%; }
}
:global(:root[data-reduced-motion='true']) .avatar-ring.animated,
:global(:root[data-reduced-motion='true']) .gradient-text { animation: none !important; }
@media (prefers-reduced-motion: reduce) { 
	.avatar-ring.animated, .gradient-text { animation: none !important; }
}


</style>
