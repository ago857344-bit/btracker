<script lang="ts">
	import { tracker, updateTracker } from '$lib/stores/tracker';
	import { SUBJECTS, subjectName } from '$lib/state/subjects';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/NavIcon.svelte';
	import type { Flashcard } from '$lib/types/tracker';
	
	let dueCards: Flashcard[] = [];
	$: dueCards = ($tracker.flashcards || []).filter(c => c.nextReviewAt <= Date.now());
	
	let reviewing = false;
	let currentCardIndex = 0;
	let flipped = false;
	
	let showCreateModal = false;
	let createSubject = 'P';
	let createChapter = '';
	let isCreating = false;
	let createError = '';

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
		
		let efactor = card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
		if (efactor < 1.3) efactor = 1.3;
		
		let interval = card.interval || 1; 
		let repetition = card.repetition;
		
		if (quality < 3) {
			interval = 1;
			repetition = 0;
		} else {
			interval = repetition === 0 ? 1 : (repetition === 1 ? 6 : Math.ceil(interval * efactor));
			repetition += 1;
		}
		
		const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000;
		
		updateTracker(s => {
			if (!s.flashcards) s.flashcards = [];
			const idx = s.flashcards.findIndex(c => c.id === card.id);
			if (idx !== -1) {
				s.flashcards[idx] = { ...s.flashcards[idx], efactor, interval, repetition, nextReviewAt };
			}
		});
		
		currentCardIndex++;
		flipped = false;
		
		if (currentCardIndex >= dueCards.length) {
			reviewing = false;
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
		const prompt = `Create 5 flashcards for ${sName} chapter ${createChapter}. Output ONLY a JSON array of 5 objects, each with 'front' and 'back' string properties representing the flashcard content. Do not use any markdown formatting or wrapper.`;
		
		try {
			const res = await fetch('/api/gemini', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					history: [{ role: 'user', parts: [{ text: prompt }] }],
					systemInstruction: "You are a flashcard generator. Output ONLY a valid JSON array of objects. Each object must have a 'front' (string) and 'back' (string). Return ONLY JSON, no markdown.",
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
				cards = JSON.parse(data.text);
			} catch (e) {
				throw new Error('Invalid JSON received from AI.');
			}
			
			if (!Array.isArray(cards)) throw new Error('AI did not return an array.');
			
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

<main class="content-panel">
	<div class="head">
		<div>
			<h1>Active Recall</h1>
			<p>SuperMemo-2 Flashcards</p>
		</div>
		<button class="create-btn" on:click={() => showCreateModal = true}>
			<Icon name="sparkles" size={16} /> Create AI Cards
		</button>
	</div>
	
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
					<p>You have no more cards to review today. Create some more or check back tomorrow.</p>
				</div>
			{/if}
			
			<div class="total-cards">
				Total Cards: {$tracker.flashcards ? $tracker.flashcards.length : 0}
			</div>
		</div>
	{:else}
		<div class="review-area">
			<div class="progress">
				Reviewing {currentCardIndex + 1} of {dueCards.length}
			</div>
			
			<div class="flashcard glass" class:is-flipped={flipped}>
				<div class="card-inner">
					<div class="card-front">
						<div class="card-subject" data-sub={dueCards[currentCardIndex].subject}>
							{subjectName(dueCards[currentCardIndex].subject)} • {dueCards[currentCardIndex].chapter}
						</div>
						<div class="card-content">
							{@html dueCards[currentCardIndex].front.replace(/\n/g, '<br/>')}
						</div>
					</div>
					<div class="card-back">
						<div class="card-content">
							{@html dueCards[currentCardIndex].back.replace(/\n/g, '<br/>')}
						</div>
					</div>
				</div>
			</div>
			
			<div class="actions">
				{#if !flipped}
					<button class="flip-btn" on:click={flipCard}>Flip Card</button>
				{:else}
					<button class="score-btn hard" on:click={() => scoreCard(1)}>Hard <small>(&lt; 1d)</small></button>
					<button class="score-btn good" on:click={() => scoreCard(4)}>Good</button>
					<button class="score-btn easy" on:click={() => scoreCard(5)}>Easy</button>
				{/if}
			</div>
		</div>
	{/if}
</main>

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
		</div>
		
		{#if createError}
			<div class="error">{createError}</div>
		{/if}
		
		<div class="modal-actions">
			<button class="ghost" on:click={() => showCreateModal = false} disabled={isCreating}>Cancel</button>
			<button class="solid" on:click={createAI} disabled={isCreating}>
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
	.content-panel { padding: clamp(1rem, 3vw, 2rem); max-width: 800px; margin: 0 auto; }
	.head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
	.head h1 { margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -.03em; }
	.head p { margin: .2rem 0 0; color: var(--text-secondary); font-size: .9rem; font-weight: 600; }
	
	.create-btn { display: inline-flex; align-items: center; gap: .5rem; height: 38px; padding: 0 1rem; border: 0; border-radius: 999px; background: var(--accent); color: white; font-size: .85rem; font-weight: 750; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; box-shadow: 0 6px 16px color-mix(in srgb, var(--accent), transparent 65%); }
	.create-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px color-mix(in srgb, var(--accent), transparent 55%); }
	
	.dashboard { display: grid; gap: 2rem; text-align: center; }
	.stat-card { padding: 3rem; border: 1px solid var(--border-subtle); border-radius: 24px; background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.stat-value { font-size: 4rem; font-weight: 900; line-height: 1; color: var(--text-primary); }
	.stat-label { margin-top: .5rem; color: var(--text-secondary); font-size: 1rem; font-weight: 650; text-transform: uppercase; letter-spacing: .05em; }
	
	.start-btn { margin: 0 auto; padding: 1rem 3rem; border: 0; border-radius: 16px; background: var(--text-primary); color: var(--bg-main); font-size: 1.1rem; font-weight: 800; cursor: pointer; transition: transform .15s ease; }
	.start-btn:hover { transform: translateY(-2px); }
	
	.empty-state { padding: 4rem 1rem; color: var(--text-secondary); }
	.empty-state h2 { margin: 1rem 0 .5rem; color: var(--text-primary); font-size: 1.4rem; }
	.total-cards { color: var(--text-secondary); font-size: .85rem; font-weight: 600; }
	
	.review-area { display: grid; gap: 1.5rem; max-width: 600px; margin: 0 auto; }
	.progress { text-align: center; color: var(--text-secondary); font-size: .9rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
	
	.flashcard { perspective: 1000px; height: 350px; cursor: pointer; border-radius: 24px; }
	.card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
	.flashcard.is-flipped .card-inner { transform: rotateX(180deg); }
	
	.card-front, .card-back { position: absolute; inset: 0; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: flex; flex-direction: column; padding: 2rem; border: 1px solid var(--border-subtle); border-radius: 24px; background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.card-back { transform: rotateX(180deg); background: var(--surface-subtle); }
	
	.card-subject { font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 1rem; opacity: 0.7; }
	.card-subject[data-sub="P"] { color: var(--p-color, #4dabf7); }
	.card-subject[data-sub="C"] { color: var(--c-color, #f03e3e); }
	.card-subject[data-sub="M"] { color: var(--m-color, #fab005); }
	
	.card-content { flex: 1; display: grid; place-items: center; text-align: center; font-size: 1.2rem; font-weight: 600; line-height: 1.5; color: var(--text-primary); }
	
	.actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
	.flip-btn { flex: 1; max-width: 200px; padding: 1rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-panel); color: var(--text-primary); font-size: 1rem; font-weight: 750; cursor: pointer; }
	.flip-btn:hover { background: var(--surface-subtle); }
	
	.score-btn { flex: 1; padding: 1rem .5rem; border: 0; border-radius: 16px; font-size: .95rem; font-weight: 800; cursor: pointer; color: white; display: flex; flex-direction: column; align-items: center; gap: .2rem; }
	.score-btn small { font-size: .7rem; font-weight: 600; opacity: 0.8; }
	.score-btn.hard { background: var(--danger, #e0455a); box-shadow: 0 4px 12px color-mix(in srgb, var(--danger, #e0455a), transparent 70%); }
	.score-btn.good { background: var(--warning, #f6ad55); box-shadow: 0 4px 12px color-mix(in srgb, var(--warning, #f6ad55), transparent 70%); color: #000; }
	.score-btn.easy { background: var(--success, #42b883); box-shadow: 0 4px 12px color-mix(in srgb, var(--success, #42b883), transparent 70%); }
	
	.form { display: grid; gap: 1rem; }
	.field { display: grid; gap: .4rem; }
	.field small { color: var(--text-secondary); font-size: .7rem; font-weight: 750; text-transform: uppercase; letter-spacing: .05em; }
	.field input, .field select { padding: .7rem .8rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); color: var(--text-primary); font-size: .9rem; font-family: inherit; }
	.field input:focus, .field select:focus { outline: none; border-color: var(--accent); background: var(--surface-panel); }
	
	.error { padding: .5rem; border-radius: 8px; background: color-mix(in srgb, var(--danger, #e0455a), transparent 90%); color: var(--danger, #e0455a); font-size: .8rem; font-weight: 600; }
	
	.modal-actions { display: flex; justify-content: flex-end; gap: .8rem; margin-top: .5rem; }
	.ghost { padding: .6rem 1rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: transparent; color: var(--text-secondary); font-weight: 650; cursor: pointer; }
	.solid { padding: .6rem 1.2rem; border: 0; border-radius: 10px; background: var(--accent); color: white; font-weight: 700; cursor: pointer; }
	.solid:disabled, .ghost:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
