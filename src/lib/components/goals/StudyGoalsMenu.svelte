<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { getGoalsByGroup, goalCount, goalGroups, featuredGoal } from '$lib/content/goals';

	let open = false;
	let wrap: HTMLDivElement;
	let panelEl: HTMLDivElement;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	$: onGoals = $page.url.pathname.startsWith('/goals');

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
		window.dispatchEvent(new CustomEvent('btracker-menu-open', { detail: 'goals' }));
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

	function handlePointerDown(event: PointerEvent) {
		if (!open || !wrap) return;
		if (event.target instanceof Node && !containsNode(event.target)) open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}

	function handleOtherMenu(event: Event) {
		if ((event as CustomEvent).detail !== 'goals') open = false;
	}

	onMount(() => {
		window.addEventListener('btracker-menu-open', handleOtherMenu);
		return () => window.removeEventListener('btracker-menu-open', handleOtherMenu);
	});
</script>

<svelte:window on:pointerdown={handlePointerDown} on:keydown={handleKeydown} />

<div
	class="sgo"
	bind:this={wrap}
	role="group"
	aria-label="Study Goals menu"
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
		class:active={onGoals}
		aria-expanded={open}
		aria-controls="study-goals-panel"
		aria-haspopup="true"
		on:click={toggle}
	>
		Study Goals
		<NavIcon name="chevron-down" size={13} />
	</button>

	{#if open}
		<div
			class="mega"
			id="study-goals-panel"
			role="region"
			aria-label="Study Goals"
			bind:this={panelEl}
			use:portal
			on:mouseenter={openMenu}
			on:mouseleave={scheduleClose}
		>
			<div class="panel-main">
				<aside class="rail">
					<div class="rail-brand">
						<span class="rail-mark" aria-hidden="true"><NavIcon name="target" size={16} /></span>
						<div>
							<b>Study Goals</b>
							<small>{goalCount} JEE plans · Free</small>
						</div>
					</div>
					<p class="rail-copy">Plans built around your stage — not a generic timetable.</p>

					<a class="start" href={`/goals/${featuredGoal.slug}`} on:click={close}>
						<small>Start here</small>
						<b>{featuredGoal.menuTitle}</b>
						<span>{featuredGoal.window} <NavIcon name="arrow-right" size={12} /></span>
					</a>

					<a class="all" href="/goals" on:click={close}>
						Browse all {goalCount} goal plans
						<NavIcon name="arrow-right" size={13} />
					</a>
				</aside>

				<div class="columns">
					{#each goalGroups as group}
						<div class="col">
							<div class="col-head">
								<span class="cat-icon {group.accent}">
									<NavIcon name={group.icon} size={15} />
								</span>
								<div>
									<b>{group.label}</b>
									<small>{group.blurb}</small>
								</div>
							</div>
							<ul>
								{#each getGoalsByGroup(group.id) as goal}
									<li>
										<a href={`/goals/${goal.slug}`} on:click={close}>
											<span class="item-title">
												{goal.menuTitle}
												<NavIcon name="arrow-right" size={12} />
											</span>
											<span class="item-desc">{goal.target}</span>
											<span class="item-meta">{goal.window}</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/each}

					<div class="col">
						<div class="col-head">
							<span class="cat-icon green">
								<NavIcon name="layers" size={15} />
							</span>
							<div>
								<b>Make it stick</b>
								<small>The guides behind every plan</small>
							</div>
						</div>
						<ul>
							<li>
								<a href="/guides/weekly-review" on:click={close}>
									<span class="item-title">
										The weekly review
										<NavIcon name="arrow-right" size={12} />
									</span>
									<span class="item-desc">Turn a week of logs into one change.</span>
									<span class="item-meta">6 min · Core</span>
								</a>
							</li>
							<li>
								<a href="/guides/mock-post-mortem" on:click={close}>
									<span class="item-title">
										Mock post-mortems
										<NavIcon name="arrow-right" size={12} />
									</span>
									<span class="item-desc">Make every paper produce a fix.</span>
									<span class="item-meta">7 min · Core</span>
								</a>
							</li>
							<li>
								<a href="/guides/revision-system" on:click={close}>
									<span class="item-title">
										Build a revision system
										<NavIcon name="arrow-right" size={12} />
									</span>
									<span class="item-desc">Spaced repeats instead of re-reading.</span>
									<span class="item-meta">8 min · Deep dive</span>
								</a>
							</li>
							<li>
								<a href="/guides" on:click={close}>
									<span class="item-title">
										All 9 study guides
										<NavIcon name="arrow-right" size={12} />
									</span>
									<span class="item-desc">Revision, mocks, focus and energy.</span>
									<span class="item-meta">Free to read</span>
								</a>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="panel-foot">
				<span class="foot-free"><i></i> Free forever — every plan, no account needed</span>
				<a href="/goals">All study goals <NavIcon name="arrow-right" size={12} /></a>
			</div>
		</div>
	{/if}
</div>

<style>
	.sgo {
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
		width: min(980px, calc(100vw - 32px));
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
		grid-template-columns: 232px minmax(0, 1fr);
	}

	.rail {
		display: flex;
		flex-direction: column;
		gap: 13px;
		padding: 22px 18px;
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
		color: #0066ff;
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
		gap: 5px;
		padding: 8px 10px;
		border-radius: 9px;
		color: #3f5677;
		font-size: 10.5px;
		font-weight: 750;
		text-decoration: none;
		transition: background 0.16s;
	}

	.all:hover {
		background: rgba(255, 255, 255, 0.72);
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
		padding: 18px;
	}

	.col {
		min-width: 0;
		padding: 4px 8px;
	}

	.col + .col {
		border-left: 1px solid #f0f4fa;
	}

	.col-head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px 10px;
	}

	.cat-icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 29px;
		height: 29px;
		border-radius: 9px;
	}

	.cat-icon.blue {
		background: #eaf2ff;
		color: #0052d4;
	}

	.cat-icon.violet {
		background: #f3edff;
		color: #6d28d9;
	}

	.cat-icon.green {
		background: #e8f9f2;
		color: #0b7a55;
	}

	.col-head b {
		display: block;
		color: var(--ink, #0f172a);
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.col-head small {
		display: block;
		margin-top: 1px;
		color: #8695a9;
		font-size: 9.5px;
		font-weight: 550;
		line-height: 1.35;
	}

	.col ul {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.col a {
		display: block;
		padding: 8px 8px 9px;
		border-radius: 9px;
		text-decoration: none;
		transition: background 0.16s;
	}

	.col a:hover {
		background: #f5f9ff;
	}

	.item-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		color: #1b2b42;
		font-size: 11.5px;
		font-weight: 720;
		line-height: 1.35;
	}

	.item-title :global(svg) {
		flex: none;
		color: #9db0c8;
		opacity: 0;
		transition:
			opacity 0.16s,
			color 0.16s,
			transform 0.16s;
	}

	.col a:hover .item-title :global(svg) {
		color: #0066ff;
		opacity: 1;
		transform: translateX(2px);
	}

	.item-desc {
		display: block;
		margin-top: 2px;
		color: #7c8ba0;
		font-size: 9.5px;
		line-height: 1.45;
	}

	.item-meta {
		display: block;
		margin-top: 3px;
		color: #a3afbf;
		font-size: 8.5px;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.panel-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 11px 22px;
		border-top: 1px solid #edf2f9;
		background: #fbfdff;
	}

	.foot-free {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #64748b;
		font-size: 10px;
		font-weight: 600;
	}

	.foot-free i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #10b981;
	}

	.panel-foot > a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: #0052d4;
		font-size: 10px;
		font-weight: 750;
		text-decoration: none;
	}
</style>
