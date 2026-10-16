export interface ExamPreset {
	id: string;
	name: string;
	shortName: string;
	date: string;
	season: string;
	badgeColor?: string;
}

export function getExamPresets(referenceDate: Date = new Date()): ExamPreset[] {
	const currentYear = referenceDate.getFullYear();
	// If it's after June, Session 1 of next JEE cycle is in the following January
	const targetYear = referenceDate.getMonth() >= 5 ? currentYear + 1 : currentYear;

	return [
		{
			id: 'jee-main-s1',
			name: `JEE Main ${targetYear} (Session 1)`,
			shortName: `JEE Main S1`,
			date: `${targetYear}-01-24`,
			season: 'Jan',
			badgeColor: '#4cc9f0'
		},
		{
			id: 'jee-main-s2',
			name: `JEE Main ${targetYear} (Session 2)`,
			shortName: `JEE Main S2`,
			date: `${targetYear}-04-06`,
			season: 'Apr',
			badgeColor: '#ff70a6'
		},
		{
			id: 'jee-adv',
			name: `JEE Advanced ${targetYear}`,
			shortName: `JEE Advanced`,
			date: `${targetYear}-05-23`,
			season: 'May',
			badgeColor: '#f59e0b'
		},
		{
			id: 'bitsat',
			name: `BITSAT ${targetYear}`,
			shortName: `BITSAT`,
			date: `${targetYear}-05-19`,
			season: 'May',
			badgeColor: '#a78bfa'
		}
	];
}

export function findMatchingPreset(examDate: string | null | undefined, presets = getExamPresets()): ExamPreset | null {
	if (!examDate) return null;
	return presets.find((p) => p.date === examDate) ?? null;
}

export function getExamMilestone(daysLeft: number): {
	label: string;
	icon: 'check-circle' | 'flame' | 'bolt' | 'book' | 'target';
	tone: 'success' | 'danger' | 'warning' | 'accent' | 'default';
} {
	if (daysLeft <= 0) return { label: 'Exam Day / Concluded', icon: 'check-circle', tone: 'success' };
	if (daysLeft <= 14) return { label: 'Final Lap (< 2 Weeks)', icon: 'flame', tone: 'danger' };
	if (daysLeft <= 60) return { label: 'Peak Revision & Mocks', icon: 'bolt', tone: 'warning' };
	if (daysLeft <= 150) return { label: 'Syllabus Mastery Phase', icon: 'book', tone: 'accent' };
	return { label: 'Foundation & Conceptual Phase', icon: 'target', tone: 'default' };
}
