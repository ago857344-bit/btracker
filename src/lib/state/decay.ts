import type { DecayMetrics, ConfidenceRating, ChapterPriority } from '$lib/types/tracker';
import { dayKeyOf } from './dates';

/**
 * Constants for memory decay calculations
 */
export const DECAY_CONSTANTS = {
	/** Maximum possible memory score (100%) */
	MAX_SCORE: 100,
	/** Minimum threshold before chapter is considered critical */
	CRITICAL_THRESHOLD: 30,
	/** Threshold for "fading" health status */
	FADING_THRESHOLD: 60,
	/** Default half-life in days for new chapters */
	DEFAULT_HALF_LIFE: 7,
	/** Half-life multiplier based on confidence rating */
	HALF_LIFE_MULTIPLIERS: {
		again: 0.5, // Cut half-life in half (needs quick review)
		hard: 0.8, // Slightly reduce half-life
		good: 1.2, // Increase half-life (memory is strengthening)
		easy: 2.0 // Double half-life (well-mastered)
	},
	/** Initial r0 score based on confidence rating */
	INITIAL_SCORE_MULTIPLIERS: {
		again: 60,
		hard: 75,
		good: 85,
		easy: 95
	}
} as const;

/**
 * Calculate current decayed memory score using exponential decay formula:
 * r(t) = r0 * 2^(-t/τ)
 *
 * @param decay - Decay metrics containing r0, halfLife, and lastRevisionAt
 * @returns Current decayed score (0-100)
 */
export function calculateCurrentScore(decay: DecayMetrics): number {
	if (!decay.lastRevisionAt) return 0;

	const now = Date.now();
	const timeSinceRevision = now - decay.lastRevisionAt;
	const daysSinceRevision = timeSinceRevision / (1000 * 60 * 60 * 24);

	// Apply exponential decay formula: r(t) = r0 * 2^(-t/τ)
	const decayedScore = decay.r0 * Math.pow(2, -daysSinceRevision / decay.halfLife);

	return Math.max(0, Math.min(DECAY_CONSTANTS.MAX_SCORE, decayedScore));
}

/**
 * Update decay metrics after a revision based on confidence rating
 *
 * @param currentDecay - Current decay metrics
 * @param confidence - Self-evaluation rating
 * @returns Updated decay metrics
 */
export function updateDecayAfterRevision(
	currentDecay: DecayMetrics,
	confidence: ConfidenceRating
): DecayMetrics {
	const now = Date.now();
	const today = dayKeyOf(new Date(now));

	// Get multipliers based on confidence
	const halfLifeMultiplier = DECAY_CONSTANTS.HALF_LIFE_MULTIPLIERS[confidence];
	const initialScore = DECAY_CONSTANTS.INITIAL_SCORE_MULTIPLIERS[confidence];

	// Calculate new half-life (τ)
	const newHalfLife = Math.max(1, (currentDecay.halfLife || DECAY_CONSTANTS.DEFAULT_HALF_LIFE) * halfLifeMultiplier);

	// Update history for sparkline visualization
	const newHistory = [...currentDecay.history, { date: today, score: currentDecay.currentScore }];
	// Keep only last 30 data points for sparkline
	if (newHistory.length > 30) {
		newHistory.shift();
	}

	return {
		r0: initialScore,
		halfLife: newHalfLife,
		currentScore: initialScore, // Reset to initial score immediately after revision
		lastRevisionAt: now,
		history: newHistory
	};
}

/**
 * Create initial decay metrics for a new chapter
 *
 * @param initialScore - Starting memory score (default: 80)
 * @param halfLife - Initial half-life in days (default: 7)
 * @returns Initial decay metrics
 */
export function createInitialDecayMetrics(
	initialScore: number = 80,
	halfLife: number = DECAY_CONSTANTS.DEFAULT_HALF_LIFE
): DecayMetrics {
	const now = Date.now();
	const today = dayKeyOf(new Date(now));

	return {
		r0: initialScore,
		halfLife,
		currentScore: initialScore,
		lastRevisionAt: now,
		history: [{ date: today, score: initialScore }]
	};
}

/**
 * Calculate health status based on current decay score
 *
 * @param score - Current decayed memory score (0-100)
 * @returns Health status for UI coloring
 */
export function calculateHealthStatus(score: number): 'fresh' | 'fading' | 'critical' {
	if (score >= DECAY_CONSTANTS.FADING_THRESHOLD) return 'fresh';
	if (score >= DECAY_CONSTANTS.CRITICAL_THRESHOLD) return 'fading';
	return 'critical';
}

/**
 * Calculate priority score for the High-Yield Priority Matrix
 * Formula: Weightage * (Max Score - Current Decay Score)
 *
 * @param weightage - Chapter weightage (1-3)
 * @param currentScore - Current decayed memory score (0-100)
 * @returns Priority score (higher = more urgent)
 */
export function calculatePriorityScore(weightage: 1 | 2 | 3, currentScore: number): number {
	return weightage * (DECAY_CONSTANTS.MAX_SCORE - currentScore);
}

/**
 * Calculate full chapter priority object for sorting
 *
 * @param chapterKey - Chapter identifier
 * @param weightage - Chapter weightage (1-3)
 * @param decay - Decay metrics
 * @returns Chapter priority object
 */
export function calculateChapterPriority(
	chapterKey: string,
	weightage: 1 | 2 | 3,
	decay: DecayMetrics
): ChapterPriority {
	const currentScore = calculateCurrentScore(decay);
	const priorityScore = calculatePriorityScore(weightage, currentScore);
	const health = calculateHealthStatus(currentScore);

	return {
		chapterKey,
		priorityScore,
		currentScore,
		weightage,
		health
	};
}

/**
 * Sort chapters by priority (highest priority first)
 *
 * @param priorities - Array of chapter priority objects
 * @returns Sorted array
 */
export function sortByPriority(priorities: ChapterPriority[]): ChapterPriority[] {
	return [...priorities].sort((a, b) => {
		// First sort by priority score (descending)
		if (b.priorityScore !== a.priorityScore) {
			return b.priorityScore - a.priorityScore;
		}
		// Then by weightage (descending)
		if (b.weightage !== a.weightage) {
			return b.weightage - a.weightage;
		}
		// Finally by current score (ascending - lower score = more urgent)
		return a.currentScore - b.currentScore;
	});
}

/**
 * Get color code for health status
 *
 * @param health - Health status
 * @returns CSS color value
 */
export function getHealthColor(health: 'fresh' | 'fading' | 'critical'): string {
	switch (health) {
		case 'fresh':
			return 'var(--success)';
		case 'fading':
			return 'var(--warning)';
		case 'critical':
			return 'var(--danger)';
	}
}

/**
 * Calculate days until a chapter reaches critical threshold
 *
 * @param decay - Decay metrics
 * @param threshold - Score threshold (default: critical threshold)
 * @returns Number of days until threshold is reached, or Infinity if never
 */
export function daysUntilThreshold(
	decay: DecayMetrics,
	threshold: number = DECAY_CONSTANTS.CRITICAL_THRESHOLD
): number {
	if (decay.r0 <= threshold) return 0;

	// Solve for t in: threshold = r0 * 2^(-t/τ)
	// threshold / r0 = 2^(-t/τ)
	// log2(threshold / r0) = -t/τ
	// t = -τ * log2(threshold / r0)
	const daysUntil = -decay.halfLife * Math.log2(threshold / decay.r0);

	return Math.max(0, daysUntil);
}

/**
 * Check if a chapter has actually been studied or revised by the user
 * (has recorded focus/pomodoro time, practice questions, or completed revisions).
 * Ensures phantom / unstudied topics never trigger false revision reminders.
 */
export function isChapterStudied(state: any, chapterKey: string): boolean {
	if (!state || !chapterKey) return false;
	const parts = chapterKey.split(/[-:]/);
	const sub = parts[0]?.trim();
	const chRaw = parts.slice(1).join('-').trim();
	if (!sub || !chRaw) return false;

	const chLower = chRaw.toLowerCase();

	// 1. Check logged focus sessions (Pomodoro, Stopwatch, manual logs)
	const logs = state.log;
	if (Array.isArray(logs)) {
		const foundInLog = logs.some((s: any) => {
			if (!Array.isArray(s)) return false;
			const sSub = s[7];
			const sCh = s[8];
			if (!sSub || !sCh) return false;
			if (sSub !== sub) return false;
			const targetLower = String(sCh).trim().toLowerCase();
			return targetLower === chLower || chLower.includes(targetLower) || targetLower.includes(chLower);
		});
		if (foundInLog) return true;
	}

	// 2. Check subject practice sessions
	const sess = state.sess;
	if (Array.isArray(sess)) {
		const foundInSess = sess.some((s: any) => {
			if (!s || s.sub !== sub || !s.ch) return false;
			const targetLower = String(s.ch).trim().toLowerCase();
			return targetLower === chLower || chLower.includes(targetLower) || targetLower.includes(chLower);
		});
		if (foundInSess) return true;
	}

	// 3. Check active recall chapter data: userAdded OR actual revision history
	const chap = state.rev?.chapters?.[chapterKey];
	if (chap) {
		if (chap.userAdded) return true;
		if (chap.decay?.lastRevisionAt && chap.decay.lastRevisionAt > 0) {
			if (Array.isArray(chap.decay.history) && chap.decay.history.length > 1) {
				return true;
			}
		}
	}

	// 4. Check spaced revision items
	const colonKey = `${sub}:${chRaw}`;
	const item = state.rev?.items?.[colonKey] || state.rev?.items?.[chapterKey];
	if (item?.userAdded || (item?.last && item.last > 0)) {
		return true;
	}

	return false;
}
