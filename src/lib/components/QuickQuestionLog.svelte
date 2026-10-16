<script lang="ts">
	import { fade } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, logBulkQuestions, celebration } from '$lib/stores/tracker';
	import { allChapters } from '$lib/state/syllabus';
	import { todayKey } from '$lib/state/dates';
	import { subjectName, subjectColor, SUBJECTS } from '$lib/state/subjects';

	let open = false;
	let node: HTMLDivElement;

	let selectedSubject: 'P' | 'C' | 'M' = 'P';
	let selectedChapter = 1;
	let customCount = '';

	$: chapters = allChapters(selectedSubject);
	$: if (!chapters.some((c) => c.no === selectedChapter) && chapters.length > 0) {
		selectedChapter = chapters[0].no;
	}

	const today = todayKey();
	$: todayBucket = $tracker.stat?.[today] ?? {};
	$: pToday = Number(todayBucket['P'] ?? 0);
	$: cToday = Number(todayBucket['C'] ?? 0);
	$: mToday = Number(todayBucket['M'] ?? 0);
	$: totalToday = pToday + cToday + mToday;

	function handleOutside(event: MouseEvent) {
		if (open && node && !node.contains(event.target as Node)) {
			open = false;
		}
	}

	function logCount(count: number) {
		if (count <= 0) return;
		const ch = chapters.find((c) => c.no === selectedChapter);
		const chName = ch ? ch.name : `Chapter ${selectedChapter}`;
		logBulkQuestions(selectedSubject, selectedChapter, count, chName);
		celebration.set(`+${count} ${subjectName(selectedSubject)} questions logged! 🎯`);
		customCount = '';
	}

	function handleCustomSubmit() {
		const val = parseInt(customCount, 10);
		if (isNaN(val) || val <= 0) return;
		logCount(val);
	}
</script>

<svelte:window on:mousedown={handleOutside} />

<div class="quick-log-wrapper" bind:this={node}>
	<button
		type="button"
		class="log-trigger"
		class:active={open}
		aria-label="Quick Question Logger"
		title="Quick Log Questions"
		on:click={() => (open = !open)}
	>
		<NavIcon name="target" size={16} />
		<span class="btn-text">+ Qs</span>
	</button>

	{#if open}
		<div class="popover" transition:fade={{ duration: 130 }} role="dialog" aria-label="Quick Log Questions">
			<div class="head">
				<div class="head-title">
					<NavIcon name="target" size={15} />
					<span>Quick Question Log</span>
				</div>
				<button type="button" class="close-btn" on:click={() => (open = false)}>×</button>
			</div>

			<!-- Subject Picker -->
			<div class="subject-tabs">
				{#each SUBJECTS as sub}
					<button
						type="button"
						class="sub-pill"
						class:active={selectedSubject === sub.code}
						style:--sub-color={subjectColor(sub.code)}
						on:click={() => (selectedSubject = sub.code as 'P' | 'C' | 'M')}
					>
						<span class="sub-dot" style:background={subjectColor(sub.code)}></span>
						{sub.name}
					</button>
				{/each}
			</div>

			<!-- Chapter Selector -->
			<div class="chapter-row">
				<label for="quick-ch-select" class="ch-label">Chapter</label>
				<select id="quick-ch-select" class="ch-select" bind:value={selectedChapter}>
					{#each chapters as ch}
						<option value={ch.no}>{ch.no}. {ch.name}</option>
					{/each}
				</select>
			</div>

			<!-- Quick Add Increments -->
			<p class="section-title">QUICK ADD</p>
			<div class="increments-grid">
				<button type="button" class="inc-btn" on:click={() => logCount(5)}>+5</button>
				<button type="button" class="inc-btn" on:click={() => logCount(10)}>+10</button>
				<button type="button" class="inc-btn" on:click={() => logCount(25)}>+25</button>
				<button type="button" class="inc-btn" on:click={() => logCount(50)}>+50</button>
			</div>

			<!-- Custom Count -->
			<form class="custom-row" on:submit|preventDefault={handleCustomSubmit}>
				<input
					type="number"
					min="1"
					max="500"
					placeholder="Custom quantity…"
					bind:value={customCount}
					class="custom-input"
				/>
				<button type="submit" class="submit-btn" disabled={!customCount || parseInt(customCount, 10) <= 0}>
					Log
				</button>
			</form>

			<!-- Today's Live Stats Footer -->
			<div class="today-footer">
				<span class="today-title">Today's Total: <b>{totalToday}</b></span>
				<div class="today-badges">
					<span style:color={subjectColor('P')}><b>{pToday}</b> P</span>
					<span class="sep">·</span>
					<span style:color={subjectColor('C')}><b>{cToday}</b> C</span>
					<span class="sep">·</span>
					<span style:color={subjectColor('M')}><b>{mToday}</b> M</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.quick-log-wrapper {
		position: relative;
	}

	.log-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		height: 36px;
		padding: 0 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: 11px;
		background: var(--surface-panel);
		color: var(--text-primary);
		font-size: 0.76rem;
		font-weight: 750;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
	}

	.log-trigger:hover,
	.log-trigger.active {
		border-color: var(--accent);
		color: var(--accent);
	}

	.popover {
		position: absolute;
		z-index: 120;
		top: calc(100% + 0.55rem);
		right: 0;
		width: 310px;
		padding: 0.95rem;
		border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16));
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-panel, #121020) 96%, transparent);
		backdrop-filter: blur(36px) saturate(210%);
		-webkit-backdrop-filter: blur(36px) saturate(210%);
		box-shadow: 0 18px 48px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.14);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.head-title {
		display: inline-flex;
		align-items: center;
		gap: 0.42rem;
		color: var(--text-primary);
		font-size: 0.84rem;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.15rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
		border-radius: 6px;
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.subject-tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.sub-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		height: 32px;
		padding: 0 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 9px;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.sub-pill:hover {
		border-color: var(--sub-color);
		color: var(--text-primary);
	}

	.sub-pill.active {
		border-color: var(--sub-color);
		background: color-mix(in srgb, var(--sub-color) 16%, transparent);
		color: var(--text-primary);
	}

	.sub-dot {
		width: 6px;
		height: 6px;
		border-radius: 99px;
	}

	.chapter-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.ch-label {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.ch-select {
		width: 100%;
		height: 32px;
		padding: 0 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.74rem;
		font-weight: 600;
		outline: none;
	}

	.section-title {
		margin: 0 0 0.45rem;
		color: var(--text-secondary);
		font-size: 0.63rem;
		font-weight: 800;
		letter-spacing: 0.09em;
	}

	.increments-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.4rem;
		margin-bottom: 0.65rem;
	}

	.inc-btn {
		height: 34px;
		border: 1px solid var(--border-subtle);
		border-radius: 9px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.8rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.inc-btn:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		transform: translateY(-1px);
	}

	.custom-row {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.custom-input {
		flex: 1;
		min-width: 0;
		height: 32px;
		padding: 0 0.65rem;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		font-size: 0.76rem;
		outline: none;
	}

	.custom-input:focus {
		border-color: var(--accent);
	}

	.submit-btn {
		height: 32px;
		padding: 0 0.85rem;
		border: 1px solid var(--accent);
		border-radius: 8px;
		background: var(--accent);
		color: #fff;
		font-size: 0.74rem;
		font-weight: 750;
		cursor: pointer;
	}

	.submit-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.today-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.65rem;
		border-top: 1px solid var(--border-subtle);
		font-size: 0.7rem;
	}

	.today-title {
		color: var(--text-secondary);
		font-weight: 650;
	}

	.today-title b {
		color: var(--text-primary);
	}

	.today-badges {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: 750;
	}

	.sep {
		color: var(--border-subtle);
	}

	@media (max-width: 760px) {
		.btn-text {
			display: none;
		}
		.log-trigger {
			width: 36px;
			padding: 0;
			justify-content: center;
		}
		.popover {
			position: fixed;
			top: 80px;
			right: 12px;
			left: 12px;
			width: auto;
		}
	}
</style>
