<script lang="ts">
	import { tick } from 'svelte';
	import { stages } from '$lib/content/stages';

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/stages`;

	let activeId: (typeof stages)[number]['id'] = stages[0].id;
	let tablistEl: HTMLElement;

	function selectTab(id: (typeof stages)[number]['id']) {
		activeId = id;
	}

	async function handleTabKey(event: KeyboardEvent, index: number) {
		let nextIndex = index;
		if (event.key === 'ArrowRight') nextIndex = (index + 1) % stages.length;
		else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + stages.length) % stages.length;
		else if (event.key === 'Home') nextIndex = 0;
		else if (event.key === 'End') nextIndex = stages.length - 1;
		else return;

		event.preventDefault();
		activeId = stages[nextIndex].id;
		await tick();
		const tabs = tablistEl?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
		tabs?.[nextIndex]?.focus();
	}

	const webPageLd = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'JEE Study Plans by Stage — Class 11, Class 12, Dropper | BTracker',
		description:
			'Tailored JEE preparation strategies for Class 11, Class 12, and dropper years, with timeline targets, revision cadence, and daily logging limits.',
		url: pageUrl,
		isPartOf: { '@type': 'WebSite', name: 'BTracker', url: origin },
		about: { '@type': 'Thing', name: 'JEE preparation' },
		isAccessibleForFree: true,
		inLanguage: 'en-IN'
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'Stages', item: pageUrl }
		]
	};
</script>

<svelte:head>
	<title>JEE Study Plans by Stage — Class 11, Class 12 &amp; Dropper | BTracker</title>
	<meta
		name="description"
		content="Tailored JEE strategies for every stage: Class 11 foundation, Class 12 boards plus JEE, and the dropper year. Timeline targets, revision cadence, and daily logging limits."
	/>
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content="JEE Study Plans by Stage — BTracker" />
	<meta
		property="og:description"
		content="Class 11, Class 12, and dropper plans with monthly targets, revision cadence, and realistic logging limits."
	/>
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="JEE Study Plans by Stage — BTracker" />
	<meta
		name="twitter:description"
		content="Class 11, Class 12, and dropper plans with monthly targets, revision cadence, and realistic logging limits."
	/>
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(webPageLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<div class="stages mx-auto w-[min(1180px,92vw)]">
	<header class="st-hero">
		<p class="site-mono">Stages / Tailored strategies</p>
		<div class="st-hero-grid">
			<h1 class="site-serif">Same syllabus.<br /><em>A different year.</em></h1>
			<div>
				<p>
					A Class 11 student with three free hours and a dropper with a full day should not be running
					the same plan. Pick the year you are actually in and take the targets, cadence, and logging
					limits that fit it.
				</p>
				<p class="st-hero-note">Targets are recommendations, not a contract. Adjust the numbers to your hours.</p>
			</div>
		</div>
	</header>

	<div class="switcher">
		<div class="stage-tabs" role="tablist" aria-label="Choose your stage" bind:this={tablistEl}>
			{#each stages as stage, index}
				<button
					type="button"
					role="tab"
					id={`tab-${stage.id}`}
					aria-selected={activeId === stage.id}
					aria-controls={`panel-${stage.id}`}
					tabindex={activeId === stage.id ? 0 : -1}
					class:on={activeId === stage.id}
					on:click={() => selectTab(stage.id)}
					on:keydown={(event) => handleTabKey(event, index)}
				>
					<span class="tab-index">{String(index + 1).padStart(2, '0')}</span>
					<span class="tab-text">
						<strong class="site-serif">{stage.tab}</strong>
						<small>{stage.tabSub}</small>
					</span>
				</button>
			{/each}
		</div>
	</div>

	{#each stages as stage}
		<div
			class="stage-panel"
			id={`panel-${stage.id}`}
			role="tabpanel"
			aria-labelledby={`tab-${stage.id}`}
			hidden={activeId !== stage.id}
			tabindex="0"
			data-stage={stage.id}
		>
			<div class="stage-panel-head">
				<div>
					<p class="site-mono">{stage.eyebrow}</p>
					<h2 class="site-serif">{stage.title}</h2>
					<p class="stage-panel-desc">{stage.description}</p>
				</div>
				<div class="focus-card">
					<p class="site-mono">Focus of the year</p>
					<ul>
						{#each stage.focus as point}
							<li>{point}</li>
						{/each}
					</ul>
					<p class="duration">{stage.duration}</p>
				</div>
			</div>

			<section class="block" aria-labelledby={`timeline-${stage.id}`}>
				<div class="block-head">
					<h3 id={`timeline-${stage.id}`} class="site-serif">Timeline targets</h3>
					<p>Four phases, one year. Each phase has a small number of things that must be true before moving on.</p>
				</div>
				<div class="phases">
					{#each stage.phases as phase}
						<article class="phase">
							<div class="phase-top">
								<span class="site-mono">{phase.label}</span>
								<span class="window">{phase.window}</span>
							</div>
							<h4 class="site-serif">{phase.heading}</h4>
							<p>{phase.text}</p>
							<ul>
								{#each phase.targets as target}
									<li>
										<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true">
											<path
												d="M2.5 7.4l3 3L11.5 4"
												fill="none"
												stroke="currentColor"
												stroke-width="1.6"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
										{target}
									</li>
								{/each}
							</ul>
						</article>
					{/each}
				</div>
			</section>

			<section class="block" aria-labelledby={`cadence-${stage.id}`}>
				<div class="block-head">
					<h3 id={`cadence-${stage.id}`} class="site-serif">Revision cadence</h3>
					<p>{stage.cadence.intro}</p>
				</div>
				<div class="cadence">
					{#each stage.cadence.rows as row}
						<div class="cadence-row">
							<span class="cadence-label">{row.label}</span>
							<span class="cadence-rhythm">{row.rhythm}</span>
							<p>{row.detail}</p>
						</div>
					{/each}
				</div>
				<p class="cadence-note">{stage.cadence.note}</p>
			</section>

			<section class="block" aria-labelledby={`limits-${stage.id}`}>
				<div class="block-head">
					<h3 id={`limits-${stage.id}`} class="site-serif">Daily logging limits</h3>
					<p>{stage.limits.intro}</p>
				</div>
				<div class="limits-grid">
					<div class="limit-cards">
						{#each stage.limits.cards as card}
							<div class="limit-card">
								<span class="site-mono">{card.label}</span>
								<p class="limit-value">{card.value}</p>
								<span class="limit-unit">{card.unit}</span>
								<p class="limit-detail">{card.detail}</p>
							</div>
						{/each}
					</div>
					<div class="rules">
						<p class="site-mono">House rules</p>
						<ol>
							{#each stage.limits.rules as rule, index}
								<li>
									<span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
									{rule}
								</li>
							{/each}
						</ol>
					</div>
				</div>
			</section>

			<section class="pitfalls" aria-labelledby={`pitfalls-${stage.id}`}>
				<div>
					<p class="site-mono">Watch for</p>
					<h3 id={`pitfalls-${stage.id}`} class="site-serif">The four ways this year goes sideways.</h3>
				</div>
				<ul>
					{#each stage.pitfalls as pitfall}
						<li>{pitfall}</li>
					{/each}
				</ul>
			</section>
		</div>
	{/each}

	<section class="closing">
		<div>
			<p class="site-mono">Next</p>
			<h2 class="site-serif">Turn the plan into<br /><em>today&rsquo;s work.</em></h2>
			<p>
				The tracker does not need the whole year. It needs today: what you studied, what went wrong, and
				what comes back for revision. That is enough to run any of these plans.
			</p>
		</div>
		<div class="closing-actions">
			<a class="btn-solid" href="/login" data-sveltekit-preload-data="hover">Open the tracker</a>
			<a class="btn-ghost" href="/playbooks" data-sveltekit-preload-data="hover">Browse playbooks</a>
		</div>
	</section>
</div>

<style>
	.stages {
		padding-top: clamp(28px, 5vw, 56px);
	}

	.st-hero {
		padding-bottom: clamp(30px, 4vw, 48px);
	}
	.st-hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.9fr);
		gap: clamp(24px, 5vw, 74px);
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
	.st-hero-grid > div > p {
		margin: 0;
		max-width: 46ch;
		font-size: 14.5px;
		line-height: 1.65;
		color: var(--color-muted);
	}
	.st-hero-note {
		margin-top: 14px !important;
		padding-top: 14px;
		border-top: 1px solid var(--color-line);
		font-family: var(--font-mono);
		font-size: 9px !important;
		letter-spacing: 0.06em;
		line-height: 1.6 !important;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.switcher {
		position: sticky;
		top: 84px;
		z-index: 12;
		padding: 8px 0;
		background: linear-gradient(var(--color-cream) 72%, transparent);
	}
	.stage-tabs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		padding: 6px;
		border: 1px solid var(--color-line);
		border-radius: 20px;
		background: var(--color-cream-2);
		box-shadow: 0 12px 30px -28px rgba(15, 46, 32, 0.6);
	}
	.stage-tabs button {
		display: flex;
		align-items: center;
		gap: 13px;
		padding: 12px 15px;
		border: 0;
		border-radius: 14px;
		background: transparent;
		color: var(--color-muted);
		text-align: left;
		cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
	}
	.stage-tabs button:hover {
		color: var(--color-forest);
		background: color-mix(in srgb, var(--color-cream) 65%, transparent);
	}
	.stage-tabs button.on {
		background: var(--color-forest);
		color: var(--color-cream);
		box-shadow: 0 10px 20px -16px rgba(15, 46, 32, 0.9);
	}
	.tab-index {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.06em;
		opacity: 0.55;
	}
	.tab-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.tab-text strong {
		font-size: 1.2rem;
		font-weight: 400;
		line-height: 1;
	}
	.tab-text small {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.stage-panel {
		padding-top: clamp(34px, 5vw, 62px);
		animation: stage-in 0.3s ease both;
	}
	.stage-panel[hidden] {
		display: none;
	}
	.stage-panel:focus {
		outline: none;
	}
	@keyframes stage-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}

	.stage-panel-head {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.85fr);
		gap: clamp(24px, 5vw, 64px);
		align-items: start;
		padding-bottom: clamp(34px, 5vw, 54px);
		border-bottom: 1px solid var(--color-line);
	}
	.stage-panel[data-stage='class-11'] {
		--stage-tint: var(--color-mint);
	}
	.stage-panel[data-stage='class-12'] {
		--stage-tint: var(--color-peach);
	}
	.stage-panel[data-stage='dropper'] {
		--stage-tint: var(--color-butter);
	}
	h2 {
		margin: 12px 0 16px;
		font-size: clamp(2.3rem, 4.8vw, 3.9rem);
		line-height: 0.96;
		color: var(--color-forest);
		text-wrap: balance;
	}
	.stage-panel-desc {
		margin: 0;
		max-width: 58ch;
		font-size: 14.5px;
		line-height: 1.7;
		color: var(--color-muted);
	}
	.focus-card {
		padding: 20px 22px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 12%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--stage-tint) 64%, var(--color-cream));
	}
	.focus-card ul {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
	}
	.focus-card li {
		position: relative;
		padding-left: 15px;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--color-forest);
	}
	.focus-card li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 6px;
		width: 5px;
		height: 5px;
		border-radius: 99px;
		background: var(--color-forest);
	}
	.duration {
		margin: 16px 0 0;
		padding-top: 13px;
		border-top: 1px solid color-mix(in srgb, var(--color-forest) 14%, transparent);
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.08em;
		line-height: 1.6;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 70%, transparent);
	}

	.block {
		padding: clamp(34px, 5vw, 54px) 0;
		border-bottom: 1px solid var(--color-line);
	}
	.block-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 12px clamp(24px, 5vw, 64px);
		align-items: end;
		margin-bottom: 24px;
	}
	.block-head h3 {
		margin: 0;
		font-size: clamp(1.8rem, 3.2vw, 2.5rem);
		color: var(--color-forest);
	}
	.block-head p {
		margin: 0;
		max-width: 56ch;
		font-size: 12.5px;
		line-height: 1.65;
		color: var(--color-muted);
	}

	.phases {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.phase {
		padding: 22px 22px 20px;
		border: 1px solid var(--color-line);
		border-radius: 16px;
		background: var(--color-cream-2);
	}
	.phase-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.window {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.06em;
		color: color-mix(in srgb, var(--color-forest) 55%, transparent);
	}
	.phase h4 {
		margin: 12px 0 7px;
		font-size: 1.55rem;
		font-weight: 400;
		line-height: 1;
		color: var(--color-forest);
	}
	.phase > p {
		margin: 0 0 15px;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.phase ul {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 14px 0 0;
		border-top: 1px solid var(--color-line);
		list-style: none;
	}
	.phase li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 11.5px;
		line-height: 1.5;
		color: color-mix(in srgb, var(--color-ink) 82%, var(--color-muted));
	}
	.phase li svg {
		flex: none;
		margin-top: 2px;
		color: var(--color-forest);
	}

	.cadence {
		border-top: 1px solid var(--color-line);
	}
	.cadence-row {
		display: grid;
		grid-template-columns: 130px 130px minmax(0, 1fr);
		gap: 20px;
		align-items: baseline;
		padding: 15px 0;
		border-bottom: 1px solid var(--color-line);
	}
	.cadence-label {
		font-size: 13px;
		font-weight: 650;
		color: var(--color-forest);
	}
	.cadence-rhythm {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.cadence-row p {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.cadence-note {
		margin: 16px 0 0;
		padding: 14px 18px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--stage-tint) 55%, var(--color-cream));
		font-family: var(--font-serif);
		font-size: 1.2rem;
		line-height: 1.3;
		letter-spacing: -0.01em;
		color: var(--color-forest);
	}

	.limits-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.85fr);
		gap: 14px;
		align-items: start;
	}
	.limit-cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.limit-card {
		display: flex;
		flex-direction: column;
		padding: 20px 18px;
		border: 1px solid var(--color-line);
		border-radius: 16px;
		background: var(--color-cream-2);
	}
	.limit-value {
		margin: 16px 0 0;
		font-family: var(--font-serif);
		font-size: clamp(2.1rem, 4vw, 2.9rem);
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--color-forest);
	}
	.limit-unit {
		margin-top: 4px;
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.limit-detail {
		margin: 12px 0 0;
		padding-top: 11px;
		border-top: 1px solid var(--color-line);
		font-size: 11px;
		line-height: 1.55;
		color: var(--color-muted);
	}
	.rules {
		padding: 20px;
		border-radius: 16px;
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.rules :global(.site-mono) {
		color: color-mix(in srgb, var(--color-cream) 50%, transparent);
	}
	.rules ol {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 15px 0 0;
		padding: 0;
		list-style: none;
		counter-reset: rules;
	}
	.rules li {
		display: flex;
		gap: 9px;
		font-size: 11.5px;
		line-height: 1.55;
		color: color-mix(in srgb, var(--color-cream) 80%, transparent);
	}
	.rules li span {
		flex: none;
		font-family: var(--font-mono);
		font-size: 8px;
		padding-top: 2px;
		color: var(--color-mint);
	}

	.pitfalls {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		gap: clamp(24px, 5vw, 64px);
		padding: clamp(34px, 5vw, 54px) 0;
	}
	.pitfalls h3 {
		margin: 12px 0 0;
		font-size: clamp(1.7rem, 3.2vw, 2.4rem);
		line-height: 1.02;
		color: var(--color-forest);
	}
	.pitfalls ul {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--color-line);
	}
	.pitfalls li {
		position: relative;
		padding: 14px 0 14px 24px;
		border-bottom: 1px solid var(--color-line);
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.pitfalls li::before {
		content: '\00d7';
		position: absolute;
		left: 0;
		top: 13px;
		font-family: var(--font-serif);
		font-size: 1rem;
		color: var(--color-forest);
	}

	.closing {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 28px;
		margin-top: clamp(20px, 3vw, 36px);
		padding: clamp(32px, 5vw, 56px);
		border-radius: 30px;
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.closing > div:first-child {
		max-width: 620px;
	}
	.closing :global(.site-mono) {
		color: color-mix(in srgb, var(--color-cream) 50%, transparent);
	}
	.closing h2 {
		margin: 12px 0 14px;
		font-size: clamp(2rem, 4.2vw, 3.4rem);
		line-height: 0.98;
		color: var(--color-cream);
	}
	.closing h2 em {
		color: var(--color-mint);
	}
	.closing p {
		margin: 0;
		max-width: 52ch;
		font-size: 13.5px;
		line-height: 1.65;
		color: color-mix(in srgb, var(--color-cream) 72%, transparent);
	}
	.closing-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
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
		transition: transform 0.18s ease, background 0.18s ease;
	}
	.btn-solid {
		background: var(--color-cream);
		color: var(--color-forest);
	}
	.btn-solid:hover {
		background: #ffffff;
		transform: translateY(-1px);
	}
	.btn-ghost {
		border: 1px solid color-mix(in srgb, var(--color-cream) 30%, transparent);
		color: var(--color-cream);
	}
	.btn-ghost:hover {
		border-color: color-mix(in srgb, var(--color-cream) 60%, transparent);
		transform: translateY(-1px);
	}

	@media (max-width: 940px) {
		.st-hero-grid {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
			gap: 22px;
		}
		.stage-panel-head {
			grid-template-columns: minmax(0, 1fr);
		}
		.block-head {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
		}
		.limits-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.pitfalls {
			grid-template-columns: minmax(0, 1fr);
			gap: 22px;
		}
		.switcher {
			top: 72px;
		}
	}
	@media (max-width: 768px) {
		.stage-tabs {
			display: flex;
			overflow-x: auto;
			border-radius: 16px;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}
		.stage-tabs::-webkit-scrollbar {
			display: none;
		}
		.stage-tabs button {
			flex: 0 0 auto;
			padding: 10px 14px;
		}
		.tab-index {
			display: none;
		}
		.tab-text strong {
			font-size: 1.05rem;
		}
		.phases {
			grid-template-columns: minmax(0, 1fr);
		}
		.cadence-row {
			grid-template-columns: 1fr auto;
			gap: 4px 14px;
		}
		.cadence-row p {
			grid-column: 1 / -1;
		}
		.limit-cards {
			grid-template-columns: minmax(0, 1fr);
		}
		.limit-card {
			padding: 18px;
		}
		.limit-value {
			margin-top: 10px;
		}
		.closing {
			border-radius: 22px;
		}
	}
	@media (max-width: 480px) {
		h1 {
			font-size: 2.65rem;
		}
		.switcher {
			top: 64px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stage-panel {
			animation: none;
		}
		.stage-tabs button,
		.btn-solid,
		.btn-ghost {
			transition: none;
		}
	}
</style>
