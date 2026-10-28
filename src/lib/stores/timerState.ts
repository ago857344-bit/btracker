import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { tracker, updateTracker, recordFocus, celebration, type StopwatchReport } from '$lib/stores/tracker';
import { playChime } from '$lib/services/chime';
import { notifyUser } from '$lib/utils/notifications';
import { formatClock } from '$lib/state/dates';
import { DEFAULT_POMODORO } from '$lib/state/defaults';

export type TimerTab = 'focus' | 'stopwatch' | 'short' | 'long';
export type TimerPhase = 'focus' | 'break';

export interface ActiveTimerSession {
	running: boolean;
	tab: TimerTab;
	phase: TimerPhase;
	subject: string | null;
	focusChapter: string;
	swChapter: string;
	swKind: 'questions' | 'theory' | 'revision';
	focusKind: 'questions' | 'theory' | 'revision';
	focusLen: number;
	shortLen: number;
	longLen: number;
	countdownEndsAt: number | null;
	countUpStartedAt: number | null;
	sessionStartedEpochMin: number;
	elapsed: number;
	remaining: number;
	activeLen: number;
	ringProgress: number;
	dialTime: string;
	sessionStarted: boolean;
	latestReport: StopwatchReport | null;
	reportOpen: boolean;
}

const STORAGE_KEY = 'btracker_active_timer_session';

function createDefaultSession(): ActiveTimerSession {
	const focusLen = 25;
	return {
		running: false,
		tab: 'focus',
		phase: 'focus',
		subject: null,
		focusChapter: '',
		swChapter: '',
		swKind: 'questions',
		focusKind: 'questions',
		focusLen,
		shortLen: 5,
		longLen: 15,
		countdownEndsAt: null,
		countUpStartedAt: null,
		sessionStartedEpochMin: 0,
		elapsed: 0,
		remaining: focusLen * 60,
		activeLen: focusLen,
		ringProgress: 0,
		dialTime: formatClock(focusLen * 60),
		sessionStarted: false,
		latestReport: null,
		reportOpen: false
	};
}

function computeDerived(s: ActiveTimerSession): ActiveTimerSession {
	s.activeLen = s.tab === 'focus' ? s.focusLen : s.tab === 'short' ? s.shortLen : s.longLen;
	s.ringProgress = s.tab === 'stopwatch'
		? (s.elapsed % 3600) / 3600
		: s.activeLen * 60 > 0 ? Math.max(0, Math.min(1, 1 - s.remaining / (s.activeLen * 60))) : 0;
	s.dialTime = s.tab === 'stopwatch' ? formatClock(s.elapsed) : formatClock(s.remaining);
	s.sessionStarted = s.running || s.elapsed > 0 || (s.tab !== 'stopwatch' && s.remaining < s.activeLen * 60);
	return s;
}

function loadSavedSession(): ActiveTimerSession {
	const def = createDefaultSession();
	if (!browser) return def;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return def;
		const parsed = JSON.parse(raw);
		const s: ActiveTimerSession = { ...def, ...parsed };

		const now = Date.now();
		// Restore stopwatch
		if (s.tab === 'stopwatch' && s.countUpStartedAt != null) {
			if (s.running) {
				s.elapsed = Math.max(0, Math.round((now - s.countUpStartedAt) / 1000));
			}
		}
		// Restore countdown
		if (s.tab !== 'stopwatch' && s.countdownEndsAt != null && s.running) {
			const diffSeconds = Math.round((s.countdownEndsAt - now) / 1000);
			if (diffSeconds > 0) {
				s.remaining = diffSeconds;
			} else {
				// Expired while tab was closed: complete cleanly
				s.remaining = 0;
				s.running = false;
				s.countdownEndsAt = null;
			}
		}

		return computeDerived(s);
	} catch (e) {
		console.warn('Failed to restore active timer session:', e);
		return def;
	}
}

export const timerSession = writable<ActiveTimerSession>(loadSavedSession());

function saveSession(s: ActiveTimerSession) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({
			running: s.running,
			tab: s.tab,
			phase: s.phase,
			subject: s.subject,
			focusChapter: s.focusChapter,
			swChapter: s.swChapter,
			swKind: s.swKind,
			focusKind: s.focusKind,
			focusLen: s.focusLen,
			shortLen: s.shortLen,
			longLen: s.longLen,
			countdownEndsAt: s.countdownEndsAt,
			countUpStartedAt: s.countUpStartedAt,
			sessionStartedEpochMin: s.sessionStartedEpochMin,
			elapsed: s.elapsed,
			remaining: s.remaining
		}));
	} catch {}
}

let tickTimer: ReturnType<typeof setInterval> | undefined;

function startTicking() {
	if (!browser) return;
	if (tickTimer) clearInterval(tickTimer);
	tickTimer = setInterval(tick, 250);
}

function stopTicking() {
	if (tickTimer) {
		clearInterval(tickTimer);
		tickTimer = undefined;
	}
}

function shouldChime(kind: 'focus' | 'break') {
	const pom = get(tracker)?.pom || DEFAULT_POMODORO;
	if (pom.chime === 'both') return true;
	if (pom.chime === 'none') return false;
	return pom.chime === kind;
}

function logSession(minutes: number, activity: string, s: ActiveTimerSession) {
	recordFocus({
		startedEpochMinutes: s.sessionStartedEpochMin || Math.floor(Date.now() / 60000) - minutes,
		durationMinutes: minutes,
		activity,
		deadlineId: null,
		subject: s.subject,
		chapter: s.focusChapter || undefined
	});
	celebration.set(`${minutes} min focus logged!`);
}

function onCountdownComplete() {
	stopTicking();
	timerSession.update((s) => {
		s.running = false;
		s.countdownEndsAt = null;
		const pom = get(tracker)?.pom || DEFAULT_POMODORO;

		if (s.tab === 'focus' && s.phase === 'focus') {
			logSession(s.focusLen, s.focusKind === 'questions' ? 'Focus · Questions' : s.focusKind === 'revision' ? 'Focus · Revision' : 'Focus · Theory', s);
			if (shouldChime('focus')) playChime('up');
			if (typeof document !== 'undefined' && document.hidden) {
				notifyUser('🎯 Focus session complete!', {
					body: `Great job! ${s.focusLen} minutes of deep focus completed. Time for a break!`,
					tag: 'timer-complete'
				});
			}
			s.phase = 'break';
			s.remaining = s.shortLen * 60;
			if (pom.autoBrk) {
				s.countdownEndsAt = Date.now() + s.shortLen * 60 * 1000;
				s.running = true;
				startTicking();
			}
		} else if (s.tab === 'focus' && s.phase === 'break') {
			if (shouldChime('break')) playChime('down');
			if (typeof document !== 'undefined' && document.hidden) {
				notifyUser('☕ Break finished!', {
					body: 'Break is over. Ready to lock back into your study session?',
					tag: 'timer-complete'
				});
			}
			s.phase = 'focus';
			s.remaining = s.focusLen * 60;
			if (pom.autoFocus) {
				s.countdownEndsAt = Date.now() + s.focusLen * 60 * 1000;
				s.running = true;
				startTicking();
			}
		} else {
			if (shouldChime('break')) playChime('down');
			if (typeof document !== 'undefined' && document.hidden) {
				notifyUser('☕ Break finished!', {
					body: s.tab === 'short' ? 'Short break finished.' : 'Long break finished.',
					tag: 'timer-complete'
				});
			}
			celebration.set(s.tab === 'short' ? 'Short break done!' : 'Long break done!');
			s.remaining = s.activeLen * 60;
		}

		computeDerived(s);
		saveSession(s);
		return s;
	});
}

function tick() {
	const nowMs = Date.now();
	timerSession.update((s) => {
		if (!s.running) return s;

		if (s.tab === 'stopwatch') {
			if (s.countUpStartedAt != null) {
				s.elapsed = Math.round((nowMs - s.countUpStartedAt) / 1000);
			}
			computeDerived(s);
			saveSession(s);
			return s;
		}

		if (s.countdownEndsAt != null) {
			s.remaining = Math.max(0, Math.round((s.countdownEndsAt - nowMs) / 1000));
			computeDerived(s);
			if (s.remaining === 0) {
				setTimeout(onCountdownComplete, 10);
			} else {
				saveSession(s);
			}
		}
		return s;
	});
}

// Check if restored session should be running
if (browser) {
	const initSession = get(timerSession);
	if (initSession.running) {
		startTicking();
	}
}

/* ---------------- Exported Controller Functions ---------------- */

export function primaryTimerAction() {
	timerSession.update((s) => {
		if (s.tab === 'stopwatch') {
			if (s.running) {
				s.running = false;
				stopTicking();
				s.countUpStartedAt = null;
			} else {
				s.sessionStartedEpochMin = s.sessionStartedEpochMin || Math.floor(Date.now() / 60000);
				s.countUpStartedAt = Date.now() - s.elapsed * 1000;
				s.running = true;
				startTicking();
			}
		} else {
			if (s.running) {
				s.running = false;
				stopTicking();
				s.countdownEndsAt = null;
			} else {
				s.sessionStartedEpochMin = Math.floor(Date.now() / 60000);
				if (s.remaining <= 0) s.remaining = s.activeLen * 60;
				s.countdownEndsAt = Date.now() + s.remaining * 1000;
				s.running = true;
				startTicking();
			}
		}
		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function beginCountdown(seconds: number) {
	timerSession.update((s) => {
		s.remaining = seconds;
		s.countdownEndsAt = Date.now() + seconds * 1000;
		s.running = true;
		startTicking();
		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function addFiveMinutes() {
	timerSession.update((s) => {
		if (s.tab === 'focus') {
			s.remaining += 300;
			if (s.countdownEndsAt) s.countdownEndsAt += 300000;
		}
		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function stopSessionAction() {
	stopTicking();
	timerSession.update((s) => {
		s.running = false;
		s.countdownEndsAt = null;
		s.countUpStartedAt = null;

		if (s.tab === 'stopwatch') {
			if (s.elapsed >= 1) {
				s.latestReport = {
					sub: s.subject ?? 'X',
					kind: s.swKind,
					at: Date.now(),
					seconds: s.elapsed,
					done: 0,
					correct: 0,
					mistakes: 0
				};
				s.reportOpen = true;
			}
			s.elapsed = 0;
			s.sessionStartedEpochMin = 0;
		} else {
			if (s.tab === 'focus' && s.phase === 'focus') {
				const doneMinutes = Math.round(((s.activeLen * 60) - s.remaining) / 60);
				if (doneMinutes >= 1) {
					logSession(doneMinutes, s.focusKind === 'questions' ? 'Focus · Questions' : s.focusKind === 'revision' ? 'Focus · Revision' : 'Focus · Theory', s);
				}
			}
			s.sessionStartedEpochMin = 0;
			s.phase = 'focus';
			s.remaining = s.activeLen * 60;
			s.elapsed = 0;
		}

		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function resetTimerAction(skipLog = false) {
	stopTicking();
	timerSession.update((s) => {
		s.running = false;
		s.countdownEndsAt = null;
		s.countUpStartedAt = null;

		if (!skipLog && s.tab === 'focus' && s.phase === 'focus') {
			const doneMinutes = Math.round(((s.activeLen * 60) - s.remaining) / 60);
			if (doneMinutes >= 1) {
				logSession(doneMinutes, s.focusKind === 'questions' ? 'Focus · Questions' : s.focusKind === 'revision' ? 'Focus · Revision' : 'Focus · Theory', s);
			}
		}

		s.sessionStartedEpochMin = 0;
		s.phase = 'focus';
		s.remaining = s.activeLen * 60;
		s.elapsed = 0;

		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function aiStart(subject: string, seconds: number, chapter: string, mode: 'timer' | 'stopwatch' = 'timer') {
	stopTicking();
	timerSession.update((s) => {
		s.running = false;
		s.countdownEndsAt = null;
		s.countUpStartedAt = null;
		s.subject = subject;
		s.sessionStartedEpochMin = Math.floor(Date.now() / 60000);

		if (mode === 'stopwatch') {
			s.tab = 'stopwatch';
			s.swChapter = chapter;
			s.elapsed = 0;
			s.countUpStartedAt = Date.now();
			s.running = true;
			startTicking();
		} else {
			s.tab = 'focus';
			s.phase = 'focus';
			s.focusChapter = chapter;
			s.focusLen = Math.floor(seconds / 60);
			s.remaining = seconds;
			s.countdownEndsAt = Date.now() + seconds * 1000;
			s.running = true;
			startTicking();
		}

		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function switchTimerTab(next: TimerTab) {
	timerSession.update((s) => {
		if (next === s.tab) return s;
		if (s.running) {
			s.running = false;
			stopTicking();
			s.countdownEndsAt = null;
			s.countUpStartedAt = null;
		}
		s.tab = next;
		s.phase = 'focus';
		s.remaining = (next === 'focus' ? s.focusLen : next === 'short' ? s.shortLen : s.longLen) * 60;
		s.elapsed = 0;

		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function setTimerSubject(sub: string | null) {
	timerSession.update((s) => {
		s.subject = sub;
		saveSession(s);
		return s;
	});
}

export function setFocusChapter(ch: string) {
	timerSession.update((s) => {
		s.focusChapter = ch;
		saveSession(s);
		return s;
	});
}

export function setSwChapter(ch: string) {
	timerSession.update((s) => {
		s.swChapter = ch;
		saveSession(s);
		return s;
	});
}

export function setSwKind(kind: 'questions' | 'theory' | 'revision') {
	timerSession.update((s) => {
		s.swKind = kind;
		saveSession(s);
		return s;
	});
}

export function setFocusKind(kind: 'questions' | 'theory' | 'revision') {
	timerSession.update((s) => {
		s.focusKind = kind;
		saveSession(s);
		return s;
	});
}

export function setPomodoroMinutes(minutes: number) {
	timerSession.update((s) => {
		if (s.running) return s;
		const mins = Math.max(1, Math.min(240, Math.round(minutes)));
		s.focusLen = mins;
		if (s.phase === 'focus') {
			s.remaining = mins * 60;
			s.countdownEndsAt = null;
		}
		updateTracker((st) => {
			if (!st.pom) st.pom = { ...DEFAULT_POMODORO };
			st.pom.focus = mins;
		});
		computeDerived(s);
		saveSession(s);
		return s;
	});
}

export function skipBreakAction() {
	timerSession.update((s) => {
		s.running = false;
		s.countdownEndsAt = null;
		s.phase = 'focus';
		s.remaining = s.focusLen * 60;
		s.activeLen = s.focusLen;
		s.ringProgress = 0;
		s.dialTime = formatClock(s.remaining);
		saveSession(s);
		return s;
	});
}

export function closeReportModal() {
	timerSession.update((s) => {
		s.reportOpen = false;
		s.latestReport = null;
		return s;
	});
}

/* ---------------- Backwards Compatible globalTimer Store ---------------- */

export interface GlobalTimerState {
	running: boolean;
	remaining: number;
	elapsed: number;
	tab: TimerTab;
	phase: TimerPhase;
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
	toggle: primaryTimerAction,
	addFive: addFiveMinutes,
	stop: stopSessionAction,
	start: aiStart,
	setTime: setPomodoroMinutes
});

// Sync timerSession -> globalTimer
timerSession.subscribe((s) => {
	globalTimer.set({
		running: s.running,
		remaining: s.remaining,
		elapsed: s.elapsed,
		tab: s.tab,
		phase: s.phase,
		subject: s.subject,
		chapter: s.tab === 'stopwatch' ? s.swChapter : s.focusChapter,
		activeLen: s.activeLen,
		ringProgress: s.ringProgress,
		dialTime: s.dialTime,
		sessionStarted: s.sessionStarted,
		toggle: primaryTimerAction,
		addFive: addFiveMinutes,
		stop: stopSessionAction,
		start: aiStart,
		setTime: setPomodoroMinutes
	});
});
