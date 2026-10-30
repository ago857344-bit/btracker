<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { page } from '$app/stores';

	export let onGetStarted: () => void = () => {};

	let mobileOpen = false;

	const links = [
		{ label: 'Method', href: '/welcome#method' },
		{ label: 'System', href: '/system' },
		{ label: 'Stages', href: '/stages' },
		{ label: 'Playbooks', href: '/playbooks' },
		{ label: 'FAQ', href: '/faq' }
	];

	$: pathname = $page.url.pathname;
	$: isMock = $page.url.searchParams.get('mode') === 'mock';
	$: if (pathname) mobileOpen = false;

	function isActive(href: string) {
		if (href === '/playbooks') return pathname === '/playbooks' || pathname.startsWith('/playbooks/');
		if (href === '/stages') return pathname === '/stages';
		if (href === '/faq') return pathname === '/faq';
		if (href === '/system') return pathname === '/system';
		return false;
	}
</script>

<svelte:window
	on:keydown={(event) => {
		if (event.key === 'Escape') mobileOpen = false;
	}}
/>

<a class="skip" href="#site-main">Skip to content</a>

<header class="nav">
	<div class="pill">
		<BrandLogo href="/welcome" size="sm" label="BTracker — home" />

		<nav class="links" aria-label="Main navigation">
			{#each links as link}
				<a
					href={link.href}
					class:on={isActive(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}
					data-sveltekit-preload-data="hover"
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="seg" role="group" aria-label="Product view">
			<span class="seg-pill" class:mock={isMock} aria-hidden="true"></span>
			<a class:on={!isMock} href="/welcome" data-sveltekit-preload-data="hover">Study Tracker</a>
			<a class:on={isMock} href="/welcome?mode=mock" data-sveltekit-preload-data="hover">Mock Engine</a>
		</div>

		<div class="actions">
			<a class="login" href="/login" data-sveltekit-preload-data="hover">Log in</a>
			<button type="button" class="nav-cta" on:click={onGetStarted}>Get started</button>
			<button
				type="button"
				class="burger"
				aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileOpen}
				aria-controls="site-mobile-menu"
				on:click={() => (mobileOpen = !mobileOpen)}
			>
				<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
					{#if mobileOpen}
						<path d="M4 4l12 12M16 4L4 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					{:else}
						<path d="M3 6h14M3 10h14M3 14h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					{/if}
				</svg>
			</button>
		</div>
	</div>

	{#if mobileOpen}
		<nav class="m-sheet" id="site-mobile-menu" aria-label="Mobile navigation">
			<div class="m-seg" role="group" aria-label="Product view">
				<span class="m-seg-pill" class:mock={isMock} aria-hidden="true"></span>
				<a class:on={!isMock} href="/welcome" on:click={() => (mobileOpen = false)}>Study Tracker</a>
				<a class:on={isMock} href="/welcome?mode=mock" on:click={() => (mobileOpen = false)}>Mock Engine</a>
			</div>
			{#each links as link}
				<a
					href={link.href}
					class:on={isActive(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}
					on:click={() => (mobileOpen = false)}
				>
					<span>{link.label}</span>
					<span class="m-sheet-arrow" aria-hidden="true">→</span>
				</a>
			{/each}
			<div class="m-sheet-actions">
				<a class="m-sheet-login" href="/login" on:click={() => (mobileOpen = false)}>Log in</a>
				<button
					type="button"
					class="m-sheet-cta"
					on:click={() => {
						mobileOpen = false;
						onGetStarted();
					}}
				>
					Get started
				</button>
			</div>
		</nav>
	{/if}
</header>

<style>
	.skip {
		position: absolute;
		left: 16px;
		top: -60px;
		z-index: 200;
		padding: 10px 16px;
		border-radius: 999px;
		background: var(--color-forest);
		color: var(--color-cream);
		font-size: 12px;
		font-weight: 600;
		transition: top 0.16s ease;
	}
	.skip:focus-visible {
		top: 14px;
	}

	.nav {
		position: fixed;
		top: max(env(safe-area-inset-top, 0px) + 8px, 16px);
		left: 0;
		right: 0;
		z-index: 80;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 14px;
		pointer-events: none;
	}

	.pill {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 22px;
		max-width: calc(100vw - 28px);
		padding: 8px 10px 8px 14px;
		background: rgba(251, 248, 243, 0.95);
		backdrop-filter: blur(18px) saturate(160%);
		-webkit-backdrop-filter: blur(18px) saturate(160%);
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		box-shadow:
			0 1px 2px rgba(20, 20, 19, 0.04),
			0 10px 30px -18px rgba(20, 20, 19, 0.3);
	}
	.pill :global(.brand-logo) {
		--brand-ink: var(--color-ink);
		--brand-muted: var(--color-muted);
		flex: none;
	}
	.pill :global(.brand-logo .mark) {
		width: 28px;
		height: 28px;
		border-radius: 8px;
		font-size: 15px;
	}

	.links {
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.links a {
		position: relative;
		padding: 7px 11px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--color-muted);
		transition:
			color 0.16s ease,
			background 0.16s ease;
	}
	.links a:hover {
		color: var(--color-ink);
		background: rgba(20, 20, 19, 0.05);
	}
	.links a.on {
		color: var(--color-forest);
		background: var(--color-mint);
		font-weight: 650;
	}

	.seg {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 236px;
		padding: 3px;
		border-radius: 999px;
		background: var(--color-cream-2);
		border: 1px solid var(--color-line);
		flex: none;
	}
	.seg-pill {
		position: absolute;
		top: 3px;
		left: 3px;
		width: calc(50% - 3px);
		height: calc(100% - 6px);
		border-radius: 999px;
		background: var(--color-cream);
		border: 1px solid var(--color-line);
		box-shadow: 0 1px 3px rgba(20, 20, 19, 0.08);
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.seg-pill.mock {
		transform: translateX(100%);
	}
	.seg a {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		min-height: 32px;
		padding: 8px 4px;
		border-radius: 999px;
		font-size: 11.5px;
		font-weight: 600;
		color: var(--color-muted);
		white-space: nowrap;
		transition: color 0.2s ease;
	}
	.seg a:hover,
	.seg a.on {
		color: var(--color-ink);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: none;
	}
	.login {
		padding: 8px 10px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--color-muted);
	}
	.login:hover {
		color: var(--color-ink);
	}
	.nav-cta {
		display: inline-flex;
		align-items: center;
		min-height: 38px;
		padding: 0 16px;
		border-radius: 999px;
		background: var(--color-forest);
		color: var(--color-cream);
		border: 1px solid var(--color-forest);
		font-family: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
		transition:
			background 0.18s ease,
			transform 0.18s ease;
	}
	.actions .nav-cta:hover:not(:disabled) {
		background: var(--color-forest-2);
		transform: translateY(-1px);
		box-shadow: none !important;
	}

	.burger {
		display: none;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid var(--color-line);
		background: transparent;
		color: var(--color-ink);
		cursor: pointer;
	}

	.m-sheet {
		pointer-events: auto;
		width: min(420px, calc(100vw - 28px));
		margin-top: 8px;
		padding: 10px;
		background: var(--color-cream);
		border: 1px solid var(--color-line);
		border-radius: 24px;
		box-shadow: 0 24px 60px -24px rgba(20, 20, 19, 0.4);
	}
	.m-sheet > a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 13px 14px;
		border-radius: 14px;
		font-size: 14px;
		font-weight: 550;
		color: var(--color-muted);
	}
	.m-sheet > a:hover,
	.m-sheet > a.on {
		color: var(--color-ink);
		background: rgba(20, 20, 19, 0.045);
	}
	.m-sheet > a.on {
		background: var(--color-mint);
		color: var(--color-forest);
	}
	.m-seg {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 3px;
		margin: 2px 0 6px;
		border-radius: 999px;
		background: var(--color-cream-2);
		border: 1px solid var(--color-line);
	}
	.m-seg-pill {
		position: absolute;
		top: 3px;
		left: 3px;
		width: calc(50% - 3px);
		height: calc(100% - 6px);
		border-radius: 999px;
		background: var(--color-cream);
		border: 1px solid var(--color-line);
		box-shadow: 0 1px 3px rgba(20, 20, 19, 0.08);
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.m-seg-pill.mock {
		transform: translateX(100%);
	}
	.m-seg a {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		min-height: 38px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-muted);
	}
	.m-seg a.on {
		color: var(--color-ink);
	}
	.m-sheet-arrow {
		font-size: 13px;
		opacity: 0.5;
	}
	.m-sheet-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-top: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--color-line);
	}
	.m-sheet-login,
	.m-sheet-cta {
		display: grid;
		place-items: center;
		min-height: 42px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 650;
	}
	.m-sheet-login {
		border: 1px solid var(--color-line);
		color: var(--color-ink);
	}
	.m-sheet-cta {
		background: var(--color-forest);
		color: var(--color-cream);
		border: 1px solid var(--color-forest);
		font-family: inherit;
		cursor: pointer;
	}
	.m-sheet-actions .m-sheet-cta:hover:not(:disabled) {
		background: var(--color-forest-2);
		box-shadow: none !important;
	}

	@media (max-width: 1120px) {
		.links {
			display: none;
		}
		.burger {
			display: inline-flex;
		}
	}
	@media (max-width: 900px) {
		.pill {
			gap: 12px;
		}
		.login {
			display: none;
		}
	}
	@media (max-width: 768px) {
		.nav {
			top: max(env(safe-area-inset-top, 0px) + 6px, 12px);
			padding: 0 12px;
		}
		.pill {
			width: 100%;
			justify-content: space-between;
			background: #fbf8f3 !important;
			backdrop-filter: none !important;
			-webkit-backdrop-filter: none !important;
			-webkit-transform: translateZ(0);
			transform: translateZ(0);
			-webkit-font-smoothing: antialiased;
			-moz-osx-font-smoothing: grayscale;
			border: 1px solid var(--color-line) !important;
			box-shadow: 0 4px 18px -4px rgba(20, 20, 19, 0.14), 0 1px 2px rgba(20, 20, 19, 0.04) !important;
		}
		.m-sheet {
			width: min(420px, calc(100vw - 24px));
		}
	}
	@media (max-width: 640px) {
		.seg {
			display: none;
		}
	}
	@media (max-width: 480px) {
		.nav-cta {
			display: none;
		}
	}
</style>
