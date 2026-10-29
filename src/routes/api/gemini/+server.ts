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

// ── Groq Model Cache (10-minute TTL, 3s timeout) ──────────────────────────────
let cachedGroqModels: { ids: string[]; expiresAt: number } | null = null;
const GROQ_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

async function getAvailableGroqModels(groqKey: string): Promise<string[] | null> {
	const now = Date.now();
	if (cachedGroqModels && now < cachedGroqModels.expiresAt) {
		return cachedGroqModels.ids;
	}

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);
		const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
			headers: { Authorization: `Bearer ${groqKey}` },
			signal: controller.signal
		});
		clearTimeout(timeout);
		if (modelsRes.ok) {
			const modelsData = await modelsRes.json();
			const ids: string[] = (modelsData.data ?? []).map((m: any) => m.id as string);
			if (ids.length > 0) {
				cachedGroqModels = {
					ids,
					expiresAt: now + GROQ_MODEL_CACHE_TTL_MS
				};
				return ids;
			}
		}
	} catch {
		// Ignore dynamic fetch failure, fallback to stale cache or defaults
	}

	return cachedGroqModels?.ids || null;
}

// Convert Gemini-style history to OpenAI-style messages (supporting text, images, and Groq JSON requirement)
function toOpenAIMessages(history: any[], systemInstruction?: string, jsonMode?: boolean) {
	const messages: any[] = [];
	if (systemInstruction) {
		messages.push({ role: 'system', content: systemInstruction });
	}
	for (const turn of history || []) {
		const role = turn.role === 'model' ? 'assistant' : 'user';
		const hasImages = (turn.parts || []).some((p: any) => p.inlineData);
		if (hasImages) {
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
			messages.push({ role, content });
		} else {
			const text = (turn.parts || []).map((p: any) => p.text || '').join('');
			messages.push({ role, content: text });
		}
	}
	// Groq strictly requires the word "json" in prompt/system message when jsonMode is true
	if (jsonMode) {
		const hasJsonWord = messages.some((m: any) => {
			if (typeof m.content === 'string') return m.content.toLowerCase().includes('json');
			if (Array.isArray(m.content)) {
				return m.content.some((c: any) => c.text && c.text.toLowerCase().includes('json'));
			}
			return false;
		});
		if (!hasJsonWord) {
			messages.unshift({ role: 'system', content: 'You must respond with valid JSON output.' });
		}
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
			return json({ error: 'GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in your environment variables.' }, { status: 500 });
		}

		const hasVision = history?.some((turn: any) =>
			turn.parts?.some((part: any) => part.inlineData)
		);

		const isStreaming = Boolean(stream && !jsonMode);
		let groqErr = '';

		// ── 1. PRIMARY: Groq (ultra-fast, primary provider) ──────────────────
		if (groqKey) {
			let groqCandidateModels = hasVision
				? ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview']
				: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

			const available = await getAvailableGroqModels(groqKey);
			if (available && available.length > 0) {
				if (hasVision) {
					const visionModels = available.filter(id => id.includes('vision'));
					if (visionModels.length) groqCandidateModels = visionModels;
				} else {
					const textModels = available.filter(id =>
						!id.includes('whisper') && !id.includes('tts') && !id.includes('embed') && !id.includes('guard') && !id.includes('vision')
					);
					if (textModels.length) {
						groqCandidateModels = [
							...textModels.filter(id => id.includes('70b') || id.includes('llama-3.3')),
							...textModels.filter(id => !id.includes('70b') && !id.includes('llama-3.3'))
						];
					}
				}
			}

			const messages = toOpenAIMessages(history, systemInstruction, jsonMode);

			for (const model of groqCandidateModels.slice(0, 3)) {
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), 35_000);
					const body: any = {
						model,
						messages,
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
					if (groqRes.status !== 429 && groqRes.status !== 503) {
						// Don't break immediately, allow fallback model attempt
					}
				} catch (e: any) {
					groqErr = e?.message ?? 'Groq request failed.';
				}
			}

			// If no fallback keys exist, return Groq's error directly
			if (!geminiKey && !openaiKey && !openrouterKey) {
				return json({ error: `Groq error: ${groqErr || 'No usable models found.'}` }, { status: 500 });
			}
		}

		// ── 2. Fallback: OpenAI ───────────────────────────────────────────────
		if (openaiKey) {
			try {
				const openaiMessages = toOpenAIMessages(history, systemInstruction, jsonMode);
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 35_000);

				const res = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${openaiKey}`
					},
					body: JSON.stringify({
						model: hasVision ? 'gpt-4o' : 'gpt-4o-mini',
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
				console.warn('OpenAI fallback failed:', e);
			}
		}

		// ── 3. Fallback: OpenRouter ───────────────────────────────────────────
		if (openrouterKey) {
			try {
				const openrouterMessages = toOpenAIMessages(history, systemInstruction, jsonMode);
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
						models: hasVision ? ['meta-llama/llama-3.2-11b-vision-instruct:free'] : ['meta-llama/llama-3.3-70b-instruct:free'],
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
				console.warn('OpenRouter fallback failed:', e?.message ?? e);
			}
		}

		// ── 4. Fallback: Gemini ────────────────────────────────────────────────
		if (geminiKey) {
			const geminiBody: any = { contents: history };
			if (systemInstruction) geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] };
			if (jsonMode) geminiBody.generationConfig = { responseMimeType: 'application/json' };

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

			if (geminiRes && geminiRes.ok) {
				if (isStreaming) {
					return streamGeminiCompatible(geminiRes);
				}
				const data = await geminiRes.json();
				const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
				return json({ text });
			}
		}

		return json({ error: `AI request failed. ${groqErr || 'Please check your GROQ_API_KEY.'}` }, { status: 500 });

	} catch (e: any) {
		return json({ error: e.message ?? 'Unknown error occurred.' }, { status: 500 });
	}
}
