import { askGemini } from '$lib/services/gemini';
import type { TodoItem } from '$lib/types/tracker';

export async function triageTodos(todos: TodoItem[], elo: Record<string, number>): Promise<Record<string, 'High ROI' | 'Time Trap' | 'Normal' | 'Core'>> {
    const prompt = `
You are an elite JEE Mentor AI. The student has requested an "AI Smart Triage" of their To-Do list based on game theory and their current Elo ratings.

Current Elo Ratings (Baseline is 1200, >1600 is strong, <1000 is weak):
Physics: ${elo.P || 1200}
Chemistry: ${elo.C || 1200}
Maths: ${elo.M || 1200}

Here are their pending tasks (ID and Title):
${todos.map(t => `- [${t.id}] ${t.title}`).join('\n')}

For each task, categorize it into exactly ONE of the following:
1. "High ROI": Task involves a weak subject/topic where they can gain a lot of marks quickly.
2. "Time Trap": Task involves a topic they are already very strong in (high Elo) but might be wasting time over-practicing.
3. "Core": Essential maintenance tasks or highly important fundamentals.
4. "Normal": Standard tasks that don't fit the extremes.

Respond ONLY with a valid JSON object mapping the Task ID to the category string. No markdown, no explanation.
Example:
{
  "task-123": "High ROI",
  "task-456": "Time Trap"
}
`;

    try {
        const result = await askGemini(prompt);
        // Clean markdown backticks if present
        const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (e) {
        console.error("AI Triage failed:", e);
        return {};
    }
}

export async function getMicroChallenge(subjectName: string, chapterName: string): Promise<string> {
    const prompt = `
Generate a single, one-sentence "micro-challenge" question for a JEE student about the chapter "${chapterName}" in "${subjectName}".
The question should test a core formula, property, or concept. 
DO NOT include the answer. 
DO NOT use markdown formatting, just plain text or standard math notation.
Keep it under 15 words.
Example: What is the condition for resonance in an LCR circuit?
`;
    try {
        const result = await askGemini(prompt);
        return result.trim();
    } catch (e) {
        return "Failed to load challenge.";
    }
}
