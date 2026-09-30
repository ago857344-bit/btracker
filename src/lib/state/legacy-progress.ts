import type { TrackerState } from '$lib/types/tracker';

/**
 * TrackerState sections a legacy export is allowed to overwrite. `ui`,
 * `stateVersion` and `savedAt` are always owned by this app, never imported.
 */
const IMPORTABLE_KEYS = [
	'd', 'n', 'r', 'x', 'h', 'hd', 'log', 'stat', 'marks', 'dl', 'norec', 'hwSort',
	'goals', 'col', 'bm', 'notes', 'an', 'rev', 'meta', 'lib', 'gt', 'todos', 'refl',
	'sess', 'theme', 'pom', 'chapterGrids'
] as const satisfies readonly (keyof TrackerState)[];

type ImportableKey = (typeof IMPORTABLE_KEYS)[number];

/**
 * Merges a decoded legacy export (the old tracker's `S` object) into the
 * current state. Recognized sections replace the matching ones outright;
 * anything the export does not mention is left untouched. Throws a
 * UI-displayable error when the payload carries no recognizable state.
 */
export function mergeImportedProgress(parsed: unknown, base: TrackerState): TrackerState {
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error('This code does not contain tracker progress.');
	}
	const source = parsed as Record<string, unknown>;
	const recognized = IMPORTABLE_KEYS.filter((key) => key in source);
	if (!recognized.length) {
		throw new Error('This code decoded, but none of its fields match tracker progress.');
	}
	const next = structuredClone(base);
	for (const key of recognized) (next as Record<ImportableKey, unknown>)[key] = structuredClone(source[key]);
	next.savedAt = new Date().toISOString();
	return next;
}
