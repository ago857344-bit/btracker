<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import {
		feynmanDuckOpen,
		feynmanDuckTopic,
		closeFeynmanDuck,
		addFlashcard,
		tracker,
		celebration,
		completeRevision
	} from '$lib/stores/tracker';
	import {
		askFeynmanDuck,
		evaluateFeynmanSession,
		type FeynmanScorecard,
		type FeynmanTurn
	} from '$lib/services/feynman';
	import { renderMarkdown } from '$lib/services/markdown';
	import type { ChatMessage } from '$lib/services/gemini';
	import { SUBJECTS, subjectColor, subjectName } from '$lib/state/subjects';

	type DuckMood = 'curious' | 'thinking' | 'skeptical' | 'enlightened' | 'mastered';

	let subject: string = 'P';
	let chapter: string = 'Thermodynamics';
	let concept: string = 'Adiabatic Process & First Law of Thermodynamics';

	let conversation: FeynmanTurn[] = [];
	let draft = '';
	let loading = false;
	let error = '';
	let currentMood: DuckMood = 'curious';
	let chatBox: HTMLElement;
	let isRecording = false;
	let recognition: any = null;
	let voiceSupported = false;
	let soundEnabled = true;

	// Scorecard state
	let evaluating = false;
	let scorecard: FeynmanScorecard | null = null;
	let cardSaved = false;
	let revisionCompleted = false;

	const SUGGESTED_TOPICS = [
		{ s: 'P', ch: 'Thermodynamics', c: 'Adiabatic Free Expansion ($W = 0$)' },
		{ s: 'P', ch: 'EMI', c: "Lenz's Law as Conservation of Energy" },
		{ s: 'P', ch: 'Rotation', c: 'Instantaneous Axis of Rotation (IAOR)' },
		{ s: 'C', ch: 'Equilibrium', c: "Le Chatelier's Principle & Reaction Quotient ($Q$ vs $K$)" },
		{ s: 'C', ch: 'Thermodynamics', c: 'Why Spontaneous Processes Require $\\Delta S_{univ} > 0$' },
		{ s: 'M', ch: 'Calculus', c: 'Mean Value Theorem: Why Differentiability is Mandatory' }
	];

	// Initialize speech recognition if available in browser
	onMount(() => {
		if (typeof window !== 'undefined') {
			const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
			if (SpeechRec) {
				voiceSupported = true;
				recognition = new SpeechRec();
				recognition.continuous = false;
				recognition.interimResults = true;
				recognition.lang = 'en-US';

				recognition.onresult = (event: any) => {
					let transcript = '';
					for (let i = event.resultIndex; i < event.results.length; ++i) {
						transcript += event.results[i][0].transcript;
					}
					if (transcript) {
						draft = draft ? `${draft} ${transcript}` : transcript;
					}
				};

				recognition.onerror = () => {
					isRecording = false;
				};

				recognition.onend = () => {
					isRecording = false;
				};
			}
		}
	});

	onDestroy(() => {
		if (recognition && isRecording) {
			recognition.stop();
		}
	});

	// Subscribe to initial topic passed via store
	$: if ($feynmanDuckOpen && $feynmanDuckTopic) {
		const t = $feynmanDuckTopic;
		if (t.subject) subject = t.subject;
		if (t.chapter) chapter = t.chapter;
		if (t.concept) concept = t.concept;
		// Reset topic store once applied so it won't re-trigger on modal reopen
		feynmanDuckTopic.set(null);
		resetSession();
	}

	function resetSession() {
		conversation = [];
		scorecard = null;
		cardSaved = false;
		revisionCompleted = false;
		currentMood = 'curious';
		error = '';
		draft = '';
		startIntro();
	}

	async function startIntro() {
		const introText = `Quack! 🦆 I'm your Socratic Feynman Duck! I'm trying to master **${concept}** for JEE Advanced. Teach me like I'm a complete novice. 
		
Explain what happens from **first principles**—avoid reciting formulas without explaining what the physics or math actually means. I'm listening!`;

		const html = await renderMarkdown(introText);
		conversation = [
			{
				role: 'duck',
				text: introText,
				html,
				mood: 'curious',
				timestamp: Date.now()
			}
		];
		playQuack('happy');
		await tick();
		scrollToBottom();
	}

	function toggleVoice() {
		if (!recognition) return;
		if (isRecording) {
			recognition.stop();
			isRecording = false;
		} else {
			try {
				recognition.start();
				isRecording = true;
			} catch (e) {
				isRecording = false;
			}
		}
	}

	async function sendMessage() {
		if (!draft.trim() || loading) return;

		if (isRecording && recognition) {
			recognition.stop();
			isRecording = false;
		}

		const userMsg = draft.trim();
		draft = '';
		loading = true;
		error = '';

		const userTurn: FeynmanTurn = {
			role: 'user',
			text: userMsg,
			timestamp: Date.now()
		};

		conversation = [...conversation, userTurn];
		currentMood = 'thinking';

		await tick();
		scrollToBottom();

		// Convert conversation to Gemini ChatMessage format
		const history: ChatMessage[] = conversation.map((t) => ({
			role: t.role === 'user' ? 'user' : 'model',
			parts: [{ text: t.text }]
		}));

		try {
			const response = await askFeynmanDuck(history, subjectName(subject), chapter, concept);
			currentMood = response.mood;

			if (currentMood === 'enlightened') {
				playQuack('enlightened');
			} else if (currentMood === 'skeptical') {
				playQuack('skeptical');
			} else {
				playQuack('curious');
			}

			const html = await renderMarkdown(response.text);

			conversation = [
				...conversation,
				{
					role: 'duck',
					text: response.text,
					html,
					mood: response.mood,
					timestamp: Date.now()
				}
			];
		} catch (err: any) {
			error = err.message || 'Failed to get Duck response.';
			currentMood = 'curious';
		} finally {
			loading = false;
			await tick();
			scrollToBottom();
		}
	}

	async function requestEvaluation() {
		if (conversation.filter((t) => t.role === 'user').length === 0) {
			error = 'Please provide at least one explanation to the Duck before grading.';
			return;
		}

		evaluating = true;
		error = '';
		currentMood = 'thinking';

		try {
			const res = await evaluateFeynmanSession(
				conversation.map((c) => ({ role: c.role, text: c.text })),
				subjectName(subject),
				chapter,
				concept
			);
			scorecard = res;
			currentMood = res.score >= 4.0 ? 'mastered' : 'enlightened';
			playFanfare();
		} catch (err: any) {
			error = err.message || 'Failed to generate scorecard.';
			currentMood = 'curious';
		} finally {
			evaluating = false;
		}
	}

	function saveAsFlashcard() {
		if (!scorecard) return;
		addFlashcard({
			front: scorecard.suggestedFlashcard.front,
			back: scorecard.suggestedFlashcard.back,
			subject,
			chapter
		});
		cardSaved = true;
		celebration.set('🦆 Conceptual flashcard saved to Active Recall deck!');
	}

	function markChapterRevised() {
		if (!chapter) return;
		const key = `${subject}:${chapter}`;
		completeRevision(key);
		revisionCompleted = true;
		celebration.set(`🎉 ${chapter} marked revised with boosted retention!`);
	}

	function pickSuggestion(sug: (typeof SUGGESTED_TOPICS)[0]) {
		subject = sug.s;
		chapter = sug.ch;
		concept = sug.c;
		resetSession();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && $feynmanDuckOpen) {
			closeFeynmanDuck();
		}
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			sendMessage();
		}
	}

	function scrollToBottom() {
		if (chatBox) {
			chatBox.scrollTop = chatBox.scrollHeight;
		}
	}

	// Web Audio Synthesizer for Duck sounds & chimes
	function playQuack(type: 'happy' | 'skeptical' | 'enlightened' | 'curious') {
		if (!soundEnabled || typeof window === 'undefined') return;
		try {
			const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
			if (!AudioCtx) return;
			const ctx = new AudioCtx();
			const now = ctx.currentTime;

			if (type === 'enlightened') {
				// Gentle crystalline chime (E6, G#6, B6)
				[1318.5, 1661.2, 1975.5].forEach((freq, idx) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = 'sine';
					osc.frequency.setValueAtTime(freq, now + idx * 0.08);
					gain.gain.setValueAtTime(0.001, now + idx * 0.08);
					gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
					gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(now + idx * 0.08);
					osc.stop(now + idx * 0.08 + 0.38);
				});
			} else {
				// Formant-modulated duck quack
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				const filter = ctx.createBiquadFilter();

				osc.type = 'sawtooth';
				const baseFreq = type === 'skeptical' ? 240 : type === 'happy' ? 380 : 310;
				osc.frequency.setValueAtTime(baseFreq, now);
				osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.16);

				filter.type = 'bandpass';
				filter.frequency.setValueAtTime(type === 'skeptical' ? 700 : 950, now);
				filter.Q.setValueAtTime(3.5, now);

				gain.gain.setValueAtTime(0.001, now);
				gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

				osc.connect(filter);
				filter.connect(gain);
				gain.connect(ctx.destination);

				osc.start(now);
				osc.stop(now + 0.24);
			}
		} catch (e) {
			// Ignore audio context autoplay restrictions
		}
	}

	function playFanfare() {
		if (!soundEnabled || typeof window === 'undefined') return;
		try {
			const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
			if (!AudioCtx) return;
			const ctx = new AudioCtx();
			const now = ctx.currentTime;
			const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
			chords.forEach((freq, idx) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'triangle';
				osc.frequency.setValueAtTime(freq, now + idx * 0.09);
				gain.gain.setValueAtTime(0.001, now + idx * 0.09);
				gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.09 + 0.03);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.45);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now + idx * 0.09);
				osc.stop(now + idx * 0.09 + 0.48);
			});
		} catch (e) {}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $feynmanDuckOpen}
	<div
		class="duck-backdrop"
		role="presentation"
		transition:fade={{ duration: 180 }}
		on:click={closeFeynmanDuck}
		on:keydown={(e) => { if (e.key === 'Escape') closeFeynmanDuck(); }}
	>
		<div
			class="duck-modal"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			transition:fly={{ y: 20, duration: 240 }}
			on:click|stopPropagation
			on:keydown|stopPropagation={() => {}}
		>
			<!-- Header -->
			<div class="modal-header">
				<div class="header-left">
					<div class="duck-avatar-wrap mood-{currentMood}">
						<span class="duck-emoji">🦆</span>
						{#if currentMood === 'enlightened'}
							<span class="halo-bulb" title="Enlightened!">💡</span>
						{:else if currentMood === 'skeptical'}
							<span class="halo-monocle" title="Skeptical...">🧐</span>
						{:else if currentMood === 'thinking'}
							<span class="halo-dots">
								<span class="dot"></span>
								<span class="dot"></span>
								<span class="dot"></span>
							</span>
						{:else if currentMood === 'mastered'}
							<span class="halo-crown" title="Mastered!">🎓</span>
						{/if}
					</div>

					<div class="header-titles">
						<div class="title-row">
							<h3>Socratic Feynman Duck</h3>
							<span class="badge-feynman">Explain To Learn</span>
							<span class="mood-pill mood-{currentMood}">
								{#if currentMood === 'curious'}🦆 Inquisitive{/if}
								{#if currentMood === 'thinking'}🤔 Pondering...{/if}
								{#if currentMood === 'skeptical'}🧐 Scrutinizing Assumptions{/if}
								{#if currentMood === 'enlightened'}💡 First-Principles Breakthrough!{/if}
								{#if currentMood === 'mastered'}🏆 Topic Mastered!{/if}
							</span>
						</div>
						<p class="subtitle">
							Teach the Duck from first principles · Expose hidden assumptions & edge-case traps
						</p>
					</div>
				</div>

				<div class="header-actions">
					<button
						type="button"
						class="icon-action-btn"
						class:active={soundEnabled}
						title={soundEnabled ? 'Mute Duck Quacks' : 'Enable Duck Quacks'}
						on:click={() => (soundEnabled = !soundEnabled)}
					>
						<NavIcon name={soundEnabled ? 'headphones' : 'minus'} size={15} />
					</button>

					<button
						type="button"
						class="icon-action-btn close"
						title="Close (Esc)"
						on:click={closeFeynmanDuck}
					>
						<NavIcon name="x" size={16} />
					</button>
				</div>
			</div>

			<!-- Topic Config & Suggestions Bar -->
			<div class="topic-bar">
				<div class="subject-pills">
					{#each SUBJECTS as sub}
						<button
							type="button"
							class="sub-pill"
							class:active={subject === sub.code}
							style="--sc: {sub.color}"
							on:click={() => {
								subject = sub.code;
								resetSession();
							}}
						>
							<span class="dot" style="background: {sub.color}"></span>
							{sub.name}
						</button>
					{/each}
				</div>

				<div class="topic-inputs">
					<input
						type="text"
						class="concept-input"
						bind:value={concept}
						placeholder="Concept to explain (e.g., Adiabatic Expansion, Lenz's Law)"
						on:change={resetSession}
					/>
					<button
						type="button"
						class="reset-btn"
						title="Reset with new topic"
						on:click={resetSession}
					>
						<NavIcon name="history" size={13} />
						Restart
					</button>
				</div>
			</div>

			<!-- Suggestions tags if starting out -->
			{#if conversation.length <= 1 && !scorecard}
				<div class="quick-topics">
					<span class="qt-label">Quick First-Principle Scenarios:</span>
					<div class="qt-scroll">
						{#each SUGGESTED_TOPICS as item}
							<button type="button" class="qt-btn" on:click={() => pickSuggestion(item)}>
								<span class="qt-sub">{item.s}</span>
								<span>{item.c}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Content Area: Either Active Chat or Scorecard View -->
			{#if scorecard}
				<!-- Scorecard View -->
				<div class="scorecard-view" in:fly={{ y: 15, duration: 250 }}>
					<div class="sc-hero">
						<div class="sc-badge-circle">
							<span class="sc-stars">{'★'.repeat(Math.round(scorecard.score))}{'☆'.repeat(5 - Math.round(scorecard.score))}</span>
							<span class="sc-number">{scorecard.score.toFixed(1)} / 5</span>
						</div>
						<div class="sc-hero-info">
							<span class="sc-label">FEYNMAN MASTERY LEVEL</span>
							<h4 class="sc-title">{scorecard.ratingLabel}</h4>
							<p class="sc-takeaway">"{scorecard.goldenTakeaway}"</p>
						</div>
					</div>

					<div class="sc-grid">
						<div class="sc-card nailed-card">
							<div class="sc-card-head">
								<span class="icon">✅</span>
								<h5>What You Nailed</h5>
							</div>
							<ul>
								{#each scorecard.nailed as item}
									<li>{item}</li>
								{/each}
							</ul>
						</div>

						<div class="sc-card blindspot-card">
							<div class="sc-card-head">
								<span class="icon">⚠️</span>
								<h5>Blind Spots & Traps Exposed</h5>
							</div>
							<ul>
								{#each scorecard.blindSpots as item}
									<li>{item}</li>
								{/each}
							</ul>
						</div>
					</div>

					<!-- Flashcard Recommendation -->
					<div class="fc-preview-card">
						<div class="fc-head">
							<div class="fc-title">
								<NavIcon name="layers" size={14} />
								<span>Generated Active Recall Card</span>
							</div>
							{#if cardSaved}
								<span class="saved-pill">✓ Saved to Deck</span>
							{:else}
								<button type="button" class="save-fc-btn" on:click={saveAsFlashcard}>
									<NavIcon name="plus" size={12} />
									Save to Flashcards
								</button>
							{/if}
						</div>
						<div class="fc-body">
							<div class="fc-q">
								<b>Q:</b> {scorecard.suggestedFlashcard.front}
							</div>
							<div class="fc-a">
								<b>A:</b> {scorecard.suggestedFlashcard.back}
							</div>
						</div>
					</div>

					<!-- Scorecard Actions -->
					<div class="sc-actions">
						{#if !revisionCompleted}
							<button type="button" class="action-btn recall-btn" on:click={markChapterRevised}>
								<NavIcon name="bolt" size={14} />
								Mark Chapter Revised in Hub
							</button>
						{:else}
							<button type="button" class="action-btn recall-btn done" disabled>
								<NavIcon name="check" size={14} />
								Retention Boost Applied!
							</button>
						{/if}

						<button type="button" class="action-btn resume-btn" on:click={() => (scorecard = null)}>
							<NavIcon name="arrow-right" size={14} />
							Continue Dialogue
						</button>

						<button type="button" class="action-btn new-btn" on:click={resetSession}>
							<NavIcon name="history" size={14} />
							Teach Another Topic
						</button>
					</div>
				</div>
			{:else}
				<!-- Chat Stream Area -->
				<div class="chat-area" bind:this={chatBox}>
					{#each conversation as turn (turn.timestamp)}
						<div class="chat-bubble-row {turn.role}" in:fly={{ y: 8, duration: 180 }}>
							{#if turn.role === 'duck'}
								<div class="duck-badge-avatar">🦆</div>
							{/if}

							<div class="bubble {turn.role}">
								<div class="bubble-header">
									<span class="sender-name">
										{turn.role === 'duck' ? 'Feynman Duck' : 'You (Teacher)'}
									</span>
									{#if turn.role === 'duck' && turn.mood}
										<span class="bubble-mood-tag mood-{turn.mood}">
											{#if turn.mood === 'enlightened'}💡 Insightful!{/if}
											{#if turn.mood === 'skeptical'}🧐 Assumption Alert!{/if}
											{#if turn.mood === 'curious'}🦆 Inquisitive{/if}
										</span>
									{/if}
								</div>

								<div class="bubble-content markdown-body">
									{#if turn.role === 'duck' && turn.html}
										{@html turn.html}
									{:else}
										<p>{turn.text}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}

					{#if loading}
						<div class="chat-bubble-row duck" in:fade>
							<div class="duck-badge-avatar">🦆</div>
							<div class="bubble duck typing-bubble">
								<span class="typing-dot"></span>
								<span class="typing-dot"></span>
								<span class="typing-dot"></span>
								<span class="typing-label">Duck is dissecting your explanation...</span>
							</div>
						</div>
					{/if}

					{#if error}
						<div class="duck-error-banner" in:fade>
							<NavIcon name="alert" size={14} />
							<span>{error}</span>
						</div>
					{/if}
				</div>

				<!-- Prompt Suggestions / Input Toolbar -->
				<div class="input-container">
					{#if conversation.filter((t) => t.role === 'user').length > 0}
						<div class="evaluation-prompt-bar">
							<span class="ep-text">Ready to test if you truly understand this?</span>
							<button
								type="button"
								class="grade-btn"
								disabled={evaluating || loading}
								on:click={requestEvaluation}
							>
								{#if evaluating}
									<span class="spinner-small"></span>
									Evaluating First Principles...
								{:else}
									<NavIcon name="crown" size={14} />
									Grade My Explanation (Feynman Scorecard)
								{/if}
							</button>
						</div>
					{/if}

					<div class="input-box">
						<textarea
							rows="3"
							class="duck-textarea"
							placeholder="Explain the concept in simple words. Avoid relying solely on formulas—what is physically happening? (Cmd+Enter to send)"
							bind:value={draft}
							on:keydown={(e) => {
								if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
									e.preventDefault();
									sendMessage();
								}
							}}
						></textarea>

						<div class="input-actions-bar">
							<div class="left-actions">
								{#if voiceSupported}
									<button
										type="button"
										class="mic-btn"
										class:recording={isRecording}
										title={isRecording ? 'Stop Voice Input' : 'Speak Your Explanation'}
										on:click={toggleVoice}
									>
										<NavIcon name="headphones" size={13} />
										<span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
									</button>
								{/if}
								<span class="tip-shortcut">Press <b>Cmd+Enter</b> to send</span>
							</div>

							<button
								type="button"
								class="send-btn"
								disabled={!draft.trim() || loading}
								on:click={sendMessage}
							>
								<NavIcon name="arrow-right" size={15} />
								<span>Teach Duck</span>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.duck-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
	}

	.duck-modal {
		width: 100%;
		max-width: 820px;
		height: 88vh;
		max-height: 820px;
		display: flex;
		flex-direction: column;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		overflow: hidden;
		position: relative;
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.15rem 1.4rem;
		border-bottom: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel) 90%, transparent);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.duck-avatar-wrap {
		width: 48px;
		height: 48px;
		border-radius: 16px;
		background: color-mix(in srgb, #f59e0b 16%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
		display: grid;
		place-items: center;
		position: relative;
		font-size: 1.85rem;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
		transition: all 0.3s ease;
	}

	.duck-avatar-wrap.mood-enlightened {
		background: color-mix(in srgb, #eab308 24%, var(--surface-subtle));
		border-color: #eab308;
		box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
		animation: pulse-aura 2s infinite ease-in-out;
	}

	@keyframes pulse-aura {
		0%, 100% { transform: scale(1); box-shadow: 0 0 16px rgba(234, 179, 8, 0.4); }
		50% { transform: scale(1.04); box-shadow: 0 0 28px rgba(234, 179, 8, 0.7); }
	}

	.duck-avatar-wrap.mood-skeptical {
		background: color-mix(in srgb, #ef4444 18%, var(--surface-subtle));
		border-color: #ef4444;
	}

	.halo-bulb, .halo-monocle, .halo-crown {
		position: absolute;
		top: -8px;
		right: -8px;
		font-size: 1.15rem;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
		animation: bounce-halo 1.5s infinite alternate ease-in-out;
	}

	@keyframes bounce-halo {
		0% { transform: translateY(0); }
		100% { transform: translateY(-4px); }
	}

	.halo-dots {
		position: absolute;
		top: -4px;
		right: -4px;
		display: flex;
		gap: 2px;
	}

	.halo-dots .dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #f59e0b;
		animation: blink-dot 1.2s infinite ease-in-out both;
	}
	.halo-dots .dot:nth-child(2) { animation-delay: 0.2s; }
	.halo-dots .dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes blink-dot {
		0%, 100% { opacity: 0.2; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1.2); }
	}

	.header-titles {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.title-row h3 {
		font-size: 1.1rem;
		font-weight: 850;
		color: var(--text-primary);
		margin: 0;
		letter-spacing: -0.02em;
	}

	.badge-feynman {
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.mood-pill {
		font-size: 0.68rem;
		font-weight: 800;
		padding: 0.18rem 0.55rem;
		border-radius: 99px;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.mood-pill.mood-enlightened {
		background: rgba(234, 179, 8, 0.15);
		color: #eab308;
		border-color: rgba(234, 179, 8, 0.4);
	}

	.mood-pill.mood-skeptical {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.4);
	}

	.subtitle {
		font-size: 0.76rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.icon-action-btn {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.icon-action-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.icon-action-btn.active {
		color: var(--accent);
		border-color: var(--accent);
	}

	.icon-action-btn.close:hover {
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.4);
	}

	/* Topic Setup Bar */
	.topic-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.75rem 1.4rem;
		background: color-mix(in srgb, var(--surface-subtle) 60%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		flex-wrap: wrap;
	}

	.subject-pills {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.sub-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.65rem;
		border-radius: 8px;
		font-size: 0.72rem;
		font-weight: 750;
		background: var(--surface-panel);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.sub-pill .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.sub-pill:hover {
		color: var(--text-primary);
	}

	.sub-pill.active {
		color: var(--sc);
		border-color: var(--sc);
		background: color-mix(in srgb, var(--sc) 12%, var(--surface-panel));
	}

	.topic-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 260px;
	}

	.concept-input {
		flex: 1;
		height: 32px;
		padding: 0 0.8rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-primary);
		font-size: 0.78rem;
		font-weight: 650;
		outline: none;
		transition: border-color 0.18s ease;
	}

	.concept-input:focus {
		border-color: var(--accent);
	}

	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		height: 32px;
		padding: 0 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.reset-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	/* Quick Topics */
	.quick-topics {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 1.4rem;
		background: color-mix(in srgb, var(--surface-subtle) 40%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		overflow: hidden;
	}

	.qt-label {
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.qt-scroll {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	.qt-scroll::-webkit-scrollbar { display: none; }

	.qt-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.55rem;
		border-radius: 6px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 0.68rem;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.qt-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.qt-sub {
		font-weight: 850;
		color: var(--accent);
	}

	/* Chat Stream */
	.chat-area {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1.25rem 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.chat-bubble-row {
		display: flex;
		gap: 0.75rem;
		max-width: 86%;
	}

	.chat-bubble-row.duck {
		align-self: flex-start;
	}

	.chat-bubble-row.user {
		align-self: flex-end;
		flex-direction: row-reverse;
	}

	.duck-badge-avatar {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: color-mix(in srgb, #f59e0b 16%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
		display: grid;
		place-items: center;
		font-size: 1.2rem;
		flex-shrink: 0;
	}

	.bubble {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.85rem 1.1rem;
		border-radius: 18px;
		line-height: 1.5;
	}

	.bubble.duck {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-top-left-radius: 4px;
		color: var(--text-primary);
	}

	.bubble.user {
		background: var(--accent);
		color: #ffffff;
		border-top-right-radius: 4px;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.bubble-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		margin-bottom: 0.1rem;
	}

	.sender-name {
		font-size: 0.68rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.85;
	}

	.bubble-mood-tag {
		font-size: 0.64rem;
		font-weight: 800;
		padding: 0.1rem 0.45rem;
		border-radius: 99px;
		background: rgba(255, 255, 255, 0.08);
	}

	.bubble-mood-tag.mood-enlightened {
		color: #eab308;
		background: rgba(234, 179, 8, 0.15);
	}

	.bubble-mood-tag.mood-skeptical {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.15);
	}

	.bubble-content {
		font-size: 0.86rem;
	}

	.bubble.user .bubble-content p {
		margin: 0;
		color: #ffffff;
	}

	/* Typing state */
	.typing-bubble {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 1rem;
	}

	.typing-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-secondary);
		animation: typing-jump 1.3s infinite ease-in-out;
	}

	.typing-dot:nth-child(2) { animation-delay: 0.2s; }
	.typing-dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes typing-jump {
		0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
		40% { transform: translateY(-5px); opacity: 1; }
	}

	.typing-label {
		font-size: 0.74rem;
		color: var(--text-secondary);
		margin-left: 0.3rem;
	}

	.duck-error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.95rem;
		border-radius: 10px;
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
		font-size: 0.78rem;
		font-weight: 700;
	}

	/* Input Area */
	.input-container {
		padding: 0.85rem 1.4rem 1.15rem;
		border-top: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--surface-panel) 92%, transparent);
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.evaluation-prompt-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.5rem 0.85rem;
		border-radius: 10px;
		background: color-mix(in srgb, var(--accent) 10%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.ep-text {
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.grade-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.8rem;
		border-radius: 8px;
		background: var(--accent);
		color: #ffffff;
		border: none;
		font-size: 0.74rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 40%, transparent);
		transition: all 0.18s ease;
	}

	.grade-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 60%, transparent);
	}

	.grade-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.input-box {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		background: var(--surface-subtle);
		overflow: hidden;
		transition: border-color 0.18s ease;
	}

	.input-box:focus-within {
		border-color: var(--accent);
	}

	.duck-textarea {
		width: 100%;
		border: none;
		background: transparent;
		padding: 0.75rem 0.95rem;
		color: var(--text-primary);
		font-size: 0.84rem;
		font-family: inherit;
		resize: none;
		outline: none;
		line-height: 1.45;
	}

	.input-actions-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.45rem 0.75rem;
		background: color-mix(in srgb, var(--surface-panel) 60%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent);
	}

	.left-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.mic-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.55rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-panel);
		color: var(--text-secondary);
		font-size: 0.68rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.mic-btn:hover {
		color: var(--text-primary);
		border-color: var(--accent);
	}

	.mic-btn.recording {
		background: rgba(239, 68, 68, 0.15);
		border-color: #ef4444;
		color: #ef4444;
		animation: mic-pulse 1.2s infinite ease-in-out;
	}

	@keyframes mic-pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.tip-shortcut {
		font-size: 0.68rem;
		color: var(--text-secondary);
		opacity: 0.75;
	}

	.send-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.9rem;
		border-radius: 8px;
		border: none;
		background: var(--accent);
		color: #ffffff;
		font-size: 0.76rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.send-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Scorecard View */
	.scorecard-view {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	.sc-hero {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		padding: 1.25rem 1.4rem;
		border-radius: 18px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, var(--surface-subtle)), color-mix(in srgb, #eab308 14%, var(--surface-subtle)));
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.sc-badge-circle {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 82px;
		height: 82px;
		border-radius: 50%;
		background: var(--surface-panel);
		border: 2px solid var(--accent);
		box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 35%, transparent);
		flex-shrink: 0;
	}

	.sc-stars {
		font-size: 0.85rem;
		color: #eab308;
		letter-spacing: 1px;
	}

	.sc-number {
		font-size: 0.86rem;
		font-weight: 900;
		color: var(--text-primary);
	}

	.sc-hero-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.sc-label {
		font-size: 0.65rem;
		font-weight: 850;
		letter-spacing: 0.08em;
		color: var(--accent);
		text-transform: uppercase;
	}

	.sc-title {
		font-size: 1.25rem;
		font-weight: 850;
		color: var(--text-primary);
		margin: 0;
	}

	.sc-takeaway {
		font-size: 0.84rem;
		font-style: italic;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.sc-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.sc-card {
		padding: 1rem 1.2rem;
		border-radius: 14px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.sc-card-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sc-card-head h5 {
		font-size: 0.82rem;
		font-weight: 850;
		margin: 0;
		color: var(--text-primary);
	}

	.sc-card ul {
		margin: 0;
		padding-left: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.sc-card li {
		font-size: 0.78rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	/* Flashcard Preview Card */
	.fc-preview-card {
		padding: 1rem 1.2rem;
		border-radius: 14px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.fc-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.fc-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.78rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.save-fc-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.65rem;
		border-radius: 6px;
		border: 1px solid var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.save-fc-btn:hover {
		background: var(--accent);
		color: #ffffff;
	}

	.saved-pill {
		font-size: 0.7rem;
		font-weight: 800;
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
	}

	.fc-body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.8rem;
		background: var(--surface-panel);
		padding: 0.75rem 0.95rem;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
	}

	.fc-q b, .fc-a b {
		color: var(--accent);
	}

	.fc-q, .fc-a {
		color: var(--text-primary);
		line-height: 1.4;
	}

	/* Scorecard Actions */
	.sc-actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
		padding-top: 0.4rem;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 1rem;
		border-radius: 10px;
		font-size: 0.78rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.action-btn.recall-btn {
		background: linear-gradient(135deg, #10b981, #059669);
		color: #ffffff;
		border: none;
		box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
	}

	.action-btn.recall-btn.done {
		background: var(--surface-subtle);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
		cursor: default;
		box-shadow: none;
	}

	.action-btn.resume-btn {
		background: var(--accent);
		color: #ffffff;
		border: none;
	}

	.action-btn.new-btn {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.spinner-small {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 640px) {
		.duck-modal {
			height: 96vh;
			border-radius: 18px;
		}
		.modal-header {
			padding: 0.9rem 1.1rem;
		}
		.topic-bar {
			padding: 0.6rem 1.1rem;
		}
		.chat-area {
			padding: 0.9rem 1.1rem;
		}
		.input-container {
			padding: 0.75rem 1.1rem 1rem;
		}
		.chat-bubble-row {
			max-width: 95%;
		}
		.evaluation-prompt-bar {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
