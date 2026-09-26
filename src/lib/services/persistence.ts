import { browser } from '$app/environment';
import type { TrackerState } from '$lib/types/tracker';

const DB_NAME = 'btracker-next'; const STORE = 'documents'; const KEY = 'primary';
const tauriAvailable = () => browser && '__TAURI_INTERNALS__' in window;

async function browserDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE);
		request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
	});
}
async function browserLoad() {
	const db = await browserDb();
	return new Promise<TrackerState | null>((resolve, reject) => {
		const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
		request.onsuccess = () => resolve((request.result as TrackerState | undefined) ?? null); request.onerror = () => reject(request.error);
	});
}
async function browserSave(state: TrackerState) {
	const db = await browserDb();
	return new Promise<void>((resolve, reject) => {
		const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(state, KEY);
		request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
	});
}

export async function loadTrackerState(): Promise<TrackerState | null> {
	if (!browser) return null;
	if (tauriAvailable()) { const { invoke } = await import('@tauri-apps/api/core'); return invoke<TrackerState | null>('load_state'); }
	return browserLoad();
}
export async function saveTrackerState(state: TrackerState): Promise<void> {
	if (!browser) return;
	if (tauriAvailable()) { const { invoke } = await import('@tauri-apps/api/core'); await invoke('save_state', { state }); return; }
	await browserSave(state);
}
