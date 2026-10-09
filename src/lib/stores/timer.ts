import { writable } from 'svelte/store';

export interface TimerState {
	running: boolean;
	tab: 'focus' | 'short' | 'long' | 'stopwatch';
	phase: 'focus' | 'break';
	remaining: number;
	elapsed: number;
	countdownEndsAt: number | null;
	countUpStartedAt: number | null;
	focusLen: number;
	shortLen: number;
	longLen: number;
	subject: string | null;
	focusChapter: string;
	focusKind: 'questions' | 'theory' | 'revision';
}

export const activeTimer = writable<TimerState>({
	running: false,
	tab: 'focus',
	phase: 'focus',
	remaining: 25 * 60,
	elapsed: 0,
	countdownEndsAt: null,
	countUpStartedAt: null,
	focusLen: 25,
	shortLen: 5,
	longLen: 15,
	subject: null,
	focusChapter: '',
	focusKind: 'questions'
});
