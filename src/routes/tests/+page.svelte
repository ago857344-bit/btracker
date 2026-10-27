<script lang="ts">
	import { page } from '$app/stores';
	import { tracker, updateTracker, celebration, openFeynmanDuck, openTestDaySheet } from '$lib/stores/tracker';
	import type { MockTest, MistakeLog, Flashcard } from '$lib/types/tracker';
	import { applyEloResult } from '$lib/state/gamification';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import GrillMeModal from '$lib/components/ui/GrillMeModal.svelte';

	// VIEW MODE
	let viewMode: 'mocks' | 'mistakes' = 'mocks';

	$: if ($page.url.searchParams.get('view') === 'mistakes') {
		viewMode = 'mistakes';
	} else if ($page.url.searchParams.get('view') === 'mocks') {
		viewMode = 'mocks';
	}

	let grillingMistake: MistakeLog | null = null;

	// ======== MOCKS LOGIC ========
	let tab: 'Btest' | 'Alt' | 'CET' = 'Btest';
	
	$: filteredTests = ($tracker.mocks || []).filter(t => t.category === tab || (!t.category && tab === 'Btest'));
	$: totalTests = filteredTests.length;
	
	let showModal = false;
	let name = '';
	let dateStr = new Date().toISOString().split('T')[0];
	let totalMarks = 300;
	
	let p = { score: 0, correct: 0, incorrect: 0 };
	let c = { score: 0, correct: 0, incorrect: 0 };
	let m = { score: 0, correct: 0, incorrect: 0 };

	function makeTestId(prefix: string) {
		return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
	}

	function saveTest() {
		const newTest: MockTest = {
			id: makeTestId('test'),
			name,
			date: new Date(dateStr).getTime(),
			category: tab,
			score: p.score + c.score + m.score,
			totalMarks,
			correct: p.correct + c.correct + m.correct,
			incorrect: p.incorrect + c.incorrect + m.incorrect,
			unattempted: 0,
			subjects: {
				Physics: { ...p },
				Chemistry: { ...c },
				Maths: { ...m },
				P: { ...p },
				C: { ...c },
				M: { ...m }
			}
		};
		
		updateTracker(t => {
			if (!t.mocks) t.mocks = [];
			t.mocks.push(newTest);
			
			if (!t.gamification) t.gamification = { xp: 0, level: 1, elo: { P: 300, C: 300, M: 300 } };
			t.gamification.xp += 200; // Mock test XP
			
			// Adjust Elo based on mock performance
			const subMap = { 'P': 'Physics', 'C': 'Chemistry', 'M': 'Maths' } as const;
			['P', 'C', 'M'].forEach(code => {
				const sData = (newTest.subjects as any)[subMap[code as 'P'|'C'|'M']];
				if (sData) {
					const attempted = sData.correct + sData.incorrect;
					if (attempted > 0) {
						const accuracy = (sData.correct / attempted) * 100;
						applyEloResult(t.gamification!, code, accuracy, 100);
					}
				}
			});
			return t;
		});
		
		showModal = false;
		name = '';
	}

	function deleteTest(id: string) {
		updateTracker(t => {
			t.mocks = t.mocks.filter(m => m.id !== id);
			return t;
		});
	}

	function formatDate(ms: number) {
		return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}

	// Basic aggregates for the current tab
	$: avgScore = totalTests > 0 
		? Math.round(filteredTests.reduce((sum, t) => sum + t.score, 0) / totalTests) 
		: 0;

	$: totalCorrect = filteredTests.reduce((sum, t) => sum + t.correct, 0);
	$: totalIncorrect = filteredTests.reduce((sum, t) => sum + t.incorrect, 0);
	$: accuracy = totalCorrect + totalIncorrect > 0
		? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
		: 0;

	// Negative marking (assuming -1 per incorrect)
	$: marksLostToIncorrect = totalIncorrect;

	// ======== MISTAKES LOGIC ========
	$: mistakes = $tracker.mistakes || [];
	let showMistakeModal = false;

	let mistakeSubject = 'Physics';
	let mistakeType: MistakeLog['errorType'] = 'Silly';
	let description = '';
	let mistakeTestName = '';

	function saveMistake() {
		const newMistake: MistakeLog = {
			id: makeTestId('mistake'),
			date: Date.now(),
			subject: mistakeSubject,
			errorType: mistakeType,
			description,
			testName: mistakeTestName || undefined
		};

		updateTracker(t => {
			if (!t.mistakes) t.mistakes = [];
			t.mistakes.push(newMistake);
			return t;
		});

		showMistakeModal = false;
		description = '';
		mistakeTestName = '';
	}

	function deleteMistake(id: string) {
		updateTracker(t => {
			t.mistakes = t.mistakes.filter(m => m.id !== id);
			return t;
		});
	}

	let filterSubject = 'All';
	let filterType = 'All';
	$: filteredMistakes = mistakes.filter(m => 
		(filterSubject === 'All' || m.subject === filterSubject) &&
		(filterType === 'All' || m.errorType === filterType)
	);

	function mistakeCardFront(m: MistakeLog) {
		return `${m.subject} [${m.errorType} Error]: ${m.description}`;
	}

	function isMistakeCardSaved(m: MistakeLog) {
		const target = mistakeCardFront(m);
		return ($tracker.flashcards || []).some(c => c.front === target);
	}

	function convertMistakeToFlashcard(m: MistakeLog) {
		const front = mistakeCardFront(m);
		const testContext = m.testName ? ` (${m.testName})` : '';
		const back = `Takeaway for ${m.subject}${testContext}:\nError Type: ${m.errorType}\nRoot Cause: ${m.description}\nAction item: Focus on the underlying formula or calculation technique to avoid repeating under exam conditions.`;
		
		updateTracker(s => {
			if (!s.flashcards) s.flashcards = [];
			if (s.flashcards.some(c => c.front === front)) return s;
			const card: Flashcard = {
				id: makeTestId('fc'),
				front,
				back,
				subject: m.subject.charAt(0).toUpperCase(),
				chapter: m.testName || 'Mistake Book',
				interval: 1,
				repetition: 0,
				efactor: 2.5,
				nextReviewAt: Date.now()
			};
			s.flashcards.push(card);
			return s;
		});
		celebration.set('Converted to Active Recall Flashcard! 🧠');
	}
</script>

<svelte:head>
	<title>Assessments | BTracker</title>
</svelte:head>

<div class="tests-container">
	<header class="glass">
		<div class="header-content">
			<div>
				<h1>Assessments</h1>
				<p>Track your test performance and log mistakes to improve.</p>
			</div>
			<div class="header-actions">
				<button type="button" class="paper-sheet-btn" on:click={() => openTestDaySheet()} title="Generate Test Day Paper Sheet">
					<NavIcon name="printer" size={15} />
					<span>Test Day Sheet</span>
				</button>
				{#if viewMode === 'mocks'}
					<button class="primary-btn" on:click={() => showModal = true}>
						<NavIcon name="plus" size={16} /> Log Test
					</button>
				{:else}
					<button class="primary-btn" on:click={() => showMistakeModal = true}>
						<NavIcon name="plus" size={16} /> Log Mistake
					</button>
				{/if}
			</div>
		</div>

		<div class="view-tabs" role="tablist">
			<button type="button" role="tab" class:selected={viewMode === 'mocks'} on:click={() => viewMode = 'mocks'}>Mock Scores</button>
			<button type="button" role="tab" class:selected={viewMode === 'mistakes'} on:click={() => viewMode = 'mistakes'}>Mistake Book</button>
		</div>
	</header>

	{#if viewMode === 'mocks'}
		<div class="tabs">
			<button class:active={tab === 'Btest'} on:click={() => tab = 'Btest'}>BTest Mocks</button>
			<button class:active={tab === 'Alt'} on:click={() => tab = 'Alt'}>Alt Mocks</button>
			<button class:active={tab === 'CET'} on:click={() => tab = 'CET'}>CET Mocks</button>
		</div>

		<div class="analytics-grid">
			<div class="stat-card glass">
				<span class="stat-label">Total Tests Logged</span>
				<span class="stat-value">{totalTests}</span>
			</div>
			<div class="stat-card glass">
				<span class="stat-label">Avg. Score</span>
				<span class="stat-value">{avgScore}</span>
			</div>
			
			{#if totalCorrect > 0 || totalIncorrect > 0}
			<div class="stat-card glass negative-analysis">
				<span class="stat-label">Accuracy & Errors (Past Data)</span>
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
			{/if}
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
							{#if test.correct > 0 || test.incorrect > 0}
							<div class="test-stats">
								<div class="stat"><span class="correct">✓ {test.correct}</span></div>
								<div class="stat"><span class="incorrect">✗ {test.incorrect}</span></div>
							</div>
							{/if}
							<div class="subject-breakdown">
								{#each Object.entries(test.subjects).filter(([sub]) => ['Physics', 'Chemistry', 'Maths'].includes(sub)) as [sub, data]}
									<div style="display: flex; justify-content: space-between;">
										<span>{sub}</span>
										<span>{data.score} marks{#if data.correct || data.incorrect} ({data.correct}C, {data.incorrect}I){/if}</span>
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
	{:else}
		<div class="filters glass">
			<div class="filter-group">
				<label for="filterSubject">Subject</label>
				<select id="filterSubject" bind:value={filterSubject}>
					<option value="All">All</option>
					<option value="Physics">Physics</option>
					<option value="Chemistry">Chemistry</option>
					<option value="Maths">Maths</option>
				</select>
			</div>
			<div class="filter-group">
				<label for="filterType">Type</label>
				<select id="filterType" bind:value={filterType}>
					<option value="All">All</option>
					<option value="Silly">Silly</option>
					<option value="Formula">Formula</option>
					<option value="Conceptual">Conceptual</option>
					<option value="Time">Time</option>
				</select>
			</div>
		</div>

		<!-- Test Day Paper Sheet Callout Banner -->
		<div class="sheet-cta-banner glass">
			<div class="cta-left">
				<div class="cta-icon"><NavIcon name="printer" size={18} /></div>
				<div class="cta-text">
					<b>Test Day Paper Sheet Generator</b>
					<p>Compile your personal mistakes, common traps to avoid, and starred formulas into a high-density, printable exam cheat sheet.</p>
				</div>
			</div>
			<button type="button" class="btn-sheet-cta" on:click={() => openTestDaySheet()}>
				<NavIcon name="printer" size={14} />
				<span>Generate Paper Sheet</span>
			</button>
		</div>

		<div class="grid">
			{#if filteredMistakes.length === 0}
				<div class="empty-state glass">
					<NavIcon name="book" size={48} />
					<p>No mistakes logged yet. Stay sharp!</p>
				</div>
			{:else}
				{#each filteredMistakes as mistake (mistake.id)}
					<div class="mistake-card glass">
						<div class="card-header">
							<span class="badge {mistake.subject.toLowerCase()}">{mistake.subject}</span>
							<span class="badge type">{mistake.errorType}</span>
							{#if isMistakeCardSaved(mistake)}
								<span class="icon-btn saved" title="Already added to Flashcards" style="color: var(--success); cursor: default;">
									<NavIcon name="check" size={13} />
								</span>
							{:else}
								<button class="icon-btn" title="Convert to Active Recall Flashcard" on:click={() => convertMistakeToFlashcard(mistake)}>
									<NavIcon name="layers" size={13} />
								</button>
							{/if}
							<button class="icon-btn" style="color: #e0455a;" title="Grill Me on this mistake" on:click={() => (grillingMistake = mistake)}>
								<NavIcon name="flame" size={14} />
							</button>
							<button class="icon-btn" style="color: #f59e0b; font-size: 0.95rem; line-height: 1;" title="Explain mistake to Feynman Duck" on:click={() => openFeynmanDuck({ subject: mistake.subject.charAt(0).toUpperCase(), chapter: mistake.testName || 'Mistake Analysis', concept: `${mistake.errorType} Error: ${mistake.description}` })}>
								🦆
							</button>
							<button class="icon-btn danger" on:click={() => deleteMistake(mistake.id)}>
								<NavIcon name="trash" size={14} />
							</button>
						</div>
						<div class="card-body">
							<p>{mistake.description}</p>
						</div>
						<div class="card-footer">
							<span>{new Date(mistake.date).toLocaleDateString()}</span>
							{#if mistake.testName}
								<span><NavIcon name="tests" size={12} /> {mistake.testName}</span>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<Modal bind:open={showModal} title="Log New {tab} Test" width="500px">
	<div class="modal-body-content">
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
				<input id="totalMarks" type="number" inputmode="numeric" bind:value={totalMarks} />
			</div>
		</div>
		<div class="subjects-input">
			<h3>Subject Performance</h3>
			<div class="sub-row header-row">
				<strong>Subject</strong>
				<span class="col-label">Score</span>
				<span class="col-label correct-label">Correct</span>
				<span class="col-label incorrect-label">Wrong</span>
			</div>
			<div class="sub-row">
				<strong>Physics</strong>
				<input type="number" inputmode="numeric" placeholder="Score" bind:value={p.score} />
				<input type="number" inputmode="numeric" placeholder="Correct" bind:value={p.correct} />
				<input type="number" inputmode="numeric" placeholder="Wrong" bind:value={p.incorrect} />
			</div>
			<div class="sub-row">
				<strong>Chemistry</strong>
				<input type="number" inputmode="numeric" placeholder="Score" bind:value={c.score} />
				<input type="number" inputmode="numeric" placeholder="Correct" bind:value={c.correct} />
				<input type="number" inputmode="numeric" placeholder="Wrong" bind:value={c.incorrect} />
			</div>
			<div class="sub-row">
				<strong>Maths</strong>
				<input type="number" inputmode="numeric" placeholder="Score" bind:value={m.score} />
				<input type="number" inputmode="numeric" placeholder="Correct" bind:value={m.correct} />
				<input type="number" inputmode="numeric" placeholder="Wrong" bind:value={m.incorrect} />
			</div>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<button class="text-btn" on:click={() => showModal = false}>Cancel</button>
		<button class="primary-btn" on:click={saveTest} disabled={!name}>Save Test</button>
	</svelte:fragment>
</Modal>

<Modal bind:open={showMistakeModal} title="Log a Mistake" width="480px">
	<div class="modal-body-content">
		<div class="form-row">
			<div class="form-group">
				<label for="mistakeSubject">Subject</label>
				<select id="mistakeSubject" bind:value={mistakeSubject}>
					<option value="Physics">Physics</option>
					<option value="Chemistry">Chemistry</option>
					<option value="Maths">Maths</option>
				</select>
			</div>
			<div class="form-group">
				<label for="mistakeType">Error Type</label>
				<select id="mistakeType" bind:value={mistakeType}>
					<option value="Silly">Silly (Calculation/Reading)</option>
					<option value="Formula">Formula (Forgot/Used Wrong)</option>
					<option value="Conceptual">Conceptual (Didn't know)</option>
					<option value="Time">Time (Rushed/Too slow)</option>
				</select>
			</div>
		</div>
		<div class="form-group">
			<label for="mistakeTestName">Test/Mock Name (Optional)</label>
			<input id="mistakeTestName" type="text" bind:value={mistakeTestName} placeholder="e.g. BTest 3" />
		</div>
		<div class="form-group">
			<label for="mistakeDesc">Description</label>
			<textarea id="mistakeDesc" bind:value={description} placeholder="What did you get wrong and why?" rows="3"></textarea>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<button class="text-btn" on:click={() => showMistakeModal = false}>Cancel</button>
		<button class="primary-btn" on:click={saveMistake} disabled={!description.trim()}>Save Mistake</button>
	</svelte:fragment>
</Modal>

<GrillMeModal mistake={grillingMistake} on:close={() => (grillingMistake = null)} />
<style>
	.tests-container { padding: 1.5rem; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
	.glass { background: var(--surface-panel); border: 1px solid var(--border-subtle); backdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter); border-radius: 16px; }
	
	header { padding: 1.5rem; display: flex; flex-direction: column; }
	.header-content { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
	.header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
	.paper-sheet-btn {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		padding: 0.7rem 1.15rem;
		border-radius: 12px;
		font-weight: 700;
		font-size: 0.88rem;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.paper-sheet-btn:hover {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
		border-color: var(--accent);
		transform: translateY(-1px);
		box-shadow: 0 4px 14px -3px color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.sheet-cta-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 1.1rem 1.4rem;
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-panel));
		border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border-subtle));
		border-radius: 14px;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}
	.cta-left { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 250px; }
	.cta-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		flex-shrink: 0;
	}
	.cta-text b { display: block; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.15rem; }
	.cta-text p { margin: 0; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; }
	.btn-sheet-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.65rem 1.15rem;
		border-radius: 10px;
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		border: 1px solid var(--accent);
		font-weight: 750;
		font-size: 0.82rem;
		cursor: pointer;
		transition: all 0.18s ease;
		box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--accent) 40%, transparent);
		white-space: nowrap;
	}
	.btn-sheet-cta:hover { filter: brightness(1.1); transform: translateY(-1px); }
	h1 { font-size: 1.75rem; margin: 0 0 0.5rem 0; color: var(--text-primary); }
	p { margin: 0; color: var(--text-secondary); }
	
	.view-tabs { display: flex; border-bottom: 1px solid var(--border-subtle); margin: 0 -1.5rem; padding: 0 1.5rem; }
	.view-tabs button { background: transparent; border: none; padding: 0.75rem 0; margin-right: 1.5rem; color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; transform: translateY(1px); }
	.view-tabs button:hover { color: var(--text-primary); }
	.view-tabs button.selected { color: var(--accent); border-bottom-color: var(--accent); }

	.tabs { display: flex; gap: 0.5rem; border-top: 1px solid transparent; }
	.tabs button { background: transparent; border: none; padding: 0.75rem 1.25rem; color: var(--text-secondary); font-weight: 600; font-size: 0.95rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
	.tabs button:hover { color: var(--text-primary); }
	.tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
	
	.primary-btn { background: var(--accent); color: var(--accent-contrast, white); border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
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
	.test-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.2s, box-shadow 0.2s; }
	.test-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
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
	
	.empty-state { grid-column: 1 / -1; padding: 4rem; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
	
	/* Form Styles */
	.modal-body-content { display: flex; flex-direction: column; gap: 1.25rem; }
	.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
	.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
	.subjects-input { margin-top: 0.5rem; }
	.subjects-input h3 { font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary); }
	.sub-row { display: grid; grid-template-columns: 70px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr); gap: 0.4rem; align-items: center; margin-bottom: 0.75rem; width: 100%; }
	.sub-row input { min-width: 0; width: 100%; padding: 0.4rem; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-primary); }
	.sub-row input:focus { border-color: var(--accent); outline: none; }
	.sub-row strong { color: var(--text-secondary); font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; }
	.col-label { font-size: 0.65rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
	.correct-label { color: #10b981; }
	.incorrect-label { color: #ef4444; }
	
	.text-btn { background: transparent; border: none; color: var(--text-secondary); font-weight: 600; cursor: pointer; padding: 0.5rem 1rem; border-radius: 8px; }
	.text-btn:hover { background: var(--surface-subtle); color: var(--text-primary); }

	/* MISTAKES SPECIFIC */
	.filters { padding: 1rem 1.5rem; display: flex; gap: 1.5rem; }
	.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
	.filter-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
	select { background: var(--surface-subtle); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 8px; font-family: inherit; font-size: 0.95rem; }
	select:focus { outline: none; border-color: var(--accent); }

	.mistake-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.2s, box-shadow 0.2s; }
	.mistake-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card); }
	.card-header { display: flex; align-items: center; gap: 0.5rem; }
	.badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
	.badge.physics { background: color-mix(in srgb, #3b82f6, transparent 80%); color: #60a5fa; }
	.badge.chemistry { background: color-mix(in srgb, #f59e0b, transparent 80%); color: #fbbf24; }
	.badge.maths { background: color-mix(in srgb, #ef4444, transparent 80%); color: #f87171; }
	.badge.type { background: var(--surface-subtle); color: var(--text-secondary); margin-right: auto; }
	.card-body p { margin: 0; color: var(--text-primary); font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap; }
	.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 1rem; color: var(--text-secondary); font-size: 0.8rem; }
	.card-footer span { display: flex; align-items: center; gap: 0.4rem; }

	textarea { background: color-mix(in srgb, var(--surface-panel), transparent 40%); border: 1px solid color-mix(in srgb, var(--border-subtle), transparent 30%); color: var(--text-primary); padding: 0.75rem; border-radius: 8px; font-family: inherit; font-size: 0.95rem; resize: vertical; }
	textarea:focus { outline: none; border-color: var(--accent); }

	@media (max-width: 768px) {
		.tests-container { padding: 0.5rem 0; gap: 1.25rem; }
		header { padding: 1.15rem 1rem; border-radius: 16px; }
		.header-content { flex-direction: column; align-items: flex-start; gap: 0.85rem; margin-bottom: 1rem; }
		.header-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
		.paper-sheet-btn, .header-content .primary-btn { width: 100%; justify-content: center; min-height: 42px; font-size: 0.85rem; }
		.view-tabs { display: grid; grid-template-columns: 1fr 1fr; width: 100%; margin: 0; padding: 0.3rem; border-radius: 12px; }
		.view-tabs button { justify-content: center; text-align: center; font-size: 0.82rem; }
		.tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; width: 100%; overflow-x: visible; }
		.tabs button { justify-content: center; text-align: center; padding: 0.55rem 0.25rem; font-size: 0.8rem; }
		.analytics-grid { grid-template-columns: repeat(2, 1fr); gap: 0.65rem; }
		.negative-analysis { grid-column: span 2; }
		.negative-stats { gap: 1rem; }
		.grid { grid-template-columns: 1fr; }
		.form-row { grid-template-columns: 1fr; gap: 0.75rem; }
		.sub-row { grid-template-columns: 65px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr); gap: 0.25rem; }
		.sub-row input { padding: 0.5rem 0.25rem; font-size: 0.85rem; height: 38px; }
		.filters { flex-direction: column; gap: 0.75rem; padding: 1rem; }
		.filter-group select { width: 100%; height: 42px; }
	}

	@media (max-width: 480px) {
		.header-actions { grid-template-columns: 1fr; }
		.analytics-grid { grid-template-columns: 1fr; }
		.negative-analysis { grid-column: span 1; }
	}
</style>