<script lang="ts">
	import { renderMarkdownSync } from '$lib/services/markdown';
	import { tracker, logBulkQuestions, logMockTestScore } from '$lib/stores/tracker';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { globalTimer } from '$lib/stores/timerState';
	import { formatClock } from '$lib/state/dates';
	import { fade, fly, scale } from 'svelte/transition';
	import { onMount, tick } from 'svelte';
	import NavIcon from '../NavIcon.svelte'; // Assuming NavIcon exists
	import { buildAcademicConstraintPrompt } from '$lib/services/aiContext';
	
	let orbState: 'idle' | 'happy' | 'alert' | 'thinking' | 'active' = 'idle';
	let message = '';
	let showMessage = false;
	let timeout: any;
	
	// Chat State
	let chatOpen = false;
	let chatInput = '';
	let chatHistory: { role: 'user' | 'ai', text: string }[] = [
		{ role: 'ai', text: "I'm your AI Mentor. I have access to your Elo stats, study logs, and mock test data. Ask me anything!" }
	];
	let isTyping = false;
	let chatContainer: HTMLElement;
	
	function triggerMessage(text: string, state: typeof orbState = 'idle', duration = 6000) {
		if (chatOpen) return; // Don't show bubbles if chat is open
		message = text;
		orbState = state;
		showMessage = true;
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			showMessage = false;
			orbState = 'idle';
		}, duration);
	}

	let lastElo = { P: 1200, C: 1200, M: 1200 };
	
	onMount(() => {
		if ($tracker.gamification?.elo) {
			lastElo = { ...($tracker.gamification?.elo || lastElo) };
		}
		
		setTimeout(() => {
			triggerMessage("I'm here. Let's conquer JEE.", 'idle', 4000);
		}, 1000);
	});
	
	$: {
		if ($tracker.gamification?.elo) {
			const currentElo = ($tracker.gamification?.elo || lastElo);
			for (const sub of ['P', 'C', 'M'] as const) {
				const diff = currentElo[sub] - lastElo[sub];
				if (diff <= -15) {
					triggerMessage(`Ouch, big Elo drop in ${sub}. Should we launch a Crash Course?`, 'alert', 8000);
					lastElo = { ...currentElo };
				} else if (diff >= 15) {
					triggerMessage(`Massive gain in ${sub}! You are crushing it.`, 'happy', 6000);
					lastElo = { ...currentElo };
				}
			}
		}
	}

	const handleOrbClick = () => {
		if (chatOpen) {
			chatOpen = false;
			orbState = 'idle';
		} else {
			showMessage = false;
			chatOpen = true;
			orbState = 'thinking';
		}
	};

	const scrollToBottom = async () => {
		await tick();
		if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
	};

	const sendMessage = async () => {
		if (!chatInput.trim() || isTyping) return;
		
		const userMsg = chatInput.trim();
		chatHistory = [...chatHistory, { role: 'user', text: userMsg }];
		chatInput = '';
		isTyping = true;
		orbState = 'active';
		scrollToBottom();

		const academicConstraints = buildAcademicConstraintPrompt($tracker);
		const systemInstruction = `You are the BTracker AI Mentor. 
Current Elo: P: ${$tracker.gamification?.elo?.P ?? 1200}, C: ${$tracker.gamification?.elo?.C ?? 1200}, M: ${$tracker.gamification?.elo?.M ?? 1200}.
${academicConstraints}
CRITICAL INSTRUCTIONS:
1. KEEP IT SHORT! Answer in 1-2 brief sentences max. NO LONG EXPLANATIONS. NO FLUFF.
2. Restrict all concepts, chapter advice, difficulty, and problem discussions strictly to the student's grade level and tickmarked checklist chapters. Never assume or bring up unticked chapters.
3. Format your text using clean Markdown. When writing math formulas or symbols (integrals, fractions, derivatives, vectors, greek symbols), ALWAYS wrap them in LaTeX dollar signs like $ \int f(x) dx $ or $ \frac{a}{b} $ or $$ \int_a^b f(x) dx $$ so KaTeX renders them properly.
4. If the user asks to start a focus timer or stopwatch, append EXACTLY this JSON block at the end of your message: <cmd>{"action": "startTimer", "minutes": 25, "subject": "P", "chapter": 1, "mode": "timer"}</cmd> (subject must be 'P', 'C', or 'M'. Mode can be "timer" or "stopwatch").
5. If the user asks to log questions/exercises (e.g. "I did ex 1"), append: <cmd>{"action": "logQuestions", "subject": "P", "chapter": 1, "count": 20, "name": "Ex 1"}</cmd>.
6. If the user asks to log a mock test (e.g. "scored 180 out of 300"), append: <cmd>{"action": "logMockTest", "score": 180, "total": 300, "subjectScores": {"P": {"c": 15, "w": 5, "s": 60}, "C": {"c": 15, "w": 5, "s": 60}, "M": {"c": 15, "w": 5, "s": 60}}}</cmd>. Estimate subject scores if they don't provide them.`;

		const history = chatHistory.map(msg => ({
			role: msg.role === 'ai' ? 'model' : 'user',
			parts: [{ text: msg.text }]
		}));

		try {
			const res = await fetch('/api/gemini', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ history, systemInstruction })
			});
			const data = await res.json();
			
			if (data.error) {
				chatHistory = [...chatHistory, { role: 'ai', text: `Error: ${data.error}` }];
			} else if (data.text) {
				let text = data.text;
				
				// Parse and execute commands
				const cmdRegex = /<cmd>(.*?)<\/cmd>/g;
				let match;
				while ((match = cmdRegex.exec(text)) !== null) {
					try {
						const cmd = JSON.parse(match[1]);
						if (cmd.action === 'startTimer') {
							$globalTimer.start(cmd.subject, (cmd.minutes || 25) * 60, String(cmd.chapter || ''), cmd.mode || 'timer');
						} else if (cmd.action === 'logQuestions') {
							logBulkQuestions(cmd.subject, cmd.chapter || 1, cmd.count || 10, cmd.name || 'AI Logged');
						} else if (cmd.action === 'logMockTest') {
							logMockTestScore(cmd.score || 0, cmd.total || 300, cmd.subjectScores || { P: {c:0,w:0,s:0}, C: {c:0,w:0,s:0}, M: {c:0,w:0,s:0} });
						}
					} catch (e) {
						console.error("AI Command Error:", e);
					}
				}
				
				// Remove commands from visible text
				text = text.replace(/<cmd>.*?<\/cmd>/g, '').trim();
				
				chatHistory = [...chatHistory, { role: 'ai', text }];
			} else {
				chatHistory = [...chatHistory, { role: 'ai', text: "I'm sorry, I couldn't process that right now." }];
			}
		} catch (err) {
			chatHistory = [...chatHistory, { role: 'ai', text: "Network error. Please try again." }];
		} finally {
			isTyping = false;
			orbState = 'idle';
			scrollToBottom();
		}
	};

	async function runActionShortcut(action: 'pomodoro' | 'stopwatch' | 'logP' | 'logC' | 'logM' | 'weakSpots') {
		if (action === 'pomodoro') {
			$globalTimer.start('P', 25 * 60, '', 'timer');
			chatHistory = [...chatHistory, { role: 'ai', text: "Started 25m Pomodoro focus timer. Stay locked in! 🎯" }];
			scrollToBottom();
		} else if (action === 'stopwatch') {
			$globalTimer.start('P', 0, '', 'stopwatch');
			chatHistory = [...chatHistory, { role: 'ai', text: "Started stopwatch study session. Keep solving! ⏱️" }];
			scrollToBottom();
		} else if (action === 'logP') {
			logBulkQuestions('P', 1, 25, 'AI Mentor Log');
			chatHistory = [...chatHistory, { role: 'ai', text: "Logged 25 Physics questions (+250 XP). Momentum is building! ⚡" }];
			scrollToBottom();
		} else if (action === 'logC') {
			logBulkQuestions('C', 1, 25, 'AI Mentor Log');
			chatHistory = [...chatHistory, { role: 'ai', text: "Logged 25 Chemistry questions (+250 XP). Strong practice! 🧪" }];
			scrollToBottom();
		} else if (action === 'logM') {
			logBulkQuestions('M', 1, 25, 'AI Mentor Log');
			chatHistory = [...chatHistory, { role: 'ai', text: "Logged 25 Maths questions (+250 XP). Sharp accuracy! 📐" }];
			scrollToBottom();
		} else if (action === 'weakSpots') {
			chatInput = "What are my weakest areas based on my Elo and question log, and what should I solve next?";
			await sendMessage();
		}
	}
</script>

<div class="mentor-wrapper">
	{#if chatOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="chat-backdrop" on:click={handleOrbClick}></div>
		<div class="chat-panel" transition:fly={{ y: 20, duration: 300, opacity: 0 }}>
			<div class="chat-header">
				<div class="header-title">
					<div class="mini-orb {orbState}"></div>
					<h3>AI Mentor</h3>
				</div>
				<button class="close-btn" on:click={handleOrbClick}>×</button>
			</div>
			
			<div class="chat-body" bind:this={chatContainer}>
				{#each chatHistory as msg}
					<div class="chat-bubble {msg.role}">
						{#if msg.role === 'ai'}
							{@html renderMarkdownSync(msg.text)}
						{:else}
							{msg.text}
						{/if}
					</div>
				{/each}
				{#if isTyping}
					<div class="chat-bubble ai typing">
						<span class="dot"></span><span class="dot"></span><span class="dot"></span>
					</div>
				{/if}
			</div>

			<div class="shortcuts-row" aria-label="Quick Actions">
				<button type="button" class="action-pill" on:click={() => runActionShortcut('pomodoro')}>
					<NavIcon name="clock" size={12} /> 25m Pomodoro
				</button>
				<button type="button" class="action-pill" on:click={() => runActionShortcut('stopwatch')}>
					<NavIcon name="pulse" size={12} /> Stopwatch
				</button>
				<button type="button" class="action-pill p" on:click={() => runActionShortcut('logP')}>
					<NavIcon name="plus" size={12} /> 25 Physics Qs
				</button>
				<button type="button" class="action-pill c" on:click={() => runActionShortcut('logC')}>
					<NavIcon name="plus" size={12} /> 25 Chem Qs
				</button>
				<button type="button" class="action-pill m" on:click={() => runActionShortcut('logM')}>
					<NavIcon name="plus" size={12} /> 25 Math Qs
				</button>
				<button type="button" class="action-pill" on:click={() => runActionShortcut('weakSpots')}>
					<NavIcon name="target" size={12} /> Weak Spots
				</button>
			</div>

			<div class="chat-input-area">
				<input 
					type="text" 
					placeholder="Ask a doubt or request analysis..." 
					bind:value={chatInput}
					on:keydown={(e) => e.key === 'Enter' && sendMessage()}
				/>
				<button class="send-btn" disabled={!chatInput.trim() || isTyping} on:click={sendMessage}>
					<NavIcon name="arrow-right" size={14} />
				</button>
			</div>
		</div>
	{:else if showMessage}
		<div class="mentor-bubble" transition:fly={{ y: 10, duration: 300 }}>
			{@html renderMarkdownSync(message)}
		</div>
	{/if}

{#if $globalTimer.running && $page.url.pathname !== '/focus'}
	<div
		class="mini-timer"
		role="button"
		tabindex="0"
		aria-label="Open Focus Screen"
		transition:fly={{ y: 30, duration: 400, opacity: 0 }}
		class:break={$globalTimer.phase === 'break'}
		on:click={() => goto('/focus')}
		on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto('/focus'); } }}
	>
		<div class="mini-time">{formatClock($globalTimer.tab === 'stopwatch' ? $globalTimer.elapsed : $globalTimer.remaining)}</div>
		<div class="mini-phase">{$globalTimer.tab === 'stopwatch' ? 'SW' : $globalTimer.phase === 'break' ? 'BREAK' : 'FOCUS'}</div>
		<button class="mini-pause" aria-label="Pause" on:click|stopPropagation={$globalTimer.toggle}>
			<NavIcon name="pause" size={14} />
		</button>
	</div>
{/if}

	<button type="button" class="orb {orbState}" aria-label="AI Mentor Assistant" on:click={handleOrbClick}>
		<div class="core"></div>
		<div class="ring r1"></div>
		<div class="ring r2"></div>
		<div class="ring r3"></div>
		<div class="ring r4"></div>
	</button>
</div>

<style>
	.mentor-wrapper { 
		position: fixed; 
		bottom: 24px; 
		right: 24px; 
		z-index: 9999; 
		display: flex; 
		flex-direction: column; 
		align-items: flex-end; 
		gap: 12px; 
		pointer-events: none; 
		transition: bottom 0.3s;
	}
	
	.chat-backdrop {
		display: none;
	}

	@media (max-width: 760px) {
		.chat-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.60);
			backdrop-filter: blur(28px) saturate(190%);
			-webkit-backdrop-filter: blur(28px) saturate(190%);
			z-index: 10000;
			pointer-events: auto;
		}

		.mentor-wrapper {
			/* Push above the mobile bottom nav */
			bottom: calc(max(env(safe-area-inset-bottom), 16px) + 78px);
			right: 16px;
		}

		.chat-panel {
			position: fixed !important;
			left: 50% !important;
			transform: translateX(-50%) !important;
			bottom: calc(max(env(safe-area-inset-bottom), 16px) + 82px) !important;
			width: min(calc(100vw - 24px), 420px) !important;
			max-height: min(520px, calc(100dvh - max(env(safe-area-inset-top), 24px) - 160px)) !important;
			height: 500px !important;
			border-radius: 20px !important;
			box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
			z-index: 10001 !important;
		}

		.mentor-bubble {
			max-width: min(calc(100vw - 32px), 320px);
		}
	}
	
	/* CHAT PANEL */
	.chat-panel { 
		width: 380px; 
		height: 520px;
		background: color-mix(in srgb, var(--surface-panel, #121020) 96%, transparent); 
		backdrop-filter: blur(36px) saturate(210%); 
		-webkit-backdrop-filter: blur(36px) saturate(210%); 
		border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16)); 
		border-radius: 20px; 
		box-shadow: 0 24px 64px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14); 
		pointer-events: auto; 
		display: flex; 
		flex-direction: column;
		overflow: hidden;
	}
	:root[data-clear-glass="true"] .chat-panel { background: var(--surface-canvas) !important; border: 1px solid var(--border-subtle) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }

	.chat-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-panel), transparent 50%); }
	.header-title { display: flex; align-items: center; gap: 10px; }
	.header-title h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
	.close-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 4px; transition: color 0.2s; }
	.close-btn:hover { color: var(--danger); }

	.mini-orb { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); animation: pulse-core-fast 1s infinite; }

	.chat-body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
	.chat-bubble { padding: 10px 14px; border-radius: 14px; font-size: 0.85rem; line-height: 1.5; max-width: 85%; word-wrap: break-word; }
	.chat-bubble.ai { background: var(--surface-subtle); color: var(--text-primary); border-bottom-left-radius: 4px; align-self: flex-start; }
	.chat-bubble.user { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
	.chat-bubble :global(.katex-display) { overflow-x: auto; overflow-y: hidden; margin: 0.5rem 0; padding: 0.2rem 0; max-width: 100%; }
	.chat-bubble :global(.katex) { font-size: 1.05em; }
	.mentor-bubble :global(.katex-display) { overflow-x: auto; overflow-y: hidden; margin: 0.4rem 0; padding: 0.1rem 0; max-width: 100%; }
	.mentor-bubble :global(.katex) { font-size: 1.05em; }
	
	.chat-bubble.typing { display: flex; gap: 4px; padding: 12px 16px; }
	.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-secondary); animation: bounce 1.4s infinite ease-in-out both; }
	.dot:nth-child(1) { animation-delay: -0.32s; }
	.shortcuts-row {
		display: flex;
		gap: 6px;
		padding: 8px 12px;
		overflow-x: auto;
		white-space: nowrap;
		scrollbar-width: none;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 40%);
		background: color-mix(in srgb, var(--surface-panel), transparent 40%);
	}
	.shortcuts-row::-webkit-scrollbar { display: none; }
	.action-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 26px;
		padding: 0 8px;
		border: 1px solid var(--border-subtle);
		border-radius: 99px;
		background: var(--surface-subtle);
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 750;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.15s ease;
		user-select: none;
	}
	.action-pill:hover {
		border-color: var(--accent);
		color: var(--text-primary);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.action-pill.p:hover { border-color: #00e5ff; color: #00e5ff; }
	.action-pill.c:hover { border-color: #a3e635; color: #a3e635; }
	.action-pill.m:hover { border-color: #ffd700; color: #ffd700; }

	.chat-input-area { padding: 12px; display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-panel), transparent 50%); }
	.chat-input-area input { flex: 1; background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: 99px; padding: 8px 16px; color: var(--text-primary); font-size: 0.85rem; outline: none; transition: border-color 0.2s; }
	.chat-input-area input:focus { border-color: var(--accent); }
	.send-btn { background: var(--accent); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
	.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.send-btn:not(:disabled):active { scale: 0.9; }

	/* BUBBLE & ORB */
	.mentor-bubble { background: var(--surface-panel-ai, var(--surface-panel)); backdrop-filter: var(--glass-filter, blur(20px) saturate(180%)); -webkit-backdrop-filter: var(--glass-filter, blur(20px) saturate(180%)); border: 1px solid var(--border-subtle); padding: 0.75rem 1rem; border-radius: 12px; border-bottom-right-radius: 2px; color: var(--text-primary); font-size: 0.85rem; font-weight: 600; max-width: 360px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); pointer-events: auto; line-height: 1.5; }
	:root[data-clear-glass="true"] .mentor-bubble { background: var(--surface-canvas) !important; border: 1px solid var(--border-subtle) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }

.orb { position: relative; width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; pointer-events: auto; padding: 0; outline: none; border-radius: 50%; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); display: grid; place-items: center; }
	
	.orb:hover { scale: 1.25; }
	.orb:not(.thinking):hover .core { animation-duration: 0.5s !important; box-shadow: 0 0 30px var(--accent), inset 0 0 15px var(--accent) !important; background: var(--accent) !important; }
	.orb:not(.thinking):hover .ring { animation-duration: 2s !important; opacity: 1 !important; filter: drop-shadow(0 0 6px var(--accent)); }
	
	.orb .core { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 30%, transparent); border: 1px solid var(--accent); box-shadow: 0 0 15px var(--accent), inset 0 0 8px var(--accent); transition: all 0.3s; z-index: 3; }
	
	.orb .ring { 
		position: absolute; 
		inset: -2px; 
		border-radius: 50%; 
		border: 1px solid transparent; 
		opacity: 0.75; 
		z-index: 2; 
		transition: opacity 1.5s ease-out, border-width 0.3s ease; 
		mix-blend-mode: screen; 
	}
	
	.orb .r1 { animation: spin 7s linear infinite, morph1 5s ease-in-out infinite; border: 2px solid transparent; border-top-color: var(--accent); border-bottom-color: var(--accent); box-shadow: 0 0 8px var(--accent), inset 0 0 8px var(--accent); }
	.orb .r2 { animation: spin-reverse 9s linear infinite, morph2 6s ease-in-out infinite; border: 2px solid transparent; border-left-color: var(--accent); box-shadow: 0 0 6px var(--accent); scale: 0.9; }
	.orb .r3 { animation: spin 12s linear infinite, morph1 7s ease-in-out infinite reverse; border: 1px dashed var(--accent); opacity: 0.6; scale: 1.15; box-shadow: inset 0 0 6px var(--accent); }
	.orb .r4 { animation: spin-reverse 18s linear infinite; border: 1px dotted var(--accent); opacity: 0.6; scale: 0.75; }
	
	.orb.idle .core { animation: pulse-core 4s ease-in-out infinite; }
	
	.orb.alert .core { background: color-mix(in srgb, var(--danger) 50%, transparent); border-color: var(--danger); box-shadow: 0 0 20px var(--danger), inset 0 0 10px var(--danger); animation: pulse-core-fast 1s ease-in-out infinite; }
	.orb.alert .ring { border-color: var(--danger); box-shadow: 0 0 6px var(--danger), inset 0 0 6px var(--danger); }
	
	.orb.happy .core { background: color-mix(in srgb, var(--success) 50%, transparent); border-color: var(--success); box-shadow: 0 0 20px var(--success), inset 0 0 10px var(--success); animation: pulse-core 2s ease-in-out infinite; }
	.orb.happy .ring { border-color: var(--success); box-shadow: 0 0 6px var(--success), inset 0 0 6px var(--success); }
	
	.orb.thinking { scale: 0.85; }
	.orb.thinking .ring { animation-duration: 0.6s !important; opacity: 1; border-color: var(--accent); border-width: 2px; border-style: solid; box-shadow: 0 0 10px var(--accent); }
	.orb.thinking .core { background: var(--accent); animation: pulse-core 8s ease-in-out infinite; box-shadow: 0 0 5px var(--accent); }
	.orb.thinking .ring { opacity: 0; } /* Smoothly fade out over 1.5s */
	
	.orb.active .core { background: var(--accent); animation: pulse-core-fast 0.6s ease-in-out infinite; box-shadow: 0 0 20px var(--accent); }
	.orb.active .ring { border-color: var(--accent); animation: spin 1.5s linear infinite; opacity: 0.8; }
	
	
	@keyframes morph1 {
		0% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
		33% { border-radius: 72% 28% 48% 52% / 28% 71% 29% 72%; }
		66% { border-radius: 26% 74% 33% 67% / 68% 34% 66% 32%; }
		100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
	}
	@keyframes morph2 {
		0% { border-radius: 64% 36% 27% 73% / 55% 58% 42% 45%; }
		33% { border-radius: 35% 65% 58% 42% / 37% 33% 67% 63%; }
		66% { border-radius: 58% 42% 75% 25% / 66% 41% 59% 34%; }
		100% { border-radius: 64% 36% 27% 73% / 55% 58% 42% 45%; }
	}
	@keyframes spin { 100% { transform: rotate(360deg); } }
	@keyframes spin-reverse { 100% { transform: rotate(-360deg); } }
	@keyframes pulse-core { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
	@keyframes pulse-core-fast { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.25); opacity: 1; } }
	@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

	/* UNIQUE ELO DESIGNS */
	
	/* Initiate: Sharp, Cyberpunk Square */
	:global(:root[data-theme='initiate']) .orb .core { border-radius: 2px; }
	:global(:root[data-theme='initiate']) .orb .ring { border-radius: 2px; border-style: dotted; border-width: 2px; }
	
	/* Master: Thick, Smooth Water Rings */
	:global(:root[data-theme='master']) .orb .ring { border-width: 3px; border-style: double; box-shadow: inset 0 0 10px rgba(0, 114, 198, 0.3); }
	
	/* Catalyst: Toxic Squircle */
	:global(:root[data-theme='catalyst']) .orb .core { border-radius: 30%; box-shadow: 0 0 20px #a3e635, inset 0 0 10px #fff; }
	:global(:root[data-theme='catalyst']) .orb .ring { border-radius: 30%; border-style: dashed; }
	
	/* God Mode: Sacred Geometry (Diamond/Octagon) */
	:global(:root[data-theme='god-mode']) .orb .core { border-radius: 0%; transform: rotate(45deg) scale(0.8); background: linear-gradient(135deg, #ffd700, #b8860b); box-shadow: 0 0 25px #ffd700; }
	:global(:root[data-theme='god-mode']) .orb.idle .core { animation: pulse-core-diamond 4s ease-in-out infinite; }
	:global(:root[data-theme='god-mode']) .orb.active .core { animation: pulse-core-fast-diamond 0.6s ease-in-out infinite; box-shadow: 0 0 35px #ffd700; }
	:global(:root[data-theme='god-mode']) .orb.thinking .core { animation: pulse-core-diamond 8s ease-in-out infinite; box-shadow: 0 0 10px #ffd700; }
	:global(:root[data-theme='god-mode']) .orb .ring { border-radius: 0%; border-width: 1px; border-color: #ffd700; }
	
	@keyframes pulse-core-diamond { 0%, 100% { transform: rotate(45deg) scale(0.8); opacity: 0.8; } 50% { transform: rotate(45deg) scale(0.9); opacity: 1; } }
	@keyframes pulse-core-fast-diamond { 0%, 100% { transform: rotate(45deg) scale(0.8); opacity: 0.8; } 50% { transform: rotate(45deg) scale(1.05); opacity: 1; } }

	
	.mini-timer { 
		display: flex; 
		align-items: center; 
		position: relative;
		gap: 8px; 
		padding: 6px 14px; 
		margin-bottom: 8px;
		margin-right: 6px;
		background: var(--surface-panel-ai, var(--surface-panel)); 
		backdrop-filter: var(--glass-filter, blur(24px)); 
		-webkit-backdrop-filter: var(--glass-filter, blur(24px)); 
		border: 1px solid var(--accent); 
		border-radius: 99px; /* full rounded pill */
		box-shadow: 0 8px 24px rgba(0,0,0,0.25);
		color: var(--text-primary);
		cursor: pointer;
		pointer-events: auto;
		transform-origin: bottom right;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		z-index: 2;
	}
	
	/* Comic book tail pointing to the orb */
	.mini-timer::after {
		content: '';
		position: absolute;
		bottom: -6px;
		right: 16px;
		width: 10px;
		height: 10px;
		background: var(--surface-panel-ai, var(--surface-panel));
		border-bottom: 1px solid var(--accent);
		border-right: 1px solid var(--accent);
		transform: rotate(45deg);
		border-bottom-right-radius: 2px;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		z-index: -1;
	}

	:root[data-clear-glass="true"] .mini-timer,
	:root[data-clear-glass="true"] .mini-timer::after { 
		background: var(--surface-canvas) !important; 
	}
	
	:root[data-clear-glass="true"] .mini-timer {
		border: 1px solid var(--accent) !important; 
		backdrop-filter: none !important; 
		-webkit-backdrop-filter: none !important;
	}

	.mini-timer.break { border-color: var(--success); }
	.mini-timer.break::after { border-color: var(--success); }
	
	.mini-timer:hover {
		padding: 8px 18px;
		gap: 14px;
		transform: scale(1.08) translateY(-4px);
		box-shadow: 0 16px 32px color-mix(in srgb, var(--accent) 20%, transparent);
		border-radius: 24px; /* rounds out on hover */
	}
	
	.mini-timer:hover::after {
		bottom: -5px; /* adjust tail position slightly on hover */
		right: 20px;
	}
	
	.mini-timer.break:hover {
		box-shadow: 0 16px 32px color-mix(in srgb, var(--success) 20%, transparent);
	}

	.mini-time { font-family: monospace; font-size: 1.05rem; font-weight: 700; letter-spacing: 1px; color: var(--accent); transition: font-size 0.3s; }
	.mini-timer.break .mini-time { color: var(--success); }
	
	.mini-timer:hover .mini-time { font-size: 1.15rem; }
	
	.mini-phase { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; opacity: 0.8; }
	
	.mini-pause { 
		width: 0; 
		height: 0; 
		opacity: 0;
		padding: 0;
		overflow: hidden;
		border-radius: 50%; 
		border: none; 
		background: color-mix(in srgb, var(--text-primary) 15%, transparent); 
		color: var(--text-primary); 
		display: grid; 
		place-items: center; 
		cursor: pointer; 
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
	}
	
	.mini-timer:hover .mini-pause {
		width: 30px;
		height: 30px;
		opacity: 1;
	}
	
	.mini-pause:hover { background: color-mix(in srgb, var(--text-primary) 25%, transparent); transform: scale(1.15); }

	.chat-bubble :global(p), .mentor-bubble :global(p) { margin: 0 0 0.5rem 0; }
	.chat-bubble :global(p:last-child), .mentor-bubble :global(p:last-child) { margin-bottom: 0; }
	.chat-bubble :global(strong), .mentor-bubble :global(strong) { color: var(--accent); font-weight: 700; }
	.chat-bubble :global(ul), .mentor-bubble :global(ul) { margin: 0.5rem 0 0.5rem 1.2rem; padding: 0; }
	.chat-bubble :global(li), .mentor-bubble :global(li) { margin-bottom: 0.2rem; }
</style>
