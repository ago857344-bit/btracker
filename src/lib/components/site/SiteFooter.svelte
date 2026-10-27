<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';

	export let onGetStarted: () => void = () => {};

	type FooterLink = { label: string; href?: string; getStarted?: boolean };

	const columns: { title: string; links: FooterLink[] }[] = [
		{
			title: 'Product',
			links: [
				{ label: 'The method', href: '/welcome#method' },
				{ label: 'The system', href: '/system' },
				{ label: 'Stages', href: '/stages' },
				{ label: 'Study playbooks', href: '/playbooks' },
				{ label: 'FAQ', href: '/faq' },
				{ label: 'Dark Mode SaaS', href: '/landing' }
			]
		},
		{
			title: 'Learn',
			links: [
				{ label: 'Study guides', href: '/guides' },
				{ label: 'JEE goals', href: '/goals' },
				{ label: 'Revision playbook', href: '/playbooks/spaced-revision-engine' },
				{ label: 'Mock post-mortem', href: '/playbooks/mock-post-mortem' }
			]
		},
		{
			title: 'Account',
			links: [
				{ label: 'Log in', href: '/login' },
				{ label: 'Get started', getStarted: true },
				{ label: 'Open tracker', href: '/' }
			]
		}
	];
</script>

<footer class="foot">
	<div class="site-wrap">
		<div class="foot-top">
			<div class="foot-brand">
				<BrandLogo href="/welcome" size="md" subtitle="JEE Study OS" label="BTracker — home" />
				<p>
					The free study tracker for JEE aspirants. Log questions, revise on a schedule, and keep
					your preparation accountable — all in one place.
				</p>
				<p class="foot-note">100% free · No card · No trial clock</p>
			</div>

			<nav class="foot-map" aria-label="Sitemap">
				{#each columns as column}
					<div class="foot-col">
						<p class="site-mono">{column.title}</p>
						<ul>
							{#each column.links as link}
								<li>
									{#if link.getStarted}
										<button type="button" class="foot-action" on:click={onGetStarted}>
											{link.label}
										</button>
									{:else}
										<a href={link.href} data-sveltekit-preload-data="hover">{link.label}</a>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>
		</div>

		<div class="wordmark" aria-hidden="true"><span>BTRACKER</span></div>

		<div class="foot-base">
			<span>Built for JEE aspirants</span>
			<span>Made to be used daily</span>
			<span>© {new Date().getFullYear()} BTracker</span>
		</div>
	</div>
</footer>

<style>
	.foot {
		margin-top: clamp(56px, 9vw, 110px);
		background: var(--color-cream-3);
		overflow: clip;
	}

	.foot-top {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.35fr);
		gap: clamp(32px, 5vw, 80px);
		padding: clamp(42px, 6vw, 76px) 0 36px;
	}

	.foot-brand {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 16px;
	}
	.foot-brand :global(.brand-logo) {
		--brand-ink: var(--color-ink);
		--brand-muted: var(--color-muted);
	}
	.foot-brand p {
		margin: 0;
		max-width: 34ch;
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.foot-note {
		font-family: var(--font-mono);
		font-size: 9px !important;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-forest) !important;
	}

	.foot-map {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}
	.foot-col ul {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.foot-col a,
	.foot-col .foot-action {
		font-size: 13px;
		color: var(--color-ink);
		transition: color 0.15s ease;
	}
	.foot-col .foot-action {
		padding: 0;
		border: 0;
		background: none;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}
	.foot-col a:hover,
	.foot-col .foot-action:hover:not(:disabled) {
		color: var(--color-forest);
		text-decoration: underline;
		text-underline-offset: 4px;
		text-decoration-thickness: 1px;
		transform: none !important;
		box-shadow: none !important;
	}
	.foot-col .foot-action:active:not(:disabled) {
		transform: none !important;
		opacity: 1 !important;
	}

	.wordmark {
		width: 100%;
		max-width: 100%;
		margin-left: 0;
		overflow: hidden;
		line-height: 0;
	}
	.wordmark span {
		display: block;
		padding-top: 0.04em;
		font-family: var(--font-serif);
		font-size: clamp(4.6rem, 18.6vw, 19rem);
		line-height: 0.78;
		letter-spacing: -0.045em;
		text-align: center;
		white-space: nowrap;
		color: var(--color-forest);
	}

	.foot-base {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 18px;
		padding: 20px 0 26px;
		border-top: 1px solid var(--color-line);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	@media (max-width: 860px) {
		.foot-top {
			grid-template-columns: minmax(0, 1fr);
			gap: 34px;
		}
	}

	@media (max-width: 560px) {
		.foot-map {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 26px 18px;
		}
		.foot-base {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
		}
	}
</style>
