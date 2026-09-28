import { createInitialTrackerState } from '$lib/state/defaults';
import type { TrackerState } from '$lib/types/tracker';

const LEGACY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-.';
const fingerprint = (value: string) => {
	let hash = 5381;
	for (const char of value) hash = (((hash << 5) + hash) + char.charCodeAt(0)) >>> 0;
	return hash.toString(36);
};

/** Reads BTracker v1–v3 save codes without executing the legacy HTML. */
export function importLegacyCode(raw: string): TrackerState {
	// NUL bytes appear when a UTF-16–saved .txt is read as UTF-8 text.
	let encoded = raw.trim().replaceAll(/[\s\u0000]+/g, '');
	if (encoded.startsWith('JEE-')) encoded = encoded.slice(4);
	let decoded: string;
	try { decoded = atob(encoded); } catch { throw new Error('This is not a valid BTracker save code.'); }
	const divider = decoded.lastIndexOf('|');
	if (divider < 0 || fingerprint(decoded.slice(0, divider)) !== decoded.slice(divider + 1)) throw new Error('The BTracker save code is incomplete or damaged.');
	const fields = decoded.slice(0, divider).split('|');
	if (!['v1', 'v2', 'v3'].includes(fields[0])) throw new Error('This save code was made by an unsupported BTracker version.');
	const next = createInitialTrackerState();
	if (fields[2]) {
		for (const segment of fields[2].split(';')) {
			const colon = segment.indexOf(':'); if (colon < 0) continue;
			const key = segment.slice(0, colon); const packed = segment.slice(colon + 1); const values: number[] = [];
			for (let index = 0; index < packed.length;) {
				const value = LEGACY_ALPHABET.indexOf(packed[index++]); if (value < 0) throw new Error('The BTracker question data is damaged.');
				let countText = ''; while (/\d/.test(packed[index] ?? '')) countText += packed[index++];
				const count = countText ? Number.parseInt(countText, 10) : 1;
				if (!Number.isSafeInteger(count) || count < 1 || count > 100_000) throw new Error('The BTracker question data is damaged.');
				values.push(...Array.from({ length: count }, () => value));
			}
			next.d[key] = values;
		}
	}
	if (fields[3]) for (const segment of fields[3].split(';')) {
		const equals = segment.indexOf('='); if (equals >= 0) next.n[segment.slice(0, equals)] = decodeURIComponent(segment.slice(equals + 1));
	}
	if (fields[4]) {
		const meta = JSON.parse(decodeURIComponent(fields[4])) as Partial<TrackerState>;
		Object.assign(next, meta, { d: next.d, n: next.n, stateVersion: 4, savedAt: new Date(Number.parseInt(fields[1], 36)).toISOString() });
	}
	return next;
}
