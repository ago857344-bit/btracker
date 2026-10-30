export type ChatMessage = { role: 'user' | 'model', parts: [{ text: string }] };

export async function askGemini(prompt: string, systemInstruction?: string, jsonMode: boolean = false): Promise<string> {
	return askGeminiChat([{ role: 'user', parts: [{ text: prompt }] }], systemInstruction, jsonMode);
}

export async function askGeminiChat(
	history: ChatMessage[],
	systemInstruction?: string,
	jsonMode: boolean = false,
	skipDelay: boolean = false
): Promise<string> {
	const res = await fetch('/api/gemini', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ history, systemInstruction, jsonMode })
	});

	const data = await res.json();

	if (!res.ok) {
		return data.error || "Failed to communicate with AI server.";
	}

	return data.text;
}

export async function streamGeminiChat(
	history: ChatMessage[],
	systemInstruction: string | undefined,
	onChunk: (chunk: string) => void
): Promise<string> {
	const res = await fetch('/api/gemini', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ history, systemInstruction, stream: true })
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: 'AI request failed' }));
		throw new Error(err.error || `HTTP ${res.status}`);
	}

	if (!res.body) {
		throw new Error('No readable response stream received.');
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let accumulated = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		const chunk = decoder.decode(value, { stream: true });
		if (chunk) {
			accumulated += chunk;
			onChunk(chunk);
		}
	}

	return accumulated;
}
