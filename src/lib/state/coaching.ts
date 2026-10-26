import type { CoachingType, TrackerState, UniversalSource } from '$lib/types/tracker';

export const DEFAULT_BT_NAME = 'Baktiwal Tutorials';

export const COACHING_PRESETS = [
	'Allen',
	'Resonance',
	'PW (Physics Wallah)',
	'FIITJEE',
	'Self-Study'
];

export const BOOK_SUGGESTIONS = [
	'HC Verma',
	'Cengage',
	'MS Chouhan',
	'DC Pandey',
	'NCERT',
	'Irodov'
];

export const UNIVERSAL_SOURCES: Array<{
	id: UniversalSource;
	label: string;
	short: string;
	hint: string;
}> = [
	{ id: 'coaching', label: 'Coaching Module', short: 'Module', hint: 'Class module, sheet or assignment' },
	{ id: 'dpp', label: 'DPP', short: 'DPP', hint: 'Daily practice problems' },
	{ id: 'pyq', label: 'PYQs', short: 'PYQ', hint: 'Previous-year questions' },
	{ id: 'book', label: 'Reference Book', short: 'Book', hint: 'HC Verma, Cengage, MS Chouhan…' },
	{ id: 'test', label: 'Test', short: 'Test', hint: 'Mock, weekly or part test' }
];

/** Legacy accounts have no coaching_type and must keep the native BT experience. */
export const coachingTypeOf = (state: Pick<TrackerState, 'coaching_type'> | null | undefined): CoachingType =>
	state?.coaching_type === 'GENERIC' ? 'GENERIC' : 'BT';

export const coachingNameOf = (state: Pick<TrackerState, 'coaching_type' | 'coaching_name'> | null | undefined): string => {
	const name = state?.coaching_name?.trim();
	if (name) return name;
	return coachingTypeOf(state) === 'BT' ? DEFAULT_BT_NAME : 'Other';
};

export const universalSourceOf = (id: UniversalSource | undefined) =>
	UNIVERSAL_SOURCES.find((source) => source.id === id) ?? UNIVERSAL_SOURCES[0];

export const universalSourceLabel = (id: UniversalSource | undefined) => universalSourceOf(id).label;
