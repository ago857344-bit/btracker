<script lang="ts">
	import { tracker } from '$lib/stores/tracker';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { globalTimer } from '$lib/stores/timerState';
	import { formatClock } from '$lib/state/dates';
	import { fade, fly, scale } from 'svelte/transition';
	import { onMount, tick } from 'svelte';
	import NavIcon from '../NavIcon.svelte'; // Assuming NavIcon exists
	
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

		const systemInstruction = `You are the BTracker AI Mentor, a highly intelligent JEE preparation assistant. 
The user is currently studying. 
Their current subject Elo ratings are: 
Physics: ${$tracker.gamification?.elo?.P ?? 1200}
Chemistry: ${$tracker.gamification?.elo?.C ?? 1200}
Maths: ${$tracker.gamification?.elo?.M ?? 1200}
Keep your answers brief, engaging, analytical, and highly motivating. Give direct actionable advice. Use plain text without markdown formatting.`;

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
				chatHistory = [...chatHistory, { role: 'ai', text: data.text }];
			} else {
				chatHistory = [...chatHistory, { role: 'ai', text: "I'm sorry, I couldn't process that right now." }];
			}
		} catch (err) {
			chatHistory = [...chatHistory, { role: 'ai', text: "Network error. Please try again." }];
		} finally {
			isTyping = false;
			orbState = 'thinking';
			scrollToBottom();
		}
	};
</script>

<div class="mentor-wrapper">
	{#if chatOpen}
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
						{msg.text}
					</div>
				{/each}
				{#if isTyping}
					<div class="chat-bubble ai typing">
						<span class="dot"></span><span class="dot"></span><span class="dot"></span>
					</div>
				{/if}
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
			{message}
		</div>
	{/if}
	

{#if $globalTimer.running && $page.url.pathname !== '/focus'}
	<div class="mini-timer" transition:fly={{ y: 20, duration: 300 }} class:break={$globalTimer.phase === 'break'} on:click={() => goto('/focus')}>
		<div class="mini-time">{formatClock($globalTimer.tab === 'stopwatch' ? $globalTimer.elapsed : $globalTimer.remaining)}</div>
		<div class="mini-phase">{$globalTimer.tab === 'stopwatch' ? 'SW' : $globalTimer.phase === 'break' ? 'BREAK' : 'FOCUS'}</div>
		<button class="mini-pause" aria-label="Pause" on:click|stopPropagation={$globalTimer.toggle}>
			<NavIcon name="pause" size={12} />
		</button>
	</div>
{/if}

	<button type="button" class="orb {orbState}" on:click={handleOrbClick}>
		<div class="core"></div>
		<div class="ring r1"></div>
		<div class="ring r2"></div>
		<div class="ring r3"></div>
		<div class="ring r4"></div>
	</button>
</div>

<style>
	.mentor-wrapper { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; pointer-events: none; }
	
	/* CHAT PANEL */
	.chat-panel { 
		width: 320px; 
		height: 440px;
		background: var(--surface-panel-ai, var(--surface-panel)); 
		backdrop-filter: var(--glass-filter, blur(24px) saturate(180%)); 
		-webkit-backdrop-filter: var(--glass-filter, blur(24px) saturate(180%)); 
		border: 1px solid var(--border-subtle); 
		border-radius: 16px; 
		box-shadow: 0 16px 40px rgba(0,0,0,0.2); 
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
	
	.chat-bubble.typing { display: flex; gap: 4px; padding: 12px 16px; }
	.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-secondary); animation: bounce 1.4s infinite ease-in-out both; }
	.dot:nth-child(1) { animation-delay: -0.32s; }
	.dot:nth-child(2) { animation-delay: -0.16s; }

	.chat-input-area { padding: 12px; display: flex; gap: 8px; border-top: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-panel), transparent 50%); }
	.chat-input-area input { flex: 1; background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: 99px; padding: 8px 16px; color: var(--text-primary); font-size: 0.85rem; outline: none; transition: border-color 0.2s; }
	.chat-input-area input:focus { border-color: var(--accent); }
	.send-btn { background: var(--accent); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
	.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.send-btn:not(:disabled):active { scale: 0.9; }

	/* BUBBLE & ORB */
	.mentor-bubble { background: var(--surface-panel-ai, var(--surface-panel)); backdrop-filter: var(--glass-filter, blur(20px) saturate(180%)); -webkit-backdrop-filter: var(--glass-filter, blur(20px) saturate(180%)); border: 1px solid var(--border-subtle); padding: 0.75rem 1rem; border-radius: 12px; border-bottom-right-radius: 2px; color: var(--text-primary); font-size: 0.8rem; font-weight: 600; max-width: 240px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); pointer-events: auto; line-height: 1.4; }
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
		position: absolute; 
		bottom: 60px; 
		right: 0; 
		display: flex; 
		align-items: center; 
		gap: 12px; 
		padding: 8px 12px 8px 16px; 
		background: var(--surface-panel-ai, var(--surface-panel)); 
		backdrop-filter: var(--glass-filter, blur(24px)); 
		-webkit-backdrop-filter: var(--glass-filter, blur(24px)); 
		border: 1px solid var(--accent); 
		border-radius: 99px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.3);
		color: var(--text-primary);
		cursor: pointer;
		pointer-events: auto;
		transform-origin: bottom right;
		/* Flowing boundary following the theme */
		animation: flowing-border 4s ease-in-out infinite;
	}
	:root[data-clear-glass="true"] .mini-timer { background: var(--surface-canvas) !important; border: 1px solid var(--accent) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }

	.mini-timer.break { border-color: var(--success); }
	
	@keyframes flowing-border {
		0% { border-radius: 99px 40px 99px 60px; }
		50% { border-radius: 60px 99px 40px 99px; }
		100% { border-radius: 99px 40px 99px 60px; }
	}

	.mini-time { font-family: monospace; font-size: 1.1rem; font-weight: 700; letter-spacing: 1px; color: var(--accent); }
	.mini-timer.break .mini-time { color: var(--success); }
	.mini-phase { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; opacity: 0.8; }
	.mini-pause { width: 28px; height: 28px; border-radius: 50%; border: none; background: color-mix(in srgb, var(--text-primary) 15%, transparent); color: var(--text-primary); display: grid; place-items: center; cursor: pointer; transition: background 0.2s, transform 0.2s; }
	.mini-pause:hover { background: color-mix(in srgb, var(--text-primary) 25%, transparent); transform: scale(1.1); }

</style>
