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
	setTime: (minutes: number) => void;
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
	start: () => {},
	setTime: (minutes: number) => {
		globalTimer.update(s => {
			const mins = Math.max(1, Math.min(240, Math.round(minutes)));
			s.activeLen = mins;
			if (!s.running && s.phase === 'focus') {
				s.remaining = mins * 60;
				const m = Math.floor(s.remaining / 60);
				const sec = s.remaining % 60;
				s.dialTime = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
			}
			return s;
		});
	}
});
