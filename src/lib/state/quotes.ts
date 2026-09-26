export interface Quote { text: string; author: string }

/** Rotating JEE study-motivation quotes. */
export const QUOTES: Quote[] = [
	{ text: 'Do not read physics just to clear IIT-JEE. Read it to enjoy the subject and understand nature; the exam will automatically take care of itself.', author: 'Dr. H.C. Verma' },
	{ text: 'Motivation will get you to the study table for two days, but only pure discipline will get you into an IIT.', author: 'Nitin Vijay (NV Sir)' },
	{ text: 'Speed in JEE is a byproduct of accuracy, and accuracy is a byproduct of crystal-clear concepts. Never chase speed first.', author: 'Ashish Arora' },
	{ text: 'In JEE Advanced, the examiner is not trying to find out what you know; they are trying to expose what you do not know. Absolute clarity of basic concepts is your only shield.', author: 'V.K. Bansal' },
	{ text: 'The lower you fall in your defeat, the higher you will rise in your success.', author: 'Alakh Pandey' },
	{ text: 'Your JEE rank is directly proportional to the number of times you revise. Studying new things will give you knowledge, but only revision will give you a rank.', author: 'Nitin Vijay (NV Sir)' },
	{ text: 'Focus less on course content and more on the beauty of Science and Engineering. There lies the route to Success.', author: 'Dr. H.C. Verma' },
	{ text: 'If your target is the 10th mile, aim for the 11th mile.', author: 'Anand Kumar' },
	{ text: 'Don\'t let a mock test score decide your final destiny. The mistakes you make in the test series are your biggest teachers for the final day.', author: 'Brijesh Maheshwari (BM Sir)' },
	{ text: 'Cracking IIT won\'t guarantee that all of life\'s problems are solved, but the brutal hard work you put into this preparation will teach you how to fight any battle in life.', author: 'Alakh Pandey' },
	{ text: 'Mathematics is not just a subject for JEE; it is the language you need to survive Physics and Chemistry.', author: 'V.K. Bansal' },
	{ text: 'The IIT exam doesn\'t care about your background. It only respects your logic and your persistence.', author: 'Anand Kumar' }
];

/** Deterministic per-day pick so the quote is stable across a session. */
export function quoteForDay(date = new Date()): Quote {
	const start = new Date(date.getFullYear(), 0, 0);
	const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
	return QUOTES[dayOfYear % QUOTES.length];
}
