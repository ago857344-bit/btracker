<script lang="ts">
	import GuideShell from '$lib/components/guides/GuideShell.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import type { Guide, GuideCategoryId } from '$lib/content/guides';
	import {
		featuredGuide,
		getCategory,
		getGuidesByCategory,
		guideCategories,
		guideCount,
		guides,
		totalReadTime
	} from '$lib/content/guides';

	let query = '';
	let active: 'all' | GuideCategoryId = 'all';

	$: normalizedQuery = query.trim().toLowerCase();
	$: filtered = guides.filter((guide) => {
		const inCategory = active === 'all' || guide.category === active;
		const searchable = `${guide.title} ${guide.description} ${getCategory(guide.category).label}`.toLowerCase();
		return inCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
	});
	$: showingGroups = active === 'all' && !normalizedQuery;

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: 'BTracker Study Guides',
		description:
			'Free, practical study guides for JEE aspirants on revision, daily practice, mock tests, focus and energy.',
		url: 'https://btracker.app/guides',
		isAccessibleForFree: true,
		publisher: { '@type': 'Organization', name: 'BTracker', url: 'https://btracker.app' },
		hasPart: guides.map((guide) => ({
			'@type': 'Article',
			headline: guide.title,
			description: guide.description,
			url: `https://btracker.app/guides/${guide.slug}`
		}))
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: 'https://btracker.app/welcome' },
			{ '@type': 'ListItem', position: 2, name: 'Study Guides', item: 'https://btracker.app/guides' }
		]
	};
</script>

<svelte:head>
	<title>JEE Study Guides — Revision, Mocks & Focus | BTracker</title>
	<meta
		name="description"
		content="Nine free, practical study guides for JEE aspirants: revision systems, DPP routines, mock post-mortems, PYQ strategy, focus blocks, resets and energy habits."
	/>
	<link rel="canonical" href="https://btracker.app/guides" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content="JEE Study Guides — BTracker" />
	<meta
		property="og:description"
		content="Practical playbooks on revision, mocks, focus and energy. Free to read, built to be used."
	/>
	<meta property="og:url" content="https://btracker.app/guides" />
	<meta property="og:image" content="https://btracker.app/landing/og-welcome.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="JEE Study Guides — BTracker" />
	<meta
		name="twitter:description"
		content="Nine free, practical playbooks for JEE prep: revision, mocks, focus and energy."
	/>
	<meta name="twitter:image" content="https://btracker.app/landing/og-welcome.jpg" />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

{#snippet guideCard(guide: Guide)}
	{@const category = getCategory(guide.category)}
	<a class="guide-card" href={`/guides/${guide.slug}`}>
		<div class="card-top">
			<span class="cat-pill {category.accent}">
				<NavIcon name={category.icon} size={12} />
				{category.short}
			</span>
			<span class="read-time">{guide.readTime} min read</span>
		</div>
		<h3>{guide.title}</h3>
		<p>{guide.description}</p>
		<div class="card-foot">
			<span>{guide.level}</span>
			<span class="card-arrow"><NavIcon name="arrow-right" size={15} /></span>
		</div>
	</a>
{/snippet}

<GuideShell>
	<section class="hero">
		<div class="hero-glow" aria-hidden="true"></div>
		<div class="gx-container hero-grid">
			<div class="hero-copy">
				<p class="eyebrow"><span class="eyebrow-dot"></span> BTracker Study Guides</p>
				<h1>JEE prep,<br />written down<span class="blue">.</span></h1>
				<p class="hero-lede">
					Nine practical playbooks on revision, mocks, focus and energy — the systems behind the tracker,
					written to be used rather than skimmed. Free to read, no account needed.
				</p>
				<div class="hero-meta">
					<span><b>{guideCount}</b> free guides</span>
					<span><b>{totalReadTime} min</b> of reading</span>
					<span><b>Updated</b> Oct 2026</span>
				</div>
			</div>

			<aside class="start-card">
				<div class="start-top">
					<span class="start-label">Start here</span>
					<span class="start-free"><i></i> Free</span>
				</div>
				<h2>{featuredGuide.title}</h2>
				<p>{featuredGuide.description}</p>
				<ul>
					{#each featuredGuide.takeaways as takeaway}
						<li><NavIcon name="check-circle" size={13} />{takeaway}</li>
					{/each}
				</ul>
				<div class="start-foot">
					<a class="gx-btn gx-btn-dark" href={`/guides/${featuredGuide.slug}`}>
						Read the guide <NavIcon name="arrow-right" size={15} />
					</a>
					<span>{featuredGuide.readTime} min · {featuredGuide.level}</span>
				</div>
			</aside>
		</div>
	</section>

	<section class="library">
		<div class="gx-container">
			<div class="library-head">
				<div>
					<p class="library-kicker">The library</p>
					<h2>Pick the problem you have this week.</h2>
				</div>
				<label class="search">
					<NavIcon name="search" size={16} />
					<input type="search" bind:value={query} placeholder="Search guides…" aria-label="Search study guides" />
					{#if query}
						<button type="button" aria-label="Clear search" on:click={() => (query = '')}>
							<NavIcon name="x" size={14} />
						</button>
					{/if}
				</label>
			</div>

			<div class="filters" aria-label="Filter guides by category">
				<button type="button" class="filter" class:active={active === 'all'} on:click={() => (active = 'all')}>
					All guides <span>{guideCount}</span>
				</button>
				{#each guideCategories as category}
					<button
						type="button"
						class="filter"
						class:active={active === category.id}
						on:click={() => (active = category.id)}
					>
						{category.label} <span>{getGuidesByCategory(category.id).length}</span>
					</button>
				{/each}
			</div>

			{#if filtered.length === 0}
				<div class="empty">
					<span class="empty-icon"><NavIcon name="search" size={22} /></span>
					<h3>No guides match “{query}”.</h3>
					<p>Try a broader term like “revision”, “mock” or “focus”.</p>
					<button type="button" class="gx-btn gx-btn-light" on:click={() => { query = ''; active = 'all'; }}>
						Clear filters
					</button>
				</div>
			{:else if showingGroups}
				{#each guideCategories as category}
					<section class="cat-section" id={category.id}>
						<div class="cat-head">
							<span class="cat-icon {category.accent}"><NavIcon name={category.icon} size={18} /></span>
							<div>
								<h2>{category.label}</h2>
								<p>{category.blurb}</p>
							</div>
							<span class="cat-count">{getGuidesByCategory(category.id).length} guides</span>
						</div>
						<div class="guide-grid">
							{#each getGuidesByCategory(category.id) as guide}
								{@render guideCard(guide)}
							{/each}
						</div>
					</section>
				{/each}
			{:else}
				<div class="results-head">
					<h2>{normalizedQuery ? `Results for “${query.trim()}”` : getCategory(active as GuideCategoryId).label}</h2>
					<span>{filtered.length} {filtered.length === 1 ? 'guide' : 'guides'}</span>
				</div>
				<div class="guide-grid">
					{#each filtered as guide}
						{@render guideCard(guide)}
					{/each}
				</div>
			{/if}
		</div>
	</section>

	<section class="guide-cta">
		<div class="gx-container">
			<div class="cta-card">
				<div class="cta-copy">
					<p class="cta-kicker">From reading to doing</p>
					<h2>Reading is step one.<br />Logging is step two.</h2>
					<p>
						BTracker turns these systems into a daily loop: log the question, see the gap, revise on schedule.
						Every feature is free — no card, no trial clock.
					</p>
				</div>
				<div class="cta-actions">
					<a class="gx-btn gx-btn-dark gx-btn-lg" href="/login">
						Start tracking free <NavIcon name="arrow-right" size={16} />
					</a>
					<a class="gx-btn gx-btn-light gx-btn-lg" href="/welcome">See how it works</a>
					<p><NavIcon name="check-circle" size={13} /> No card · Every feature · Free forever</p>
				</div>
			</div>
		</div>
	</section>
</GuideShell>

<style>
	.hero {
		position: relative;
		padding: 72px 0 64px;
		overflow: hidden;
		background:
			linear-gradient(180deg, #fbfdff 0%, #ffffff 70%);
	}

	.hero-glow {
		position: absolute;
		top: -220px;
		right: -120px;
		width: 760px;
		height: 640px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(0, 102, 255, 0.13), transparent 64%);
		pointer-events: none;
	}

	.hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
		background-size: 44px 44px;
		mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 82%);
		-webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 82%);
		pointer-events: none;
	}

	.hero-grid {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.82fr);
		gap: 64px;
		align-items: center;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 5px 11px;
		border: 1px solid rgba(0, 102, 255, 0.16);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.8);
		color: #0052d4;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.eyebrow-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #0066ff;
		box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.12);
	}

	h1 {
		margin-top: 18px;
		font-size: clamp(2.7rem, 5vw, 4.1rem);
		font-weight: 800;
		line-height: 1.02;
		letter-spacing: -0.055em;
	}

	h1 .blue {
		color: #0066ff;
	}

	.hero-lede {
		max-width: 560px;
		margin-top: 22px;
		color: #516079;
		font-size: 16.5px;
		line-height: 1.7;
	}

	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 26px;
		margin-top: 28px;
		color: #7a8798;
		font-size: 12px;
		font-weight: 600;
	}

	.hero-meta b {
		margin-right: 3px;
		color: #0f172a;
		font-weight: 800;
	}

	.start-card {
		position: relative;
		padding: 26px;
		border: 1px solid #e2e9f3;
		border-radius: 24px;
		background: #fff;
		box-shadow:
			0 34px 70px -40px rgba(15, 23, 42, 0.35),
			0 2px 8px -4px rgba(15, 23, 42, 0.08);
	}

	.start-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(145deg, rgba(0, 102, 255, 0.05), transparent 42%);
		pointer-events: none;
	}

	.start-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.start-label {
		padding: 4px 9px;
		border-radius: 999px;
		background: #eaf2ff;
		color: #0052d4;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.start-free {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: #0b7a55;
		font-size: 10px;
		font-weight: 750;
	}

	.start-free i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
	}

	.start-card h2 {
		margin-top: 16px;
		font-size: 23px;
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: -0.035em;
	}

	.start-card > p {
		margin-top: 10px;
		color: #64748b;
		font-size: 13px;
		line-height: 1.6;
	}

	.start-card ul {
		display: flex;
		flex-direction: column;
		gap: 7px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.start-card li {
		display: flex;
		align-items: flex-start;
		gap: 7px;
		color: #4b5b70;
		font-size: 12px;
		line-height: 1.45;
	}

	.start-card li :global(svg) {
		flex: none;
		margin-top: 1px;
		color: #0066ff;
	}

	.start-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 20px;
		padding-top: 18px;
		border-top: 1px solid #eef2f7;
	}

	.start-foot span {
		color: #94a3b8;
		font-size: 10px;
		font-weight: 650;
		white-space: nowrap;
	}

	.library {
		padding: 58px 0 24px;
	}

	.library-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 28px;
	}

	.library-kicker {
		color: #0066ff;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.library-head h2 {
		margin-top: 7px;
		font-size: clamp(1.7rem, 3vw, 2.3rem);
		font-weight: 800;
		letter-spacing: -0.04em;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 9px;
		width: min(300px, 100%);
		padding: 0 13px;
		border: 1px solid #e2e8f0;
		border-radius: 13px;
		background: #fff;
		color: #8b98aa;
		transition:
			border-color 0.18s,
			box-shadow 0.18s;
	}

	.search:focus-within {
		border-color: rgba(0, 102, 255, 0.45);
		box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
	}

	.search input {
		width: 100%;
		height: 42px;
		border: 0;
		outline: 0;
		background: transparent;
		color: #0f172a;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
	}

	.search input::placeholder {
		color: #9aa7b8;
	}

	.search button {
		display: grid;
		flex: none;
		place-items: center;
		width: 22px;
		height: 22px;
		border: 0;
		border-radius: 50%;
		background: #f1f5f9;
		color: #64748b;
		cursor: pointer;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		margin-top: 22px;
	}

	.filter {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 12px;
		border: 1px solid #e2e8f0;
		border-radius: 999px;
		background: #fff;
		color: #526176;
		font-family: inherit;
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
		transition:
			background 0.16s,
			color 0.16s,
			border-color 0.16s;
	}

	.filter span {
		padding: 1px 5px;
		border-radius: 999px;
		background: #f1f5f9;
		color: #8492a6;
		font-size: 9.5px;
		font-weight: 750;
	}

	.filter:hover {
		border-color: #cad6e6;
		background: #f8fafc;
	}

	.filter.active {
		border-color: #0b1220;
		background: #0b1220;
		color: #fff;
	}

	.filter.active span {
		background: rgba(255, 255, 255, 0.14);
		color: #dbe7ff;
	}

	.cat-section {
		margin-top: 46px;
		scroll-margin-top: 100px;
	}

	.cat-head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding-bottom: 16px;
		border-bottom: 1px solid #eef2f7;
	}

	.cat-icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 11px;
	}

	.cat-icon.blue {
		background: #eaf2ff;
		color: #0066ff;
	}

	.cat-icon.violet {
		background: #f3edff;
		color: #7c3aed;
	}

	.cat-icon.green {
		background: #e7f9f0;
		color: #0b9b6a;
	}

	.cat-head h2 {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.cat-head p {
		margin-top: 2px;
		color: #7a8798;
		font-size: 12.5px;
	}

	.cat-count {
		margin-left: auto;
		padding-top: 4px;
		color: #94a3b8;
		font-size: 10.5px;
		font-weight: 700;
		white-space: nowrap;
	}

	.guide-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 18px;
	}

	.guide-card {
		display: flex;
		flex-direction: column;
		min-height: 218px;
		padding: 18px;
		border: 1px solid #e5ebf3;
		border-radius: 16px;
		background: #fff;
		text-decoration: none;
		box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
		transition:
			transform 0.2s var(--ease),
			box-shadow 0.2s,
			border-color 0.2s;
	}

	.guide-card:hover {
		transform: translateY(-3px);
		border-color: #c9dcff;
		box-shadow: 0 20px 36px -28px rgba(0, 82, 212, 0.45);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.cat-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.03em;
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

	.read-time {
		color: #94a3b8;
		font-size: 9.5px;
		font-weight: 650;
		white-space: nowrap;
	}

	.guide-card h3 {
		margin-top: 13px;
		font-size: 17px;
		font-weight: 750;
		line-height: 1.25;
		letter-spacing: -0.025em;
	}

	.guide-card p {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 8px;
		color: #67768b;
		font-size: 12px;
		line-height: 1.55;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 15px;
		color: #94a3b8;
		font-size: 9.5px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.card-arrow {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #f4f7fb;
		color: #64748b;
		transition:
			background 0.18s,
			color 0.18s,
			transform 0.18s;
	}

	.guide-card:hover .card-arrow {
		transform: translateX(2px);
		background: #0066ff;
		color: #fff;
	}

	.results-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-top: 34px;
	}

	.results-head h2 {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.025em;
	}

	.results-head span {
		color: #94a3b8;
		font-size: 11px;
		font-weight: 650;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 66px 20px;
		text-align: center;
	}

	.empty-icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 14px;
		background: #f1f5f9;
		color: #64748b;
	}

	.empty h3 {
		margin-top: 16px;
		font-size: 19px;
	}

	.empty p {
		margin: 6px 0 18px;
		color: #7a8798;
		font-size: 13px;
	}

	.guide-cta {
		padding: 64px 0 84px;
	}

	.cta-card {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: 40px;
		align-items: center;
		padding: 40px;
		overflow: hidden;
		border: 1px solid #16233b;
		border-radius: 26px;
		background:
			radial-gradient(ellipse at 90% 10%, rgba(0, 102, 255, 0.35), transparent 50%),
			linear-gradient(140deg, #0b1220, #101c31 62%, #0b1628);
		color: #fff;
	}

	.cta-kicker {
		color: #7eb4ff;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.cta-copy h2 {
		margin-top: 10px;
		color: #fff;
		font-size: clamp(1.8rem, 3.2vw, 2.5rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.04em;
	}

	.cta-copy > p:last-child {
		max-width: 430px;
		margin-top: 12px;
		color: #a9b7cb;
		font-size: 13.5px;
		line-height: 1.65;
	}

	.cta-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 9px;
	}

	.cta-actions p {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 5px;
		color: #8fa2bb;
		font-size: 10.5px;
		font-weight: 600;
	}

	.cta-actions p :global(svg) {
		color: #4ade80;
	}

	@media (max-width: 1020px) {
		.hero-grid {
			grid-template-columns: 1fr;
			gap: 40px;
		}

		.start-card {
			max-width: 620px;
		}

		.guide-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.cta-card {
			grid-template-columns: 1fr;
			gap: 26px;
		}
	}

	@media (max-width: 820px) {
		.hero {
			padding: 50px 0 44px;
		}

		.library-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}

		.search {
			width: 100%;
		}

		.cta-card {
			padding: 30px;
		}
	}

	@media (max-width: 620px) {
		.hero-grid,
		.library,
		.guide-cta {
			padding-left: 0;
			padding-right: 0;
		}

		.hero-lede {
			font-size: 15px;
		}

		.hero-meta {
			gap: 7px 16px;
			font-size: 11px;
		}

		.start-card {
			padding: 21px;
			border-radius: 20px;
		}

		.start-card h2 {
			font-size: 20px;
		}

		.start-foot {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
		}

		.guide-grid {
			grid-template-columns: 1fr;
		}

		.guide-card {
			min-height: 0;
		}

		.cat-count {
			display: none;
		}

		.cta-card {
			padding: 26px 22px;
			border-radius: 22px;
		}

		.cta-actions {
			width: 100%;
		}

		.cta-actions .gx-btn {
			width: 100%;
		}
	}
</style>
