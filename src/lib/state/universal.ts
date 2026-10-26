import { SUBJECTS } from '$lib/state/subjects';
import type { SubjectSession, TrackerState, UniversalSource } from '$lib/types/tracker';

/** A session created through the Universal Study Log. BT bitmask sessions have no kind. */
export interface UniversalEntry extends SubjectSession {
	kind: 'universal';
	source?: UniversalSource;
	sourceName?: string;
	label?: string;
	doubt?: number;
}

export interface UniversalTotals {
	sessions: number;
	attempts: number;
	solved: number;
	doubts: number;
	accuracy: number;
}

export interface UniversalSubjectTotals extends UniversalTotals {
	code: string;
	name: string;
}

export interface UniversalChapterTotals {
	sub: string;
	ch: string;
	sessions: number;
	attempts: number;
	solved: number;
	doubts: number;
	accuracy: number;
	lastAt: number;
}

export const isUniversalEntry = (entry: SubjectSession): entry is UniversalEntry => entry.kind === 'universal';

export const universalEntries = (state: Pick<TrackerState, 'sess'>): UniversalEntry[] =>
	(state.sess ?? []).filter(isUniversalEntry);

const accuracyOf = (solved: number, attempts: number) => (attempts > 0 ? Math.round((solved / attempts) * 100) : 0);

export function universalTotals(entries: UniversalEntry[]): UniversalTotals {
	let attempts = 0;
	let solved = 0;
	let doubts = 0;
	for (const entry of entries) {
		const att = Math.max(0, Number(entry.att) || 0);
		const cor = Math.min(att, Math.max(0, Number(entry.cor) || 0));
		attempts += att;
		solved += cor;
		doubts += Math.min(cor, Math.max(0, Number(entry.doubt) || 0));
	}
	return { sessions: entries.length, attempts, solved, doubts, accuracy: accuracyOf(solved, attempts) };
}

export function universalBySubject(entries: UniversalEntry[]): UniversalSubjectTotals[] {
	return SUBJECTS.map((subject) => {
		const scoped = entries.filter((entry) => entry.sub === subject.code);
		return { code: subject.code, name: subject.name, ...universalTotals(scoped) };
	});
}

export function universalChapters(entries: UniversalEntry[]): UniversalChapterTotals[] {
	const map = new Map<string, UniversalChapterTotals>();
	for (const entry of entries) {
		const key = `${entry.sub}:${entry.ch}`;
		const current = map.get(key) ?? {
			sub: entry.sub, ch: entry.ch, sessions: 0, attempts: 0, solved: 0, doubts: 0, accuracy: 0, lastAt: 0
		};
		const att = Math.max(0, Number(entry.att) || 0);
		const cor = Math.min(att, Math.max(0, Number(entry.cor) || 0));
		current.sessions += 1;
		current.attempts += att;
		current.solved += cor;
		current.doubts += Math.min(cor, Math.max(0, Number(entry.doubt) || 0));
		current.lastAt = Math.max(current.lastAt, entry.at);
		current.accuracy = accuracyOf(current.solved, current.attempts);
		map.set(key, current);
	}
	return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
}
