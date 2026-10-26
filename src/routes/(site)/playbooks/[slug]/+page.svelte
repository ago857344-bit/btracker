<script lang="ts">
	import { onMount } from 'svelte';
	import type { Playbook, PlaybookCategory } from '$lib/content/playbooks';

	export let data: {
		playbook: Playbook;
		category: PlaybookCategory;
		related: Playbook[];
		adjacent: { prev: Playbook | null; next: Playbook | null };
	};

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/playbooks/${data.playbook.slug}`;
	const updatedIso = '2026-10-25';

	let articleEl: HTMLElement;
	let activeSection = data.playbook.sections[0]?.id ?? '';
	let progress = 0;

	$: articleLd = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: data.playbook.title,
		description: data.playbook.description,
		datePublished: updatedIso,
		dateModified: updatedIso,
		author: { '@type': 'Organization', name: 'BTracker', url: origin },
		publisher: {
			'@type': 'Organization',
			name: 'BTracker',
			logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png` }
		},
		mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
		articleSection: data.category.label,
		timeRequired: `PT${data.playbook.readTime}M`,
		isAccessibleForFree: true,
		inLanguage: 'en-IN'
	};

	$: breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'Playbooks', item: `${origin}/playbooks` },
			{ '@type': 'ListItem', position: 3, name: data.category.label, item: `${origin}/playbooks` },
			{ '@type': 'ListItem', position: 4, name: data.playbook.title, item: pageUrl }
		]
	};

	function updateProgress() {
		const scrollable = document.documentElement.scrollHeight - window.innerHeight;
		progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
	}

	onMount(() => {
		updateProgress();
		window.addEventListener('scroll', updateProgress, { passive: true });

		const headings = articleEl ? Array.from(articleEl.querySelectorAll<HTMLElement>('h2[id]')) : [];
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeSection = entry.target.id;
				}
			},
			{ rootMargin: '-120px 0px -66% 0px', threshold: 0 }
		);
		headings.forEach((heading) => observer.observe(heading));

		return () => {
			window.removeEventListener('scroll', updateProgress);
			observer.disconnect();
		};
	});
</script>

<svelte:head>
	<title>{data.playbook.title} — BTracker Playbooks</title>
	<meta name="description" content={data.playbook.description} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content={data.playbook.title} />
	<meta property="og:description" content={data.playbook.description} />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta property="article:section" content={data.category.label} />
	<meta property="article:published_time" content={updatedIso} />
	<meta property="article:modified_time" content={updatedIso} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.playbook.title} />
	<meta name="twitter:description" content={data.playbook.description} />
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(articleLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<div class="reading" aria-hidden="true"><span style:width={`${progress * 100}%`}></span></div>

<article class="playbook">
	<header class="article-hero">
		<div class="site-wrap">
			<nav class="crumbs" aria-label="Breadcrumb">
				<a href="/playbooks">Playbooks</a>
				<span aria-hidden="true">/</span>
				<span>{data.category.label}</span>
			</nav>

			<div class="article-hero-grid">
				<div class="article-hero-copy">
					<h1 class="site-serif">{data.playbook.title}</h1>
					<p class="dek">{data.playbook.dek}</p>
				</div>
				<dl class="facts">
					<div>
						<dt>Read time</dt>
						<dd>{data.playbook.readTime} min</dd>
					</div>
					<div>
						<dt>Level</dt>
						<dd>{data.playbook.level}</dd>
					</div>
					<div>
						<dt>Category</dt>
						<dd>{data.category.label}</dd>
					</div>
					<div>
						<dt>Updated</dt>
						<dd>{data.playbook.updated}</dd>
					</div>
				</dl>
			</div>

			<div class="takeaways">
				<p class="site-mono">What you&rsquo;ll take away</p>
				<ul>
					{#each data.playbook.takeaways as takeaway}
						<li>{takeaway}</li>
					{/each}
				</ul>
			</div>
		</div>
	</header>

	<div class="site-wrap body-grid">
		<aside class="toc" aria-label="On this page">
			<p class="site-mono">In this playbook</p>
			<nav>
				{#each data.playbook.sections as section, index}
					<a href={`#${section.id}`} class:active={activeSection === section.id}>
						<span>{String(index + 1).padStart(2, '0')}</span>
						{section.heading}
					</a>
				{/each}
			</nav>
			<div class="toc-cta">
				<p>Want the queue to run itself?</p>
				<a href="/login" data-sveltekit-preload-data="hover">Open BTracker</a>
			</div>
		</aside>

		<div class="article" bind:this={articleEl}>
			{#each data.playbook.sections as section, index}
				<section class="section">
					<h2 id={section.id} class="site-serif">{section.heading}</h2>
					{#each section.paragraphs ?? [] as paragraph}
						<p>{paragraph}</p>
					{/each}

					{#if section.bullets?.length}
						<ul class="bullets">
							{#each section.bullets as bullet}
								<li>{bullet}</li>
							{/each}
						</ul>
					{/if}

					{#if section.steps?.length}
						<ol class="steps">
							{#each section.steps as step, stepIndex}
								<li class="step">
									<span class="step-num" aria-hidden="true">{String(stepIndex + 1).padStart(2, '0')}</span>
									<div>
										<h3>{step.title}</h3>
										<p>{step.text}</p>
									</div>
								</li>
							{/each}
						</ol>
					{/if}

					{#if section.callout}
						<aside class="callout">
							<p class="site-mono">{section.callout.label}</p>
							<p>{section.callout.text}</p>
						</aside>
					{/if}
				</section>

				{#if index === 1}
					<aside class="inline-cta">
						<div>
							<p class="site-mono">Test the method</p>
							<h2 class="site-serif">Read it once. Then run it for a week.</h2>
							<p>
								BTracker logs the questions, schedules the review dates, and keeps the evidence in
								one place. Free, no card, no trial clock.
							</p>
						</div>
						<a class="inline-btn" href="/login" data-sveltekit-preload-data="hover">
							Open the tracker
							<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
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
					</aside>
				{/if}
			{/each}

			<section class="end-cta">
				<p class="site-mono">Put it to work</p>
				<h2 class="site-serif">{data.playbook.cta.title}</h2>
				<p>{data.playbook.cta.text}</p>
				<a class="end-btn" href={data.playbook.cta.href} data-sveltekit-preload-data="hover">{data.playbook.cta.label}</a>
				<p class="end-note">100% free · No card · No trial clock</p>
			</section>

			<nav class="pager" aria-label="Playbook pages">
				{#if data.adjacent.prev}
					<a class="pager-link" href={`/playbooks/${data.adjacent.prev.slug}`} data-sveltekit-preload-data="hover">
						<span class="site-mono">Previous</span>
						<strong class="site-serif">{data.adjacent.prev.menuTitle}</strong>
					</a>
				{:else}
					<a class="pager-link" href="/playbooks" data-sveltekit-preload-data="hover">
						<span class="site-mono">Back to</span>
						<strong class="site-serif">All playbooks</strong>
					</a>
				{/if}
				{#if data.adjacent.next}
					<a class="pager-link right" href={`/playbooks/${data.adjacent.next.slug}`} data-sveltekit-preload-data="hover">
						<span class="site-mono">Next</span>
						<strong class="site-serif">{data.adjacent.next.menuTitle}</strong>
					</a>
				{/if}
			</nav>
		</div>
	</div>

	{#if data.related.length}
		<section class="related">
			<div class="site-wrap">
				<div class="related-head">
					<h2 class="site-serif">Keep reading</h2>
					<a href="/playbooks" data-sveltekit-preload-data="hover">All playbooks</a>
				</div>
				<div class="related-grid">
					{#each data.related as entry}
						<a class="related-card" href={`/playbooks/${entry.slug}`} data-sveltekit-preload-data="hover">
							<span class="site-mono">{entry.readTime} min · {entry.level}</span>
							<strong class="site-serif">{entry.menuTitle}</strong>
							<p>{entry.description}</p>
						</a>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</article>

<style>
	.reading {
		position: fixed;
		inset: 0 0 auto;
		height: 2px;
		z-index: 90;
		pointer-events: none;
	}
	.reading span {
		display: block;
		height: 100%;
		background: var(--color-forest);
		transform-origin: left;
	}

	.article-hero {
		padding: clamp(26px, 4vw, 48px) 0 clamp(36px, 5vw, 60px);
		border-bottom: 1px solid var(--color-line);
	}
	.crumbs {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.crumbs a {
		color: var(--color-muted);
	}
	.crumbs a:hover {
		color: var(--color-forest);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.crumbs span[aria-hidden] {
		opacity: 0.5;
	}

	.article-hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 248px;
		gap: clamp(28px, 5vw, 74px);
		align-items: end;
		margin-top: clamp(18px, 3vw, 30px);
	}
	h1 {
		margin: 0;
		max-width: 18ch;
		font-size: clamp(2.7rem, 6.2vw, 5rem);
		line-height: 0.95;
		color: var(--color-forest);
		text-wrap: balance;
	}
	.dek {
		margin: 20px 0 0;
		max-width: 56ch;
		font-size: clamp(14.5px, 1.6vw, 16.5px);
		line-height: 1.6;
		color: var(--color-muted);
	}

	.facts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px 12px;
		margin: 0;
		padding: 18px 20px;
		border: 1px solid var(--color-line);
		border-radius: 16px;
		background: var(--color-cream-2);
	}
	.facts div {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.facts dt {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.facts dd {
		margin: 0;
		font-size: 12.5px;
		font-weight: 650;
		color: var(--color-forest);
	}

	.takeaways {
		display: grid;
		grid-template-columns: minmax(0, 218px) minmax(0, 1fr);
		gap: clamp(24px, 5vw, 74px);
		align-items: start;
		margin-top: clamp(28px, 4vw, 46px);
		padding-top: 22px;
		border-top: 1px solid var(--color-line);
	}
	.takeaways ul {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 22px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.takeaways li {
		position: relative;
		padding-left: 16px;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--color-forest);
	}
	.takeaways li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6px;
		width: 6px;
		height: 6px;
		border-radius: 99px;
		background: var(--color-forest);
	}

	.body-grid {
		display: grid;
		grid-template-columns: 218px minmax(0, 710px);
		gap: clamp(30px, 5vw, 74px);
		justify-content: start;
		padding-top: clamp(36px, 5vw, 60px);
	}
	.toc {
		position: sticky;
		top: 108px;
		align-self: start;
	}
	.toc nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: 14px;
	}
	.toc nav a {
		display: flex;
		gap: 9px;
		padding: 7px 9px;
		border-radius: 8px;
		font-size: 11.5px;
		line-height: 1.45;
		color: var(--color-muted);
		transition: background 0.15s ease, color 0.15s ease;
	}
	.toc nav a span {
		font-family: var(--font-mono);
		font-size: 8px;
		padding-top: 2px;
		color: color-mix(in srgb, var(--color-muted) 60%, transparent);
	}
	.toc nav a:hover {
		background: var(--color-cream-2);
		color: var(--color-ink);
	}
	.toc nav a.active {
		background: var(--color-mint);
		color: var(--color-forest);
		font-weight: 600;
	}
	.toc-cta {
		margin-top: 24px;
		padding: 16px;
		border: 1px solid var(--color-line);
		border-radius: 14px;
		background: var(--color-cream-2);
	}
	.toc-cta p {
		margin: 0 0 10px;
		font-size: 11.5px;
		line-height: 1.5;
		color: var(--color-muted);
	}
	.toc-cta a {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 12px;
		border-radius: 99px;
		background: var(--color-forest);
		color: var(--color-cream);
		font-size: 11px;
		font-weight: 650;
	}

	.article {
		min-width: 0;
	}
	.section {
		padding-bottom: clamp(30px, 4vw, 46px);
		margin-bottom: clamp(30px, 4vw, 46px);
		border-bottom: 1px solid var(--color-line);
	}
	.section:last-of-type {
		border-bottom: 0;
	}
	h2 {
		margin: 0 0 18px;
		font-size: clamp(1.75rem, 3.2vw, 2.45rem);
		line-height: 1.02;
		color: var(--color-forest);
		scroll-margin-top: 108px;
		text-wrap: balance;
	}
	.section p {
		margin: 0 0 16px;
		font-size: 15px;
		line-height: 1.75;
		color: color-mix(in srgb, var(--color-ink) 84%, var(--color-muted));
	}
	.section p:last-child {
		margin-bottom: 0;
	}

	.bullets {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 20px 0 22px;
		padding: 0;
		list-style: none;
	}
	.bullets li {
		position: relative;
		padding-left: 20px;
		font-size: 14px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-ink) 84%, var(--color-muted));
	}
	.bullets li::before {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--color-forest);
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 24px 0 22px;
		padding: 0;
		list-style: none;
	}
	.step {
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr);
		gap: 14px;
		padding: 16px 18px;
		border: 1px solid var(--color-line);
		border-radius: 14px;
		background: var(--color-cream-2);
	}
	.step-num {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		background: var(--color-forest);
		color: var(--color-cream);
		font-family: var(--font-mono);
		font-size: 9px;
	}
	.step h3 {
		margin: 3px 0 4px;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--color-forest);
	}
	.step p {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-muted);
	}

	.callout {
		margin: 24px 0 4px;
		padding: 20px 22px;
		border-left: 3px solid var(--color-forest);
		border-radius: 0 14px 14px 0;
		background: color-mix(in srgb, var(--color-butter) 60%, var(--color-cream));
	}
	.callout p:last-child {
		margin: 7px 0 0;
		font-family: var(--font-serif);
		font-size: clamp(1.15rem, 2.2vw, 1.4rem);
		line-height: 1.25;
		letter-spacing: -0.015em;
		color: var(--color-forest);
	}

	.inline-cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 20px;
		margin: 4px 0 clamp(34px, 4vw, 50px);
		padding: clamp(22px, 3.5vw, 32px);
		border-radius: 20px;
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.inline-cta > div {
		max-width: 46ch;
	}
	.inline-cta :global(.site-mono) {
		color: color-mix(in srgb, var(--color-cream) 52%, transparent);
	}
	.inline-cta h2 {
		margin: 10px 0 8px;
		font-size: clamp(1.5rem, 3vw, 2rem);
		color: var(--color-cream);
		scroll-margin-top: 0;
	}
	.inline-cta p:last-child {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-cream) 72%, transparent);
	}
	.inline-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 40px;
		padding: 0 17px;
		border-radius: 999px;
		background: var(--color-cream);
		color: var(--color-forest);
		font-size: 12px;
		font-weight: 650;
		white-space: nowrap;
		transition: transform 0.18s ease;
	}
	.inline-btn:hover {
		transform: translateY(-1px);
	}

	.end-cta {
		padding: clamp(28px, 4vw, 40px);
		border: 1px solid var(--color-line);
		border-radius: 20px;
		background: var(--color-cream-2);
	}
	.end-cta h2 {
		margin: 10px 0 10px;
		font-size: clamp(1.8rem, 3.4vw, 2.5rem);
	}
	.end-cta > p {
		margin: 0 0 20px;
		max-width: 52ch;
		font-size: 13.5px;
		line-height: 1.65;
		color: var(--color-muted);
	}
	.end-btn {
		display: inline-flex;
		align-items: center;
		height: 42px;
		padding: 0 20px;
		border-radius: 999px;
		background: var(--color-forest);
		color: var(--color-cream);
		font-size: 12.5px;
		font-weight: 650;
		transition: transform 0.18s ease, background 0.18s ease;
	}
	.end-btn:hover {
		transform: translateY(-1px);
		background: var(--color-forest-2);
	}
	.end-cta .end-note {
		margin: 16px 0 0;
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: clamp(30px, 4vw, 44px);
	}
	.pager-link {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 16px 18px;
		border: 1px solid var(--color-line);
		border-radius: 14px;
		transition: border-color 0.18s ease, background 0.18s ease;
	}
	.pager-link:hover {
		border-color: color-mix(in srgb, var(--color-forest) 30%, transparent);
		background: var(--color-cream-2);
	}
	.pager-link.right {
		text-align: right;
		align-items: flex-end;
	}
	.pager-link strong {
		font-size: 1.15rem;
		font-weight: 400;
		color: var(--color-forest);
	}

	.related {
		margin-top: clamp(54px, 8vw, 96px);
		padding: clamp(40px, 6vw, 68px) 0;
		background: var(--color-cream-2);
		border-top: 1px solid var(--color-line);
	}
	.related-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}
	.related-head h2 {
		margin: 0;
		font-size: clamp(1.8rem, 3.4vw, 2.5rem);
	}
	.related-head a {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.related-head a:hover {
		color: var(--color-forest);
	}
	.related-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}
	.related-card {
		display: flex;
		flex-direction: column;
		gap: 9px;
		padding: 20px;
		border: 1px solid var(--color-line);
		border-radius: 16px;
		background: var(--color-cream);
		transition: transform 0.2s ease, border-color 0.2s ease;
	}
	.related-card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--color-forest) 28%, transparent);
	}
	.related-card strong {
		font-size: 1.4rem;
		font-weight: 400;
		color: var(--color-forest);
	}
	.related-card p {
		margin: 0;
		font-size: 12px;
		line-height: 1.55;
		color: var(--color-muted);
	}

	@media (max-width: 1000px) {
		.body-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.toc {
			position: static;
			padding-bottom: 22px;
			border-bottom: 1px solid var(--color-line);
		}
		.toc nav {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 5px;
		}
		.toc nav a {
			border: 1px solid var(--color-line);
			border-radius: 99px;
			padding: 6px 11px;
		}
		.toc-cta {
			display: none;
		}
	}
	@media (max-width: 820px) {
		.article-hero-grid {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
		}
		.facts {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		.takeaways {
			grid-template-columns: minmax(0, 1fr);
			gap: 16px;
		}
		.takeaways ul {
			grid-template-columns: minmax(0, 1fr);
			gap: 9px;
		}
		.related-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 560px) {
		h1 {
			font-size: 2.65rem;
		}
		.facts {
			grid-template-columns: 1fr 1fr;
		}
		.step {
			grid-template-columns: 30px minmax(0, 1fr);
			gap: 11px;
			padding: 14px;
		}
		.pager {
			grid-template-columns: minmax(0, 1fr);
		}
		.inline-cta {
			border-radius: 18px;
		}
		.toc nav a {
			padding: 6px 9px;
			font-size: 10.5px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.related-card,
		.pager-link,
		.inline-btn,
		.end-btn {
			transition: none;
		}
	}
</style>
