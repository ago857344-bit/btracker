import type { TrackerState } from '$lib/types/tracker';
import { allChapters } from '$lib/state/syllabus';

export interface UserAcademicContext {
	gradeLevel: string;
	gradeYear: '11' | '12' | 'dropper' | 'general';
	tickmarkedChapters: {
		P: string[];
		C: string[];
		M: string[];
	};
	allTickmarkedChapters: string[];
	hasAnyTickmarks: boolean;
}

/**
 * Extracts the user's current grade level and all chapters they have tickmarked
 * or started in the BTracker checklist (`chapterGrids`).
 */
export function getUserAcademicContext(tracker: TrackerState): UserAcademicContext {
	const rawYear = tracker?.meta?.year;
	const gradeYear: '11' | '12' | 'dropper' | 'general' =
		rawYear === '11' ? '11' : rawYear === '12' ? '12' : rawYear === 'dropper' ? 'dropper' : 'general';

	const gradeLevel =
		gradeYear === '11'
			? 'Class 11 (Foundations & Core Mechanics)'
			: gradeYear === '12'
			? 'Class 12 (Board + JEE Advanced Integration)'
			: gradeYear === 'dropper'
			? 'Dropper / Repeater (Targeting Top JEE Advanced Ranks)'
			: 'JEE Aspirant';

	const tickmarkedChapters = {
		P: [] as string[],
		C: [] as string[],
		M: [] as string[]
	};

	const subjects = ['P', 'C', 'M'] as const;
	for (const sub of subjects) {
		const grid = tracker?.chapterGrids?.[sub];
		const chapters = allChapters(sub);

		for (const ch of chapters) {
			const isStarted = Boolean(grid?.started?.[ch.no]);
			const hasCheckedCell = Boolean(grid?.data?.[ch.no]?.some((v: string) => v === '✓'));
			if (isStarted || hasCheckedCell) {
				tickmarkedChapters[sub].push(ch.name);
			}
		}
	}

	const allTickmarkedChapters = [
		...tickmarkedChapters.P,
		...tickmarkedChapters.C,
		...tickmarkedChapters.M
	];

	return {
		gradeLevel,
		gradeYear,
		tickmarkedChapters,
		allTickmarkedChapters,
		hasAnyTickmarks: allTickmarkedChapters.length > 0
	};
}

/**
 * Builds a strict system prompt constraint block instructing the AI to restrict
 * all responses strictly to the student's tickmarked chapters and grade level.
 */
export function buildAcademicConstraintPrompt(tracker: TrackerState): string {
	const ctx = getUserAcademicContext(tracker);

	let prompt = `\n--- MANDATORY ACADEMIC & SYLLABUS RESTRICTIONS ---
1. STUDENT GRADE LEVEL: ${ctx.gradeLevel}.
   - Calibrate all explanations, question complexity, and mathematical notation strictly for this academic grade level.
`;

	if (ctx.gradeYear === '11') {
		prompt += `   - The student is in Class 11. Do NOT introduce or assume knowledge of Class 12 chapters (such as Electrostatics, Magnetism, Optics, Modern Physics, Calculus/Differential Equations, 3D Geometry, Electrochemistry) unless specifically studying that topic. Keep mathematics appropriate for Class 11.\n`;
	} else if (ctx.gradeYear === '12') {
		prompt += `   - The student is in Class 12. Synthesize Class 11 fundamentals with Class 12 calculus and electrodynamics as appropriate for JEE Main/Advanced.\n`;
	} else if (ctx.gradeYear === 'dropper') {
		prompt += `   - The student is a Dropper/Repeater targeting JEE Advanced. You may employ full cross-topic synthesis, advanced mathematical rigor, and challenging multi-step edge cases.\n`;
	}

	if (ctx.hasAnyTickmarks) {
		prompt += `2. ACTIVE SYLLABUS RESTRICTION (CHECKLIST TICKMARKS):
   - The student has actively started and tickmarked ONLY the following chapters in their checklist:
     * Physics: ${ctx.tickmarkedChapters.P.length ? ctx.tickmarkedChapters.P.join(', ') : 'None tickmarked yet'}
     * Chemistry: ${ctx.tickmarkedChapters.C.length ? ctx.tickmarkedChapters.C.join(', ') : 'None tickmarked yet'}
     * Mathematics: ${ctx.tickmarkedChapters.M.length ? ctx.tickmarkedChapters.M.join(', ') : 'None tickmarked yet'}
   - STRICT INSTRUCTION: You MUST restrict your questions, examples, thought experiments, counter-examples, and topic suggestions strictly to the concepts contained within these tickmarked chapters.
   - DO NOT test or reference unstarted/unticked chapters that the student has not yet studied!
`;
	} else {
		prompt += `2. SYLLABUS CONTEXT:
   - The student has not yet tickmarked specific chapters in their checklist. Keep all questions and explanations strictly aligned with the standard syllabus for ${ctx.gradeLevel}.
`;
	}

	prompt += `---------------------------------------------------\n`;
	return prompt;
}
