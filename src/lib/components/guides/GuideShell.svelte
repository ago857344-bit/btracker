<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import StudyGoalsMenu from '$lib/components/goals/StudyGoalsMenu.svelte';
	import StudyGuidesMenu from '$lib/components/guides/StudyGuidesMenu.svelte';
	import { guideCategories } from '$lib/content/guides';

	let mobileOpen = false;

	const navLinks = [
		{ label: 'Features', href: '/welcome#features' },
		{ label: 'Study Goals', href: '/goals' },
		{ label: 'Study Guides', href: '/guides' },
		{ label: 'Free', href: '/welcome#free' },
		{ label: 'Why BTracker', href: '/welcome#why-us' }
	];

	function closeMobile() {
		mobileOpen = false;
	}
</script>

<svelte:window
	on:keydown={(event) => {
		if (event.key === 'Escape') mobileOpen = false;
	}}
/>

<div class="gx">
	<header class="nav">
		<div class="nav-inner">
			<BrandLogo href="/welcome" label="BTracker — home" subtitle="JEE Study OS" />

			<nav class="nav-links" aria-label="Main navigation">
				{#each navLinks as link}
					{#if link.href === '/goals'}
						<StudyGoalsMenu />
					{:else if link.href === '/guides'}
						<StudyGuidesMenu />
					{:else}
						<a href={link.href}>{link.label}</a>
					{/if}
				{/each}
			</nav>

			<div class="nav-actions">
				<a class="login" href="/login">Log in</a>
				<a class="cta" href="/login">Create account <NavIcon name="arrow-right" size={14} /></a>
				<button
					type="button"
					class="menu-btn"
					aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={mobileOpen}
					on:click={() => (mobileOpen = !mobileOpen)}
				>
					<NavIcon name={mobileOpen ? 'x' : 'menu'} size={19} />
				</button>
			</div>
		</div>

		{#if mobileOpen}
			<div class="mobile-menu">
				{#each navLinks as link}
					<a href={link.href} on:click={closeMobile}>{link.label}</a>
				{/each}
				<div class="mobile-actions">
					<a class="gx-btn gx-btn-light" href="/login" on:click={closeMobile}>Log in</a>
					<a class="gx-btn gx-btn-dark" href="/login" on:click={closeMobile}>
						Create account <NavIcon name="arrow-right" size={14} />
					</a>
				</div>
				<p class="mobile-free"><i></i> Free forever · Every feature · No card</p>
			</div>
		{/if}
	</header>

	<main>
		<slot />
	</main>

	<footer class="foot">
		<div class="gx-container">
			<div class="foot-top">
				<div class="foot-brand">
					<BrandLogo href="/welcome" label="BTracker — home" subtitle="JEE Study OS" />
					<p>Free study command center for JEE aspirants. Log every question, revise what leaks marks, and walk into the next test with a plan.</p>
					<span class="foot-badge"><i></i> Every feature included · No card · No trial</span>
				</div>

				<div class="foot-cols">
					<div>
						<b>Product</b>
						<a href="/welcome#features">Features</a>
						<a href="/goals">Study goals</a>
						<a href="/welcome#free">Free forever</a>
						<a href="/welcome#why-us">Why BTracker</a>
						<a href="/login">Start tracking</a>
					</div>
					<div>
						<b>Study guides</b>
						{#each guideCategories as category}
							<a href={`/guides#${category.id}`}>{category.label}</a>
						{/each}
						<a href="/guides">All guides</a>
					</div>
					<div>
						<b>Account</b>
						<a href="/login">Log in</a>
						<a href="/login">Create account</a>
						<a href="/welcome">Landing page</a>
					</div>
				</div>
			</div>

			<div class="foot-bottom">
				<span>© 2026 BTracker. Made in India for JEE aspirants.</span>
				<span>100% free · Cloud sync · Google sign-in</span>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: 96px;
	}

	:global(.gx-container) {
		width: 100%;
		max-width: 1120px;
		margin: 0 auto;
		padding: 0 24px;
	}

	:global(.gx-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1px solid transparent;
		border-radius: 999px;
		font-family: inherit;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
		text-decoration: none;
		cursor: pointer;
		transition:
			transform 0.22s var(--ease),
			box-shadow 0.22s,
			background 0.22s,
			color 0.22s;
	}

	:global(.gx-btn-dark) {
		padding: 12px 20px;
		background: #0b1220;
		color: #fff;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.14),
			0 8px 18px -10px rgba(15, 23, 42, 0.6);
	}

	:global(.gx-btn-dark:hover) {
		transform: translateY(-2px);
		background: #111b31;
		box-shadow: 0 16px 28px -14px rgba(15, 23, 42, 0.55);
	}

	:global(.gx-btn-light) {
		padding: 11px 20px;
		border-color: var(--line);
		background: #fff;
		color: var(--ink);
		box-shadow: 0 6px 16px -12px rgba(15, 23, 42, 0.4);
	}

	:global(.gx-btn-light:hover) {
		transform: translateY(-2px);
		background: var(--soft);
	}

	:global(.gx-btn-lg) {
		padding: 15px 25px;
		font-size: 15px;
	}

	.gx {
		--brand: #0066ff;
		--brand-700: #0052d4;
		--brand-50: #eff6ff;
		--brand-100: #dbeafe;
		--ink: #0f172a;
		--slate: #475569;
		--muted: #64748b;
		--line: #e2e8f0;
		--soft: #f8fafc;
		--soft2: #f1f5f9;
		--green: #0b9b6a;
		--violet: #7c3aed;
		--ease: cubic-bezier(0.22, 1, 0.36, 1);
		position: relative;
		min-height: 100vh;
		overflow-x: clip;
		background: #fff;
		color: var(--slate);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 16px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
	}

	.gx *,
	.gx *::before,
	.gx *::after {
		box-sizing: border-box;
	}

	.gx p {
		margin: 0;
	}

	.gx a {
		text-decoration: none;
	}

	.nav {
		position: sticky;
		top: 0;
		z-index: 60;
		border-bottom: 1px solid rgba(226, 232, 240, 0.8);
		background: #fff;
	}

	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 22px;
		width: 100%;
		max-width: 1200px;
		height: 74px;
		margin: 0 auto;
		padding: 0 24px;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.nav-links > a {
		display: inline-flex;
		align-items: center;
		padding: 9px 13px;
		border-radius: 999px;
		color: #3f4b5f;
		font-size: 14px;
		font-weight: 600;
		transition:
			color 0.18s,
			background 0.18s;
	}

	.nav-links > a:hover {
		color: var(--ink);
		background: var(--soft2);
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.login {
		padding: 10px 13px;
		border-radius: 999px;
		color: var(--ink);
		font-size: 14px;
		font-weight: 650;
	}

	.login:hover {
		background: var(--soft2);
	}

	.cta {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 18px;
		border-radius: 999px;
		background: #0b1220;
		color: #fff;
		font-size: 13.5px;
		font-weight: 700;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.14),
			0 8px 18px -10px rgba(15, 23, 42, 0.6);
		transition:
			transform 0.2s var(--ease),
			background 0.2s,
			box-shadow 0.2s;
	}

	.cta:hover {
		transform: translateY(-1px);
		background: #111b31;
		box-shadow: 0 14px 24px -14px rgba(15, 23, 42, 0.55);
	}

	.menu-btn {
		display: none;
		place-items: center;
		width: 38px;
		height: 38px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: #fff;
		color: var(--ink);
		cursor: pointer;
	}

	.mobile-menu {
		display: none;
		padding: 10px 24px 20px;
		border-top: 1px solid #edf1f7;
		background: #fff;
	}

	.mobile-menu > a {
		display: block;
		padding: 12px 4px;
		border-bottom: 1px solid #f1f5f9;
		color: var(--ink);
		font-size: 15px;
		font-weight: 600;
	}

	.mobile-actions {
		display: flex;
		gap: 10px;
		margin-top: 16px;
	}

	.mobile-actions > * {
		flex: 1;
	}

	.mobile-free {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		margin-top: 14px;
		color: var(--muted);
		font-size: 11px;
		font-weight: 600;
	}

	.mobile-free i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
	}

	.foot {
		padding: 56px 0 26px;
		border-top: 1px solid var(--line);
		background: #fbfdff;
	}

	.foot-top {
		display: grid;
		grid-template-columns: 1.15fr 1.4fr;
		gap: 56px;
		padding-bottom: 38px;
	}

	.foot-brand p {
		max-width: 340px;
		margin-top: 16px;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.6;
	}

	.foot-badge {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-top: 16px;
		padding: 6px 10px;
		border: 1px solid #d9f0e4;
		border-radius: 999px;
		background: #f2fcf7;
		color: #0b7a55;
		font-size: 10px;
		font-weight: 750;
	}

	.foot-badge i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
	}

	.foot-cols {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}

	.foot-cols > div {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.foot-cols b {
		margin-bottom: 3px;
		color: var(--ink);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.foot-cols a {
		color: var(--muted);
		font-size: 12.5px;
		font-weight: 500;
		transition: color 0.16s;
	}

	.foot-cols a:hover {
		color: var(--brand-700);
	}

	.foot-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-top: 20px;
		border-top: 1px solid #eef2f7;
		color: #94a3b8;
		font-size: 11px;
	}

	@media (max-width: 1080px) {
		.nav-links {
			display: none;
		}

		.menu-btn {
			display: grid;
		}

		.mobile-menu {
			display: block;
		}
	}

	@media (max-width: 860px) {
		.foot-top {
			grid-template-columns: 1fr;
			gap: 34px;
		}
	}

	@media (max-width: 620px) {
		.nav-inner {
			height: 66px;
			padding: 0 18px;
		}

		.login {
			display: none;
		}

		.cta {
			padding: 10px 14px;
			font-size: 12.5px;
		}

		.foot {
			padding-top: 42px;
		}

		.foot-cols {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 26px 20px;
		}

		.foot-bottom {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
		}
	}
</style>
