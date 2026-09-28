/**
 * Parses an imported progress string in either format:
 * - new: strict JSON
 * - old: optional "z" prefix + Base64 of a URI-encoded JSON payload,
 *   optionally prefixed with an "A100," format marker, and optionally
 *   double-encoded (a JSON string containing JSON).
 */
export function parseImportedProgress<T = unknown>(raw: string): T {
	const input = raw.trim();
	if (!input) throw new Error('Nothing to import — paste a backup string or choose a file first.');

	try {
		return JSON.parse(input) as T;
	} catch {
		// not the new JSON format — fall back to the legacy encoded format
	}

	let encoded = input.replaceAll(/\s+/g, '');
	if (encoded.startsWith('z')) encoded = encoded.slice(1);

	let decoded: string;
	try {
		decoded = decodeURIComponent(atob(encoded));
	} catch {
		throw new Error('This code could not be decoded. Make sure you copied the entire code from the old tracker.');
	}

	if (decoded.startsWith('A100,')) decoded = decoded.slice('A100,'.length);

	try {
		const parsed = JSON.parse(decoded) as unknown;
		return (typeof parsed === 'string' ? JSON.parse(parsed) : parsed) as T;
	} catch {
		throw new Error('This code decoded, but its contents are damaged.');
	}
}
