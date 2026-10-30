import { browser } from '$app/environment';
import { dayKeyOf, sessionDayKey } from '$lib/state/dates';
import type { TrackerState, StateSnapshot } from '$lib/types/tracker';
import { calculateStreakDays } from '$lib/stores/tracker';

const DB_NAME = 'btracker-next';
const DB_VERSION = 3;
const STORE = 'documents';
const KEY = 'primary';
const SNAPSHOT_STORE = 'snapshots';
const RECOVERY_STORE = 'recovery';
const RECOVERY_ID = 'latest';

const EMERGENCY_DB = 'btracker_idb_store';
const EMERGENCY_STORE = 'state';

const FALLBACK_KEY = 'btracker_fallback_state';
export const RECOVERY_KEY = 'btracker_recovery_snapshot';

const tauriAvailable = () => browser && '__TAURI_INTERNALS__' in window;

async function browserDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
			if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
			if (!db.objectStoreNames.contains(RECOVERY_STORE)) db.createObjectStore(RECOVERY_STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function browserLoad() {
	const db = await browserDb();
	return new Promise<TrackerState | null>((resolve, reject) => {
		const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
		request.onsuccess = () => resolve((request.result as TrackerState | undefined) ?? null);
		request.onerror = () => reject(request.error);
	});
}

async function browserSave(state: TrackerState) {
	const db = await browserDb();
	return new Promise<void>((resolve, reject) => {
		const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(state, KEY);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

/* ------------------------------------------------------------------ *
 * Emergency mirror — a second IndexedDB database that survives quota
 * pressure on the primary document store.
 * ------------------------------------------------------------------ */

async function emergencyDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(EMERGENCY_DB, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(EMERGENCY_STORE)) db.createObjectStore(EMERGENCY_STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function mirrorToEmergencyDb(state: TrackerState): Promise<boolean> {
	try {
		const db = await emergencyDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(EMERGENCY_STORE, 'readwrite');
			tx.objectStore(EMERGENCY_STORE).put(state, KEY);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
		return true;
	} catch {
		return false;
	}
}

async function loadEmergencyMirror(): Promise<TrackerState | null> {
	const db = await emergencyDb();
	return new Promise<TrackerState | null>((resolve, reject) => {
		const request = db.transaction(EMERGENCY_STORE, 'readonly').objectStore(EMERGENCY_STORE).get(KEY);
		request.onsuccess = () => resolve((request.result as TrackerState | undefined) ?? null);
		request.onerror = () => reject(request.error);
	});
}

/* ------------------------------------------------------------------ *
 * Quota protection
 * ------------------------------------------------------------------ */

let storageNotice: string | null = null;

/** Returns (and clears) a one-shot notice describing the last quota recovery. */
export function consumeStorageNotice(): string | null {
	const notice = storageNotice;
	storageNotice = null;
	return notice;
}

export function isQuotaError(error: unknown): boolean {
	if (!error) return false;
	const name = (error as { name?: string }).name;
	const code = (error as { code?: number }).code;
	return (
		name === 'QuotaExceededError' ||
		name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
		code === 22 ||
		code === 1014
	);
}

/** Base64 wallpapers and data-URL videos blow the storage budget without adding study data. */
function stripBloat(state: TrackerState): TrackerState {
	const clone = structuredClone(state);
	const heavy = (val: unknown): boolean =>
		typeof val === 'string' &&
		(val.startsWith('data:video/') || (val.startsWith('data:') && val.length > 500_000));
	if (clone.ui?.wallpaper && heavy(clone.ui.wallpaper)) clone.ui.wallpaper = null;
	if (clone.ui?.wallpaperHistory) {
		clone.ui.wallpaperHistory = clone.ui.wallpaperHistory.filter((wp) => typeof wp === 'string' && !heavy(wp));
	}
	return clone;
}

/**
 * Drops aged/transient records so a write can squeeze into a full quota.
 * Only ever removes data that is already superseded or past its retention window.
 */
export function pruneForStorage(state: TrackerState): { state: TrackerState; pruned: boolean } {
	const clone = structuredClone(state);
	const yearCutoff = dayKeyOf(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
	const tombstoneCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
	const reminderCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
	let pruned = false;

	const log = (clone.log || []).filter((session) => {
		const keep = sessionDayKey(session) >= yearCutoff;
		if (!keep) pruned = true;
		return keep;
	});
	if (log.length !== (clone.log || []).length) clone.log = log;

	for (const day of Object.keys(clone.stat || {})) {
		if (day < yearCutoff) {
			delete clone.stat[day];
			pruned = true;
		}
	}

	if (clone.rev?.dailyHeatmap) {
		for (const day of Object.keys(clone.rev.dailyHeatmap)) {
			if (day < yearCutoff) {
				delete clone.rev.dailyHeatmap[day];
				pruned = true;
			}
		}
	}

	if (clone.customReminders) {
		const kept = clone.customReminders.filter((reminder) => {
			const stale = reminder.dismissed && (reminder.updatedAt || 0) < reminderCutoff;
			if (stale) pruned = true;
			return !stale;
		});
		if (kept.length !== clone.customReminders.length) clone.customReminders = kept;
	}

	for (const map of [clone.deletedIds, clone.deletedTodos]) {
		if (!map) continue;
		for (const id of Object.keys(map)) {
			if (map[id] < tombstoneCutoff) {
				delete map[id];
				pruned = true;
			}
		}
	}

	return { state: clone, pruned };
}

/** Clears disposable localStorage caches. Never touches study data or user notes. */
function pruneTransientLocalStorage(): boolean {
	if (!browser) return false;
	let removed = false;
	for (const key of ['btracker_recent_lectures', 'btracker_pwa_last_prompt']) {
		try {
			if (localStorage.getItem(key) !== null) {
				localStorage.removeItem(key);
				removed = true;
			}
		} catch {}
	}
	return removed;
}

/**
 * Last-resort persistence path: localStorage, then a pruned retry, then the
 * emergency IndexedDB mirror. Every branch is guarded so a full disk can never
 * throw into the save loop.
 */
async function persistFallback(state: TrackerState): Promise<void> {
	const clean = stripBloat(state);
	try {
		localStorage.setItem(FALLBACK_KEY, JSON.stringify(clean));
		return;
	} catch (error) {
		if (!isQuotaError(error)) {
			console.warn('localStorage fallback failed:', error);
		}
	}

	pruneTransientLocalStorage();
	const { state: pruned, pruned: didPrune } = pruneForStorage(clean);
	try {
		localStorage.setItem(FALLBACK_KEY, JSON.stringify(pruned));
		if (didPrune) storageNotice = 'Storage nearly full — archived older temporary cache';
		return;
	} catch (error) {
		if (!isQuotaError(error)) console.warn('Pruned fallback write failed:', error);
	}

	if (await mirrorToEmergencyDb(pruned)) {
		storageNotice = 'Storage nearly full — full state mirrored to the local archive';
	} else {
		storageNotice = 'Storage is full — could not save locally';
	}
}

let lastAutoSnapshot = 0;

export async function loadTrackerState(): Promise<TrackerState | null> {
	if (!browser) return null;
	if (tauriAvailable()) {
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			return await invoke<TrackerState | null>('load_state');
		} catch (e) {
			console.warn('Tauri load_state failed, falling back:', e);
		}
	}
	try {
		const res = await browserLoad();
		if (res) return res;
	} catch (e) {
		console.warn('IndexedDB browserLoad failed:', e);
	}
	// Fallback to localStorage in case IndexedDB was unavailable or threw an error
	try {
		const raw = localStorage.getItem(FALLBACK_KEY);
		if (raw) return JSON.parse(raw);
	} catch {}
	try {
		const emergency = await loadEmergencyMirror();
		if (emergency) return emergency;
	} catch {}
	return null;
}

export async function saveTrackerState(state: TrackerState): Promise<void> {
	if (!browser) return;
	if (tauriAvailable()) {
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			await invoke('save_state', { state });
			return;
		} catch (e) {
			console.warn('Tauri save_state failed, falling back to browser storage:', e);
		}
	}
	try {
		await browserSave(state);
	} catch (e) {
		console.error('IndexedDB browserSave failed, saving emergency copy:', e);
		await persistFallback(state);
	}

	// Automatically create a rolling local snapshot every 30 minutes
	const now = Date.now();
	if (now - lastAutoSnapshot > 30 * 60 * 1000) {
		lastAutoSnapshot = now;
		void takeSnapshot(state, undefined, 'Auto Snapshot').catch(() => {});
	}
}

/* ------------------------------------------------------------------ *
 * Local Snapshot Vault (Rolling Backups & One-Click Restore)
 * ------------------------------------------------------------------ */

export async function takeSnapshot(
	state: TrackerState,
	label?: string,
	reason: string = 'Manual'
): Promise<StateSnapshot> {
	if (!browser) throw new Error('Browser only');
	const db = await browserDb();

	let qCount = 0;
	if (state.d) {
		for (const arr of Object.values(state.d)) {
			if (Array.isArray(arr)) {
				for (const cell of arr) if ((cell & 1) === 1) qCount++;
			}
		}
	}

	const clonedState = stripBloat(state);

	const snap: StateSnapshot = {
		id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
		timestamp: Date.now(),
		label: label || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
		reason,
		questionCount: qCount,
		testCount: state.mocks?.length || 0,
		streak: calculateStreakDays(state),
		state: clonedState
	};

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
		tx.objectStore(SNAPSHOT_STORE).put(snap);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});

	// Prune old snapshots beyond 15
	try {
		const all = await listSnapshots();
		if (all.length > 15) {
			const toRemove = all.slice(15);
			const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
			const store = tx.objectStore(SNAPSHOT_STORE);
			for (const old of toRemove) store.delete(old.id);
		}
	} catch {}

	return snap;
}

export async function listSnapshots(): Promise<Omit<StateSnapshot, 'state'>[]> {
	if (!browser) return [];
	const db = await browserDb();
	return new Promise((resolve) => {
		try {
			const request = db.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).getAll();
			request.onsuccess = () => {
				const res = (request.result as StateSnapshot[]) || [];
				const light = res.map(({ state, ...meta }) => meta).sort((a, b) => b.timestamp - a.timestamp);
				resolve(light);
			};
			request.onerror = () => resolve([]);
		} catch {
			resolve([]);
		}
	});
}

export async function restoreSnapshot(id: string): Promise<TrackerState | null> {
	if (!browser) return null;
	const db = await browserDb();
	return new Promise<TrackerState | null>((resolve, reject) => {
		const request = db.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(id);
		request.onsuccess = () => resolve((request.result as StateSnapshot | undefined)?.state ?? null);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteSnapshot(id: string): Promise<void> {
	if (!browser) return;
	const db = await browserDb();
	return new Promise<void>((resolve, reject) => {
		const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
		tx.objectStore(SNAPSHOT_STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

/* ------------------------------------------------------------------ *
 * Recovery snapshot — written before every destructive replacement so an
 * accidental import/reset is always reversible.
 * ------------------------------------------------------------------ */

export interface RecoverySnapshotMeta {
	timestamp: number;
	reason: string;
	storedIn: 'localStorage' | 'indexedDB';
	questionCount: number;
	streak: number;
}

async function writeRecoveryToDb(state: TrackerState, meta: RecoverySnapshotMeta): Promise<boolean> {
	try {
		const db = await browserDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(RECOVERY_STORE, 'readwrite');
			tx.objectStore(RECOVERY_STORE).put({ ...meta, state }, RECOVERY_ID);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		return true;
	} catch (e) {
		console.warn('Recovery snapshot (IndexedDB) failed:', e);
		return false;
	}
}

/** Saves the current state before a destructive action. Returns false when nothing could be stored. */
export async function captureRecoverySnapshot(state: TrackerState, reason: string): Promise<boolean> {
	if (!browser) return false;
	const clean = stripBloat(state);
	let questionCount = 0;
	for (const arr of Object.values(state.d || {})) {
		if (!Array.isArray(arr)) continue;
		for (const cell of arr) if ((cell & 1) === 1) questionCount++;
	}
	const meta: RecoverySnapshotMeta = {
		timestamp: Date.now(),
		reason,
		storedIn: 'indexedDB',
		questionCount,
		streak: calculateStreakDays(state)
	};

	const inDb = await writeRecoveryToDb(clean, meta);

	// A lightweight mirror keeps the snapshot discoverable without re-opening IDB.
	try {
		localStorage.setItem(RECOVERY_KEY, JSON.stringify({ ...meta, state: null }));
	} catch {
		// Metadata-only write can still hit quota; the IndexedDB copy is authoritative.
	}

	return inDb;
}

export async function getRecoverySnapshotMeta(): Promise<RecoverySnapshotMeta | null> {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(RECOVERY_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<RecoverySnapshotMeta>;
			if (parsed && typeof parsed.timestamp === 'number') {
				return {
					timestamp: parsed.timestamp,
					reason: parsed.reason || 'Unknown',
					storedIn: parsed.storedIn === 'localStorage' ? 'localStorage' : 'indexedDB',
					questionCount: Number(parsed.questionCount) || 0,
					streak: Number(parsed.streak) || 0
				};
			}
		}
	} catch {}
	try {
		const db = await browserDb();
		return await new Promise<RecoverySnapshotMeta | null>((resolve) => {
			const request = db.transaction(RECOVERY_STORE, 'readonly').objectStore(RECOVERY_STORE).get(RECOVERY_ID);
			request.onsuccess = () => {
				const res = request.result as (RecoverySnapshotMeta & { state?: TrackerState }) | undefined;
				resolve(res ? { ...res, storedIn: 'indexedDB' } : null);
			};
			request.onerror = () => resolve(null);
		});
	} catch {
		return null;
	}
}

export async function loadRecoverySnapshot(): Promise<TrackerState | null> {
	if (!browser) return null;
	try {
		const db = await browserDb();
		const fromDb = await new Promise<TrackerState | null>((resolve) => {
			const request = db.transaction(RECOVERY_STORE, 'readonly').objectStore(RECOVERY_STORE).get(RECOVERY_ID);
			request.onsuccess = () => resolve((request.result as { state?: TrackerState } | undefined)?.state ?? null);
			request.onerror = () => resolve(null);
		});
		if (fromDb) return fromDb;
	} catch {}
	try {
		const raw = localStorage.getItem(RECOVERY_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { state?: TrackerState | null };
		return parsed.state ?? null;
	} catch {
		return null;
	}
}

export async function clearRecoverySnapshot(): Promise<void> {
	if (!browser) return;
	try {
		const db = await browserDb();
		await new Promise<void>((resolve) => {
			const tx = db.transaction(RECOVERY_STORE, 'readwrite');
			tx.objectStore(RECOVERY_STORE).delete(RECOVERY_ID);
			tx.oncomplete = () => resolve();
			tx.onerror = () => resolve();
		});
	} catch {}
	try {
		localStorage.removeItem(RECOVERY_KEY);
	} catch {}
}
