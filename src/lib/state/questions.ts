import type { TrackerState } from '$lib/types/tracker';
import { allChapters, cellKey, questionCount, syllabusChapter, syllabusModule, syllabusSubject, visibleExercises } from '$lib/state/syllabus';

/* Question cell = 6 bits: done | result(2) | review | stars(2).
   result: 0 none / 1 correct / 2 wrong / 3 could not solve. */
export const isDone = (v: number) => (v & 1) === 1;
export const resultOf = (v: number) => (v >> 1) & 3;
export const isFlag = (v: number) => ((v >> 3) & 1) === 1;
export const starsOf = (v: number) => (v >> 4) & 3;
export const setDone = (v: number, on: boolean) => (v & ~1) | (on ? 1 : 0);
export const setResult = (v: number, r: number) => (v & ~6) | ((r & 3) << 1);
export const setFlag = (v: number, on: boolean) => (v & ~8) | (on ? 8 : 0);
export const setStars = (v: number, s: number) => (v & ~48) | ((s & 3) << 4);

export interface QuestionStats { n: number; done: number; correct: number; wrong: number; cant: number; flag: number }
const blankStats = (): QuestionStats => ({ n: 0, done: 0, correct: 0, wrong: 0, cant: 0, flag: 0 });
const addTo = (target: QuestionStats, add: QuestionStats) => {
	target.n += add.n; target.done += add.done; target.correct += add.correct;
	target.wrong += add.wrong; target.cant += add.cant; target.flag += add.flag;
	return target;
};

export const pctOf = (st: QuestionStats) => (st.n ? Math.round((st.done / st.n) * 100) : 0);
export const accuracyOf = (st: QuestionStats) => (st.correct + st.wrong ? Math.round((st.correct / (st.correct + st.wrong)) * 100) : null);

export function exerciseStats(state: TrackerState, sc: string, chNo: number, exCode: string): QuestionStats {
	const st = blankStats();
	st.n = questionCount(state, sc, chNo, exCode);
	const cells = state.d[cellKey(sc, chNo, exCode)];
	if (!cells) return st;
	for (let i = 0; i < st.n; i++) {
		const v = cells[i] || 0;
		if (isDone(v)) st.done += 1;
		const r = resultOf(v);
		if (r === 1) st.correct += 1; else if (r === 2) st.wrong += 1; else if (r === 3) st.cant += 1;
		if (isFlag(v)) st.flag += 1;
	}
	return st;
}

export function chapterStats(state: TrackerState, sc: string, chNo: number): QuestionStats {
	const total = blankStats();
	for (const ex of visibleExercises(state, sc, chNo)) addTo(total, exerciseStats(state, sc, chNo, ex.code));
	return total;
}

export function moduleStats(state: TrackerState, sc: string, moduleId: number): QuestionStats {
	const total = blankStats();
	for (const chapter of syllabusModule(sc, moduleId)?.chapters ?? []) addTo(total, chapterStats(state, sc, chapter.no));
	return total;
}

export function subjectStats(state: TrackerState, sc: string): QuestionStats {
	const total = blankStats();
	for (const chapter of allChapters(sc)) addTo(total, chapterStats(state, sc, chapter.no));
	return total;
}

export function logTotals(state: TrackerState): QuestionStats {
	const total = blankStats();
	for (const subject of ['P', 'C', 'M']) addTo(total, subjectStats(state, subject));
	return total;
}

/** Mosaic cell classes for a chapter/exercise preview, one per question. */
export function cellClasses(state: TrackerState, sc: string, chNo: number, exCode: string): string[] {
	const n = questionCount(state, sc, chNo, exCode);
	const cells = state.d[cellKey(sc, chNo, exCode)] ?? [];
	const out: string[] = [];
	for (let i = 0; i < n; i++) {
		const v = cells[i] || 0;
		const r = resultOf(v);
		let cls = r === 1 ? 'c' : r === 2 ? 'w' : r === 3 ? 'x' : isDone(v) ? 'd' : '';
		if (isFlag(v)) cls += ' f';
		out.push(cls);
	}
	return out;
}

export interface RangeParse { list: number[]; error: string | null }

/** "4, 7, 8-9, 45-60" → zero-based indices; errors name the offending part. */
export function parseRange(input: string, max: number): RangeParse {
	const parts = String(input).split(',').map((p) => p.trim()).filter(Boolean);
	if (!parts.length) return { list: [], error: 'Type a question range, like 20-30.' };
	const out: number[] = [];
	const bad: string[] = [];
	for (const part of parts) {
		const match = part.match(/^(\d+)\s*(?:[-–—to]+\s*(\d+))?$/i);
		if (!match) return { list: [], error: `"${part}" is not a range. Use 20-30, or 12, or 20-30, 45.` };
		let a = parseInt(match[1], 10);
		let b = match[2] ? parseInt(match[2], 10) : a;
		if (a > b) { const t = a; a = b; b = t; }
		if (a < 1) return { list: [], error: 'Question numbers start at 1.' };
		if (b > max) bad.push(part);
		for (let i = a; i <= b; i++) out.push(i - 1);
	}
	if (bad.length) return { list: [], error: `This exercise has ${max} questions, so ${bad.join(', ')} is outside it.` };
	return { list: [...new Set(out)].sort((x, y) => x - y), error: null };
}

/** Zero-based indices back to a compact "1-3, 7" string. */
export function toRange(indices: number[]): string {
	if (!indices.length) return '';
	const sorted = [...indices].sort((a, b) => a - b);
	const out: string[] = [];
	let a = sorted[0]; let p = sorted[0];
	for (let i = 1; i <= sorted.length; i++) {
		if (i < sorted.length && sorted[i] === p + 1) { p = sorted[i]; continue; }
		out.push(a === p ? String(a + 1) : `${a + 1}-${p + 1}`);
		a = sorted[i]; p = sorted[i];
	}
	return out.join(',');
}

export const chapterTitle = (sc: string, chNo: number) => {
	const chapter = syllabusChapter(sc, chNo);
	return chapter ? `${chapter.no}. ${chapter.name}` : '';
};
export const subjectShort = (sc: string) => syllabusSubject(sc)?.short ?? sc;
