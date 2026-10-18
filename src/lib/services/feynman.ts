import { askGeminiChat, type ChatMessage } from './gemini';

export interface FeynmanTurn {
	role: 'user' | 'duck';
	text: string;
	html?: string;
	mood?: 'curious' | 'thinking' | 'skeptical' | 'enlightened' | 'mastered';
	timestamp: number;
}

export interface FeynmanScorecard {
	score: number;
	ratingLabel: string;
	nailed: string[];
	blindSpots: string[];
	goldenTakeaway: string;
	suggestedFlashcard: {
		front: string;
		back: string;
	};
}

export function buildDuckSystemPrompt(
	subject: string,
	chapter: string,
	concept: string,
	academicConstraintPrompt: string = ''
): string {
	return `You are the "Socratic Feynman Duck" (🦆), an inquisitive, intellectually rigorous rubber duck preparing for JEE Advanced (Physics, Chemistry, and Mathematics).
The user is your teacher and is trying to explain the concept "${concept}" (from ${subject} - ${chapter}) to you in simple terms from first principles.
${academicConstraintPrompt}
YOUR BEHAVIOR AND RULES:
1. NEVER deliver a lecture or explain the topic yourself. You are the student/duck, NOT the professor!
2. Jargon Police: If the user throws equations or jargon ("because of Lenz's law", "due to resonance") without explaining the physical/microscopic reason, probe them: "Wait! Why does that happen physically? What are the particles/forces actually doing?"
3. Spot Unstated Assumptions: Watch for missing constraints (e.g., ideal vs real gas, conservative field, small amplitude, non-viscous fluid, quasi-static, inertial frame).
4. Edge Case "What-If": Ask ONE concrete, thought-provoking edge-case scenario or physical thought experiment per turn to test their mental model. Keep all scenarios strictly within their grade level and tickmarked chapters!
5. Tone: Curious, respectful, sharp, slightly playful (a duck who wants to crack JEE Advanced).
6. Length: Keep responses concise (2 to 4 sentences maximum). Don't overwhelm.
7. Math Formatting: Format all math and variables with KaTeX inline \\( ... \\) or block \\[ ... \\].
8. Mood tag: ALWAYS end your response with a tag on the very last line:
[MOOD: skeptical] if they used jargon without physical intuition or missed a key assumption.
[MOOD: enlightened] if their explanation was truly first-principles, intuitive, and accurate.
[MOOD: curious] if you are exploring their premise or asking a thought experiment.`;
}

export async function askFeynmanDuck(
	history: ChatMessage[],
	subject: string,
	chapter: string,
	concept: string,
	academicConstraintPrompt: string = ''
): Promise<{ text: string; mood: 'curious' | 'skeptical' | 'enlightened' }> {
	const systemInstruction = buildDuckSystemPrompt(subject, chapter, concept, academicConstraintPrompt);
	const rawReply = await askGeminiChat(history, systemInstruction, false, true);

	// Extract mood tag if present
	const moodMatch = rawReply.match(/\[MOOD:\s*(curious|skeptical|enlightened)\]/i);
	let mood: 'curious' | 'skeptical' | 'enlightened' = 'curious';

	if (moodMatch) {
		const parsed = moodMatch[1].toLowerCase();
		if (parsed === 'skeptical' || parsed === 'enlightened' || parsed === 'curious') {
			mood = parsed;
		}
	}

	const cleanText = rawReply.replace(/\[MOOD:\s*(curious|skeptical|enlightened)\]/gi, '').trim();

	return {
		text: cleanText,
		mood
	};
}

export async function evaluateFeynmanSession(
	dialogue: { role: 'user' | 'duck'; text: string }[],
	subject: string,
	chapter: string,
	concept: string,
	academicConstraintPrompt: string = ''
): Promise<FeynmanScorecard> {
	const prompt = `STUDENT TEACHING SESSION FOR JEE ADVANCED:
Concept: ${concept}
Subject: ${subject}
Chapter: ${chapter}
${academicConstraintPrompt}
TRANSCRIPT OF EXPLANATION AND SOCRATIC DIALOGUE:
${dialogue.map((d) => `${d.role === 'user' ? 'Student (Teacher)' : 'Duck (Student)'}: ${d.text}`).join('\n\n')}

Analyze how well the student understands this concept from first principles according to their grade level.
Return STRICTLY a JSON object matching this schema:
{
  "score": 4.5,
  "ratingLabel": "Conceptual Titan",
  "nailed": ["Explained why work depends on boundary conditions", "Clear grasp of energy conservation"],
  "blindSpots": ["Missed stating whether the process was reversible or free expansion"],
  "goldenTakeaway": "Adiabatic work equals -Delta U always, but delta U only relates to delta T for ideal gases undergoing quasi-static processes.",
  "suggestedFlashcard": {
    "front": "Conceptual Trap: ${concept} - What happens during free expansion?",
    "back": "During free expansion into vacuum, P_ext = 0 so work is zero, despite delta Q = 0."
  }
}
Do not use markdown fences. Output ONLY the JSON string.`;

	const sys = `You are a JEE Advanced examiner evaluating conceptual mastery via the Feynman technique. Output ONLY valid JSON.`;

	try {
		const raw = await askGeminiChat(
			[{ role: 'user', parts: [{ text: prompt }] }],
			sys,
			true,
			true
		);
		const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
		const parsed = JSON.parse(clean);
		return {
			score: Number(parsed.score) || 3.5,
			ratingLabel: String(parsed.ratingLabel || 'Solid Intuition'),
			nailed: Array.isArray(parsed.nailed) ? parsed.nailed : ['Good overall intuition'],
			blindSpots: Array.isArray(parsed.blindSpots) ? parsed.blindSpots : ['Review subtle edge cases'],
			goldenTakeaway: String(parsed.goldenTakeaway || 'Master the first principles before applying the formula.'),
			suggestedFlashcard: parsed.suggestedFlashcard || {
				front: `Conceptual Trap: ${concept}`,
				back: 'Check assumptions and boundary conditions.'
			}
		};
	} catch (e) {
		return {
			score: 4.0,
			ratingLabel: 'Promising Understanding',
			nailed: ['Engaged in active explanation', 'Covered the foundational idea'],
			blindSpots: ['Pay extra attention to boundary conditions and unstated assumptions'],
			goldenTakeaway: `${concept}: Always verify if formulas apply under the given physical constraints.`,
			suggestedFlashcard: {
				front: `Conceptual Trap: ${concept}`,
				back: `Review first principles and edge cases for ${concept}.`
			}
		};
	}
}
