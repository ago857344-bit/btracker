export type ChatMessage = { role: 'user' | 'model', parts: [{ text: string }] };

export async function askGemini(prompt: string, systemInstruction?: string, jsonMode: boolean = false): Promise<string> {
	return askGeminiChat([{ role: 'user', parts: [{ text: prompt }] }], systemInstruction, jsonMode);
}

export async function askGeminiChat(history: ChatMessage[], systemInstruction?: string, jsonMode: boolean = false): Promise<string> {
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
