<script lang="ts">
	import { tracker, updateTracker, openFeynmanDuck, addFlashcard, updateFlashcard, deleteFlashcard, triggerToast } from '$lib/stores/tracker';
	import { SUBJECTS, subjectName, subjectColor } from '$lib/state/subjects';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/NavIcon.svelte';
	import type { Flashcard } from '$lib/types/tracker';
	import { renderMarkdown, renderMarkdownSync } from '$lib/services/markdown';
	import { buildAcademicConstraintPrompt, getUserAcademicContext } from '$lib/services/aiContext';

	let panelTab: 'review' | 'manage' = 'review';

	let dueCards: Flashcard[] = [];
	$: dueCards = ($tracker.flashcards || []).filter(c => c.nextReviewAt <= Date.now());

	let reviewing = false;
	let currentCardIndex = 0;
	let flipped = false;
	let frontHtml = '';
	let backHtml = '';

	$: if (dueCards.length > 0 && currentCardIndex < dueCards.length) {
		renderMarkdown(dueCards[currentCardIndex].front).then(h => frontHtml = h);
		renderMarkdown(dueCards[currentCardIndex].back).then(h => backHtml = h);
	}

	$: academicContext = getUserAcademicContext($tracker);
	$: activeTickmarkedChapters = (academicContext.tickmarkedChapters as Record<string, string[]>)[createSubject] || [];

	// AI Generator Modal State
	let showCreateModal = false;
	let createSubject = 'P';
	let createChapter = '';
	let isCreating = false;
	let createError = '';

	// Manual Card Modal State (Create / Edit)
	let manualModalOpen = false;
	let editingCardId: string | null = null;
	let manualSubject = 'P';
	let manualChapter = '';
	let manualFront = '';
	let manualBack = '';
	let manualError = '';

	$: frontPreviewHtml = renderMarkdownSync(manualFront);
	$: backPreviewHtml = renderMarkdownSync(manualBack);

	// Deck Browser State
	let deckSearch = '';
	let deckSubject: 'ALL' | 'P' | 'C' | 'M' = 'ALL';

	$: filteredDeckCards = ($tracker.flashcards || []).filter((c) => {
		if (deckSubject !== 'ALL' && c.subject !== deckSubject) return false;
		if (deckSearch.trim()) {
			const q = deckSearch.trim().toLowerCase();
			const inFront = c.front?.toLowerCase().includes(q);
			const inBack = c.back?.toLowerCase().includes(q);
			const inCh = c.chapter?.toLowerCase().includes(q);
			if (!inFront && !inBack && !inCh) return false;
		}
		return true;
	});

	function openCreateManualModal() {
		editingCardId = null;
		manualSubject = 'P';
		manualChapter = '';
		manualFront = '';
		manualBack = '';
		manualError = '';
		manualModalOpen = true;
	}

	function openEditCardModal(card: Flashcard) {
		editingCardId = card.id;
		manualSubject = card.subject || 'P';
		manualChapter = card.chapter || '';
		manualFront = card.front || '';
		manualBack = card.back || '';
		manualError = '';
		manualModalOpen = true;
	}

	function saveManualCard() {
		if (!manualChapter.trim()) {
			manualError = 'Please specify a chapter.';
			return;
		}
		if (!manualFront.trim() || !manualBack.trim()) {
			manualError = 'Both front and back sides are required.';
			return;
		}

		if (editingCardId) {
			updateFlashcard(editingCardId, {
				subject: manualSubject,
				chapter: manualChapter.trim(),
				front: manualFront.trim(),
				back: manualBack.trim()
			});
			triggerToast('Flashcard updated!');
		} else {
			addFlashcard({
				subject: manualSubject,
				chapter: manualChapter.trim(),
				front: manualFront.trim(),
				back: manualBack.trim()
			});
			triggerToast('New flashcard added to deck!');
		}
		manualModalOpen = false;
	}

	function handleDeleteCard(card: Flashcard) {
		const backup = { ...card };
		deleteFlashcard(card.id);
		triggerToast({
			text: `Deleted card from ${card.chapter}`,
			actionLabel: 'Undo',
			onAction: () => {
				updateTracker((s) => {
					if (!s.flashcards) s.flashcards = [];
					if (!s.flashcards.some((c) => c.id === backup.id)) {
						s.flashcards.push(backup);
					}
				});
			}
		});
	}

	function startReview() {
		if (dueCards.length === 0) return;
		reviewing = true;
		currentCardIndex = 0;
		flipped = false;
	}

	function flipCard() {
		flipped = true;
	}

	function scoreCard(quality: number) {
		const card = dueCards[currentCardIndex];
		if (!card) return;

		let efactor = (card.efactor || 2.5) + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
		if (efactor < 1.3) efactor = 1.3;

		let interval = card.interval || 1;
		let repetition = card.repetition || 0;
		let nextReviewAt: number;

		if (quality === 1) {
			repetition = 0;
			interval = 0;
			nextReviewAt = Date.now() + 10 * 60 * 1000;
		} else if (quality === 3) {
			interval = Math.max(1, Math.round((card.interval || 1) * 1.2));
			repetition = (card.repetition || 0) + 1;
			nextReviewAt = Date.now() + interval * 86400000;
		} else if (quality === 4) {
			interval = repetition === 0 ? 1 : (repetition === 1 ? 6 : Math.round(interval * efactor));
			repetition += 1;
			nextReviewAt = Date.now() + interval * 86400000;
		} else {
			interval = repetition === 0 ? 2 : (repetition === 1 ? 7 : Math.round(interval * efactor * 1.3));
			repetition += 1;
			nextReviewAt = Date.now() + interval * 86400000;
		}

		updateTracker(s => {
			if (!s.flashcards) s.flashcards = [];
			const idx = s.flashcards.findIndex(c => c.id === card.id);
			if (idx !== -1) {
				s.flashcards[idx] = { ...s.flashcards[idx], efactor, interval, repetition, nextReviewAt };
			}
		});

		if (quality === 1) {
			dueCards.push({ ...card, efactor, interval, repetition, nextReviewAt });
		}

		currentCardIndex++;
		flipped = false;

		if (currentCardIndex >= dueCards.length) {
			reviewing = false;
		}
	}

	function handleReviewKeydown(e: KeyboardEvent) {
		if (!reviewing || panelTab !== 'review' || dueCards.length === 0) return;
		const target = e.target as HTMLElement | null;
		const tag = target?.tagName?.toLowerCase();
		if (target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			if (!flipped) {
				flipCard();
			} else {
				scoreCard(4);
			}
		} else if (flipped) {
			if (e.key === '1') {
				e.preventDefault();
				e.stopPropagation();
				scoreCard(1);
			} else if (e.key === '2') {
				e.preventDefault();
				e.stopPropagation();
				scoreCard(3);
			} else if (e.key === '3') {
				e.preventDefault();
				e.stopPropagation();
				scoreCard(4);
			} else if (e.key === '4') {
				e.preventDefault();
				e.stopPropagation();
				scoreCard(5);
			}
		}
	}

	async function createAI() {
		if (!createChapter.trim()) {
			createError = 'Please enter a chapter name.';
			return;
		}
		isCreating = true;
		createError = '';

		const sName = subjectName(createSubject);
		const academicConstraints = buildAcademicConstraintPrompt($tracker);
		const prompt = `You are an elite JEE tutor (similar to NotebookLM's deep analytical engine). 
Create 5 highly conceptual, active-recall flashcards for ${sName} - Chapter: ${createChapter}. 
Focus on tricky edge cases, deep conceptual understanding, and critical formulas rather than basic definitions. 
Use proper LaTeX for all math/physics variables and equations using inline \\( ... \\) or block \\[ ... \\].
Output a strict JSON object with a single key "cards" containing an array of 5 objects (or a direct JSON array of 5 objects).
Each object must have exactly two keys: 'front' (the question/scenario) and 'back' (the detailed, insightful answer).

${academicConstraints}`;

		try {
			const res = await fetch('/api/gemini', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					history: [{ role: 'user', parts: [{ text: prompt }] }],
					systemInstruction: "You are a flashcard generator. Restrict all concepts, formulas, and depth strictly to the student's academic grade level and tickmarked checklist. Output ONLY valid JSON without markdown.",
					jsonMode: true
				})
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to generate flashcards.');
			}

			const data = await res.json();
			let cards = [];
			try {
				const parsed = JSON.parse(data.text);
				cards = Array.isArray(parsed) ? parsed : (parsed?.cards || []);
			} catch (e) {
				throw new Error('Invalid JSON received from AI.');
			}

			if (!Array.isArray(cards) || cards.length === 0) throw new Error('AI did not return any valid flashcards.');

			updateTracker(s => {
				if (!s.flashcards) s.flashcards = [];
				for (const c of cards) {
					s.flashcards.push({
						id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
						front: c.front,
						back: c.back,
						subject: createSubject,
						chapter: createChapter,
						interval: 1,
						repetition: 0,
						efactor: 2.5,
						nextReviewAt: Date.now()
					});
				}
			});

			showCreateModal = false;
			createChapter = '';
		} catch (e: any) {
			createError = e.message;
		} finally {
			isCreating = false;
		}
	}
</script>

<svelte:head>
	<title>Flashcards - BTracker</title>
</svelte:head>

<svelte:window on:keydown={handleReviewKeydown} />

<main class="content-panel">
	<div class="head">
		<div>
			<h1>Active Recall</h1>
			<p>SuperMemo-2 Spaced Repetition Deck</p>
		</div>
		<div class="head-actions">
			<button class="create-btn duck-btn" on:click={() => openFeynmanDuck()}>
				🦆 Teach Duck
			</button>
			<button class="create-btn" on:click={openCreateManualModal}>
				<Icon name="plus" size={15} /> New Card
			</button>
			<button class="create-btn ai-btn" on:click={() => showCreateModal = true}>
				<Icon name="sparkles" size={15} /> AI Cards
			</button>
		</div>
	</div>

	<!-- Mode Switcher -->
	<div class="tabs-nav">
		<button
			type="button"
			class="tab-btn"
			class:active={panelTab === 'review'}
			on:click={() => { panelTab = 'review'; reviewing = false; }}
		>
			Review Queue ({dueCards.length})
		</button>
		<button
			type="button"
			class="tab-btn"
			class:active={panelTab === 'manage'}
			on:click={() => { panelTab = 'manage'; reviewing = false; }}
		>
			Manage Deck ({$tracker.flashcards ? $tracker.flashcards.length : 0})
		</button>
	</div>

	{#if panelTab === 'review'}
		{#if !reviewing}
			<div class="dashboard">
				<div class="stat-card glass">
					<div class="stat-value">{dueCards.length}</div>
					<div class="stat-label">Cards due today</div>
				</div>

				{#if dueCards.length > 0}
					<button class="start-btn" on:click={startReview}>Start Review</button>
				{:else}
					<div class="empty-state">
						<Icon name="check-circle" size={48} />
						<h2>All caught up!</h2>
						<p>You have no cards due for review today. Add more or check back tomorrow.</p>
					</div>
				{/if}

				<div class="total-cards">
					Total Deck Size: {$tracker.flashcards ? $tracker.flashcards.length : 0} cards
				</div>
			</div>
		{:else}
			<div class="review-area">
				<div class="progress">
					Reviewing {currentCardIndex + 1} of {dueCards.length}
				</div>

				<div class="flashcard-stack-wrap">
					<div class="flashcard glass" class:is-flipped={flipped} on:click={flipCard} role="button" tabindex="0" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && flipCard()}>
						<div class="card-inner">
							<div class="card-front">
								<div class="card-subject" data-sub={dueCards[currentCardIndex].subject}>
									{subjectName(dueCards[currentCardIndex].subject)} • {dueCards[currentCardIndex].chapter}
								</div>
								<div class="card-content">
									{@html frontHtml}
								</div>
							</div>
							<div class="card-back">
								<div class="card-content">
									{@html backHtml}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="actions">
					{#if !flipped}
						<button class="flip-btn" on:click={flipCard}>Flip Card <kbd class="kbd-hint">Space</kbd></button>
					{:else}
						<button class="score-btn again" on:click={() => scoreCard(1)}>
							<span class="key-badge">1</span>
							<span>Again</span>
							<small>10m</small>
						</button>
						<button class="score-btn hard" on:click={() => scoreCard(3)}>
							<span class="key-badge">2</span>
							<span>Hard</span>
							<small>{Math.max(1, Math.round((dueCards[currentCardIndex].interval || 1) * 1.2))}d</small>
						</button>
						<button class="score-btn good" on:click={() => scoreCard(4)}>
							<span class="key-badge">3</span>
							<span>Good</span>
							<small>{dueCards[currentCardIndex].repetition === 0 ? 1 : (dueCards[currentCardIndex].repetition === 1 ? 6 : Math.round((dueCards[currentCardIndex].interval || 1) * (dueCards[currentCardIndex].efactor || 2.5)))}d</small>
						</button>
						<button class="score-btn easy" on:click={() => scoreCard(5)}>
							<span class="key-badge">4</span>
							<span>Easy</span>
							<small>{dueCards[currentCardIndex].repetition === 0 ? 2 : (dueCards[currentCardIndex].repetition === 1 ? 7 : Math.round((dueCards[currentCardIndex].interval || 1) * (dueCards[currentCardIndex].efactor || 2.5) * 1.3))}d</small>
						</button>
					{/if}
				</div>
			</div>
		{/if}
	{:else}
		<!-- Manage Deck View -->
		<div class="manage-deck-view">
			<div class="deck-filter-bar">
				<div class="search-wrap">
					<Icon name="search" size={16} />
					<input
						type="text"
						placeholder="Search cards, formulas, or chapters..."
						bind:value={deckSearch}
					/>
					{#if deckSearch}
						<button type="button" class="clear-btn" on:click={() => deckSearch = ''}>
							<Icon name="x" size={12} />
						</button>
					{/if}
				</div>

				<div class="subject-pills">
					{#each ['ALL', 'P', 'C', 'M'] as s}
						<button
							type="button"
							class="pill-btn"
							class:active={deckSubject === s}
							on:click={() => deckSubject = s as any}
						>
							{s === 'ALL' ? 'All' : s === 'P' ? 'Physics' : s === 'C' ? 'Chemistry' : 'Maths'}
						</button>
					{/each}
				</div>
			</div>

			{#if filteredDeckCards.length > 0}
				<div class="deck-cards-grid">
					{#each filteredDeckCards as card (card.id)}
						<article class="deck-card glass">
							<div class="card-head">
								<span class="sub-badge" style="background: color-mix(in srgb, {subjectColor(card.subject)}, transparent 85%); color: {subjectColor(card.subject)}; border: 1px solid color-mix(in srgb, {subjectColor(card.subject)}, transparent 65%);">
									{subjectName(card.subject)} · {card.chapter}
								</span>
								<div class="card-controls">
									<button type="button" class="btn-icon" on:click={() => openEditCardModal(card)} title="Edit card">
										<Icon name="edit" size={13} />
									</button>
									<button type="button" class="btn-icon del" on:click={() => handleDeleteCard(card)} title="Delete card">
										<Icon name="trash" size={13} />
									</button>
								</div>
							</div>

							<div class="card-body">
								<div class="side front">
									<b>Q:</b> <span>{card.front}</span>
								</div>
								<div class="side back">
									<b>A:</b> <span>{card.back}</span>
								</div>
							</div>

							<div class="card-footer">
								<span class="stat">Interval: <b>{card.interval || 1}d</b></span>
								<span class="stat">EF: <b>{card.efactor ? card.efactor.toFixed(2) : '2.50'}</b></span>
								<span class="stat date">Next: <b>{new Date(card.nextReviewAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</b></span>
							</div>
						</article>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<Icon name="layers" size={44} />
					<h2>No flashcards found</h2>
					<p>{deckSearch ? 'No cards match your search query.' : 'Create cards manually or use the AI generator above!'}</p>
				</div>
			{/if}
		</div>
	{/if}
</main>

<!-- Manual Create / Edit Modal with Live KaTeX Preview -->
<Modal bind:open={manualModalOpen} title={editingCardId ? 'Edit Flashcard' : 'Create New Flashcard'} width="560px">
	<div class="form">
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">
			<div class="field">
				<small>Subject</small>
				<select bind:value={manualSubject}>
					{#each SUBJECTS as sub}
						<option value={sub.code}>{sub.name}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<small>Chapter</small>
				<input type="text" bind:value={manualChapter} placeholder="e.g. Electrostatics" />
			</div>
		</div>

		<div class="field">
			<small>Front Side (Question / Concept / Formula LaTeX)</small>
			<textarea rows="3" bind:value={manualFront} placeholder={'e.g. State Gauss\'s Law: $\\oint \\mathbf{E} \\cdot d\\mathbf{A} = ?$' }></textarea>
			{#if manualFront.trim()}
				<div class="preview-box">
					<small class="preview-title">Preview:</small>
					<div class="preview-content">{@html frontPreviewHtml}</div>
				</div>
			{/if}
		</div>

		<div class="field">
			<small>Back Side (Answer / Derivation / Key Insight)</small>
			<textarea rows="3" bind:value={manualBack} placeholder={'e.g. $\\frac{Q_{\\text{enclosed}}}{\\varepsilon_0}$'}></textarea>
			{#if manualBack.trim()}
				<div class="preview-box">
					<small class="preview-title">Preview:</small>
					<div class="preview-content">{@html backPreviewHtml}</div>
				</div>
			{/if}
		</div>

		{#if manualError}
			<div class="error">{manualError}</div>
		{/if}

		<div class="modal-actions">
			<button type="button" class="ghost" on:click={() => manualModalOpen = false}>Cancel</button>
			<button type="button" class="solid" on:click={saveManualCard}>
				{editingCardId ? 'Save Changes' : 'Add Card to Deck'}
			</button>
		</div>
	</div>
</Modal>

<!-- AI Cards Generator Modal -->
<Modal bind:open={showCreateModal} title="Create AI Flashcards">
	<div class="form">
		<div class="field">
			<small>Subject</small>
			<select bind:value={createSubject}>
				{#each SUBJECTS as sub}
					<option value={sub.code}>{sub.name}</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<small>Chapter</small>
			<input type="text" bind:value={createChapter} placeholder="e.g. Thermodynamics" />
			{#if activeTickmarkedChapters.length > 0}
				<div class="chips-container">
					<span class="chips-label">🎯 Checklist Active:</span>
					<div class="chips-scroll">
						{#each activeTickmarkedChapters as ch}
							<button type="button" class="chip-tag" class:active={createChapter === ch} on:click={() => (createChapter = ch)}>
								{ch}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if createError}
			<div class="error">{createError}</div>
		{/if}

		<div class="modal-actions">
			<button type="button" class="ghost" on:click={() => showCreateModal = false} disabled={isCreating}>Cancel</button>
			<button type="button" class="solid" on:click={createAI} disabled={isCreating}>
				{#if isCreating}
					Generating...
				{:else}
					Generate Cards
				{/if}
			</button>
		</div>
	</div>
</Modal>

<style>
	.content-panel { padding: clamp(1rem, 3vw, 2rem); max-width: 900px; margin: 0 auto; }
	.head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
	.head h1 { margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -.03em; }
	.head p { margin: .2rem 0 0; color: var(--text-secondary); font-size: .9rem; font-weight: 600; }

	.head-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
	.create-btn { display: inline-flex; align-items: center; gap: .45rem; height: 38px; padding: 0 1rem; border: 0; border-radius: 999px; background: var(--accent); color: var(--accent-contrast, white); font-size: .82rem; font-weight: 750; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; box-shadow: 0 6px 16px color-mix(in srgb, var(--accent), transparent 65%); }
	.create-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px color-mix(in srgb, var(--accent), transparent 55%); }
	.create-btn.duck-btn { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b; box-shadow: none; }
	.create-btn.ai-btn { background: linear-gradient(135deg, var(--accent), #9333ea); }

	.tabs-nav { display: inline-flex; gap: 0.35rem; padding: 0.3rem; border-radius: 999px; background: var(--surface-panel); border: 1px solid var(--border-subtle); margin-bottom: 1.8rem; }
	.tab-btn { padding: 0.45rem 1.15rem; border-radius: 999px; border: 0; background: transparent; color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; }
	.tab-btn:hover { color: var(--text-primary); }
	.tab-btn.active { background: var(--surface-subtle); color: var(--text-primary); border: 1px solid var(--border-subtle); }

	.dashboard { display: grid; gap: 2rem; text-align: center; }
	.stat-card { padding: 3rem; border: 1px solid var(--border-subtle); border-radius: 24px; }
	.stat-value { font-size: 4rem; font-weight: 900; line-height: 1; color: var(--text-primary); }
	.stat-label { margin-top: .5rem; color: var(--text-secondary); font-size: 1rem; font-weight: 650; text-transform: uppercase; letter-spacing: .05em; }

	.start-btn { margin: 0 auto; padding: 1rem 3rem; border: 0; border-radius: 16px; background: var(--text-primary); color: var(--bg-main); font-size: 1.1rem; font-weight: 800; cursor: pointer; transition: transform .15s ease; }
	.start-btn:hover { transform: translateY(-2px); }

	.empty-state { padding: 4rem 1rem; color: var(--text-secondary); text-align: center; }
	.empty-state h2 { margin: 1rem 0 .5rem; color: var(--text-primary); font-size: 1.4rem; }
	.total-cards { color: var(--text-secondary); font-size: .85rem; font-weight: 600; }

	.review-area { display: grid; gap: 1.5rem; max-width: 600px; margin: 0 auto; position: relative; }
	.progress { text-align: center; color: var(--text-secondary); font-size: .85rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; font-variant-numeric: tabular-nums; }

	.flashcard-stack-wrap {
		position: relative;
		height: 350px;
	}
	/* 3D card-stack depth effect: two subtle layered card edges peeking 4px and 8px below the active card */
	.flashcard-stack-wrap::before,
	.flashcard-stack-wrap::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 24px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel) 80%, transparent);
		backdrop-filter: blur(12px);
		pointer-events: none;
		transition: transform 0.3s ease;
	}
	.flashcard-stack-wrap::before {
		transform: translateY(6px) scale(0.975);
		z-index: 0;
		opacity: 0.65;
	}
	.flashcard-stack-wrap::after {
		transform: translateY(12px) scale(0.95);
		z-index: -1;
		opacity: 0.35;
	}

	.flashcard {
		position: relative;
		z-index: 1;
		perspective: 1000px;
		height: 100%;
		cursor: pointer;
		border-radius: 24px;
		border: 1px solid var(--border-strong);
		box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.35), var(--inner-glow);
	}
	.card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
	.flashcard.is-flipped .card-inner { transform: rotateX(180deg); }

	.card-front, .card-back { position: absolute; inset: 0; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: flex; flex-direction: column; padding: 2rem; border: 1px solid var(--border-subtle); border-radius: 24px; }
	.card-back { transform: rotateX(180deg); }

	.card-subject { font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 1rem; opacity: 0.7; }
	.card-subject[data-sub="P"] { color: var(--p-color, #4dabf7); }
	.card-subject[data-sub="C"] { color: var(--c-color, #f03e3e); }
	.card-subject[data-sub="M"] { color: var(--m-color, #fab005); }

	.card-content { flex: 1; display: grid; place-items: center; text-align: center; font-size: 1.2rem; font-weight: 600; line-height: 1.5; color: var(--text-primary); overflow-y: auto; }

	.actions { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
	.flip-btn { flex: 1; max-width: 240px; padding: 0.85rem 1.2rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel); color: var(--text-primary); font-size: 0.95rem; font-weight: 750; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease; }
	.flip-btn:hover { background: var(--surface-subtle); transform: translateY(-1px); border-color: var(--accent); }
	.kbd-hint { font-size: 0.65rem; padding: 2px 6px; border-radius: 5px; background: var(--surface-subtle); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-family: var(--font-mono, monospace); }

	.key-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		font-size: 0.6rem;
		font-family: var(--font-mono, monospace);
		font-weight: 800;
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.32);
		border: 1px solid rgba(255, 255, 255, 0.25);
		line-height: 1.2;
	}
	.score-btn {
		position: relative;
		flex: 1;
		min-width: 75px;
		padding: 0.85rem 0.5rem;
		border: 1px solid transparent;
		border-radius: 16px;
		font-size: 0.9rem;
		font-weight: 800;
		cursor: pointer;
		color: var(--accent-contrast, #fff);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		transition: transform 0.18s ease, box-shadow 0.2s ease;
	}
	.score-btn small { font-size: .68rem; font-weight: 600; opacity: 0.85; font-family: var(--font-mono, monospace); }
	.score-btn.again { background: var(--danger, #e0455a); box-shadow: 0 4px 16px color-mix(in srgb, var(--danger, #e0455a), transparent 60%); }
	.score-btn.again:hover { transform: translateY(-2px); box-shadow: 0 8px 24px color-mix(in srgb, var(--danger, #e0455a), transparent 40%); }
	.score-btn.hard { background: #ea580c; box-shadow: 0 4px 16px rgba(234, 88, 12, 0.4); }
	.score-btn.hard:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(234, 88, 12, 0.6); }
	.score-btn.good { background: var(--warning, #f6ad55); box-shadow: 0 4px 16px color-mix(in srgb, var(--warning, #f6ad55), transparent 60%); color: #111; }
	.score-btn.good:hover { transform: translateY(-2px); box-shadow: 0 8px 24px color-mix(in srgb, var(--warning, #f6ad55), transparent 40%); }
	.score-btn.easy { background: var(--success, #42b883); box-shadow: 0 4px 16px color-mix(in srgb, var(--success, #42b883), transparent 60%); }
	.score-btn.easy:hover { transform: translateY(-2px); box-shadow: 0 8px 24px color-mix(in srgb, var(--success, #42b883), transparent 40%); }

	/* Manage Deck Styles */
	.manage-deck-view { display: flex; flex-direction: column; gap: 1.2rem; }
	.deck-filter-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
	.search-wrap { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.85rem; border-radius: 12px; background: var(--surface-panel); border: 1px solid var(--border-subtle); flex: 1; min-width: 220px; }
	.search-wrap input { flex: 1; background: transparent; border: 0; color: var(--text-primary); font-size: 0.85rem; outline: none; }
	.clear-btn { background: transparent; border: 0; color: var(--text-secondary); cursor: pointer; }

	.subject-pills { display: flex; gap: 0.35rem; }
	.pill-btn { padding: 0.35rem 0.75rem; border-radius: 999px; border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); font-size: 0.75rem; font-weight: 700; cursor: pointer; }
	.pill-btn.active { background: var(--accent); color: var(--accent-contrast, white); border-color: var(--accent); }

	.deck-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 1rem; }
	.deck-card { padding: 1.15rem; border-radius: 18px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.85rem; }
	.card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
	.sub-badge { font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 6px; }
	.card-controls { display: flex; gap: 0.35rem; }
	.btn-icon { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-secondary); cursor: pointer; display: grid; place-items: center; }
	.btn-icon:hover { color: var(--text-primary); border-color: var(--accent); }
	.btn-icon.del:hover { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }

	.card-body { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; line-height: 1.4; color: var(--text-primary); flex: 1; }
	.card-body .side b { font-size: 0.72rem; color: var(--text-secondary); margin-right: 0.3rem; }
	.card-body .back { color: var(--text-secondary); border-top: 1px dashed var(--border-subtle); padding-top: 0.45rem; }

	.card-footer { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary); border-top: 1px solid var(--border-subtle); padding-top: 0.6rem; }
	.card-footer b { color: var(--text-primary); }

	.preview-box { margin-top: 0.4rem; padding: 0.65rem 0.85rem; border-radius: 10px; background: var(--surface-panel); border: 1px dashed var(--border-subtle); }
	.preview-title { font-size: 0.68rem; font-weight: 750; color: var(--accent); text-transform: uppercase; margin-bottom: 0.25rem; display: block; }
	.preview-content { font-size: 0.85rem; color: var(--text-primary); }

	.form { display: grid; gap: 1rem; }
	.field { display: grid; gap: .4rem; }
	.field small { color: var(--text-secondary); font-size: .7rem; font-weight: 750; text-transform: uppercase; letter-spacing: .05em; }
	.field input, .field select, .field textarea { padding: .7rem .8rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); color: var(--text-primary); font-size: .88rem; font-family: inherit; }
	.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); background: var(--surface-panel); }

	.error { padding: .5rem; border-radius: 8px; background: color-mix(in srgb, var(--danger, #e0455a), transparent 90%); color: var(--danger, #e0455a); font-size: .8rem; font-weight: 600; }

	.modal-actions { display: flex; justify-content: flex-end; gap: .8rem; margin-top: .5rem; }
	.ghost { padding: .6rem 1rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); font-weight: 650; cursor: pointer; }
	.solid { padding: .6rem 1.2rem; border: 0; border-radius: 10px; background: var(--accent); color: var(--accent-contrast, white); font-weight: 700; cursor: pointer; }
	.solid:disabled, .ghost:disabled { opacity: 0.5; cursor: not-allowed; }

	.chips-container { display: flex; flex-direction: column; gap: .35rem; margin-top: .4rem; }
	.chips-label { font-size: .68rem; font-weight: 750; color: var(--accent); letter-spacing: .02em; }
	.chips-scroll { display: flex; gap: .35rem; flex-wrap: wrap; max-height: 85px; overflow-y: auto; padding: 2px; }
	.chip-tag { padding: .25rem .55rem; font-size: .72rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); cursor: pointer; transition: all .15s ease; }
	.chip-tag:hover, .chip-tag.active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); font-weight: 700; }

	@media (max-width: 600px) {
		.content-panel { padding: 0.5rem 0; }
		.head { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
		.head-actions { width: 100%; flex-wrap: wrap; }
		.create-btn { flex: 1; justify-content: center; min-height: 40px; font-size: 0.8rem; }
		.stat-card { padding: 1.75rem 1rem; }
		.stat-value { font-size: 3rem; }
		.flashcard { height: clamp(260px, 45vh, 340px); }
		.card-front, .card-back { padding: 1.25rem 1rem; }
		.card-content { font-size: 1.05rem; }
	}
</style>
