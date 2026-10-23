import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface PipPosition {
	x: number;
	y: number;
	corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const STORAGE_KEY_OPEN = 'btracker_pip_island_open';
const STORAGE_KEY_POS = 'btracker_pip_island_pos';
const STORAGE_KEY_EXPANDED = 'btracker_pip_island_expanded';

function loadInitialOpen(): boolean {
	if (!browser) return false;
	try {
		return localStorage.getItem(STORAGE_KEY_OPEN) === 'true';
	} catch {
		return false;
	}
}

function loadInitialPos(): PipPosition {
	const defaultPos: PipPosition = { x: -1, y: -1, corner: 'bottom-right' };
	if (!browser) return defaultPos;
	try {
		const raw = localStorage.getItem(STORAGE_KEY_POS);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore
	}
	return defaultPos;
}

function loadInitialExpanded(): boolean {
	if (!browser) return false;
	try {
		return localStorage.getItem(STORAGE_KEY_EXPANDED) === 'true';
	} catch {
		return false;
	}
}

export const pipIslandOpen = writable<boolean>(loadInitialOpen());
export const pipPosition = writable<PipPosition>(loadInitialPos());
export const pipExpanded = writable<boolean>(loadInitialExpanded());

if (browser) {
	pipIslandOpen.subscribe((val) => {
		try {
			localStorage.setItem(STORAGE_KEY_OPEN, String(val));
		} catch {}
	});

	pipPosition.subscribe((pos) => {
		try {
			localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos));
		} catch {}
	});

	pipExpanded.subscribe((exp) => {
		try {
			localStorage.setItem(STORAGE_KEY_EXPANDED, String(exp));
		} catch {}
	});
}

export function openPipIsland() {
	pipIslandOpen.set(true);
}

export function closePipIsland() {
	pipIslandOpen.set(false);
	pipExpanded.set(false);
}

export function togglePipIsland() {
	pipIslandOpen.update((v) => !v);
}
