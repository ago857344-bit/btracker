<script lang="ts">
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';

	const tabs = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/log', label: 'Log', icon: 'grid' },
		{ href: '/focus', label: 'Focus', icon: 'focus' },
		{ href: '/todo', label: 'To Do', icon: 'list' },
		{ href: '/settings', label: 'Settings', icon: 'settings' }
	] as const;

	$: isActive = (href: string) => href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
</script>

<nav class="bottom-nav">
	{#each tabs as tab}
		<a href={tab.href} class="tab" class:active={isActive(tab.href)}>
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
			bottom: max(env(safe-area-inset-bottom), 20px);
			left: 50%;
			transform: translateX(-50%);
			width: 94%;
			max-width: 440px;
			height: 68px;
			padding: 0 0.5rem;
			background: color-mix(in srgb, var(--surface-panel), transparent 35%);
			backdrop-filter: var(--glass-filter);
			-webkit-backdrop-filter: var(--glass-filter);
			border-radius: 99px;
			border: 1px solid color-mix(in srgb, rgba(255,255,255,0.4), var(--border-subtle) 80%);
			box-shadow: 0 16px 40px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2);
			z-index: 100;
			justify-content: space-around;
			align-items: center;
		}
		
		.tab {
			-webkit-tap-highlight-color: transparent;
			border-radius: 14px;
			margin: 4px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 5px;
			text-decoration: none;
			color: var(--text-secondary);
			flex: 1;
			transition: color 0.15s ease, transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
		}
		
		.tab:active {
			background: color-mix(in srgb, var(--text-primary), transparent 90%);
			transform: scale(0.9);
		}
		
		.tab.active {
			color: var(--accent);
		}
		
		.icon-wrap {
			display: grid;
			place-items: center;
			transition: transform 0.2s ease;
		}
		
		.tab.active .icon-wrap {
			transform: translateY(-2px);
		}
		
		.label {
			font-size: 0.62rem;
			font-weight: 750;
			letter-spacing: 0.02em;
		}
	}
</style>
