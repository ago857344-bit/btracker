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

export async function getAIPlannerBalance(
	tasks: { id: string; text: any; sub: any }[],
	days: string[],
	elo: { P: number; C: number; M: number }
): Promise<Record<string, string>> {
	const prompt = `
STUDENT ELO: Physics (${Math.floor(elo.P)}), Chemistry (${Math.floor(elo.C)}), Math (${Math.floor(elo.M)})
Lowest Elo = Weakest subject (needs more focus/earlier scheduling).

AVAILABLE DATES (Next ${days.length} days):
${days.join(', ')}

PENDING TASKS:
${JSON.stringify(tasks, null, 2)}
`;

	const sys = `You are a JEE study schedule optimizer. 
Assign a date to each task ID.
Balance the workload evenly across the available dates, prioritizing weaker subjects (lowest Elo) early in the week.
OUTPUT STRICTLY A VALID JSON OBJECT mapping task IDs to date strings, e.g. {"task1": "2026-10-08", "task2": "2026-10-09"}. 
Do not include Markdown fences like \`\`\`json. Return ONLY the raw JSON object.`;

	const res = await askGemini(prompt, sys);
	const cleanRes = res.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
	return JSON.parse(cleanRes);
}

export async function getAICrashCourse(chapterName: string, subjectName: string, elo: number): Promise<string> {
	const prompt = `Chapter: ${chapterName}\nSubject: ${subjectName}\nCurrent Elo in Subject: ${Math.floor(elo)}`;
	const sys = `You are a JEE expert tutor. The student needs a rapid 2-minute conceptual crash course on this chapter.
Their Elo is ${Math.floor(elo)} (Base is 300, 1200+ is Elite, <500 is weak).
Adapt the explanation complexity to their Elo. If they are weak, do ELI5. If elite, give advanced edge-case insights.
Format cleanly in Markdown.
Structure exactly as follows:
### ⚡ The Core Idea
(1 paragraph summary)
### 🔑 Key Formulas & Concepts
(Bullet points)
### ⚠️ Common Traps
(1-2 classic mistakes students make)`;
	return await askGemini(prompt, sys);
}
