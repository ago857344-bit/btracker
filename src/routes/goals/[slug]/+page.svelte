<script lang="ts">
	import GuideShell from '$lib/components/guides/GuideShell.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { getCategory, type Guide } from '$lib/content/guides';
	import type { Goal, GoalGroup } from '$lib/content/goals';

	export let data: {
		goal: Goal;
		group: GoalGroup;
		relatedGuides: Guide[];
	};

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/goals/${data.goal.slug}`;

	const articleLd = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: data.goal.title,
		description: data.goal.description,
		datePublished: '2026-10-24',
		dateModified: '2026-10-24',
		author: { '@type': 'Organization', name: 'BTracker', url: origin },
		publisher: {
			'@type': 'Organization',
			name: 'BTracker',
			logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png` }
		},
		mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
		articleSection: 'Study Goals',
		isAccessibleForFree: true,
		inLanguage: 'en-IN'
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'Study Goals', item: `${origin}/goals` },
			{ '@type': 'ListItem', position: 3, name: data.group.label, item: `${origin}/goals#${data.group.id}` },
			{ '@type': 'ListItem', position: 4, name: data.goal.menuTitle, item: pageUrl }
		]
	};
</script>

<svelte:head>
	<title>{data.goal.title} — BTracker Study Goals</title>
	<meta name="description" content={data.goal.description} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content={data.goal.title} />
	<meta property="og:description" content={data.goal.description} />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta property="article:section" content="Study Goals" />
	<meta property="article:published_time" content="2026-10-24" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.goal.title} />
	<meta name="twitter:description" content={data.goal.description} />
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(articleLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<GuideShell>
	<header class="gh">
		<div class="gx-container">
			<nav class="crumbs" aria-label="Breadcrumb">
				<a href="/welcome">BTracker</a>
				<span>/</span>
				<a href="/goals">Study Goals</a>
				<span>/</span>
				<span class="crumb-current">{data.group.label}</span>
			</nav>

			<p class="goal-pill">
				<NavIcon name={data.goal.icon} size={13} />
				{data.goal.badge}
			</p>
			<h1>{data.goal.title}</h1>
			<p class="lede">{data.goal.description}</p>

			<div class="hero-meta">
				<span><NavIcon name="clock" size={14} /> {data.goal.window}</span>
				<span><NavIcon name="focus" size={14} /> {data.goal.weeklyHours}</span>
				<span class="meta-target"><NavIcon name="target" size={14} /> {data.goal.target}</span>
			</div>
		</div>
	</header>

	<div class="gx-container layout">
		<aside class="rail" aria-label="Plan at a glance">
			<div class="rail-card">
				<p class="rail-label">Plan at a glance</p>
				<dl>
					<div>
						<dt>Window</dt>
						<dd>{data.goal.window}</dd>
					</div>
					<div>
						<dt>Weekly load</dt>
						<dd>{data.goal.weeklyHours}</dd>
					</div>
					<div>
						<dt>Best for</dt>
						<dd>{data.goal.badge}</dd>
					</div>
					<div>
						<dt>Target</dt>
						<dd>{data.goal.target}</dd>
					</div>
				</dl>
				<a class="rail-cta" href="/login">Start tracking free <NavIcon name="arrow-right" size={14} /></a>
				<a class="rail-all" href="/goals">All study goals <NavIcon name="arrow-right" size={12} /></a>
			</div>

			<div class="rail-phases">
				<p class="rail-label">Phases</p>
				<ol>
					{#each data.goal.phases as phase, i}
						<li>
							<a href={`#phase-${i + 1}`}>
								<span>{phase.label}</span>
								<b>{phase.heading}</b>
								<small>{phase.window}</small>
							</a>
						</li>
					{/each}
				</ol>
			</div>
		</aside>

		<article class="content">
			<section class="block" id="plan">
				<p class="eyebrow">The plan</p>
				<h2>From where you are to the paper</h2>
				<p class="block-lede">
					Every phase has a window, a focus and a short list of things that must be true before you move
					on. Skip the targets and the plan becomes a reading list.
				</p>

				<ol class="timeline">
					{#each data.goal.phases as phase, i}
						<li id={`phase-${i + 1}`}>
							<span class="phase-dot">{i + 1}</span>
							<div class="phase-card">
								<div class="phase-top">
									<span class="phase-label">{phase.label}</span>
									<span class="phase-window">{phase.window}</span>
								</div>
								<h3>{phase.heading}</h3>
								<p>{phase.text}</p>
								<ul class="targets">
									{#each phase.targets as target}
										<li><NavIcon name="check" size={12} /> {target}</li>
									{/each}
								</ul>
							</div>
						</li>
					{/each}
				</ol>
			</section>

			<section class="checkpoints">
				<div class="check-head">
					<span class="check-icon"><NavIcon name="check-circle" size={18} /></span>
					<div>
						<p class="eyebrow">Checkpoints</p>
						<h2>What “on track” looks like</h2>
					</div>
				</div>
				<ul>
					{#each data.goal.checkpoints as checkpoint}
						<li><NavIcon name="check" size={13} /> {checkpoint}</li>
					{/each}
				</ul>
			</section>

			{#each data.goal.sections as section}
				<section class="block deep" id={section.id}>
					<h2>{section.heading}</h2>
					{#if section.paragraphs}
						{#each section.paragraphs as paragraph}
							<p>{paragraph}</p>
						{/each}
					{/if}
					{#if section.bullets}
						<ul class="bullets">
							{#each section.bullets as bullet}
								<li>{bullet}</li>
							{/each}
						</ul>
					{/if}
					{#if section.steps}
						<ol class="steps">
							{#each section.steps as step, i}
								<li>
									<span>{String(i + 1).padStart(2, '0')}</span>
									<div>
										<b>{step.title}</b>
										<p>{step.text}</p>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
					{#if section.callout}
						<div class="callout">
							<b>{section.callout.label}</b>
							<p>{section.callout.text}</p>
						</div>
					{/if}
				</section>
			{/each}

			<section class="setup" id="setup">
				<p class="eyebrow">Tracker setup</p>
				<h2>Set up BTracker for this goal</h2>
				<p class="block-lede">
					The plan works on paper. These four settings make it visible every week.
				</p>
				<div class="setup-grid">
					{#each data.goal.setup as item, i}
						<div class="setup-card">
							<span>{String(i + 1).padStart(2, '0')}</span>
							<h3>{item.title}</h3>
							<p>{item.text}</p>
						</div>
					{/each}
				</div>
			</section>

			{#if data.relatedGuides.length > 0}
				<section class="related" id="guides">
					<p class="eyebrow">Go deeper</p>
					<h2>Guides that support this plan</h2>
					<div class="related-grid">
						{#each data.relatedGuides as guide}
							{@const category = getCategory(guide.category)}
							<a class="related-card" href={`/guides/${guide.slug}`}>
								<span class="cat-pill {category.accent}">
									<NavIcon name={category.icon} size={12} />
									{category.short}
								</span>
								<b>{guide.menuTitle}</b>
								<p>{guide.description}</p>
								<small>{guide.readTime} min read <NavIcon name="arrow-right" size={12} /></small>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<section class="final">
				<div>
					<p class="final-eyebrow">One question at a time</p>
					<h2>Put this plan in the tracker.</h2>
					<p>
						BTracker is free — every feature, no card. Log today's questions, set the chapter tags this
						goal needs, and let the weekly review keep the plan alive.
					</p>
				</div>
				<div class="final-actions">
					<a class="gx-btn gx-btn-dark gx-btn-lg" href="/login">Start tracking free <NavIcon name="arrow-right" size={15} /></a>
					<a class="gx-btn gx-btn-light gx-btn-lg" href="/goals">All study goals</a>
				</div>
			</section>
		</article>
	</div>
</GuideShell>

<style>
	a {
		text-decoration: none;
	}

	.gh {
		padding: 52px 0 46px;
		border-bottom: 1px solid #eef3fa;
		background:
			radial-gradient(ellipse at 14% 0%, rgba(0, 102, 255, 0.08), transparent 58%),
			linear-gradient(180deg, #fbfdff, #fff);
	}

	.crumbs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 7px;
		color: #8a98ab;
		font-size: 11.5px;
		font-weight: 600;
	}

	.crumbs a {
		color: #61718a;
		transition: color 0.16s;
	}

	.crumbs a:hover {
		color: #0052d4;
	}

	.crumb-current {
		color: #37506f;
	}

	.goal-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 24px;
		padding: 5px 10px;
		border: 1px solid #dbe7f7;
		border-radius: 999px;
		background: #fff;
		color: #0052d4;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.gh h1 {
		max-width: 840px;
		margin-top: 14px;
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: clamp(2.2rem, 4.2vw, 3.4rem);
		font-weight: 800;
		line-height: 1.06;
		letter-spacing: -0.05em;
	}

	.lede {
		max-width: 720px;
		margin-top: 18px;
		color: #53627a;
		font-size: 16px;
		line-height: 1.65;
	}

	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 24px;
	}

	.hero-meta span {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 7px 11px;
		border: 1px solid #e5ecf6;
		border-radius: 999px;
		background: #fff;
		color: #4b5e79;
		font-size: 11.5px;
		font-weight: 650;
	}

	.hero-meta :global(svg) {
		color: #0066ff;
	}

	.meta-target {
		max-width: 100%;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		grid-template-areas: 'main rail';
		gap: 52px;
		padding: 48px 24px 90px;
		align-items: start;
	}

	.content {
		grid-area: main;
		min-width: 0;
	}

	.rail {
		position: sticky;
		top: 96px;
		grid-area: rail;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.rail-card,
	.rail-phases {
		padding: 18px;
		border: 1px solid #e5ecf6;
		border-radius: 17px;
		background: #fff;
		box-shadow: 0 18px 38px -34px rgba(15, 23, 42, 0.4);
	}

	.rail-label {
		margin-bottom: 10px;
		color: #8a98ab;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.rail dl {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
	}

	.rail dt {
		color: #8a98ab;
		font-size: 9.5px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.rail dd {
		margin: 2px 0 0;
		color: #1f3149;
		font-size: 11.5px;
		font-weight: 620;
		line-height: 1.45;
	}

	.rail-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 14px;
		padding: 10px 13px;
		border-radius: 10px;
		background: #0b1220;
		color: #fff;
		font-size: 12px;
		font-weight: 750;
		transition: background 0.18s;
	}

	.rail-cta:hover {
		background: #17233b;
	}

	.rail-all {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		margin-top: 9px;
		color: #61718a;
		font-size: 11px;
		font-weight: 650;
	}

	.rail-all:hover {
		color: #0052d4;
	}

	.rail-phases ol {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.rail-phases a {
		display: block;
		padding: 7px 8px;
		border-radius: 8px;
		transition: background 0.16s;
	}

	.rail-phases a:hover {
		background: #f5f9ff;
	}

	.rail-phases span {
		display: block;
		color: #0066ff;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.rail-phases b {
		display: block;
		margin-top: 1px;
		color: #24364f;
		font-size: 11.5px;
		font-weight: 680;
		line-height: 1.35;
	}

	.rail-phases small {
		display: block;
		margin-top: 1px;
		color: #93a0b2;
		font-size: 9.5px;
	}

	.eyebrow {
		color: #0066ff;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.block h2,
	.checkpoints h2,
	.setup h2,
	.related h2,
	.final h2 {
		margin-top: 7px;
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: clamp(1.55rem, 2.6vw, 2.05rem);
		font-weight: 800;
		line-height: 1.18;
		letter-spacing: -0.035em;
	}

	.block-lede {
		max-width: 700px;
		margin-top: 10px;
		color: #61718a;
		font-size: 13.5px;
		line-height: 1.65;
	}

	.timeline {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin: 28px 0 0;
		padding: 0 0 0 42px;
		list-style: none;
	}

	.timeline::before {
		position: absolute;
		top: 8px;
		bottom: 8px;
		left: 15px;
		width: 1px;
		background: linear-gradient(#cfe0f7, #e7eef9 70%, transparent);
		content: '';
	}

	.timeline > li {
		position: relative;
	}

	.phase-dot {
		position: absolute;
		top: 18px;
		left: -42px;
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 1px solid #d6e4f7;
		border-radius: 50%;
		background: #fff;
		color: #0052d4;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 11px;
		font-weight: 800;
		box-shadow: 0 0 0 5px #fff;
	}

	.phase-card {
		padding: 20px;
		border: 1px solid #e5ecf6;
		border-radius: 16px;
		background: #fff;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.phase-card:hover {
		border-color: #cddcf1;
		box-shadow: 0 20px 40px -34px rgba(15, 23, 42, 0.35);
	}

	.phase-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.phase-label {
		color: #0066ff;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.phase-window {
		padding: 3px 8px;
		border-radius: 999px;
		background: #f5f8fd;
		color: #6b7d95;
		font-size: 9.5px;
		font-weight: 650;
		white-space: nowrap;
	}

	.phase-card h3 {
		margin-top: 8px;
		color: #12223a;
		font-size: 16.5px;
		font-weight: 750;
		letter-spacing: -0.02em;
	}

	.phase-card > p {
		margin-top: 7px;
		color: #5c6d86;
		font-size: 13px;
		line-height: 1.65;
	}

	.targets {
		display: flex;
		flex-direction: column;
		gap: 7px;
		margin: 14px 0 0;
		padding: 13px 0 0;
		border-top: 1px solid #f0f4fa;
		list-style: none;
	}

	.targets li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		color: #3d506b;
		font-size: 12px;
		line-height: 1.5;
	}

	.targets :global(svg) {
		flex: none;
		margin-top: 2px;
		color: #0b9b6a;
	}

	.checkpoints {
		margin-top: 26px;
		padding: 24px;
		border: 1px solid #d9e8fb;
		border-radius: 18px;
		background:
			radial-gradient(ellipse at 90% 0%, rgba(0, 102, 255, 0.08), transparent 55%),
			#f7fbff;
	}

	.check-head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.check-icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 11px;
		background: #fff;
		color: #0066ff;
		box-shadow: 0 6px 16px -12px rgba(0, 82, 212, 0.5);
	}

	.checkpoints ul {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 16px 0 0;
		padding: 16px 0 0;
		border-top: 1px solid #e1ecfa;
		list-style: none;
	}

	.checkpoints li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		color: #3b4f6b;
		font-size: 12.5px;
		line-height: 1.55;
	}

	.checkpoints li :global(svg) {
		flex: none;
		margin-top: 2px;
		color: #0b9b6a;
	}

	.deep {
		margin-top: 48px;
	}

	.deep h2 {
		font-size: clamp(1.4rem, 2.2vw, 1.75rem);
	}

	.deep p {
		max-width: 720px;
		margin-top: 12px;
		color: #4e5f78;
		font-size: 14px;
		line-height: 1.72;
	}

	.bullets {
		display: flex;
		flex-direction: column;
		gap: 9px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.bullets li {
		position: relative;
		padding-left: 18px;
		color: #4e5f78;
		font-size: 13.5px;
		line-height: 1.6;
	}

	.bullets li::before {
		position: absolute;
		top: 8px;
		left: 2px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #8fb8ff;
		content: '';
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 18px 0 0;
		padding: 0;
		list-style: none;
	}

	.steps li {
		display: flex;
		gap: 12px;
		padding: 16px;
		border: 1px solid #e8eef7;
		border-radius: 13px;
		background: #fff;
	}

	.steps li > span {
		flex: none;
		color: #0066ff;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 11px;
		font-weight: 800;
	}

	.steps b {
		display: block;
		color: #17263d;
		font-size: 13px;
		font-weight: 720;
	}

	.steps p {
		margin-top: 4px;
		font-size: 12.5px;
		line-height: 1.6;
	}

	.callout {
		margin-top: 20px;
		padding: 16px 18px;
		border-left: 3px solid #0066ff;
		border-radius: 0 12px 12px 0;
		background: #f4f8ff;
	}

	.callout b {
		display: block;
		color: #0052d4;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.callout p {
		margin-top: 4px;
		color: #3f5878;
		font-size: 12.5px;
		line-height: 1.6;
	}

	.setup,
	.related {
		margin-top: 52px;
		padding-top: 44px;
		border-top: 1px solid #edf2f9;
	}

	.setup-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 22px;
	}

	.setup-card {
		padding: 18px;
		border: 1px solid #e6edf7;
		border-radius: 14px;
		background: linear-gradient(165deg, #fbfdff, #fff 65%);
	}

	.setup-card > span {
		color: #0066ff;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.06em;
	}

	.setup-card h3 {
		margin-top: 7px;
		color: #17263d;
		font-size: 13.5px;
		font-weight: 720;
		line-height: 1.35;
	}

	.setup-card p {
		margin-top: 5px;
		color: #62728a;
		font-size: 12px;
		line-height: 1.6;
	}

	.related-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-top: 22px;
	}

	.related-card {
		display: flex;
		flex-direction: column;
		padding: 18px;
		border: 1px solid #e6edf7;
		border-radius: 14px;
		background: #fff;
		transition:
			transform 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.related-card:hover {
		transform: translateY(-2px);
		border-color: #cfdef3;
		box-shadow: 0 18px 34px -28px rgba(15, 23, 42, 0.35);
	}

	.cat-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		align-self: flex-start;
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.04em;
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
		background: #e8f9f2;
		color: #0b7a55;
	}

	.related-card > b {
		margin-top: 10px;
		color: #17263d;
		font-size: 13.5px;
		font-weight: 720;
		line-height: 1.35;
	}

	.related-card p {
		margin-top: 5px;
		color: #62728a;
		font-size: 11.5px;
		line-height: 1.55;
	}

	.related-card small {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 12px;
		color: #0052d4;
		font-size: 10.5px;
		font-weight: 700;
	}

	.final {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		margin-top: 56px;
		padding: 34px;
		border-radius: 22px;
		background:
			radial-gradient(ellipse at 88% 10%, rgba(0, 102, 255, 0.34), transparent 55%),
			#0b1220;
		color: #fff;
	}

	.final-eyebrow {
		color: #8fb8ff;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.final h2 {
		color: #fff;
	}

	.final p {
		max-width: 480px;
		margin-top: 10px;
		color: #b9c6dc;
		font-size: 12.5px;
		line-height: 1.6;
	}

	.final-actions {
		display: flex;
		flex: none;
		flex-direction: column;
		gap: 9px;
	}

	.final-actions :global(.gx-btn-dark) {
		background: #fff;
		color: #0b1220;
	}

	.final-actions :global(.gx-btn-light) {
		border-color: rgba(255, 255, 255, 0.22);
		background: transparent;
		color: #fff;
	}

	@media (max-width: 980px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas:
				'rail'
				'main';
			gap: 34px;
			padding-top: 34px;
		}

		.rail {
			position: static;
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 14px;
		}

		.rail-phases {
			min-width: 0;
		}
	}

	@media (max-width: 768px) {
		.gh {
			padding: 36px 0 34px;
		}

		.gh h1 {
			font-size: clamp(1.9rem, 8vw, 2.5rem);
		}

		.lede {
			font-size: 14.5px;
		}

		.layout {
			padding: 28px 20px 64px;
		}

		.rail {
			grid-template-columns: 1fr;
		}

		.timeline {
			padding-left: 34px;
		}

		.timeline::before {
			left: 11px;
		}

		.phase-dot {
			left: -34px;
			width: 24px;
			height: 24px;
			font-size: 10px;
		}

		.phase-top {
			align-items: flex-start;
			flex-direction: column;
			gap: 5px;
		}

		.phase-window {
			white-space: normal;
		}

		.setup-grid,
		.related-grid {
			grid-template-columns: 1fr;
		}

		.final {
			flex-direction: column;
			align-items: flex-start;
			padding: 26px;
		}

		.final-actions {
			width: 100%;
		}

		.final-actions :global(.gx-btn) {
			width: 100%;
		}

		.checkpoints {
			padding: 19px;
		}
	}
</style>
