import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const config = { maxDuration: 60 };

// ── Rate Limiter & Security Limits ───────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // 30 requests per minute
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);
	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return true;
	}
	if (entry.count >= RATE_LIMIT_MAX) {
		return false;
	}
	entry.count++;
	return true;
}

// Clean up stale IPs periodically
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of rateLimitMap.entries()) {
		if (now > entry.resetAt) rateLimitMap.delete(ip);
	}
}, 300_000);

// Convert Gemini-style history to OpenAI-style messages
function toOpenAIMessages(history: any[], systemInstruction?: string) {
	const messages: { role: string; content: string }[] = [];
	if (systemInstruction) {
		messages.push({ role: 'system', content: systemInstruction });
	}
	for (const turn of history || []) {
		messages.push({
			role: turn.role === 'model' ? 'assistant' : 'user',
			content: turn.parts?.[0]?.text ?? ''
		});
	}
	return messages;
}

function streamOpenAICompatible(response: Response): Response {
	const textStream = new ReadableStream({
		async start(controller) {
			const reader = response.body?.getReader();
			if (!reader) {
				controller.close();
				return;
			}
			const decoder = new TextDecoder();
			let buffer = '';
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith('data:')) continue;
						const jsonStr = trimmed.slice(5).trim();
						if (jsonStr === '[DONE]') continue;
						try {
							const parsed = JSON.parse(jsonStr);
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) {
								controller.enqueue(new TextEncoder().encode(delta));
							}
						} catch {}
					}
				}
			} catch (err) {
				controller.error(err);
			} finally {
				controller.close();
			}
		}
	});

	return new Response(textStream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Transfer-Encoding': 'chunked',
			'Cache-Control': 'no-cache, no-transform'
		}
	});
}

function streamGeminiCompatible(response: Response): Response {
	const textStream = new ReadableStream({
		async start(controller) {
			const reader = response.body?.getReader();
			if (!reader) {
				controller.close();
				return;
			}
			const decoder = new TextDecoder();
			let buffer = '';
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith('data:')) continue;
						const jsonStr = trimmed.slice(5).trim();
						try {
							const parsed = JSON.parse(jsonStr);
							const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
							if (text) {
								controller.enqueue(new TextEncoder().encode(text));
							}
						} catch {}
					}
				}
			} catch (err) {
				controller.error(err);
			} finally {
				controller.close();
			}
		}
	});

	return new Response(textStream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Transfer-Encoding': 'chunked',
			'Cache-Control': 'no-cache, no-transform'
		}
	});
}

export async function POST({ request, getClientAddress }) {
	try {
		// 1. IP Rate Limiting Guard
		let clientIp = 'unknown';
		try {
			clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || getClientAddress();
		} catch {
			clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
		}

		if (!checkRateLimit(clientIp)) {
			return json({ error: 'Rate limit exceeded (30 requests/minute). Please slow down.' }, { status: 429 });
		}

		// 2. Payload size guard
		const contentLength = request.headers.get('content-length');
		if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
			return json({ error: 'Payload too large (max 5MB limit exceeded).' }, { status: 413 });
		}

		const { history, systemInstruction, jsonMode, stream } = await request.json();

		const groqKey = env.GROQ_API_KEY;
		const geminiKey = env.GEMINI_API_KEY;
		const openaiKey = env.OPENAI_API_KEY;
		const openrouterKey = env.OPENROUTER_API_KEY;

		if (!groqKey && !geminiKey && !openaiKey && !openrouterKey) {
			return json({ error: 'No AI API key configured on the server. Set GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY in your environment variables.' }, { status: 500 });
		}

		const hasVision = history?.some((turn: any) =>
			turn.parts?.some((part: any) => part.inlineData)
		);

		const isStreaming = Boolean(stream && !jsonMode);

		// ── 1. Try OpenAI for vision requests ───────────────────────────────────
		if (openaiKey && hasVision) {
			try {
				const openaiMessages = history.map((turn: any) => {
					const content: any[] = [];
					for (const part of turn.parts || []) {
						if (part.inlineData) {
							content.push({
								type: 'image_url',
								image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
							});
						} else if (part.text) {
							content.push({ type: 'text', text: part.text });
						}
					}
					return { role: turn.role === 'model' ? 'assistant' : 'user', content };
				});

				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 35_000);

				const res = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${openaiKey}`
					},
					body: JSON.stringify({
						model: 'gpt-4o',
						messages: openaiMessages,
						max_tokens: 4096,
						stream: isStreaming
					}),
					signal: controller.signal
				});
				clearTimeout(timeout);

				if (res.ok) {
					if (isStreaming) {
						return streamOpenAICompatible(res);
					}
					const data = await res.json();
					const text = data.choices?.[0]?.message?.content ?? '';
					return json({ text });
				}
			} catch (e) {
				console.warn('OpenAI vision failed, falling back to OpenRouter/Gemini:', e);
			}
		}

		// ── 1b. Try OpenRouter for vision requests ─────────────────────────────
		if (openrouterKey && hasVision) {
			const openrouterMessages = history.map((turn: any) => {
				const content: any[] = [];
				for (const part of turn.parts || []) {
					if (part.inlineData) {
						content.push({
							type: 'image_url',
							image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
						});
					} else if (part.text) {
						content.push({ type: 'text', text: part.text });
					}
				}
				return { role: turn.role === 'model' ? 'assistant' : 'user', content };
			});

			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 45_000);

				const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${openrouterKey}`,
						'HTTP-Referer': 'https://btracker.app',
						'X-Title': 'BTracker'
					},
					body: JSON.stringify({
						models: ['google/gemma-3-4b-it:free', 'meta-llama/llama-3.2-11b-vision-instruct:free'],
						messages: openrouterMessages,
						max_tokens: 4096,
						stream: isStreaming
					}),
					signal: controller.signal
				});
				clearTimeout(timeout);

				if (res.ok) {
					if (isStreaming) {
						return streamOpenAICompatible(res);
					}
					const data = await res.json();
					const text = data.choices?.[0]?.message?.content ?? '';
					if (text && text.trim().length >= 10) {
						return json({ text });
					}
				}
			} catch (e: any) {
				console.warn('OpenRouter vision request failed:', e?.message ?? e);
			}
		}

		// ── 2. Try Groq (fast, free) for text/code prompts ──────────────────────
		if (groqKey && !hasVision) {
			let groqModels: string[] = [];
			try {
				const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
					headers: { Authorization: `Bearer ${groqKey}` }
				});
				if (modelsRes.ok) {
					const modelsData = await modelsRes.json();
					const all: string[] = (modelsData.data ?? [])
						.map((m: any) => m.id as string)
						.filter((id: string) =>
							!id.includes('whisper') &&
							!id.includes('tts') &&
							!id.includes('embed') &&
							!id.includes('guard')
						);
					groqModels = [
						...all.filter(id => id.includes('70b') || id.includes('72b') || id.includes('90b') || id.includes('120b')),
						...all.filter(id => !id.includes('70b') && !id.includes('72b') && !id.includes('90b') && !id.includes('120b'))
					];
				}
			} catch { /* ignore, fall through */ }

			if (!groqModels.length) {
				groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
			}

			let groqErr = '';
			for (const model of groqModels.slice(0, 3)) {
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), 25_000);
					const body: any = {
						model,
						messages: toOpenAIMessages(history, systemInstruction),
						temperature: 0.7,
						stream: isStreaming
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
						if (isStreaming) {
							return streamOpenAICompatible(groqRes);
						}
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

		// ── 3. Fallback: Google Generative AI (Gemini) ─────────────────────────
		if (!geminiKey) {
			return json({ error: 'No AI provider succeeded. Ensure GEMINI_API_KEY or GROQ_API_KEY is configured.' }, { status: 500 });
		}

		const geminiBody: any = { contents: history };
		if (systemInstruction) geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
		if (jsonMode) geminiBody.generationConfig = { responseMimeType: 'application/json' };

		// Valid Google Generative AI model IDs (eliminating invalid IDs)
		const GEMINI_MODELS = [
			'gemini-2.5-flash',
			'gemini-2.5-pro',
			'gemini-2.0-flash',
			'gemini-1.5-flash'
		];

		let geminiRes: Response | null = null;
		for (const model of GEMINI_MODELS) {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 35_000);
				const endpoint = isStreaming
					? `https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`
					: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`;

				geminiRes = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(geminiBody),
					signal: controller.signal
				});
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

		if (isStreaming) {
			return streamGeminiCompatible(geminiRes);
		}

		const data = await geminiRes.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
		return json({ text });

	} catch (e: any) {
		return json({ error: e.message ?? 'Unknown error occurred.' }, { status: 500 });
	}
}
