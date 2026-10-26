<script lang="ts">
	import { onMount } from 'svelte';
	import GuideShell from '$lib/components/guides/GuideShell.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { getCategory, type Guide, type GuideCategory } from '$lib/content/guides';

	export let data: {
		guide: Guide;
		category: GuideCategory;
		related: Guide[];
		adjacent: { prev: Guide; next: Guide };
	};

	let articleEl: HTMLElement;
	let progress = 0;
	let activeSection = data.guide.sections[0]?.id ?? '';

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/guides/${data.guide.slug}`;

	$: articleLd = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: data.guide.title,
		description: data.guide.description,
		datePublished: '2026-10-24',
		dateModified: '2026-10-24',
		author: { '@type': 'Organization', name: 'BTracker', url: origin },
		publisher: {
			'@type': 'Organization',
			name: 'BTracker',
			logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png` }
		},
		mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
		articleSection: data.category.label,
		timeRequired: `PT${data.guide.readTime}M`,
		isAccessibleForFree: true,
		inLanguage: 'en-IN'
	};

	$: breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'Study Guides', item: `${origin}/guides` },
			{ '@type': 'ListItem', position: 3, name: data.category.label, item: `${origin}/guides#${data.category.id}` },
			{ '@type': 'ListItem', position: 4, name: data.guide.title, item: pageUrl }
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
			{ rootMargin: '-96px 0px -68% 0px', threshold: 0 }
		);
		headings.forEach((heading) => observer.observe(heading));

		return () => {
			window.removeEventListener('scroll', updateProgress);
			observer.disconnect();
		};
	});

	function noop() {}

	function closeToc(event: Event) {
		const details = (event.currentTarget as HTMLElement).closest('details');
		if (details) (details as HTMLDetailsElement).open = false;
	}
</script>

<svelte:head>
	<title>{data.guide.title} — BTracker Study Guides</title>
	<meta name="description" content={data.guide.description} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content={data.guide.title} />
	<meta property="og:description" content={data.guide.description} />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta property="article:section" content={data.category.label} />
	<meta property="article:published_time" content="2026-10-24" />
	<meta property="article:modified_time" content="2026-10-24" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.guide.title} />
	<meta name="twitter:description" content={data.guide.description} />
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(articleLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

{#snippet tocLinks(closeOnClick: boolean)}
	{#each data.guide.sections as section}
		<a
			href={`#${section.id}`}
			class:active={activeSection === section.id}
			on:click={closeOnClick ? closeToc : noop}
		>
			{section.heading}
		</a>
	{/each}
{/snippet}

<GuideShell>
	<div class="progress" aria-hidden="true"><span style:width={`${progress * 100}%`}></span></div>

	<header class="article-head">
		<div class="gx-container">
			<nav class="crumbs" aria-label="Breadcrumb">
				<a href="/welcome">BTracker</a>
				<span>/</span>
				<a href="/guides">Study Guides</a>
				<span>/</span>
				<span class="crumb-current">{data.category.label}</span>
			</nav>

			<div class="head-grid">
				<div>
					<p class="cat-pill {data.category.accent}">
						<NavIcon name={data.category.icon} size={13} />
						{data.category.label}
					</p>
					<h1>{data.guide.title}</h1>
					<p class="lede">{data.guide.description}</p>
					<div class="meta">
						<span>Updated {data.guide.updated}</span>
						<i></i>
						<span>{data.guide.readTime} min read</span>
						<i></i>
						<span>{data.guide.level}</span>
					</div>
				</div>

				<div class="head-side">
					<span class="free-chip"><i></i> Free guide</span>
					<p>No signup needed to read. Put it into practice with BTracker's free log and revision loop.</p>
					<a class="gx-btn gx-btn-dark" href="/login">Try BTracker <NavIcon name="arrow-right" size={14} /></a>
				</div>
			</div>

			<details class="toc-mobile">
				<summary>
					<span>In this guide</span>
					<NavIcon name="chevron-down" size={15} />
				</summary>
				<div class="toc-mobile-links">
					{@render tocLinks(true)}
				</div>
			</details>
		</div>
	</header>

	<div class="gx-container article-layout">
		<article class="prose" bind:this={articleEl}>
			<div class="takeaways">
				<p class="takeaways-label"><NavIcon name="bulb" size={15} /> Key takeaways</p>
				<ul>
					{#each data.guide.takeaways as takeaway}
						<li><NavIcon name="check-circle" size={14} />{takeaway}</li>
					{/each}
				</ul>
			</div>

			{#each data.guide.sections as section}
				<section class="section">
					<h2 id={section.id}>{section.heading}</h2>

					{#if section.paragraphs}
						{#each section.paragraphs as paragraph}
							<p>{paragraph}</p>
						{/each}
					{/if}

					{#if section.bullets}
						<ul class="checklist">
							{#each section.bullets as bullet}
								<li><NavIcon name="check-circle" size={15} /><span>{bullet}</span></li>
							{/each}
						</ul>
					{/if}

					{#if section.steps}
						<ol class="steps">
							{#each section.steps as step, index}
								<li>
									<span class="step-num">{String(index + 1).padStart(2, '0')}</span>
									<div>
										<b>{step.title}</b>
										<p>{step.text}</p>
									</div>
								</li>
							{/each}
						</ol>
					{/if}

					{#if section.callout}
						<aside class="callout">
							<span class="callout-label">{section.callout.label}</span>
							<p>{section.callout.text}</p>
						</aside>
					{/if}
				</section>
			{/each}

			<div class="practice">
				<div class="practice-copy">
					<p class="practice-kicker">Put it into practice</p>
					<h2>Log the next question.<br />Let the system do the rest.</h2>
					<p>
						Every question you log feeds your revision deck, your chapter accuracy and your next weekly
						review. BTracker is 100% free — every feature, no card, no trial clock.
					</p>
				</div>
				<div class="practice-actions">
					<a class="gx-btn gx-btn-dark" href="/login">Start tracking free <NavIcon name="arrow-right" size={15} /></a>
					<a class="gx-btn gx-btn-quiet" href="/guides">Back to all guides</a>
					<span><NavIcon name="check-circle" size={12} /> Free forever · Google sign-in</span>
				</div>
			</div>

			<nav class="adjacent" aria-label="Guide navigation">
				<a href={`/guides/${data.adjacent.prev.slug}`}>
					<span><NavIcon name="chevron-left" size={13} /> Previous guide</span>
					<b>{data.adjacent.prev.menuTitle}</b>
				</a>
				<a class="next" href={`/guides/${data.adjacent.next.slug}`}>
					<span>Next guide <NavIcon name="chevron" size={13} /></span>
					<b>{data.adjacent.next.menuTitle}</b>
				</a>
			</nav>
		</article>

		<aside class="toc">
			<div class="toc-card">
				<b>In this guide</b>
				<div class="toc-links">
					{@render tocLinks(false)}
				</div>
				<div class="toc-meta">
					<span><NavIcon name="clock" size={12} /> {data.guide.readTime} min read</span>
					<span><NavIcon name="calendar-check" size={12} /> {data.guide.updated}</span>
				</div>
				<a class="toc-cta" href="/login">Track this in BTracker <NavIcon name="arrow-right" size={12} /></a>
			</div>
		</aside>
	</div>

	<section class="related">
		<div class="gx-container">
			<div class="related-head">
				<div>
					<p>Keep going</p>
					<h2>Two more guides for this week.</h2>
				</div>
				<a href="/guides">All guides <NavIcon name="arrow-right" size={13} /></a>
			</div>
			<div class="related-grid">
				{#each data.related as guide}
					{@const relatedCategory = getCategory(guide.category)}
					<a class="related-card" href={`/guides/${guide.slug}`}>
						<div class="related-top">
							<span class="related-cat {relatedCategory.accent}">{relatedCategory.short}</span>
							<span>{guide.readTime} min</span>
						</div>
						<h3>{guide.menuTitle}</h3>
						<p>{guide.description}</p>
						<span class="related-link">Read guide <NavIcon name="arrow-right" size={12} /></span>
					</a>
				{/each}
			</div>
		</div>
	</section>
</GuideShell>

<style>
	.progress {
		position: fixed;
		top: 74px;
		left: 0;
		z-index: 61;
		width: 100%;
		height: 2px;
		background: transparent;
		pointer-events: none;
	}

	.progress span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, #0066ff, #6d5cff);
		transition: width 0.08s linear;
	}

	.article-head {
		padding: 36px 0 0;
		background:
			radial-gradient(ellipse at 85% -10%, rgba(0, 102, 255, 0.1), transparent 55%),
			linear-gradient(180deg, #fbfdff, #fff 75%);
		border-bottom: 1px solid #eef2f7;
	}

	.crumbs {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 7px;
		color: #94a3b8;
		font-size: 11px;
		font-weight: 600;
	}

	.crumbs a {
		color: #64748b;
		transition: color 0.16s;
	}

	.crumbs a:hover {
		color: #0066ff;
	}

	.crumb-current {
		color: #334155;
	}

	.head-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 260px;
		gap: 56px;
		align-items: end;
		padding: 26px 0 38px;
	}

	.cat-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.cat-pill.blue {
		background: #eaf2ff;
		color: #0052d4;
	}

	.cat-pill.violet {
		background: #f3edff;
		color: #6d28d9;
	}

	.cat-pill.green {
		background: #e7f9f0;
		color: #0b7a55;
	}

	h1 {
		max-width: 780px;
		margin-top: 16px;
		font-size: clamp(2.15rem, 4.2vw, 3.3rem);
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.05em;
	}

	.lede {
		max-width: 680px;
		margin-top: 16px;
		color: #55657b;
		font-size: 16.5px;
		line-height: 1.65;
	}

	.meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 9px;
		margin-top: 20px;
		color: #8492a6;
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.02em;
	}

	.meta i {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #cbd5e1;
	}

	.head-side {
		padding: 18px;
		border: 1px solid #e4ebf4;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(8px);
	}

	.free-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #0b7a55;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.free-chip i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.13);
	}

	.head-side p {
		margin: 9px 0 13px;
		color: #718096;
		font-size: 11.5px;
		line-height: 1.55;
	}

	.head-side .gx-btn {
		width: 100%;
		padding: 10px 14px;
		font-size: 12.5px;
	}

	.toc-mobile {
		display: none;
		margin-bottom: 18px;
		border: 1px solid #e4ebf4;
		border-radius: 13px;
		background: #fff;
	}

	.toc-mobile summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 13px 15px;
		color: #0f172a;
		font-size: 12.5px;
		font-weight: 750;
		cursor: pointer;
		list-style: none;
	}

	.toc-mobile summary::-webkit-details-marker {
		display: none;
	}

	.toc-mobile[open] summary :global(svg) {
		transform: rotate(180deg);
	}

	.toc-mobile-links {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0 8px 8px;
	}

	.toc-mobile-links a {
		padding: 8px 9px;
		border-radius: 8px;
		color: #5b6b82;
		font-size: 12px;
	}

	.toc-mobile-links a:hover {
		background: #f8fafc;
	}

	.article-layout {
		display: grid;
		grid-template-columns: minmax(0, 740px) 270px;
		gap: 56px;
		justify-content: center;
		align-items: start;
		padding-top: 44px;
		padding-bottom: 20px;
	}

	.prose {
		min-width: 0;
		max-width: 740px;
	}

	.takeaways {
		padding: 22px 24px;
		border: 1px solid #dbeafe;
		border-radius: 18px;
		background:
			radial-gradient(ellipse at 100% 0%, rgba(0, 102, 255, 0.08), transparent 55%),
			linear-gradient(135deg, #fbfdff, #f2f7ff);
	}

	.takeaways-label {
		display: flex;
		align-items: center;
		gap: 7px;
		color: #0052d4;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.takeaways ul {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
	}

	.takeaways li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		color: #334a66;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.5;
	}

	.takeaways li :global(svg) {
		flex: none;
		margin-top: 2px;
		color: #0066ff;
	}

	.section {
		padding-top: 36px;
	}

	.section h2 {
		scroll-margin-top: 100px;
		color: #0f172a;
		font-size: 25px;
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: -0.035em;
	}

	.section p {
		margin-top: 13px;
		color: #425268;
		font-size: 15.5px;
		line-height: 1.78;
	}

	.checklist {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.checklist li {
		display: flex;
		align-items: flex-start;
		gap: 9px;
		color: #425268;
		font-size: 14.5px;
		line-height: 1.6;
	}

	.checklist li :global(svg) {
		flex: none;
		margin-top: 3px;
		color: #0066ff;
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 18px 0 0;
		padding: 0;
		list-style: none;
	}

	.steps li {
		display: flex;
		gap: 13px;
		padding: 13px 0;
		border-bottom: 1px solid #f0f4f9;
	}

	.steps li:last-child {
		border-bottom: 0;
	}

	.step-num {
		display: grid;
		flex: none;
		place-items: center;
		width: 27px;
		height: 27px;
		border: 1px solid #dbeafe;
		border-radius: 8px;
		background: #f3f8ff;
		color: #0052d4;
		font-size: 10px;
		font-weight: 800;
	}

	.steps b {
		display: block;
		color: #17263f;
		font-size: 13.5px;
		font-weight: 750;
	}

	.steps p {
		margin-top: 3px;
		color: #5b6b82;
		font-size: 13.5px;
		line-height: 1.6;
	}

	.callout {
		margin-top: 20px;
		padding: 16px 18px;
		border-left: 3px solid #0066ff;
		border-radius: 0 12px 12px 0;
		background: #f6faff;
	}

	.callout-label {
		display: block;
		color: #0052d4;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.callout p {
		margin-top: 5px;
		color: #3e5472;
		font-size: 13.5px;
		line-height: 1.6;
	}

	.practice {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 210px;
		gap: 30px;
		align-items: center;
		margin-top: 48px;
		padding: 28px;
		border: 1px solid #16233b;
		border-radius: 20px;
		background:
			radial-gradient(ellipse at 95% 0%, rgba(0, 102, 255, 0.32), transparent 48%),
			linear-gradient(140deg, #0b1220, #101c31);
	}

	.practice-kicker {
		color: #7eb4ff;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.practice-copy h2 {
		margin-top: 8px;
		color: #fff;
		font-size: 23px;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.035em;
	}

	.practice-copy > p:last-child {
		margin-top: 9px;
		color: #a9b7cb;
		font-size: 12.5px;
		line-height: 1.6;
	}

	.practice-actions {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 7px;
	}

	.practice-actions .gx-btn {
		font-size: 12.5px;
		padding: 10px 14px;
	}

	:global(.gx-btn-quiet) {
		padding: 10px 14px;
		border-color: rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.06);
		color: #dce6f5;
		box-shadow: none;
	}

	:global(.gx-btn-quiet:hover) {
		transform: translateY(-1px);
		background: rgba(255, 255, 255, 0.1);
	}

	.practice-actions > span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		justify-content: center;
		color: #8fa2bb;
		font-size: 9.5px;
		font-weight: 600;
	}

	.practice-actions > span :global(svg) {
		color: #4ade80;
	}

	.adjacent {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 34px;
		padding-top: 24px;
		border-top: 1px solid #eef2f7;
	}

	.adjacent a {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 16px;
		border: 1px solid #e5ebf3;
		border-radius: 13px;
		background: #fff;
		transition:
			border-color 0.18s,
			background 0.18s;
	}

	.adjacent a:hover {
		border-color: #c9dcff;
		background: #fbfdff;
	}

	.adjacent a.next {
		text-align: right;
	}

	.adjacent span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #94a3b8;
		font-size: 9.5px;
		font-weight: 750;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.adjacent a.next span {
		justify-content: flex-end;
	}

	.adjacent b {
		color: #1c2a42;
		font-size: 12.5px;
		font-weight: 700;
		line-height: 1.35;
	}

	.toc {
		position: sticky;
		top: 96px;
	}

	.toc-card {
		padding: 18px;
		border: 1px solid #e6edf5;
		border-radius: 16px;
		background: #fbfdff;
	}

	.toc-card > b {
		display: block;
		margin-bottom: 9px;
		color: #0f172a;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.toc-links {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding-bottom: 12px;
		border-bottom: 1px solid #eef2f7;
	}

	.toc-links a {
		position: relative;
		padding: 6px 8px 6px 12px;
		border-radius: 7px;
		color: #5b6b82;
		font-size: 11.5px;
		font-weight: 550;
		line-height: 1.4;
		transition:
			color 0.16s,
			background 0.16s;
	}

	.toc-links a::before {
		content: '';
		position: absolute;
		top: 9px;
		bottom: 9px;
		left: 3px;
		width: 2px;
		border-radius: 2px;
		background: transparent;
	}

	.toc-links a:hover {
		background: #f4f8fd;
		color: #15213a;
	}

	.toc-links a.active {
		color: #0052d4;
		font-weight: 700;
	}

	.toc-links a.active::before {
		background: #0066ff;
	}

	.toc-meta {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 12px 0;
		color: #8492a6;
		font-size: 10px;
		font-weight: 600;
	}

	.toc-meta span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.toc-cta {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
		width: 100%;
		padding: 9px 11px;
		border-radius: 9px;
		background: #0b1220;
		color: #fff;
		font-size: 10.5px;
		font-weight: 700;
		transition: background 0.18s;
	}

	.toc-cta:hover {
		background: #16233b;
	}

	.related {
		padding: 56px 0 76px;
		border-top: 1px solid #eef2f7;
		background: #fbfdff;
	}

	.related-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
	}

	.related-head > div > p {
		color: #0066ff;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.related-head h2 {
		margin-top: 6px;
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.035em;
	}

	.related-head > a {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding-bottom: 3px;
		color: #0052d4;
		font-size: 11.5px;
		font-weight: 750;
		white-space: nowrap;
	}

	.related-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		margin-top: 22px;
		max-width: 860px;
	}

	.related-card {
		display: flex;
		flex-direction: column;
		padding: 20px;
		border: 1px solid #e5ebf3;
		border-radius: 16px;
		background: #fff;
		transition:
			transform 0.18s var(--ease),
			border-color 0.18s,
			box-shadow 0.18s;
	}

	.related-card:hover {
		transform: translateY(-2px);
		border-color: #c9dcff;
		box-shadow: 0 18px 32px -28px rgba(0, 82, 212, 0.4);
	}

	.related-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #94a3b8;
		font-size: 9px;
		font-weight: 700;
	}

	.related-cat {
		padding: 3px 7px;
		border-radius: 999px;
		background: #eaf2ff;
		color: #0052d4;
		font-weight: 800;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.related-cat.violet {
		background: #f3edff;
		color: #6d28d9;
	}

	.related-cat.green {
		background: #e7f9f0;
		color: #0b7a55;
	}

	.related-card h3 {
		margin-top: 12px;
		font-size: 16px;
		font-weight: 750;
		line-height: 1.3;
		letter-spacing: -0.02em;
	}

	.related-card p {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 6px;
		color: #6b7a90;
		font-size: 11.5px;
		line-height: 1.55;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.related-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 14px;
		color: #0052d4;
		font-size: 10.5px;
		font-weight: 750;
	}

	@media (max-width: 1000px) {
		.head-grid {
			grid-template-columns: 1fr;
			gap: 24px;
			align-items: start;
		}

		.head-side {
			max-width: 400px;
		}

		.article-layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}

		.toc {
			display: none;
		}

		.toc-mobile {
			display: block;
		}

		.prose {
			max-width: 760px;
			margin: 0 auto;
			width: 100%;
		}
	}

	@media (max-width: 780px) {
		.progress {
			top: 73px;
		}

		.head-grid {
			padding-bottom: 28px;
		}

		.lede {
			font-size: 15px;
		}

		.practice {
			grid-template-columns: 1fr;
			gap: 20px;
			padding: 22px;
		}

		.practice-actions {
			max-width: 320px;
		}
	}

	@media (max-width: 620px) {
		.article-head {
			padding-top: 26px;
		}

		.progress {
			top: 65px;
		}

		h1 {
			font-size: 2rem;
		}

		.takeaways {
			padding: 18px;
		}

		.section {
			padding-top: 30px;
		}

		.section h2 {
			font-size: 21px;
		}

		.section p {
			font-size: 14.5px;
		}

		.article-layout {
			padding-top: 30px;
		}

		.related-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
		}

		.related-grid {
			grid-template-columns: 1fr;
		}

		.adjacent {
			grid-template-columns: 1fr;
		}

		.related {
			padding: 42px 0 56px;
		}
	}
</style>
