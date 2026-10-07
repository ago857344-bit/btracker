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

export const calculateEloChange = (currentElo: number, accuracy: number) => {
	// Accuracy is 0 to 100.
	// Expected accuracy roughly scales with Elo.
	const expected = Math.max(20, Math.min(90, (currentElo / 2000) * 100));
	const diff = accuracy - expected;
	const change = Math.round(diff * 0.4); // max change is ~30 points.
	return Math.max(-20, Math.min(30, change));
};
