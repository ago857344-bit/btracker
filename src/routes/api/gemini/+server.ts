import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST({ request }) {
	// Securely access the API key from the environment variables
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		return json({ error: "Server missing GEMINI_API_KEY environment variable." }, { status: 500 });
	}

	try {
		const { history, systemInstruction, jsonMode } = await request.json();

		const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

		const body: any = { contents: history };
		if (systemInstruction) {
			body.systemInstruction = { parts: [{ text: systemInstruction }] };
		}
		if (jsonMode) {
			body.generationConfig = { responseMimeType: "application/json" };
		}

		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return json({ error: err.error?.message || "Failed to fetch from Gemini API." }, { status: res.status });
		}

		const data = await res.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
		
		return json({ text });
	} catch (e: any) {
		return json({ error: e.message || "Unknown error occurred while contacting AI." }, { status: 500 });
	}
}
