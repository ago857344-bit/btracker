<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { fade, fly } from 'svelte/transition';
	import type { MockTest } from '$lib/types/tracker';
	import NavIcon from '$lib/components/NavIcon.svelte';

	let showModal = false;
	let tab: 'Btest' | 'Alt' | 'CET' = 'Btest';
	
	// Form state
	let name = '';
	let dateStr = new Date().toISOString().split('T')[0];
	let totalMarks = 300;
	
	let p = { correct: 0, incorrect: 0 };
	let c = { correct: 0, incorrect: 0 };
	let m = { correct: 0, incorrect: 0 };
	let marksPerQuestion = 4;
	let negativeMarks = 1;

	$: marksLostToIncorrect = $tracker.mocks?.reduce((sum, mock) => sum + (mock.incorrect * negativeMarks), 0) || 0;
	$: totalScoreAllTime = $tracker.mocks?.reduce((sum, mock) => sum + mock.score, 0) || 0;
	
	function openModal() {
		name = '';
		dateStr = new Date().toISOString().split('T')[0];
		totalMarks = 300;
		p = { correct: 0, incorrect: 0 };
		c = { correct: 0, incorrect: 0 };
		m = { correct: 0, incorrect: 0 };
		showModal = true;
	}
	
	function saveMock() {
		const correct = p.correct + c.correct + m.correct;
		const incorrect = p.incorrect + c.incorrect + m.incorrect;
		const score = (correct * marksPerQuestion) - (incorrect * negativeMarks);
		const totalQs = totalMarks / marksPerQuestion;
		const unattempted = totalQs - (correct + incorrect);
		
		const pScore = (p.correct * marksPerQuestion) - (p.incorrect * negativeMarks);
		const cScore = (c.correct * marksPerQuestion) - (c.incorrect * negativeMarks);
		const mScore = (m.correct * marksPerQuestion) - (m.incorrect * negativeMarks);

		const newMock: MockTest = {
			category: tab,
			id: crypto.randomUUID(),
			date: new Date(dateStr).getTime(),
			name,
			score,
			totalMarks,
			correct,
			incorrect,
			unattempted,
			subjects: {
				P: { score: pScore, correct: p.correct, incorrect: p.incorrect },
				C: { score: cScore, correct: c.correct, incorrect: c.incorrect },
				M: { score: mScore, correct: m.correct, incorrect: m.incorrect },
			}
		};
		
		$tracker.mocks = [...($tracker.mocks || []), newMock];
		showModal = false;
	}

	function deleteMock(id: string) {
		$tracker.mocks = $tracker.mocks.filter(m => m.id !== id);
	}
	
	function formatDate(ms: number) {
		return new Date(ms).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Mock Tests • BTracker</title>
</svelte:head>

<div class="mocks-container">
	
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
			<span class="stat-label">Total Mocks</span>
			<span class="stat-value">{$tracker.mocks?.length || 0}</span>
		</div>
		<div class="stat-card glass">
			<span class="stat-label">Average Score</span>
			<span class="stat-value">
				{#if $tracker.mocks?.length > 0}
					{Math.round(totalScoreAllTime / $tracker.mocks.length)}
				{:else}
					0
				{/if}
			</span>
		</div>
		<div class="stat-card glass negative-analysis">
			<span class="stat-label">Negative Marking Analysis</span>
			<div class="negative-stats">
				<div class="n-stat">
					<small>Total Marks Lost</small>
					<span class="danger">-{marksLostToIncorrect}</span>
				</div>
				<div class="n-stat">
					<small>Impact Ratio</small>
					<span>
						{#if totalScoreAllTime + marksLostToIncorrect > 0}
							{((marksLostToIncorrect / (totalScoreAllTime + marksLostToIncorrect)) * 100).toFixed(1)}%
						{:else}
							0%
						{/if}
					</span>
				</div>
			</div>
		</div>
	</div>

	<div class="mocks-list">
		<h2>Past Mocks</h2>
		{#if $tracker.mocks?.length > 0}
			<div class="grid">
				{#each [...$tracker.mocks].sort((a, b) => b.date - a.date) as mock (mock.id)}
					<div class="mock-card glass">
						<div class="mock-header">
							<h3>{mock.name}</h3>
							<button class="icon-btn danger" on:click={() => deleteMock(mock.id)} aria-label="Delete mock">
								<NavIcon name="x" size={16} />
							</button>
						</div>
						<div class="mock-meta">
							<span>{formatDate(mock.date)}</span>
							<span class="score-badge">{mock.score} / {mock.totalMarks}</span>
						</div>
						
						<div class="mock-stats">
							<div class="stat"><span class="correct">✓ {mock.correct}</span></div>
							<div class="stat"><span class="incorrect">✗ {mock.incorrect}</span></div>
							<div class="stat"><span class="unattempted">- {mock.unattempted}</span></div>
						</div>
						
						<div class="subject-breakdown">
							{#each Object.entries(mock.subjects) as [sub, data]}
								<div class="sub-stat">
									<strong>{sub}</strong>: {data.score} ({data.correct}C, {data.incorrect}I)
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state glass">
				<p>No mock tests logged yet. Start tracking your progress!</p>
			</div>
		{/if}
	</div>
</div>

{#if showModal}
	<div class="modal-backdrop" transition:fade={{ duration: 150 }}>
		<div class="modal glass" transition:fly={{ y: 20, duration: 250 }}>
			<div class="modal-header">
				<h2>Log New {tab === 'CET' ? 'CET' : tab} Test</h2>
				<button class="icon-btn" on:click={() => showModal = false}>
					<NavIcon name="x" size={20} />
				</button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label for="name">Test Name</label>
					<input id="name" type="text" bind:value={name} placeholder="e.g. JEE Main Mock 1" />
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
				<button class="primary-btn" on:click={saveMock} disabled={!name}>Save Test</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.mocks-container {
		padding: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	
	.glass {
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 16px;
	}
	
	header {
		padding: 1.5rem;
	}
	
	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	
	h1 {
		font-size: 1.75rem;
		margin: 0 0 0.5rem 0;
		color: var(--text-primary);
	}
	
	p {
		margin: 0;
		color: var(--text-secondary);
	}
	
	.primary-btn {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.primary-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 60%);
	}
	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.analytics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}
	
	.stat-card {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.stat-label {
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.stat-value {
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	
	.negative-analysis {
		grid-column: span 2;
	}
	@media (max-width: 768px) {
		.negative-analysis {
			grid-column: span 1;
		}
	}
	
	.negative-stats {
		display: flex;
		gap: 2rem;
		margin-top: 0.5rem;
	}
	
	.n-stat {
		display: flex;
		flex-direction: column;
	}
	
	.n-stat small {
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}
	.n-stat span {
		font-size: 1.5rem;
		font-weight: 700;
	}
	.danger {
		color: #ff4d4f; /* generic danger red */
	}
	
	.mocks-list h2 {
		margin-bottom: 1rem;
		color: var(--text-primary);
	}
	
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}
	
	.mock-card {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.mock-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}
	.mock-header h3 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}
	
	.icon-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 6px;
	}
	.icon-btn:hover {
		background: var(--surface-subtle);
		color: var(--text-primary);
	}
	.icon-btn.danger:hover {
		color: #ff4d4f;
		background: color-mix(in srgb, #ff4d4f, transparent 90%);
	}
	
	.mock-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	
	.score-badge {
		background: var(--accent-soft);
		color: var(--accent);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-weight: 700;
	}
	
	.mock-stats {
		display: flex;
		gap: 1rem;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.correct { color: #10b981; }
	.incorrect { color: #ef4444; }
	.unattempted { color: var(--text-secondary); }
	
	.subject-breakdown {
		border-top: 1px solid var(--border-subtle);
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}
	
	.empty-state {
		padding: 3rem;
		text-align: center;
		color: var(--text-secondary);
	}
	
	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}
	
	.modal {
		width: 100%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
	}
	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
	}
	
	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	
	label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
	}
	
	input {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		padding: 0.75rem;
		border-radius: 8px;
		font-family: inherit;
		font-size: 1rem;
	}
	input:focus {
		outline: none;
		border-color: var(--accent);
	}
	
	.subjects-input {
		margin-top: 0.5rem;
	}
	.subjects-input h3 {
		font-size: 1rem;
		margin-bottom: 1rem;
		color: var(--text-primary);
	}
	
	.sub-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.sub-row strong {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	.sub-row input {
		padding: 0.5rem;
	}
	
	.modal-footer {
		padding: 1.25rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}
	
	.text-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-weight: 600;
		cursor: pointer;
		padding: 0.5rem 1rem;
		border-radius: 8px;
	}
	.text-btn:hover {
		background: var(--surface-subtle);
		color: var(--text-primary);
	}

	.tabs { display: flex; gap: 0.5rem; margin-top: 1.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0; }
	.tabs button { background: transparent; border: none; padding: 0.75rem 1.25rem; color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
	.tabs button:hover { color: var(--text-primary); }
	.tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }

</style>
