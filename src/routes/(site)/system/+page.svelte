<script lang="ts">
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import {
		auditCategoryOrder,
		auditQuestions,
		auditRecommendations,
		systemCategories,
		systemStrategies,
		type AuditCategory,
		type SystemCategoryId
	} from '$lib/content/system';

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/system`;
	const pageDescription =
		'Top-rank study strategies backed by cognitive science—mechanized into daily habits by BTracker. Four systems for retention, mocks, interleaving, and focus.';

	let activeFilter: SystemCategoryId = 'all';

	$: visibleStrategies =
		activeFilter === 'all'
			? systemStrategies
			: systemStrategies.filter((strategy) => strategy.category === activeFilter);

	function countFor(id: SystemCategoryId) {
		return id === 'all'
			? systemStrategies.length
			: systemStrategies.filter((strategy) => strategy.category === id).length;
	}

	const reviewIntervals = [
		{ days: 1, load: 18 },
		{ days: 3, load: 11 },
		{ days: 7, load: 6 },
		{ days: 21, load: 2 }
	];
	let reviewDays = 3;
	$: reviewPick = reviewIntervals.find((interval) => interval.days === reviewDays) ?? reviewIntervals[1];

	interface MistakeTag {
		id: string;
		label: string;
		repair: string;
	}
	const mistakeTags: MistakeTag[] = [
		{
			id: 'concept',
			label: 'Concept gap',
			repair:
				'Re-derive the torque condition from first principles, then attempt two fresh problems without the solution open.'
		},
		{
			id: 'calc',
			label: 'Calculation slip',
			repair:
				'Rework the same question with units tracked in the margin. If the slip repeats, add it to a weekly calculation drill.'
		},
		{
			id: 'time',
			label: 'Time trap',
			repair:
				'Redo the question under a 4-minute cap. If it overruns, move it to a timed mixed set instead of another untimed attempt.'
		},
		{
			id: 'misread',
			label: 'Misread',
			repair:
				'Rewrite the question in one line before solving. Underline the quantity being asked before touching the options.'
		}
	];
	let mistakeTag = 'concept';
	$: mistakePick = mistakeTags.find((tag) => tag.id === mistakeTag) ?? mistakeTags[0];

	interface SprintItem {
		id: string;
		subject: string;
		chapter: string;
		type: string;
	}
	const sprintItems: SprintItem[] = [
		{ id: 'rotation', subject: 'Physics', chapter: 'Rotational motion', type: 'Single correct' },
		{ id: 'equilibrium', subject: 'Chemistry', chapter: 'Chemical equilibrium', type: 'Single correct' },
		{ id: 'integration', subject: 'Maths', chapter: 'Definite integration', type: 'Numerical' },
		{ id: 'thermo', subject: 'Chemistry', chapter: 'Thermodynamics', type: 'Single correct' }
	];
	let sprintOrder = sprintItems.map((item) => item.id);
	let revealTopics = false;
	$: sprintQueue = sprintOrder
		.map((id) => sprintItems.find((item) => item.id === id))
		.filter((item): item is SprintItem => item !== undefined);

	function rotateSprint() {
		sprintOrder = [...sprintOrder.slice(1), sprintOrder[0]];
	}

	interface FocusTarget {
		id: string;
		subject: string;
		chapter: string;
		progress: string;
	}
	const focusTargets: FocusTarget[] = [
		{ id: 'rotation', subject: 'Physics', chapter: 'Rotational motion', progress: '2/6 modules' },
		{ id: 'integration', subject: 'Maths', chapter: 'Definite integration', progress: '1/5 modules' },
		{ id: 'equilibrium', subject: 'Chemistry', chapter: 'Chemical equilibrium', progress: '3/4 modules' }
	];
	let focusTarget = 'rotation';
	let focusMode: 90 | 20 = 90;
	$: focusPick = focusTargets.find((target) => target.id === focusTarget) ?? focusTargets[0];

	let auditCardEl: HTMLDivElement;
	let auditAnswers: AuditCategory[] = [];
	let auditDone = false;

	$: auditIndex = Math.min(auditAnswers.length, auditQuestions.length - 1);
	$: auditQuestion = auditQuestions[auditIndex];
	$: auditTally = auditAnswers.reduce<Record<AuditCategory, number>>(
		(tally, answer) => ({ ...tally, [answer]: tally[answer] + 1 }),
		{ retention: 0, mock: 0, interleaving: 0, focus: 0 }
	);
	$: auditTop = auditCategoryOrder.reduce<AuditCategory>(
		(best, id) => (auditTally[id] > auditTally[best] ? id : best),
		auditAnswers[0] ?? 'retention'
	);
	$: auditResult = auditDone ? auditRecommendations[auditTop] : null;

	async function focusAuditPrompt() {
		await tick();
		auditCardEl?.querySelector<HTMLElement>('[data-audit-focus]')?.focus();
	}

	async function chooseAudit(category: AuditCategory) {
		if (auditDone) return;
		auditAnswers = [...auditAnswers, category];
		auditDone = auditAnswers.length === auditQuestions.length;
		await focusAuditPrompt();
	}

	async function goBackAudit() {
		if (!auditAnswers.length) return;
		auditDone = false;
		auditAnswers = auditAnswers.slice(0, -1);
		await focusAuditPrompt();
	}

	function resetAudit() {
		auditAnswers = [];
		auditDone = false;
	}

	const pageLd = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'The JEE Operating System — BTracker',
		description: pageDescription,
		url: pageUrl,
		isPartOf: { '@type': 'WebSite', name: 'BTracker', url: origin },
		mainEntity: {
			'@type': 'ItemList',
			name: 'Four study systems for JEE preparation',
			itemListElement: systemStrategies.map((strategy, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: `${strategy.title} (${strategy.parenthetical})`,
				description: strategy.principle,
				url: `${origin}${strategy.playbook.href}`
			}))
		}
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'The system', item: pageUrl }
		]
	};
</script>

<svelte:head>
	<title>The JEE Operating System — Study Strategies, Mechanized | BTracker</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content="The JEE Operating System — BTracker" />
	<meta
		property="og:description"
		content="Four cognitive-science strategies for JEE prep, each paired with the BTracker tool that removes the manual work."
	/>
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="The JEE Operating System — BTracker" />
	<meta
		name="twitter:description"
		content="Spaced repetition, error taxonomy, interleaving, and deep work — mechanized into daily habits."
	/>
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(pageLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<div class="system mx-auto w-[min(1180px,92vw)]">
	<section class="sys-hero">
		<p class="site-mono">The system / Cognitive science, mechanized</p>
		<div class="sys-hero-grid">
			<h1 class="site-serif">The JEE <br /><em>Operating System.</em></h1>
			<div class="sys-hero-side">
				<p class="sys-lede">
					Top-rank study strategies backed by cognitive science—mechanized into daily habits by
					BTracker.
				</p>
				<ul class="sys-hero-stats">
					<li><strong>04</strong><span>core systems</span></li>
					<li><strong>03</strong><span>audit questions</span></li>
					<li><strong>00</strong><span>paid tiers</span></li>
				</ul>
				<a class="sys-hero-jump" href="#matrix">
					Open the matrix
					<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
						<path
							d="M8 2v11M4 9l4 4 4-4"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</a>
			</div>
		</div>
	</section>

	<div class="sys-jump">
		<div class="sys-filter" role="group" aria-label="Filter strategies">
			{#each systemCategories as category}
				<button
					type="button"
					class:on={activeFilter === category.id}
					aria-pressed={activeFilter === category.id}
					on:click={() => (activeFilter = category.id)}
				>
					{category.label} <span>{countFor(category.id)}</span>
				</button>
			{/each}
		</div>
	</div>

	<p class="sys-sr" aria-live="polite">
		Showing {visibleStrategies.length} of {systemStrategies.length} strategies.
	</p>

	<section class="sys-matrix" id="matrix" aria-labelledby="matrix-heading">
		<div class="sys-matrix-head">
			<h2 id="matrix-heading" class="site-serif">Four systems, one daily loop.</h2>
			<p>
				The left column is the science. The right column is the tool that removes the manual work. Cards
				are working samples — inside the tracker they run on your logged questions.
			</p>
		</div>

		<div class="sys-list">
			{#each visibleStrategies as strategy (strategy.id)}
				<article
					class="sys-strategy"
					data-category={strategy.category}
					animate:flip={{ duration: 340 }}
					in:fade={{ duration: 220 }}
					out:fade={{ duration: 140 }}
				>
					<div class="sys-copy">
						<div class="sys-kicker">
							<span class="sys-num">{strategy.number}</span>
							<span class="sys-cat">{strategy.categoryLabel}</span>
						</div>
						<h2 class="site-serif">
							{strategy.title}<br /><em>{strategy.parenthetical}</em>
						</h2>
						<p class="sys-principle">{strategy.principle}</p>
						<div class="sys-failure">
							<p class="site-mono">Why manual fails</p>
							<p>{strategy.failure}</p>
						</div>
						<div class="sys-benchmark">
							<p class="site-mono">Benchmark</p>
							<p>{strategy.benchmark}</p>
						</div>
						<a class="sys-link" href={strategy.playbook.href} data-sveltekit-preload-data="hover">
							{strategy.playbook.label}
							<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
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

					<div class="sys-demo" class:sys-demo--lav={strategy.id === 'interleaving'}>
						<div class="sys-demo-top">
							<span class="sys-demo-app">
								<span class="sys-demo-mark" aria-hidden="true">B</span>
								{strategy.demoTitle}
							</span>
							<span class="sys-demo-tag">Interactive sample</span>
						</div>

						{#if strategy.id === 'spaced-repetition'}
							<div class="sys-review-question">
								<span class="sys-mini-tag">Physics · Q.14</span>
								<p>Torque about a fixed axis</p>
							</div>
							<div class="sys-review-count">
								<div>
									<p class="site-mono">Next check</p>
									<p class="sys-review-big">
										<strong>{reviewPick.days}</strong>
										<span>{reviewPick.days === 1 ? 'day' : 'days'}</span>
									</p>
								</div>
								<p class="sys-review-load">
									{reviewPick.load} questions<br />return that day
								</p>
							</div>
							<div class="sys-stage-picker" role="group" aria-label="Preview revision interval">
								{#each reviewIntervals as interval}
									<button
										type="button"
										class:on={interval.days === reviewDays}
										aria-pressed={interval.days === reviewDays}
										on:click={() => (reviewDays = interval.days)}
									>
										<span class="sys-stage-dot" aria-hidden="true"></span>
										<span class="sys-stage-day">{interval.days}d</span>
									</button>
								{/each}
							</div>
							<p class="sys-review-caption">
								Pick an interval. In the tracker, every logged question enters this queue and moves
								through all four reviews automatically.
							</p>
						{:else if strategy.id === 'post-mortem'}
							<div class="sys-mistake-head">
								<div>
									<span class="sys-mini-tag">Physics · Q.14</span>
									<p>Torque and equilibrium</p>
								</div>
								<span class="sys-marks">−4</span>
							</div>
							<p class="sys-field-label site-mono">Classify the error</p>
							<div class="sys-mistake-tags" role="group" aria-label="Select an error category">
								{#each mistakeTags as tag}
									<button
										type="button"
										class:on={mistakeTag === tag.id}
										aria-pressed={mistakeTag === tag.id}
										on:click={() => (mistakeTag = tag.id)}
									>
										{tag.label}
									</button>
								{/each}
							</div>
							<div class="sys-repair">
								<p class="site-mono">Repair plan</p>
								<p>{mistakePick.repair}</p>
							</div>
							<p class="sys-review-caption">
								Classify within 48 hours. The tracker keeps the cause attached to the question, so
								the next mock shows a pattern instead of a score.
							</p>
						{:else if strategy.id === 'interleaving'}
							<div class="sys-sprint-meta">
								<span>Mixed set 04</span>
								<span>3 subjects · 4 questions</span>
							</div>
							<ul class="sys-sprint-list">
								{#each sprintQueue as item, index (item.id)}
									<li animate:flip={{ duration: 300 }}>
										<span class="sys-sprint-index">{String(index + 1).padStart(2, '0')}</span>
										<span class="sys-sprint-subject">{item.subject}</span>
										<span class="sys-sprint-topic" class:hidden={!revealTopics}>
											{revealTopics ? item.chapter : 'Topic hidden until attempt'}
										</span>
										<span class="sys-sprint-type">{item.type}</span>
									</li>
								{/each}
							</ul>
							<div class="sys-sprint-actions">
								<button type="button" on:click={rotateSprint}>Shuffle order</button>
								<button
									type="button"
									class:on={revealTopics}
									aria-pressed={revealTopics}
									on:click={() => (revealTopics = !revealTopics)}
								>
									{revealTopics ? 'Hide topics' : 'Reveal topics'}
								</button>
							</div>
							<p class="sys-review-caption">
								The chapter label is the clue the exam never gives you. Keep it hidden until the
								attempt is finished.
							</p>
						{:else}
							<div class="sys-focus-main">
								<div class="sys-dial" style={`--pct:${focusMode === 90 ? '78%' : '26%'}`}>
									<div class="sys-dial-inner">
										<strong>{focusMode}</strong>
										<span>minutes</span>
										<p>{focusMode === 90 ? 'deep block' : 'reset'}</p>
									</div>
								</div>
								<div class="sys-focus-modes" role="group" aria-label="Preview block length">
									<button
										type="button"
										class:on={focusMode === 90}
										aria-pressed={focusMode === 90}
										on:click={() => (focusMode = 90)}
									>
										<span>90 min</span>
										<small>deep</small>
									</button>
									<button
										type="button"
										class:on={focusMode === 20}
										aria-pressed={focusMode === 20}
										on:click={() => (focusMode = 20)}
									>
										<span>20 min</span>
										<small>reset</small>
									</button>
								</div>
							</div>
							<p class="sys-field-label site-mono">Target block</p>
							<div class="sys-focus-targets" role="group" aria-label="Select a focus target">
								{#each focusTargets as target}
									<button
										type="button"
										class:on={focusTarget === target.id}
										aria-pressed={focusTarget === target.id}
										on:click={() => (focusTarget = target.id)}
									>
										<span class="sys-target-dot" aria-hidden="true"></span>
										<span class="sys-target-chapter">
											<small>{target.subject}</small>
											{target.chapter}
										</span>
										<span class="sys-target-progress">{target.progress}</span>
									</button>
								{/each}
							</div>
							<p class="sys-review-caption">
								One target: <strong>{focusPick.chapter}</strong>. In the tracker this starts the
								focus timer and records the block against that chapter.
							</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</section>

	<section class="sys-audit" id="audit" aria-labelledby="audit-heading">
		<div class="sys-audit-copy">
			<p class="site-mono">The audit / 3 questions</p>
			<h2 id="audit-heading" class="site-serif">
				Where does your prep<br /><em>leak effort?</em>
			</h2>
			<p>
				Most aspirants add more hours before they find the leak. Answer three questions and the audit
				names the system your week is missing — then shows exactly how BTracker would automate it.
			</p>
			<ul class="sys-audit-points">
				<li><span>01</span> No sign-up, no email.</li>
				<li><span>02</span> Answers stay on this page.</li>
				<li><span>03</span> One recommendation, not a dashboard.</li>
			</ul>
		</div>

		<div class="sys-audit-card" bind:this={auditCardEl}>
			{#if auditResult}
				<div class="sys-audit-result" aria-live="polite">
					<p class="site-mono">{auditResult.eyebrow}</p>
					<h3 class="site-serif" tabindex="-1" data-audit-focus>{auditResult.headline}</h3>
					<p>{auditResult.body}</p>

					<div class="sys-audit-bars">
						{#each auditCategoryOrder as category}
							<div class="sys-audit-bar">
								<span>{auditRecommendations[category].profileLabel}</span>
								<span class="sys-audit-bar-track">
									<i style:width={`${(auditTally[category] / auditQuestions.length) * 100}%`}></i>
								</span>
								<strong>{auditTally[category]}/{auditQuestions.length}</strong>
							</div>
						{/each}
					</div>

					<div class="sys-audit-rec">
						<p class="site-mono">Recommended system</p>
						<strong>{auditResult.strategy}</strong>
					</div>
					<ul class="sys-audit-automates">
						{#each auditResult.automates as item}
							<li>{item}</li>
						{/each}
					</ul>

					<a class="sys-audit-cta" href="/login" data-sveltekit-preload-data="hover">
						Automate this strategy in BTracker →
					</a>
					<div class="sys-audit-result-foot">
						<a href={auditResult.playbook.href} data-sveltekit-preload-data="hover">
							{auditResult.playbook.label}
						</a>
						<button type="button" on:click={resetAudit}>Retake audit</button>
					</div>
				</div>
			{:else}
				<div class="sys-audit-progress">
					<span class="site-mono">Question {auditAnswers.length + 1} of {auditQuestions.length}</span>
					<span class="sys-audit-dots" aria-hidden="true">
						{#each auditQuestions as question, index}
							<i class:on={index <= auditAnswers.length - 1}></i>
						{/each}
					</span>
				</div>

				{#key auditAnswers.length}
					<div class="sys-audit-q" in:fade={{ duration: 180 }}>
						<p class="site-mono">Leak check / {auditQuestion.id}</p>
						<h3 class="site-serif" tabindex="-1" data-audit-focus>{auditQuestion.prompt}</h3>
						<p class="sys-audit-hint">{auditQuestion.hint}</p>
						<div class="sys-audit-options">
							{#each auditQuestion.options as option}
								<button type="button" on:click={() => chooseAudit(option.category)}>
									<span>{option.label}</span>
									<span aria-hidden="true">→</span>
								</button>
							{/each}
						</div>
						{#if auditAnswers.length > 0}
							<button type="button" class="sys-audit-back" on:click={goBackAudit}>
								← Previous question
							</button>
						{/if}
					</div>
				{/key}
			{/if}
		</div>
	</section>
</div>

<style>
	.system {
		padding-bottom: clamp(20px, 4vw, 40px);
	}

	.sys-hero {
		padding: clamp(30px, 5vw, 62px) 0 clamp(28px, 4vw, 46px);
		border-bottom: 1px solid var(--color-line);
	}
	.sys-hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.82fr);
		gap: clamp(24px, 5vw, 72px);
		align-items: end;
		margin-top: 18px;
	}
	h1 {
		margin: 0;
		font-size: clamp(3rem, 8.6vw, 6.8rem);
		line-height: 0.9;
		letter-spacing: -0.035em;
		color: var(--color-forest);
		text-wrap: balance;
	}
	h1 em {
		font-style: italic;
	}
	.sys-hero-side {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 22px;
		padding-bottom: 8px;
	}
	.sys-lede {
		margin: 0;
		max-width: 45ch;
		font-size: 15px;
		line-height: 1.62;
		color: var(--color-muted);
	}
	.sys-hero-stats {
		display: flex;
		gap: 26px;
		width: 100%;
		margin: 0;
		padding: 17px 0 0;
		border-top: 1px solid var(--color-line);
		list-style: none;
	}
	.sys-hero-stats li {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.sys-hero-stats strong {
		font-family: var(--font-serif);
		font-size: 1.7rem;
		font-weight: 400;
		line-height: 1;
		color: var(--color-forest);
	}
	.sys-hero-stats span {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.sys-hero-jump {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding-bottom: 3px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-forest) 35%, transparent);
		font-size: 12px;
		font-weight: 650;
		color: var(--color-forest);
	}
	.sys-hero-jump svg {
		transition: transform 0.2s ease;
	}
	.sys-hero-jump:hover svg {
		transform: translateY(3px);
	}

	.sys-jump {
		position: sticky;
		top: 84px;
		z-index: 35;
		display: flex;
		justify-content: center;
		padding: 14px 0 10px;
		pointer-events: none;
	}
	.sys-filter {
		pointer-events: auto;
		display: flex;
		gap: 2px;
		max-width: 100%;
		padding: 5px;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-cream) 90%, transparent);
		backdrop-filter: blur(16px) saturate(150%);
		-webkit-backdrop-filter: blur(16px) saturate(150%);
		box-shadow:
			0 1px 2px rgba(20, 20, 19, 0.04),
			0 12px 30px -22px rgba(20, 20, 19, 0.45);
	}
	.sys-filter button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 14px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}
	.sys-filter button span {
		font-family: var(--font-mono);
		font-size: 9px;
		opacity: 0.65;
	}
	.sys-filter button:hover {
		color: var(--color-forest);
	}
	.sys-filter button.on {
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.sys-filter button.on span {
		opacity: 0.72;
	}

	.sys-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.sys-matrix {
		padding-top: clamp(10px, 2vw, 18px);
		scroll-margin-top: 170px;
	}
	.sys-audit {
		scroll-margin-top: 170px;
	}
	.sys-matrix-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: clamp(18px, 4vw, 54px);
		padding-bottom: clamp(18px, 3vw, 30px);
	}
	.sys-matrix-head h2 {
		margin: 0;
		font-size: clamp(1.85rem, 3.2vw, 2.6rem);
		color: var(--color-forest);
	}
	.sys-matrix-head p {
		margin: 0;
		max-width: 40ch;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--color-muted);
	}

	.sys-list {
		display: flex;
		flex-direction: column;
	}
	.sys-strategy {
		display: grid;
		grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.92fr);
		gap: clamp(26px, 5vw, 72px);
		align-items: start;
		padding: clamp(34px, 5vw, 58px) 0;
		border-top: 1px solid var(--color-line);
	}
	.sys-strategy:last-child {
		border-bottom: 1px solid var(--color-line);
	}

	.sys-copy {
		padding-top: 2px;
	}
	.sys-kicker {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 18px;
	}
	.sys-num {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		color: color-mix(in srgb, var(--color-forest) 42%, transparent);
	}
	.sys-cat {
		padding: 4px 9px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 18%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-mint) 52%, var(--color-cream));
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-forest);
	}
	article[data-category='mock'] .sys-cat {
		background: color-mix(in srgb, var(--color-peach) 58%, var(--color-cream));
	}
	article[data-category='focus'] .sys-cat {
		background: color-mix(in srgb, var(--color-butter) 72%, var(--color-cream));
	}
	.sys-copy h2 {
		margin: 0 0 16px;
		font-size: clamp(2.05rem, 3.8vw, 3.2rem);
		line-height: 0.94;
		color: var(--color-forest);
	}
	.sys-copy h2 em {
		font-style: italic;
		color: color-mix(in srgb, var(--color-forest) 76%, transparent);
	}
	.sys-principle {
		margin: 0;
		max-width: 52ch;
		font-size: 14px;
		line-height: 1.68;
		color: var(--color-muted);
	}
	.sys-failure {
		margin-top: 22px;
		padding: 14px 17px;
		border-left: 2px solid color-mix(in srgb, var(--color-forest) 34%, transparent);
		border-radius: 0 13px 13px 0;
		background: var(--color-cream-2);
	}
	.sys-failure .site-mono {
		margin: 0 0 5px;
		font-size: 8px;
	}
	.sys-failure p:last-child {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.sys-benchmark {
		display: flex;
		gap: 16px;
		margin-top: 18px;
		padding-top: 15px;
		border-top: 1px solid var(--color-line);
	}
	.sys-benchmark .site-mono {
		flex: 0 0 70px;
		padding-top: 2px;
		font-size: 8px;
	}
	.sys-benchmark p:last-child {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--color-ink);
	}
	.sys-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 20px;
		padding-bottom: 3px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-forest) 32%, transparent);
		font-size: 11.5px;
		font-weight: 650;
		color: var(--color-forest);
	}
	.sys-link svg {
		transition: transform 0.2s ease;
	}
	.sys-link:hover svg {
		transform: translateX(3px);
	}

	.sys-demo {
		position: relative;
		min-width: 0;
		padding: clamp(18px, 2.6vw, 24px);
		border: 1px solid color-mix(in srgb, var(--color-forest) 14%, transparent);
		border-radius: 24px;
		background: color-mix(in srgb, var(--color-mint) 55%, var(--color-cream));
		box-shadow: 0 24px 55px -46px rgba(15, 46, 32, 0.6);
	}
	article[data-category='mock'] .sys-demo {
		background: color-mix(in srgb, var(--color-peach) 52%, var(--color-cream));
	}
	article[data-category='focus'] .sys-demo {
		background: color-mix(in srgb, var(--color-butter) 68%, var(--color-cream));
	}
	.sys-strategy .sys-demo.sys-demo--lav {
		background: color-mix(in srgb, var(--color-lav) 58%, var(--color-cream));
	}
	.sys-demo-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 14px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-forest) 13%, transparent);
	}
	.sys-demo-app {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 11.5px;
		font-weight: 650;
		color: var(--color-forest);
	}
	.sys-demo-mark {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 6px;
		background: var(--color-ink);
		color: #ffffff;
		font-family: var(--font-serif);
		font-size: 12px;
		line-height: 1;
	}
	.sys-demo-tag {
		padding: 4px 7px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 18%, transparent);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 68%, transparent);
		white-space: nowrap;
	}
	.sys-mini-tag {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 68%, transparent);
	}

	.sys-review-question {
		padding: 16px 0 10px;
	}
	.sys-review-question p {
		margin: 6px 0 0;
		font-size: 14.5px;
		font-weight: 550;
		color: var(--color-ink);
	}
	.sys-review-count {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 14px;
		padding: 8px 0 16px;
	}
	.sys-review-count .site-mono {
		margin: 0 0 5px;
		font-size: 8px;
	}
	.sys-review-big {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin: 0;
	}
	.sys-review-big strong {
		font-family: var(--font-serif);
		font-size: 3.4rem;
		font-weight: 400;
		line-height: 0.82;
		color: var(--color-forest);
	}
	.sys-review-big span {
		font-size: 12px;
		font-weight: 550;
		color: var(--color-muted);
	}
	.sys-review-load {
		margin: 0;
		padding-bottom: 2px;
		font-family: var(--font-mono);
		font-size: 8.5px;
		line-height: 1.7;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-align: right;
		color: color-mix(in srgb, var(--color-forest) 58%, transparent);
	}

	.sys-stage-picker {
		position: relative;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		padding: 4px 0 2px;
	}
	.sys-stage-picker::before {
		content: '';
		position: absolute;
		top: 9px;
		left: 12.5%;
		right: 12.5%;
		height: 1px;
		background: color-mix(in srgb, var(--color-forest) 20%, transparent);
	}
	.sys-stage-picker button {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
	}
	.sys-stage-dot {
		width: 11px;
		height: 11px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 36%, transparent);
		border-radius: 50%;
		background: var(--color-cream);
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease;
	}
	.sys-stage-picker button.on .sys-stage-dot {
		border-color: var(--color-forest);
		background: var(--color-forest);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-forest) 13%, transparent);
	}
	.sys-stage-day {
		font-family: var(--font-mono);
		font-size: 9px;
		color: var(--color-muted);
	}
	.sys-stage-picker button.on .sys-stage-day {
		color: var(--color-forest);
		font-weight: 600;
	}
	.sys-review-caption {
		margin: 16px 0 0;
		padding-top: 13px;
		border-top: 1px solid color-mix(in srgb, var(--color-forest) 13%, transparent);
		font-size: 11px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-forest) 72%, transparent);
	}
	.sys-review-caption strong {
		color: var(--color-forest);
	}

	.sys-mistake-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 14px;
		padding: 16px 0 14px;
	}
	.sys-mistake-head p {
		margin: 6px 0 0;
		font-size: 14.5px;
		font-weight: 550;
		color: var(--color-ink);
	}
	.sys-marks {
		padding: 4px 8px;
		border: 1px solid color-mix(in srgb, #a33a2a 26%, transparent);
		border-radius: 7px;
		background: color-mix(in srgb, var(--color-peach) 60%, #ffffff);
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		color: #8c3224;
	}
	.sys-field-label {
		margin: 4px 0 8px;
		font-size: 8px;
	}
	.sys-mistake-tags {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 7px;
	}
	.sys-mistake-tags button {
		padding: 10px 11px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 16%, transparent);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-cream) 66%, transparent);
		font-size: 11.5px;
		font-weight: 550;
		color: var(--color-ink);
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.sys-mistake-tags button:hover {
		border-color: color-mix(in srgb, var(--color-forest) 42%, transparent);
	}
	.sys-mistake-tags button.on {
		border-color: var(--color-forest);
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.sys-repair {
		min-height: 114px;
		margin-top: 12px;
		padding: 13px 14px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 15%, transparent);
		border-radius: 11px;
		background: color-mix(in srgb, var(--color-cream) 55%, transparent);
	}
	.sys-repair .site-mono {
		margin: 0 0 6px;
		font-size: 8px;
	}
	.sys-repair p:last-child {
		margin: 0;
		font-size: 11.5px;
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-forest) 82%, transparent);
	}

	.sys-sprint-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 0 4px;
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 58%, transparent);
	}
	.sys-sprint-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
	}
	.sys-sprint-list li {
		display: grid;
		grid-template-columns: 20px 64px minmax(0, 1fr) auto;
		align-items: center;
		gap: 9px;
		padding: 10px 11px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 12%, transparent);
		border-radius: 9px;
		background: color-mix(in srgb, var(--color-cream) 58%, transparent);
	}
	.sys-sprint-index {
		font-family: var(--font-mono);
		font-size: 8.5px;
		color: color-mix(in srgb, var(--color-forest) 45%, transparent);
	}
	.sys-sprint-subject {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--color-forest);
	}
	.sys-sprint-topic {
		min-width: 0;
		overflow: hidden;
		font-size: 11.5px;
		font-weight: 550;
		color: var(--color-ink);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.sys-sprint-topic.hidden {
		font-weight: 400;
		font-style: italic;
		color: color-mix(in srgb, var(--color-forest) 48%, transparent);
	}
	.sys-sprint-type {
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 48%, transparent);
		white-space: nowrap;
	}
	.sys-sprint-actions {
		display: flex;
		gap: 8px;
		margin-top: 13px;
	}
	.sys-sprint-actions button {
		flex: 1;
		min-height: 34px;
		padding: 0 12px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 24%, transparent);
		border-radius: 999px;
		background: transparent;
		font-size: 10.5px;
		font-weight: 650;
		color: var(--color-forest);
		cursor: pointer;
		transition:
			background 0.18s ease,
			color 0.18s ease;
	}
	.sys-sprint-actions button:last-child,
	.sys-sprint-actions button.on {
		border-color: var(--color-forest);
		background: var(--color-forest);
		color: var(--color-cream);
	}

	.sys-focus-main {
		display: grid;
		grid-template-columns: 128px minmax(0, 1fr);
		gap: 20px;
		align-items: center;
		padding: 18px 0 12px;
	}
	.sys-dial {
		display: grid;
		place-items: center;
		width: 128px;
		height: 128px;
		border-radius: 50%;
		background: conic-gradient(
			var(--color-forest) var(--pct),
			color-mix(in srgb, var(--color-forest) 10%, transparent) 0
		);
	}
	.sys-dial-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 102px;
		height: 102px;
		border-radius: 50%;
		background: var(--color-cream);
	}
	.sys-dial-inner strong {
		font-family: var(--font-serif);
		font-size: 2.5rem;
		font-weight: 400;
		line-height: 0.82;
		color: var(--color-forest);
	}
	.sys-dial-inner span {
		margin-top: 3px;
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.sys-dial-inner p {
		margin: 4px 0 0;
		font-size: 9px;
		font-weight: 550;
		color: var(--color-forest);
	}
	.sys-focus-modes {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.sys-focus-modes button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 11px 13px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 16%, transparent);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-cream) 52%, transparent);
		font-size: 11.5px;
		font-weight: 600;
		color: var(--color-ink);
		cursor: pointer;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.sys-focus-modes button small {
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		opacity: 0.58;
	}
	.sys-focus-modes button.on {
		border-color: var(--color-forest);
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.sys-focus-targets {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.sys-focus-targets button {
		display: grid;
		grid-template-columns: 8px minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 9px 11px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 12%, transparent);
		border-radius: 9px;
		background: color-mix(in srgb, var(--color-cream) 52%, transparent);
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease;
	}
	.sys-target-dot {
		width: 7px;
		height: 7px;
		border: 1px solid color-mix(in srgb, var(--color-forest) 38%, transparent);
		border-radius: 50%;
	}
	.sys-target-chapter {
		display: flex;
		flex-direction: column;
		gap: 1px;
		font-size: 11.5px;
		font-weight: 550;
		color: var(--color-ink);
	}
	.sys-target-chapter small {
		font-family: var(--font-mono);
		font-size: 7px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 52%, transparent);
	}
	.sys-target-progress {
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-forest) 48%, transparent);
		white-space: nowrap;
	}
	.sys-focus-targets button.on {
		border-color: var(--color-forest);
		background: color-mix(in srgb, var(--color-cream) 92%, transparent);
	}
	.sys-focus-targets button.on .sys-target-dot {
		background: var(--color-forest);
		border-color: var(--color-forest);
	}

	.sys-audit {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
		gap: clamp(26px, 4.5vw, 60px);
		align-items: start;
		margin-top: clamp(48px, 7vw, 92px);
		padding: clamp(26px, 5vw, 56px);
		border-radius: 32px;
		background: var(--color-forest);
		color: var(--color-cream);
		overflow: hidden;
	}
	.sys-audit::before {
		content: '';
		position: absolute;
		top: -30%;
		right: -12%;
		width: 460px;
		height: 460px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(223, 240, 228, 0.14), transparent 68%);
		pointer-events: none;
	}
	.sys-audit-copy {
		position: relative;
		z-index: 1;
		padding-top: 4px;
	}
	.sys-audit-copy .site-mono {
		color: color-mix(in srgb, var(--color-cream) 52%, transparent);
	}
	.sys-audit-copy h2 {
		margin: 16px 0 16px;
		font-size: clamp(2.1rem, 4vw, 3.4rem);
		line-height: 0.96;
		color: var(--color-cream);
	}
	.sys-audit-copy h2 em {
		font-style: italic;
		color: var(--color-mint);
	}
	.sys-audit-copy > p:not(.site-mono) {
		margin: 0;
		max-width: 42ch;
		font-size: 13px;
		line-height: 1.68;
		color: color-mix(in srgb, var(--color-cream) 68%, transparent);
	}
	.sys-audit-points {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 24px 0 0;
		padding: 20px 0 0;
		border-top: 1px solid color-mix(in srgb, var(--color-cream) 16%, transparent);
		list-style: none;
	}
	.sys-audit-points li {
		display: flex;
		align-items: baseline;
		gap: 10px;
		font-size: 11.5px;
		line-height: 1.5;
		color: color-mix(in srgb, var(--color-cream) 62%, transparent);
	}
	.sys-audit-points span {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.08em;
		color: color-mix(in srgb, var(--color-mint) 75%, transparent);
	}

	.sys-audit-card {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		min-height: 428px;
		padding: clamp(20px, 3vw, 30px);
		border-radius: 22px;
		background: var(--color-cream);
		color: var(--color-ink);
		box-shadow: 0 30px 60px -40px rgba(0, 0, 0, 0.55);
	}
	.sys-audit-progress {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--color-line);
	}
	.sys-audit-progress .site-mono {
		font-size: 8px;
	}
	.sys-audit-dots {
		display: flex;
		gap: 5px;
	}
	.sys-audit-dots i {
		width: 18px;
		height: 3px;
		border-radius: 999px;
		background: var(--color-cream-3);
		transition: background 0.2s ease;
	}
	.sys-audit-dots i.on {
		background: var(--color-forest);
	}
	.sys-audit-q {
		padding-top: 18px;
	}
	.sys-audit-q > .site-mono {
		font-size: 8px;
	}
	.sys-audit-q h3,
	.sys-audit-result h3 {
		margin: 10px 0 8px;
		font-size: clamp(1.65rem, 2.7vw, 2.1rem);
		line-height: 1;
		color: var(--color-forest);
	}
	.sys-audit-q h3:focus,
	.sys-audit-result h3:focus {
		outline: none;
	}
	.sys-audit-hint {
		margin: 0 0 16px;
		font-size: 11.5px;
		line-height: 1.55;
		color: var(--color-muted);
	}
	.sys-audit-options {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.sys-audit-options button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		padding: 11px 13px;
		border: 1px solid var(--color-line);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-cream-2) 55%, #ffffff);
		font-size: 11.5px;
		font-weight: 500;
		color: var(--color-ink);
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease;
	}
	.sys-audit-options button:hover {
		border-color: color-mix(in srgb, var(--color-forest) 45%, transparent);
		background: var(--color-cream-2);
	}
	.sys-audit-options button span:last-child {
		font-size: 12px;
		opacity: 0.35;
		transition: transform 0.18s ease;
	}
	.sys-audit-options button:hover span:last-child {
		transform: translateX(3px);
		opacity: 0.8;
	}
	.sys-audit-back {
		margin-top: 12px;
		padding: 4px 2px;
		border: 0;
		background: transparent;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-muted);
		cursor: pointer;
	}
	.sys-audit-back:hover {
		color: var(--color-forest);
	}

	.sys-audit-result {
		padding-top: 18px;
	}
	.sys-audit-result > .site-mono {
		margin: 0;
		font-size: 8px;
		color: var(--color-forest);
	}
	.sys-audit-result h3 {
		font-size: clamp(1.9rem, 3.1vw, 2.5rem);
	}
	.sys-audit-result > p {
		margin: 0;
		font-size: 12px;
		line-height: 1.62;
		color: var(--color-muted);
	}
	.sys-audit-bars {
		display: flex;
		flex-direction: column;
		gap: 7px;
		margin: 17px 0;
	}
	.sys-audit-bar {
		display: grid;
		grid-template-columns: 82px minmax(0, 1fr) 26px;
		align-items: center;
		gap: 9px;
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.sys-audit-bar strong {
		font-size: 8px;
		font-weight: 600;
		color: var(--color-forest);
		text-align: right;
	}
	.sys-audit-bar-track {
		height: 5px;
		border-radius: 999px;
		background: var(--color-cream-3);
		overflow: hidden;
	}
	.sys-audit-bar-track i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--color-forest);
		transition: width 0.4s ease;
	}
	.sys-audit-rec {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding-top: 13px;
		border-top: 1px solid var(--color-line);
	}
	.sys-audit-rec .site-mono {
		font-size: 7.5px;
	}
	.sys-audit-rec strong {
		font-size: 11.5px;
		color: var(--color-forest);
		text-align: right;
	}
	.sys-audit-automates {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 11px 0 0;
		padding: 0;
		list-style: none;
	}
	.sys-audit-automates li {
		position: relative;
		padding-left: 13px;
		font-size: 10.5px;
		line-height: 1.5;
		color: var(--color-muted);
	}
	.sys-audit-automates li::before {
		content: '';
		position: absolute;
		top: 6px;
		left: 2px;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--color-forest);
	}
	.sys-audit-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		margin-top: 17px;
		padding: 0 16px;
		border-radius: 999px;
		background: var(--color-forest);
		font-size: 12px;
		font-weight: 650;
		color: var(--color-cream);
		text-align: center;
		transition:
			background 0.18s ease,
			transform 0.18s ease;
	}
	.sys-audit-cta:hover {
		background: var(--color-forest-2);
		transform: translateY(-1px);
	}
	.sys-audit-result-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 12px;
	}
	.sys-audit-result-foot a {
		font-size: 10px;
		font-weight: 600;
		color: var(--color-forest);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.sys-audit-result-foot button {
		padding: 2px;
		border: 0;
		background: transparent;
		font-size: 10px;
		font-weight: 500;
		color: var(--color-muted);
		cursor: pointer;
	}
	.sys-audit-result-foot button:hover {
		color: var(--color-forest);
	}

	@media (max-width: 940px) {
		.sys-strategy {
			grid-template-columns: minmax(0, 1fr);
			gap: 28px;
		}
		.sys-demo {
			max-width: 620px;
		}
		.sys-audit {
			grid-template-columns: minmax(0, 1fr);
		}
		.sys-audit-card {
			min-height: 0;
		}
	}

	@media (max-width: 860px) {
		.sys-hero-grid {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
			gap: 24px;
		}
		.sys-hero-side {
			gap: 20px;
		}
		.sys-matrix-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 560px) {
		.sys-jump {
			top: 78px;
			padding: 10px 0 8px;
		}
		.sys-matrix,
		.sys-audit {
			scroll-margin-top: 148px;
		}
		.sys-filter {
			gap: 0;
			padding: 4px;
		}
		.sys-filter button {
			gap: 4px;
			padding: 8px 9px;
			font-size: 11px;
		}
		.sys-hero {
			padding-top: 24px;
		}
		.sys-hero-stats {
			gap: 20px;
		}
		.sys-hero-stats strong {
			font-size: 1.5rem;
		}
		.sys-copy h2 {
			font-size: clamp(2rem, 8.6vw, 2.5rem);
		}
		.sys-failure {
			padding: 13px 14px;
		}
		.sys-benchmark {
			gap: 12px;
		}
		.sys-demo {
			padding: 17px;
			border-radius: 19px;
		}
		.sys-demo-tag {
			font-size: 7px;
			padding: 3px 6px;
		}
		.sys-review-big strong {
			font-size: 3rem;
		}
		.sys-mistake-tags {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.sys-repair {
			min-height: 0;
		}
		.sys-sprint-list li {
			grid-template-columns: 18px 56px minmax(0, 1fr);
			gap: 8px;
			padding: 9px 10px;
		}
		.sys-sprint-type {
			display: none;
		}
		.sys-focus-main {
			grid-template-columns: 112px minmax(0, 1fr);
			gap: 14px;
		}
		.sys-dial {
			width: 112px;
			height: 112px;
		}
		.sys-dial-inner {
			width: 90px;
			height: 90px;
		}
		.sys-dial-inner strong {
			font-size: 2.2rem;
		}
		.sys-audit {
			margin-top: 48px;
			padding: 22px 16px;
			border-radius: 24px;
		}
		.sys-audit-copy h2 {
			font-size: clamp(2rem, 10vw, 2.7rem);
		}
		.sys-audit-card {
			padding: 18px 16px;
			border-radius: 18px;
		}
		.sys-audit-options button {
			padding: 11px 12px;
			font-size: 11px;
		}
		.sys-audit-bar {
			grid-template-columns: 74px minmax(0, 1fr) 24px;
		}
		.sys-audit-result-foot {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}
	}

	@media (max-width: 390px) {
		.sys-filter button {
			padding: 8px 8px;
			font-size: 10.5px;
		}
		.sys-filter button span {
			display: none;
		}
		.sys-focus-main {
			grid-template-columns: 100px minmax(0, 1fr);
		}
		.sys-dial {
			width: 100px;
			height: 100px;
		}
		.sys-dial-inner {
			width: 80px;
			height: 80px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sys-hero-jump svg,
		.sys-link svg,
		.sys-stage-dot,
		.sys-mistake-tags button,
		.sys-sprint-actions button,
		.sys-focus-modes button,
		.sys-focus-targets button,
		.sys-audit-options button,
		.sys-audit-options button span:last-child,
		.sys-audit-cta,
		.sys-audit-bar-track i,
		.sys-audit-dots i {
			transition: none;
		}
	}
</style>
