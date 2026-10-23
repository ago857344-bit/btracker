import { tracker, scheduleSave, setSessionBoostHandler } from "./tracker";

function _updateAndSave(updater: (state: TrackerState) => TrackerState) {
    tracker.update(updater);
    scheduleSave();
}
import type { TrackerState, 
	ChapterRecallData,
	ConfidenceRating,
	ModalityTag,
	StudyBlock,
	FocusSession
} from '$lib/types/tracker';
import { createChapterRecallData } from '$lib/state/defaults';
import { updateDecayAfterRevision, daysUntilThreshold } from '$lib/state/decay';
import { recordSubtopicRevision, addSubtopicToChapter } from '$lib/state/subtopics';
import { todayKey, dayKeyOf, addDaysKey } from '$lib/state/dates';
import { intervalFor } from '$lib/state/subjects';

/**
 * Actions for managing the Active Recall Hub state
 */

/**
 * Add a new chapter to the recall tracking system
 *
 * @param chapterKey - Chapter identifier (e.g., "P-1")
 * @param weightage - High-yield weightage (1-3)
 */
export function addChapterToRecall(chapterKey: string, weightage: 1 | 2 | 3 = 2) {
	_updateAndSave(($tracker) => {
		if ($tracker.rev.chapters[chapterKey]) {
			return $tracker; // Already exists
		}

		const today = todayKey();
		const newCh = createChapterRecallData(chapterKey, weightage);
		newCh.userAdded = true;
		newCh.nextRevisionDate = today;

		const [sub, ...rest] = chapterKey.split(/[-:]/);
		const chName = rest.join('-').trim();
		const colonKey = `${sub}:${chName}`;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: newCh
				},
				items: {
					...$tracker.rev.items,
					[colonKey]: {
						weight: weightage,
						last: null,
						method: 'steady',
						step: 1,
						sub,
						ch: chName,
						ef: 2.5,
						remindDate: today,
						remindDone: false,
						userAdded: true
					}
				}
			}
		};
	});
}

/**
 * Update chapter weightage
 *
 * @param chapterKey - Chapter identifier
 * @param weightage - New weightage (1-3)
 */
export function updateChapterWeightage(chapterKey: string, weightage: 1 | 2 | 3) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						weightage
					}
				}
			}
		};
	});
}

/**
 * Record a chapter-level revision (updates overall decay metrics)
 *
 * @param chapterKey - Chapter identifier
 * @param confidence - Self-evaluation rating
 * @param modalities - Modalities used
 * @param timeSpentMinutes - Time spent in minutes
 */
import { applyEloResult } from '$lib/state/gamification';

export function recordChapterRevision(
	chapterKey: string,
	confidence: ConfidenceRating,
	modalities: ModalityTag[],
	timeSpentMinutes: number = 0
) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey] || createChapterRecallData(chapterKey, 2);
		chapter.userAdded = true;

		const newDecay = updateDecayAfterRevision(chapter.decay, confidence);
		const today = todayKey();

		// Schedule next revision based on confidence and new half-life
		const daysLeft = Math.max(1, Math.round(daysUntilThreshold(newDecay, 60)));
		const nextDate = addDaysKey(today, daysLeft);

		const updatedChapter: ChapterRecallData = {
			...chapter,
			decay: newDecay,
			modalities: [...new Set([...chapter.modalities, ...modalities])] as ModalityTag[],
			nextRevisionDate: nextDate
		};

		// Also synchronize rev.items
		const [sub, ...rest] = chapterKey.split(/[-:]/);
		const chName = rest.join('-').trim();
		const colonKey = `${sub}:${chName}`;
		const existingItem = $tracker.rev.items[colonKey] || $tracker.rev.items[chapterKey];
		const nextStep = existingItem ? (existingItem.step ?? 1) + 1 : 1;
		
		const updatedItems = {
			...$tracker.rev.items,
			[colonKey]: {
				weight: chapter.weightage,
				last: Date.now(),
				method: existingItem?.method ?? 'steady',
				step: nextStep,
				sub,
				ch: chName,
				ef: existingItem?.ef ?? 2.5,
				remindDate: nextDate,
				remindDone: false,
				userAdded: true
			}
		};

		// Update daily heatmap
		const todayData = $tracker.rev.dailyHeatmap[today] || { revisedCount: 0, totalTimeMinutes: 0 };

		// Gamification Update
		let xpGain = timeSpentMinutes > 0 ? timeSpentMinutes * 10 : 50; // baseline for quick revisions
		const accMap: Record<ConfidenceRating, number> = { 'again': 40, 'hard': 70, 'good': 85, 'easy': 100 };
		const accuracy = accMap[confidence] || 70;
		const subCode = sub || 'P';
		
		const gamification = structuredClone($tracker.gamification || { xp: 0, level: 1, elo: { P: 300, C: 300, M: 300 } });
		gamification.xp += xpGain;
		applyEloResult(gamification, subCode, accuracy, 0);

		return {
			...$tracker,
			gamification,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: updatedChapter
				},
				items: updatedItems,
				dailyHeatmap: {
					...$tracker.rev.dailyHeatmap,
					[today]: {
						revisedCount: todayData.revisedCount + 1,
						totalTimeMinutes: todayData.totalTimeMinutes + timeSpentMinutes
					}
				}
			}
		};
	});
}

/**
 * Record a subtopic-level revision
 *
 * @param chapterKey - Chapter identifier
 * @param subtopicId - Subtopic identifier
 * @param subtopicName - Subtopic display name (if new)
 * @param modalities - Modalities used
 * @param confidence - Self-evaluation rating
 * @param timeSpentMinutes - Time spent in minutes
 */
export function recordSubtopicRevisionAction(
	chapterKey: string,
	subtopicId: string,
	subtopicName: string,
	modalities: ModalityTag[],
	confidence: ConfidenceRating,
	timeSpentMinutes: number = 0
) {
	_updateAndSave(($tracker) => {
		let chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) {
			chapter = createChapterRecallData(chapterKey, 2);
		}

		// Add subtopic if it doesn't exist
		if (!chapter.subtopics[subtopicId]) {
			chapter = addSubtopicToChapter(chapter, subtopicId, subtopicName);
		}

		// Record the revision
		const updatedChapter = recordSubtopicRevision(chapter, subtopicId, modalities, confidence);

		// Update daily heatmap
		const today = todayKey();
		const todayData = $tracker.rev.dailyHeatmap[today] || { revisedCount: 0, totalTimeMinutes: 0 };

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: updatedChapter
				},
				dailyHeatmap: {
					...$tracker.rev.dailyHeatmap,
					[today]: {
						revisedCount: todayData.revisedCount + 1,
						totalTimeMinutes: todayData.totalTimeMinutes + timeSpentMinutes
					}
				}
			}
		};
	});
}

/**
 * Add a study block to the timeline
 *
 * @param block - Study block to add
 */
export function addStudyBlock(block: StudyBlock) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			studyBlocks: [...$tracker.rev.studyBlocks, block]
		}
	}));
}

/**
 * Update a study block
 *
 * @param blockId - Block identifier
 * @param updates - Partial updates to the block
 */
export function updateStudyBlock(blockId: string, updates: Partial<StudyBlock>) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			studyBlocks: $tracker.rev.studyBlocks.map((block) =>
				block.id === blockId ? { ...block, ...updates } : block
			)
		}
	}));
}

/**
 * Remove a study block
 *
 * @param blockId - Block identifier
 */
export function removeStudyBlock(blockId: string) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			studyBlocks: $tracker.rev.studyBlocks.filter((block) => block.id !== blockId)
		}
	}));
}

/**
 * Schedule a revision slot for a chapter
 *
 * @param chapterKey - Chapter identifier
 * @param start - ISO datetime string for start
 * @param end - ISO datetime string for end
 * @param parentBlockId - Optional parent study block ID
 */
export function scheduleRevisionSlot(
	chapterKey: string,
	start: string,
	end: string,
	parentBlockId?: string
) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		const slotId = `${chapterKey}-${Date.now()}`;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						scheduledSlots: [
							...chapter.scheduledSlots,
							{ id: slotId, start, end, parentBlockId }
						]
					}
				}
			}
		};
	});
}

/**
 * Remove a scheduled revision slot
 *
 * @param chapterKey - Chapter identifier
 * @param slotId - Slot identifier
 */
export function removeRevisionSlot(chapterKey: string, slotId: string) {
	_updateAndSave(($tracker) => {
		const chapter = $tracker.rev.chapters[chapterKey];
		if (!chapter) return $tracker;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					[chapterKey]: {
						...chapter,
						scheduledSlots: chapter.scheduledSlots.filter((slot) => slot.id !== slotId)
					}
				}
			}
		};
	});
}

/**
 * Create a new focus session (brain dump mode)
 *
 * @param chapterKey - Chapter identifier
 * @param subtopicIds - Array of subtopic IDs to focus on
 * @param timerDuration - Timer duration in seconds
 * @returns The created focus session ID
 */
export function createFocusSession(
	chapterKey: string,
	subtopicIds: string[],
	timerDuration: number
): string {
	const sessionId = `focus-${Date.now()}`;
	const session: FocusSession = {
		id: sessionId,
		chapterKey,
		subtopicIds,
		startedAt: Date.now(),
		timerDuration,
		elapsedSeconds: 0,
		isRunning: true,
		phase: 'timer'
	};

	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			focusSessions: [...$tracker.rev.focusSessions, session]
		}
	}));

	return sessionId;
}

/**
 * Update focus session progress
 *
 * @param sessionId - Session identifier
 * @param updates - Partial updates to the session
 */
export function updateFocusSession(sessionId: string, updates: Partial<FocusSession>) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			focusSessions: $tracker.rev.focusSessions.map((session) =>
				session.id === sessionId ? { ...session, ...updates } : session
			)
		}
	}));
}

/**
 * Complete a focus session with confidence rating
 *
 * @param sessionId - Session identifier
 * @param confidence - Self-evaluation rating
 * @param notes - Optional notes from the session
 */
export function completeFocusSession(
	sessionId: string,
	confidence: ConfidenceRating,
	notes?: string
) {
	_updateAndSave(($tracker) => {
		const session = $tracker.rev.focusSessions.find((s) => s.id === sessionId);
		if (!session) return $tracker;

		// Record the revision for each subtopic
		const chapter = $tracker.rev.chapters[session.chapterKey];
		if (chapter) {
			session.subtopicIds.forEach((subtopicId) => {
				const subtopic = chapter.subtopics[subtopicId];
				if (subtopic) {
					// Update subtopic decay
					const updatedSubtopic = {
						...subtopic,
						decay: updateDecayAfterRevision(subtopic.decay, confidence)
					};

					// This is a simplified update - in practice you'd use recordSubtopicRevision
					// But we're updating inline here to avoid circular dependencies
				}
			});

			// Also update chapter-level decay
			const updatedChapter: ChapterRecallData = {
				...chapter,
				decay: updateDecayAfterRevision(chapter.decay, confidence)
			};

			// Update daily heatmap
			const today = todayKey();
			const todayData = $tracker.rev.dailyHeatmap[today] || {
				revisedCount: 0,
				totalTimeMinutes: 0
			};
			const timeSpentMinutes = Math.round(session.elapsedSeconds / 60);

			return {
				...$tracker,
				rev: {
					...$tracker.rev,
					chapters: {
						...$tracker.rev.chapters,
						[session.chapterKey]: updatedChapter
					},
					dailyHeatmap: {
						...$tracker.rev.dailyHeatmap,
						[today]: {
							revisedCount: todayData.revisedCount + 1,
							totalTimeMinutes: todayData.totalTimeMinutes + timeSpentMinutes
						}
					},
					focusSessions: $tracker.rev.focusSessions.map((s) =>
						s.id === sessionId
							? { ...s, isRunning: false, phase: 'complete', confidenceRating: confidence, notes }
							: s
					)
				}
			};
		}

		return $tracker;
	});
}

/**
 * Delete a focus session
 *
 * @param sessionId - Session identifier
 */
export function deleteFocusSession(sessionId: string) {
	_updateAndSave(($tracker) => ({
		...$tracker,
		rev: {
			...$tracker.rev,
			focusSessions: $tracker.rev.focusSessions.filter((session) => session.id !== sessionId)
		}
	}));
}

/**
 * Remove a chapter from recall tracking
 *
 * @param chapterKey - Chapter identifier
 */
export function removeChapterFromRecall(chapterKey: string) {
	_updateAndSave(($tracker) => {
		const { [chapterKey]: removed, ...remainingChapters } = $tracker.rev.chapters;

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: remainingChapters
			}
		};
	});
}

/**
 * Bulk add chapters to recall tracking
 *
 * @param chapterKeys - Array of chapter identifiers
 * @param defaultWeightage - Default weightage for all chapters
 */
export function bulkAddChaptersToRecall(chapterKeys: string[], defaultWeightage: 1 | 2 | 3 = 2) {
	_updateAndSave(($tracker) => {
		const newChapters: Record<string, ChapterRecallData> = {};

		chapterKeys.forEach((key) => {
			if (!$tracker.rev.chapters[key]) {
				newChapters[key] = createChapterRecallData(key, defaultWeightage);
			}
		});

		if (Object.keys(newChapters).length === 0) {
			return $tracker;
		}

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: {
					...$tracker.rev.chapters,
					...newChapters
				}
			}
		};
	});
}

export function boostChapterFromPractice(chapterKey: string, durationMinutes: number = 25, confidence: ConfidenceRating = 'good') {
	_updateAndSave(($tracker) => {
		const today = todayKey();
		const chapter = $tracker.rev.chapters[chapterKey];
		
		let updatedChapters = { ...$tracker.rev.chapters };
		let updatedChapter: ChapterRecallData;

		if (!chapter) {
			// Doesn't exist, so add it fresh with 100% initial retention
			const newCh = createChapterRecallData(chapterKey, 2);
			newCh.decay = {
				r0: 100,
				halfLife: 7,
				currentScore: 100,
				lastRevisionAt: Date.now(),
				history: [{ date: today, score: 100 }]
			};
			// Spaced repetition: first review scheduled for tomorrow
			newCh.nextRevisionDate = addDaysKey(today, 1);
			updatedChapter = newCh;
			updatedChapters[chapterKey] = newCh;
		} else {
			// Already exists
			const lastRevDate = chapter.decay.lastRevisionAt ? dayKeyOf(new Date(chapter.decay.lastRevisionAt)) : 0;
			
			const newDecay = lastRevDate === today
				? { ...chapter.decay, currentScore: 100, r0: 100, lastRevisionAt: Date.now() }
				: updateDecayAfterRevision(chapter.decay, confidence);

			const daysToAdd = Math.max(1, Math.min(14, Math.round((newDecay.halfLife || 7) * 0.5)));
			const nextDate = addDaysKey(today, daysToAdd);

			updatedChapter = {
				...chapter,
				decay: newDecay,
				nextRevisionDate: nextDate
			};
			updatedChapters[chapterKey] = updatedChapter;
		}

		// Also synchronize rev.items for the legacy / dueRevision / modal systems
		const [sub, ...rest] = chapterKey.split(/[-:]/);
		const chName = rest.join('-').trim();
		const colonKey = `${sub}:${chName}`;
		const existingItem = $tracker.rev.items[colonKey];
		const nextStep = existingItem ? (existingItem.step ?? 1) + 1 : 1;
		const nextInterval = intervalFor(existingItem?.method ?? 'steady', nextStep, existingItem?.ef ?? 2.5);
		const remindDate = addDaysKey(today, nextInterval);

		const updatedItems = {
			...$tracker.rev.items,
			[colonKey]: {
				weight: 2,
				last: Date.now(),
				method: existingItem?.method ?? 'steady',
				step: nextStep,
				sub,
				ch: chName,
				ef: existingItem?.ef ?? 2.5,
				remindDate,
				remindDone: false
			}
		};

		// Also update daily heatmap
		const todayData = $tracker.rev.dailyHeatmap[today] || { revisedCount: 0, totalTimeMinutes: 0 };
		const updatedHeatmap = {
			...$tracker.rev.dailyHeatmap,
			[today]: {
				revisedCount: todayData.revisedCount + 1,
				totalTimeMinutes: todayData.totalTimeMinutes + durationMinutes
			}
		};

		return {
			...$tracker,
			rev: {
				...$tracker.rev,
				chapters: updatedChapters,
				items: updatedItems,
				dailyHeatmap: updatedHeatmap
			}
		};
	});
}

/**
 * Boost chapter memory from a theory/lecture session.
 * Uses 'hard' confidence since passive watching is less effective than active recall.
 * Still resets r0 to 100 on same-day repeat to prevent double-dipping.
 */
export function boostChapterFromTheory(chapterKey: string, durationMinutes: number) {
	boostChapterFromPractice(chapterKey, durationMinutes, 'hard');
}

// Automatically register with tracker store so logStudySession triggers boostChapterFromPractice
if (typeof setSessionBoostHandler === 'function') {
	setSessionBoostHandler((sub, ch, duration) => {
		boostChapterFromPractice(`${sub}-${ch}`, duration);
	});
}

