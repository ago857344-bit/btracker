import { askGemini } from '$lib/services/gemini';

export async function parseVoiceLog(transcript: string): Promise<{ minutes: number; subject: string; chapter: string } | null> {
    const prompt = `
Extract the study session details from this voice transcript: "${transcript}"

Return exactly a JSON object (no markdown) with:
- "minutes": number of minutes (convert hours to minutes if needed).
- "subject": "P" (Physics), "C" (Chemistry), or "M" (Maths). Guess based on context if not explicit.
- "chapter": The chapter number or name (just the number if possible, e.g. "3" or "Rotational Motion"). If not mentioned, return "".

Example response:
{"minutes": 45, "subject": "P", "chapter": "3"}
`;
    try {
        const res = await askGemini(prompt);
        return JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        console.error("Voice parse failed:", e);
        return null;
    }
}
