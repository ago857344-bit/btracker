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


		const body: any = { contents: history };
		if (systemInstruction) {
			body.systemInstruction = { parts: [{ text: systemInstruction }] };
		}
		if (jsonMode) {
			body.generationConfig = { responseMimeType: "application/json" };
		}

		let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		// Fallback for regions/keys where flash-latest is not found
		if (!res.ok && res.status === 404) {
			res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}

		let errMessage = "Unknown error";
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			errMessage = err.error?.message || "Failed to fetch from Gemini API.";

			// Fetch available models to debug what their key supports
			try {
				const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
				if (modelsRes.ok) {
					const modelsData = await modelsRes.json();
					const availableModels = modelsData.models?.map((m: any) => m.name.replace('models/', '')).join(', ') || 'None';
					errMessage += `\n[DEBUG] Your API Key supports these models: ${availableModels}`;
				} else {
					errMessage += `\n[DEBUG] Also failed to list models. Is your API key valid for Generative Language API?`;
				}
			} catch (e) {
				// ignore
			}
			
			return json({ error: errMessage }, { status: res.status });
		}

		const data = await res.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
		
		return json({ text });
	} catch (e: any) {
		return json({ error: e.message || "Unknown error occurred while contacting AI." }, { status: 500 });
	}
}
