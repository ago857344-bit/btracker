import type { TrackerState } from '$lib/types/tracker';

export const LEVEL_THRESHOLDS = [
	0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000,
	25000, 31000, 38000, 46000, 55000, 65000, 76000, 88000, 100000
];

export const getLevelData = (xp: number) => {
	let level = 1;
	for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
		if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
		else break;
	}
	const currentTierXp = LEVEL_THRESHOLDS[level - 1];
	const nextTierXp = LEVEL_THRESHOLDS[level] ?? currentTierXp + 10000;
	const progress = Math.max(0, Math.min(100, ((xp - currentTierXp) / (nextTierXp - currentTierXp)) * 100));

	let title = 'Aspirant';
	if (level >= 15) title = 'JEE Conqueror';
	else if (level >= 10) title = 'Gladiator';
	else if (level >= 5) title = 'Scholar';
	else if (level >= 3) title = 'Initiate';

	return { level, title, currentTierXp, nextTierXp, progress };
};

export const getEloRank = (elo: number) => {
	if (elo < 500) return { name: 'Bronze', color: '#cd7f32', icon: 'shield' };
	if (elo < 800) return { name: 'Silver', color: '#c0c0c0', icon: 'shield' };
	if (elo < 1200) return { name: 'Gold', color: '#ffd700', icon: 'award' };
	if (elo < 1600) return { name: 'Diamond', color: '#b9f2ff', icon: 'award' };
	return { name: 'Grandmaster', color: '#ff00ff', icon: 'zap' };
};

export const calculateEloChange = (currentElo: number, accuracy: number, weight = 1.0) => {
	// Accuracy is 0 to 100.
	// Expected accuracy scales aggressively with Elo. At Grandmaster (1600+), expected is 90%+.
	const expected = Math.max(20, Math.min(96, (currentElo / 1800) * 100));
	const diff = accuracy - expected;
	
	// If you perform worse than expected, you get punished heavily (3x multiplier on Elo loss).
	let multiplier = diff < 0 ? 0.9 : 0.3;
	
	const change = Math.round(diff * multiplier * weight);
	return Math.max(-45, Math.min(20, change));
};

type Gamification = NonNullable<TrackerState['gamification']>;

export const ASCEND_ELO = 1600;
export const SEASON_START_ELO = 300;

const average = (ratings: Record<string, number> | undefined) => {
	const values = Object.values(ratings ?? {});
	return values.length ? values.reduce((a, b) => a + b, 0) / values.length : SEASON_START_ELO;
};

/** Elo that drives the tier badge: skill Elo until the first Ascend, then the current season's Elo. */
export const tierEloOf = (g: Gamification | undefined) =>
	g?.prestige?.count ? average(g.prestige.seasonElo) : average(g?.elo);

export function recordPeaks(g: Gamification) {
	const peak = (g.peak ??= { tierElo: 0, subject: {} });
	peak.tierElo = Math.max(peak.tierElo, Math.round(tierEloOf(g)));
	for (const [sub, value] of Object.entries(g.elo)) peak.subject[sub] = Math.max(peak.subject[sub] ?? 0, Math.round(value));
}

/** Apply one graded attempt to skill Elo (and season Elo once prestiged), then refresh peaks. */
export function applyEloResult(g: Gamification, sub: string, accuracy: number, floor = 100, weight = 1.0) {
	const elo = g.elo as Record<string, number>;
	const current = elo[sub] ?? SEASON_START_ELO;
	elo[sub] = Math.max(floor, current + calculateEloChange(current, accuracy, weight));
	if (g.prestige?.count) {
		const season = g.prestige.seasonElo[sub] ?? SEASON_START_ELO;
		g.prestige.seasonElo[sub] = Math.max(floor, season + calculateEloChange(season, accuracy, weight));
	}
	recordPeaks(g);
}

export const canAscend = (g: Gamification | undefined) => tierEloOf(g) >= ASCEND_ELO;

/**
 * Prestige: reset the season Elo to the starting rating and add a star. Skill Elo is untouched
 * so AI insights and subject ranks keep reflecting real ability.
 */
export function ascend(g: Gamification) {
	if (!canAscend(g)) return false;
	recordPeaks(g);
	const prestige = (g.prestige ??= { count: 0, seasonElo: {} });
	(prestige.history ??= []).push({ at: Date.now(), avgElo: Math.round(tierEloOf(g)) });
	prestige.count += 1;
	prestige.seasonElo = { P: SEASON_START_ELO, C: SEASON_START_ELO, M: SEASON_START_ELO };
	return true;
}
