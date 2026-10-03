import type { TrackerState } from '$lib/types/tracker';

export interface ExerciseDef {
	code: string;
	name: string;
	tag: string;
	/** Multiplier applied to the raw syllabus count (intext exercises bundle sub-parts). */
	mult?: number;
}

/** Order matters: syllabus rows list counts in exactly this order. */
export const EXERCISE_DEFS: ExerciseDef[] = [
	{ code: 'I', name: 'Intext Exercises', tag: 'In-chapter', mult: 10 },
	{ code: '1', name: 'Exercise 1', tag: 'Basics' },
	{ code: '2', name: 'Exercise 2', tag: 'Harder' },
	{ code: '3', name: 'Exercise 3', tag: 'Numericals' },
	{ code: '4', name: 'Exercise 4', tag: 'Difficult' },
	{ code: 'M', name: 'JEE Main PYQs', tag: 'Past paper' },
	{ code: 'A', name: 'JEE Advanced PYQs', tag: 'Past paper' }
];

export const WRONG_TAGS = [
	{ id: 'calc', n: 'Calculation error' },
	{ id: 'silly', n: 'Silly mistake' },
	{ id: 'meth', n: 'Wrong method' },
	{ id: 'theo', n: 'New theory' },
	{ id: 'oth', n: 'Other' }
];

/** [chapter no, chapter name, counts per EXERCISE_DEFS] */
type SyllabusRow = [number, string, ...number[]];

const BUILTIN: Record<string, { name: string; short: string; accent: string; modules: Record<number, SyllabusRow[]> }> = {
	M: {
		name: 'Mathematics', short: 'Math', accent: '#a78bfa', modules: {
			1: [
				[1, 'Basic Mathematics', 7, 55, 55, 0, 0, 6, 0],
				[2, 'Logarithms', 4, 30, 30, 15, 30, 8, 7],
				[3, 'Sequence and Series', 6, 90, 70, 15, 60, 23, 15],
				[4, 'Trigonometric Ratios and Identities', 4, 90, 60, 15, 70, 19, 9],
				[5, 'Trigonometric Equations', 2, 40, 50, 10, 55, 18, 15],
				[6, 'Solution of Triangles', 2, 50, 50, 15, 65, 10, 15],
				[7, 'Straight Lines', 6, 110, 110, 15, 70, 20, 6]
			],
			2: [
				[8, 'Sets and Relations', 1, 55, 10, 0, 0, 16, 1],
				[9, 'Quadratic Equations', 5, 80, 80, 15, 70, 18, 13],
				[10, 'Complex Numbers', 5, 90, 90, 15, 80, 20, 27],
				[11, 'Permutations and Combinations', 5, 60, 80, 15, 65, 19, 18],
				[12, 'Binomial Theorem', 4, 60, 70, 15, 65, 19, 13]
			],
			3: [
				[13, 'Circles', 6, 85, 75, 15, 65, 18, 15],
				[14, 'Parabola', 4, 70, 90, 15, 65, 18, 12],
				[15, 'Ellipse', 4, 65, 55, 15, 65, 15, 16],
				[16, 'Hyperbola', 4, 70, 50, 15, 70, 18, 16]
			],
			4: [
				[17, 'Indefinite Integration', 4, 100, 80, 15, 70, 20, 5],
				[18, 'Definite Integration', 3, 75, 95, 15, 75, 18, 31],
				[19, 'Area Under the Curve', 1, 60, 50, 15, 50, 20, 15],
				[20, 'Differential Equations', 3, 70, 70, 15, 60, 19, 18],
				[21, 'Probability', 5, 100, 70, 15, 75, 20, 36],
				[22, 'Statistics', 5.5, 65, 70, 15, 75, 17, 15]
			],
			5: [
				[23, 'Functions', 3, 40, 40, 15, 60, 20, 18],
				[24, 'Inverse Trigonometric Functions', 3, 40, 40, 15, 60, 20, 18],
				[25, 'Limits, Continuity and Differentiability', 4.5, 80, 85, 15, 75, 23, 26],
				[26, 'Methods Of Differentiation', 3, 60, 60, 15, 65, 22, 3],
				[27, 'Application of Derivatives', 4, 90, 70, 15, 75, 19, 29]
			],
			6: [
				[28, 'Determinants', 3, 45, 50, 15, 60, 26, 8],
				[29, 'Matrices', 2, 55, 55, 15, 70, 24, 24],
				[30, 'Vector Algebra', 7, 120, 70, 15, 55, 20, 27],
				[31, '3D Geometry', 4, 70, 60, 15, 70, 24, 28]
			]
		}
	},
	P: {
		name: 'Physics', short: 'Physics', accent: '#4cc9f0', modules: {
			1: [
				[1, 'Mathematics For Physics', 7, 110, 110, 15, 0, 8, 40],
				[2, 'Units, Dimensions and Measurement', 3, 70, 40, 15, 35, 17, 18],
				[3, 'Kinematics', 8, 65, 80, 15, 75, 22, 18],
				[4, "Newton's Laws of Motion", 5, 45, 45, 15, 45, 16, 5],
				[5, 'Friction', 3, 40, 45, 10, 65, 17, 8],
				[6, 'Circular Motion', 3, 35, 30, 10, 45, 16, 5]
			],
			2: [
				[7, 'Work, Power and Energy', 5, 45, 45, 15, 60, 22, 16],
				[8, 'Centre of Mass and Conservation of Momentum', 4, 35, 50, 15, 60, 23, 15],
				[9, 'Rotational Dynamics', 5, 65, 65, 15, 60, 25, 29],
				[10, 'Gravitation', 6, 45, 45, 15, 20, 20, 17],
				[11, 'Fluids', 3, 60, 40, 15, 45, 17, 17],
				[12, 'Simple Harmonic Motion', 5, 70, 60, 15, 65, 20, 22]
			],
			3: [
				[13, 'Wave Motion', 6, 75, 65, 15, 70, 20, 21],
				[14, 'Mechanical Properties of Matter', 4, 55, 50, 15, 50, 18, 14],
				[15, 'Thermal Expansion and Calorimetry', 2, 45, 30, 15, 35, 18, 8],
				[16, 'Heat Transfer', 2, 35, 50, 10, 45, 12, 17],
				[17, 'Kinetic Theory of Gases', 2, 60, 30, 10, 30, 18, 8],
				[18, 'Thermodynamics', 3, 55, 50, 15, 50, 21, 24]
			],
			4: [
				[19, 'Electrostatics', 7, 60, 65, 15, 60, 22, 29],
				[20, 'Current Electricity', 5, 55, 55, 15, 60, 24, 18],
				[21, 'Capacitance', 4, 65, 60, 15, 50, 19, 15]
			],
			5: [
				[22, 'Magnetic Field', 6, 50, 60, 15, 60, 20, 26],
				[23, 'Magnetism and Matter', 2, 40, 25, 10, 0, 10, 13],
				[24, 'Electromagnetic Induction', 4, 55, 65, 15, 55, 17, 20],
				[25, 'Alternating Current', 4, 55, 40, 15, 55, 16, 12],
				[26, 'Electromagnetic Waves', 2, 50, 35, 10, 0, 20, 2]
			],
			6: [
				[27, 'Geometrical Optics', 4, 55, 85, 15, 85, 20, 28],
				[28, 'Wave Optics', 3, 65, 50, 15, 50, 20, 13],
				[29, 'Modern Physics', 4, 80, 85, 15, 85, 26, 34],
				[30, 'Semiconductor Devices', 2, 45, 30, 10, 0, 18, 0]
			]
		}
	},
	C: {
		name: 'Chemistry', short: 'Chem', accent: '#ffa94d', modules: {
			1: [
				[1, 'Mole Concept', 5, 70, 50, 15, 60, 18, 5],
				[2, 'Atomic Structure', 8, 70, 55, 15, 70, 17, 14],
				[3, 'Periodic Structure', 6, 60, 50, 15, 60, 17, 4],
				[4, 'Chemical Bonding', 9, 70, 50, 15, 70, 24, 17],
				[5, 'Redox Reactions', 4, 55, 45, 15, 50, 15, 9],
				[6, 'Gaseous State', 6, 50, 60, 15, 60, 11, 15]
			],
			2: [
				[7, 'Thermodynamics', 8, 70, 70, 15, 65, 20, 24],
				[8, 'Chemical Equilibrium', 5, 55, 50, 15, 55, 18, 8],
				[9, 'Ionic Equilibrium', 7, 60, 55, 15, 65, 18, 14],
				[10, 'IUPAC Nomenclature', 5, 60, 55, 15, 55, 10, 7],
				[11, 'Isomerism', 5, 60, 55, 15, 75, 17, 13]
			],
			3: [
				[12, 'General Organic Chemistry', 7, 80, 60, 15, 70, 20, 10],
				[13, 'Hydrocarbons', 6, 60, 50, 15, 65, 26, 17],
				[14, 'Aromatic Compounds', 2, 40, 40, 10, 50, 20, 21],
				[15, 'Environmental Chemistry', 0, 55, 10, 50, 0, 12, 0],
				[16, 'Hydrogen and its Compounds', 1, 40, 30, 8, 40, 17, 0],
				[17, 'S-Block Elements', 3, 50, 50, 10, 55, 14, 5],
				[18, 'P-Block (part 1)', 4, 70, 55, 15, 65, 19, 12]
			],
			4: [
				[19, 'Solid State', 5, 55, 55, 15, 55, 16, 13],
				[20, 'Solutions and Colligative Properties', 5, 60, 50, 15, 55, 18, 16],
				[21, 'Electrochemistry', 6, 65, 60, 15, 75, 22, 19],
				[22, 'Chemical Kinetics', 5, 70, 55, 15, 65, 22, 20],
				[23, 'Surface Chemistry', 4, 50, 40, 15, 50, 18, 11],
				[24, 'Alkyl and Aryl Halides', 7, 70, 60, 15, 65, 22, 9]
			],
			5: [
				[25, 'Alcohol, Ethers and Phenols', 6, 65, 65, 15, 70, 19, 16],
				[26, 'Aldehydes and Ketones', 5, 60, 60, 15, 75, 19, 22],
				[27, 'Carboxylic Acid and its Derivatives', 3, 60, 55, 15, 75, 21, 21],
				[28, 'Nitrogen Containing Compounds', 3, 50, 45, 15, 75, 20, 14],
				[29, 'Biomolecules and Polymers', 2, 65, 50, 15, 70, 20, 17]
			],
			6: [
				[30, 'Principles and Practical Chemistry in Everyday Life', 3, 75, 75, 15, 75, 22, 8],
				[31, 'P-Block (part 2)', 7, 100, 100, 15, 80, 23, 25],
				[32, 'Chemistry of d and f block', 3, 65, 60, 15, 50, 17, 16],
				[33, 'Metallurgy', 3, 55, 50, 15, 60, 13, 15],
				[34, 'Coordination Compounds', 4, 65, 65, 15, 70, 21, 24],
				[35, 'Qualitative Analysis', 4, 70, 70, 15, 79, 11, 16]
			]
		}
	}
};

export interface SyllabusExercise { code: string; name: string; tag: string; base: number }
export interface SyllabusChapter { no: number; name: string; moduleId: number; exs: SyllabusExercise[] }
export interface SyllabusModule { id: number; name: string; chapters: SyllabusChapter[] }
export interface SyllabusSubject { code: string; name: string; short: string; accent: string; modules: SyllabusModule[] }

export const SUBJECT_ORDER = ['P', 'C', 'M'];

export function buildSyllabus(): SyllabusSubject[] {
	return SUBJECT_ORDER.map((code) => {
		const built = BUILTIN[code];
		const modules: SyllabusModule[] = Object.entries(built.modules)
			.map(([id, rows]) => ({
				id: Number(id),
				name: `Module ${id}`,
				chapters: rows.map((row) => ({
					no: row[0],
					name: row[1],
					moduleId: Number(id),
					exs: EXERCISE_DEFS.map((def, index) => ({
						code: def.code, name: def.name, tag: def.tag,
						base: (Number(row[index + 2]) || 0) * (def.mult || 1)
					}))
				}))
			}))
			.sort((a, b) => a.id - b.id);
		return { code, name: built.name, short: built.short, accent: built.accent, modules };
	});
}

export const SYLLABUS = buildSyllabus();

export const syllabusSubject = (code: string) => SYLLABUS.find((s) => s.code === code) ?? null;
export const syllabusModule = (code: string, id: number) => syllabusSubject(code)?.modules.find((m) => m.id === id) ?? null;
export const syllabusChapter = (code: string, no: number): SyllabusChapter | null => {
	const subject = syllabusSubject(code);
	if (!subject) return null;
	for (const module of subject.modules) {
		const chapter = module.chapters.find((c) => c.no === no);
		if (chapter) return chapter;
	}
	return null;
};
export const allChapters = (code: string) => syllabusSubject(code)?.modules.flatMap((m) => m.chapters) ?? [];

/** Question count for an exercise, honouring the user's own override. */
export function questionCount(state: TrackerState, sc: string, chNo: number, exCode: string): number {
	const key = cellKey(sc, chNo, exCode);
	const override = state.x.cnt[key];
	if (override !== undefined) return override;
	const chapter = syllabusChapter(sc, chNo);
	return chapter?.exs.find((e) => e.code === exCode)?.base ?? 0;
}

/** Exercises worth showing: anything with questions, or anything the user created a table for. */
export function visibleExercises(state: TrackerState, sc: string, chNo: number): SyllabusExercise[] {
	const chapter = syllabusChapter(sc, chNo);
	if (!chapter) return [];
	return chapter.exs.filter((ex) => {
		const override = state.x.cnt[cellKey(sc, chNo, ex.code)];
		const count = override !== undefined ? override : ex.base;
		return count > 0;
	});
}

export const cellKey = (sc: string, chNo: number, exCode: string) => `${sc}${chNo}${exCode}`;
export const questionKey = (sc: string, chNo: number, exCode: string, index: number) => `${cellKey(sc, chNo, exCode)}.${index}`;
