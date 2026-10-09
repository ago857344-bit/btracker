<script lang="ts">
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import { tracker } from '$lib/stores/tracker';
	import { chaptersDueToday } from '$lib/stores/recall-selectors';
	import { currentUser } from '$lib/stores/auth';
	import { getLevelData, tierEloOf } from '$lib/state/gamification';
	import { eloTier } from '$lib/state/weekly';
	import { loadout } from '$lib/stores/cosmetics';

	export let collapsed = false;
	export let mobileOpen = false;

	$: tierElo = Math.round(tierEloOf($tracker.gamification));
	$: tier = eloTier(tierElo);
	$: stars = $loadout.prestige;
	$: frame = $loadout.frame;

	$: xp = $tracker.gamification?.xp || 0;
	$: levelData = getLevelData(xp);

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
		{#each primary as item, i (i)}
			<a class:active={isActive(item.href)} href={item.href} on:click={closeMobile}>
				<span class="nav-icon"><NavIcon name={item.icon} size={22} /></span><span class="nav-text">{item.label}</span>
				{#if item.href === '/revise' && $chaptersDueToday.length}
					<span class="due-badge" title="{$chaptersDueToday.length} chapter(s) due">{$chaptersDueToday.length}</span>
				{/if}
			</a>
		{/each}
		<div class="nav-divider"></div>
		<p class="nav-label">Insights</p>
		{#each secondary as item, i (i)}
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
		<div class="profile-container gamer-card">
			<div class="avatar-ring" class:active={frame} class:animated={frame?.id === 'flame' || frame?.id === 'celestial'} style={frame ? `--ring-bg: linear-gradient(135deg, ${frame.colors?.join(', ')})` : undefined}>
				<AccountMenu />
			</div>
			<span class="profile-copy">
				<div class="user-level-row">
					<b>{$tracker.meta.name || 'My Account'}</b>
					<span class="elo-badge {tier.cls}" title="{tierElo} {stars ? 'season ' : ''}Elo{stars ? ` · Prestige ${stars}` : ''}">{tier.icon} {tier.name}{#if stars}<i class="stars">{stars > 3 ? `★${stars}` : '★'.repeat(stars)}</i>{/if}</span>
				</div>
				<small class="rank-name" class:gradient-text={frame} style={frame ? `--frame: linear-gradient(135deg, ${frame.colors?.join(', ')})` : undefined}>Lv {levelData.level} · {$loadout.title ?? levelData.title}</small>
				<div class="xp-bar" title="{xp} XP / {levelData.nextTierXp} XP">
					<div class="xp-fill" style="width: {levelData.progress}%"></div>
				</div>
			</span>
		</div>
	</div>
</aside>

<style>
	aside { position: fixed; z-index: 20; inset: 0 auto 0 0; display: flex; flex-direction: column; width: clamp(250px, 22vw, 300px); padding: 1.2rem 1rem 1rem; background: var(--surface-panel); border-right: 1px solid var(--border-subtle); transition: width .24s ease, transform .24s ease; overflow-y: auto; overflow-x: hidden; }
	aside::-webkit-scrollbar { display: none; }
	aside { -ms-overflow-style: none; scrollbar-width: none; }
	.brand-row { display: flex; align-items: center; gap: .45rem; min-height: 42px; padding: 0 .25rem .8rem; }
	.brand { display: inline-flex; align-items: center; gap: .65rem; min-width: 0; color: var(--text-primary); text-decoration: none; font-weight: 800; letter-spacing: -.055em; font-size: 1.24rem; }
	.brand-mark { display: grid; place-items: center; flex: 0 0 31px; width: 31px; height: 31px; border-radius: 10px; background: var(--accent); color: white; font-size: 1rem; letter-spacing: -.07em; box-shadow: 0 6px 14px color-mix(in srgb, var(--accent), transparent 65%); }
	.brand-name, .nav-text, .nav-label, .profile-copy { white-space: nowrap; overflow: hidden; transition: opacity .18s ease; }
	.collapse { display: grid; place-items: center; margin-left: auto; width: 30px; height: 30px; border: 0; border-radius: 9px; color: var(--text-secondary); background: transparent; transform: rotate(180deg); } /* Points Left (<) when open */
	.collapse:hover { color: var(--accent); background: var(--accent-soft); }
	nav { display: grid; gap: clamp(0.15rem, 0.4vh, 0.3rem); margin-top: clamp(0.5rem, 1.5vh, 1.15rem); }
	.nav-label { margin: clamp(0.4rem, 1vh, 0.8rem) .65rem clamp(0.2rem, 0.5vh, 0.45rem); color: var(--text-secondary); font-size: .67rem; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
	nav a, .settings-link { display: flex; align-items: center; gap: clamp(0.6rem, 1vw, 1rem); height: clamp(40px, 6vh, 52px); padding: 0 .75rem; border-radius: 12px; color: var(--text-secondary); text-decoration: none; font-size: clamp(0.85rem, 1.2vh, 1rem); font-weight: 650; transition: background .16s ease, color .16s ease; }
	nav a:hover, .settings-link:hover { color: var(--text-primary); background: var(--surface-subtle); }
	nav a.active { color: var(--accent); background: var(--accent-soft); }
	.nav-icon { display: grid; flex: 0 0 24px; place-items: center; }
	.due-badge { margin-left: auto; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 99px; display: grid; place-items: center; background: var(--accent); color: white; font-size: .62rem; font-weight: 800; }
	.nav-divider { height: 1px; margin: clamp(0.5rem, 1.5vh, 1rem) .65rem clamp(0.1rem, 0.3vh, 0.2rem); background: var(--border-subtle); }
	.sidebar-bottom { display: grid; gap: .55rem; margin-top: auto; min-width: 0; }
	.profile-container { min-width: 0; max-width: 100%; padding: .7rem .5rem; border: 1px solid var(--border-subtle); border-radius: 14px; display: flex; align-items: center; gap: .55rem; background: var(--surface-subtle); margin-top: .3rem; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
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
	aside.collapsed :global(.signin span) { width: 0; opacity: 0; overflow: hidden; display: none; }
	aside.collapsed :global(.signin) { justify-content: center; width: 36px; height: 36px; padding: 0; }
	aside.collapsed :global(.signin svg) { margin: 0; }

	
	@media (max-width: 760px) {
		aside { width: min(270px, calc(100vw - 48px)); transform: translateX(-102%); box-shadow: var(--shadow-card); }
		aside.mobile-open { transform: translateX(0); }
		aside.collapsed { width: min(270px, calc(100vw - 48px)); }
		aside.collapsed .brand-name, aside.collapsed .nav-text, aside.collapsed .nav-label, aside.collapsed .profile-copy { width: auto; opacity: 1; }
		aside.collapsed .collapse { position: static; transform: none; border: 0; background: transparent; }
		aside.collapsed nav a, aside.collapsed .settings-link, aside.collapsed .profile-container { justify-content: flex-start; padding-inline: .75rem; }
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
.rank-name.gradient-text { background: var(--frame); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-size: 220% 220%; }
.avatar-ring.animated + .profile-copy .gradient-text { animation: ring-flow 4s linear infinite; }
@keyframes ring-flow {
	0% { background-position: 0% 50%; }
	50% { background-position: 100% 50%; }
	100% { background-position: 0% 50%; }
}
::global(:root[data-reduced-motion='true']) .avatar-ring.animated,
::global(:root[data-reduced-motion='true']) .gradient-text { animation: none !important; }
@media (prefers-reduced-motion: reduce) { 
	.avatar-ring.animated, .gradient-text { animation: none !important; }
}


</style>
