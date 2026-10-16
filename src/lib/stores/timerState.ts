import { writable } from 'svelte/store';

export interface GlobalTimerState {
	running: boolean;
	remaining: number;
	elapsed: number;
	tab: 'focus' | 'stopwatch' | 'short' | 'long';
	phase: 'focus' | 'break';
	subject: string | null;
	chapter: string;
	activeLen: number;
	ringProgress: number;
	dialTime: string;
	sessionStarted: boolean;
	toggle: () => void;
	addFive: () => void;
	stop: () => void;
	start: (subject: string, seconds: number, chapter: string, mode?: 'timer' | 'stopwatch') => void;
}

export const globalTimer = writable<GlobalTimerState>({
	running: false,
	remaining: 25 * 60,
	elapsed: 0,
	tab: 'focus',
	phase: 'focus',
	subject: null,
	chapter: '',
	activeLen: 25,
	ringProgress: 0,
	dialTime: '25:00',
	sessionStarted: false,
	toggle: () => {},
	addFive: () => {},
	stop: () => {},
	start: () => {}
});
