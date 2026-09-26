export interface Quote { text: string; author: string }

/** Rotating study-motivation quotes, echoing BTracker's daily quote block. */
export const QUOTES: Quote[] = [
	{ text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
	{ text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
	{ text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
	{ text: 'Don’t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
	{ text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
	{ text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
	{ text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
	{ text: 'Hard work beats talent when talent doesn’t work hard.', author: 'Tim Notke' },
	{ text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
	{ text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
	{ text: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' },
	{ text: 'Great things are done by a series of small things brought together.', author: 'Vincent Van Gogh' }
];

/** Deterministic per-day pick so the quote is stable across a session. */
export function quoteForDay(date = new Date()): Quote {
	const start = new Date(date.getFullYear(), 0, 0);
	const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
	return QUOTES[dayOfYear % QUOTES.length];
}
