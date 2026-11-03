import { writable } from 'svelte/store';
import { celebration } from '$lib/stores/tracker';
import type { ThemePreset } from '$lib/state/themes';

export interface ThemePreviewState {
	active: boolean;
	theme: ThemePreset | null;
	timeLeft: number;
}

const initialState: ThemePreviewState = { active: false, theme: null, timeLeft: 0 };

/**
 * Preview lives entirely in this store; the persisted tracker appearance is
 * never touched, so a reload or a chained preview can't leak a locked theme.
 */
export const themePreview = writable<ThemePreviewState>(initialState);

let countdownInterval: ReturnType<typeof setInterval> | null = null;

function stopCountdown() {
	if (countdownInterval !== null) {
		clearInterval(countdownInterval);
		countdownInterval = null;
	}
}

export function startThemePreview(theme: ThemePreset, durationSec = 60): void {
	stopCountdown();
	themePreview.set({ active: true, theme, timeLeft: durationSec });

	countdownInterval = setInterval(() => {
		themePreview.update((state) => {
			if (!state.active) {
				stopCountdown();
				return state;
			}
			if (state.timeLeft <= 1) {
				stopCountdown();
				celebration.set('Theme preview ended. Reverted to previous look.');
				return { ...initialState };
			}
			return { ...state, timeLeft: state.timeLeft - 1 };
		});
	}, 1000);
}

export function endThemePreview(): void {
	stopCountdown();
	themePreview.update((state) => {
		if (!state.active) return state;
		celebration.set('Theme preview ended. Reverted to previous look.');
		return { ...initialState };
	});
}
