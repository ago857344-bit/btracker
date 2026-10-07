import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Convert Gemini-style history to OpenAI-style messages
function toOpenAIMessages(history: any[], systemInstruction?: string) {
	const messages: { role: string; content: string }[] = [];
	if (systemInstruction) {
		messages.push({ role: 'system', content: systemInstruction });
	}
	for (const turn of history) {
		messages.push({
			role: turn.role === 'model' ? 'assistant' : 'user',
			content: turn.parts?.[0]?.text ?? ''
		});
	}
	return messages;
}

export async function POST({ request }) {
	try {
		const { history, systemInstruction, jsonMode } = await request.json();

		const groqKey = env.GROQ_API_KEY;
		const geminiKey = env.GEMINI_API_KEY;

		if (!groqKey && !geminiKey) {
			return json({ error: 'No AI API key configured on the server. Set GROQ_API_KEY or GEMINI_API_KEY in your environment variables.' }, { status: 500 });
		}

		// ── 1. Try Groq first (fast, free) ──────────────────────────────────
		if (groqKey) {
			// Dynamically fetch available models so we never use a stale/decommissioned ID
			let groqModels: string[] = [];
			try {
				const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
					headers: { Authorization: `Bearer ${groqKey}` }
				});
				if (modelsRes.ok) {
					const modelsData = await modelsRes.json();
					// Prefer larger/capable models; filter to chat-compatible ones only
					const all: string[] = (modelsData.data ?? [])
						.map((m: any) => m.id as string)
						.filter((id: string) =>
							!id.includes('whisper') &&
							!id.includes('tts') &&
							!id.includes('embed') &&
							!id.includes('guard')
						);
					// Rank: prefer 70b/large models first, then smaller ones
					groqModels = [
						...all.filter(id => id.includes('70b') || id.includes('72b') || id.includes('90b') || id.includes('120b')),
						...all.filter(id => !id.includes('70b') && !id.includes('72b') && !id.includes('90b') && !id.includes('120b'))
					];
				}
			} catch { /* ignore, will fall through to Gemini */ }

			let groqErr = '';
			for (const model of groqModels.slice(0, 4)) { // try at most 4 models
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), 25_000);
					const body: any = {
						model,
						messages: toOpenAIMessages(history, systemInstruction),
						temperature: 0.7
					};
					if (jsonMode) body.response_format = { type: 'json_object' };

					const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${groqKey}`
						},
						body: JSON.stringify(body),
						signal: controller.signal
					});
					clearTimeout(timeout);

					if (groqRes.ok) {
						const data = await groqRes.json();
						const text = data.choices?.[0]?.message?.content ?? '';
						return json({ text });
					}

					const errData = await groqRes.json().catch(() => ({}));
					groqErr = errData?.error?.message ?? `Groq returned status ${groqRes.status}`;
					if (groqRes.status !== 429) break;
				} catch (e: any) {
					groqErr = e?.message ?? 'Groq request timed out or failed.';
				}
			}

			if (!geminiKey) {
				return json({ error: `Groq error: ${groqErr || 'No usable models found.'}` }, { status: 500 });
			}
		}

		// ── 2. Fallback: Gemini ──────────────────────────────────────────────
		const geminiBody: any = { contents: history };
		if (systemInstruction) geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
		if (jsonMode) geminiBody.generationConfig = { responseMimeType: 'application/json' };

		const GEMINI_MODELS = [
			'gemini-3.8-flash',
			'gemini-3.7-flash',
			'gemini-3.6-flash',
			'gemini-3.5-flash',
			'gemini-3.5-flash-lite',
			'gemini-3.1-flash-lite'
		];

		let geminiRes: Response | null = null;
		for (const model of GEMINI_MODELS) {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 30_000);
				geminiRes = await fetch(
					`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(geminiBody),
						signal: controller.signal
					}
				);
				clearTimeout(timeout);
			} catch {
				geminiRes = null;
			}
			if (geminiRes && (geminiRes.ok || (geminiRes.status !== 503 && geminiRes.status !== 429 && geminiRes.status !== 404))) {
				break;
			}
		}

		if (!geminiRes || !geminiRes.ok) {
			const err = geminiRes ? await geminiRes.json().catch(() => ({})) : {};
			const msg = err.error?.message ?? 'Failed to get a response from Gemini.';
			return json({ error: msg }, { status: geminiRes?.status ?? 500 });
		}

		const data = await geminiRes.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
		return json({ text });

	} catch (e: any) {
		return json({ error: e.message ?? 'Unknown error occurred.' }, { status: 500 });
	}
}
