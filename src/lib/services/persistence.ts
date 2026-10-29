import { browser } from '$app/environment';
import type { TrackerState, StateSnapshot } from '$lib/types/tracker';
import { calculateStreakDays } from '$lib/stores/tracker';

const DB_NAME = 'btracker-next';
const STORE = 'documents';
const KEY = 'primary';
const SNAPSHOT_STORE = 'snapshots';

const tauriAvailable = () => browser && '__TAURI_INTERNALS__' in window;

async function browserDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 2);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
			if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
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
		const raw = localStorage.getItem('btracker_fallback_state');
		if (raw) return JSON.parse(raw);
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
		console.error('IndexedDB browserSave failed, saving emergency localStorage copy:', e);
		try {
			localStorage.setItem('btracker_fallback_state', JSON.stringify(state));
		} catch {}
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

	const clonedState = structuredClone(state);
	if (clonedState.ui?.wallpaper && (clonedState.ui.wallpaper.startsWith('data:video/') || (clonedState.ui.wallpaper.startsWith('data:') && clonedState.ui.wallpaper.length > 500_000))) {
		clonedState.ui.wallpaper = null;
	}
	if (clonedState.ui?.wallpaperHistory) {
		clonedState.ui.wallpaperHistory = clonedState.ui.wallpaperHistory.filter(
			(wp) => typeof wp === 'string' && !wp.startsWith('data:video/') && !(wp.startsWith('data:') && wp.length > 500_000)
		);
	}

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
