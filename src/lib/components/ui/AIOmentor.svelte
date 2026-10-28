<script lang="ts">
	import { renderMarkdownSync } from '$lib/services/markdown';
	import { tracker, logBulkQuestions, logMockTestScore, addFlashcard, celebration, addTodoSubsteps, transferTodosToPlanner, autoBalancePlannerTasks } from '$lib/stores/tracker';
	import { aiMentorRequest, aiOrbFlowEvent, type DocumentContext } from '$lib/stores/aiMentor';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { globalTimer } from '$lib/stores/timerState';
	import { formatClock, addDaysKey, todayKey } from '$lib/state/dates';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { onMount, tick } from 'svelte';
	import NavIcon from '../NavIcon.svelte'; // Assuming NavIcon exists
	import { buildAcademicConstraintPrompt } from '$lib/services/aiContext';
	import { getAIPlannerBalance } from '$lib/services/ai';
	
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
	let typingStatus = '';
	let chatContainer: HTMLElement;

	// Active Attached Document State
	let activeDoc: DocumentContext | null = null;
	let lastHandledReqId: string | null = null;
	let lastHandledFlowId: string | null = null;

	// Flow Line & Gyro Spin Transition State
	interface ActiveFlow {
		id: string;
		fromX: number;
		fromY: number;
		toX: number;
		toY: number;
		pathD: string;
		emoji?: string;
	}

	let activeFlow: ActiveFlow | null = null;
	let isSpinning = false;
	let openChatTimer: any = null;
	let flowMergeTimer: any = null;
	let flowCleanTimer: any = null;

	let orbButtonEl: HTMLElement | null = null;
	let rafId: number | null = null;

	let rot1 = 0;
	let rot2 = 0;
	let rot3 = 0;
	let rot4 = 0;

	// Speed state machine: 1.0 is normal speed
	let speedMult = 1.0;
	let animState: 'idle' | 'accelerating' | 'holding' | 'retarding' = 'idle';
	let stateStartTime = 0;
	const BOOST_SPEED = 14.0; // Fast spin: ~2 full revolutions/sec (clearly and unmistakably fast!)
	const ACCEL_DURATION = 350; // 0.35s acceleration ramp into fast spin
	const HOLD_DURATION = 1000; // Hold fast spin for 1 full second
	const RETARD_DURATION = 1000; // 1s strictly uniform (linear) retardation back to normal speed (1.0x)

	function triggerSpeedBurst() {
		animState = 'accelerating';
		stateStartTime = performance.now();
		isSpinning = true;
	}

	let lastFrameTime = 0;

	function orbLoop(now: number) {
		if (!lastFrameTime) lastFrameTime = now;
		const dt = Math.min((now - lastFrameTime) / 1000, 0.1); // seconds
		lastFrameTime = now;

		if (animState === 'accelerating') {
			const elapsed = now - stateStartTime;
			const p = Math.min(elapsed / ACCEL_DURATION, 1);
			speedMult = 1.0 + (BOOST_SPEED - 1.0) * p;
			if (p >= 1) {
				speedMult = BOOST_SPEED;
				animState = 'holding';
				stateStartTime = now;
			}
		} else if (animState === 'holding') {
			speedMult = BOOST_SPEED;
			const elapsed = now - stateStartTime;
			if (elapsed >= HOLD_DURATION) {
				animState = 'retarding';
				stateStartTime = now;
			}
		} else if (animState === 'retarding') {
			const elapsed = now - stateStartTime;
			const p = Math.min(elapsed / RETARD_DURATION, 1);
			// Strictly uniform (linear) retardation back to normal speed (1.0)
			// dv/dt = constant
			speedMult = BOOST_SPEED - (BOOST_SPEED - 1.0) * p;
			if (p >= 1) {
				speedMult = 1.0;
				animState = 'idle';
				isSpinning = false;
			}
		} else {
			speedMult = 1.0;
		}

		// Update continuous rotation angles
		// Normal rates: r1 (360/7 = 51.43 deg/s), r2 (-40 deg/s), r3 (30 deg/s), r4 (-20 deg/s)
		rot1 = (rot1 + 51.43 * speedMult * dt) % 360;
		rot2 = (rot2 - 40.0 * speedMult * dt) % 360;
		rot3 = (rot3 + 30.0 * speedMult * dt) % 360;
		rot4 = (rot4 - 20.0 * speedMult * dt) % 360;

		if (orbButtonEl) {
			orbButtonEl.style.setProperty('--r1-rot', `${rot1.toFixed(2)}deg`);
			orbButtonEl.style.setProperty('--r2-rot', `${rot2.toFixed(2)}deg`);
			orbButtonEl.style.setProperty('--r3-rot', `${rot3.toFixed(2)}deg`);
			orbButtonEl.style.setProperty('--r4-rot', `${rot4.toFixed(2)}deg`);
		}

		rafId = requestAnimationFrame(orbLoop);
	}

	function computeFlowPath(x0: number, y0: number, x1: number, y1: number): string {
		const dx = x1 - x0;
		const dy = y1 - y0;
		// Bow outward to the left to form a sweeping, aerodynamic conduit curve
		const bow = Math.max(Math.abs(dx) * 0.22, 55);
		const cp1x = x0 - bow;
		const cp1y = y0 + dy * 0.35;
		const cp2x = x1 - bow * 0.35;
		const cp2y = y1 - dy * 0.15;
		return `M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
	}

	$: if ($aiOrbFlowEvent && $aiOrbFlowEvent.id !== lastHandledFlowId) {
		const ev = $aiOrbFlowEvent;
		lastHandledFlowId = ev.id;
		activeFlow = {
			id: ev.id,
			fromX: ev.fromX,
			fromY: ev.fromY,
			toX: ev.toX,
			toY: ev.toY,
			pathD: computeFlowPath(ev.fromX, ev.fromY, ev.toX, ev.toY),
			emoji: ev.emoji
		};

		clearTimeout(flowMergeTimer);
		clearTimeout(flowCleanTimer);

		// Line flows across screen for 1000ms.
		// When the line merges with the orb (at ~980-1000ms):
		// Accelerate rotation to fast spin (~14x speed), hold for 1s, then uniformly retard to normal speed.
		flowMergeTimer = setTimeout(() => {
			triggerSpeedBurst();
		}, 980);

		// After full conduit dissipation (1200ms), remove activeFlow SVG element
		flowCleanTimer = setTimeout(() => {
			if (activeFlow?.id === ev.id) {
				activeFlow = null;
				aiOrbFlowEvent.set(null);
			}
		}, 1200);
	}

	$: if ($aiMentorRequest && $aiMentorRequest.id !== lastHandledReqId) {
		const req = $aiMentorRequest;
		lastHandledReqId = req.id;
		clearTimeout(openChatTimer);

		// When energy is flowing into the orb, open the mentor drawer exactly as the front tip hits the orb (1000ms)
		const delayOpen = (activeFlow || $aiOrbFlowEvent) ? 1000 : 0;

		openChatTimer = setTimeout(() => {
			if (req.doc) {
				activeDoc = req.doc;
				chatOpen = true;
				orbState = 'idle';
				showMessage = false;
				chatHistory = [
					...chatHistory,
					{
						role: 'ai',
						text: `Attached **${req.doc.fileName}** (${req.doc.subject}). You can generate flashcards, quiz yourself, extract formulas, or ask anything about this document! 📚`
					}
				];

				if (req.prompt) {
					if (req.autoSend) {
						chatHistory = [...chatHistory, { role: 'user', text: req.prompt }];
						isTyping = true;
						typingStatus = req.typingStatus || 'Reading document...';
						scrollToBottom();

						if (req.textPromise) {
							req.textPromise
								.then((text) => {
									if (activeDoc) {
										activeDoc = { ...activeDoc, text, status: 'ready' };
									}
									typingStatus = 'Analyzing formulas & writing cheatsheet...';
									dispatchGeminiQuery();
								})
								.catch((err) => {
									console.error('Text extraction failed:', err);
									if (activeDoc) {
										activeDoc = { ...activeDoc, status: 'ready' };
									}
									dispatchGeminiQuery();
								});
						} else {
							dispatchGeminiQuery();
						}
					} else {
						chatInput = req.prompt;
						scrollToBottom();
					}
				} else {
					scrollToBottom();
				}
			} else if (req.prompt) {
				chatOpen = true;
				orbState = 'idle';
				if (req.autoSend) {
					chatHistory = [...chatHistory, { role: 'user', text: req.prompt }];
					isTyping = true;
					typingStatus = req.typingStatus || 'Thinking...';
					scrollToBottom();
					dispatchGeminiQuery();
				} else {
					chatInput = req.prompt;
					scrollToBottom();
				}
			}
		}, delayOpen);
	}

	function detachDoc() {
		activeDoc = null;
		celebration.set('Document detached from AI Mentor');
	}

	async function sendDocPrompt(promptText: string) {
		chatInput = promptText;
		await sendMessage();
	}
	
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
	
	let initTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if ($tracker.gamification?.elo) {
			lastElo = { ...($tracker.gamification?.elo || lastElo) };
		}
		
		initTimer = setTimeout(() => {
			triggerMessage("I'm here. Let's conquer JEE.", 'idle', 4000);
		}, 1000);

		rafId = requestAnimationFrame(orbLoop);
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			if (initTimer) clearTimeout(initTimer);
			if (timeout) clearTimeout(timeout);
			clearTimeout(openChatTimer);
			clearTimeout(flowMergeTimer);
			clearTimeout(flowCleanTimer);
		};
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

	function closeChat(e?: Event) {
		if (e) {
			e.stopPropagation();
			e.preventDefault();
		}
		chatOpen = false;
		orbState = 'idle';
		isSpinning = false;
		activeFlow = null;
		aiOrbFlowEvent.set(null);
		clearTimeout(openChatTimer);
		clearTimeout(flowMergeTimer);
		clearTimeout(flowCleanTimer);
		animState = 'idle';
		speedMult = 1.0;
	}

	function handleOrbClick(e?: Event) {
		if (e) {
			e.stopPropagation();
			e.preventDefault();
		}
		if (chatOpen) {
			closeChat(e);
		} else {
			showMessage = false;
			chatOpen = true;
			orbState = 'idle';
			triggerSpeedBurst();
		}
	}

	const scrollToBottom = async () => {
		await tick();
		if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
	};

	async function sendMessage() {
		if (!chatInput.trim() || isTyping) return;
		
		const userMsg = chatInput.trim();
		chatHistory = [...chatHistory, { role: 'user', text: userMsg }];
		chatInput = '';
		scrollToBottom();
		await dispatchGeminiQuery();
	}

	async function dispatchGeminiQuery() {
		isTyping = true;
		orbState = 'idle';
		scrollToBottom();

		const academicConstraints = buildAcademicConstraintPrompt($tracker);
		let systemInstruction = `You are the BTracker AI Mentor. 
Current Elo: P: ${$tracker.gamification?.elo?.P ?? 1200}, C: ${$tracker.gamification?.elo?.C ?? 1200}, M: ${$tracker.gamification?.elo?.M ?? 1200}.
${academicConstraints}
CRITICAL INSTRUCTIONS:
1. KEEP IT SHORT! Answer in 1-2 brief sentences max unless explicitly asked for a summary, formula list, or flashcards. NO FLUFF.
2. Restrict all concepts, chapter advice, difficulty, and problem discussions strictly to the student's grade level and tickmarked checklist chapters. Never assume or bring up unticked chapters.
3. Format your text using clean Markdown. When writing math formulas or symbols (integrals, fractions, derivatives, vectors, greek symbols), ALWAYS wrap them in LaTeX dollar signs like $ \\int f(x) dx $ or $ \\frac{a}{b} $ or $$ \\int_a^b f(x) dx $$ so KaTeX renders them properly.
4. If the user asks to start a focus timer or stopwatch, append EXACTLY this JSON block at the end of your message: <cmd>{"action": "startTimer", "minutes": 25, "subject": "P", "chapter": 1, "mode": "timer"}</cmd> (subject must be 'P', 'C', or 'M'. Mode can be "timer" or "stopwatch").
5. If the user asks to log questions/exercises (e.g. "I did ex 1"), append: <cmd>{"action": "logQuestions", "subject": "P", "chapter": 1, "count": 20, "name": "Ex 1"}</cmd>.
6. If the user asks to log a mock test (e.g. "scored 180 out of 300"), append: <cmd>{"action": "logMockTest", "score": 180, "total": 300, "subjectScores": {"P": {"c": 15, "w": 5, "s": 60}, "C": {"c": 15, "w": 5, "s": 60}, "M": {"c": 15, "w": 5, "s": 60}}}</cmd>. Estimate subject scores if they don't provide them.
7. If the user asks to integrate or add substeps (e.g. Ex 1, Ex 2) to their parsed syllabus / btest / to-do items, append EXACTLY this JSON block: <cmd>{"action": "addTodoSubsteps", "source": "btest", "substeps": ["Ex 1", "Ex 2"]}</cmd> (substeps can be customized if they asked for specific ones).
8. If the user asks to add/transfer to-do list items to planner and/or auto-plan them, append EXACTLY this JSON block: <cmd>{"action": "transferTodosToPlanner", "autoPlan": true}</cmd>.`;

		if (activeDoc && activeDoc.text) {
			systemInstruction += `\n\nATTACHED STUDY DOCUMENT:
File: "${activeDoc.fileName}" (Subject: ${activeDoc.subject})
--- DOCUMENT EXCERPT ---
${activeDoc.text.slice(0, 14000)}
--- END DOCUMENT EXCERPT ---

7. When the user asks to generate flashcards or active recall cards from the attached document, generate 3 to 5 high-yield cards and append EXACTLY this JSON block at the end of your message:
<cmd>{"action": "addFlashcards", "cards": [{"front": "Front question or conceptual challenge", "back": "Clear concise answer / formula", "subject": "${activeDoc.subject || 'P'}", "chapter": "${activeDoc.fileName.replace(/\.[^/.]+$/, '')}"}]}</cmd>
Ensure the cards test high-yield definitions, core derivations, equations, and tricky exceptions from this document.`;
		}

		const history = chatHistory.map(msg => ({
			role: msg.role === 'ai' ? 'model' : 'user',
			parts: [{ text: msg.text }]
		}));

		try {
			const res = await fetch('/api/gemini', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ history, systemInstruction, stream: true })
			});
			
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: 'AI request failed' }));
				chatHistory = [...chatHistory, { role: 'ai', text: `Error: ${err.error || res.statusText}` }];
				isTyping = false;
				scrollToBottom();
				return;
			}

			// Add initial streaming AI bubble
			chatHistory = [...chatHistory, { role: 'ai', text: '' }];
			const aiIndex = chatHistory.length - 1;
			let text = '';

			if (res.body) {
				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					const chunk = decoder.decode(value, { stream: true });
					if (chunk) {
						text += chunk;
						// Clean command tag fragments while streaming so raw commands don't flash
						chatHistory[aiIndex].text = text.replace(/<cmd>.*?<\/cmd>/g, '').replace(/<cmd>.*$/g, '');
						scrollToBottom();
					}
				}
			} else {
				const data = await res.json();
				text = data.text || '';
			}

			if (text) {
				
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
						} else if (cmd.action === 'addFlashcards' && Array.isArray(cmd.cards)) {
							let addedCount = 0;
							for (const card of cmd.cards) {
								if (card && card.front && card.back) {
									addFlashcard({
										front: card.front,
										back: card.back,
										subject: card.subject || activeDoc?.subject || 'P',
										chapter: card.chapter || activeDoc?.fileName?.replace(/\.[^/.]+$/, '') || 'Study Notes'
									});
									addedCount++;
								}
							}
							if (addedCount > 0) {
								celebration.set(`⚡ ${addedCount} Flashcards saved to Active Recall deck!`);
							}
						} else if (cmd.action === 'addTodoSubsteps') {
							const substeps = Array.isArray(cmd.substeps) && cmd.substeps.length > 0 ? cmd.substeps : ['Ex 1', 'Ex 2'];
							const source = cmd.source || 'btest';
							const updated = addTodoSubsteps(source, substeps);
							celebration.set(`✨ Added substeps (${substeps.join(', ')}) to ${updated} to-do items!`);
						} else if (cmd.action === 'transferTodosToPlanner') {
							const transferred = transferTodosToPlanner();
							if (cmd.autoPlan) {
								const today = todayKey();
								const elo = $tracker.gamification?.elo || { P: 300, C: 300, M: 300 };
								const days = [];
								for (let i = 0; i < 7; i++) {
									days.push(addDaysKey(today, i));
								}
								const isClassTask = (t: any) =>
									Boolean(t.isClass === true || t.kind === 'class' || t.locked === true || (t.title && t.title.toLowerCase().startsWith('[class]')));
								const scheduledClasses = ($tracker.h || [])
									.filter((t) => isClassTask(t) && t.due)
									.map((t) => ({ date: t.due || '', subject: (t.s || '') as string, topic: t.title || 'Lecture' }));
								const pendingTasks = ($tracker.h || []).filter(
									(t) => !t.done && !isClassTask(t)
								);
								if (pendingTasks.length === 0) {
									celebration.set(`🎯 Transferred ${transferred} tasks to daily planner!`);
									return;
								}
								const taskInput = pendingTasks.map((t) => ({
									id: t.id,
									text: (t.title || t.text || '') as string,
									sub: (t.s || t.sub || '') as string,
									ch: t.ch,
									subs: (t.subs || []).map((s) => typeof s === 'string' ? s : (s as any).title)
								}));
								const constraint = buildAcademicConstraintPrompt($tracker);
								getAIPlannerBalance(taskInput, days, elo, constraint, scheduledClasses)
									.then(async (map) => {
										await autoBalancePlannerTasks(map);
										celebration.set(`🎯 Transferred ${transferred} tasks and auto-balanced schedule!`);
									})
									.catch((err) => console.error('Auto plan error:', err));
							} else {
								celebration.set(`🎯 Transferred ${transferred} tasks to daily planner!`);
							}
						}
					} catch (e) {
						console.error("AI Command Error:", e);
					}
				}
				
				// Remove commands from visible text
				chatHistory[aiIndex].text = text.replace(/<cmd>.*?<\/cmd>/g, '').trim();
			} else {
				chatHistory[aiIndex].text = "I'm sorry, I couldn't process that right now.";
			}
		} catch (err) {
			chatHistory = [...chatHistory, { role: 'ai', text: "Network error. Please try again." }];
		} finally {
			isTyping = false;
			typingStatus = '';
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

	$: dynamicIslandShowingTime = Boolean(($globalTimer.running || $globalTimer.sessionStarted) && $page.url.pathname !== '/focus');
</script>

{#if activeFlow}
	<svg class="orb-flow-svg">
		<defs>
			<linearGradient id="orbFlowGradient" gradientUnits="userSpaceOnUse" x1={activeFlow.fromX} y1={activeFlow.fromY} x2={activeFlow.toX} y2={activeFlow.toY}>
				<stop offset="0%" stop-color="var(--accent, #6d5dfc)" stop-opacity="0.25" />
				<stop offset="60%" stop-color="var(--accent, #6d5dfc)" stop-opacity="0.95" />
				<stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
			</linearGradient>
			<filter id="orbFlowGlow" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="3" result="glow" />
				<feMerge>
					<feMergeNode in="glow" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- Flowing energy line from button into orb (uniform linear velocity) -->
		<path
			class="orb-flow-path"
			pathLength="1000"
			d={activeFlow.pathD}
			fill="none"
			stroke="url(#orbFlowGradient)"
			stroke-width="3"
			stroke-linecap="round"
			filter="url(#orbFlowGlow)"
		/>

		<!-- Flowing energy photon head (synchronized at exact same uniform velocity) -->
		<circle
			class="orb-flow-particle"
			r="4"
			fill="#ffffff"
			filter="url(#orbFlowGlow)"
		>
			<animateMotion
				path={activeFlow.pathD}
				dur="1.0s"
				calcMode="paced"
				fill="freeze"
				repeatCount="1"
			/>
			<animate
				attributeName="opacity"
				values="0;1;1;0"
				keyTimes="0;0.05;0.95;1"
				dur="1.0s"
				fill="freeze"
			/>
		</circle>
	</svg>
{/if}

<div class="mentor-wrapper" class:open={chatOpen}>
	{#if chatOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="chat-backdrop"
			role="button"
			tabindex="-1"
			aria-label="Close chat"
			on:click|stopPropagation|preventDefault={closeChat}
		></div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="chat-panel"
			on:click|stopPropagation
			in:fly={{ y: 16, duration: 240, easing: cubicOut }}
			out:fade={{ duration: 160 }}
		>
			<div class="chat-header">
				<div class="header-title">
					<div class="mini-orb"></div>
					<h3>AI Mentor</h3>
				</div>
				<button
					type="button"
					class="close-btn"
					aria-label="Close AI Mentor"
					on:click|stopPropagation|preventDefault={closeChat}
				>×</button>
			</div>

			{#if activeDoc}
				<div class="active-doc-badge" class:extracting={activeDoc.status === 'extracting'}>
					<div class="doc-info">
						<NavIcon name="book" size={13} />
						<span class="doc-sec">{activeDoc.subject}</span>
						<span class="doc-name" title={activeDoc.fileName}>{activeDoc.fileName}</span>
						{#if activeDoc.status === 'extracting'}
							<span class="doc-extract-pill">
								Reading...
							</span>
						{/if}
					</div>
					<button type="button" class="doc-detach-btn" on:click={detachDoc} title="Detach document">
						<NavIcon name="x" size={12} />
					</button>
				</div>
			{/if}
			
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
						<div class="typing-dots">
							<span class="dot"></span><span class="dot"></span><span class="dot"></span>
						</div>
						{#if typingStatus}
							<span class="typing-status-text">{typingStatus}</span>
						{/if}
					</div>
				{/if}
			</div>

			<div class="shortcuts-row" aria-label="Quick Actions">
				{#if activeDoc}
					<button type="button" class="action-pill flashcard-pill" on:click={() => sendDocPrompt('Generate 5 high-yield Active Recall flashcards based on the attached document. Include questions testing core definitions, formulas, and common traps. For each flashcard, format using the addFlashcards command.')}>
						<NavIcon name="sparkles" size={12} /> ⚡ 5 Flashcards
					</button>
					<button type="button" class="action-pill quiz-pill" on:click={() => sendDocPrompt('Give me a quick 3-question conceptual quiz based on this document with multiple choice options (A, B, C, D). Don\'t give answers yet — let me solve them first!')}>
						<NavIcon name="target" size={12} /> 🎯 Quiz Me (3 Qs)
					</button>
					<button type="button" class="action-pill formula-pill" on:click={() => sendDocPrompt('Extract all the key formulas, definitions, and high-yield exam traps from this document into a concise cheatsheet.')}>
						<NavIcon name="bookmark" size={12} /> 🔖 Key Formulas
					</button>
					<button type="button" class="action-pill" on:click={() => sendDocPrompt('Summarize the core takeaways and main concepts of this document in 3-4 bullet points.')}>
						<NavIcon name="bulb" size={12} /> 💡 Summarize
					</button>
				{:else}
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
				{/if}
			</div>

			<div class="chat-input-area">
				<input 
					type="text" 
					placeholder={activeDoc ? `Ask doubt or prompt for ${activeDoc.fileName}...` : "Ask a doubt or request analysis..."} 
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

{#if $globalTimer.running && $page.url.pathname !== '/focus' && !dynamicIslandShowingTime}
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

	<button
		type="button"
		bind:this={orbButtonEl}
		class="orb {orbState}"
		class:spinning={isSpinning}
		aria-label="AI Mentor Assistant"
		on:click|stopPropagation={handleOrbClick}
	>
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
		z-index: 95; 
		display: flex; 
		flex-direction: column; 
		align-items: flex-end; 
		gap: 12px; 
		pointer-events: none; 
		transition: bottom 0.3s;
	}

	.mentor-wrapper.open {
		z-index: 100005 !important;
	}

	:global(body[data-sheet-open='true']) .mentor-wrapper {
		display: none !important;
	}
	
	.chat-backdrop {
		display: none;
	}

	@media (max-width: 768px) {
		.chat-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.60);
			backdrop-filter: blur(28px) saturate(190%);
			-webkit-backdrop-filter: blur(28px) saturate(190%);
			z-index: 100004 !important;
			pointer-events: auto;
		}

		.mentor-wrapper {
			/* Push above the mobile bottom nav */
			bottom: calc(max(env(safe-area-inset-bottom), 16px) + 78px);
			right: 16px;
			z-index: 100005 !important;
		}

		.chat-panel {
			position: fixed !important;
			left: 50% !important;
			transform: translateX(-50%) !important;
			transform-origin: bottom center !important;
			bottom: calc(max(env(safe-area-inset-bottom), 16px) + 82px) !important;
			width: min(calc(100vw - 24px), 420px) !important;
			max-height: min(520px, calc(100dvh - max(env(safe-area-inset-top), 24px) - 160px)) !important;
			height: 500px !important;
			border-radius: 20px !important;
			box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.14) !important;
			z-index: 100005 !important;
			background: var(--surface-popup, rgba(18, 16, 32, 0.98)) !important;
			backdrop-filter: blur(36px) saturate(210%) !important;
			-webkit-backdrop-filter: blur(36px) saturate(210%) !important;
		}

		.mentor-bubble {
			max-width: min(calc(100vw - 32px), 320px);
			background: var(--surface-popup, rgba(18, 16, 32, 0.98)) !important;
			backdrop-filter: blur(24px) saturate(190%) !important;
			-webkit-backdrop-filter: blur(24px) saturate(190%) !important;
		}
	}
	
	/* CHAT PANEL */
	.chat-panel { 
		width: 380px; 
		height: 520px;
		z-index: 100005;
		background: var(--surface-popup, rgba(18, 16, 32, 0.96)); 
		backdrop-filter: blur(36px) saturate(210%); 
		-webkit-backdrop-filter: blur(36px) saturate(210%); 
		border: 1px solid var(--surface-popup-border, color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16))); 
		border-radius: 20px; 
		box-shadow: 0 24px 64px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14); 
		pointer-events: auto; 
		display: flex; 
		flex-direction: column;
		overflow: hidden;
		transform-origin: bottom right;
	}
	:root[data-clear-glass="true"] .chat-panel { background: var(--surface-popup, rgba(18, 16, 32, 0.96)) !important; border: 1px solid var(--surface-popup-border, var(--border-subtle)) !important; }

	:global(:root[data-theme='light']) .chat-panel,
	:global(:root[data-theme='notion']) .chat-panel,
	:global(:root[data-theme='duolingo']) .chat-panel,
	:global(:root[data-theme='anki']) .chat-panel,
	:global(:root[data-theme='master']) .chat-panel {
		background: var(--surface-popup, rgba(255, 255, 255, 0.98)) !important;
		border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(0, 0, 0, 0.08)) !important;
		box-shadow: 0 24px 64px -8px rgba(44, 37, 92, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.95) !important;
	}

	:global(:root[data-theme='light']) .chat-header,
	:global(:root[data-theme='notion']) .chat-header,
	:global(:root[data-theme='duolingo']) .chat-header,
	:global(:root[data-theme='anki']) .chat-header,
	:global(:root[data-theme='master']) .chat-header,
	:global(:root[data-theme='light']) .chat-input-area,
	:global(:root[data-theme='notion']) .chat-input-area,
	:global(:root[data-theme='duolingo']) .chat-input-area,
	:global(:root[data-theme='anki']) .chat-input-area,
	:global(:root[data-theme='master']) .chat-input-area {
		background: #ffffff !important;
		border-color: color-mix(in srgb, var(--border-subtle) 80%, rgba(0, 0, 0, 0.08)) !important;
	}

	:global(:root[data-theme='light']) .mentor-bubble,
	:global(:root[data-theme='notion']) .mentor-bubble,
	:global(:root[data-theme='duolingo']) .mentor-bubble,
	:global(:root[data-theme='anki']) .mentor-bubble,
	:global(:root[data-theme='master']) .mentor-bubble {
		background: var(--surface-popup, rgba(255, 255, 255, 0.98)) !important;
		border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(0, 0, 0, 0.08)) !important;
		box-shadow: 0 8px 24px rgba(44, 37, 92, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
		color: var(--text-primary) !important;
	}

	.chat-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-popup-solid, var(--surface-subtle, rgba(18, 16, 32, 0.98))); }
	.header-title { display: flex; align-items: center; gap: 10px; }
	.header-title h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
	.close-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: all 0.15s ease; display: grid; place-items: center; }
	.close-btn:hover { color: var(--text-primary); background: color-mix(in srgb, var(--text-primary) 12%, transparent); }

	.active-doc-badge {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 6px 14px;
		background: color-mix(in srgb, var(--accent) 12%, var(--surface-subtle));
		border-bottom: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border-subtle));
		font-size: 0.72rem;
		transition: background 0.2s ease, border-color 0.2s ease;
	}
	.active-doc-badge.extracting {
		background: color-mix(in srgb, var(--warning, #f59e0b) 14%, var(--surface-subtle));
		border-bottom-color: color-mix(in srgb, var(--warning, #f59e0b) 35%, var(--border-subtle));
	}
	.doc-extract-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--warning, #f59e0b);
		background: color-mix(in srgb, var(--warning, #f59e0b) 16%, transparent);
		padding: 1px 6px;
		border-radius: 4px;
		margin-left: 4px;
	}
	.spin {
		display: inline-flex;
		animation: spin 1s linear infinite;
	}
	.doc-info {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow: hidden;
		color: var(--text-primary);
	}
	.doc-sec {
		font-weight: 800;
		padding: 1px 6px;
		border-radius: 4px;
		background: color-mix(in srgb, var(--accent) 25%, transparent);
		color: var(--accent);
		font-size: 0.68rem;
		text-transform: uppercase;
	}
	.doc-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 230px;
	}
	.doc-detach-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		display: grid;
		place-items: center;
		padding: 2px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}
	.doc-detach-btn:hover {
		background: color-mix(in srgb, var(--danger) 15%, transparent);
		color: var(--danger);
	}

	.mini-orb { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }

	.chat-body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
	.chat-bubble { padding: 10px 14px; border-radius: 14px; font-size: 0.85rem; line-height: 1.5; max-width: 85%; word-wrap: break-word; }
	.chat-bubble.ai { background: color-mix(in srgb, var(--text-primary) 8%, var(--surface-popup-solid, #121020)) !important; color: var(--text-primary); border-bottom-left-radius: 4px; align-self: flex-start; }
	.chat-bubble.user { background: var(--accent); color: var(--accent-contrast, #fff); border-bottom-right-radius: 4px; align-self: flex-end; }
	.chat-bubble :global(.katex-display) { overflow-x: auto; overflow-y: hidden; margin: 0.5rem 0; padding: 0.2rem 0; max-width: 100%; }
	.chat-bubble :global(.katex) { font-size: 1.05em; }
	.mentor-bubble :global(.katex-display) { overflow-x: auto; overflow-y: hidden; margin: 0.4rem 0; padding: 0.1rem 0; max-width: 100%; }
	.mentor-bubble :global(.katex) { font-size: 1.05em; }
	
	.chat-bubble.typing { display: flex; align-items: center; gap: 6px; padding: 10px 14px; }
	.typing-dots { display: inline-flex; align-items: center; gap: 4px; }
	.typing-status-text {
		font-size: 0.74rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin-left: 4px;
	}
	.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-secondary); animation: bounce 1.4s infinite ease-in-out both; }
	.dot:nth-child(1) { animation-delay: -0.32s; }

	/* Flowing energy line from button into orb */
	.orb-flow-svg {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 100010;
		overflow: visible;
	}

	.orb-flow-path {
		animation: flow-beam-stream 1.2s linear forwards;
	}

	@keyframes flow-beam-stream {
		0% {
			stroke-dasharray: 200 1000;
			stroke-dashoffset: 200;
			opacity: 0;
		}
		3% {
			stroke-dasharray: 200 1000;
			stroke-dashoffset: 164;
			opacity: 1;
		}
		97% {
			stroke-dasharray: 200 1000;
			stroke-dashoffset: -964;
			opacity: 1;
		}
		100% {
			stroke-dasharray: 200 1000;
			stroke-dashoffset: -1000;
			opacity: 0;
		}
	}

	/* Fast Gyroscope visual enhancements when energy flows in or mentor activates */
	.orb.spinning {
		transform: scale(1.08);
	}

	.orb.spinning .core {
		box-shadow: 0 0 22px 5px var(--accent), inset 0 0 8px #ffffff;
		background: var(--accent);
	}

	.orb.spinning .r1 {
		border-top-color: var(--accent-contrast, #ffffff) !important;
		border-bottom-color: var(--accent) !important;
		box-shadow: 0 0 14px var(--accent);
		opacity: 1;
	}

	.orb.spinning .r2 {
		border-left-color: var(--accent-contrast, #ffffff) !important;
		box-shadow: 0 0 12px var(--accent);
		opacity: 0.95;
	}

	.orb.spinning .r3 {
		opacity: 0.9;
	}

	.orb.spinning .r4 {
		opacity: 0.85;
	}
	.shortcuts-row {
		display: flex;
		gap: 6px;
		padding: 8px 12px;
		overflow-x: auto;
		white-space: nowrap;
		scrollbar-width: none;
		border-top: 1px solid color-mix(in srgb, var(--border-subtle), transparent 40%);
		background: var(--surface-popup-solid, var(--surface-subtle, rgba(18, 16, 32, 0.95)));
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
	.action-pill.flashcard-pill { border-color: color-mix(in srgb, #f59e0b 50%, var(--border-subtle)); color: #fbbf24; }
	.action-pill.flashcard-pill:hover { background: color-mix(in srgb, #f59e0b 20%, transparent); border-color: #fbbf24; }
	.action-pill.quiz-pill { border-color: color-mix(in srgb, #38bdf8 50%, var(--border-subtle)); color: #38bdf8; }
	.action-pill.quiz-pill:hover { background: color-mix(in srgb, #38bdf8 20%, transparent); border-color: #38bdf8; }
	.action-pill.formula-pill { border-color: color-mix(in srgb, #a855f7 50%, var(--border-subtle)); color: #c084fc; }
	.action-pill.formula-pill:hover { background: color-mix(in srgb, #a855f7 20%, transparent); border-color: #c084fc; }

	.chat-input-area { padding: 12px; display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); background: var(--surface-popup-solid, var(--surface-subtle, rgba(18, 16, 32, 0.98))); }
	.chat-input-area input { flex: 1; background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: 99px; padding: 8px 16px; color: var(--text-primary); font-size: 0.85rem; outline: none; transition: border-color 0.2s; }
	.chat-input-area input:focus { border-color: var(--accent); }
	.send-btn { background: var(--accent); color: var(--accent-contrast, #fff); border: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
	.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.send-btn:not(:disabled):active { scale: 0.9; }

	/* BUBBLE & ORB */
	.mentor-bubble { background: var(--surface-popup, var(--surface-panel-ai, var(--surface-panel, rgba(18, 16, 32, 0.96)))); backdrop-filter: var(--glass-filter, blur(20px) saturate(180%)); -webkit-backdrop-filter: var(--glass-filter, blur(20px) saturate(180%)); border: 1px solid var(--surface-popup-border, var(--border-subtle)); padding: 0.75rem 1rem; border-radius: 12px; border-bottom-right-radius: 2px; color: var(--text-primary); font-size: 0.85rem; font-weight: 600; max-width: 360px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); pointer-events: auto; line-height: 1.5; }
	:root[data-clear-glass="true"] .mentor-bubble { background: var(--surface-popup, rgba(18, 16, 32, 0.96)) !important; border: 1px solid var(--border-subtle) !important; }

.orb { position: relative; width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; pointer-events: auto; padding: 0; outline: none; border-radius: 50%; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.25, 1); display: grid; place-items: center; }
	
	.orb:hover { scale: 1.25; }
	.orb:not(.thinking):hover .core { box-shadow: 0 0 30px var(--accent), inset 0 0 15px var(--accent) !important; background: var(--accent) !important; }
	.orb:not(.thinking):hover .ring { opacity: 1 !important; filter: drop-shadow(0 0 6px var(--accent)); }
	
	.orb .core { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 30%, transparent); border: 1px solid var(--accent); box-shadow: 0 0 15px var(--accent), inset 0 0 8px var(--accent); transition: all 0.6s ease; z-index: 3; }
	
	.orb .ring { 
		position: absolute; 
		inset: -2px; 
		border-radius: 50%; 
		border: 1px solid transparent; 
		opacity: 0.75; 
		z-index: 2; 
		transition: opacity 0.6s ease-out, border-color 0.6s ease, box-shadow 0.6s ease; 
		mix-blend-mode: screen; 
	}
	
	.orb .r1 { transform: rotate(var(--r1-rot, 0deg)); animation: morph1 5s ease-in-out infinite; border: 2px solid transparent; border-top-color: var(--accent); border-bottom-color: var(--accent); box-shadow: 0 0 8px var(--accent), inset 0 0 8px var(--accent); }
	.orb .r2 { transform: rotate(var(--r2-rot, 0deg)) scale(0.9); animation: morph2 6s ease-in-out infinite; border: 2px solid transparent; border-left-color: var(--accent); box-shadow: 0 0 6px var(--accent); }
	.orb .r3 { transform: rotate(var(--r3-rot, 0deg)) scale(1.15); animation: morph1 7s ease-in-out infinite reverse; border: 1px dashed var(--accent); opacity: 0.6; box-shadow: inset 0 0 6px var(--accent); }
	.orb .r4 { transform: rotate(var(--r4-rot, 0deg)) scale(0.75); border: 1px dotted var(--accent); opacity: 0.6; }
	
	.orb.idle .core { box-shadow: 0 0 14px var(--accent), inset 0 0 6px var(--accent); }
	
	.orb.alert .core { background: color-mix(in srgb, var(--danger) 50%, transparent); border-color: var(--danger); box-shadow: 0 0 20px var(--danger), inset 0 0 10px var(--danger); }
	.orb.alert .ring { border-color: var(--danger); box-shadow: 0 0 6px var(--danger), inset 0 0 6px var(--danger); }
	
	.orb.happy .core { background: color-mix(in srgb, var(--success) 50%, transparent); border-color: var(--success); box-shadow: 0 0 20px var(--success), inset 0 0 10px var(--success); }
	.orb.happy .ring { border-color: var(--success); box-shadow: 0 0 6px var(--success), inset 0 0 6px var(--success); }
	
	.orb.thinking { scale: 0.85; }
	.orb.thinking .ring { opacity: 1; border-color: var(--accent); border-width: 2px; border-style: solid; box-shadow: 0 0 10px var(--accent); }
	.orb.thinking .core { background: var(--accent); box-shadow: 0 0 10px var(--accent); }
	
	.orb.active .core { background: var(--accent); box-shadow: 0 0 18px var(--accent), inset 0 0 6px rgba(255, 255, 255, 0.4); }
	.orb.active .ring { border-color: var(--accent); opacity: 0.8; }
	
	
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
