<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import {
		featuredGuide,
		getGuidesByCategory,
		guideCategories,
		guideCount
	} from '$lib/content/guides';

	let open = false;
	let wrap: HTMLDivElement;
	let panelEl: HTMLDivElement;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	$: onGuides = $page.url.pathname.startsWith('/guides');

	// Portal keeps the panel out of the sticky header's compositing subtree (Chromium flicker).
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
	}

	function containsNode(node: Node | null): boolean {
		return (
			(node instanceof Node && wrap.contains(node)) ||
			(node instanceof Node && !!panelEl?.contains(node))
		);
	}

	function announce() {
		window.dispatchEvent(new CustomEvent('btracker-menu-open', { detail: 'guides' }));
	}

	function openMenu() {
		clearTimeout(closeTimer);
		if (!open) {
			open = true;
			announce();
		}
	}

	function toggle() {
		if (open) open = false;
		else openMenu();
	}

	function scheduleClose() {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => (open = false), 300);
	}

	function close() {
		open = false;
	}

	function handleOtherMenu(event: Event) {
		if ((event as CustomEvent).detail !== 'guides') open = false;
	}

	onMount(() => {
		window.addEventListener('btracker-menu-open', handleOtherMenu);
		return () => window.removeEventListener('btracker-menu-open', handleOtherMenu);
	});

	function handlePointerDown(event: PointerEvent) {
		if (!open || !wrap) return;
		if (event.target instanceof Node && !containsNode(event.target)) open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}
</script>

<svelte:window on:pointerdown={handlePointerDown} on:keydown={handleKeydown} />

<div
	class="sg"
	bind:this={wrap}
	role="group"
	aria-label="Study Guides menu"
	on:mouseenter={openMenu}
	on:mouseleave={scheduleClose}
	on:focusout={() => {
		setTimeout(() => {
			if (open && !containsNode(document.activeElement)) open = false;
		}, 0);
	}}
>
	<button
		type="button"
		class="trigger"
		class:active={onGuides}
		aria-expanded={open}
		aria-controls="study-guides-panel"
		aria-haspopup="true"
		on:click={toggle}
	>
		Study Guides
		<NavIcon name="chevron-down" size={13} />
	</button>

	{#if open}
		<div
			class="mega"
			id="study-guides-panel"
			role="region"
			aria-label="Study Guides"
			bind:this={panelEl}
			use:portal
			on:mouseenter={openMenu}
			on:mouseleave={scheduleClose}
		>
			<div class="panel-main">
				<aside class="rail">
					<div class="rail-brand">
						<span class="rail-mark" aria-hidden="true">B</span>
						<div>
							<b>Study Guides</b>
							<small>{guideCount} playbooks · Free</small>
						</div>
					</div>
					<p class="rail-copy">Practical JEE playbooks on revision, mocks, focus and energy.</p>

					<a class="start" href={`/guides/${featuredGuide.slug}`} on:click={close}>
						<small>Start here</small>
						<b>{featuredGuide.menuTitle}</b>
						<span>{featuredGuide.readTime} min read <NavIcon name="arrow-right" size={12} /></span>
					</a>

					<a class="all" href="/guides" on:click={close}>
						Browse all {guideCount} guides
						<NavIcon name="arrow-right" size={13} />
					</a>
				</aside>

				<div class="columns">
					{#each guideCategories as category}
						<div class="col">
							<div class="col-head">
								<span class="cat-icon {category.accent}">
									<NavIcon name={category.icon} size={15} />
								</span>
								<div>
									<b>{category.label}</b>
									<small>{category.blurb}</small>
								</div>
							</div>
							<ul>
								{#each getGuidesByCategory(category.id) as guide}
									<li>
										<a href={`/guides/${guide.slug}`} on:click={close}>
											<span class="item-title">
												{guide.menuTitle}
												<NavIcon name="arrow-right" size={12} />
											</span>
											<span class="item-desc">{guide.description}</span>
											<span class="item-meta">{guide.readTime} min · {guide.level}</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>

			<div class="panel-foot">
				<span class="foot-free"><i></i> Free forever — no account needed to read</span>
				<a href="/guides" on:click={close}>All guides <NavIcon name="arrow-right" size={12} /></a>
			</div>
		</div>
	{/if}
</div>

<style>
	.sg {
		display: inline-flex;
	}

	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 9px 13px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: #3f4b5f;
		font-family: inherit;
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
		transition:
			color 0.18s,
			background 0.18s;
	}

	.trigger:hover,
	.trigger[aria-expanded='true'],
	.trigger.active {
		color: var(--ink, #0f172a);
		background: var(--soft2, #f1f5f9);
	}

	.trigger :global(svg) {
		opacity: 0.5;
		transition: transform 0.18s var(--ease, ease);
	}

	.trigger[aria-expanded='true'] :global(svg) {
		opacity: 0.85;
		transform: rotate(180deg);
	}

	.mega {
		position: fixed;
		top: 84px;
		right: 0;
		left: 0;
		z-index: 59;
		width: min(1080px, calc(100vw - 32px));
		margin: 0 auto;
		overflow: hidden;
		border: 1px solid #e1e8f2;
		border-radius: 22px;
		background: #fff;
		box-shadow:
			0 28px 56px -28px rgba(15, 23, 42, 0.34),
			0 8px 20px -14px rgba(15, 23, 42, 0.14);
	}

	.panel-main {
		display: grid;
		grid-template-columns: 252px minmax(0, 1fr);
	}

	.rail {
		display: flex;
		flex-direction: column;
		gap: 13px;
		padding: 22px 20px;
		border-right: 1px solid #e6edf7;
		background:
			radial-gradient(ellipse at 10% 0%, rgba(0, 102, 255, 0.1), transparent 55%),
			linear-gradient(160deg, #f9fbff, #f1f6ff 55%, #eaf2ff);
	}

	.rail-brand {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.rail-mark {
		display: grid;
		flex: none;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid #e3e9f2;
		border-radius: 10px;
		background: #fff;
		color: #000;
		font-family: 'Inter', sans-serif;
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.05em;
		box-shadow: 0 6px 14px -8px rgba(15, 23, 42, 0.35);
	}

	.rail-brand b {
		display: block;
		color: var(--ink, #0f172a);
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 14px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.rail-brand small {
		display: block;
		margin-top: 1px;
		color: #64748b;
		font-size: 10px;
		font-weight: 650;
	}

	.rail-copy {
		margin: 0;
		color: #5b6b82;
		font-size: 11.5px;
		line-height: 1.5;
	}

	.start {
		display: block;
		margin-top: 2px;
		padding: 12px;
		border: 1px solid rgba(0, 102, 255, 0.16);
		border-radius: 13px;
		background: #fff;
		box-shadow: 0 10px 24px -18px rgba(0, 72, 190, 0.45);
		text-decoration: none;
		transition:
			transform 0.18s var(--ease, ease),
			box-shadow 0.18s;
	}

	.start:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 30px -18px rgba(0, 72, 190, 0.5);
	}

	.start small {
		display: inline-block;
		margin-bottom: 6px;
		padding: 2px 7px;
		border-radius: 999px;
		background: #eaf2ff;
		color: #0052d4;
		font-size: 8.5px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.start b {
		display: block;
		color: var(--ink, #0f172a);
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 13px;
		font-weight: 750;
		line-height: 1.3;
		letter-spacing: -0.015em;
	}

	.start span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 7px;
		color: #0066ff;
		font-size: 10px;
		font-weight: 750;
	}

	.all {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		margin-top: auto;
		padding-top: 11px;
		border-top: 1px solid rgba(0, 102, 255, 0.12);
		color: #0052d4;
		font-size: 11.5px;
		font-weight: 750;
		text-decoration: none;
	}

	.all:hover {
		color: #003fa3;
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0;
		padding: 18px 12px 10px;
	}

	.col {
		padding: 2px 11px 4px;
		border-right: 1px solid #eef2f7;
	}

	.col:last-child {
		border-right: 0;
	}

	.col-head {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-bottom: 8px;
		padding: 2px 8px 8px;
	}

	.cat-icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: 8px;
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

	.col-head b {
		display: block;
		color: var(--ink, #0f172a);
		font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.col-head small {
		display: block;
		max-width: 190px;
		margin-top: 2px;
		color: #8492a6;
		font-size: 10px;
		line-height: 1.35;
	}

	.col ul {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.col a {
		display: block;
		padding: 8px;
		border-radius: 10px;
		text-decoration: none;
		transition: background 0.16s;
	}

	.col a:hover {
		background: #f7faff;
	}

	.item-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		color: #15213a;
		font-size: 12px;
		font-weight: 700;
		line-height: 1.3;
	}

	.item-title :global(svg) {
		flex: none;
		color: #0066ff;
		opacity: 0;
		transform: translateX(-3px);
		transition:
			opacity 0.16s,
			transform 0.16s;
	}

	.col a:hover .item-title :global(svg) {
		opacity: 1;
		transform: none;
	}

	.item-desc {
		display: -webkit-box;
		overflow: hidden;
		margin-top: 3px;
		color: #6b7a90;
		font-size: 10.5px;
		line-height: 1.42;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		-webkit-line-clamp: 2;
	}

	.item-meta {
		display: block;
		margin-top: 4px;
		color: #9aa8ba;
		font-size: 8.5px;
		font-weight: 750;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.panel-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 9px 20px;
		border-top: 1px solid #eef2f7;
		background: #fbfdff;
	}

	.foot-free {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #64748b;
		font-size: 10.5px;
		font-weight: 600;
	}

	.foot-free i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
	}

	.panel-foot a {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: #0052d4;
		font-size: 10.5px;
		font-weight: 750;
		text-decoration: none;
	}

	.panel-foot a:hover {
		color: #003fa3;
	}

	@media (max-width: 1080px) {
		.sg {
			display: none;
		}
	}

	@media (max-height: 720px) {
		.mega {
			overflow-y: auto;
			max-height: calc(100vh - 100px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trigger :global(svg),
		.start,
		.item-title :global(svg) {
			transition: none;
		}
	}
</style>
