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

		// ── 1. Try Groq first (fast, free) ──────────────────────────────────
		const groqKey = env.GROQ_API_KEY;
		if (groqKey) {
			const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
			for (const model of GROQ_MODELS) {
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), 25_000);
					const body: any = {
						model,
						messages: toOpenAIMessages(history, systemInstruction),
						temperature: 0.7
					};
					if (jsonMode) body.response_format = { type: 'json_object' };

					const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${groqKey}`
						},
						body: JSON.stringify(body),
						signal: controller.signal
					});
					clearTimeout(timeout);

					if (res.ok) {
						const data = await res.json();
						const text = data.choices?.[0]?.message?.content ?? '';
						return json({ text });
					}
					// 429 rate limit → try next model; anything else → fall through to Gemini
					if (res.status !== 429) break;
				} catch {
					// timeout or network error → fall through to Gemini
				}
			}
		}

		// ── 2. Fallback: Gemini ──────────────────────────────────────────────
		const geminiKey = env.GEMINI_API_KEY;
		if (!geminiKey) {
			return json({ error: 'No AI API key configured. Set GROQ_API_KEY or GEMINI_API_KEY.' }, { status: 500 });
		}

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
			// Continue to next model only on 503/429/404
			if (geminiRes && (geminiRes.ok || (geminiRes.status !== 503 && geminiRes.status !== 429 && geminiRes.status !== 404))) {
				break;
			}
		}

		if (!geminiRes || !geminiRes.ok) {
			const err = geminiRes ? await geminiRes.json().catch(() => ({})) : {};
			const msg = err.error?.message ?? 'Failed to get a response from AI.';
			return json({ error: msg }, { status: geminiRes?.status ?? 500 });
		}

		const data = await geminiRes.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
		return json({ text });

	} catch (e: any) {
		return json({ error: e.message ?? 'Unknown error occurred.' }, { status: 500 });
	}
}
