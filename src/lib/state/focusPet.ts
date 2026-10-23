import type { TrackerState } from '$lib/types/tracker';
import { lastNDays } from '$lib/state/dates';

export type PetStageId = 1 | 2 | 3 | 4 | 5;
export type PetStageName = 'Spark' | 'Proto-Star' | 'Pulsar' | 'Quasar' | 'Supernova';
export type PetAuraSubject = 'P' | 'C' | 'M' | 'balanced';

export interface PetEvolutionInfo {
	stage: PetStageId;
	stageName: PetStageName;
	title: string;
	description: string;
	currentHours: number;
	nextStageHours: number | null;
	progressPercent: number;
	auraSubject: PetAuraSubject;
	auraColor: string;
	auraName: string;
	isHibernating: boolean;
	hoursSinceLastFocus: number;
	mood: 'ecstatic' | 'vibrant' | 'content' | 'hibernating';
}

const STAGE_THRESHOLDS: { stage: PetStageId; name: PetStageName; hours: number; title: string; desc: string }[] = [
	{ stage: 1, name: 'Spark', hours: 0, title: 'Nascent Ember', desc: 'A fragile flickering ignition of pure intent.' },
	{ stage: 2, name: 'Proto-Star', hours: 5, title: 'Condensing Core', desc: 'Gravitational collapse forming an energized stellar body.' },
	{ stage: 3, name: 'Pulsar', hours: 20, title: 'Relativistic Beamer', desc: 'High-frequency energetic magnetic pulses sweeping the cosmos.' },
	{ stage: 4, name: 'Quasar', hours: 50, title: 'Accretion Dynamo', desc: 'Immense gravitational vortex devouring entire study backlogs.' },
	{ stage: 5, name: 'Supernova', hours: 100, title: 'Cosmic Singularity', desc: 'Transcendent explosion seeding infinite mastery across all subjects.' }
];

export function getPetEvolution(state: TrackerState, isCurrentlyFocusing = false): PetEvolutionInfo {
	// 1. Calculate total focus minutes from all recorded sessions
	let totalMinutes = 0;
	let latestSessionEpochMin = 0;

	if (state.log && Array.isArray(state.log)) {
		for (const session of state.log) {
			const epochMin = session[0] || 0;
			const mins = session[1] || 0;
			totalMinutes += mins;
			if (epochMin > latestSessionEpochMin) {
				latestSessionEpochMin = epochMin;
			}
		}
	}

	const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

	// 2. Determine Stage
	let currentStageIdx = 0;
	for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
		if (totalHours >= STAGE_THRESHOLDS[i].hours) {
			currentStageIdx = i;
			break;
		}
	}

	const currentStageInfo = STAGE_THRESHOLDS[currentStageIdx];
	const nextStageInfo = STAGE_THRESHOLDS[currentStageIdx + 1] ?? null;

	let progressPercent = 100;
	if (nextStageInfo) {
		const currentBase = currentStageInfo.hours;
		const range = nextStageInfo.hours - currentBase;
		const earned = Math.max(0, totalHours - currentBase);
		progressPercent = Math.min(100, Math.round((earned / range) * 100));
	}

	// 3. Subject Mutation (Aura): Study time across P, C, M in past 7 days
	let pMins = 0;
	let cMins = 0;
	let mMins = 0;

	const sevenDaysAgoEpochMin = Math.floor(Date.now() / 60000) - 7 * 24 * 60;

	if (state.log && Array.isArray(state.log)) {
		for (const session of state.log) {
			const epochMin = session[0] || 0;
			if (epochMin >= sevenDaysAgoEpochMin) {
				const mins = session[1] || 0;
				const sub = session[7];
				if (sub === 'P') pMins += mins;
				else if (sub === 'C') cMins += mins;
				else if (sub === 'M') mMins += mins;
			}
		}
	}

	let auraSubject: PetAuraSubject = 'balanced';
	let auraColor = 'var(--accent, #8b5cf6)';
	let auraName = 'Prismatic Amethyst (Cosmic Balance)';

	if (pMins > cMins && pMins > mMins && pMins >= 30) {
		auraSubject = 'P';
		auraColor = '#3b82f6';
		auraName = 'Electric Azure (Physics Attuned)';
	} else if (cMins > pMins && cMins > mMins && cMins >= 30) {
		auraSubject = 'C';
		auraColor = '#10b981';
		auraName = 'Emerald Bio-Glow (Chemistry Attuned)';
	} else if (mMins > pMins && mMins > cMins && mMins >= 30) {
		auraSubject = 'M';
		auraColor = '#f59e0b';
		auraName = 'Solar Radiant Gold (Maths Attuned)';
	}

	// 4. Hibernation Check (>24 hours with 0 minutes)
	const currentEpochMin = Math.floor(Date.now() / 60000);
	const minutesSinceLastFocus = latestSessionEpochMin > 0 ? Math.max(0, currentEpochMin - latestSessionEpochMin) : 99999;
	const hoursSinceLastFocus = Math.round((minutesSinceLastFocus / 60) * 10) / 10;

	const isHibernating = !isCurrentlyFocusing && hoursSinceLastFocus >= 24;

	let mood: PetEvolutionInfo['mood'] = 'content';
	if (isCurrentlyFocusing) {
		mood = 'ecstatic';
	} else if (isHibernating) {
		mood = 'hibernating';
	} else if (hoursSinceLastFocus < 6) {
		mood = 'vibrant';
	}

	return {
		stage: currentStageInfo.stage,
		stageName: currentStageInfo.name,
		title: currentStageInfo.title,
		description: currentStageInfo.desc,
		currentHours: totalHours,
		nextStageHours: nextStageInfo ? nextStageInfo.hours : null,
		progressPercent,
		auraSubject,
		auraColor,
		auraName,
		isHibernating,
		hoursSinceLastFocus,
		mood
	};
}
