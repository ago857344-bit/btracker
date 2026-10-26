<script lang="ts">
	import GuideShell from '$lib/components/guides/GuideShell.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { getGoalsByGroup, goalCount, goalGroups, goals } from '$lib/content/goals';

	const starters = [
		{ label: 'I am in Class 11', hint: 'Build the base now', slug: 'class-11-jee-foundation' },
		{ label: 'I am in Class 12', hint: 'Main + boards together', slug: 'class-12-boards-and-jee' },
		{ label: 'I am taking a drop year', hint: 'Full-time, with edges', slug: 'dropper-year-jee' },
		{ label: 'Main is 90 days away', hint: 'Triage and secure marks', slug: 'jee-main-90-day-sprint' },
		{ label: 'Main is done, Advanced next', hint: 'Depth and paper craft', slug: 'jee-advanced-2027' }
	];

	const collectionLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: 'BTracker Study Goals',
		description:
			'Free JEE study plans for Class 11, Class 12, droppers, the last 90 days before Main, and the Advanced paper.',
		url: 'https://btracker.app/goals',
		isAccessibleForFree: true,
		publisher: { '@type': 'Organization', name: 'BTracker', url: 'https://btracker.app' },
		hasPart: goals.map((goal) => ({
			'@type': 'Article',
			headline: goal.title,
			description: goal.description,
			url: `https://btracker.app/goals/${goal.slug}`
		}))
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: 'https://btracker.app/welcome' },
			{ '@type': 'ListItem', position: 2, name: 'Study Goals', item: 'https://btracker.app/goals' }
		]
	};
</script>

<svelte:head>
	<title>JEE Study Goals — Plans for Every Stage | BTracker</title>
	<meta
		name="description"
		content="Six free JEE study goal plans: Class 11 foundation, Class 12 with boards, a dropper year, the last 90 days before Main, Main 2027 and Advanced 2027. Pick the plan for your stage."
	/>
	<link rel="canonical" href="https://btracker.app/goals" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content="JEE Study Goals — BTracker" />
	<meta
		property="og:description"
		content="A JEE plan for the year you are actually in. Six free goal plans, from Class 11 to Advanced."
	/>
	<meta property="og:url" content="https://btracker.app/goals" />
	<meta property="og:image" content="https://btracker.app/landing/og-welcome.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="JEE Study Goals — BTracker" />
	<meta
		name="twitter:description"
		content="Six free JEE goal plans built around your stage: Class 11, Class 12, dropper year, 90-day sprint, Main and Advanced."
	/>
	<meta name="twitter:image" content="https://btracker.app/landing/og-welcome.jpg" />
	{@html `<script type="application/ld+json">${JSON.stringify(collectionLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<GuideShell>
	<section class="hero">
		<div class="gx-container hero-grid">
			<div>
				<p class="eyebrow"><span></span> BTracker Study Goals</p>
				<h1>A JEE plan for the year <br />you're <span class="blue">actually in</span>.</h1>
				<p class="hero-lede">
					Six goal plans built around where you are right now — Class 11, Class 12, a dropper year, or
					the last ninety days. Same free tracker. A different weekly rhythm for each one.
				</p>
				<div class="hero-meta">
					<span><b>{goalCount}</b> goal plans</span>
					<span><b>2 stages</b> of prep</span>
					<span><b>Free</b> to read and use</span>
				</div>
			</div>

			<aside class="starter-card" aria-label="Find your starting point">
				<p class="starter-label">Find your starting point</p>
				{#each starters as starter}
					<a href={`/goals/${starter.slug}`}>
						<span>
							<b>{starter.label}</b>
							<small>{starter.hint}</small>
						</span>
						<NavIcon name="arrow-right" size={15} />
					</a>
				{/each}
			</aside>
		</div>
	</section>

	<section class="groups">
		<div class="gx-container">
			{#each goalGroups as group}
				<div class="group" id={group.id}>
					<div class="group-head">
						<span class="group-icon {group.accent}"><NavIcon name={group.icon} size={17} /></span>
						<div>
							<h2>{group.label}</h2>
							<p>{group.blurb}</p>
						</div>
					</div>

					<div class="goal-grid">
						{#each getGoalsByGroup(group.id) as goal}
							<a class="goal-card" href={`/goals/${goal.slug}`}>
								<div class="card-top">
									<span class="goal-badge"><NavIcon name={goal.icon} size={12} /> {goal.badge}</span>
									<span class="card-arrow"><NavIcon name="arrow-right" size={15} /></span>
								</div>
								<h3>{goal.menuTitle}</h3>
								<p>{goal.description}</p>
								<div class="card-meta">
									<span><NavIcon name="clock" size={12} /> {goal.window}</span>
									<span><NavIcon name="pulse" size={12} /> {goal.weeklyHours}</span>
								</div>
								<div class="card-foot">
									<span>{goal.phases.length} phases · {goal.checkpoints.length} checkpoints</span>
									<span class="view">View plan <NavIcon name="arrow-right" size={13} /></span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="how">
		<div class="gx-container">
			<div class="how-head">
				<p class="eyebrow center"><span></span> How a goal plan works</p>
				<h2>The plan sets the rhythm.<br />The tracker keeps you honest.</h2>
			</div>
			<div class="how-grid">
				<div class="how-step">
					<span class="step-num">01</span>
					<h3>Pick the stage, not the fantasy</h3>
					<p>
						Choose the plan closest to where you are today. A 90-day sprint is not a worse plan than a
						twelve-month one — it is a different starting point.
					</p>
				</div>
				<div class="how-step">
					<span class="step-num">02</span>
					<h3>Set up three tags</h3>
					<p>
						Log every question by chapter, source and outcome. Every goal plan depends on those three
						fields — they are how the tracker knows what is leaking marks.
					</p>
				</div>
				<div class="how-step">
					<span class="step-num">03</span>
					<h3>Review, then change one thing</h3>
					<p>
						Every Sunday, read the week and change one thing. Use the
						<a href="/guides/weekly-review">20-minute weekly review</a> to make the plan survive contact
						with real life.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="cta-wrap">
		<div class="gx-container">
			<div class="cta">
				<div>
					<p class="cta-eyebrow">Start with one logged question</p>
					<h2>The plan is free. The tracker is free.</h2>
					<p>No card, no trial clock. Pick a goal, log today's questions, and let the week tell you what to fix.</p>
				</div>
				<div class="cta-actions">
					<a class="gx-btn gx-btn-dark gx-btn-lg" href="/login">Start tracking free <NavIcon name="arrow-right" size={16} /></a>
					<a class="gx-btn gx-btn-light gx-btn-lg" href="/guides">Read the study guides</a>
				</div>
			</div>
		</div>
	</section>
</GuideShell>

<style>
	a {
		text-decoration: none;
	}

	.hero {
		position: relative;
		padding: 76px 0 58px;
		background:
			radial-gradient(ellipse at 12% 8%, rgba(0, 102, 255, 0.07), transparent 55%),
			linear-gradient(180deg, #fbfdff, #fff);
		border-bottom: 1px solid #eef3fa;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
		gap: 56px;
		align-items: center;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border: 1px solid #dbe6f5;
		border-radius: 999px;
		background: #fff;
		color: #3f5677;
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.eyebrow span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #0066ff;
		box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.12);
	}

	.eyebrow.center {
		margin: 0 auto;
	}

	h1 {
		margin-top: 22px;
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: clamp(2.5rem, 4.6vw, 3.9rem);
		font-weight: 800;
		line-height: 1.04;
		letter-spacing: -0.055em;
	}

	h1 .blue {
		color: #0066ff;
	}

	.hero-lede {
		max-width: 570px;
		margin-top: 20px;
		color: #516079;
		font-size: 16.5px;
		line-height: 1.65;
	}

	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 22px;
		margin-top: 26px;
		color: #64748b;
		font-size: 12.5px;
	}

	.hero-meta b {
		color: #0f172a;
		font-weight: 750;
	}

	.starter-card {
		padding: 10px;
		border: 1px solid #e3eaf4;
		border-radius: 22px;
		background: #fff;
		box-shadow: 0 28px 60px -42px rgba(15, 23, 42, 0.45);
	}

	.starter-label {
		padding: 10px 12px 8px;
		color: #7c8ba1;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.starter-card a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px;
		border-radius: 13px;
		transition: background 0.16s;
	}

	.starter-card a:hover {
		background: #f4f8ff;
	}

	.starter-card b {
		display: block;
		color: #0f172a;
		font-size: 13.5px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.starter-card small {
		display: block;
		margin-top: 2px;
		color: #7b8aa0;
		font-size: 11.5px;
	}

	.starter-card :global(svg) {
		flex: none;
		color: #0066ff;
	}

	.groups {
		padding: 70px 0 20px;
	}

	.group + .group {
		margin-top: 66px;
	}

	.group-head {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		margin-bottom: 24px;
	}

	.group-icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 13px;
	}

	.group-icon.blue {
		background: #eaf2ff;
		color: #0052d4;
	}

	.group-icon.violet {
		background: #f3edff;
		color: #6d28d9;
	}

	.group-head h2 {
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.035em;
	}

	.group-head p {
		margin-top: 3px;
		color: #6b7a90;
		font-size: 13.5px;
	}

	.goal-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}

	.goal-card {
		display: flex;
		flex-direction: column;
		padding: 22px;
		border: 1px solid #e4ebf5;
		border-radius: 19px;
		background: #fff;
		transition:
			transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
			border-color 0.22s,
			box-shadow 0.22s;
	}

	.goal-card:hover {
		transform: translateY(-3px);
		border-color: #c9dbf4;
		box-shadow: 0 24px 46px -32px rgba(0, 82, 212, 0.35);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.goal-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 9px;
		border: 1px solid #e1eaf7;
		border-radius: 999px;
		background: #f7faff;
		color: #45618a;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 0.02em;
	}

	.card-arrow {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 1px solid #e6edf7;
		border-radius: 50%;
		color: #0066ff;
		transition:
			background 0.18s,
			transform 0.18s;
	}

	.goal-card:hover .card-arrow {
		background: #0066ff;
		color: #fff;
		transform: translateX(2px);
	}

	.goal-card h3 {
		margin-top: 16px;
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 19px;
		font-weight: 780;
		line-height: 1.25;
		letter-spacing: -0.03em;
	}

	.goal-card > p {
		margin-top: 9px;
		color: #61718a;
		font-size: 12.8px;
		line-height: 1.6;
	}

	.card-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		margin-top: 16px;
		color: #5a6b84;
		font-size: 11px;
		font-weight: 600;
	}

	.card-meta span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: auto;
		padding-top: 18px;
		color: #8a97aa;
		font-size: 10.5px;
	}

	.view {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #0052d4;
		font-weight: 750;
	}

	.how {
		padding: 70px 0;
	}

	.how-head {
		max-width: 660px;
		margin: 0 auto 36px;
		text-align: center;
	}

	.how-head h2 {
		margin-top: 18px;
		color: #0f172a;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: clamp(1.8rem, 3.2vw, 2.6rem);
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.04em;
	}

	.how-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}

	.how-step {
		padding: 24px;
		border: 1px solid #e7edf6;
		border-radius: 18px;
		background: linear-gradient(165deg, #fbfdff, #fff 60%);
	}

	.step-num {
		display: inline-block;
		color: #0066ff;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.06em;
	}

	.how-step h3 {
		margin-top: 10px;
		color: #0f172a;
		font-size: 16px;
		font-weight: 750;
		letter-spacing: -0.02em;
	}

	.how-step p {
		margin-top: 8px;
		color: #61718a;
		font-size: 12.8px;
		line-height: 1.65;
	}

	.how-step a {
		color: #0052d4;
		font-weight: 650;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.cta-wrap {
		padding: 10px 0 84px;
	}

	.cta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 40px;
		padding: 44px;
		border-radius: 26px;
		background:
			radial-gradient(ellipse at 85% 15%, rgba(0, 102, 255, 0.32), transparent 55%),
			#0b1220;
		color: #fff;
	}

	.cta-eyebrow {
		color: #8fb8ff;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.cta h2 {
		max-width: 560px;
		margin-top: 10px;
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: clamp(1.7rem, 2.8vw, 2.35rem);
		font-weight: 800;
		line-height: 1.12;
		letter-spacing: -0.04em;
	}

	.cta p:not(.cta-eyebrow) {
		max-width: 520px;
		margin-top: 12px;
		color: #b9c6dc;
		font-size: 13.5px;
		line-height: 1.6;
	}

	.cta-actions {
		display: flex;
		flex: none;
		flex-direction: column;
		gap: 10px;
	}

	.cta-actions :global(.gx-btn-dark) {
		background: #fff;
		color: #0b1220;
	}

	.cta-actions :global(.gx-btn-light) {
		border-color: rgba(255, 255, 255, 0.22);
		background: transparent;
		color: #fff;
	}

	@media (max-width: 980px) {
		.hero-grid {
			grid-template-columns: 1fr;
			gap: 38px;
		}

		.starter-card {
			max-width: 560px;
		}

		.goal-grid,
		.how-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.cta {
			flex-direction: column;
			align-items: flex-start;
			padding: 34px;
		}
	}

	@media (max-width: 640px) {
		.hero {
			padding: 52px 0 46px;
		}

		.hero-lede {
			font-size: 15px;
		}

		.hero-grid {
			padding: 0 20px;
		}

		.goal-grid,
		.how-grid {
			grid-template-columns: 1fr;
		}

		.groups {
			padding-top: 50px;
		}

		.group + .group {
			margin-top: 46px;
		}

		.group-head h2 {
			font-size: 22px;
		}

		.how {
			padding: 50px 0;
		}

		.cta-wrap {
			padding-bottom: 56px;
		}

		.cta {
			padding: 26px;
			border-radius: 22px;
		}

		.cta-actions {
			width: 100%;
		}

		.cta-actions :global(.gx-btn) {
			width: 100%;
		}
	}
</style>
