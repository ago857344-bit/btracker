export interface SubjectMeta {
	code: string;
	name: string;
	color: string;
	icon: 'atom' | 'bolt' | 'calculator';
}

export const SUBJECTS: SubjectMeta[] = [
	{ code: 'P', name: 'Physics', color: '#4da3ff', icon: 'atom' },
	{ code: 'C', name: 'Chemistry', color: '#ff8a3d', icon: 'bolt' },
	{ code: 'M', name: 'Maths', color: '#ff5c8a', icon: 'calculator' }
];

export const subjectMeta = (code: string | null | undefined): SubjectMeta | null =>
	SUBJECTS.find((subject) => subject.code === code) ?? null;

export const subjectName = (code: string | null | undefined) => subjectMeta(code)?.name ?? 'No Subject';
export const subjectColor = (code: string | null | undefined) => subjectMeta(code)?.color ?? '#8b87a0';

export const CHAPTERS: Record<string, string[]> = {
	P: [
		'Physical World', 'Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion',
		'Work, Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation', 'Mechanical Properties of Solids',
		'Mechanical Properties of Fluids', 'Thermal Properties of Matter', 'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves',
		'Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity', 'Moving Charges and Magnetism',
		'Magnetism and Matter', 'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves', 'Ray Optics', 'Wave Optics',
		'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'
	],
	C: [
		'Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements and Periodicity', 'Chemical Bonding and Molecular Structure',
		'States of Matter', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Hydrogen', 'The s-Block Elements', 'The p-Block Elements',
		'Organic Chemistry: Basic Principles', 'Hydrocarbons', 'Environmental Chemistry', 'Solutions', 'Electrochemistry', 'Chemical Kinetics',
		'The d- and f-Block Elements', 'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
		'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules'
	],
	M: [
		'Sets', 'Relations and Functions', 'Trigonometric Functions', 'Principle of Mathematical Induction', 'Complex Numbers and Quadratic Equations',
		'Linear Inequalities', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series', 'Straight Lines', 'Conic Sections',
		'Introduction to Three-dimensional Geometry', 'Limits and Derivatives', 'Mathematical Reasoning', 'Statistics', 'Probability',
		'Inverse Trigonometric Functions', 'Matrices', 'Determinants', 'Continuity and Differentiability', 'Application of Derivatives', 'Integrals',
		'Differential Equations', 'Vector Algebra', 'Three-dimensional Geometry', 'Linear Programming'
	]
};

export const chaptersOf = (code: string | null | undefined) => CHAPTERS[code ?? ''] ?? [];

export const TASK_COLORS = ['#6d5dfc', '#e0455a', '#d99a2b', '#2f9e6e', '#2b8ba6'];

export interface SpacingMethod {
	id: 'steady' | 'fast' | 'smart';
	name: string;
	emoji: string;
	color: string;
	formula: string;
	preview: string;
	blurb: string;
	intervals: number[] | null;
}

export const SPACING_METHODS: SpacingMethod[] = [
	{
		id: 'steady', name: 'Steady Climb', emoji: '🏔️', color: '#d99a2b', formula: 'Interval = n²',
		preview: '1d → 4d → 9d → 16d → 25d...',
		blurb: 'Gentle, sustainable spacing. Ideal for long exam prep (6–12 months). You’ll get 10–15 revisions before your exam naturally.',
		intervals: [1, 4, 9, 16]
	},
	{
		id: 'fast', name: 'Fast Track', emoji: '⚡', color: '#2f9e6e', formula: 'Interval = 2^(n-1)',
		preview: '1d → 2d → 4d → 8d → 16d...',
		blurb: 'Aggressive doubling gaps. Best for shorter prep windows or topics you already partially know.',
		intervals: [1, 2, 4, 8]
	},
	{
		id: 'smart', name: 'Smart Adapt', emoji: '🧠', color: '#8b7bff', formula: 'Adaptive EF × interval',
		preview: 'Adapts to your recall quality each time',
		blurb: 'Science-backed. After each revision you rate your recall (1–5) and the algorithm adjusts the next gap — harder chapters get shorter gaps.',
		intervals: null
	}
];

/** Days until the n-th (1-based) revision for a method; Smart Adapt falls back to SM-2-ish defaults. */
export function intervalFor(method: 'steady' | 'fast' | 'smart', step: number, ef = 2.5): number {
	if (method === 'steady') return step * step;
	if (method === 'fast') return 2 ** (step - 1);
	if (step === 1) return 1;
	if (step === 2) return 6;
	return Math.max(1, Math.round(6 * ef ** (step - 2)));
}

export const dayPartOf = (hour: number) => (hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Evening' : 'Night');
