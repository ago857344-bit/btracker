<script lang="ts">
	import { categories, playbooks, type PlaybookCategoryId } from '$lib/content/playbooks';

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/playbooks`;

	type Filter = PlaybookCategoryId | 'all';
	let active: Filter = 'all';

	$: filtered = active === 'all' ? playbooks : playbooks.filter((playbook) => playbook.category === active);

	function countFor(id: Filter) {
		return id === 'all' ? playbooks.length : playbooks.filter((playbook) => playbook.category === id).length;
	}

	const collectionLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: 'BTracker Study Playbooks',
		description:
			'Practical study systems for JEE preparation: spaced revision, mock post-mortems, attempt order, and time blocks.',
		url: pageUrl,
		isPartOf: { '@type': 'WebSite', name: 'BTracker', url: origin },
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: playbooks.map((playbook, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: playbook.title,
				url: `${origin}/playbooks/${playbook.slug}`
			}))
		}
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'Playbooks', item: pageUrl }
		]
	};
</script>

<svelte:head>
	<title>Study Playbooks for JEE — Revision, Mocks &amp; Time Blocks | BTracker</title>
	<meta
		name="description"
		content="Six practical playbooks for JEE preparation: spaced revision schedules, mock post-mortems, attempt order, and study blocks. Free, no sign-up required to read."
	/>
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content="Study Playbooks for JEE — BTracker" />
	<meta
		property="og:description"
		content="Six practical systems for revision, mocks, and daily study blocks. Written to be used, not just read."
	/>
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Study Playbooks for JEE — BTracker" />
	<meta
		name="twitter:description"
		content="Six practical systems for revision, mocks, and daily study blocks."
	/>
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(collectionLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<div class="index mx-auto w-[min(1180px,92vw)]">
	<section class="pb-hero">
		<p class="site-mono">Playbooks / Study systems</p>
		<div class="pb-hero-grid">
			<h1 class="site-serif">Methods that<br /><em>survive</em> a real week.</h1>
			<div class="pb-hero-note">
				<p>
					No productivity theatre. Each playbook is a small, repeatable system for the parts of JEE
					preparation that are easy to start and hard to keep: revision, mocks, and the shape of a
					normal study day.
				</p>
				<ul class="pb-hero-stats">
					<li><strong>{playbooks.length}</strong><span>playbooks</span></li>
					<li><strong>{categories.length}</strong><span>categories</span></li>
					<li><strong>0</strong><span>paywalls</span></li>
				</ul>
			</div>
		</div>
	</section>

	<section class="library" aria-labelledby="library-heading">
		<div class="library-head">
			<h2 id="library-heading" class="site-serif">The library</h2>
			<div class="filters" role="group" aria-label="Filter playbooks by category">
				<button
					type="button"
					class:on={active === 'all'}
					aria-pressed={active === 'all'}
					on:click={() => (active = 'all')}
				>
					All <span>{countFor('all')}</span>
				</button>
				{#each categories as category}
					<button
						type="button"
						class:on={active === category.id}
						aria-pressed={active === category.id}
						on:click={() => (active = category.id)}
					>
						{category.label} <span>{countFor(category.id)}</span>
					</button>
				{/each}
			</div>
		</div>

		<p class="filter-note" aria-live="polite">
			{#if active === 'all'}
				Showing all {playbooks.length} playbooks
			{:else}
				Showing {filtered.length} {filtered.length === 1 ? 'playbook' : 'playbooks'} in
				{categories.find((category) => category.id === active)?.label}
			{/if}
		</p>

		<div class="pb-cards">
			{#each filtered as playbook, index}
				<article class="pb-card" data-category={playbook.category}>
					<div class="pb-card-top">
						<span class="tag">{categories.find((category) => category.id === playbook.category)?.label}</span>
						<span class="num">{String(index + 1).padStart(2, '0')}</span>
					</div>
					<h3 class="site-serif">
						<a href={`/playbooks/${playbook.slug}`} data-sveltekit-preload-data="hover">{playbook.menuTitle}</a>
					</h3>
					<p>{playbook.description}</p>
					<div class="pb-card-foot">
						<span>{playbook.readTime} min read · {playbook.level}</span>
						<a
							class="pb-card-link"
							href={`/playbooks/${playbook.slug}`}
							aria-label={`Read ${playbook.title}`}
							data-sveltekit-preload-data="hover"
						>
							Read
							<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
								<path
									d="M2 8h11M9 4l4 4-4 4"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</a>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="closing">
		<div class="closing-inner">
			<p class="site-mono">From page to practice</p>
			<h2 class="site-serif">Reading is the easy part.<br /><em>The tracker makes it default.</em></h2>
			<p>
				Log a question and BTracker builds the revision queue, keeps the error history, and shows you
				whether the method is actually working. Free, with no card and no trial clock.
			</p>
			<div class="closing-actions">
				<a class="btn-solid" href="/login" data-sveltekit-preload-data="hover">Open the tracker</a>
				<a class="btn-ghost" href="/stages" data-sveltekit-preload-data="hover">Find your stage strategy</a>
			</div>
		</div>
	</section>
</div>

<style>
	.index {
		padding-bottom: clamp(20px, 4vw, 40px);
	}

	.pb-hero {
		padding: clamp(28px, 5vw, 64px) 0 clamp(30px, 4vw, 54px);
		border-bottom: 1px solid var(--color-line);
	}
	.pb-hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.9fr);
		gap: clamp(24px, 5vw, 70px);
		align-items: end;
		margin-top: 16px;
	}
	h1 {
		margin: 0;
		font-size: clamp(3rem, 7.4vw, 6.1rem);
		color: var(--color-forest);
		text-wrap: balance;
	}
	h1 em {
		font-style: italic;
	}
	.pb-hero-note {
		padding-bottom: 8px;
	}
	.pb-hero-note p {
		margin: 0;
		max-width: 44ch;
		font-size: 14.5px;
		line-height: 1.65;
		color: var(--color-muted);
	}
	.pb-hero-stats {
		display: flex;
		gap: 26px;
		margin: 26px 0 0;
		padding: 18px 0 0;
		border-top: 1px solid var(--color-line);
		list-style: none;
	}
	.pb-hero-stats li {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.pb-hero-stats strong {
		font-family: var(--font-serif);
		font-size: 1.7rem;
		font-weight: 400;
		line-height: 1;
		color: var(--color-forest);
	}
	.pb-hero-stats span {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.library {
		padding: clamp(34px, 5vw, 62px) 0 0;
	}
	.library-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 18px;
	}
	h2 {
		margin: 0;
		font-size: clamp(1.7rem, 3vw, 2.3rem);
		color: var(--color-forest);
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 5px;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: var(--color-cream-2);
	}
	.filters button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 14px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.18s ease, color 0.18s ease;
	}
	.filters button span {
		font-family: var(--font-mono);
		font-size: 9px;
		opacity: 0.7;
	}
	.filters button:hover {
		color: var(--color-forest);
	}
	.filters button.on {
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.filter-note {
		margin: 14px 0 20px;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.pb-cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
	}
	.pb-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 24px 24px 20px;
		border: 1px solid var(--color-line);
		border-radius: 22px;
		background: var(--color-cream-2);
		transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, border-color 0.25s ease;
	}
	.pb-card[data-category='revision'] {
		background: color-mix(in srgb, var(--color-mint) 62%, var(--color-cream));
	}
	.pb-card[data-category='mock-strategy'] {
		background: color-mix(in srgb, var(--color-peach) 58%, var(--color-cream));
	}
	.pb-card[data-category='time-blocks'] {
		background: color-mix(in srgb, var(--color-butter) 72%, var(--color-cream));
	}
	.pb-card:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--color-forest) 28%, transparent);
		box-shadow: 0 18px 40px -26px rgba(15, 46, 32, 0.55);
	}
	.pb-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--color-forest);
	}
	.num {
		font-family: var(--font-mono);
		font-size: 9px;
		color: color-mix(in srgb, var(--color-forest) 40%, transparent);
	}
	.pb-card h3 {
		margin: 4px 0 0;
		font-size: clamp(1.55rem, 2.5vw, 1.95rem);
		line-height: 1;
		color: var(--color-forest);
	}
	.pb-card h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
	.pb-card p {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.pb-card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: auto;
		padding-top: 16px;
		border-top: 1px solid color-mix(in srgb, var(--color-forest) 13%, transparent);
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 68%, transparent);
	}
	.pb-card-link {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.01em;
		text-transform: none;
		color: var(--color-forest);
	}
	.pb-card-link svg {
		transition: transform 0.2s ease;
	}
	.pb-card:hover .pb-card-link svg {
		transform: translateX(3px);
	}

	.closing {
		margin-top: clamp(46px, 7vw, 86px);
		padding: clamp(34px, 5vw, 58px);
		border-radius: 30px;
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.closing-inner {
		max-width: 660px;
	}
	.closing :global(.site-mono) {
		color: color-mix(in srgb, var(--color-cream) 55%, transparent);
	}
	.closing h2 {
		margin: 14px 0 16px;
		font-size: clamp(2rem, 4.2vw, 3.3rem);
		color: var(--color-cream);
		line-height: 0.98;
	}
	.closing h2 em {
		color: var(--color-mint);
	}
	.closing p {
		margin: 0;
		max-width: 50ch;
		font-size: 13.5px;
		line-height: 1.65;
		color: color-mix(in srgb, var(--color-cream) 72%, transparent);
	}
	.closing-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
	}
	.btn-solid,
	.btn-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 42px;
		padding: 0 20px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 650;
		transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
	}
	.btn-solid {
		background: var(--color-cream);
		color: var(--color-forest);
	}
	.btn-solid:hover {
		transform: translateY(-1px);
		background: #ffffff;
	}
	.btn-ghost {
		border: 1px solid color-mix(in srgb, var(--color-cream) 30%, transparent);
		color: var(--color-cream);
	}
	.btn-ghost:hover {
		border-color: color-mix(in srgb, var(--color-cream) 60%, transparent);
		transform: translateY(-1px);
	}

	@media (max-width: 1000px) {
		.pb-cards {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 860px) {
		.pb-hero-grid {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
			gap: 22px;
		}
	}
	@media (max-width: 680px) {
		.pb-cards {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 560px) {
		.pb-hero-stats {
			gap: 20px;
		}
		.library-head {
			align-items: flex-start;
			flex-direction: column;
		}
		.filters {
			width: 100%;
			flex-wrap: wrap;
			border-radius: 16px;
		}
		.filters button {
			flex: 1 1 calc(50% - 3px);
			justify-content: center;
		}
		.pb-card {
			padding: 21px 20px 18px;
			border-radius: 18px;
		}
		.closing {
			border-radius: 22px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pb-card,
		.pb-card-link svg,
		.btn-solid,
		.btn-ghost {
			transition: none;
		}
	}
</style>
