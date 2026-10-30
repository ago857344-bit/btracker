<script lang="ts">
	import { page } from '$app/stores';
	import { tracker, updateTracker, celebration, triggerToast, openFeynmanDuck, openTestDaySheet } from '$lib/stores/tracker';
	import type { MockTest, MistakeLog, Flashcard } from '$lib/types/tracker';
	import { applyEloResult } from '$lib/state/gamification';
	import { SYLLABUS } from '$lib/state/syllabus';
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
	let editingTestId: string | null = null;
	let name = '';
	let dateStr = new Date().toISOString().split('T')[0];
	let totalMarks = 300;
	
	let p = { score: 0, correct: 0, incorrect: 0 };
	let c = { score: 0, correct: 0, incorrect: 0 };
	let m = { score: 0, correct: 0, incorrect: 0 };

	function makeTestId(prefix: string) {
		return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
	}

	function openNewTestModal() {
		editingTestId = null;
		name = '';
		dateStr = new Date().toISOString().split('T')[0];
		totalMarks = 300;
		p = { score: 0, correct: 0, incorrect: 0 };
		c = { score: 0, correct: 0, incorrect: 0 };
		m = { score: 0, correct: 0, incorrect: 0 };
		showModal = true;
	}

	function startEditTest(test: MockTest) {
		editingTestId = test.id;
		name = test.name;
		dateStr = new Date(test.date).toISOString().split('T')[0];
		totalMarks = test.totalMarks || 300;
		
		const phys = test.subjects?.Physics || test.subjects?.P || { score: 0, correct: 0, incorrect: 0 };
		const chem = test.subjects?.Chemistry || test.subjects?.C || { score: 0, correct: 0, incorrect: 0 };
		const math = test.subjects?.Maths || test.subjects?.M || { score: 0, correct: 0, incorrect: 0 };
		
		p = { score: phys.score || 0, correct: phys.correct || 0, incorrect: phys.incorrect || 0 };
		c = { score: chem.score || 0, correct: chem.correct || 0, incorrect: chem.incorrect || 0 };
		m = { score: math.score || 0, correct: math.correct || 0, incorrect: math.incorrect || 0 };
		
		showModal = true;
	}

	function saveTest() {
		if (editingTestId) {
			updateTracker(t => {
				if (!t.mocks) t.mocks = [];
				const idx = t.mocks.findIndex(m => m.id === editingTestId);
				if (idx !== -1) {
					t.mocks[idx] = {
						...t.mocks[idx],
						name,
						date: new Date(dateStr).getTime(),
						category: tab,
						score: p.score + c.score + m.score,
						totalMarks,
						correct: p.correct + c.correct + m.correct,
						incorrect: p.incorrect + c.incorrect + m.incorrect,
						updated: Date.now(),
						subjects: {
							Physics: { ...p },
							Chemistry: { ...c },
							Maths: { ...m },
							P: { ...p },
							C: { ...c },
							M: { ...m }
						}
					};
				}
				return t;
			});
			triggerToast('Test updated successfully');
			showModal = false;
			editingTestId = null;
			name = '';
			return;
		}

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
			updated: Date.now(),
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
			const subMax = totalMarks > 0 ? totalMarks / 3 : 100;
			['P', 'C', 'M'].forEach(code => {
				const sData = (newTest.subjects as any)[subMap[code as 'P'|'C'|'M']];
				if (sData) {
					const attempted = sData.correct + sData.incorrect;
					if (attempted > 0) {
						const accuracy = (sData.correct / attempted) * 100;
						const scorePct = subMax > 0 ? Math.max(0, (sData.score / subMax) * 100) : accuracy;
						const blended = 0.5 * accuracy + 0.5 * scorePct;
						applyEloResult(t.gamification!, code, blended, 100);
					}
				}
			});
			return t;
		});
		
		triggerToast(`Logged test "${newTest.name}" (+200 XP)`);
		showModal = false;
		name = '';
	}

	function deleteTest(id: string) {
		const target = ($tracker.mocks || []).find(m => m.id === id);
		if (!target) return;
		updateTracker(t => {
			t.mocks = t.mocks.filter(m => m.id !== id);
			t.deletedIds ??= {};
			t.deletedIds[id] = Date.now();
			if (t.gamification) {
				t.gamification.xp = Math.max(0, (t.gamification.xp || 0) - 200);
			}
			return t;
		});
		triggerToast({
			text: `Deleted test "${target.name}" (-200 XP)`,
			actionLabel: 'Undo',
			onAction: () => {
				updateTracker(t => {
					if (!t.mocks) t.mocks = [];
					t.mocks.push(target);
					if (t.deletedIds) delete t.deletedIds[id];
					if (!t.gamification) t.gamification = { xp: 0, level: 1, elo: { P: 300, C: 300, M: 300 } };
					t.gamification.xp += 200;
					return t;
				});
			}
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

	/* -------- PROGRESSION CHART LOGIC -------- */
	let showTotal = true;
	let showPhysics = true;
	let showChemistry = true;
	let showMaths = true;
	let showPotential = false;
	let hoveredIndex: number | null = null;

	$: chronologicalTests = [...filteredTests].sort((a, b) => a.date - b.date);

	const svgW = 680;
	const svgH = 220;
	const padL = 40;
	const padR = 25;
	const padT = 20;
	const padB = 30;
	const plotW = svgW - padL - padR;
	const plotH = svgH - padT - padB;

	function getChartX(index: number, total: number) {
		if (total <= 1) return padL + plotW / 2;
		return padL + (index / (total - 1)) * plotW;
	}

	function getChartY(percent: number) {
		const clamped = Math.max(0, Math.min(100, percent));
		return padT + (1 - clamped / 100) * plotH;
	}

	function testSubjectPct(t: MockTest, sub: 'P' | 'C' | 'M') {
		const fullName = sub === 'P' ? 'Physics' : sub === 'C' ? 'Chemistry' : 'Maths';
		const s = (t.subjects as any)?.[fullName] || (t.subjects as any)?.[sub];
		const score = s?.score ?? 0;
		const maxMarks = (t.totalMarks || 300) / 3;
		return Math.round((score / (maxMarks || 100)) * 100);
	}

	function testTotalPct(t: MockTest) {
		return Math.round((t.score / (t.totalMarks || 300)) * 100);
	}

	function testPotentialPct(t: MockTest) {
		return Math.min(100, Math.round(((t.score + (t.incorrect || 0)) / (t.totalMarks || 300)) * 100));
	}

	function buildSvgLine(tests: MockTest[], getPct: (t: MockTest) => number) {
		if (!tests.length) return '';
		return tests.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getChartX(i, tests.length).toFixed(1)} ${getChartY(getPct(t)).toFixed(1)}`).join(' ');
	}

	function buildSvgArea(tests: MockTest[], getPct: (t: MockTest) => number) {
		if (tests.length < 2) return '';
		const line = buildSvgLine(tests, getPct);
		const lastX = getChartX(tests.length - 1, tests.length).toFixed(1);
		const firstX = getChartX(0, tests.length).toFixed(1);
		const bottomY = (padT + plotH).toFixed(1);
		return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
	}

	// ======== MISTAKES LOGIC ========
	$: mistakes = $tracker.mistakes || [];
	let showMistakeModal = false;

	let mistakeSubject = 'Physics';
	let mistakeChapter = '';
	let mistakeType: MistakeLog['errorType'] = 'Silly';
	let description = '';
	let mistakeTestName = '';

	$: availableChapters = SYLLABUS.find(s => s.name === mistakeSubject || s.code === mistakeSubject?.charAt(0))?.modules.flatMap(m => m.chapters) || [];

	function saveMistake() {
		const newMistake: MistakeLog = {
			id: makeTestId('mistake'),
			date: Date.now(),
			subject: mistakeSubject,
			chapter: mistakeChapter || undefined,
			errorType: mistakeType,
			description,
			testName: mistakeTestName || undefined,
			updated: Date.now()
		};

		updateTracker(t => {
			if (!t.mistakes) t.mistakes = [];
			t.mistakes.push(newMistake);
			return t;
		});

		triggerToast('Logged mistake to Mistake Book');
		showMistakeModal = false;
		description = '';
		mistakeTestName = '';
		mistakeChapter = '';
	}

	function deleteMistake(id: string) {
		const target = ($tracker.mistakes || []).find(m => m.id === id);
		if (!target) return;
		updateTracker(t => {
			t.mistakes = t.mistakes.filter(m => m.id !== id);
			t.deletedIds ??= {};
			t.deletedIds[id] = Date.now();
			return t;
		});
		triggerToast({
			text: 'Mistake deleted',
			actionLabel: 'Undo',
			onAction: () => {
				updateTracker(t => {
					if (!t.mistakes) t.mistakes = [];
					t.mistakes.push(target);
					if (t.deletedIds) delete t.deletedIds[id];
					return t;
				});
			}
		});
	}

	let filterSubject = 'All';
	let filterType = 'All';
	let filterStatus: 'active' | 'mastered' | 'all' = 'active';

	$: filteredMistakes = mistakes.filter(m => {
		const matchesSubject = filterSubject === 'All' || m.subject === filterSubject;
		const matchesType = filterType === 'All' || m.errorType === filterType;
		const matchesStatus =
			filterStatus === 'all' ? true :
			filterStatus === 'mastered' ? !!m.resolved :
			!m.resolved;
		return matchesSubject && matchesType && matchesStatus;
	});

	function toggleMistakeMastered(m: MistakeLog) {
		const targetId = m.id;
		const wasResolved = !!m.resolved;
		const newResolved = !wasResolved;
		const xpAwarded = !wasResolved && !m.resolvedAt;

		updateTracker(t => {
			if (!t.mistakes) return t;
			const idx = t.mistakes.findIndex(item => item.id === targetId);
			if (idx !== -1) {
				t.mistakes[idx].resolved = newResolved;
				t.mistakes[idx].updated = Date.now();
				if (newResolved && !t.mistakes[idx].resolvedAt) {
					t.mistakes[idx].resolvedAt = Date.now();
				}
			}
			if (xpAwarded) {
				if (!t.gamification) t.gamification = { xp: 50, level: 1, elo: { P: 300, C: 300, M: 300 } };
				else t.gamification.xp = (t.gamification.xp || 0) + 50;
			}
			return t;
		});

		if (xpAwarded) {
			celebration.set('Mistake mastered! +50 XP 🏆');
		}

		triggerToast({
			text: newResolved ? 'Mistake marked as mastered' : 'Mistake restored to active',
			actionLabel: 'Undo',
			onAction: () => {
				updateTracker(t => {
					if (!t.mistakes) return t;
					const idx = t.mistakes.findIndex(item => item.id === targetId);
					if (idx !== -1) {
						t.mistakes[idx].resolved = wasResolved;
						t.mistakes[idx].updated = Date.now();
					}
					if (xpAwarded) {
						if (t.gamification) t.gamification.xp = Math.max(0, (t.gamification.xp || 0) - 50);
					}
					return t;
				});
			}
		});
	}

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
				subject: (m.subject?.charAt(0).toUpperCase() === 'C' ? 'C' : m.subject?.charAt(0).toUpperCase() === 'M' ? 'M' : 'P') as any,
				chapter: m.testName || 'Mistake Book',
				interval: 1,
				repetition: 0,
				efactor: 2.5,
				nextReviewAt: Date.now()
			};
			s.flashcards.push(card);
			return s;
		});
		triggerToast('Converted to Active Recall Flashcard! 🧠');
	}
</script>

<svelte:head>
	<title>Assessments | BTracker</title>
</svelte:head>

<div class="tests-container">
	<header class="page-header">
		<div class="page-header-copy">
			<span class="page-eyebrow">Academic Benchmark Engine</span>
			<h1 class="page-title">Assessments</h1>
			<p class="page-subtitle">Track your mock test performance, score analytics, and log mistake patterns to optimize exam strategy.</p>
		</div>
		<div class="page-header-actions">
			<div class="segmented-control" role="tablist" aria-label="Assessment views">
				<button type="button" role="tab" class:active={viewMode === 'mocks'} on:click={() => viewMode = 'mocks'}>Mock Scores</button>
				<button type="button" role="tab" class:active={viewMode === 'mistakes'} on:click={() => viewMode = 'mistakes'}>Mistake Book</button>
			</div>
			<button type="button" class="paper-sheet-btn" on:click={() => openTestDaySheet()} title="Generate Test Day Paper Sheet">
				<NavIcon name="printer" size={15} />
				<span>Test Day Sheet</span>
			</button>
			{#if viewMode === 'mocks'}
				<button class="primary-btn" on:click={openNewTestModal}>
					<NavIcon name="plus" size={16} /> Log Test
				</button>
			{:else}
				<button class="primary-btn" on:click={() => showMistakeModal = true}>
					<NavIcon name="plus" size={16} /> Log Mistake
				</button>
			{/if}
		</div>
	</header>

	{#if viewMode === 'mocks'}
		<div class="segmented-control" style="margin-bottom: 1.25rem;">
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

		{#if filteredTests.length >= 2}
			<div class="trend-chart-card glass">
				<div class="chart-header">
					<div class="chart-title-wrap">
						<NavIcon name="trend" size={16} />
						<h3>Score Progression & Subject Breakdown</h3>
					</div>
					<div class="chart-toggles">
						<button type="button" class="chip-toggle total" class:active={showTotal} on:click={() => showTotal = !showTotal}>
							<span class="chip-dot"></span> Total ({chronologicalTests[chronologicalTests.length - 1].score}/{chronologicalTests[chronologicalTests.length - 1].totalMarks})
						</button>
						<button type="button" class="chip-toggle potential" class:active={showPotential} on:click={() => showPotential = !showPotential}>
							<span class="chip-dot"></span> No-Negative Potential
						</button>
						<button type="button" class="chip-toggle phys" class:active={showPhysics} on:click={() => showPhysics = !showPhysics}>
							<span class="chip-dot"></span> Physics
						</button>
						<button type="button" class="chip-toggle chem" class:active={showChemistry} on:click={() => showChemistry = !showChemistry}>
							<span class="chip-dot"></span> Chemistry
						</button>
						<button type="button" class="chip-toggle math" class:active={showMaths} on:click={() => showMaths = !showMaths}>
							<span class="chip-dot"></span> Maths
						</button>
					</div>
				</div>

				<div class="svg-container">
					<svg viewBox="0 0 {svgW} {svgH}" class="progression-svg" preserveAspectRatio="none">
						<defs>
							<linearGradient id="totalAreaGrad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28" />
								<stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
							</linearGradient>
						</defs>

						<!-- Grid lines -->
						{#each [0, 25, 50, 75, 100] as gridPct}
							{@const y = getChartY(gridPct)}
							<line x1={padL} y1={y} x2={svgW - padR} y2={y} class="grid-line" />
							<text x={padL - 8} y={y + 3.5} class="axis-label" text-anchor="end">{gridPct}%</text>
						{/each}

						<!-- Area under Total -->
						{#if showTotal}
							<path d={buildSvgArea(chronologicalTests, testTotalPct)} fill="url(#totalAreaGrad)" />
						{/if}

						<!-- Subject Lines -->
						{#if showPotential}
							<path d={buildSvgLine(chronologicalTests, testPotentialPct)} class="chart-path potential-path" stroke-dasharray="4 4" />
						{/if}
						{#if showPhysics}
							<path d={buildSvgLine(chronologicalTests, (t) => testSubjectPct(t, 'P'))} class="chart-path phys-path" />
						{/if}
						{#if showChemistry}
							<path d={buildSvgLine(chronologicalTests, (t) => testSubjectPct(t, 'C'))} class="chart-path chem-path" />
						{/if}
						{#if showMaths}
							<path d={buildSvgLine(chronologicalTests, (t) => testSubjectPct(t, 'M'))} class="chart-path math-path" />
						{/if}
						{#if showTotal}
							<path d={buildSvgLine(chronologicalTests, testTotalPct)} class="chart-path total-path" />
						{/if}

						<!-- Dots and Hover Columns -->
						{#each chronologicalTests as test, i}
							{@const cx = getChartX(i, chronologicalTests.length)}
							{@const totalY = getChartY(testTotalPct(test))}
							{@const isHovered = hoveredIndex === i}

							{#if isHovered}
								<line x1={cx} y1={padT} x2={cx} y2={padT + plotH} class="hover-guide-line" />
							{/if}

							<!-- Total dot -->
							{#if showTotal}
								<circle cx={cx} cy={totalY} r={isHovered ? 6 : 4} class="chart-dot total-dot" />
							{/if}

							<!-- Interactive hover hit column -->
							<rect
								role="presentation"
								x={cx - (plotW / (chronologicalTests.length - 1 || 1)) / 2}
								y={padT}
								width={plotW / (chronologicalTests.length - 1 || 1)}
								height={plotH + padB}
								fill="transparent"
								class="hit-rect"
								on:mouseenter={() => (hoveredIndex = i)}
								on:mouseleave={() => (hoveredIndex = null)}
							/>
						{/each}
					</svg>

					{#if hoveredIndex !== null && chronologicalTests[hoveredIndex]}
						{@const ht = chronologicalTests[hoveredIndex]}
						{@const hx = getChartX(hoveredIndex, chronologicalTests.length)}
						<div class="chart-tooltip glass" style="left: calc({(hx / svgW) * 100}%);">
							<div class="tip-head">
								<b>{ht.name}</b>
								<small>{formatDate(ht.date)}</small>
							</div>
							<div class="tip-row total">
								<span>Total:</span>
								<b>{ht.score} / {ht.totalMarks} ({testTotalPct(ht)}%)</b>
							</div>
							{#if showPotential}
								<div class="tip-row potential" style="color: #ec4899; font-size: 0.72rem; display: flex; justify-content: space-between; margin-top: 0.15rem;">
									<span>Potential:</span>
									<b>{testPotentialPct(ht)}% (Bleed: -{Math.max(0, testPotentialPct(ht) - testTotalPct(ht))}%)</b>
								</div>
							{/if}
							<div class="tip-subjects">
								<span class="sub-pill p">P: {ht.subjects?.Physics?.score ?? ht.subjects?.P?.score ?? 0}</span>
								<span class="sub-pill c">C: {ht.subjects?.Chemistry?.score ?? ht.subjects?.C?.score ?? 0}</span>
								<span class="sub-pill m">M: {ht.subjects?.Maths?.score ?? ht.subjects?.M?.score ?? 0}</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<div class="tests-list">
			<h2>Past {tab === 'CET' ? 'CET ' : tab} Tests</h2>
			{#if filteredTests.length > 0}
				<div class="grid">
					{#each [...filteredTests].sort((a, b) => b.date - a.date) as test (test.id)}
						{@const pScore = Math.max(0, test.subjects?.Physics?.score ?? test.subjects?.P?.score ?? 0)}
						{@const cScore = Math.max(0, test.subjects?.Chemistry?.score ?? test.subjects?.C?.score ?? 0)}
						{@const mScore = Math.max(0, test.subjects?.Maths?.score ?? test.subjects?.M?.score ?? 0)}
						{@const scoreSum = (pScore + cScore + mScore) || 1}
						{@const pPct = (pScore / scoreSum) * 100}
						{@const cPct = (cScore / scoreSum) * 100}
						{@const mPct = (mScore / scoreSum) * 100}
						<div class="test-card glass">
							<div class="test-header">
								<h3>{test.name}</h3>
								<div class="test-actions">
									<button class="icon-btn edit" on:click={() => startEditTest(test)} aria-label="Edit test" title="Edit test">
										<NavIcon name="edit" size={15} />
									</button>
									<button class="icon-btn danger" on:click={() => deleteTest(test.id)} aria-label="Delete test" title="Delete test">
										<NavIcon name="trash" size={15} />
									</button>
								</div>
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

							<div class="score-stacked-bar" title="Score Share: P {Math.round(pPct)}% · C {Math.round(cPct)}% · M {Math.round(mPct)}%">
								<div class="bar-seg p" style="width: {pPct}%"></div>
								<div class="bar-seg c" style="width: {cPct}%"></div>
								<div class="bar-seg m" style="width: {mPct}%"></div>
							</div>

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
				<div class="empty-state">
					<div class="empty-state-icon">
						<NavIcon name="tests" size={24} />
					</div>
					<h3 class="empty-state-title">No {tab} tests logged yet</h3>
					<p class="empty-state-desc">Log your scores, question breakdown, and negative marks to benchmark progress.</p>
					<button class="primary-btn" on:click={openNewTestModal}>
						<NavIcon name="plus" size={15} /> Log First Test
					</button>
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
			<div class="filter-group">
				<label for="filterStatus">Status</label>
				<div id="filterStatus" class="segmented-control">
					<button type="button" class:active={filterStatus === 'active'} on:click={() => filterStatus = 'active'}>Active</button>
					<button type="button" class:active={filterStatus === 'mastered'} on:click={() => filterStatus = 'mastered'}>Mastered</button>
					<button type="button" class:active={filterStatus === 'all'} on:click={() => filterStatus = 'all'}>All</button>
				</div>
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
				<div class="empty-state">
					<div class="empty-state-icon">
						<NavIcon name="book" size={24} />
					</div>
					<h3 class="empty-state-title">No mistakes logged yet</h3>
					<p class="empty-state-desc">Capture conceptual traps, calculation errors, or silly slips to eliminate repeat mistakes.</p>
					<button class="primary-btn" on:click={() => showMistakeModal = true}>
						<NavIcon name="plus" size={15} /> Log First Mistake
					</button>
				</div>
			{:else}
				{#each filteredMistakes as mistake (mistake.id)}
					<div class="mistake-card glass" class:is-resolved={mistake.resolved}>
						<div class="card-header">
							<span class="badge {mistake.subject.toLowerCase()}">{mistake.subject}</span>
							{#if mistake.chapter}
								<span class="badge chapter font-mono">{mistake.chapter}</span>
							{/if}
							<span class="badge type">{mistake.errorType}</span>
							<button
								type="button"
								class="master-pill-btn"
								class:mastered={mistake.resolved}
								title={mistake.resolved ? "Mastered (click to unresolve)" : "Mark as Mastered (+50 XP)"}
								on:click={() => toggleMistakeMastered(mistake)}
							>
								<NavIcon name={mistake.resolved ? "check" : "circle"} size={12} />
								<span>{mistake.resolved ? 'Mastered' : 'Master'}</span>
							</button>
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

<Modal bind:open={showModal} title="{editingTestId ? 'Edit' : 'Log New'} {tab} Test" width="500px">
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
		<button class="primary-btn" on:click={saveTest} disabled={!name}>{editingTestId ? 'Update Test' : 'Save Test'}</button>
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
			<label for="mistakeChapter">Chapter (Optional)</label>
			<select id="mistakeChapter" bind:value={mistakeChapter}>
				<option value="">-- None / General --</option>
				{#each availableChapters as ch}
					<option value={ch.name}>{ch.no}. {ch.name}</option>
				{/each}
			</select>
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

	/* Progression Trend Chart */
	.trend-chart-card {
		padding: 1.25rem 1.4rem;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: relative;
	}
	.chart-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.chart-title-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
	}
	.chart-title-wrap h3 {
		margin: 0;
		font-size: 0.96rem;
		font-weight: 750;
		letter-spacing: -0.01em;
	}
	.chart-toggles {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}
	.chip-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.16s ease;
	}
	.chip-toggle .chip-dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
	}
	.chip-toggle.total .chip-dot { background: var(--accent); }
	.chip-toggle.potential .chip-dot { background: #ec4899; }
	.chip-toggle.phys .chip-dot { background: #3b82f6; }
	.chip-toggle.chem .chip-dot { background: #10b981; }
	.chip-toggle.math .chip-dot { background: #f59e0b; }
	.chip-toggle.active {
		background: color-mix(in srgb, var(--surface-panel), transparent 20%);
		color: var(--text-primary);
		border-color: currentColor;
	}
	.chip-toggle:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.svg-container {
		position: relative;
		width: 100%;
		height: 220px;
		overflow: visible;
	}
	.progression-svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.grid-line {
		stroke: var(--border-subtle);
		stroke-dasharray: 3 4;
		stroke-width: 0.9;
		opacity: 0.65;
	}
	.axis-label {
		fill: var(--text-secondary);
		font-size: 10px;
		font-weight: 600;
		font-family: inherit;
	}
	.chart-path {
		fill: none;
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.chart-path.total-path { stroke: var(--accent); stroke-width: 2.8; filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--accent), transparent 60%)); }
	.chart-path.potential-path { stroke: #ec4899; stroke-width: 2.2; opacity: 0.85; }
	.chart-path.phys-path { stroke: #3b82f6; opacity: 0.85; }
	.chart-path.chem-path { stroke: #10b981; opacity: 0.85; }
	.chart-path.math-path { stroke: #f59e0b; opacity: 0.85; }

	.chart-dot {
		fill: var(--surface-panel);
		stroke-width: 2.5;
		transition: r 0.15s ease;
	}
	.chart-dot.total-dot { stroke: var(--accent); }

	.hover-guide-line {
		stroke: var(--accent);
		stroke-width: 1.2;
		stroke-dasharray: 2 3;
		opacity: 0.6;
	}
	.hit-rect { cursor: crosshair; }

	.chart-tooltip {
		position: absolute;
		top: 15px;
		transform: translateX(-50%);
		padding: 0.6rem 0.85rem;
		border-radius: 12px;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		z-index: 10;
		min-width: 160px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel), rgba(15, 18, 28, 0.9) 70%);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
	}
	.tip-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 0.25rem;
	}
	.tip-head b { font-size: 0.82rem; color: var(--text-primary); }
	.tip-head small { font-size: 0.7rem; color: var(--text-secondary); }
	.tip-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.78rem;
		color: var(--text-secondary);
	}
	.tip-row.total b { color: var(--accent); font-weight: 750; }
	.tip-subjects {
		display: flex;
		gap: 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		padding-top: 0.2rem;
	}
	.sub-pill.p { color: #60a5fa; }
	.sub-pill.c { color: #34d399; }
	.sub-pill.m { color: #fbbf24; }

	.test-actions { display: inline-flex; align-items: center; gap: 0.2rem; }
	
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

	.score-stacked-bar {
		display: flex;
		height: 6px;
		border-radius: 99px;
		overflow: hidden;
		background: var(--surface-subtle);
		gap: 2px;
		margin: 0.2rem 0;
	}
	.score-stacked-bar .bar-seg {
		height: 100%;
		border-radius: 99px;
		transition: width 0.3s ease;
	}
	.score-stacked-bar .bar-seg.p { background: #38bdf8; }
	.score-stacked-bar .bar-seg.c { background: #34d399; }
	.score-stacked-bar .bar-seg.m { background: #a78bfa; }
	
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
	.mistake-card.is-resolved {
		opacity: 0.82;
		border-color: color-mix(in srgb, #10b981 30%, var(--border-subtle));
	}
	.card-header { display: flex; align-items: center; gap: 0.5rem; }
	.master-pill-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		border-radius: 99px;
		font-size: 0.7rem;
		font-weight: 700;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.master-pill-btn:hover {
		background: color-mix(in srgb, #eab308 15%, transparent);
		border-color: #eab308;
		color: #eab308;
	}
	.master-pill-btn.mastered {
		background: color-mix(in srgb, #10b981 18%, transparent);
		border-color: #10b981;
		color: #10b981;
	}
	.badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
	.badge.physics { background: color-mix(in srgb, #3b82f6, transparent 80%); color: #60a5fa; }
	.badge.chemistry { background: color-mix(in srgb, #f59e0b, transparent 80%); color: #fbbf24; }
	.badge.maths { background: color-mix(in srgb, #ef4444, transparent 80%); color: #f87171; }
	.badge.chapter { background: color-mix(in srgb, var(--accent) 12%, var(--surface-subtle)); color: var(--accent); font-size: 0.72rem; text-transform: none; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
		.paper-sheet-btn, .primary-btn { width: 100%; justify-content: center; min-height: 42px; font-size: 0.85rem; }
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