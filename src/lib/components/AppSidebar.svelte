<script lang="ts">
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import { tracker } from '$lib/stores/tracker';
	import { chaptersDueToday } from '$lib/stores/recall-selectors';
	import { currentUser } from '$lib/stores/auth';

	export let collapsed = false;
	export let mobileOpen = false;

	const primary = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/log', label: 'Log', icon: 'grid' },
		{ href: '/review', label: 'Review', icon: 'target' },
		{ href: '/plan', label: 'Plan', icon: 'plan' },
		{ href: '/tests', label: 'Tests', icon: 'tests' },
		{ href: '/todo', label: 'To Do', icon: 'list' },
		{ href: '/focus', label: 'Focus', icon: 'focus' },
		{ href: '/revise', label: 'Revise', icon: 'revise' }
	] as const;
	const secondary = [
		{ href: '/stats', label: 'Stats', icon: 'stats' },
		{ href: '/reminders', label: 'Reminders', icon: 'reminders' }
	] as const;

	const isActive = (href: string) => href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
	const closeMobile = () => mobileOpen = false;

	function handleToggle() {
		if (typeof window !== 'undefined' && window.innerWidth <= 760) {
			mobileOpen = false;
		} else {
			collapsed = !collapsed;
		}
	}
</script>

<aside class="glass" class:collapsed class:mobile-open={mobileOpen} aria-label="Primary navigation">
	<div class="brand-row">
		<a class="brand" href="/" aria-label="BTracker home" on:click={closeMobile}>
			<span class="brand-mark">B</span>
			<span class="brand-name">btracker</span>
		</a>
		<button class="collapse" type="button" on:click={handleToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			<NavIcon name="chevron" size={18} />
		</button>
	</div>

	<nav>
		<p class="nav-label">Workspace</p>
		{#each primary as item}
			<a class:active={isActive(item.href)} href={item.href} on:click={closeMobile}>
				<span class="nav-icon"><NavIcon name={item.icon} size={22} /></span><span class="nav-text">{item.label}</span>
				{#if item.href === '/revise' && $chaptersDueToday.length}
					<span class="due-badge" title="{$chaptersDueToday.length} chapter(s) due">{$chaptersDueToday.length}</span>
				{/if}
			</a>
		{/each}
		<div class="nav-divider"></div>
		<p class="nav-label">Insights</p>
		{#each secondary as item}
			<a class:active={isActive(item.href)} href={item.href} on:click={closeMobile}>
				<span class="nav-icon"><NavIcon name={item.icon} size={22} /></span><span class="nav-text">{item.label}</span>
				{#if item.href === '/reminders' && $chaptersDueToday.length}
					<span class="due-badge" title="{$chaptersDueToday.length} revision(s) due">{$chaptersDueToday.length}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="sidebar-bottom">
		<a class="settings-link" href="/settings" on:click={closeMobile}>
			<span class="nav-icon"><NavIcon name="settings" size={22} /></span><span class="nav-text">Settings</span>
		</a>
		<div class="profile-container">
			<AccountMenu />
			<span class="profile-copy">
				<b>{$tracker.meta.name || 'My Account'}</b>
				<small>{$currentUser?.email || 'Local workspace'}</small>
			</span>
		</div>
	</div>
</aside>

<style>
	aside { position: fixed; z-index: 20; inset: 0 auto 0 0; display: flex; flex-direction: column; width: 300px; padding: 1.2rem 1rem 1rem; background: var(--surface-panel); border-right: 1px solid var(--border-subtle); transition: width .24s ease, transform .24s ease; }
	.brand-row { display: flex; align-items: center; gap: .45rem; min-height: 42px; padding: 0 .25rem .8rem; }
	.brand { display: inline-flex; align-items: center; gap: .65rem; min-width: 0; color: var(--text-primary); text-decoration: none; font-weight: 800; letter-spacing: -.055em; font-size: 1.24rem; }
	.brand-mark { display: grid; place-items: center; flex: 0 0 31px; width: 31px; height: 31px; border-radius: 10px; background: var(--accent); color: white; font-size: 1rem; letter-spacing: -.07em; box-shadow: 0 6px 14px color-mix(in srgb, var(--accent), transparent 65%); }
	.brand-name, .nav-text, .nav-label, .profile-copy { white-space: nowrap; overflow: hidden; transition: opacity .18s ease; }
	.collapse { display: grid; place-items: center; margin-left: auto; width: 30px; height: 30px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; transform: rotate(180deg); } /* Points Left (<) when open */
	.collapse:hover { color: var(--accent); background: var(--accent-soft); }
	nav { display: grid; gap: .3rem; margin-top: 1.15rem; }
	.nav-label { margin: .8rem .65rem .45rem; color: var(--text-secondary); font-size: .67rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
	nav a, .settings-link { display: flex; align-items: center; gap: 1rem; height: 52px; padding: 0 .75rem; border-radius: 12px; color: var(--text-secondary); text-decoration: none; font-size: 1rem; font-weight: 650; transition: background .16s ease, color .16s ease; }
	nav a:hover, .settings-link:hover { color: var(--text-primary); background: var(--surface-subtle); }
	nav a.active { color: var(--accent); background: var(--accent-soft); }
	.nav-icon { display: grid; flex: 0 0 24px; place-items: center; }
	.due-badge { margin-left: auto; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 99px; display: grid; place-items: center; background: var(--accent); color: white; font-size: .62rem; font-weight: 800; }
	.nav-divider { height: 1px; margin: 1rem .65rem .2rem; background: var(--border-subtle); }
	.sidebar-bottom { display: grid; gap: .55rem; margin-top: auto; }
	.profile-container { padding: .65rem .55rem .15rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: .7rem; }
	.profile-copy { display: grid; gap: .08rem; min-width: 0; font-size: .77rem; }
	.profile-copy small { color: var(--text-secondary); font-size: .67rem; text-overflow: ellipsis; overflow: hidden; }
	
	aside.collapsed { width: 76px; }
	aside.collapsed .brand-name, aside.collapsed .nav-text, aside.collapsed .nav-label, aside.collapsed .profile-copy { width: 0; opacity: 0; }
	aside.collapsed .brand-row { justify-content: center; padding-inline: 0; }
	aside.collapsed .brand { gap: 0; }
	aside.collapsed .collapse { position: absolute; right: -12px; top: 24px; width: 24px; height: 24px; border: 1px solid var(--border-subtle); background: var(--surface-panel); transform: rotate(0deg); } /* Points Right (>) when closed */
	aside.collapsed nav a, aside.collapsed .settings-link { justify-content: center; padding-inline: 0; gap: 0; }
	aside.collapsed .nav-divider { margin-inline: .3rem; }
	aside.collapsed .profile-container { justify-content: center; padding-inline: 0; }
	aside.collapsed :global(.signin span) { width: 0; opacity: 0; overflow: hidden; display: none; }
	aside.collapsed :global(.signin) { justify-content: center; width: 36px; height: 36px; padding: 0; }
	aside.collapsed :global(.signin svg) { margin: 0; }

	
	@media (max-width: 760px) {
		aside { width: 270px; transform: translateX(-102%); box-shadow: var(--shadow-card); }
		aside.mobile-open { transform: translateX(0); }
		aside.collapsed { width: 270px; }
		aside.collapsed .brand-name, aside.collapsed .nav-text, aside.collapsed .nav-label, aside.collapsed .profile-copy { width: auto; opacity: 1; }
		aside.collapsed .collapse { position: static; transform: none; border: 0; background: transparent; }
		aside.collapsed nav a, aside.collapsed .settings-link, aside.collapsed .profile-container { justify-content: flex-start; padding-inline: .75rem; }
	}
</style>
