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

		const MODELS_TO_TRY = [
			'gemini-3.8-flash', 
			'gemini-3.7-flash', 
			'gemini-3.5-flash', 
			'gemini-2.5-pro', 
			'gemini-2.5-flash'
		];

		let res: Response | null = null;
		
		for (const model of MODELS_TO_TRY) {
			res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			// If success, or if it's a hard error (like 400 Bad Request), break the loop
			// Only continue hunting if it's 503 (Overloaded), 429 (Rate Limit), or 404 (Not Found)
			if (res && (res.ok || (res.status !== 503 && res.status !== 429 && res.status !== 404))) {
				break;
			}
		}

		let errMessage = "Unknown error";
		if (!res || !res.ok) {
			const err = res ? await res.json().catch(() => ({})) : {};
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
			
			return json({ error: errMessage }, { status: res ? res.status : 500 });
		}

		const data = await res.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
		
		return json({ text });
	} catch (e: any) {
		return json({ error: e.message || "Unknown error occurred while contacting AI." }, { status: 500 });
	}
}
