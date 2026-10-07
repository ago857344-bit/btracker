import type { TrackerState } from "$lib/types/tracker";
import { askGemini } from "./gemini";
import { SUBJECTS } from "$lib/state/subjects";

export async function getWeaknessAnalysis(tracker: TrackerState): Promise<string> {
	const mistakes = tracker.mistakes || [];
	const recentMistakes = mistakes.slice(-15).map(m => {
		const subName = SUBJECTS.find(s => s.code === m.subject)?.name || m.subject;
		return `- [${subName}] ${m.errorType} Error: ${m.description} (Context: ${m.testName || 'Practice'})`;
	}).join('\n');
	
	const elo = tracker.gamification?.elo || { P: 300, C: 300, M: 300 };
	
	const prompt = `
STUDENT DATA:
Elo Ratings: Physics (${Math.floor(elo.P)}), Chemistry (${Math.floor(elo.C)}), Math (${Math.floor(elo.M)})
(Note: Base Elo is 300. Above 1200 is elite. Below 500 is weak.)

Recent Mistakes (Last 15):
${recentMistakes || 'No recent mistakes logged.'}
`;

	const sys = `You are an elite, strict, highly analytical JEE Mentor AI. 
Analyze the student's Elo ratings and recent mistakes.
Format your output cleanly in markdown.
Do NOT use a generic intro. Dive straight in.

Structure your response exactly as follows:
### 🚨 Critical Weaknesses
(Identify 2 critical conceptual or behavioral weak points based on the mistakes and Elo. Be specific.)

### 🎯 Weekly Strategy
(Provide 1 highly actionable, concrete strategic adjustment they must implement this week to fix the weaknesses.)

### ⚡ Mentor's Note
(A 1-2 sentence tough-love, motivational closing based on their Elo performance.)`;

	return await askGemini(prompt, sys);
}
