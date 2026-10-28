import { browser } from '$app/environment';
import { getSupabase, supabaseConfigured } from '$lib/services/supabase';
import type { DumpSection, DumpFileMeta } from '$lib/types/tracker';
import JSZip from 'jszip';

export const DUMP_BUCKET = 'study-dump';

export const SECTION_CONFIG: Record<DumpSection, { label: string; name: string; color: string; desc: string }> = {
	P: { label: 'P', name: 'Physics', color: '#38bdf8', desc: 'Mechanics, Electrodynamics, Optics & Modern' },
	C: { label: 'C', name: 'Chemistry', color: '#34d399', desc: 'Organic, Inorganic & Physical Chemistry' },
	M: { label: 'M', name: 'Maths', color: '#f472b6', desc: 'Calculus, Algebra, Coordinate & Vectors' },
	others: { label: 'Others', name: 'General & Others', color: '#a78bfa', desc: 'Formula sheets, DPPs, Mock papers, General' }
};

const IDB_NAME = 'btracker-study-dump';
const IDB_STORE = 'zips';

function openDumpDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!browser) return reject(new Error('Browser only'));
		const req = indexedDB.open(IDB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(IDB_STORE)) {
				db.createObjectStore(IDB_STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** Local IndexedDB fallback operations */
async function getLocalZip(key: string): Promise<Blob | null> {
	if (!browser) return null;
	try {
		const db = await openDumpDb();
		return new Promise((resolve) => {
			const tx = db.transaction(IDB_STORE, 'readonly');
			const req = tx.objectStore(IDB_STORE).get(key);
			req.onsuccess = () => resolve((req.result as Blob) ?? null);
			req.onerror = () => resolve(null);
		});
	} catch {
		return null;
	}
}

async function setLocalZip(key: string, blob: Blob): Promise<void> {
	if (!browser) return;
	try {
		const db = await openDumpDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, 'readwrite');
			tx.objectStore(IDB_STORE).put(blob, key);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch (e) {
		console.warn('Failed to cache zip locally:', e);
	}
}

async function deleteLocalZip(key: string): Promise<void> {
	if (!browser) return;
	try {
		const db = await openDumpDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, 'readwrite');
			tx.objectStore(IDB_STORE).delete(key);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	} catch {}
}

export function getSectionStoragePath(userId: string, section: DumpSection): string {
	const sanitizedUser = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
	return `${sanitizedUser}/${section.toLowerCase()}.zip`;
}

/**
 * Fetch a section's ZIP archive.
 * @param preferLocal - If true (default), prefers local cache for write operations.
 *                      If false, prefers cloud for sync operations.
 */
export async function fetchSectionZip(
	userId: string,
	section: DumpSection,
	preferLocal = true
): Promise<Blob | null> {
	if (!browser) return null;
	const localKey = `${userId || 'guest'}_${section.toLowerCase()}`;
	const sb = getSupabase();

	// Helper to migrate legacy/guest default_vault if localKey has no archive
	const getMigratedLocalBlob = async (): Promise<Blob | null> => {
		let localBlob = await getLocalZip(localKey);
		if (!localBlob && userId && userId !== 'default_vault' && userId !== 'guest') {
			const guestKey = `default_vault_${section.toLowerCase()}`;
			const guestBlob = await getLocalZip(guestKey);
			if (guestBlob) {
				await setLocalZip(localKey, guestBlob);
				localBlob = guestBlob;
			}
		}
		return localBlob;
	};

	if (preferLocal) {
		// Prefer local cache — it has the most complete version from the last upload
		const localBlob = await getMigratedLocalBlob();
		if (localBlob) return localBlob;
	}

	// Try cloud
	if (sb) {
		try {
			const path = getSectionStoragePath(userId, section);
			const { data, error } = await sb.storage.from(DUMP_BUCKET).download(path);
			if (!error && data) {
				return data;
			}
		} catch (cloudErr) {
			console.warn(`Supabase cloud fetch failed for section ${section}:`, cloudErr);
		}
	}

	if (!preferLocal) {
		// Fallback to local if cloud failed and we prefer cloud
		return getMigratedLocalBlob();
	}

	return null;
}

/**
 * Save a section's ZIP archive.
 * Always saves to IndexedDB and tries to push to Supabase Storage if configured.
 */
export async function saveSectionZip(
	userId: string,
	section: DumpSection,
	zipBlob: Blob
): Promise<{ cloudSynced: boolean; cloudError?: string }> {
	if (!browser) return { cloudSynced: false };
	const localKey = `${userId || 'guest'}_${section.toLowerCase()}`;
	await setLocalZip(localKey, zipBlob);

	const sb = getSupabase();
	if (!sb) {
		return { cloudSynced: false, cloudError: 'Cloud credentials not configured in .env' };
	}

	try {
		const path = getSectionStoragePath(userId, section);
		const { error } = await sb.storage.from(DUMP_BUCKET).upload(path, zipBlob, {
			upsert: true,
			contentType: 'application/zip',
			cacheControl: '3600'
		});

		if (error) {
			return { cloudSynced: false, cloudError: error.message };
		}
		return { cloudSynced: true };
	} catch (err: any) {
		return { cloudSynced: false, cloudError: err?.message || String(err) };
	}
}

export interface SectionManifest {
	section: DumpSection;
	updatedAt: number;
	files: DumpFileMeta[];
}

/**
 * Parse the manifest.json stored inside a section's ZIP.
 */
export async function readManifestFromZip(zipBlob: Blob): Promise<SectionManifest | null> {
	try {
		const zip = await JSZip.loadAsync(zipBlob);
		const manifestEntry = zip.file('manifest.json');
		if (!manifestEntry) return null;
		const text = await manifestEntry.async('string');
		return JSON.parse(text) as SectionManifest;
	} catch {
		return null;
	}
}

/**
 * Upload one or multiple files into a section's ZIP archive on Supabase Storage.
 */
export async function uploadFilesToSection(
	userId: string,
	section: DumpSection,
	filesToUpload: { file: File; notes?: string; tags?: string[] }[],
	existingMetaList: DumpFileMeta[] = []
): Promise<{
	addedMetas: DumpFileMeta[];
	allSectionMetas: DumpFileMeta[];
	zipSize: number;
	cloudSynced: boolean;
	cloudError?: string;
}> {
	if (!browser) throw new Error('Browser only');

	// 1. Load or initialize ZIP
	const existingBlob = await fetchSectionZip(userId, section);
	let zip = new JSZip();
	let currentManifest: SectionManifest = {
		section,
		updatedAt: Date.now(),
		files: existingMetaList.filter((f) => f.section === section)
	};

	if (existingBlob) {
		try {
			zip = await JSZip.loadAsync(existingBlob);
			const internalManifest = await readManifestFromZip(existingBlob);
			if (internalManifest?.files?.length) {
				currentManifest = internalManifest;
			}
		} catch (e) {
			console.warn('Could not parse existing section zip, creating new one', e);
		}
	}

	// Merge any files present in the cloud ZIP that are missing locally to prevent cross-device overwrites
	const sb = getSupabase();
	if (sb) {
		try {
			const path = getSectionStoragePath(userId, section);
			const { data: cloudData, error: cloudErr } = await sb.storage.from(DUMP_BUCKET).download(path);
			if (!cloudErr && cloudData) {
				const cloudZip = await JSZip.loadAsync(cloudData);
				const cloudManifest = await readManifestFromZip(cloudData);
				if (cloudManifest?.files?.length) {
					for (const cFile of cloudManifest.files) {
						const existsLocally = currentManifest.files.some((f) => f.name.toLowerCase() === cFile.name.toLowerCase());
						if (!existsLocally) {
							const zipFile = cloudZip.file(cFile.name);
							if (zipFile) {
								const bytes = await zipFile.async('uint8array');
								zip.file(cFile.name, bytes);
								currentManifest.files.push(cFile);
							}
						}
					}
				}
			}
		} catch (mergeErr) {
			console.warn('Failed merging cloud zip before upload:', mergeErr);
		}
	}

	const addedMetas: DumpFileMeta[] = [];

	// 2. Add each file to the zip
	for (const item of filesToUpload) {
		const file = item.file;
		const id = `dump_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

		// Clean filename and handle collision
		let safeName = file.name.trim();
		const nameCollides = currentManifest.files.some((f) => f.name.toLowerCase() === safeName.toLowerCase());
		if (nameCollides) {
			const dotIdx = safeName.lastIndexOf('.');
			if (dotIdx > 0) {
				safeName = `${safeName.slice(0, dotIdx)}_${Date.now().toString().slice(-4)}${safeName.slice(dotIdx)}`;
			} else {
				safeName = `${safeName}_${Date.now().toString().slice(-4)}`;
			}
		}

		// Add binary content to zip
		zip.file(safeName, file);

		const meta: DumpFileMeta = {
			id,
			name: safeName,
			section,
			size: file.size,
			mimeType: file.type || guessMimeType(safeName),
			uploadedAt: Date.now(),
			tags: item.tags || [],
			notes: item.notes || ''
		};

		addedMetas.push(meta);
		currentManifest.files.push(meta);
	}

	currentManifest.updatedAt = Date.now();

	// 3. Update manifest inside zip
	zip.file('manifest.json', JSON.stringify(currentManifest, null, 2));

	// 4. Generate compressed ZIP Blob
	const zipBlob = await zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE',
		compressionOptions: { level: 9 }
	});

	// 5. Persist to Cloud Storage / IndexedDB
	const { cloudSynced, cloudError } = await saveSectionZip(userId, section, zipBlob);

	return {
		addedMetas,
		allSectionMetas: currentManifest.files,
		zipSize: zipBlob.size,
		cloudSynced,
		cloudError
	};
}

/**
 * Extract a single file from the section's ZIP in memory for preview or download.
 * Keeps nothing on disk — creates a temporary ephemeral in-memory Blob.
 */
export async function extractFileFromSection(
	userId: string,
	section: DumpSection,
	fileName: string
): Promise<{ blob: Blob; mimeType: string } | null> {
	if (!browser) return null;
	const zipBlob = await fetchSectionZip(userId, section);
	if (!zipBlob) return null;

	try {
		const zip = await JSZip.loadAsync(zipBlob);
		let fileEntry = zip.file(fileName);
		if (!fileEntry) {
			const lowerName = fileName.toLowerCase().trim();
			const allFiles = Object.keys(zip.files);
			const match = allFiles.find(
				(k) => !zip.files[k].dir && (k.toLowerCase().trim() === lowerName || k.trim() === fileName.trim())
			);
			if (match) fileEntry = zip.file(match);
		}
		if (!fileEntry) return null;

		const mime = guessMimeType(fileName);
		const extractedBlob = await fileEntry.async('blob');
		return {
			blob: new Blob([extractedBlob], { type: mime }),
			mimeType: mime
		};
	} catch (e) {
		console.error('Failed to extract file from zip:', e);
		return null;
	}
}

/**
 * Delete a file from the section's ZIP and re-save the updated archive.
 */
export async function deleteFileFromSection(
	userId: string,
	section: DumpSection,
	fileName: string,
	currentMetas: DumpFileMeta[]
): Promise<{
	remainingMetas: DumpFileMeta[];
	zipSize: number;
	cloudSynced: boolean;
	cloudError?: string;
}> {
	if (!browser) throw new Error('Browser only');
	const zipBlob = await fetchSectionZip(userId, section);
	if (!zipBlob) {
		return {
			remainingMetas: currentMetas.filter((f) => !(f.section === section && f.name === fileName)),
			zipSize: 0,
			cloudSynced: true
		};
	}

	const zip = await JSZip.loadAsync(zipBlob);
	zip.remove(fileName);

	const remainingMetas = currentMetas.filter((f) => !(f.section === section && f.name === fileName));
	const manifest: SectionManifest = {
		section,
		updatedAt: Date.now(),
		files: remainingMetas.filter((f) => f.section === section)
	};

	let zipBlobUpdated: Blob;
	if (manifest.files.length === 0) {
		// All files removed from section: clean up
		await deleteLocalZip(`${userId || 'guest'}_${section.toLowerCase()}`);
		const sb = getSupabase();
		if (sb) {
			try {
				await sb.storage.from(DUMP_BUCKET).remove([getSectionStoragePath(userId, section)]);
			} catch {}
		}
		return { remainingMetas, zipSize: 0, cloudSynced: true };
	} else {
		zip.file('manifest.json', JSON.stringify(manifest, null, 2));
		zipBlobUpdated = await zip.generateAsync({
			type: 'blob',
			compression: 'DEFLATE',
			compressionOptions: { level: 9 }
		});
		const { cloudSynced, cloudError } = await saveSectionZip(userId, section, zipBlobUpdated);
		return {
			remainingMetas,
			zipSize: zipBlobUpdated.size,
			cloudSynced,
			cloudError
		};
	}
}

/**
 * Download the full bundled section ZIP file to the user's computer.
 */
export async function downloadSectionZipArchive(userId: string, section: DumpSection): Promise<void> {
	if (!browser) return;
	const zipBlob = await fetchSectionZip(userId, section);
	if (!zipBlob) {
		throw new Error(`No files found for section ${SECTION_CONFIG[section].name}`);
	}

	const url = URL.createObjectURL(zipBlob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${SECTION_CONFIG[section].name.toLowerCase()}_study_dump.zip`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Sync / Pull files from Supabase Storage for all sections.
 * This enables cross-device retrieval! When user logs in on a new laptop/phone,
 * this inspects the Supabase bucket for each section ZIP, extracts the manifests,
 * and restores the complete index into the user's tracker state.
 */
export async function syncFromCloudStorage(userId: string): Promise<{
	files: DumpFileMeta[];
	sectionSizes: Partial<Record<DumpSection, number>>;
	syncedSections: DumpSection[];
}> {
	if (!browser) return { files: [], sectionSizes: {}, syncedSections: [] };
	const sb = getSupabase();
	const sections: DumpSection[] = ['P', 'C', 'M', 'others'];
	const allFiles: DumpFileMeta[] = [];
	const sectionSizes: Partial<Record<DumpSection, number>> = {};
	const syncedSections: DumpSection[] = [];

	for (const section of sections) {
		const zipBlob = await fetchSectionZip(userId, section, false); // prefer cloud for sync
		if (zipBlob) {
			sectionSizes[section] = zipBlob.size;
			syncedSections.push(section);
			const manifest = await readManifestFromZip(zipBlob);
			if (manifest?.files) {
				allFiles.push(...manifest.files);
			}
		}
	}

	return { files: allFiles, sectionSizes, syncedSections };
}

/**
 * Guess MIME type from file extension
 */
export function guessMimeType(fileName: string): string {
	const ext = fileName.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'pdf':
			return 'application/pdf';
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'webp':
			return 'image/webp';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		case 'txt':
		case 'md':
			return 'text/plain';
		case 'json':
			return 'application/json';
		case 'zip':
			return 'application/zip';
		case 'doc':
		case 'docx':
			return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		default:
			return 'application/octet-stream';
	}
}

/**
 * Format bytes to human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
	if (!bytes || bytes <= 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
