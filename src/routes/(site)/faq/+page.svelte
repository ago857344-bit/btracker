<script lang="ts">
	import { faqCategories, faqItems, type FaqCategoryId } from '$lib/content/faq';

	const origin = 'https://btracker.app';
	const pageUrl = `${origin}/faq`;

	let query = '';
	let openId: string | null = faqItems[0]?.id ?? null;
	let railActive: FaqCategoryId = 'product';
	let searchEl: HTMLInputElement;

	const quickSearches = ['free', 'sync', 'offline', 'syllabus'];

	$: q = query.trim().toLowerCase();
	$: matched = faqItems.filter((item) => {
		if (!q) return true;
		const haystack = [item.question, item.answer, ...(item.keywords ?? [])].join(' ').toLowerCase();
		return haystack.includes(q);
	});
	$: groups = faqCategories
		.map((category) => ({ ...category, items: matched.filter((item) => item.category === category.id) }))
		.filter((group) => group.items.length > 0);
	$: if (q && matched.length > 0 && !matched.some((item) => item.id === openId)) {
		openId = matched[0].id;
	}

	function toggle(id: string) {
		openId = openId === id ? null : id;
	}

	function clearSearch() {
		query = '';
		searchEl?.focus();
	}

	function handleInputKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (query) query = '';
			else searchEl?.blur();
			event.preventDefault();
		}
	}

	function handleGlobalKey(event: KeyboardEvent) {
		if (event.key !== '/') return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
		event.preventDefault();
		searchEl?.focus();
	}

	const faqLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqItems.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: { '@type': 'Answer', text: item.answer }
		}))
	};

	const breadcrumbLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'BTracker', item: `${origin}/welcome` },
			{ '@type': 'ListItem', position: 2, name: 'FAQ', item: pageUrl }
		]
	};
</script>

<svelte:head>
	<title>FAQ — BTracker JEE Study Tracker</title>
	<meta
		name="description"
		content="Answers about BTracker: what it costs, how logging and revision work, where your data lives, sync and offline behaviour, and how the syllabus maps to JEE."
	/>
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="BTracker" />
	<meta property="og:title" content="FAQ — BTracker JEE Study Tracker" />
	<meta
		property="og:description"
		content="Straight answers about the tracker: pricing, data and sync, and JEE syllabus coverage."
	/>
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content={`${origin}/landing/og-welcome.jpg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="FAQ — BTracker JEE Study Tracker" />
	<meta
		name="twitter:description"
		content="Straight answers about the tracker: pricing, data and sync, and JEE syllabus coverage."
	/>
	<meta name="twitter:image" content={`${origin}/landing/og-welcome.jpg`} />
	{@html `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`}
</svelte:head>

<svelte:window on:keydown={handleGlobalKey} />

<div class="faq mx-auto w-[min(1180px,92vw)]">
	<header class="fq-hero">
		<p class="site-mono">FAQ / Knowledge base</p>
		<div class="fq-hero-grid">
			<h1 class="site-serif">Straight answers,<br /><em>no sales pitch.</em></h1>
			<p class="fq-hero-copy">
				Everything about how the tracker works, where your data goes, and what it covers. If a question
				is not here, the playbooks usually answer it in more detail.
			</p>
		</div>

		<div class="search-block">
			<div class="search-field">
				<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
					<circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5" />
					<path d="M12.8 12.8L17 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				<input
					bind:this={searchEl}
					bind:value={query}
					on:keydown={handleInputKey}
					type="search"
					id="faq-search"
					placeholder="Search questions, answers, or a topic&hellip;"
					autocomplete="off"
					aria-label="Search frequently asked questions"
				/>
				{#if query}
					<button type="button" class="clear" on:click={clearSearch} aria-label="Clear search">
						<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
							<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
						</svg>
					</button>
				{:else}
					<kbd>/</kbd>
				{/if}
			</div>

			<div class="search-meta">
				<p aria-live="polite">
					{#if q}
						{matched.length}
						{matched.length === 1 ? 'answer' : 'answers'} for <strong>&ldquo;{query.trim()}&rdquo;</strong>
					{:else}
						{faqItems.length} answers across {faqCategories.length} categories
					{/if}
				</p>
				<div class="quick">
					<span>Try</span>
					{#each quickSearches as term}
						<button type="button" on:click={() => { query = term; searchEl?.focus(); }}>{term}</button>
					{/each}
				</div>
			</div>
		</div>
	</header>

	<div class="layout">
		<aside class="rail" aria-label="FAQ categories">
			<p class="site-mono">Categories</p>
			<nav class="rail-nav">
				{#each faqCategories as category}
					{@const count = matched.filter((item) => item.category === category.id).length}
					{#if count > 0}
						<a
							href={`#group-${category.id}`}
							class:active={railActive === category.id}
							on:click={() => (railActive = category.id)}
						>
							<span class="rail-row">
								<span>{category.label}</span>
								<span class="count">{count}</span>
							</span>
							<span class="rail-desc">{category.description}</span>
						</a>
					{:else}
						<span class="rail-link muted">
							<span class="rail-row">
								<span>{category.label}</span>
								<span class="count">0</span>
							</span>
							<span class="rail-desc">{category.description}</span>
						</span>
					{/if}
				{/each}
			</nav>

			<div class="rail-help">
				<p class="site-mono">Go deeper</p>
				<p class="rail-help-text">Playbooks walk through the methods behind the tracker, from spaced revision to mock post-mortems.</p>
				<a href="/playbooks" data-sveltekit-preload-data="hover">Browse playbooks</a>
				<a href="/stages" data-sveltekit-preload-data="hover">See stage strategies</a>
			</div>
		</aside>

		<div class="content">
			{#if groups.length}
				{#each groups as group}
					<section class="group" id={`group-${group.id}`} aria-labelledby={`heading-${group.id}`}>
						<div class="group-head">
							<div>
								<p class="site-mono">{String(faqCategories.findIndex((c) => c.id === group.id) + 1).padStart(2, '0')}</p>
								<h2 id={`heading-${group.id}`} class="site-serif">{group.label}</h2>
							</div>
							<p class="group-desc">{group.description}</p>
						</div>

						<div class="qa-list">
							{#each group.items as item}
								{@const open = openId === item.id}
								<div class="qa" class:open id={`qa-${item.id}`}>
									<h3>
										<button
											type="button"
											id={`question-${item.id}`}
											aria-expanded={open}
											aria-controls={`answer-${item.id}`}
											on:click={() => toggle(item.id)}
										>
											<span>{item.question}</span>
											<span class="toggle" aria-hidden="true">
												<svg viewBox="0 0 14 14" width="12" height="12">
													<path d="M2 7h10M7 2v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
												</svg>
											</span>
										</button>
									</h3>
									{#if open}
										<div class="answer" id={`answer-${item.id}`} role="region" aria-labelledby={`question-${item.id}`}>
											<p>{item.answer}</p>
											{#if item.links?.length}
												<div class="answer-links">
													{#each item.links as link}
														<a href={link.href} data-sveltekit-preload-data="hover">
															{link.label}
															<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
																<path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
															</svg>
														</a>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/each}
			{:else}
				<div class="empty">
					<p class="site-mono">No matches</p>
					<h2 class="site-serif">Nothing under &ldquo;{query.trim()}&rdquo; yet.</h2>
					<p class="empty-text">Try a shorter phrase, or clear the search and browse the categories.</p>
					<div>
						<button type="button" on:click={clearSearch}>Clear search</button>
						<a href="/playbooks">Browse playbooks</a>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<section class="closing">
		<div>
			<p class="site-mono">Still deciding?</p>
			<h2 class="site-serif">The fastest answer is<br /><em>to try it.</em></h2>
			<p>Open the tracker, log one question, and see whether the loop makes sense for how you study.</p>
		</div>
		<a class="closing-btn" href="/login" data-sveltekit-preload-data="hover">Open the tracker</a>
	</section>
</div>

<style>
	.faq {
		padding-top: clamp(28px, 5vw, 56px);
	}
	.fq-hero {
		padding-bottom: clamp(28px, 4vw, 42px);
		border-bottom: 1px solid var(--color-line);
	}
	.fq-hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.85fr);
		gap: clamp(24px, 5vw, 74px);
		align-items: end;
		margin-top: 16px;
	}
	h1 {
		margin: 0;
		font-size: clamp(2.9rem, 7.2vw, 5.9rem);
		color: var(--color-forest);
		text-wrap: balance;
	}
	h1 em {
		font-style: italic;
	}
	.fq-hero-copy {
		margin: 0 0 6px;
		max-width: 44ch;
		font-size: 14.5px;
		line-height: 1.65;
		color: var(--color-muted);
	}

	.search-block {
		margin-top: clamp(26px, 4vw, 40px);
	}
	.search-field {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 18px;
		height: 62px;
		border: 1.5px solid color-mix(in srgb, var(--color-forest) 22%, transparent);
		border-radius: 18px;
		background: var(--color-cream-2);
		color: var(--color-muted);
		transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
	}
	.search-field:focus-within {
		border-color: var(--color-forest);
		background: var(--color-cream);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-forest) 8%, transparent);
	}
	.search-field input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: 0;
		background: transparent;
		color: var(--color-ink);
		font-size: 15px;
		outline: none;
	}
	.search-field input::placeholder {
		color: color-mix(in srgb, var(--color-muted) 75%, transparent);
	}
	.search-field input::-webkit-search-cancel-button {
		appearance: none;
	}
	.search-field kbd {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 1px solid var(--color-line);
		border-radius: 6px;
		background: var(--color-cream);
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-muted);
	}
	.search-field .clear {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 1px solid var(--color-line);
		border-radius: 99px;
		background: var(--color-cream);
		color: var(--color-forest);
		cursor: pointer;
	}
	.search-field .clear:hover {
		background: var(--color-cream-3);
	}

	.search-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 12px;
	}
	.search-meta p {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.search-meta strong {
		font-weight: 500;
		color: var(--color-forest);
	}
	.quick {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.quick span {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.quick button {
		padding: 4px 10px;
		border: 1px solid var(--color-line);
		border-radius: 99px;
		background: transparent;
		color: var(--color-muted);
		font-size: 10.5px;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}
	.quick button:hover {
		background: var(--color-mint);
		border-color: color-mix(in srgb, var(--color-forest) 20%, transparent);
		color: var(--color-forest);
	}

	.layout {
		display: grid;
		grid-template-columns: 246px minmax(0, 1fr);
		gap: clamp(30px, 5vw, 72px);
		align-items: start;
		padding-top: clamp(32px, 5vw, 52px);
	}
	.rail {
		position: sticky;
		top: 104px;
	}
	.rail-nav {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 14px;
	}
	.rail-nav a,
	.rail-link {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 11px 12px;
		border-radius: 11px;
		transition: background 0.15s ease;
	}
	.rail-nav a {
		color: var(--color-ink);
	}
	.rail-nav a:hover {
		background: var(--color-cream-2);
	}
	.rail-nav a.active {
		background: var(--color-mint);
	}
	.rail-link.muted {
		opacity: 0.42;
	}
	.rail-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 12.5px;
		font-weight: 650;
		color: var(--color-forest);
	}
	.count {
		font-family: var(--font-mono);
		font-size: 8.5px;
		font-weight: 400;
		color: var(--color-muted);
	}
	.rail-desc {
		font-size: 10.5px;
		line-height: 1.45;
		color: var(--color-muted);
	}
	.rail-help {
		margin-top: 24px;
		padding: 18px;
		border: 1px solid var(--color-line);
		border-radius: 16px;
		background: var(--color-cream-2);
	}
	.rail-help-text {
		margin: 10px 0 12px;
		font-size: 11px;
		line-height: 1.55;
		color: var(--color-muted);
	}
	.rail-help a {
		display: block;
		padding: 6px 0;
		font-size: 11.5px;
		font-weight: 600;
		color: var(--color-forest);
	}
	.rail-help a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.content {
		min-width: 0;
	}
	.group {
		scroll-margin-top: 108px;
		padding-bottom: clamp(30px, 4vw, 48px);
		margin-bottom: clamp(30px, 4vw, 46px);
		border-bottom: 1px solid var(--color-line);
	}
	.group:last-child {
		border-bottom: 0;
		margin-bottom: 0;
		padding-bottom: 0;
	}
	.group-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 18px;
		margin-bottom: 16px;
	}
	.group-head h2 {
		margin: 6px 0 0;
		font-size: clamp(1.7rem, 3vw, 2.3rem);
		color: var(--color-forest);
	}
	.group-desc {
		margin: 0 0 4px;
		max-width: 34ch;
		text-align: right;
		font-size: 11px;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.qa-list {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.qa {
		border: 1px solid var(--color-line);
		border-radius: 14px;
		background: var(--color-cream-2);
		transition: border-color 0.18s ease, background 0.18s ease;
	}
	.qa.open {
		border-color: color-mix(in srgb, var(--color-forest) 24%, transparent);
		background: var(--color-cream);
	}
	.qa h3 {
		margin: 0;
	}
	.qa button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		width: 100%;
		padding: 17px 19px;
		border: 0;
		background: transparent;
		text-align: left;
		font-size: 13.5px;
		font-weight: 600;
		line-height: 1.45;
		color: var(--color-forest);
		cursor: pointer;
	}
	.toggle {
		display: grid;
		place-items: center;
		flex: none;
		width: 24px;
		height: 24px;
		border: 1px solid var(--color-line);
		border-radius: 99px;
		background: var(--color-cream);
		color: var(--color-forest);
		transition: transform 0.2s ease, background 0.2s ease;
	}
	.qa.open .toggle {
		transform: rotate(45deg);
		background: var(--color-mint);
	}
	.answer {
		padding: 0 19px 18px;
		animation: answer-in 0.2s ease both;
	}
	.answer > p {
		margin: 0;
		max-width: 72ch;
		font-size: 13px;
		line-height: 1.7;
		color: var(--color-muted);
	}
	.answer-links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}
	.answer-links a {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 7px 12px;
		border-radius: 99px;
		background: var(--color-forest);
		color: var(--color-cream);
		font-size: 10.5px;
		font-weight: 600;
	}
	.answer-links a:hover {
		background: var(--color-forest-2);
	}
	@keyframes answer-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
	}

	.empty {
		padding: clamp(30px, 5vw, 52px);
		border: 1px dashed color-mix(in srgb, var(--color-forest) 25%, transparent);
		border-radius: 20px;
		background: var(--color-cream-2);
	}
	.empty h2 {
		margin: 10px 0 10px;
		font-size: clamp(1.8rem, 3.5vw, 2.5rem);
		color: var(--color-forest);
	}
	.empty-text {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-muted);
	}
	.empty > div {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
		margin-top: 20px;
	}
	.empty button,
	.empty a {
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 16px;
		border-radius: 99px;
		font-size: 11.5px;
		font-weight: 650;
		cursor: pointer;
	}
	.empty button {
		border: 0;
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.empty a {
		border: 1px solid var(--color-line);
		color: var(--color-forest);
	}

	.closing {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 26px;
		margin-top: clamp(30px, 5vw, 56px);
		padding: clamp(30px, 4.5vw, 50px);
		border-radius: 28px;
		background: var(--color-forest);
		color: var(--color-cream);
	}
	.closing > div {
		max-width: 580px;
	}
	.closing :global(.site-mono) {
		color: color-mix(in srgb, var(--color-cream) 50%, transparent);
	}
	.closing h2 {
		margin: 11px 0 12px;
		font-size: clamp(1.9rem, 4vw, 3.1rem);
		line-height: 0.98;
		color: var(--color-cream);
	}
	.closing h2 em {
		color: var(--color-mint);
	}
	.closing p {
		margin: 0;
		font-size: 13px;
		line-height: 1.65;
		color: color-mix(in srgb, var(--color-cream) 72%, transparent);
	}
	.closing-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 42px;
		padding: 0 20px;
		border-radius: 999px;
		background: var(--color-cream);
		color: var(--color-forest);
		font-size: 12.5px;
		font-weight: 650;
		transition: transform 0.18s ease, background 0.18s ease;
	}
	.closing-btn:hover {
		transform: translateY(-1px);
		background: #ffffff;
	}

	@media (max-width: 940px) {
		.fq-hero-grid {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
			gap: 20px;
		}
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.rail {
			position: static;
		}
		.rail-nav {
			flex-direction: row;
			overflow-x: auto;
			gap: 6px;
			padding-bottom: 4px;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}
		.rail-nav::-webkit-scrollbar {
			display: none;
		}
		.rail-nav a,
		.rail-link {
			flex: 0 0 auto;
			border: 1px solid var(--color-line);
			border-radius: 99px;
			padding: 8px 12px;
		}
		.rail-desc {
			display: none;
		}
		.rail-help {
			display: none;
		}
		.group {
			scroll-margin-top: 88px;
		}
	}
	@media (max-width: 600px) {
		.rail-nav {
			flex-wrap: wrap;
			overflow: visible;
		}
		.search-field {
			height: 54px;
			padding: 0 14px;
			border-radius: 15px;
		}
		.search-field input {
			font-size: 14px;
		}
		.search-field kbd {
			display: none;
		}
		.group-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
		}
		.group-desc {
			text-align: left;
			max-width: 44ch;
		}
		.qa button {
			padding: 15px 15px;
			font-size: 13px;
		}
		.answer {
			padding: 0 15px 16px;
		}
		.closing {
			border-radius: 22px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.answer {
			animation: none;
		}
		.toggle,
		.closing-btn {
			transition: none;
		}
	}
</style>
