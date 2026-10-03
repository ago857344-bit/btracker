<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { TrackerState, MockTest } from '$lib/types/tracker';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { fade, fly } from 'svelte/transition';

	const tracker = getContext<Writable<TrackerState>>('tracker');

	let tab: 'Btest' | 'Alt' | 'CET' = 'Btest';
	let showModal = false;

	// Form states
	let name = '';
	let dateStr = new Date().toISOString().split('T')[0];
	let totalMarks = 300;
	
	// Subject performance
	let p = { correct: 0, incorrect: 0 };
	let c = { correct: 0, incorrect: 0 };
	let m = { correct: 0, incorrect: 0 };

	$: negativeMarks = tab === 'CET' ? 0 : 1;
	
	// Filter tests by current tab
	$: filteredTests = ($tracker.mocks || []).filter(t => (t.category || 'Btest') === tab);

	$: marksLostToIncorrect = filteredTests.reduce((sum, test) => sum + (test.incorrect * negativeMarks), 0) || 0;
	$: totalScoreAllTime = filteredTests.reduce((sum, test) => sum + test.score, 0) || 0;
	$: totalQuestionsAttempted = filteredTests.reduce((sum, test) => sum + test.correct + test.incorrect, 0) || 0;
	$: totalCorrect = filteredTests.reduce((sum, test) => sum + test.correct, 0) || 0;
	$: accuracy = totalQuestionsAttempted > 0 ? Math.round((totalCorrect / totalQuestionsAttempted) * 100) : 0;

	function saveTest() {
		if (!name) return;
		
		const totalCorrectMarks = tab === 'CET' 
			? (p.correct * 1 + c.correct * 1 + m.correct * 2) // CET scoring
			: (p.correct + c.correct + m.correct) * 4;        // JEE scoring
		
		const totalNegativeMarks = tab === 'CET'
			? 0
			: (p.incorrect + c.incorrect + m.incorrect) * 1;
		
		const score = totalCorrectMarks - totalNegativeMarks;
		
		const newTest: MockTest = {
			id: crypto.randomUUID(),
			date: new Date(dateStr).getTime(),
			name,
			score,
			totalMarks,
			category: tab,
			correct: p.correct + c.correct + m.correct,
			incorrect: p.incorrect + c.incorrect + m.incorrect,
			unattempted: 0, // We could derive this if we knew total questions
			subjects: {
				P: { score: (tab === 'CET' ? p.correct * 1 : p.correct * 4) - (tab === 'CET' ? 0 : p.incorrect * 1), ...p },
				C: { score: (tab === 'CET' ? c.correct * 1 : c.correct * 4) - (tab === 'CET' ? 0 : c.incorrect * 1), ...c },
				M: { score: (tab === 'CET' ? m.correct * 2 : m.correct * 4) - (tab === 'CET' ? 0 : m.incorrect * 1), ...m }
			}
		};
		
		$tracker.mocks = [...($tracker.mocks || []), newTest];
		showModal = false;
		
		// Reset
		name = ''; p = {correct:0, incorrect:0}; c = {correct:0, incorrect:0}; m = {correct:0, incorrect:0};
	}

	function deleteTest(id: string) {
		$tracker.mocks = $tracker.mocks.filter(t => t.id !== id);
	}

	function formatDate(epoch: number) {
		return new Date(epoch).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
	
	// Pre-fill total marks when changing tabs
	$: if (tab) {
		if (tab === 'CET') totalMarks = 200;
		else totalMarks = 300;
	}
</script>

<svelte:head>
	<title>Tests • BTracker</title>
</svelte:head>

<div class="tests-container">
	<header class="glass">
		<div class="header-content">
			<div>
				<h1>Tests Dashboard</h1>
				<p>Track your scores, analyze negative marking, and improve.</p>
			</div>
			<button class="primary-btn" on:click={() => showModal = true}>
				<NavIcon name="plus" size={16} /> Add Test
			</button>
		</div>
		<div class="tabs" role="tablist">
			<button type="button" role="tab" class:active={tab === 'Btest'} on:click={() => tab = 'Btest'}>Btest</button>
			<button type="button" role="tab" class:active={tab === 'Alt'} on:click={() => tab = 'Alt'}>Alt</button>
			<button type="button" role="tab" class:active={tab === 'CET'} on:click={() => tab = 'CET'}>CET tests</button>
		</div>
	</header>

	<div class="analytics-grid">
		<div class="stat-card glass">
			<span class="stat-label">Total Tests ({tab})</span>
			<span class="stat-value">{filteredTests.length}</span>
		</div>
		
		<div class="stat-card glass">
			<span class="stat-label">Avg Score</span>
			<span class="stat-value">
				{#if filteredTests.length > 0}
					{Math.round(totalScoreAllTime / filteredTests.length)}
				{:else}
					--
				{/if}
			</span>
		</div>
		
		<div class="stat-card glass negative-analysis">
			<span class="stat-label">Accuracy & Errors</span>
			<div class="negative-stats">
				<div class="n-stat">
					<small>Accuracy</small>
					<span>{accuracy}%</span>
				</div>
				{#if tab !== 'CET'}
				<div class="n-stat danger">
					<small>Marks Lost</small>
					<span>-{marksLostToIncorrect}</span>
				</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="tests-list">
		<h2>Past {tab === 'CET' ? 'CET ' : tab} Tests</h2>
		
		{#if filteredTests.length > 0}
			<div class="grid">
				{#each [...filteredTests].sort((a, b) => b.date - a.date) as test (test.id)}
					<div class="test-card glass">
						<div class="test-header">
							<h3>{test.name}</h3>
							<button class="icon-btn danger" on:click={() => deleteTest(test.id)} aria-label="Delete test">
								<NavIcon name="trash" size={16} />
							</button>
						</div>
						
						<div class="test-meta">
							<span>{formatDate(test.date)}</span>
							<span class="score-badge">{test.score} / {test.totalMarks}</span>
						</div>
						
						<div class="test-stats">
							<div class="stat"><span class="correct">✓ {test.correct}</span></div>
							<div class="stat"><span class="incorrect">✗ {test.incorrect}</span></div>
						</div>
						
						<div class="subject-breakdown">
							{#each Object.entries(test.subjects) as [sub, data]}
								<div style="display: flex; justify-content: space-between;">
									<span>{sub}</span>
									<span>{data.score} marks ({data.correct}C, {data.incorrect}I)</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state glass">
				<NavIcon name="tests" size={48} />
				<p>No {tab} tests logged yet. Start tracking your progress!</p>
			</div>
		{/if}
	</div>
</div>

{#if showModal}
	<div class="modal-backdrop" transition:fade={{ duration: 150 }}>
		<div class="modal glass" transition:fly={{ y: 20, duration: 250 }}>
			<div class="modal-header">
				<h2>Log New {tab} Test</h2>
				<button class="icon-btn" on:click={() => showModal = false}>
					<NavIcon name="x" size={20} />
				</button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label for="name">Test Name</label>
					<input id="name" type="text" bind:value={name} placeholder="e.g. {tab} Mock 1" />
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="date">Date</label>
						<input id="date" type="date" bind:value={dateStr} />
					</div>
					<div class="form-group">
						<label for="totalMarks">Total Marks</label>
						<input id="totalMarks" type="number" bind:value={totalMarks} />
					</div>
				</div>
				
				<div class="subjects-input">
					<h3>Subject Performance</h3>
					<div class="sub-row">
						<strong>Physics</strong>
						<input type="number" placeholder="Correct" bind:value={p.correct} min="0" />
						<input type="number" placeholder="Incorrect" bind:value={p.incorrect} min="0" />
					</div>
					<div class="sub-row">
						<strong>Chemistry</strong>
						<input type="number" placeholder="Correct" bind:value={c.correct} min="0" />
						<input type="number" placeholder="Incorrect" bind:value={c.incorrect} min="0" />
					</div>
					<div class="sub-row">
						<strong>Maths</strong>
						<input type="number" placeholder="Correct" bind:value={m.correct} min="0" />
						<input type="number" placeholder="Incorrect" bind:value={m.incorrect} min="0" />
					</div>
				</div>
			</div>
			
			<div class="modal-footer">
				<button class="text-btn" on:click={() => showModal = false}>Cancel</button>
				<button class="primary-btn" on:click={saveTest} disabled={!name}>Save Test</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.tests-container { padding: 1.5rem; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
	.glass { background: var(--surface-panel); border: 1px solid var(--border-subtle); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; }
	
	header { padding: 1.5rem; padding-bottom: 0; }
	.header-content { display: flex; justify-content: space-between; align-items: flex-start; }
	h1 { font-size: 1.75rem; margin: 0 0 0.5rem 0; color: var(--text-primary); }
	p { margin: 0; color: var(--text-secondary); }
	
	.tabs { display: flex; gap: 0.5rem; margin-top: 1.5rem; border-top: 1px solid transparent; }
	.tabs button { background: transparent; border: none; padding: 0.75rem 1.25rem; color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
	.tabs button:hover { color: var(--text-primary); }
	.tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
	
	.primary-btn { background: var(--accent); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
	.primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%); }
	.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	
	.analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
	.stat-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
	.stat-label { color: var(--text-secondary); font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
	.stat-value { font-size: 2.5rem; font-weight: 800; color: var(--text-primary); }
	.negative-analysis { grid-column: span 2; }
	@media (max-width: 768px) { .negative-analysis { grid-column: span 1; } }
	
	.negative-stats { display: flex; gap: 2rem; margin-top: 0.5rem; }
	.n-stat { display: flex; flex-direction: column; }
	.n-stat small { color: var(--text-secondary); margin-bottom: 0.25rem; }
	.n-stat span { font-size: 1.5rem; font-weight: 700; }
	.danger { color: #ff4d4f; }
	
	.tests-list h2 { margin-bottom: 1rem; color: var(--text-primary); }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
	.test-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
	.test-header { display: flex; justify-content: space-between; align-items: flex-start; }
	.test-header h3 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }
	
	.icon-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.25rem; border-radius: 6px; }
	.icon-btn:hover { background: var(--surface-subtle); color: var(--text-primary); }
	.icon-btn.danger:hover { color: #ff4d4f; background: color-mix(in srgb, #ff4d4f, transparent 90%); }
	
	.test-meta { display: flex; justify-content: space-between; align-items: center; color: var(--text-secondary); font-size: 0.9rem; }
	.score-badge { background: var(--accent-soft); color: var(--accent); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 700; }
	.test-stats { display: flex; gap: 1rem; font-size: 0.9rem; font-weight: 600; }
	.correct { color: #10b981; }
	.incorrect { color: #ef4444; }
	
	.subject-breakdown { border-top: 1px solid var(--border-subtle); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); }
	
	.empty-state { padding: 3rem; text-align: center; color: var(--text-secondary); }
	
	/* Modal Styles */
	.modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
	.modal { width: 100%; max-width: 500px; display: flex; flex-direction: column; box-shadow: var(--shadow-card); overflow: hidden; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-subtle); }
	.modal-header h2 { margin: 0; font-size: 1.25rem; }
	.modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
	.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
	.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
	input { background: var(--surface-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.75rem; border-radius: 8px; font-family: inherit; font-size: 1rem; }
	input:focus { outline: none; border-color: var(--accent); }
	.subjects-input { margin-top: 0.5rem; }
	.subjects-input h3 { font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary); }
	.sub-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; align-items: center; margin-bottom: 0.75rem; }
	.sub-row strong { color: var(--text-secondary); font-size: 0.9rem; }
	.sub-row input { padding: 0.5rem; }
	.modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 1rem; }
	.text-btn { background: transparent; border: none; color: var(--text-secondary); font-weight: 600; cursor: pointer; padding: 0.5rem 1rem; border-radius: 8px; }
	.text-btn:hover { background: var(--surface-subtle); color: var(--text-primary); }
</style>
