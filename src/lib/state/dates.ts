import type { StudySession } from '$lib/types/tracker';

const pad = (n: number) => String(n).padStart(2, '0');

/** Zero-padded `YYYY-MM-DD`, matching the DayKey comparisons used elsewhere. */
export const dayKeyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const todayKey = () => dayKeyOf(new Date());

/** Inclusive list of the last `n` day keys, oldest first, ending today. */
export function lastNDays(n: number, now = new Date()): string[] {
	const out: string[] = [];
	for (let i = n - 1; i >= 0; i--) {
		const d = new Date(now);
		d.setDate(now.getDate() - i);
		out.push(dayKeyOf(d));
	}
	return out;
}

export const startOfWeek = (now = new Date()) => {
	const d = new Date(now);
	const shift = (d.getDay() + 6) % 7; // Monday-based
	d.setDate(now.getDate() - shift);
	d.setHours(0, 0, 0, 0);
	return d;
};

/** A StudySession stores its start as epoch *minutes*. */
export const sessionDayKey = (session: StudySession) => dayKeyOf(new Date(session[0] * 60000));

/** Total focus minutes logged on a given day. */
export function focusMinutesOn(log: StudySession[], key: string) {
	return log.reduce((sum, s) => (sessionDayKey(s) === key ? sum + (Number(s[1]) || 0) : sum), 0);
}

export const formatMinutes = (minutes: number) => {
	const total = Math.max(0, Math.round(minutes));
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h && m) return `${h}h ${m}m`;
	if (h) return `${h}h`;
	return `${m}m`;
};

export const formatClock = (totalSeconds: number) => {
	const s = Math.max(0, Math.floor(totalSeconds));
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${pad(m)}:${pad(r)}`;
};

export const weekdayShort = (key: string) => {
	const [y, m, d] = key.split('-').map(Number);
	return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
};

export const relativeDue = (due: string, today = todayKey()) => {
	if (!due) return '';
	const diff = (new Date(due).getTime() - new Date(today).getTime()) / 86400000;
	const days = Math.round(diff);
	if (days === 0) return 'Due today';
	if (days === 1) return 'Due tomorrow';
	if (days === -1) return '1 day overdue';
	if (days < 0) return `${Math.abs(days)} days overdue`;
	return `In ${days} days`;
};

export const parseKey = (key: string) => {
	const [y, m, d] = key.split('-').map(Number);
	return new Date(y, m - 1, d);
};

export const addDaysKey = (key: string, n: number) => {
	const d = parseKey(key);
	d.setDate(d.getDate() + n);
	return dayKeyOf(d);
};

export const longDateKey = (key: string) =>
	parseKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export const shortDateKey = (key: string) => parseKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const monthLabelOf = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const greetingFor = (hour: number) => (hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening');

/** Monday-based week range caption, e.g. `SEP 20 – SEP 26`. */
export const weekRangeLabel = (start: Date) => {
	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
	return `${fmt(start)} – ${fmt(end)}`;
};

export const timeOf = (value: Date | number) =>
	value instanceof Date
		? value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
		: new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
