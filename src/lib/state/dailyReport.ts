import { dayKeyOf, focusMinutesOn, parseKey, sessionDayKey, todayKey, weekdayShort } from './dates';
import { getLevelData, tierEloOf } from './gamification';
import { SUBJECTS } from './subjects';
import { eloTier } from './weekly';
import { hourDistribution } from '$lib/stores/tracker';
import type { TrackerState } from '$lib/types/tracker';

export interface DailySubjectStat {
	code: string;
	name: string;
	color: string;
	minutes: number;
	hours: number;
	questions: number;
}

export interface DailyReport {
	key: string;              // "2026-10-11"
	dateLabel: string;        // "OCTOBER 11, 2026"
	dayName: string;          // "SATURDAY"
	name: string;
	minutes: number;
	hours: number;
	solved: number;
	sessions: number;
	streak: number;
	level: number;
	levelTitle: string;
	tier: { name: string; icon: string; cls: string };
	prestige: number;
	flairTitle: string | null;
	frameColors: string[] | null;
	hourDist: number[];       // 24 values
	maxHourMinutes: number;
	peakHour: string;
	subjects: DailySubjectStat[];
}

export function buildDailyReport(state: TrackerState, targetKey: string = todayKey()): DailyReport {
	const g = state.gamification;
	const key = targetKey;
	const date = parseKey(key);
	const today = todayKey();

	const dateLabel = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
	const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

	// Focus minutes on target day
	const minutes = focusMinutesOn(state.log, key);
	const hours = Number((minutes / 60).toFixed(1));

	// Count sessions on this day
	let sessions = 0;
	for (const s of state.log) {
		if (sessionDayKey(s) === key) sessions++;
	}

	// Questions solved on target day
	let solved = 0;
	const bucket = state.stat[key];
	if (bucket) {
		for (const val of Object.values(bucket)) {
			solved += Number(val) || 0;
		}
	}

	// 24h distribution
	const hourDist = hourDistribution(state, key);
	const maxHourMinutes = Math.max(1, ...hourDist);

	// Find peak hour
	let peakHourIdx = 0;
	let peakHourVal = -1;
	hourDist.forEach((m, idx) => {
		if (m > peakHourVal) {
			peakHourVal = m;
			peakHourIdx = idx;
		}
	});

	const formatHour = (h: number) => {
		const ampm = h >= 12 ? 'PM' : 'AM';
		const hour12 = h % 12 || 12;
		return `${hour12} ${ampm}`;
	};
	const peakHour = peakHourVal > 0 ? formatHour(peakHourIdx) : '—';

	// Subject breakdown
	const subjects: DailySubjectStat[] = SUBJECTS.map((sub) => {
		let subMinutes = 0;
		for (const s of state.log) {
			if (sessionDayKey(s) === key && s[7] === sub.code) {
				subMinutes += Number(s[1]) || 0;
			}
		}
		const subQuestions = Number(bucket?.[sub.code]) || 0;
		return {
			code: sub.code,
			name: sub.name,
			color: sub.color,
			minutes: subMinutes,
			hours: Number((subMinutes / 60).toFixed(1)),
			questions: subQuestions
		};
	});

	// Streak calculation
	const need = (state.meta?.streakGoalH || 1) * 60;
	let streak = 0;
	let cursor = today;
	while (focusMinutesOn(state.log, cursor) >= need) {
		streak++;
		const prev = parseKey(cursor);
		prev.setDate(prev.getDate() - 1);
		cursor = dayKeyOf(prev);
	}

	const xp = g?.xp ?? 0;
	const avgElo = Math.round(tierEloOf(g));
	const lvl = getLevelData(xp);

	return {
		key,
		dateLabel,
		dayName,
		name: state.meta.name?.trim() || 'BTracker Grinder',
		minutes,
		hours,
		solved,
		sessions,
		streak,
		level: lvl.level,
		levelTitle: lvl.title.toUpperCase(),
		tier: eloTier(avgElo),
		prestige: g?.prestige?.count ?? 0,
		flairTitle: null,
		frameColors: null,
		hourDist,
		maxHourMinutes,
		peakHour,
		subjects
	};
}
