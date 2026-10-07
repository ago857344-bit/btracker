<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import type { MistakeLog } from '$lib/types/tracker';
	import { askGeminiChat, type ChatMessage } from '$lib/services/gemini';
	import { marked } from 'marked';

	export let mistake: MistakeLog | null = null;
	const dispatch = createEventDispatcher();

	let history: ChatMessage[] = [];
	let chatHtml: string[] = [];
	let draft = '';
	let loading = false;
	let error = '';
	let chatBox: HTMLElement;

	$: if (mistake && history.length === 0) {
		initGrill();
	}

	async function initGrill() {
		if (!mistake) return;
		loading = true;
		history = [];
		chatHtml = [];
		
		const sysPrompt = `You are an elite, demanding JEE Tutor. The user logged a mistake:
Subject: ${mistake.subject}
Type: ${mistake.errorType}
Description: ${mistake.description}

Your goal is to grill them on this exact mistake to ensure active recall. 
Start by asking ONE tough, conceptual question related to their mistake.
When they answer, roast their inaccuracies (if any), correct them, and score their answer out of 10. Then ask one final follow-up question. 
Keep your responses concise and format them cleanly. DO NOT answer the question for them initially.`;

		try {
			const prompt = "I'm ready. Grill me on this mistake.";
			history = [{ role: 'user', parts: [{ text: prompt }] }];
			const reply = await askGeminiChat(history, sysPrompt);
			history = [...history, { role: 'model', parts: [{ text: reply }] }];
			chatHtml = [await marked.parse(reply)];
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
			await tick();
			scrollToBottom();
		}
	}

	async function sendMessage() {
		if (!draft.trim() || loading) return;
		
		const msg = draft.trim();
		draft = '';
		loading = true;
		
		history = [...history, { role: 'user', parts: [{ text: msg }] }];
		chatHtml = [...chatHtml, '']; // Placeholder for user message HTML (we just render raw text for user)
		
		await tick();
		scrollToBottom();

		const sysPrompt = `You are an elite, demanding JEE Tutor.`; // Same sys prompt is passed but less needed on subsequent turns
		
		try {
			const reply = await askGeminiChat(history, sysPrompt);
			history = [...history, { role: 'model', parts: [{ text: reply }] }];
			chatHtml = [...chatHtml, await marked.parse(reply)];
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
			await tick();
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
	}

	function close() {
		dispatch('close');
	}
</script>

{#if mistake}
<div class="gm-backdrop" on:click={close}>
	<div class="gm-card" on:click|stopPropagation>
		<div class="gm-head">
			<div class="title-wrap">
				<span class="flame"><NavIcon name="flame" size={18} /></span>
				<h3>Grill Me</h3>
			</div>
			<button class="x-btn" on:click={close}><NavIcon name="x" size={16} /></button>
		</div>

		<div class="gm-context">
			<b>Mistake Target:</b> {mistake.description}
		</div>

		<div class="gm-chat" bind:this={chatBox}>
			{#if error}
				<div class="err-box">{error}</div>
			{/if}

			{#each history as msg, i}
				{#if msg.role === 'model' || i > 0} <!-- skip the first "I'm ready" hidden prompt -->
					<div class="msg {msg.role}">
						{#if msg.role === 'model'}
							<span class="avatar"><NavIcon name="sparkles" size={12} /></span>
							<div class="bubble md">{@html chatHtml[i === 0 ? 0 : i - 1]}</div>
						{:else}
							<div class="bubble">{msg.parts[0].text}</div>
						{/if}
					</div>
				{/if}
			{/each}

			{#if loading && history.length > 0}
				<div class="msg model typing">
					<span class="avatar"><NavIcon name="sparkles" size={12} /></span>
					<div class="bubble"><span class="dot-pulse"></span></div>
				</div>
			{/if}
		</div>

		<div class="gm-input">
			<input 
				type="text" 
				placeholder="Type your answer..." 
				bind:value={draft} 
				on:keydown={(e) => e.key === 'Enter' && sendMessage()}
				disabled={loading}
			/>
			<button class="send-btn" on:click={sendMessage} disabled={loading || !draft.trim()}>
				<NavIcon name="arrow-right" size={14} />
			</button>
		</div>
	</div>
</div>
{/if}

<style>
	.gm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 9999; display: grid; place-items: center; padding: 1rem; }
	.gm-card { width: 100%; max-width: 500px; background: var(--surface-panel); border: 1px solid var(--border-subtle); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
	
	.gm-head { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem; background: var(--surface-subtle); border-bottom: 1px solid var(--border-subtle); }
	.title-wrap { display: flex; align-items: center; gap: .6rem; }
	.flame { color: #e0455a; }
	.gm-head h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-primary); }
	.x-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: .4rem; border-radius: 8px; }
	.x-btn:hover { background: color-mix(in srgb, var(--text-primary) 10%, transparent); color: var(--text-primary); }

	.gm-context { padding: .8rem 1.5rem; background: color-mix(in srgb, var(--accent) 5%, transparent); color: var(--text-secondary); font-size: .8rem; border-bottom: 1px solid var(--border-subtle); }
	.gm-context b { color: var(--accent); font-weight: 800; }

	.gm-chat { flex: 1; min-height: 300px; max-height: 450px; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
	
	.msg { display: flex; gap: .8rem; align-items: flex-start; }
	.msg.user { flex-direction: row-reverse; }
	
	.avatar { flex: 0 0 24px; width: 24px; height: 24px; border-radius: 50%; background: var(--accent); color: white; display: grid; place-items: center; }
	
	.bubble { padding: .8rem 1rem; border-radius: 12px; font-size: .9rem; line-height: 1.5; color: var(--text-primary); max-width: 85%; }
	.msg.model .bubble { background: var(--surface-subtle); border-top-left-radius: 4px; }
	.msg.user .bubble { background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--text-primary); border-top-right-radius: 4px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); }
	
	.bubble.md :global(p) { margin: 0 0 .5rem; }
	.bubble.md :global(p:last-child) { margin: 0; }
	.bubble.md :global(strong) { color: var(--accent); font-weight: 800; }
	
	.err-box { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); padding: .8rem; border-radius: 8px; font-size: .85rem; font-weight: 700; text-align: center; }

	.gm-input { padding: 1rem 1.5rem; background: var(--surface-subtle); border-top: 1px solid var(--border-subtle); display: flex; gap: .6rem; }
	.gm-input input { flex: 1; background: var(--surface-canvas); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: .8rem 1rem; border-radius: 12px; font-size: .95rem; }
	.gm-input input:focus { outline: none; border-color: var(--accent); }
	.send-btn { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 12px; background: var(--accent); color: white; border: none; cursor: pointer; display: grid; place-items: center; }
	.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.dot-pulse { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-secondary); box-shadow: 12px 0 0 0 var(--text-secondary), 24px 0 0 0 var(--text-secondary); animation: pulse 1.5s infinite; }
	@keyframes pulse { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
</style>
