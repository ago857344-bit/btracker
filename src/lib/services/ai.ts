import type { TrackerState } from "$lib/types/tracker";
import { askGemini, streamGeminiChat } from "./gemini";
import { SUBJECTS } from "$lib/state/subjects";
import { buildAcademicConstraintPrompt } from "./aiContext";

export async function getWeaknessAnalysis(tracker: TrackerState): Promise<string> {
	const mistakes = tracker.mistakes || [];
	const recentMistakes = mistakes.slice(-15).map(m => {
		const subName = SUBJECTS.find(s => s.code === m.subject)?.name || m.subject;
		return `- [${subName}] ${m.errorType} Error: ${m.description} (Context: ${m.testName || 'Practice'})`;
	}).join('\n');
	
	const elo = tracker.gamification?.elo || { P: 300, C: 300, M: 300 };
	const academicConstraints = buildAcademicConstraintPrompt(tracker);
	
	const prompt = `
STUDENT DATA:
Elo Ratings: Physics (${Math.floor(elo.P)}), Chemistry (${Math.floor(elo.C)}), Math (${Math.floor(elo.M)})
(Note: Base Elo is 300. Above 1200 is elite. Below 500 is weak.)
${academicConstraints}
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

export async function streamWeaknessAnalysis(
	tracker: TrackerState,
	onChunk: (chunk: string) => void
): Promise<string> {
	const mistakes = tracker.mistakes || [];
	const recentMistakes = mistakes.slice(-15).map(m => {
		const subName = SUBJECTS.find(s => s.code === m.subject)?.name || m.subject;
		return `- [${subName}] ${m.errorType} Error: ${m.description} (Context: ${m.testName || 'Practice'})`;
	}).join('\n');
	
	const elo = tracker.gamification?.elo || { P: 300, C: 300, M: 300 };
	const academicConstraints = buildAcademicConstraintPrompt(tracker);
	
	const prompt = `
STUDENT DATA:
Elo Ratings: Physics (${Math.floor(elo.P)}), Chemistry (${Math.floor(elo.C)}), Math (${Math.floor(elo.M)})
(Note: Base Elo is 300. Above 1200 is elite. Below 500 is weak.)
${academicConstraints}
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

	return await streamGeminiChat([{ role: 'user', parts: [{ text: prompt }] }], sys, onChunk);
}

export async function getAIPlannerBalance(
	tasks: { id: string; text: any; sub: any; ch?: any; subs?: any }[],
	days: string[],
	elo: { P: number; C: number; M: number },
	academicConstraint: string = '',
	scheduledClasses: { date: string; subject: string; topic: string }[] = []
): Promise<Record<string, string>> {
	if (!tasks || tasks.length === 0 || !days || days.length === 0) {
		return {};
	}

	try {
		const prompt = `
STUDENT ELO: Physics (${Math.floor(elo.P)}), Chemistry (${Math.floor(elo.C)}), Math (${Math.floor(elo.M)})
Lowest Elo = Weakest subject (needs more focus/earlier scheduling).
${academicConstraint}
AVAILABLE DATES (Next ${days.length} days):
${days.join(', ')}

${scheduledClasses.length > 0 ? `FIXED SCHEDULED CLASSES / TIMETABLE:\n${JSON.stringify(scheduledClasses, null, 2)}\n` : ''}

PENDING TASKS TO BALANCE:
${JSON.stringify(tasks, null, 2)}
`;

		const sys = `You are an elite JEE study schedule optimizer. 
Assign a date to each task ID from the available dates list.

CRITICAL BALANCING RULES:
1. SAME-DAY / NEXT-DAY PRACTICE COUPLING RULE:
   If a chapter is being studied today (or has a scheduled class, theory reading, or lecture on date D), its corresponding practice questions, exercises (Ex 1, Ex 2, etc.), and problem solving MUST be scheduled on the SAME DAY (date D) or AT MOST the NEXT DAY (date D+1).
   NEVER schedule a chapter's practice questions more than 1 day after studying the chapter!
2. CHAPTER COHESION:
   Tasks belonging to the same chapter (e.g. Chapter Theory and Chapter Exercises) must be clustered tightly together: Theory on Day D, Questions on Day D or Day D+1.
3. SUBJECT BALANCE & ELO PRIORITIZATION:
   Distribute workload evenly across the available dates without overloading any single day.
   Prioritize weaker subjects (lowest Elo) earlier in the week.

OUTPUT STRICTLY A VALID JSON OBJECT mapping task IDs to date strings, e.g. {"task1": "${days[0]}", "task2": "${days[1] || days[0]}"}. 
Do not include Markdown fences like \`\`\`json. Return ONLY the raw JSON object.`;

		const res = await askGemini(prompt, sys);
		if (res && typeof res === 'string') {
			const match = res.match(/\{[\s\S]*\}/);
			let parsed: any = null;
			if (match) {
				parsed = JSON.parse(match[0]);
			} else {
				const cleanRes = res.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
				parsed = JSON.parse(cleanRes);
			}

			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
				const validDays = new Set(days);
				const validatedMap: Record<string, string> = {};
				for (const [taskId, dateStr] of Object.entries(parsed)) {
					if (typeof dateStr === 'string' && validDays.has(dateStr)) {
						validatedMap[taskId] = dateStr;
					} else {
						validatedMap[taskId] = days[0];
					}
				}
				if (Object.keys(validatedMap).length > 0) {
					return validatedMap;
				}
			}
		}
	} catch (err) {
		console.warn('AI planner balance JSON parse failed or network error, falling back to smart distribution:', err);
	}

	// Smart fallback: distribute tasks across days, prioritizing weaker subjects earlier
	const fallbackMap: Record<string, string> = {};
	const subjectElo: Record<string, number> = {
		P: elo?.P ?? 300,
		C: elo?.C ?? 300,
		M: elo?.M ?? 300
	};
	const sortedTasks = [...tasks].sort((a, b) => {
		const eloA = subjectElo[a.sub] ?? 300;
		const eloB = subjectElo[b.sub] ?? 300;
		return eloA - eloB;
	});
	sortedTasks.forEach((t, i) => {
		fallbackMap[t.id] = days[i % days.length];
	});
	return fallbackMap;
}

export async function getAICrashCourse(
	chapterName: string,
	subjectName: string,
	elo: number,
	academicConstraint: string = ''
): Promise<string> {
	const prompt = `Chapter: ${chapterName}\nSubject: ${subjectName}\nCurrent Elo in Subject: ${Math.floor(elo)}\n${academicConstraint}`;
	const sys = `You are a JEE expert tutor. The student needs a rapid 2-minute conceptual crash course on this chapter.
Their Elo is ${Math.floor(elo)} (Base is 300, 1200+ is Elite, <500 is weak).
Adapt the explanation complexity to their Elo and academic grade level strictly.
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
