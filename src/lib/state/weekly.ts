import { dayKeyOf, sessionDayKey, startOfWeek, todayKey, weekRangeLabel } from './dates';
import { getEloRank, getLevelData, tierEloOf } from './gamification';
import { SUBJECTS } from './subjects';
import type { TrackerState } from '$lib/types/tracker';

export const currentWeekStartKey = () => dayKeyOf(startOfWeek());

/**
 * Mutator (call inside updateTracker). When the Monday-keyed week has moved on,
 * capture the current totals as the new baseline. The first rollover after an
 * upgrade simply snapshots that moment, so week one under-reports — it corrects
 * itself the following Monday.
 */
export function rolloverWeekSnapshot(state: TrackerState) {
	const g = (state.gamification ??= { xp: 0, level: 1, elo: { P: 300, C: 300, M: 300 } });
	const start = currentWeekStartKey();
	if (g.week?.start === start) return;
	g.week = { start, xp: g.xp, elo: { ...g.elo } };
}

export const eloTier = (avgElo: number) =>
	avgElo >= 1600 ? { name: 'God', icon: '👑', cls: 'god' }
	: avgElo >= 1250 ? { name: 'Master', icon: '💎', cls: 'master' }
	: avgElo >= 900 ? { name: 'Challenger', icon: '⚔️', cls: 'chal' }
	: avgElo >= 400 ? { name: 'Initiate', icon: '🛡️', cls: 'initiate' }
	: { name: 'Bronze', icon: '🥉', cls: 'bronze' };

/** Shared pill gradients so the DOM preview and the exported image match. */
export const TIER_STYLE: Record<string, { from: string; to: string; text: string }> = {
	god: { from: '#ffd700', to: '#b8860b', text: '#1a1200' },
	master: { from: '#4dabf7', to: '#1864ab', text: '#ffffff' },
	chal: { from: '#ff4500', to: '#8b0000', text: '#ffffff' },
	initiate: { from: '#00e5ff', to: '#00838f', text: '#00222b' },
	bronze: { from: '#cd7f32', to: '#7a4a1d', text: '#ffffff' }
};

export interface WeekSubjectRow {
	code: string;
	name: string;
	color: string;
	elo: number;
	delta: number;
	rankName: string;
	rankColor: string;
}

export interface WeekReport {
	startKey: string;
	endKey: string;
	label: string;
	generatedLabel: string;
	name: string;
	xpGained: number;
	totalXp: number;
	level: number;
	levelTitle: string;
	levelProgress: number;
	avgElo: number;
	tier: { name: string; icon: string; cls: string };
	prestige: number;
	/** Equipped cosmetic title / frame, overlaid by the UI from the resolved loadout. */
	flairTitle: string | null;
	frameColors: string[] | null;
	subjects: WeekSubjectRow[];
	minutes: number;
	solved: number;
	revisions: number;
	tests: number;
	mistakes: number;
	sessions: number;
}

const inRange = (key: string, start: string, until: string) => key >= start && key <= until;

/** Aggregate everything the weekly report card needs for the current week. */
export function buildWeekReport(state: TrackerState): WeekReport {
	const g = state.gamification;
	const startKey = currentWeekStartKey();
	const end = startOfWeek();
	end.setDate(end.getDate() + 6);
	const endKey = dayKeyOf(end);
	const today = todayKey();
	const until = today < endKey ? today : endKey;

	const xp = g?.xp ?? 0;
	const hasBaseline = g?.week?.start === startKey;
	const baseXp = hasBaseline ? g!.week!.xp : xp;
	const baseElo = hasBaseline ? g!.week!.elo : {};

	let minutes = 0;
	let sessions = 0;
	for (const session of state.log) {
		if (!inRange(sessionDayKey(session), startKey, until)) continue;
		minutes += Number(session[1]) || 0;
		sessions += 1;
	}

	let solved = 0;
	for (const [key, bucket] of Object.entries(state.stat)) {
		if (!inRange(key, startKey, until)) continue;
		for (const value of Object.values(bucket ?? {})) solved += Number(value) || 0;
	}

	const revisions = Object.values(state.rev.items).filter((item) => item.last && inRange(dayKeyOf(new Date(item.last)), startKey, until)).length;
	const tests = state.mocks.filter((mock) => inRange(dayKeyOf(new Date(mock.date)), startKey, until)).length;
	const mistakes = state.mistakes.filter((entry) => inRange(dayKeyOf(new Date(entry.date)), startKey, until)).length;

	const elo = g?.elo ?? { P: 300, C: 300, M: 300 };
	const avgElo = Math.round(tierEloOf(g));
	const lvl = getLevelData(xp);

	return {
		startKey,
		endKey,
		label: weekRangeLabel(startOfWeek()),
		generatedLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
		name: state.meta.name?.trim() || 'BTracker Grinder',
		xpGained: Math.max(0, xp - baseXp),
		totalXp: xp,
		level: lvl.level,
		levelTitle: lvl.title.toUpperCase(),
		levelProgress: Math.round(lvl.progress),
		avgElo,
		tier: eloTier(avgElo),
		prestige: g?.prestige?.count ?? 0,
		flairTitle: null,
		frameColors: null,
		subjects: SUBJECTS.map((sub) => {
			const current = Math.round(elo[sub.code as 'P' | 'C' | 'M'] ?? 300);
			const rank = getEloRank(current);
			return {
				code: sub.code, name: sub.name, color: sub.color,
				elo: current,
				delta: current - Math.round(baseElo[sub.code] ?? current),
				rankName: rank.name, rankColor: rank.color
			};
		}),
		minutes, solved, revisions, tests, mistakes, sessions
	};
}
